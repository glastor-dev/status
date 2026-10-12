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
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_err) {
      return dateStr;
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
                    textTransform: "capitalize",
                  }}
                >
                  {hoveredDay.status}
                </span>{" "}
                ({hoveredDay.uptimePercent}% uptime
                {hoveredDay.totalRuns > 0
                  ? `, ${hoveredDay.totalRuns} CI runs`
                  : ""})
              </span>
            )
            : <span>90-Day System Uptime History</span>}
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
            title={`${day.date}: ${day.status} (${day.uptimePercent}%)`}
          />
        ))}
      </div>

      <div class="uptime-timeline-labels">
        <span>90 days ago</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">
          Hover over bars for daily breakdown
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}
