// services/github.ts
// GitHub API integration using Octokit with ETag conditional requests, singleflight deduplication,
// parallel edge fetching, persistent Deno KV 90-day history, and synthetic ping status integration.

import { Octokit } from "@octokit/rest";
import {
  DailyHistorySnapshot,
  getCachedRepoStatus,
  getCacheTtlMs,
  getPings,
  getRepoHistoryMap,
  HistoryDay,
  IncidentItem,
  PingRecord,
  ReleaseInfo,
  RepoStatusData,
  saveRepoStatus,
  WorkflowRunItem,
} from "./kv.ts";

const inFlightRequests = new Map<string, Promise<RepoStatusData>>();
const RECENT_PING_WINDOW_MS = 24 * 60 * 60 * 1000;

function getOctokit(): Octokit {
  const token = Deno.env.get("GITHUB_TOKEN")?.trim();
  return new Octokit({
    auth: token || undefined,
    userAgent: "StatusZero-GitHubStatus/1.0",
  });
}

function computePingLatencyMetrics(pings: PingRecord[]): {
  averageLatencyMs?: number;
  lastPingLatencyMs?: number;
} {
  const pingsWithLatency = pings.filter(
    (p) => typeof p.latencyMs === "number" && p.latencyMs > 0,
  );
  const averageLatencyMs = pingsWithLatency.length > 0
    ? Math.round(
      pingsWithLatency.reduce((acc, p) => acc + (p.latencyMs || 0), 0) /
        pingsWithLatency.length,
    )
    : undefined;
  const lastPingLatencyMs = pingsWithLatency[0]?.latencyMs;
  return { averageLatencyMs, lastPingLatencyMs };
}

export function generateHistoryDays(
  workflowRuns: WorkflowRunItem[],
  incidents: IncidentItem[],
  kvHistory?: Map<string, DailyHistorySnapshot>,
): HistoryDay[] {
  const days: HistoryDay[] = [];
  const now = new Date();

  // Create 90 days backwards
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);

    // Filter workflow runs that occurred on this date
    const dayRuns = workflowRuns.filter((r) =>
      r.createdAt.slice(0, 10) === dateStr
    );
    const dayIncidents = incidents.filter((inc) => {
      const created = inc.createdAt.slice(0, 10);
      const closed = inc.closedAt ? inc.closedAt.slice(0, 10) : dateStr;
      return dateStr >= created && dateStr <= closed;
    });

    const totalRuns = dayRuns.length;
    const failedRuns = dayRuns.filter((r) => r.conclusion === "failure").length;
    const incidentsCount = dayIncidents.length;

    let status: HistoryDay["status"] = "operational";
    let uptimePercent = 100;

    if (incidentsCount > 0) {
      status = "outage";
      uptimePercent = 92.5;
    } else if (failedRuns > 0) {
      if (failedRuns === totalRuns && totalRuns > 0) {
        status = "outage";
        uptimePercent = 95.0;
      } else {
        status = "degraded";
        uptimePercent =
          Math.round(((totalRuns - failedRuns) / totalRuns) * 10000) /
          100;
      }
    } else if (totalRuns === 0 && kvHistory?.has(dateStr)) {
      // Hydrate real persisted daily history from Deno KV for older days beyond the last 20 runs
      const snap = kvHistory.get(dateStr)!;
      status = snap.status === "unknown" ? "operational" : snap.status;
      uptimePercent = typeof snap.uptimePercent === "number"
        ? snap.uptimePercent
        : 100;
    }

    days.push({
      date: dateStr,
      status,
      uptimePercent,
      totalRuns,
      failedRuns,
      incidentsCount,
    });
  }

  return days;
}

