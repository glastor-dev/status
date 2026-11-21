// routes/api/webhook/github.ts
import { FreshContext } from "$fresh/server.ts";
import { fetchRepoStatus } from "../../../services/github.ts";
import { invalidateRepoCache } from "../../../services/kv.ts";
import {
  isValidGitHubIdentifier,
  readBoundedBody,
  verifyHmacSha256,
} from "../../../services/security.ts";

const MAX_WEBHOOK_BODY_BYTES = 256 * 1024; // 256 KiB

export const handler = async (
  req: Request,
  _ctx: FreshContext,
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

  // AppSec: Fail-closed if GITHUB_WEBHOOK_SECRET is not configured
  const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET")?.trim();
  const allowUnauthenticated =
    Deno.env.get("ALLOW_UNAUTHENTICATED_WEBHOOKS") === "true";
  if (!webhookSecret && !allowUnauthenticated) {
    return new Response(
      JSON.stringify({
        error:
          "Webhook deshabilitado: configura GITHUB_WEBHOOK_SECRET en el entorno (fail-closed).",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const event = req.headers.get("x-github-event") || "unknown";
  const signature = req.headers.get("x-hub-signature-256") || "";
  const bodyResult = await readBoundedBody(req, MAX_WEBHOOK_BODY_BYTES);
  if (!bodyResult.ok) {
    return new Response(JSON.stringify({ error: bodyResult.error }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
  const rawBody = bodyResult.text;

  // AppSec: Verify HMAC-SHA256 signature
  if (webhookSecret) {
    if (!signature) {
      return new Response(
        JSON.stringify({
          error: "Firma X-Hub-Signature-256 requerida pero no provista.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const isValid = await verifyHmacSha256(webhookSecret, rawBody, signature);
    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: "Firma X-Hub-Signature-256 inválida.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo JSON no válido." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle GitHub Ping event (webhook setup confirmation)
  if (event === "ping") {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Webhook de GitHub registrado exitosamente en StatusZero.",
        zen: payload.zen || "Keep it logically awesome.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Extract repository details from payload
  const repoObj = payload.repository as
    | { name?: string; owner?: { login?: string } }
    | undefined;
  const owner = repoObj?.owner?.login || "";
  const repo = repoObj?.name || "";

  if (
    owner && repo && isValidGitHubIdentifier(owner) &&
    isValidGitHubIdentifier(repo)
  ) {
    // Invalidate Deno KV cache so next query gets fresh data immediately
    await invalidateRepoCache(owner, repo);

    // Re-prime cache asynchronously for high performance
    if (
      event === "workflow_run" ||
      event === "issues" ||
      event === "release"
    ) {
      // Fire-and-forget background cache update
      fetchRepoStatus(owner, repo, true).catch(() => {
        // Silently handled in background
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event,
        owner,
        repo,
        message:
          `Evento '${event}' procesado. Estado del repositorio sincronizado en tiempo real.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      event,
      message: "Evento recibido pero sin repositorio objetivo identificable.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
