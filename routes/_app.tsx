import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          StatusZero — Zero-Config Status Pages for GitHub Repositories
        </title>
        <meta
          name="description"
          content="Instant, zero-config status page and uptime badge for any GitHub repository. Powered by Deno Deploy, Deno KV and GitHub Actions."
        />
        <meta name="theme-color" content="#0a0d14" />

        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="StatusZero — Zero-Config Status Pages for GitHub"
        />
        <meta
          property="og:description"
          content="A badge that automatically generates a real-time status page for your repository. Free, open source and zero-config."
        />
        <meta property="twitter:card" content="summary_large_image" />

        {/* Fonts */}
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
