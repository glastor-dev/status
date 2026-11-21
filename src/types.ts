export interface Env {
  STATUS_KV: KVNamespace;
  GITHUB_TOKEN?: string;
  PING_SECRET?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  ALLOW_UNAUTHENTICATED_PINGS?: string;
  ALLOW_UNAUTHENTICATED_WEBHOOKS?: string;
  SITE_URL?: string;
}

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

export interface DailyHistorySnapshot {
  date: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  uptimePercent: number;
  updatedAt: string;
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
