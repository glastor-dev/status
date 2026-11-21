import type { Child } from "hono/jsx";

interface LayoutProps {
  title?: string;
  description?: string;
  children: Child;
}

export function Layout({ title, description, children }: LayoutProps) {
  const pageTitle =
    title ??
    "StatusZero — Páginas de estado Zero-Config para repositorios de GitHub";
  const pageDesc =
    description ??
    "Página de estado instantánea y badge de uptime zero-config para cualquier repositorio de GitHub. Potenciado por Cloudflare Workers, KV y GitHub Actions.";

  return (
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="theme-color" content="#0a0d14" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </head>
      <body>
        <div class="site-wrapper">
          <nav class="navbar">
            <div class="container navbar-inner">
              <a href="/" class="navbar-brand">
                <img src="/logo.svg" alt="StatusZero" width="28" height="28" />
                <span>StatusZero</span>
              </a>
              <div class="navbar-links">
                <a
                  href="https://github.com/glastor-dev/status"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </nav>
          <main>{children}</main>
          <footer class="footer">
            <div class="container">
              <p>
                StatusZero — Open Source (AGPL-3.0) • Powered by Cloudflare
                Workers &amp; KV
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
