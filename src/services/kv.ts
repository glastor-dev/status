// Cloudflare KV storage adapter for StatusZero:
// repo status cache, consolidated 90-day history (1 KV read/write), synthetic pings,
// per-repo secrets, rate-limiting, and refresh cooldown.

import type {
  DailyHistorySnapshot,
  Env,
  PingRecord,
  RepoStatusData,
} from "../types";

const MAX_HISTORY_DAYS = 90;

function statusKey(owner: string, repo: string): string {
  return `status:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function historyKey(owner: string, repo: string): string {
  return `history:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function pingsKey(owner: string, repo: string): string {
  return `pings:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function secretKey(owner: string, repo: string): string {
  return `secret:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function refreshCooldownKey(owner: string, repo: string): string {
  return `refresh:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export function getCacheTtlMs(env: Env): number {
  return env.GITHUB_TOKEN?.trim() ? 60 * 1000 : 5 * 60 * 1000;
}

export async function getCachedRepoStatus(
  env: Env,
  owner: string,
  repo: string,
  allowStale = false,
): Promise<RepoStatusData | null> {
  const data = await env.STATUS_KV.get<RepoStatusData>(
    statusKey(owner, repo),
    "json",
  );
  if (!data) return null;
  if (allowStale) return data;

  const age = Date.now() - (data.cachedAt || 0);
  if (age > getCacheTtlMs(env)) {
    return null;
  }
  return data;
}

export async function saveRepoStatus(
  env: Env,
  data: RepoStatusData,
): Promise<void> {
  data.cachedAt = Date.now();
  await env.STATUS_KV.put(
    statusKey(data.owner, data.repo),
    JSON.stringify(data),
  );

  // Consolidate 90-day daily snapshots into a single KV value (1 read + 1 write instead of list())
  const today = new Date().toISOString().slice(0, 10);
  const existing =
    (await env.STATUS_KV.get<Record<string, DailyHistorySnapshot>>(
      historyKey(data.owner, data.repo),
      "json",
    )) ?? {};

  existing[today] = {
    date: today,
    status: data.status,
    uptimePercent: data.uptimePercentage,
    updatedAt: data.lastUpdated,
  };

  // Prune snapshots older than 90 days
  const sortedDates = Object.keys(existing).sort();
  if (sortedDates.length > MAX_HISTORY_DAYS) {
    const excess = sortedDates.slice(0, sortedDates.length - MAX_HISTORY_DAYS);
    for (const oldDate of excess) {
      delete existing[oldDate];
    }
  }

  await env.STATUS_KV.put(
    historyKey(data.owner, data.repo),
    JSON.stringify(existing),
  );
}

export async function getRepoHistoryMap(
  env: Env,
  owner: string,
  repo: string,
): Promise<Map<string, DailyHistorySnapshot>> {
  const raw = await env.STATUS_KV.get<Record<string, DailyHistorySnapshot>>(
    historyKey(owner, repo),
    "json",
  );
  const map = new Map<string, DailyHistorySnapshot>();
  if (raw) {
    for (const [date, snap] of Object.entries(raw)) {
      if (snap?.date) {
        map.set(date, snap);
      }
    }
  }
  return map;
}

export async function savePing(
  env: Env,
  owner: string,
  repo: string,
  ping: PingRecord,
): Promise<void> {
  const key = pingsKey(owner, repo);
  const list = (await env.STATUS_KV.get<PingRecord[]>(key, "json")) ?? [];
  list.unshift(ping);
  await env.STATUS_KV.put(key, JSON.stringify(list.slice(0, 50)));
}

export async function getPings(
  env: Env,
  owner: string,
  repo: string,
): Promise<PingRecord[]> {
  return (
    (await env.STATUS_KV.get<PingRecord[]>(pingsKey(owner, repo), "json")) ?? []
  );
}

export async function getRepoPingSecret(
  env: Env,
  owner: string,
  repo: string,
): Promise<string | null> {
  const perRepo = await env.STATUS_KV.get(secretKey(owner, repo), "text");
  if (perRepo?.trim()) {
    return perRepo.trim();
  }
  return env.PING_SECRET?.trim() || null;
}

export async function invalidateRepoCache(
  env: Env,
  owner: string,
  repo: string,
): Promise<void> {
  await env.STATUS_KV.delete(statusKey(owner, repo));
}

export async function consumeRateLimit(
  env: Env,
  bucketKey: string,
  maxPerWindow: number,
  ttlSeconds: number,
): Promise<{ allowed: boolean; count: number }> {
  const currentRaw = await env.STATUS_KV.get(bucketKey, "text");
  const current = currentRaw ? Number(currentRaw) : 0;
  if (Number.isFinite(current) && current >= maxPerWindow) {
    return { allowed: false, count: current };
  }
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await env.STATUS_KV.put(bucketKey, String(next), {
    expirationTtl: Math.max(60, ttlSeconds),
  });
  return { allowed: true, count: next };
}

export async function canForceRefresh(
  env: Env,
  owner: string,
  repo: string,
  cooldownSeconds = 60,
): Promise<boolean> {
  const key = refreshCooldownKey(owner, repo);
  const lastRaw = await env.STATUS_KV.get(key, "text");
  if (lastRaw) {
    const lastMs = Number(lastRaw);
    if (Number.isFinite(lastMs) && Date.now() - lastMs < cooldownSeconds * 1000) {
      return false;
    }
  }
  await env.STATUS_KV.put(key, String(Date.now()), {
    expirationTtl: Math.max(60, cooldownSeconds),
  });
  return true;
}
