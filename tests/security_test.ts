// tests/security_test.ts
import { assertEquals } from "$std/assert/mod.ts";
import {
  escapeXml,
  isValidGitHubIdentifier,
  sanitizeText,
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
