import { Hono } from "hono";
import type { Env, PingRecord } from "./types";
import { generateStatusBadge } from "./services/badge";
import { fetchRepoStatus } from "./services/github";
import {
  canForceRefresh,
  consumeRateLimit,
  getRepoPingSecret,
  invalidateRepoCache,
  savePing,
} from "./services/kv";
import {
  escapeXml,
  isValidGitHubIdentifier,
  readBoundedBody,
  sanitizeText,
  timingSafeEqualString,
  verifyHmacSha256,
} from "./services/security";
import { HomePage } from "./views/home";
import { StatusPage } from "./views/status";

const RATE_LIMIT_MAX_PER_MINUTE = 30;
const MAX_PING_BODY_BYTES = 32 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

const app = new Hono<{ Bindings: Env }>();

// Baseline AppSec security headers middleware
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (c.req.path.startsWith("/badge/")) {
    c.header("Access-Control-Allow-Origin", "*");
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *",
    );
  } else {
    c.header("X-Frame-Options", "SAMEORIGIN");
    c.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://github.com https://avatars.githubusercontent.com",
        "connect-src 'self' https://api.github.com",
        "frame-ancestors 'self'",
      ].join("; "),
    );
  }
});

// Landing page
app.get("/", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.html(<HomePage origin={origin} />);
});

// Health endpoint for observability
app.get("/health", (c) => {
  return c.json({ ok: true, runtime: "cloudflare-workers" });
});

// Dynamic SVG Status Badge
app.get("/badge/:owner/:repo", async (c) => {
  const owner = c.req.param("owner");
  let repo = c.req.param("repo");
  if (repo.endsWith(".svg")) {
    repo = repo.slice(0, -4);
  }
  const lang = c.req.query("lang") === "es" ? "es" : "en";
  const label = c.req.query("label");

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return c.body(generateStatusBadge("unknown", lang, label), 400, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    });
  }

  let status: "operational" | "degraded" | "outage" | "unknown" = "unknown";
  try {
    const data = await fetchRepoStatus(c.env, owner, repo);
    status = data.status;
  } catch {
    status = "unknown";
  }

  return c.body(generateStatusBadge(status, lang, label), 200, {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control":
      "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  });
});

// Headless JSON Status API
app.get("/api/status/:owner/:repo", async (c) => {
  const owner = c.req.param("owner");
  const repo = c.req.param("repo");
  const requestedRefresh = c.req.query("refresh") === "true";

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return c.json(
      {
        error:
          "Identificador de repositorio o propietario de GitHub no válido.",
        owner,
        repo,
      },
      400,
      { "Access-Control-Allow-Origin": "*" },
    );
  }

  try {
    const forceRefresh = requestedRefresh
      ? await canForceRefresh(c.env, owner, repo)
      : false;
    const data = await fetchRepoStatus(c.env, owner, repo, forceRefresh);
    return c.json(data, 200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor";
    const status = message.includes("no fue encontrado") ? 404 : 500;
    return c.json({ error: message, owner, repo }, status, {
      "Access-Control-Allow-Origin": "*",
    });
  }
});

