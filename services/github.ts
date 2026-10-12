// services/github.ts
// GitHub API integration using Octokit, calculating status, uptime, workflow metrics and incidents.

import { Octokit } from "@octokit/rest";
import {
  getCachedRepoStatus,
  getPings,
  HistoryDay,
  IncidentItem,
  ReleaseInfo,
  RepoStatusData,
  saveRepoStatus,
  WorkflowRunItem,
} from "./kv.ts";

function getOctokit(): Octokit {
  const token = Deno.env.get("GITHUB_TOKEN");
  return new Octokit({
    auth: token || undefined,
    userAgent: "StatusZero-GitHubStatus/1.0",
  });
}

function generateHistoryDays(
  workflowRuns: WorkflowRunItem[],
  incidents: IncidentItem[],
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
        uptimePercent = 98.2;
      }
    } else if (totalRuns === 0 && i > 30) {
      // Older days with no specific CI runs default to operational if no incidents
      status = "operational";
      uptimePercent = 100;
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

export async function fetchRepoStatus(
  owner: string,
  repo: string,
  forceRefresh = false,
): Promise<RepoStatusData> {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();

  // 1. Check Deno KV cache
  if (!forceRefresh) {
    const cached = await getCachedRepoStatus(normalizedOwner, normalizedRepo);
    if (cached) {
      const age = Date.now() - (cached.cachedAt || 0);
      if (age < 60 * 1000) {
        return cached;
      }
    }
  }

  const octokit = getOctokit();

  try {
    // 2. Fetch repository info
    const { data: repoData } = await octokit.rest.repos.get({
      owner: normalizedOwner,
      repo: normalizedRepo,
    });

    // 3. Fetch workflow runs (actions)
    let workflowRuns: WorkflowRunItem[] = [];
    try {
      const { data: runsData } = await octokit.rest.actions
        .listWorkflowRunsForRepo({
          owner: normalizedOwner,
          repo: normalizedRepo,
          per_page: 20,
        });

      workflowRuns = (runsData.workflow_runs || []).map((run) => {
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
    } catch (_err) {
      // Actions may be disabled or empty in some repos
      workflowRuns = [];
    }

    // 4. Fetch issues for incident tracking
    let incidents: IncidentItem[] = [];
    try {
      const { data: issuesData } = await octokit.rest.issues.listForRepo({
        owner: normalizedOwner,
        repo: normalizedRepo,
        state: "all",
        per_page: 20,
        sort: "updated",
      });

      // Filter issues labeled or titled as incident/outage/downtime/bug
      incidents = issuesData
        .filter((issue) => !issue.pull_request) // exclude PRs
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
    } catch (_err) {
      incidents = [];
    }

    // 5. Fetch latest release
    let latestRelease: ReleaseInfo | null = null;
    try {
      const { data: releaseData } = await octokit.rest.repos.getLatestRelease({
        owner: normalizedOwner,
        repo: normalizedRepo,
      });

      latestRelease = {
        tag: releaseData.tag_name,
        name: releaseData.name || releaseData.tag_name,
        htmlUrl: releaseData.html_url,
        publishedAt: releaseData.published_at || releaseData.created_at,
        author: releaseData.author?.login || "Maintainer",
      };
    } catch (_err) {
      latestRelease = null;
    }

    // 6. Fetch any custom pings recorded in Deno KV
    const recentPings = await getPings(normalizedOwner, normalizedRepo);

    // 7. Calculate Status & Uptime
    const openIncidents = incidents.filter((i) => i.state === "open");
    const recentRuns = workflowRuns.slice(0, 10);
    const failedRecent = recentRuns.filter((r) => r.conclusion === "failure");

    let status: RepoStatusData["status"] = "operational";
    let statusMessage = "Todos los sistemas y flujos operacionales";

    if (openIncidents.length > 0) {
      status = "outage";
      statusMessage = `Incidente activo: ${openIncidents[0].title}`;
    } else if (failedRecent.length > 0) {
      if (failedRecent.length > recentRuns.length / 2) {
        status = "outage";
        statusMessage = "Fallos críticos en pipelines de CI/CD detectados";
      } else {
        status = "degraded";
        statusMessage = "Degradación parcial en flujos de trabajo";
      }
    } else if (recentRuns.length === 0) {
      status = "operational";
      statusMessage = "Operacional • Sin incidencias en CI/CD";
    }

    // Compute uptime percentage across the history days
    const historyBars = generateHistoryDays(workflowRuns, incidents);
    const totalUptimeSum = historyBars.reduce(
      (acc, curr) => acc + curr.uptimePercent,
      0,
    );
    const uptimePercentage =
      Math.round((totalUptimeSum / historyBars.length) * 100) / 100;

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
    };

    // Save to Deno KV
    await saveRepoStatus(result);

    return result;
  } catch (error: unknown) {
    // 1. Si hay datos cacheados en Deno KV (incluso antiguos), los usamos como fallback
    const staleCached = await getCachedRepoStatus(
      normalizedOwner,
      normalizedRepo,
      true,
    );
    if (staleCached) {
      staleCached.isRateLimited = true;
      return staleCached;
    }

    const err = error as {
      status?: number;
      message?: string;
      response?: { headers?: Record<string, string> };
    };

    if (err.status === 404) {
      throw new Error(
        `El repositorio "${owner}/${repo}" no fue encontrado en GitHub.`,
      );
    }

    // 2. Si es rate limit (403/429) y no hay caché, modo degradado de resiliencia
    if (err.status === 403 || err.status === 429) {
      const resetHeader = err.response?.headers?.["x-ratelimit-reset"];
      const resetTimestamp = resetHeader
        ? Number(resetHeader)
        : Math.floor(Date.now() / 1000) + 1800;
      const minutesUntilReset = Math.max(
        1,
        Math.ceil((resetTimestamp * 1000 - Date.now()) / 60000),
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
        recentPings: await getPings(normalizedOwner, normalizedRepo),
        isRateLimited: true,
        rateLimitResetMinutes: minutesUntilReset,
      };

      // Guardar en KV para evitar golpear la API de GitHub mientras dure el bloqueo
      await saveRepoStatus(fallbackData);
      return fallbackData;
    }

    throw new Error(
      `Error al consultar el estado de "${owner}/${repo}": ${
        err.message || "Error desconocido"
      }`,
    );
  }
}
