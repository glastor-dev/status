// services/security.ts
// AppSec hardening utilities: input validation, XML escaping, sanitization, and rate-limiting.

const GITHUB_IDENTIFIER_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

/**
 * Validates that an owner or repo identifier matches strict GitHub naming rules.
 * Prevents directory traversal, SSRF attempts, and header injection.
 */
export function isValidGitHubIdentifier(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  // Reject relative traversal tokens, consecutive dots, and illegal edge chars
  if (
    trimmed === "." ||
    trimmed === ".." ||
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.startsWith(".") ||
    trimmed.endsWith(".")
  ) {
    return false;
  }
  return GITHUB_IDENTIFIER_REGEX.test(trimmed);
}

/**
 * Escapes characters for safe insertion into SVG XML elements and attributes.
 * Prevents SVG-based XSS and XML entity injection.
 */
export function escapeXml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sanitizes and bounds arbitrary strings to a maximum length.
 * Filters out ASCII control characters without regex.
 */
export function sanitizeText(str: string, maxLength = 250): string {
  if (!str || typeof str !== "string") return "";
  let clean = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Keep printable characters (space and above, excluding DEL)
    if (code >= 32 && code !== 127) {
      clean += str[i];
    }
  }
  return clean.trim().slice(0, maxLength);
}
