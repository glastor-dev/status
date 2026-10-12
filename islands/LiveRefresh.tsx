// islands/LiveRefresh.tsx
import { useEffect, useState } from "preact/hooks";

interface LiveRefreshProps {
  lastUpdatedIso: string;
}

export default function LiveRefresh({ lastUpdatedIso }: LiveRefreshProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const lastTime = new Date(lastUpdatedIso).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - lastTime) / 1000));
      setSecondsAgo(diff);

      setCountdown((prev) => {
        if (prev <= 1) {
          // Disparar recarga
          globalThis.location.reload();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdatedIso]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    const url = new URL(globalThis.location.href);
    url.searchParams.set("refresh", "true");
    globalThis.location.href = url.toString();
  };

  const formatAgo = (s: number) => {
    if (s < 10) return "hace un momento";
    if (s < 60) return `hace ${s}s`;
    const m = Math.floor(s / 60);
    return `hace ${m}m`;
  };

  return (
    <div style="display: flex; align-items: center; gap: 12px; font-size: 0.82rem; color: var(--text-muted);">
      <span>
        Actualizado{" "}
        <strong style="color: var(--text-secondary);">
          {formatAgo(secondsAgo)}
        </strong>
      </span>
      <span>•</span>
      <span>
        Auto-refresco en{" "}
        <strong style="color: var(--text-secondary);">{countdown}s</strong>
      </span>
      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        class="btn btn-secondary btn-sm"
        style="padding: 4px 10px; font-size: 0.78rem;"
        title="Consultar GitHub para actualizaciones en vivo"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          style={{
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
        <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
      </button>
      <style>
        {`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}
      </style>
    </div>
  );
}
