// tests/security_test.ts
import { assertEquals } from "$std/assert/mod.ts";
import {
  createHmacSha256,
  escapeXml,
  isValidGitHubIdentifier,
  sanitizeText,
  timingSafeEqualString,
  verifyHmacSha256,
} from "../services/security.ts";

Deno.test("Security - isValidGitHubIdentifier accepts valid GitHub identifiers", () => {
  assertEquals(isValidGitHubIdentifier("denoland"), true);
  assertEquals(isValidGitHubIdentifier("deno"), true);
  assertEquals(isValidGitHubIdentifier("glastor-dev"), true);
  assertEquals(isValidGitHubIdentifier("tiandao"), true);
  assertEquals(isValidGitHubIdentifier("react-native_core.1"), true);
});

Deno.test("Security - isValidGitHubIdentifier rejects malicious or path-traversal input", () => {
  assertEquals(isValidGitHubIdentifier(".."), false);
  assertEquals(isValidGitHubIdentifier("../../../etc/passwd"), false);
  assertEquals(isValidGitHubIdentifier("owner/repo"), false); // Slash must not be part of identifier
  assertEquals(isValidGitHubIdentifier("<script>alert(1)</script>"), false);
  assertEquals(isValidGitHubIdentifier("bad name with spaces"), false);
  assertEquals(isValidGitHubIdentifier(""), false);
  assertEquals(isValidGitHubIdentifier("a".repeat(101)), false); // Exceeds 100 chars
});

Deno.test("Security - escapeXml neutralizes XSS and XML injection characters", () => {
  const dangerous = "<svg onload=\"alert('XSS')\">&test</svg>";
  const escaped = escapeXml(dangerous);
  assertEquals(
    escaped,
    "&lt;svg onload=&quot;alert(&apos;XSS&apos;)&quot;&gt;&amp;test&lt;/svg&gt;",
  );
});

Deno.test("Security - sanitizeText removes control characters and bounds length", () => {
  const input = "Hello\x00World\x1F! " + "A".repeat(300);
  const sanitized = sanitizeText(input, 20);
  assertEquals(sanitized.length, 20);
  assertEquals(sanitized.includes("\x00"), false);
  assertEquals(sanitized.startsWith("HelloWorld!"), true);
});

Deno.test("Security - timingSafeEqualString validates matching strings and rejects mismatches", () => {
  assertEquals(
    timingSafeEqualString("secret-token-123", "secret-token-123"),
    true,
  );
  assertEquals(
    timingSafeEqualString("secret-token-123", "secret-token-999"),
    false,
  );
  assertEquals(
    timingSafeEqualString("secret-token-123", "different-length"),
    false,
  );
});

Deno.test("Security - verifyHmacSha256 calculates and verifies HMAC signatures", async () => {
  const secret = "my-super-secret-key";
  const payload = JSON.stringify({ action: "ping", status: "success" });

  const signature = await createHmacSha256(secret, payload);
  assertEquals(signature.length, 64); // SHA-256 hex length

  const valid = await verifyHmacSha256(secret, payload, signature);
  assertEquals(valid, true);

  // GitHub prefixes with sha256=
  const validWithPrefix = await verifyHmacSha256(
    secret,
    payload,
    `sha256=${signature}`,
  );
  assertEquals(validWithPrefix, true);

  // Tampered payload
  const tampered = await verifyHmacSha256(secret, payload + "!", signature);
  assertEquals(tampered, false);

  // Wrong secret
  const wrongSecret = await verifyHmacSha256("wrong-key", payload, signature);
  assertEquals(wrongSecret, false);
});
