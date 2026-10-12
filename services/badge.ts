// services/badge.ts
// Crisp, modern SVG status badge generator for GitHub READMEs, hardened against XML/SVG injections.

import { escapeXml } from "./security.ts";

interface BadgeOptions {
  label?: string;
  statusText: string;
  color: string;
  dotColor?: string;
}

export function generateStatusBadge(
  status: "operational" | "degraded" | "outage" | "unknown",
  lang: "en" | "es" = "en",
): string {
  const label = lang === "es" ? "estado" : "status";
  let statusText = lang === "es" ? "operacional" : "operational";
  let color = "#10b981"; // Emerald green
  let dotColor = "#34d399";

  if (status === "degraded") {
    statusText = lang === "es" ? "degradado" : "degraded";
    color = "#f59e0b"; // Amber
    dotColor = "#fbbf24";
  } else if (status === "outage") {
    statusText = lang === "es" ? "interrupción" : "major outage";
    color = "#ef4444"; // Red
    dotColor = "#f87171";
  } else if (status === "unknown") {
    statusText = lang === "es" ? "desconocido" : "unknown";
    color = "#64748b"; // Slate
    dotColor = "#94a3b8";
  }

  return renderSvgBadge({ label, statusText, color, dotColor });
}

function renderSvgBadge(opts: BadgeOptions): string {
  const rawLeft = opts.label || "status";
  const rawRight = opts.statusText;

  // Approximate character widths for Verdana/sans-serif 11px
  const charWidth = 6.8;
  const leftWidth = Math.round(rawLeft.length * charWidth + 18);
  const rightWidth = Math.round(rawRight.length * charWidth + 26);
  const totalWidth = leftWidth + rightWidth;
  const height = 20;

  const leftTextX = Math.round(leftWidth / 2);
  const dotX = leftWidth + 10;
  const rightTextX = leftWidth + 16 +
    Math.round((rawRight.length * charWidth) / 2);

  // XML-escape values to neutralize SVG-based XSS injection
  const safeLeft = escapeXml(rawLeft);
  const safeRight = escapeXml(rawRight);
  const safeColor = escapeXml(opts.color);
  const safeDotColor = escapeXml(opts.dotColor || "#fff");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${safeLeft}: ${safeRight}">
  <title>${safeLeft}: ${safeRight}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="100%" stop-color="#000" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="${height}" fill="#181c24"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${safeColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="600">
    <text x="${leftTextX}" y="14" fill="#010101" fill-opacity=".3">${safeLeft}</text>
    <text x="${leftTextX}" y="13" fill="#e2e8f0">${safeLeft}</text>
    
    <!-- Status Dot -->
    <circle cx="${dotX}" cy="10" r="3.5" fill="${safeDotColor}" />
    
    <text x="${rightTextX}" y="14" fill="#010101" fill-opacity=".3">${safeRight}</text>
    <text x="${rightTextX}" y="13" fill="#ffffff">${safeRight}</text>
  </g>
</svg>`;
}
