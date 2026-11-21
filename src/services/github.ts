// Native Web-Fetch GitHub API client for Cloudflare Workers:
// ETag conditional requests (304 = 0 rate-limit cost), Promise.allSettled parallelization,
// persisted 90-day KV history hydration, and synthetic ping status integration.

import type {
  DailyHistorySnapshot,
  Env,
  HistoryDay,
  IncidentItem,
  PingRecord,
  ReleaseInfo,
  RepoStatusData,
  WorkflowRunItem,
} from "../types";
import {
  getCachedRepoStatus,
  getCacheTtlMs,
  getPings,
  getRepoHistoryMap,
  saveRepoStatus,
} from "./kv";

const GITHUB_API = "https://api.github.com";
const RECENT_PING_WINDOW_MS = 24 * 60 * 60 * 1000;

interface GitHubRepoResponse {
  owner: { login: string };
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  open_issues_count: number;
  default_branch: string;
  archived: boolean;
  html_url: string;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs?: Array<{
    id: number;
    name?: string;
    status?: string;
    conclusion: string | null;
    head_sha?: string;
    head_commit?: { message?: string; author?: { name?: string } };
    actor?: { login?: string; avatar_url?: string };
    head_branch?: string;
    event?: string;
    run_number: number;
    html_url: string;
    created_at: string;
    updated_at: string;
  }>;
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  pull_request?: unknown;
  labels?: Array<string | { name?: string; color?: string }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body?: string | null;
}

interface GitHubReleaseResponse {
  tag_name: string;
  name?: string | null;
  html_url: string;
  published_at?: string | null;
  created_at: string;
  author?: { login?: string } | null;
}

function buildGitHubHeaders(env: Env, etag?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "StatusZero-Worker/2.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (etag) {
    headers["If-None-Match"] = etag;
  }
  return headers;
}