export function computeOverallStatus(
  workflowRuns: WorkflowRunItem[],
  incidents: IncidentItem[],
  recentPings: PingRecord[],
  nowMs = Date.now(),
): { status: RepoStatusData["status"]; statusMessage: string } {
  const openIncidents = incidents.filter((i) => i.state === "open");
  const recentRuns = workflowRuns.slice(0, 10);
  const failedRecent = recentRuns.filter((r) => r.conclusion === "failure");

  if (openIncidents.length > 0) {
    return {
      status: "outage",
      statusMessage: `Incidente activo: ${openIncidents[0].title}`,
    };
  }

  // Factor in recent synthetic healthcheck pings (last 24h)
  const latestPing = recentPings[0];
  if (latestPing) {
    const pingAgeMs = nowMs - new Date(latestPing.timestamp).getTime();
    const isFreshPing = Number.isFinite(pingAgeMs) &&
      pingAgeMs <= RECENT_PING_WINDOW_MS;
    const isPingFailure = latestPing.status === "failure" ||
      (typeof latestPing.httpStatus === "number" &&
        latestPing.httpStatus >= 500);
    if (isFreshPing && isPingFailure) {
      return {
        status: "outage",
        statusMessage: `Fallo en heartbeat sintético: ${
          latestPing.message || latestPing.workflow || "Healthcheck fallido"
        }`,
      };
    }
  }

  if (failedRecent.length > 0) {
    if (failedRecent.length > recentRuns.length / 2) {
      return {
        status: "outage",
        statusMessage: "Fallos críticos en pipelines de CI/CD detectados",
      };
    }
    return {
      status: "degraded",
      statusMessage: "Degradación parcial en flujos de trabajo",
    };
  }

  if (recentRuns.length === 0) {
    return {
      status: "operational",
      statusMessage: "Operacional • Sin incidencias en CI/CD",
    };
  }

  return {
    status: "operational",
    statusMessage: "Todos los sistemas y flujos operacionales",
  };
}

export async function fetchRepoStatus(
  owner: string,
  repo: string,
  forceRefresh = false,
): Promise<RepoStatusData> {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();
  const flightKey =
    `${normalizedOwner.toLowerCase()}/${normalizedRepo.toLowerCase()}`;

  // 1. Check Deno KV cache honoring dynamic TTL (1m with token, 5m without)
  if (!forceRefresh) {
    const cached = await getCachedRepoStatus(normalizedOwner, normalizedRepo);
    if (cached) {
      const age = Date.now() - (cached.cachedAt || 0);
      if (age < getCacheTtlMs()) {
        return cached;
      }
    }
  }

  // 2. Singleflight deduplication: coalesce concurrent requests for the same repo
  const existingFlight = inFlightRequests.get(flightKey);
  if (existingFlight) {
    return await existingFlight;
  }

  const task = fetchRepoStatusFromGitHub(
    normalizedOwner,
    normalizedRepo,
    forceRefresh,
  ).finally(() => {
    inFlightRequests.delete(flightKey);
  });

  inFlightRequests.set(flightKey, task);
  return await task;
}

