// components/Footer.tsx
export function Footer() {
  return (
    <footer class="footer">
      <div class="container footer-inner">
        <div>
          <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
            StatusZero — Zero-Config Status Pages for GitHub
          </p>
          <p>
            An open-source alternative to Vercel Status and Instatus.
            Self-hostable on Deno Deploy.
          </p>
        </div>

        <div class="footer-tech">
          <span class="footer-badge">🦕 Deno 2</span>
          <span class="footer-badge">⚡ Deno KV</span>
          <span class="footer-badge">🍋 Fresh SSR</span>
          <span class="footer-badge">🐙 Octokit</span>
        </div>
      </div>
    </footer>
  );
}
