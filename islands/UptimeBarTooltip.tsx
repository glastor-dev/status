// islands/UptimeBarTooltip.tsx
import { useState } from "preact/hooks";
import { HistoryDay } from "../services/kv.ts";

interface UptimeBarTooltipProps {
  historyBars: HistoryDay[];
  overallUptimePercent: number;
}

export default function UptimeBarTooltip({
  historyBars,
  overallUptimePercent,
}: UptimeBarTooltipProps) {
  const [hoveredDay, setHoveredDay] = useState<HistoryDay | null>(null);

  const getBarClass = (day: HistoryDay) => {
    switch (day.status) {
      case "operational":
        return "bar-operational";
      case "degraded":
        return "bar-degraded";
      case "outage":
        return "bar-outage";
      default:
        return "bar-none";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_err) {
      return dateStr;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational":
        return "Operacional";
      case "degraded":
        return "Degradado";
      case "outage":
        return "Interrupción del servicio";
      default:
        return "Sin actividad";
    }
  };

  return (
    <div class="uptime-bars-wrapper">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 0.88rem; color: var(--text-secondary);">
          {hoveredDay
            ? (
              <span style="color: var(--text-primary); font-weight: 500;">
                📅 {formatDate(hoveredDay.date)}:{" "}
                <span
                  style={{
                    color: hoveredDay.status === "operational"
                      ? "var(--status-operational)"
                      : hoveredDay.status === "degraded"
                      ? "var(--status-degraded)"
                      : "var(--status-outage)",
                    fontWeight: 600,
                  }}
                >
                  {getStatusText(hoveredDay.status)}
                </span>{" "}
                ({hoveredDay.uptimePercent}% de disponibilidad
                {hoveredDay.totalRuns > 0
                  ? `, ${hoveredDay.totalRuns} flujos de CI`
                  : ""})
              </span>
            )
            : (
              <span>
                Historial de disponibilidad y uptime (últimos 90 días)
              </span>
            )}
        </span>

        <span style="font-size: 0.88rem; font-weight: 700; color: var(--status-operational);">
          {overallUptimePercent}% Uptime
        </span>
      </div>

      <div
        class="uptime-bars"
        onMouseLeave={() => setHoveredDay(null)}
      >
        {historyBars.map((day) => (
          <div
            key={day.date}
            class={`uptime-bar-col ${getBarClass(day)}`}
            onMouseEnter={() => setHoveredDay(day)}
            title={`${day.date}: ${
              getStatusText(day.status)
            } (${day.uptimePercent}%)`}
          />
        ))}
      </div>

      <div class="uptime-timeline-labels">
        <span>Hace 90 días</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">
          Pasa el cursor sobre las barras para ver el detalle diario
        </span>
        <span>Hoy</span>
      </div>
    </div>
  );
}
