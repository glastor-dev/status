// routes/badge/[owner]/[repo].ts
import { FreshContext } from "$fresh/server.ts";
import { fetchRepoStatus } from "../../../services/github.ts";
import { generateStatusBadge } from "../../../services/badge.ts";
import { isValidGitHubIdentifier } from "../../../services/security.ts";

export const handler = async (
  _req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const owner = ctx.params.owner;
  let repo = ctx.params.repo;

  // Strip .svg suffix if present
  if (repo.endsWith(".svg")) {
    repo = repo.slice(0, -4);
  }

  // AppSec: Strict identifier validation against path traversal & SSRF
  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    const errorSvg = generateStatusBadge("unknown");
    return new Response(errorSvg, {
      status: 400,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  let status: "operational" | "degraded" | "outage" | "unknown" = "unknown";

  try {
    const data = await fetchRepoStatus(owner, repo);
    status = data.status;
  } catch (_err) {
    status = "unknown";
  }

  const svg = generateStatusBadge(status);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
