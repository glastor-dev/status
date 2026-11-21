import type { RepoStatusData } from "../types";
import { Layout } from "./layout";

interface StatusPageProps {
  data: RepoStatusData;
  origin: string;
}

export function StatusPage({ data, origin }: StatusPageProps) {
  const statusClass =
    data.status === "operational"
      ? "status-operational"
      : data.status === "degraded"
      ? "status-degraded"
      : "status-outage";

  const badgeMarkdown = `[![Status](${origin}/badge/${data.owner}/${data.repo}.svg)](${origin}/${data.owner}/${data.repo})`;

  return (
    <Layout
      title={`${data.fullName} — Estado (${data.uptimePercentage}%) | StatusZero`}
      description={data.statusMessage}
    >
      <section class="container status-container">
        <div class="status-header">
          <div>
            <h1>
              <a
                href={data.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.fullName}
              </a>
            </h1>
            <p class="repo-desc">{data.description}</p>
          </div>
          <div class="status-meta">
            <span>Stars: {data.stars}</span>
            <span>Rama: {data.defaultBranch}</span>
            <a href={`/api/status/${data.owner}/${data.repo}`}>JSON API</a>
            <a href={`/rss/${data.owner}/${data.repo}.xml`}>RSS</a>
          </div>
        </div>

        <div class={`status-banner ${statusClass}`}>
          <div>
            <strong>{data.status.toUpperCase()}</strong> — {data.statusMessage}
          </div>
          <div>
            Disponibilidad 90d: <strong>{data.uptimePercentage}%</strong>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Historial de 90 días</h2>
            <span>Última actualización: {data.lastUpdated}</span>
          </div>
          <div class="uptime-bars" role="list">
            {data.historyBars.map((day) => (
              <div
                key={day.date}
                class={`uptime-bar bar-${day.status}`}
                title={`${day.date}: ${day.status} (${day.uptimePercent}% | runs: ${day.totalRuns}, fallos: ${day.failedRuns}, incidentes: ${day.incidentsCount})`}
              />
            ))}
          </div>
        </div>

        {data.latestRelease && (
          <div class="card">
            <h2>Último Release</h2>
            <p>
              <a
                href={data.latestRelease.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.latestRelease.tag} — {data.latestRelease.name}
              </a>{" "}
              por {data.latestRelease.author} ({data.latestRelease.publishedAt})
            </p>
          </div>
        )}

        <div class="card">
          <h2>Incidencias ({data.incidents.length})</h2>
          {data.incidents.length === 0 ? (
            <p class="muted">No hay incidentes registrados.</p>
          ) : (
            <ul class="incident-list">
              {data.incidents.map((inc) => (
                <li key={inc.id}>
                  <a
                    href={inc.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    #{inc.number} [{inc.state.toUpperCase()}] {inc.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="card">
          <h2>GitHub Actions Recientes ({data.workflowRuns.length})</h2>
          {data.workflowRuns.length === 0 ? (
            <p class="muted">Sin ejecuciones recientes de GitHub Actions.</p>
          ) : (
            <ul class="runs-list">
              {data.workflowRuns.slice(0, 10).map((run) => (
                <li key={run.id}>
                  <a
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>{run.name}</strong> #{run.runNumber} (
                    {run.conclusion ?? run.status}) — {run.commitSha}{" "}
                    {run.commitMessage} ({run.durationSeconds}s)
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data.recentPings.length > 0 && (
          <div class="card">
            <h2>
              Heartbeats Sintéticos ({data.recentPings.length})
              {typeof data.averageLatencyMs === "number"
                ? ` • Latencia media: ${data.averageLatencyMs}ms`
                : ""}
            </h2>
            <ul class="runs-list">
              {data.recentPings.slice(0, 10).map((p, idx) => (
                <li key={idx}>
                  [{p.status ?? "success"}] {p.workflow ?? "Ping"} —{" "}
                  {p.message ?? "OK"}
                  {typeof p.latencyMs === "number" ? ` (${p.latencyMs}ms)` : ""}{" "}
                  • {p.timestamp}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div class="card">
          <h2>Badge para tu README</h2>
          <img
            src={`/badge/${data.owner}/${data.repo}.svg`}
            alt={`Estado de ${data.fullName}`}
          />
          <pre>
            <code>{badgeMarkdown}</code>
          </pre>
        </div>
      </section>
    </Layout>
  );
}