function computePingLatencyMetrics(pings: PingRecord[]): {
  averageLatencyMs?: number;
  lastPingLatencyMs?: number;
} {
  const pingsWithLatency = pings.filter(
    (p) => typeof p.latencyMs === "number" && p.latencyMs > 0,
  );
  const averageLatencyMs =
    pingsWithLatency.length > 0
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

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);

    const dayRuns = workflowRuns.filter(
      (r) => r.createdAt.slice(0, 10) === dateStr,
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
          Math.round(((totalRuns - failedRuns) / totalRuns) * 10000) / 100;
      }
    } else if (totalRuns === 0 && kvHistory?.has(dateStr)) {
      const snap = kvHistory.get(dateStr)!;
      status = snap.status === "unknown" ? "operational" : snap.status;
      uptimePercent =
        typeof snap.uptimePercent === "number" ? snap.uptimePercent : 100;
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

  const latestPing = recentPings[0];
  if (latestPing) {
    const pingAgeMs = nowMs - new Date(latestPing.timestamp).getTime();
    const isFreshPing =
      Number.isFinite(pingAgeMs) && pingAgeMs <= RECENT_PING_WINDOW_MS;
    const isPingFailure =
      latestPing.status === "failure" ||
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
  env: Env,
  owner: string,
  repo: string,
  forceRefresh = false,
): Promise<RepoStatusData> {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();

  if (!forceRefresh) {
    const cached = await getCachedRepoStatus(
      env,
      normalizedOwner,
      normalizedRepo,
    );
    if (cached && Date.now() - (cached.cachedAt || 0) < getCacheTtlMs(env)) {
      return cached;
    }
  }

  const staleCached = await getCachedRepoStatus(
    env,
    normalizedOwner,
    normalizedRepo,
    true,
  );
  const encOwner = encodeURIComponent(normalizedOwner);
  const encRepo = encodeURIComponent(normalizedRepo);

  const repoResp = await fetch(`${GITHUB_API}/repos/${encOwner}/${encRepo}`, {
    headers: buildGitHubHeaders(
      env,
      !forceRefresh ? staleCached?.etag : undefined,
    ),
  });

  // Conditional ETag hit (304 Not Modified): 0 GitHub rate-limit cost
  if (repoResp.status === 304 && staleCached) {
    const recentPings = await getPings(env, normalizedOwner, normalizedRepo);
    const { averageLatencyMs, lastPingLatencyMs } =
      computePingLatencyMetrics(recentPings);
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
    await saveRepoStatus(env, refreshed);
    return refreshed;
  }

  if (repoResp.status === 404) {
    throw new Error(
      `El repositorio "${normalizedOwner}/${normalizedRepo}" no fue encontrado en GitHub.`,
    );
  }

  if (!repoResp.ok) {
    if (staleCached) {
      staleCached.isRateLimited =
        repoResp.status === 403 || repoResp.status === 429;
      staleCached.recentPings = await getPings(
        env,
        normalizedOwner,
        normalizedRepo,
      );
      const { averageLatencyMs, lastPingLatencyMs } =
        computePingLatencyMetrics(staleCached.recentPings);
      staleCached.averageLatencyMs = averageLatencyMs;
      staleCached.lastPingLatencyMs = lastPingLatencyMs;
      return staleCached;
    }

    if (repoResp.status === 403 || repoResp.status === 429) {
      const resetHeader = repoResp.headers.get("x-ratelimit-reset");
      const resetTimestamp = resetHeader
        ? Number(resetHeader)
        : Math.floor(Date.now() / 1000) + 1800;
      const minutesUntilReset = Math.max(
        1,
        Math.ceil((resetTimestamp * 1000 - Date.now()) / 60000),
      );
      const recentPings = await getPings(env, normalizedOwner, normalizedRepo);
      const { averageLatencyMs, lastPingLatencyMs } =
        computePingLatencyMetrics(recentPings);

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
        statusMessage: `Límite de GitHub API alcanzado (60 pet/h). Restablecimiento en ~${minutesUntilReset} min.`,
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
      await saveRepoStatus(env, fallbackData);
      return fallbackData;
    }

    throw new Error(
      `Error al consultar el estado de "${normalizedOwner}/${normalizedRepo}": HTTP ${repoResp.status}`,
    );
  }

  const repoData = (await repoResp.json()) as GitHubRepoResponse;
  const newEtag = repoResp.headers.get("etag") ?? undefined;
  const authHeaders = buildGitHubHeaders(env);

  const [runsRes, issuesRes, releaseRes, pingsRes, historyRes] =
    await Promise.allSettled([
      fetch(
        `${GITHUB_API}/repos/${encOwner}/${encRepo}/actions/runs?per_page=20`,
        { headers: authHeaders },
      ).then((r) =>
        r.ok ? (r.json() as Promise<GitHubWorkflowRunsResponse>) : null,
      ),
      fetch(
        `${GITHUB_API}/repos/${encOwner}/${encRepo}/issues?state=all&per_page=20&sort=updated`,
        { headers: authHeaders },
      ).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssueResponse[]>) : null,
      ),
      fetch(`${GITHUB_API}/repos/${encOwner}/${encRepo}/releases/latest`, {
        headers: authHeaders,
      }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubReleaseResponse>) : null,
      ),
      getPings(env, normalizedOwner, normalizedRepo),
      getRepoHistoryMap(env, normalizedOwner, normalizedRepo),
    ]);

  let workflowRuns: WorkflowRunItem[] = [];
  if (runsRes.status === "fulfilled" && runsRes.value?.workflow_runs) {
    workflowRuns = runsRes.value.workflow_runs.map((run) => {
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
        commitMessage:
          run.head_commit?.message?.split("\n")[0] || "Commit update",
        author: {
          name:
            run.head_commit?.author?.name ||
            run.actor?.login ||
            "Contributor",
          avatarUrl:
            run.actor?.avatar_url || "https://github.com/ghost.png",
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
  if (issuesRes.status === "fulfilled" && Array.isArray(issuesRes.value)) {
    incidents = issuesRes.value
      .filter((issue) => !issue.pull_request)
      .map((issue) => {
        const labelList = (issue.labels || []).map((l) =>
          typeof l === "string"
            ? { name: l, color: "6b7280" }
            : { name: l.name || "", color: l.color || "6b7280" },
        );
        const hasIncidentLabel = labelList.some((l) =>
          /incident|outage|downtime|down|degradation|broken/i.test(l.name),
        );
        const hasIncidentTitle =
          /\[incident\]|\[outage\]|service down|downtime/i.test(issue.title);
        return {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          htmlUrl: issue.html_url,
          state: issue.state,
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
  if (releaseRes.status === "fulfilled" && releaseRes.value) {
    const r = releaseRes.value;
    latestRelease = {
      tag: r.tag_name,
      name: r.name || r.tag_name,
      htmlUrl: r.html_url,
      publishedAt: r.published_at || r.created_at,
      author: r.author?.login || "Maintainer",
    };
  }

  const recentPings = pingsRes.status === "fulfilled" ? pingsRes.value : [];
  const kvHistory =
    historyRes.status === "fulfilled" ? historyRes.value : undefined;

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
  const { averageLatencyMs, lastPingLatencyMs } =
    computePingLatencyMetrics(recentPings);

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

  await saveRepoStatus(env, result);
  return result;
}
