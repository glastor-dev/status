// routes/api/ping/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import { getKv, PingRecord, savePing } from "../../../../services/kv.ts";
import {
  isValidGitHubIdentifier,
  sanitizeText,
} from "../../../../services/security.ts";

const RATE_LIMIT_MAX_PER_MINUTE = 30;

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

  // AppSec: Strict input validation
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

  // AppSec: Rate Limiting via Deno KV
  const kv = await getKv();
  const currentMinute = Math.floor(Date.now() / 60000);
  const rateLimitKey = [
    "ratelimit_ping",
    owner.toLowerCase(),
    repo.toLowerCase(),
    currentMinute,
  ];
  const rateLimitEntry = await kv.get<number>(rateLimitKey);
  const currentCount = rateLimitEntry.value || 0;

  if (currentCount >= RATE_LIMIT_MAX_PER_MINUTE) {
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

  await kv.set(rateLimitKey, currentCount + 1, { expireIn: 120 * 1000 });

  try {
    const body = await req.json().catch(() => ({}));

    // AppSec: Sanitizar longitudes y caracteres
    const ping: PingRecord = {
      timestamp: new Date().toISOString(),
      workflow: sanitizeText(body.workflow || "Manual Ping", 80),
      branch: sanitizeText(body.branch || "main", 100),
      commit: sanitizeText(body.commit || "", 40),
      status: (body.status === "failure" ? "failure" : "success") as
        | "success"
        | "failure",
      message: sanitizeText(body.message || "Heartbeat ping recibido", 200),
    };

    await savePing(owner, repo, ping);

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
