// services/kv.ts
// Deno KV storage layer for caching GitHub API metrics, uptime history, and CI pings.

export interface WorkflowRunItem {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  commitSha: string;
  commitMessage: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  branch: string;
  event: string;
  runNumber: number;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
}

export interface IncidentItem {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  state: "open" | "closed";
  labels: { name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  bodyPreview: string;
}

export interface ReleaseInfo {
  tag: string;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  author: string;
}

export interface HistoryDay {
  date: string; // YYYY-MM-DD
  status: "operational" | "degraded" | "outage" | "none";
  uptimePercent: number;
  totalRuns: number;
  failedRuns: number;
  incidentsCount: number;
}

export interface PingRecord {
  timestamp: string;
  workflow?: string;
  branch?: string;
  commit?: string;
  status?: "success" | "failure" | "in_progress";
  message?: string;
  latencyMs?: number;
  endpoint?: string;
  httpStatus?: number;
}

export interface RepoStatusData {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  stars: number;
  openIssuesCount: number;
  defaultBranch: string;
  isArchived: boolean;
  htmlUrl: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  statusMessage: string;
  uptimePercentage: number;
  lastUpdated: string;
  cachedAt: number;
  workflowRuns: WorkflowRunItem[];
  incidents: IncidentItem[];
  latestRelease: ReleaseInfo | null;
  historyBars: HistoryDay[];
  recentPings: PingRecord[];
  averageLatencyMs?: number;
  lastPingLatencyMs?: number;
  isRateLimited?: boolean;
  rateLimitResetMinutes?: number;
  etag?: string;
}

export interface DailyHistorySnapshot {
  date: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  uptimePercent: number;
  updatedAt: string;
}

let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv();
  }
  return kvInstance;
}

export function getCacheTtlMs(): number {
  // If no GITHUB_TOKEN is configured, use 5-minute TTL to preserve unauthenticated IP quota
  return Deno.env.get("GITHUB_TOKEN") ? 60 * 1000 : 5 * 60 * 1000;
}

export async function getCachedRepoStatus(
  owner: string,
  repo: string,
  allowStale = false,
): Promise<RepoStatusData | null> {
  const kv = await getKv();
  const key = ["repo_status", owner.toLowerCase(), repo.toLowerCase()];
  const entry = await kv.get<RepoStatusData>(key);

  if (!entry.value) {
    return null;
  }

  // If stale allowed (for fallback during rate limits), return immediately
  if (allowStale) {
    return entry.value;
  }

  // Check if fresh
  const age = Date.now() - (entry.value.cachedAt || 0);
  if (age > getCacheTtlMs()) {
    return null; // Expired for normal queries, forces fresh fetch unless allowStale
  }

  return entry.value;
}

export async function saveRepoStatus(data: RepoStatusData): Promise<void> {
  const kv = await getKv();
  const key = [
    "repo_status",
    data.owner.toLowerCase(),
    data.repo.toLowerCase(),
  ];
  data.cachedAt = Date.now();
  await kv.set(key, data);

  // Also save history point for today
  const today = new Date().toISOString().slice(0, 10);
  const historyKey = [
    "repo_history",
    data.owner.toLowerCase(),
    data.repo.toLowerCase(),
    today,
  ];
  await kv.set(historyKey, {
    date: today,
    status: data.status,
    uptimePercent: data.uptimePercentage,
    updatedAt: data.lastUpdated,
  });
}

export async function savePing(
  owner: string,
  repo: string,
  ping: PingRecord,
): Promise<void> {
  const kv = await getKv();
  const pingsKey = ["repo_pings", owner.toLowerCase(), repo.toLowerCase()];
  const existing = await kv.get<PingRecord[]>(pingsKey);
  const list = existing.value || [];
  list.unshift(ping);
  const trimmed = list.slice(0, 50); // Keep last 50
  await kv.set(pingsKey, trimmed);
}

export async function getPings(
  owner: string,
  repo: string,
): Promise<PingRecord[]> {
  const kv = await getKv();
  const pingsKey = ["repo_pings", owner.toLowerCase(), repo.toLowerCase()];
  const existing = await kv.get<PingRecord[]>(pingsKey);
  return existing.value || [];
}

/**
 * Retrieves the optional webhook/ping authentication secret for a repository.
 * Returns the repository-specific secret if set, or the global PING_SECRET.
 */
export async function getRepoPingSecret(
  owner: string,
  repo: string,
): Promise<string | null> {
  const kv = await getKv();
  const key = ["repo_ping_secret", owner.toLowerCase(), repo.toLowerCase()];
  const entry = await kv.get<string>(key);
  if (entry.value) {
    return entry.value;
  }
  return Deno.env.get("PING_SECRET") || null;
}

/**
 * Persists a repository-specific ping/webhook secret in Deno KV.
 */
export async function setRepoPingSecret(
  owner: string,
  repo: string,
  secret: string,
): Promise<void> {
  const kv = await getKv();
  const key = ["repo_ping_secret", owner.toLowerCase(), repo.toLowerCase()];
  await kv.set(key, secret.trim());
}

/**
 * Invalidates cached repository status, forcing immediate refresh on next fetch.
 */
export async function invalidateRepoCache(
  owner: string,
  repo: string,
): Promise<void> {
  const kv = await getKv();
  const key = ["repo_status", owner.toLowerCase(), repo.toLowerCase()];
  await kv.delete(key);
}

/**
 * Retrieves persisted daily history snapshots for a repository (up to 90 days).
 */
export async function getRepoHistoryMap(
  owner: string,
  repo: string,
): Promise<Map<string, DailyHistorySnapshot>> {
  const kv = await getKv();
  const prefix = ["repo_history", owner.toLowerCase(), repo.toLowerCase()];
  const map = new Map<string, DailyHistorySnapshot>();
  const iter = kv.list<DailyHistorySnapshot>({ prefix });
  for await (const entry of iter) {
    if (entry.value?.date) {
      map.set(entry.value.date, entry.value);
    }
  }
  return map;
}

/**
 * Atomic CAS rate-limiter backed by Deno KV (prevents concurrent TOCTOU bypasses).
 */
export async function consumeRateLimit(
  key: Deno.KvKey,
  maxPerWindow: number,
  expireInMs: number,
): Promise<{ allowed: boolean; count: number }> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await kv.get<number>(key);
    const current = entry.value ?? 0;
    if (current >= maxPerWindow) {
      return { allowed: false, count: current };
    }
    const next = current + 1;
    const res = await kv
      .atomic()
      .check(entry)
      .set(key, next, { expireIn: expireInMs })
      .commit();
    if (res.ok) {
      return { allowed: true, count: next };
    }
  }
  return { allowed: false, count: maxPerWindow };
}

/**
 * Guards `?refresh=true` against cache-busting DoS with an atomic per-repo cooldown.
 */
export async function canForceRefresh(
  owner: string,
  repo: string,
  cooldownMs = 30 * 1000,
): Promise<boolean> {
  const kv = await getKv();
  const key = ["refresh_cooldown", owner.toLowerCase(), repo.toLowerCase()];
  const entry = await kv.get<number>(key);
  if (entry.value && Date.now() - entry.value < cooldownMs) {
    return false;
  }
  const res = await kv
    .atomic()
    .check(entry)
    .set(key, Date.now(), { expireIn: cooldownMs })
    .commit();
  return res.ok;
}
