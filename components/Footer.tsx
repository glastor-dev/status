// components/Footer.tsx
export function Footer() {
  return (
    <footer class="footer">
      <div class="container footer-inner">
        <div>
          <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
            StatusZero — Páginas de estado Zero-Config para GitHub
          </p>
          <p>
            Alternativa open-source a Vercel Status e Instatus. Autoalojable en
            Deno Deploy con coste cero.
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
