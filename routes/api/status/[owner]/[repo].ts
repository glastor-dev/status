// routes/api/status/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import { fetchRepoStatus } from "../../../../services/github.ts";

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const owner = ctx.params.owner;
  const repo = ctx.params.repo;
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";

  try {
    const data = await fetchRepoStatus(owner, repo, forceRefresh);
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: message, owner, repo }, null, 2),
      {
        status: message.includes("not found") ? 404 : 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};
