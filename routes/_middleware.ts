// routes/_middleware.ts
// Enterprise-grade HTTP Security Headers middleware (AppSec & DevSecOps hardening).

import { FreshContext } from "$fresh/server.ts";

export async function handler(
  req: Request,
  ctx: FreshContext,
): Promise<Response> {
  const url = new URL(req.url);
  const resp = await ctx.next();

  // Baseline Security Headers
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Badges need to be embeddable across any domain (GitHub README, docs, etc.)
  if (url.pathname.startsWith("/badge/")) {
    resp.headers.set("Access-Control-Allow-Origin", "*");
    resp.headers.set("X-Frame-Options", "ALLOWALL");
  } else {
    resp.headers.set("X-Frame-Options", "SAMEORIGIN");
    resp.headers.set(
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

  return resp;
}
