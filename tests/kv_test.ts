// tests/kv_test.ts
import { assertEquals } from "$std/assert/mod.ts";
import {
  getCachedRepoStatus,
  getPings,
  RepoStatusData,
  savePing,
  saveRepoStatus,
} from "../services/kv.ts";

Deno.test("Deno KV - save and retrieve cached repo status", async () => {
  const dummyData: RepoStatusData = {
    owner: "test-owner",
    repo: "test-repo",
    fullName: "test-owner/test-repo",
    description: "A test repository",
    stars: 123,
    openIssuesCount: 4,
    defaultBranch: "main",
    isArchived: false,
    htmlUrl: "https://github.com/test-owner/test-repo",
    status: "operational",
    statusMessage: "All Systems Operational",
    uptimePercentage: 99.95,
    lastUpdated: new Date().toISOString(),
    cachedAt: Date.now(),
    workflowRuns: [],
    incidents: [],
    latestRelease: null,
    historyBars: [],
    recentPings: [],
  };

  await saveRepoStatus(dummyData);
  const retrieved = await getCachedRepoStatus("test-owner", "test-repo");

  assertEquals(retrieved?.fullName, "test-owner/test-repo");
  assertEquals(retrieved?.status, "operational");
  assertEquals(retrieved?.uptimePercentage, 99.95);
});

Deno.test("Deno KV - save and retrieve pings with latency", async () => {
  await savePing("test-owner", "test-repo", {
    timestamp: new Date().toISOString(),
    workflow: "Synthetic Healthcheck",
    branch: "main",
    status: "success",
    message: "HTTP 200 OK",
    latencyMs: 142,
    endpoint: "https://api.test.com/health",
    httpStatus: 200,
  });

  const pings = await getPings("test-owner", "test-repo");
  assertEquals(pings.length > 0, true);
  assertEquals(pings[0].workflow, "Synthetic Healthcheck");
  assertEquals(pings[0].latencyMs, 142);
  assertEquals(pings[0].httpStatus, 200);
  assertEquals(pings[0].endpoint, "https://api.test.com/health");
});

Deno.test("Deno KV - secret management and cache invalidation", async () => {
  const { setRepoPingSecret, getRepoPingSecret, invalidateRepoCache } =
    await import("../services/kv.ts");

  await setRepoPingSecret("sec-owner", "sec-repo", "super-secret-xyz");
  const secret = await getRepoPingSecret("sec-owner", "sec-repo");
  assertEquals(secret, "super-secret-xyz");

  await invalidateRepoCache("test-owner", "test-repo");
  const cachedAfterInvalidation = await getCachedRepoStatus(
    "test-owner",
    "test-repo",
  );
  assertEquals(cachedAfterInvalidation, null);
});

Deno.test("Deno KV - history map, atomic rate limit, and refresh cooldown", async () => {
  const {
    canForceRefresh,
    consumeRateLimit,
    getRepoHistoryMap,
  } = await import("../services/kv.ts");

  const history = await getRepoHistoryMap("test-owner", "test-repo");
  assertEquals(history.size >= 1, true);

  const rlKey = ["test_rl", crypto.randomUUID()];
  const r1 = await consumeRateLimit(rlKey, 2, 60_000);
  const r2 = await consumeRateLimit(rlKey, 2, 60_000);
  const r3 = await consumeRateLimit(rlKey, 2, 60_000);
  assertEquals(r1.allowed, true);
  assertEquals(r2.allowed, true);
  assertEquals(r3.allowed, false);

  const repoName = `cooldown-${crypto.randomUUID().slice(0, 8)}`;
  assertEquals(await canForceRefresh("test-owner", repoName, 60_000), true);
  assertEquals(await canForceRefresh("test-owner", repoName, 60_000), false);
});
