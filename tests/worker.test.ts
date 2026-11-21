import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateStatusBadge } from "../src/services/badge";
import {
  computeOverallStatus,
  generateHistoryDays,
} from "../src/services/github";
import {
  createHmacSha256,
  isValidGitHubIdentifier,
  readBoundedBody,
  verifyHmacSha256,
} from "../src/services/security";
import type { DailyHistorySnapshot, Env, PingRecord } from "../src/types";

function createMockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string, type?: string) {
      const val = store.get(key);
      if (val === undefined) return null;
      if (type === "json") return JSON.parse(val);
      return val;
    },
    async put(key: string, value: string) {
      store.set(key, String(value));
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { keys: [], list_complete: true, cacheStatus: null };
    },
    async getWithMetadata() {
      return { value: null, metadata: null, cacheStatus: null };
    },
  } as unknown as KVNamespace;
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    STATUS_KV: createMockKv(),
    ...overrides,
  };
}

describe("StatusZero Cloudflare Worker", () => {
  it("serves healthcheck and home page with hardened security headers", async () => {
    const env = makeEnv();
    const health = await app.request("/health", {}, env);
    expect(health.status).toBe(200);
    expect(health.headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000",
    );
    expect(health.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const home = await app.request("/", {}, env);
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain("StatusZero");
    expect(html).toContain("Cloudflare Workers");
  });

  it("enforces fail-closed on webhook and ping endpoints when secrets are unset", async () => {
    const env = makeEnv();

    const whRes = await app.request(
      "/api/webhook/github",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-github-event": "ping" },
        body: "{}",
      },
      env,
    );
    expect(whRes.status).toBe(503);

    const pingRes = await app.request(
      "/api/ping/glastor-dev/status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "success", latencyMs: 42 }),
      },
      env,
    );
    expect(pingRes.status).toBe(503);
  });

  it("authenticates webhook HMAC-SHA256 and ping Bearer tokens properly", async () => {
    const env = makeEnv({
      GITHUB_WEBHOOK_SECRET: "wh-secret-test",
      PING_SECRET: "ping-secret-test",
    });

    const payload = JSON.stringify({ zen: "Keep it fast." });
    const sig = await createHmacSha256("wh-secret-test", payload);

    const badWh = await app.request(
      "/api/webhook/github",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "ping",
          "x-hub-signature-256": "sha256=deadbeef",
        },
        body: payload,
      },
      env,
    );
    expect(badWh.status).toBe(401);

    const goodWh = await app.request(
      "/api/webhook/github",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "ping",
          "x-hub-signature-256": `sha256=${sig}`,
        },
        body: payload,
      },
      env,
    );
    expect(goodWh.status).toBe(200);

    const goodPing = await app.request(
      "/api/ping/glastor-dev/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ping-secret-test",
        },
        body: JSON.stringify({
          workflow: "Edge Check",
          status: "success",
          latencyMs: 35,
          httpStatus: 200,
        }),
      },
      env,
    );
    expect(goodPing.status).toBe(200);
    const pingJson = (await goodPing.json()) as { ok: boolean };
    expect(pingJson.ok).toBe(true);
  });

  it("rejects oversized request bodies and invalid identifiers", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      body: "x".repeat(2048),
    });
    const bounded = await readBoundedBody(req, 512);
    expect(bounded.ok).toBe(false);

    expect(isValidGitHubIdentifier("glastor-dev")).toBe(true);
    expect(isValidGitHubIdentifier("../etc/passwd")).toBe(false);
    expect(await verifyHmacSha256("k", "d", "bad")).toBe(false);
  });

  it("generates escaped SVG badges and integrates failed pings + KV history", () => {
    const svg = generateStatusBadge("operational", "en", "<xss>");
    expect(svg).toContain("&lt;xss&gt;");
    expect(svg).not.toContain("<xss>");

    const now = Date.now();
    const failedPing: PingRecord = {
      timestamp: new Date(now - 30_000).toISOString(),
      status: "failure",
      message: "HTTP 503",
      httpStatus: 503,
    };
    expect(computeOverallStatus([], [], [failedPing], now).status).toBe(
      "outage",
    );

    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const kvHistory = new Map<string, DailyHistorySnapshot>([
      [
        fortyDaysAgo,
        {
          date: fortyDaysAgo,
          status: "degraded",
          uptimePercent: 97.5,
          updatedAt: new Date(now).toISOString(),
        },
      ],
    ]);
    const bars = generateHistoryDays([], [], kvHistory);
    expect(bars.find((b) => b.date === fortyDaysAgo)?.uptimePercent).toBe(97.5);
  });
});
