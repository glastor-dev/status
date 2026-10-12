// islands/BadgeCopier.tsx
import { useState } from "preact/hooks";

interface BadgeCopierProps {
  owner: string;
  repo: string;
}

export default function BadgeCopier({ owner, repo }: BadgeCopierProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"markdown" | "html" | "url">("markdown");

  const host = typeof globalThis.location !== "undefined"
    ? globalThis.location.origin
    : "https://statuszero.deno.dev";
  const badgeUrl = `${host}/badge/${owner}/${repo}.svg`;
  const statusPageUrl = `${host}/${owner}/${repo}`;

  const markdownSnippet = `[![Status](${badgeUrl})](${statusPageUrl})`;
  const htmlSnippet =
    `<a href="${statusPageUrl}"><img src="${badgeUrl}" alt="Status" /></a>`;

  let currentText = markdownSnippet;
  if (mode === "html") currentText = htmlSnippet;
  if (mode === "url") currentText = badgeUrl;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // fallback
    }
  };

  return (
    <div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          onClick={() => copyText(markdownSnippet)}
          class="btn btn-secondary btn-sm"
          title="Copy Markdown badge to README"
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
                <span style="color: #10b981;">Copied Badge!</span>
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
                <span>Copy Badge</span>
              </>
            )}
        </button>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          class="btn btn-ghost btn-sm"
          title="Embed & Options"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Embed
        </button>
      </div>

      {showModal && (
        <div
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 20px;"
          onClick={() => setShowModal(false)}
        >
          <div
            class="playground-card"
            style="width: 100%; max-width: 580px; margin: 0;"
            onClick={(e) => e.stopPropagation()}
          >
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <h3 style="font-family: var(--font-display); font-size: 1.25rem;">
                Embed Status Badge
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                class="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div style="text-align: center; margin-bottom: 24px; padding: 16px; background: var(--bg-surface-elevated); border-radius: 8px;">
              <img
                src={badgeUrl}
                alt="Badge preview"
                style="display: inline-block;"
              />
            </div>

            <div class="code-tabs">
              <button
                type="button"
                class={`code-tab ${mode === "markdown" ? "active" : ""}`}
                onClick={() => setMode("markdown")}
              >
                Markdown
              </button>
              <button
                type="button"
                class={`code-tab ${mode === "html" ? "active" : ""}`}
                onClick={() => setMode("html")}
              >
                HTML
              </button>
              <button
                type="button"
                class={`code-tab ${mode === "url" ? "active" : ""}`}
                onClick={() => setMode("url")}
              >
                Direct SVG URL
              </button>
            </div>

            <div class="code-block" style="margin-bottom: 16px;">
              <pre>{currentText}</pre>
            </div>

            <button
              type="button"
              onClick={() => copyText(currentText)}
              class="btn btn-primary"
              style="width: 100%;"
            >
              {copied ? "Copied to clipboard!" : "Copy Snippet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
