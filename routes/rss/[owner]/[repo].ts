// routes/rss/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import { fetchRepoStatus } from "../../../services/github.ts";
import {
  escapeXml,
  isValidGitHubIdentifier,
} from "../../../services/security.ts";

export const handler = async (
  _req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const owner = ctx.params.owner;
  let repo = ctx.params.repo;

  // Support /rss/:owner/:repo.xml
  if (repo.endsWith(".xml")) {
    repo = repo.slice(0, -4);
  }

  // AppSec: Strict validation
  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error: Identificador inválido</title>
    <description>Identificador de repositorio o propietario no válido.</description>
  </channel>
</rss>`,
      {
        status: 400,
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  try {
    const data = await fetchRepoStatus(owner, repo);
    const nowRfc822 = new Date().toUTCString();
    const siteUrl = `https://statuszero.deno.dev/${encodeURIComponent(owner)}/${
      encodeURIComponent(repo)
    }`;

    const itemsXml = data.incidents.map((incident) => {
      const isOutage = incident.state === "open";
      const statusPrefix = isOutage ? "🚨 [INCIDENTE ACTIVO]" : "✅ [RESUELTO]";
      const pubDate = new Date(incident.createdAt).toUTCString();
      const desc = incident.bodyPreview
        ? escapeXml(incident.bodyPreview)
        : `Incidente registrado en GitHub #${incident.number}.`;

      return `    <item>
      <title>${statusPrefix} #${incident.number}: ${
        escapeXml(incident.title)
      }</title>
      <link>${escapeXml(incident.htmlUrl)}</link>
      <guid isPermaLink="true">${escapeXml(incident.htmlUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
    }).join("\n");

    const statusSummaryItem = `    <item>
      <title>📊 Estado Actual: ${data.status.toUpperCase()} (${data.uptimePercentage}% disponibilidad)</title>
      <link>${siteUrl}</link>
      <guid isPermaLink="false">${siteUrl}#${Date.now()}</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>${
      escapeXml(data.statusMessage)
    } — Última actualización: ${data.lastUpdated}</description>
    </item>`;

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Estado e Incidentes — ${escapeXml(owner)}/${escapeXml(repo)}</title>
    <link>${siteUrl}</link>
    <description>Feed RSS oficial de disponibilidad e incidentes para ${
      escapeXml(owner)
    }/${escapeXml(repo)} generado por StatusZero.</description>
    <language>es</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${siteUrl}/rss" rel="self" type="application/rss+xml" />
${statusSummaryItem}
${itemsXml}
  </channel>
</rss>`;

    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=120, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : "Error al obtener estado";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error al generar feed</title>
    <description>${escapeXml(message)}</description>
  </channel>
</rss>`,
      {
        status: 500,
        headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
      },
    );
  }
};
