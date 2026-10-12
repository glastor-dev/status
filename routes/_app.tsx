import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          StatusZero — Páginas de estado Zero-Config para repositorios de GitHub
        </title>
        <meta
          name="description"
          content="Página de estado instantánea y badge de uptime zero-config para cualquier repositorio de GitHub. Potenciado por Deno Deploy, Deno KV y GitHub Actions."
        />
        <meta name="theme-color" content="#0a0d14" />

        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="StatusZero — Páginas de estado Zero-Config para GitHub"
        />
        <meta
          property="og:description"
          content="Un botón que genera automáticamente una página de estado en tiempo real para tu repositorio. Gratis, open source y zero-config."
        />
        <meta property="twitter:card" content="summary_large_image" />

        {/* Fuentes */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
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
          <Component />
        </div>
      </body>
    </html>
  );
}