// Synthetic Ping Telemetry Endpoint (Fail-Closed + Bounded Body + Rate Limited)
app.post("/api/ping/:owner/:repo", async (c) => {
  const owner = c.req.param("owner");
  const repo = c.req.param("repo");

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return c.json(
      {
        error:
          "Identificador de repositorio o propietario de GitHub no válido.",
      },
      400,
    );
  }

  const currentMinute = Math.floor(Date.now() / 60000);
  const bucketKey = `rl:ping:${owner.toLowerCase()}/${repo.toLowerCase()}:${currentMinute}`;
  const rateLimit = await consumeRateLimit(
    c.env,
    bucketKey,
    RATE_LIMIT_MAX_PER_MINUTE,
    120,
  );
  if (!rateLimit.allowed) {
    return c.json(
      {
        error:
          "Límite de tasa excedido. Máximo 30 pings por minuto por repositorio.",
      },
      429,
      { "Retry-After": "60" },
    );
  }

  const bodyResult = await readBoundedBody(c.req.raw, MAX_PING_BODY_BYTES);
  if (!bodyResult.ok) {
    return c.json({ error: bodyResult.error }, 413);
  }

  let body: Record<string, unknown> = {};
  if (bodyResult.text.trim()) {
    try {
      body = JSON.parse(bodyResult.text) as Record<string, unknown>;
    } catch {
      return c.json({ error: "Cuerpo de la petición JSON inválido." }, 400);
    }
  }

  const configuredSecret = await getRepoPingSecret(c.env, owner, repo);
  const allowUnauthenticated = c.env.ALLOW_UNAUTHENTICATED_PINGS === "true";
  if (!configuredSecret && !allowUnauthenticated) {
    return c.json(
      {
        error:
          "Endpoint de pings protegido (fail-closed): configura PING_SECRET en Wrangler secrets.",
      },
      503,
    );
  }

  if (configuredSecret) {
    const authHeader = c.req.header("Authorization") || "";
    const tokenHeader = c.req.header("x-statuszero-token") || "";
    const signatureHeader = c.req.header("x-statuszero-signature") || "";

    let isAuthorized = false;
    if (authHeader.startsWith("Bearer ")) {
      isAuthorized = timingSafeEqualString(
        authHeader.slice(7).trim(),
        configuredSecret,
      );
    } else if (tokenHeader) {
      isAuthorized = timingSafeEqualString(
        tokenHeader.trim(),
        configuredSecret,
      );
    } else if (signatureHeader) {
      isAuthorized = await verifyHmacSha256(
        configuredSecret,
        bodyResult.text,
        signatureHeader,
      );
    }

    if (!isAuthorized) {
      return c.json(
        {
          error:
            "Autenticación requerida o firma no válida. Configura Authorization: Bearer <SECRET> o x-statuszero-signature.",
        },
        401,
      );
    }
  }

  const latencyRaw =
    typeof body.latencyMs === "number"
      ? body.latencyMs
      : typeof body.latency === "number"
      ? body.latency
      : undefined;
  const latencyMs =
    typeof latencyRaw === "number" && !Number.isNaN(latencyRaw)
      ? Math.max(0, Math.min(60000, Math.round(latencyRaw)))
      : undefined;

  const httpStatus =
    typeof body.httpStatus === "number" &&
    body.httpStatus >= 100 &&
    body.httpStatus <= 599
      ? body.httpStatus
      : undefined;

  const endpoint =
    typeof body.endpoint === "string"
      ? sanitizeText(body.endpoint, 150)
      : undefined;

  const ping: PingRecord = {
    timestamp: new Date().toISOString(),
    workflow: sanitizeText(String(body.workflow || "Manual Ping"), 80),
    branch: sanitizeText(String(body.branch || "main"), 100),
    commit: sanitizeText(String(body.commit || ""), 40),
    status: body.status === "failure" ? "failure" : "success",
    message: sanitizeText(
      String(body.message || "Heartbeat ping recibido"),
      200,
    ),
    latencyMs,
    endpoint,
    httpStatus,
  };

  await savePing(c.env, owner, repo, ping);
  await invalidateRepoCache(c.env, owner, repo);

  return c.json({
    ok: true,
    message: "Heartbeat de telemetría registrado con éxito en Cloudflare KV.",
    ping,
  });
});

