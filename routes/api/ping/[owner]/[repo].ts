// routes/api/ping/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import {
  consumeRateLimit,
  getRepoPingSecret,
  invalidateRepoCache,
  PingRecord,
  savePing,
} from "../../../../services/kv.ts";
import {
  isValidGitHubIdentifier,
  readBoundedBody,
  sanitizeText,
  timingSafeEqualString,
  verifyHmacSha256,
} from "../../../../services/security.ts";

const RATE_LIMIT_MAX_PER_MINUTE = 30;
const MAX_PING_BODY_BYTES = 32 * 1024; // 32 KiB

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido. Utiliza POST." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const owner = ctx.params.owner;
  const repo = ctx.params.repo;

  // AppSec: Strict input validation against path traversal
  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return new Response(
      JSON.stringify({
        error:
          "Identificador de repositorio o propietario de GitHub no válido.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // AppSec: Atomic Rate Limiting via Deno KV sliding minute
  const currentMinute = Math.floor(Date.now() / 60000);
  const rateLimitKey = [
    "ratelimit_ping",
    owner.toLowerCase(),
    repo.toLowerCase(),
    currentMinute,
  ];
  const rateLimit = await consumeRateLimit(
    rateLimitKey,
    RATE_LIMIT_MAX_PER_MINUTE,
    120 * 1000,
  );

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error:
          "Límite de tasa excedido. Máximo 30 pings por minuto por repositorio.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  const bodyResult = await readBoundedBody(req, MAX_PING_BODY_BYTES);
  if (!bodyResult.ok) {
    return new Response(JSON.stringify({ error: bodyResult.error }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
  const rawBody = bodyResult.text;
  let body: Record<string, unknown> = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Cuerpo de la petición JSON inválido." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // AppSec: Fail-closed authentication check (HMAC-SHA256 or Bearer secret token)
  const configuredSecret = await getRepoPingSecret(owner, repo);
  const allowUnauthenticated =
    Deno.env.get("ALLOW_UNAUTHENTICATED_PINGS") === "true";
  if (!configuredSecret && !allowUnauthenticated) {
    return new Response(
      JSON.stringify({
        error:
          "Endpoint de pings protegido (fail-closed): configura PING_SECRET o un secreto por repositorio.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (configuredSecret) {
    const authHeader = req.headers.get("Authorization") || "";
    const tokenHeader = req.headers.get("x-statuszero-token") || "";
    const signatureHeader = req.headers.get("x-statuszero-signature") || "";

    let isAuthorized = false;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      isAuthorized = timingSafeEqualString(token, configuredSecret);
    } else if (tokenHeader) {
      isAuthorized = timingSafeEqualString(
        tokenHeader.trim(),
        configuredSecret,
      );
    } else if (signatureHeader) {
      isAuthorized = await verifyHmacSha256(
        configuredSecret,
        rawBody,
        signatureHeader,
      );
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error:
            "Autenticación requerida o firma no válida. Configura Authorization: Bearer <SECRET> o x-statuszero-signature.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  try {
    // Parse latency & synthetic monitoring fields
    const latencyRaw = typeof body.latencyMs === "number"
      ? body.latencyMs
      : (typeof body.latency === "number" ? body.latency : undefined);
    const latencyMs = typeof latencyRaw === "number" && !isNaN(latencyRaw)
      ? Math.max(0, Math.min(60000, Math.round(latencyRaw)))
      : undefined;

    const httpStatusRaw = typeof body.httpStatus === "number"
      ? body.httpStatus
      : undefined;
    const httpStatus =
      typeof httpStatusRaw === "number" && httpStatusRaw >= 100 &&
        httpStatusRaw <= 599
        ? httpStatusRaw
        : undefined;

    const endpoint = typeof body.endpoint === "string"
      ? sanitizeText(body.endpoint, 150)
      : undefined;

    // AppSec: Sanitizar longitudes y caracteres
    const ping: PingRecord = {
      timestamp: new Date().toISOString(),
      workflow: sanitizeText(String(body.workflow || "Manual Ping"), 80),
      branch: sanitizeText(String(body.branch || "main"), 100),
      commit: sanitizeText(String(body.commit || ""), 40),
      status: (body.status === "failure" ? "failure" : "success") as
        | "success"
        | "failure",
      message: sanitizeText(
        String(body.message || "Heartbeat ping recibido"),
        200,
      ),
      latencyMs,
      endpoint,
      httpStatus,
    };

    await savePing(owner, repo, ping);
    // Invalidate stale cache so the dashboard immediately shows the new ping & latency
    await invalidateRepoCache(owner, repo);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Heartbeat de telemetría registrado con éxito en Deno KV.",
        ping,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : "Error al registrar el ping";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
