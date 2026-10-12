// islands/RepoSearch.tsx
import { useState } from "preact/hooks";

interface RepoSearchProps {
  initialRepo?: string;
}

export default function RepoSearch(
  { initialRepo = "denoland/deno" }: RepoSearchProps,
) {
  const [repoInput, setRepoInput] = useState(initialRepo);
  const [activeTab, setActiveTab] = useState<"markdown" | "html" | "action">(
    "markdown",
  );
  const [copied, setCopied] = useState(false);

  // Normalize input
  const cleanInput = repoInput.trim().replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/$/, "");
  const parts = cleanInput.split("/").filter(Boolean);
  const isValid = parts.length === 2 && parts[0].length > 0 &&
    parts[1].length > 0;
  const owner = isValid ? parts[0] : "owner";
  const repo = isValid ? parts[1] : "repo";

  // Compute host dynamically on client, fallback gracefully
  const host = typeof globalThis.location !== "undefined"
    ? globalThis.location.origin
    : "https://statuszero.deno.dev";
  const statusPageUrl = `${host}/${owner}/${repo}`;
  const badgeUrl = `${host}/badge/${owner}/${repo}.svg`;

  const markdownSnippet = `[![Status](${badgeUrl})](${statusPageUrl})`;
  const htmlSnippet =
    `<a href="${statusPageUrl}"><img src="${badgeUrl}" alt="Status" /></a>`;
  const actionSnippet = `- name: 📡 Report Telemetry to StatusZero
  if: always()
  run: |
    curl -s -X POST ${host}/api/ping/${owner}/${repo} \\
      -H "Content-Type: application/json" \\
      -d '{"workflow":"\${{ github.workflow }}","status":"\${{ job.status }}","branch":"\${{ github.ref_name }}","commit":"\${{ github.sha }}"}'`;

  let currentSnippet = markdownSnippet;
  if (activeTab === "html") currentSnippet = htmlSnippet;
  if (activeTab === "action") currentSnippet = actionSnippet;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Fallback
    }
  };

  const setDemo = (name: string) => {
    setRepoInput(name);
  };

  return (
    <div class="playground-card" id="search-playground">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) {
            globalThis.location.href = `/${owner}/${repo}`;
          }
        }}
      >
        <div class="search-box">
          <div class="search-input-wrapper">
            <svg
              class="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={repoInput}
              onInput={(e) =>
                setRepoInput((e.target as HTMLInputElement).value)}
              placeholder="e.g. owner/repo or https://github.com/owner/repo"
              class="search-input"
              spellcheck={false}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={!isValid}
            class="btn btn-primary"
            style={{ opacity: isValid ? 1 : 0.6 }}
          >
            <span>View Status Page</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>

      {/* Quick sample chips */}
      <div class="quick-chips">
        <span>Try popular repos:</span>
        <button
          type="button"
          class="chip-btn"
          onClick={() => setDemo("denoland/deno")}
        >
          denoland/deno
        </button>
        <button
          type="button"
          class="chip-btn"
          onClick={() => setDemo("facebook/react")}
        >
          facebook/react
        </button>
        <button
          type="button"
          class="chip-btn"
          onClick={() => setDemo("vercel/next.js")}
        >
          vercel/next.js
        </button>
        <button
          type="button"
          class="chip-btn"
          onClick={() => setDemo("glastor-dev/tiandao")}
        >
          glastor-dev/tiandao
        </button>
      </div>

      {/* Output & Copy Panel */}
      <div class="preview-panel">
        <div class="preview-badge-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">
              Live README Badge:
            </span>
            <a href={`/${owner}/${repo}`} title="View status page">
              <img
                src={`/badge/${owner}/${repo}.svg`}
                alt="Status badge preview"
                height="20"
                style="display: block; border-radius: 4px;"
              />
            </a>
          </div>

          <a
            href={`/${owner}/${repo}`}
            class="btn btn-ghost btn-sm"
            style="color: var(--brand-cyan);"
          >
            Open /{owner}/{repo} ↗
          </a>
        </div>

        {/* Code Tabs */}
        <div class="code-tabs">
          <button
            type="button"
            class={`code-tab ${activeTab === "markdown" ? "active" : ""}`}
            onClick={() => setActiveTab("markdown")}
          >
            Markdown Badge
          </button>
          <button
            type="button"
            class={`code-tab ${activeTab === "html" ? "active" : ""}`}
            onClick={() => setActiveTab("html")}
          >
            HTML Tag
          </button>
          <button
            type="button"
            class={`code-tab ${activeTab === "action" ? "active" : ""}`}
            onClick={() => setActiveTab("action")}
          >
            GitHub Action Workflow
          </button>
        </div>

        <div class="code-block">
          <pre>{currentSnippet}</pre>
          <button
            type="button"
            onClick={handleCopy}
            class="btn btn-secondary btn-sm"
            style="white-space: nowrap; margin-left: 12px;"
          >
            {copied
              ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10b981"
                    stroke-width="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span style="color: #10b981;">Copied!</span>
                </>
              )
              : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
          </button>
        </div>
      </div>
    </div>
  );
}
