// routes/[owner]/[repo].tsx
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { fetchRepoStatus } from "../../services/github.ts";
import { RepoStatusData } from "../../services/kv.ts";
import { Navbar } from "../../components/Navbar.tsx";
import { Footer } from "../../components/Footer.tsx";
import BadgeCopier from "../../islands/BadgeCopier.tsx";
import LiveRefresh from "../../islands/LiveRefresh.tsx";
import UptimeBarTooltip from "../../islands/UptimeBarTooltip.tsx";

interface StatusPageData {
  statusData: RepoStatusData | null;
  error?: string;
  owner: string;
  repo: string;
}

export const handler: Handlers<StatusPageData> = {
  async GET(req: Request, ctx: FreshContext) {
    const owner = ctx.params.owner;
    const repo = ctx.params.repo;
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    try {
      const data = await fetchRepoStatus(owner, repo, forceRefresh);
      return ctx.render({ statusData: data, owner, repo });
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : "Error fetching repository status";
      return ctx.render({ statusData: null, error: message, owner, repo });
    }
  },
};

export default function StatusPage({ data }: PageProps<StatusPageData>) {
  const { statusData, error, owner, repo } = data;

  if (error || !statusData) {
    return (
      <>
        <Navbar />
        <main class="container" style="padding: 80px 24px; text-align: center;">
          <div
            class="playground-card"
            style="max-width: 600px; margin: 0 auto;"
          >
            <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
            <h1 style="font-family: var(--font-display); font-size: 1.75rem; margin-bottom: 12px;">
              Could not load status for {owner}/{repo}
            </h1>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">
              {error || "Repository was not found or is currently private."}
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <a href="/" class="btn btn-primary">
                Return to Home
              </a>
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary"
              >
                Open on GitHub ↗
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const {
    fullName,
    description,
    stars,
    openIssuesCount,
    status,
    statusMessage,
    uptimePercentage,
    lastUpdated,
    workflowRuns,
    incidents,
    latestRelease,
    historyBars,
  } = statusData;

  // Calculate CI success rate
  const totalRuns = workflowRuns.length;
  const successfulRuns =
    workflowRuns.filter((r) => r.conclusion === "success").length;
  const ciSuccessRate = totalRuns > 0
    ? Math.round((successfulRuns / totalRuns) * 100)
    : 100;

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_err) {
      return isoStr;
    }
  };

  return (
    <>
      <Navbar />

      <main class="container" style="padding-bottom: 80px;">
        {/* Repo Identity Header */}
        <div class="status-header">
          <div class="repo-identity">
            <div class="repo-titles">
              <img
                src={`https://github.com/${owner}.png`}
                alt={`${owner} avatar`}
                class="repo-avatar"
              />
              <div>
                <h1 class="repo-name">
                  <a
                    href={`https://github.com/${owner}/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View repository on GitHub"
                    style="display: inline-flex; align-items: center; gap: 8px;"
                  >
                    <span>{fullName}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="color: var(--text-muted);"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </h1>
                <p class="repo-desc">{description}</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
              <BadgeCopier owner={owner} repo={repo} />
              <LiveRefresh lastUpdatedIso={lastUpdated} />
            </div>
          </div>

          {/* Status Hero Banner */}
          <div class={`status-banner ${status}`}>
            <div class="status-indicator">
              <div class="status-dot-pulse" />
              <div>
                <div class="status-title">
                  {status === "operational" && "All Systems Operational"}
                  {status === "degraded" && "Partial System Degradation"}
                  {status === "outage" && "Service Outage / Active Issues"}
                  {status === "unknown" && "Status Unknown"}
                </div>
                <div class="status-subtitle">{statusMessage}</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 16px;">
              <a
                href={`/badge/${owner}/${repo}.svg`}
                target="_blank"
                rel="noopener noreferrer"
                title="Direct SVG badge"
              >
                <img
                  src={`/badge/${owner}/${repo}.svg`}
                  alt="Live badge"
                  height="22"
                  style="border-radius: 4px;"
                />
              </a>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">90-Day Uptime</span>
            <span
              class="metric-value"
              style="color: var(--status-operational);"
            >
              {uptimePercentage}%
            </span>
            <span class="metric-sub">Across all workflow runs & checks</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">CI / CD Health</span>
            <span
              class="metric-value"
              style={{
                color: ciSuccessRate > 90
                  ? "var(--status-operational)"
                  : "var(--status-degraded)",
              }}
            >
              {ciSuccessRate}%
            </span>
            <span class="metric-sub">
              {successfulRuns} passed / {totalRuns} recent workflows
            </span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Active Incidents</span>
            <span
              class="metric-value"
              style={{
                color: incidents.filter((i) => i.state === "open").length > 0
                  ? "var(--status-outage)"
                  : "var(--text-primary)",
              }}
            >
              {incidents.filter((i) => i.state === "open").length}
            </span>
            <span class="metric-sub">
              {openIssuesCount} total open issues on GitHub
            </span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Latest Release</span>
            <span
              class="metric-value"
              style="font-size: 1.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            >
              {latestRelease ? latestRelease.tag : "Rolling"}
            </span>
            <span class="metric-sub">
              {latestRelease
                ? formatDate(latestRelease.publishedAt)
                : "Continuous Deployment"}
            </span>
          </div>
        </div>

        {/* 90-Day Timeline Section */}
        <section class="section-card">
          <div class="section-title-row">
            <h2 class="section-title">System Reliability & History</h2>
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              ⭐️ {stars.toLocaleString()} Stars on GitHub
            </span>
          </div>
          <UptimeBarTooltip
            historyBars={historyBars}
            overallUptimePercent={uptimePercentage}
          />
        </section>

        {/* Workflow Runs Timeline */}
        <section class="section-card">
          <div class="section-title-row">
            <h2 class="section-title">Recent CI/CD & Deploy Workflows</h2>
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              Powered by GitHub Actions
            </span>
          </div>

          {workflowRuns.length === 0
            ? (
              <div style="padding: 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface-elevated); border-radius: 8px;">
                No public GitHub Actions runs found for this repository.
              </div>
            )
            : (
              <div class="runs-list">
                {workflowRuns.map((run) => {
                  const isSuccess = run.conclusion === "success";
                  const isFailure = run.conclusion === "failure";

                  return (
                    <div key={run.id} class="run-item">
                      <div class="run-meta">
                        <div
                          class={`run-status-icon ${
                            isSuccess
                              ? "run-success"
                              : isFailure
                              ? "run-failure"
                              : ""
                          }`}
                        >
                          {isSuccess
                            ? (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )
                            : isFailure
                            ? (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )
                            : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                              >
                                <circle cx="12" cy="12" r="10" />
                              </svg>
                            )}
                        </div>

                        <div class="run-details">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <a
                              href={run.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="run-name"
                              style="text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.15s;"
                            >
                              {run.name}
                            </a>
                            <span class="commit-badge">#{run.runNumber}</span>
                            <span style="font-size: 0.78rem; color: var(--text-muted);">
                              on {run.branch}
                            </span>
                          </div>

                          <div class="run-commit">
                            <span style="color: var(--text-secondary);">
                              "{run.commitMessage.slice(0, 75)}"
                            </span>
                            {run.commitSha && (
                              <span class="commit-badge">{run.commitSha}</span>
                            )}
                            <span style="color: var(--text-muted);">
                              by {run.author.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div class="run-time">
                        <div>{formatDate(run.createdAt)}</div>
                        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                          ⏱ {formatDuration(run.durationSeconds)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>

        {/* Incidents & Tracker */}
        <section class="section-card">
          <div class="section-title-row">
            <h2 class="section-title">Incident & Outage History</h2>
            <a
              href={`https://github.com/${owner}/${repo}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-ghost btn-sm"
              style="font-size: 0.8rem;"
            >
              View GitHub Issues ↗
            </a>
          </div>

          {incidents.length === 0
            ? (
              <div style="padding: 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface-elevated); border-radius: 8px;">
                ✨ No active or past incidents recorded in the repository. All
                systems operational.
              </div>
            )
            : (
              <div>
                {incidents.map((incident) => {
                  const isOpen = incident.state === "open";
                  return (
                    <div key={incident.id} class="incident-item">
                      <div class="incident-title-row">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <span
                            class="incident-badge-pill"
                            style={{
                              background: isOpen
                                ? "var(--status-outage-bg)"
                                : "var(--status-operational-bg)",
                              color: isOpen
                                ? "var(--status-outage)"
                                : "var(--status-operational)",
                              border: `1px solid ${
                                isOpen
                                  ? "var(--status-outage-border)"
                                  : "var(--status-operational-border)"
                              }`,
                            }}
                          >
                            {isOpen ? "Active Outage" : "Resolved"}
                          </span>
                          <a
                            href={incident.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style="font-weight: 600; color: var(--text-primary);"
                          >
                            #{incident.number}: {incident.title}
                          </a>
                        </div>

                        <span style="font-size: 0.8rem; color: var(--text-muted);">
                          {isOpen
                            ? `Opened ${formatDate(incident.createdAt)}`
                            : `Resolved ${
                              formatDate(
                                incident.closedAt || incident.updatedAt,
                              )
                            }`}
                        </span>
                      </div>

                      {incident.bodyPreview && (
                        <p style="font-size: 0.86rem; color: var(--text-secondary); margin-top: 6px;">
                          {incident.bodyPreview}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </section>

        {/* Automated Telemetry Ping Step Box */}
        <section class="section-card" style="border-style: dashed;">
          <div class="section-title-row">
            <div>
              <h2 class="section-title" style="font-size: 1.1rem;">
                ⚡ Optional: Automated CI Heartbeat Telemetry
              </h2>
              <p style="font-size: 0.86rem; color: var(--text-secondary); margin-top: 4px;">
                Want instant real-time telemetry whenever your GitHub Action
                completes? Add this 3-line step to your workflow:
              </p>
            </div>
          </div>

          <div class="code-block">
            <pre>{`- name: 📡 Report Telemetry to StatusZero
  if: always()
  run: |
    curl -s -X POST https://statuszero.deno.dev/api/ping/${owner}/${repo} \\
      -H "Content-Type: application/json" \\
      -d '{"workflow":"\${{ github.workflow }}","status":"\${{ job.status }}","branch":"\${{ github.ref_name }}","commit":"\${{ github.sha }}"}'`}</pre>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
