// services/badge.ts
// Crisp, modern SVG status badge generator for GitHub READMEs.

interface BadgeOptions {
  label?: string;
  statusText: string;
  color: string;
  dotColor?: string;
}

export function generateStatusBadge(
  status: "operational" | "degraded" | "outage" | "unknown",
): string {
  const label = "status";
  let statusText = "operational";
  let color = "#10b981"; // Emerald green
  let dotColor = "#34d399";

  if (status === "degraded") {
    statusText = "degraded";
    color = "#f59e0b"; // Amber
    dotColor = "#fbbf24";
  } else if (status === "outage") {
    statusText = "major outage";
    color = "#ef4444"; // Red
    dotColor = "#f87171";
  } else if (status === "unknown") {
    statusText = "unknown";
    color = "#64748b"; // Slate
    dotColor = "#94a3b8";
  }

  return renderSvgBadge({ label, statusText, color, dotColor });
}

function renderSvgBadge(opts: BadgeOptions): string {
  const leftText = opts.label || "status";
  const rightText = opts.statusText;

  // Approximate character widths for Verdana/sans-serif 11px
  const charWidth = 6.8;
  const leftWidth = Math.round(leftText.length * charWidth + 18);
  const rightWidth = Math.round(rightText.length * charWidth + 26);
  const totalWidth = leftWidth + rightWidth;
  const height = 20;

  const leftTextX = Math.round(leftWidth / 2);
  const dotX = leftWidth + 10;
  const rightTextX = leftWidth + 16 +
    Math.round((rightText.length * charWidth) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="100%" stop-color="#000" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="${height}" fill="#181c24"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${opts.color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="600">
    <text x="${leftTextX}" y="14" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftTextX}" y="13" fill="#e2e8f0">${leftText}</text>
    
    <!-- Status Dot -->
    <circle cx="${dotX}" cy="10" r="3.5" fill="${opts.dotColor || "#fff"}" />
    
    <text x="${rightTextX}" y="14" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${rightTextX}" y="13" fill="#ffffff">${rightText}</text>
  </g>
</svg>`;
}
