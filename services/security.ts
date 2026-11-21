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

/**
 * Timing-safe string comparison to mitigate side-channel timing attacks.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    mismatch |= bufA[i] ^ bufB[i];
  }
  return mismatch === 0;
}

/**
 * Computes an HMAC-SHA256 hex digest for arbitrary string data.
 */
export async function createHmacSha256(
  secret: string,
  data: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies an HMAC-SHA256 signature in a timing-safe manner.
 * Supports standard GitHub webhook 'sha256=' prefix.
 */
export async function verifyHmacSha256(
  secret: string,
  data: string,
  expectedHex: string,
): Promise<boolean> {
  if (!secret || !data || !expectedHex) return false;
  try {
    const cleanExpected = expectedHex.replace(/^sha256=/, "").trim();
    const computedHex = await createHmacSha256(secret, data);
    return timingSafeEqualString(
      computedHex.toLowerCase(),
      cleanExpected.toLowerCase(),
    );
  } catch {
    return false;
  }
}

/**
 * Reads a Request body up to `maxBytes`, aborting early if Content-Length or streamed bytes
 * exceed the limit (mitigates memory exhaustion / payload flooding).
 */
export async function readBoundedBody(
  req: Request,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return {
        ok: false,
        error:
          `Cuerpo de la petición demasiado grande (máximo ${maxBytes} bytes).`,
      };
    }
  }

  if (!req.body) {
    return { ok: true, text: "" };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return {
          ok: false,
          error:
            `Cuerpo de la petición demasiado grande (máximo ${maxBytes} bytes).`,
        };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}
