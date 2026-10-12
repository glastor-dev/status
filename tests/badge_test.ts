import { assertStringIncludes } from "$std/assert/mod.ts";
import { generateStatusBadge } from "../services/badge.ts";

Deno.test("generateStatusBadge - operational", () => {
  const svg = generateStatusBadge("operational");
  assertStringIncludes(svg, "<svg");
  assertStringIncludes(svg, "status");
  assertStringIncludes(svg, "operational");
  assertStringIncludes(svg, "#10b981");
});

Deno.test("generateStatusBadge - degraded", () => {
  const svg = generateStatusBadge("degraded");
  assertStringIncludes(svg, "degraded");
  assertStringIncludes(svg, "#f59e0b");
});

Deno.test("generateStatusBadge - outage", () => {
  const svg = generateStatusBadge("outage");
  assertStringIncludes(svg, "major outage");
  assertStringIncludes(svg, "#ef4444");
});

Deno.test("generateStatusBadge - unknown", () => {
  const svg = generateStatusBadge("unknown");
  assertStringIncludes(svg, "unknown");
  assertStringIncludes(svg, "#64748b");
});
