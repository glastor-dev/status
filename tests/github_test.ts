// tests/github_test.ts
import { assertEquals } from "$std/assert/mod.ts";
import {
  computeOverallStatus,
  generateHistoryDays,
} from "../services/github.ts";
import { DailyHistorySnapshot, PingRecord } from "../services/kv.ts";

Deno.test("GitHub status - integrates recent failed synthetic pings into overall outage status", () => {
  const now = Date.now();
  const failedPing: PingRecord = {
    timestamp: new Date(now - 60_000).toISOString(),
    workflow: "Synthetic Healthcheck",
    status: "failure",
    message: "HTTP 503 Service Unavailable",
    httpStatus: 503,
  };

  const result = computeOverallStatus([], [], [failedPing], now);
  assertEquals(result.status, "outage");
  assertEquals(result.statusMessage.includes("HTTP 503"), true);

  // Stale ping (>24h old) should not trigger an active outage
  const stalePing: PingRecord = {
    ...failedPing,
    timestamp: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
  };
  const staleResult = computeOverallStatus([], [], [stalePing], now);
  assertEquals(staleResult.status, "operational");
});

Deno.test("GitHub history - hydrates older days from persisted Deno KV snapshots", () => {
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const kvHistory = new Map<string, DailyHistorySnapshot>([
    [
      fortyDaysAgo,
      {
        date: fortyDaysAgo,
        status: "degraded",
        uptimePercent: 97.5,
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  const bars = generateHistoryDays([], [], kvHistory);
  const target = bars.find((b) => b.date === fortyDaysAgo);
  assertEquals(target?.status, "degraded");
  assertEquals(target?.uptimePercent, 97.5);
});