// GitHub Webhook Endpoint (Fail-Closed + HMAC-SHA256 + ctx.waitUntil re-prime)
app.post("/api/webhook/github", async (c) => {
  const webhookSecret = c.env.GITHUB_WEBHOOK_SECRET?.trim();
  const allowUnauthenticated = c.env.ALLOW_UNAUTHENTICATED_WEBHOOKS === "true";
  if (!webhookSecret && !allowUnauthenticated) {
    return c.json(
      {
        error:
          "Webhook deshabilitado: configura GITHUB_WEBHOOK_SECRET en Wrangler secrets (fail-closed).",
      },
      503,
    );
  }

  const event = c.req.header("x-github-event") || "unknown";
  const signature = c.req.header("x-hub-signature-256") || "";
  const bodyResult = await readBoundedBody(c.req.raw, MAX_WEBHOOK_BODY_BYTES);
  if (!bodyResult.ok) {
    return c.json({ error: bodyResult.error }, 413);
  }

  if (webhookSecret) {
    if (!signature) {
      return c.json(
        { error: "Firma X-Hub-Signature-256 requerida pero no provista." },
        401,
      );
    }
    const isValid = await verifyHmacSha256(
      webhookSecret,
      bodyResult.text,
      signature,
    );
    if (!isValid) {
      return c.json({ error: "Firma X-Hub-Signature-256 inválida." }, 401);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyResult.text) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Cuerpo JSON no válido." }, 400);
  }

  if (event === "ping") {
    return c.json({
      ok: true,
      message: "Webhook de GitHub registrado exitosamente en StatusZero.",
      zen: payload.zen || "Keep it logically awesome.",
    });
  }

  const repoObj = payload.repository as
    | { name?: string; owner?: { login?: string } }
    | undefined;
  const owner = repoObj?.owner?.login || "";
  const repo = repoObj?.name || "";

  if (
    owner &&
    repo &&
    isValidGitHubIdentifier(owner) &&
    isValidGitHubIdentifier(repo)
  ) {
    await invalidateRepoCache(c.env, owner, repo);

    if (
      event === "workflow_run" ||
      event === "issues" ||
      event === "release"
    ) {
      // Properly attach background re-prime to Worker lifecycle via waitUntil
      try {
        c.executionCtx.waitUntil(
          fetchRepoStatus(c.env, owner, repo, true).catch(() => {}),
        );
      } catch {
        // In unit tests without ExecutionContext, skip background re-prime
      }
    }

    return c.json({
      ok: true,
      event,
      owner,
      repo,
      message: `Evento '${event}' procesado. Estado sincronizado en tiempo real.`,
    });
  }

  return c.json({
    ok: true,
    event,
    message: "Evento recibido pero sin repositorio objetivo identificable.",
  });
});

// RSS 2.0 Feed
app.get("/rss/:owner/:repo", async (c) => {
  const owner = c.req.param("owner");
  let repo = c.req.param("repo");
  if (repo.endsWith(".xml")) {
    repo = repo.slice(0, -4);
  }

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return c.body(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>Identificador inválido</description></channel></rss>`,
      400,
      { "Content-Type": "application/rss+xml; charset=utf-8" },
    );
  }

  try {
    const data = await fetchRepoStatus(c.env, owner, repo);
    const nowRfc822 = new Date().toUTCString();
    const origin = c.env.SITE_URL?.trim() || new URL(c.req.url).origin;
    const siteUrl = `${origin}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const itemsXml = data.incidents
      .map((incident) => {
        const prefix =
          incident.state === "open" ? "[INCIDENTE ACTIVO]" : "[RESUELTO]";
        const pubDate = new Date(incident.createdAt).toUTCString();
        const desc = incident.bodyPreview
          ? escapeXml(incident.bodyPreview)
          : `Incidente registrado en GitHub #${incident.number}.`;
        return `    <item>
      <title>${prefix} #${incident.number}: ${escapeXml(incident.title)}</title>
      <link>${escapeXml(incident.htmlUrl)}</link>
      <guid isPermaLink="true">${escapeXml(incident.htmlUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Estado e Incidentes — ${escapeXml(owner)}/${escapeXml(repo)}</title>
    <link>${siteUrl}</link>
    <description>Feed RSS de disponibilidad e incidentes para ${escapeXml(owner)}/${escapeXml(repo)}.</description>
    <language>es</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${origin}/rss/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>Estado Actual: ${data.status.toUpperCase()} (${data.uptimePercentage}%)</title>
      <link>${siteUrl}</link>
      <guid isPermaLink="false">${siteUrl}#${Date.now()}</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>${escapeXml(data.statusMessage)} — ${data.lastUpdated}</description>
    </item>
${itemsXml}
  </channel>
</rss>`;

    return c.body(rssXml, 200, {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=300",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al obtener estado";
    return c.body(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>${escapeXml(message)}</description></channel></rss>`,
      500,
      { "Content-Type": "application/rss+xml; charset=utf-8" },
    );
  }
});

// Status Page SSR
app.get("/:owner/:repo", async (c) => {
  const owner = c.req.param("owner");
  const repo = c.req.param("repo");

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return c.text("Identificador de repositorio inválido.", 400);
  }

  try {
    const data = await fetchRepoStatus(c.env, owner, repo);
    const origin = new URL(c.req.url).origin;
    return c.html(<StatusPage data={data} origin={origin} />);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Repositorio no encontrado";
    return c.text(message, message.includes("no fue encontrado") ? 404 : 500);
  }
});

export default app;
