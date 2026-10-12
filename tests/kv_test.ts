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

Deno.test("Deno KV - save and retrieve pings", async () => {
  await savePing("test-owner", "test-repo", {
    timestamp: new Date().toISOString(),
    workflow: "CI",
    branch: "main",
    status: "success",
    message: "Ping passed",
  });

  const pings = await getPings("test-owner", "test-repo");
  assertEquals(pings.length > 0, true);
  assertEquals(pings[0].workflow, "CI");
  assertEquals(pings[0].status, "success");
});