async function fetchRepoStatusFromGitHub(
  normalizedOwner: string,
  normalizedRepo: string,
  forceRefresh: boolean,
): Promise<RepoStatusData> {
  const octokit = getOctokit();
  const staleCached = await getCachedRepoStatus(
    normalizedOwner,
    normalizedRepo,
    true,
  );

  try {
    // 1. Fetch repository metadata with conditional ETag when available (304 costs 0 rate-limit)
    const repoResp = await octokit.rest.repos.get({
      owner: normalizedOwner,
      repo: normalizedRepo,
      headers: !forceRefresh && staleCached?.etag
        ? { "If-None-Match": staleCached.etag }
        : undefined,
    });
    const repoData = repoResp.data;
    const newEtag = typeof repoResp.headers?.etag === "string"
      ? repoResp.headers.etag
      : undefined;

    // 2. Fetch workflow runs, issues, latest release, pings, and persisted KV history in parallel
    const [runsRes, issuesRes, releaseRes, pingsRes, historyRes] = await Promise
      .allSettled([
        octokit.rest.actions.listWorkflowRunsForRepo({
          owner: normalizedOwner,
          repo: normalizedRepo,
          per_page: 20,
        }),
        octokit.rest.issues.listForRepo({
          owner: normalizedOwner,
          repo: normalizedRepo,
          state: "all",
          per_page: 20,
          sort: "updated",
        }),
        octokit.rest.repos.getLatestRelease({
          owner: normalizedOwner,
          repo: normalizedRepo,
        }),
        getPings(normalizedOwner, normalizedRepo),
        getRepoHistoryMap(normalizedOwner, normalizedRepo),
      ]);

    let workflowRuns: WorkflowRunItem[] = [];
    if (runsRes.status === "fulfilled") {
      workflowRuns = (runsRes.value.data.workflow_runs || []).map((run) => {
        const createdMs = new Date(run.created_at).getTime();
        const updatedMs = new Date(run.updated_at).getTime();
        const durationSeconds = Math.max(
          1,
          Math.round((updatedMs - createdMs) / 1000),
        );

        return {
          id: run.id,
          name: run.name || "Workflow",
          status: run.status || "unknown",
          conclusion: run.conclusion,
          commitSha: run.head_sha ? run.head_sha.slice(0, 7) : "",
          commitMessage: run.head_commit?.message?.split("\n")[0] ||
            "Commit update",
          author: {
            name: run.head_commit?.author?.name ||
              run.actor?.login ||
              "Contributor",
            avatarUrl: run.actor?.avatar_url ||
              "https://github.com/ghost.png",
          },
          branch: run.head_branch || repoData.default_branch,
          event: run.event || "push",
          runNumber: run.run_number,
          htmlUrl: run.html_url,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          durationSeconds,
        };
      });
    }

    let incidents: IncidentItem[] = [];
    if (issuesRes.status === "fulfilled") {
      incidents = issuesRes.value.data
        .filter((issue) => !issue.pull_request)
        .map((issue) => {
          const labelList = (issue.labels || []).map((l) =>
            typeof l === "string"
              ? { name: l, color: "6b7280" }
              : { name: l.name || "", color: l.color || "6b7280" }
          );

          const hasIncidentLabel = labelList.some((l) =>
            /incident|outage|downtime|down|degradation|broken/i.test(l.name)
          );
          const hasIncidentTitle =
            /\[incident\]|\[outage\]|service down|downtime/i.test(
              issue.title,
            );

          return {
            id: issue.id,
            number: issue.number,
            title: issue.title,
            htmlUrl: issue.html_url,
            state: issue.state as "open" | "closed",
            labels: labelList,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
            bodyPreview: (issue.body || "").slice(0, 200),
            isIncident: hasIncidentLabel || hasIncidentTitle,
          };
        })
        .filter((i) => i.isIncident);
    }

    let latestRelease: ReleaseInfo | null = null;
    if (releaseRes.status === "fulfilled") {
      const releaseData = releaseRes.value.data;
      latestRelease = {
        tag: releaseData.tag_name,
        name: releaseData.name || releaseData.tag_name,
        htmlUrl: releaseData.html_url,
        publishedAt: releaseData.published_at || releaseData.created_at,
        author: releaseData.author?.login || "Maintainer",
      };
    }

    const recentPings = pingsRes.status === "fulfilled" ? pingsRes.value : [];
    const kvHistory = historyRes.status === "fulfilled"
      ? historyRes.value
      : undefined;

    // 3. Calculate overall status (including synthetic pings) & 90-day uptime history
    const { status, statusMessage } = computeOverallStatus(
      workflowRuns,
      incidents,
      recentPings,
    );

    const historyBars = generateHistoryDays(workflowRuns, incidents, kvHistory);
    const totalUptimeSum = historyBars.reduce(
      (acc, curr) => acc + curr.uptimePercent,
      0,
    );
    const uptimePercentage =
      Math.round((totalUptimeSum / historyBars.length) * 100) / 100;

    const { averageLatencyMs, lastPingLatencyMs } = computePingLatencyMetrics(
      recentPings,
    );

    const result: RepoStatusData = {
      owner: repoData.owner.login,
      repo: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description || "Sin descripción proporcionada.",
      stars: repoData.stargazers_count,
      openIssuesCount: repoData.open_issues_count,
      defaultBranch: repoData.default_branch,
      isArchived: repoData.archived,
      htmlUrl: repoData.html_url,
      status,
      statusMessage,
      uptimePercentage,
      lastUpdated: new Date().toISOString(),
      cachedAt: Date.now(),
      workflowRuns,
      incidents,
      latestRelease,
      historyBars,
      recentPings,
      averageLatencyMs,
      lastPingLatencyMs,
      etag: newEtag,
    };

    await saveRepoStatus(result);
    return result;
  } catch (error: unknown) {
    const err = error as {
      status?: number;
      message?: string;
      response?: { headers?: Record<string, string> };
    };

    // Conditional ETag hit (304 Not Modified): refresh timestamp & pings at 0 rate-limit cost
    if (err.status === 304 && staleCached) {
      const recentPings = await getPings(normalizedOwner, normalizedRepo);
      const { averageLatencyMs, lastPingLatencyMs } = computePingLatencyMetrics(
        recentPings,
      );
      const { status, statusMessage } = computeOverallStatus(
        staleCached.workflowRuns,
        staleCached.incidents,
        recentPings,
      );
      const refreshed: RepoStatusData = {
        ...staleCached,
        status,
        statusMessage,
        recentPings,
        averageLatencyMs,
        lastPingLatencyMs,
        lastUpdated: new Date().toISOString(),
        cachedAt: Date.now(),
        isRateLimited: false,
      };
      await saveRepoStatus(refreshed);
      return refreshed;
    }

    // Fallback to stale cache during rate limits or transient GitHub outages
    if (staleCached && err.status !== 404) {
      staleCached.isRateLimited = err.status === 403 || err.status === 429;
      staleCached.recentPings = await getPings(normalizedOwner, normalizedRepo);
      const { averageLatencyMs, lastPingLatencyMs } = computePingLatencyMetrics(
        staleCached.recentPings,
      );
      staleCached.averageLatencyMs = averageLatencyMs;
      staleCached.lastPingLatencyMs = lastPingLatencyMs;
      return staleCached;
    }

    if (err.status === 404) {
      throw new Error(
        `El repositorio "${normalizedOwner}/${normalizedRepo}" no fue encontrado en GitHub.`,
      );
    }

    if (err.status === 403 || err.status === 429) {
      const resetHeader = err.response?.headers?.["x-ratelimit-reset"];
      const resetTimestamp = resetHeader
        ? Number(resetHeader)
        : Math.floor(Date.now() / 1000) + 1800;
      const minutesUntilReset = Math.max(
        1,
        Math.ceil((resetTimestamp * 1000 - Date.now()) / 60000),
      );

      const recentPings = await getPings(normalizedOwner, normalizedRepo);
      const { averageLatencyMs, lastPingLatencyMs } = computePingLatencyMetrics(
        recentPings,
      );

      const fallbackData: RepoStatusData = {
        owner: normalizedOwner,
        repo: normalizedRepo,
        fullName: `${normalizedOwner}/${normalizedRepo}`,
        description:
          "Repositorio público en GitHub (esperando sincronización de cuota de API).",
        stars: 0,
        openIssuesCount: 0,
        defaultBranch: "main",
        isArchived: false,
        htmlUrl: `https://github.com/${normalizedOwner}/${normalizedRepo}`,
        status: "degraded",
        statusMessage:
          `Límite de GitHub API alcanzado (60 pet/h). Restablecimiento en ~${minutesUntilReset} min.`,
        uptimePercentage: 100,
        lastUpdated: new Date().toISOString(),
        cachedAt: Date.now(),
        workflowRuns: [],
        incidents: [],
        latestRelease: null,
        historyBars: generateHistoryDays([], []),
        recentPings,
        averageLatencyMs,
        lastPingLatencyMs,
        isRateLimited: true,
        rateLimitResetMinutes: minutesUntilReset,
      };

      await saveRepoStatus(fallbackData);
      return fallbackData;
    }

    throw new Error(
      `Error al consultar el estado de "${normalizedOwner}/${normalizedRepo}": ${
        err.message || "Error desconocido"
      }`,
    );
  }
}
