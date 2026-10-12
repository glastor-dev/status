// routes/api/ping/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import { PingRecord, savePing } from "../../../../services/kv.ts";

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const owner = ctx.params.owner;
  const repo = ctx.params.repo;

  try {
    const body = await req.json().catch(() => ({}));

    const ping: PingRecord = {
      timestamp: new Date().toISOString(),
      workflow: body.workflow || "Manual Ping",
      branch: body.branch || "main",
      commit: body.commit || "",
      status: (body.status === "failure" ? "failure" : "success") as
        | "success"
        | "failure",
      message: body.message || "Heartbeat ping received",
    };

    await savePing(owner, repo, ping);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Status heartbeat ping recorded in Deno KV.",
        ping,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error recording ping";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
