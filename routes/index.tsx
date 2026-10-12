// routes/index.tsx
import { Navbar } from "../components/Navbar.tsx";
import { Footer } from "../components/Footer.tsx";
import RepoSearch from "../islands/RepoSearch.tsx";

const FEATURED_REPOS = [
  {
    owner: "denoland",
    repo: "deno",
    desc: "A modern runtime for JavaScript and TypeScript.",
    stars: "96k+",
  },
  {
    owner: "facebook",
    repo: "react",
    desc: "The library for web and native user interfaces.",
    stars: "230k+",
  },
  {
    owner: "vercel",
    repo: "next.js",
    desc: "The React Framework for the Web.",
    stars: "128k+",
  },
  {
    owner: "glastor-dev",
    repo: "tiandao",
    desc: "Security-hardened code intelligence & AST generator.",
    stars: "Featured",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* Hero Section */}
        <section class="hero container">
          <div class="hero-pill">
            <span class="hero-pill-badge">NEW</span>
            <span>Zero-Config Status Page for GitHub</span>
            <span style="color: var(--brand-cyan);">• Free & Open Source</span>
          </div>

          <h1 class="hero-title">
            The Zero-Config Status Page<br />
            for <span class="gradient-text">Any GitHub Repository</span>
          </h1>

          <p class="hero-desc">
            A single button in your README that automatically turns GitHub
            Actions, releases, and issues into an ultra-fast, real-time status
            page. No signup. No infrastructure. Instant edge deployment.
          </p>

          {/* Interactive Search & Badge Generator Playground */}
          <RepoSearch initialRepo="denoland/deno" />
        </section>

        {/* Featured Live Repositories */}
        <section class="container" id="examples" style="padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; font-weight: 700; margin-bottom: 8px;">
              Live Showcase Repositories
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              Click any repository to inspect its live status dashboard and
              90-day uptime timeline:
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;">
            {FEATURED_REPOS.map((item) => (
              <a
                key={`${item.owner}/${item.repo}`}
                href={`/${item.owner}/${item.repo}`}
                class="feature-box"
                style="padding: 22px; cursor: pointer; text-decoration: none;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img
                      src={`https://github.com/${item.owner}.png`}
                      alt={item.owner}
                      width="28"
                      height="28"
                      style="border-radius: 6px;"
                    />
                    <strong style="font-family: var(--font-display); font-size: 1.05rem; color: var(--text-primary);">
                      {item.owner}/{item.repo}
                    </strong>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                    ⭐️ {item.stars}
                  </span>
                </div>

                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px; min-height: 40px;">
                  {item.desc}
                </p>

                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border-subtle);">
                  <img
                    src={`/badge/${item.owner}/${item.repo}.svg`}
                    alt="Status badge"
                    height="18"
                    style="border-radius: 3px;"
                  />
                  <span style="font-size: 0.8rem; color: var(--brand-cyan); font-weight: 600;">
                    View Dashboard ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* How It Works in 3 Steps */}
        <section
          class="container"
          id="how-it-works"
          style="padding: 60px 24px;"
        >
          <div style="text-align: center; margin-bottom: 48px;">
            <div class="hero-pill" style="margin-bottom: 12px;">
              <span>SIMPLE & EFFORTLESS</span>
            </div>
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; margin-bottom: 12px;">
              How It Works in 3 Simple Steps
            </h2>
            <p style="color: var(--text-secondary); font-size: 1.05rem; max-width: 600px; margin: 0 auto;">
              Turn any public GitHub repository into a production-grade status
              page in under 30 seconds.
            </p>
          </div>

          <div class="features-grid" style="margin: 0;">
            <div class="feature-box">
              <div
                class="feature-icon-wrapper"
                style="color: #38bdf8; font-weight: 800; font-family: var(--font-mono);"
              >
                01
              </div>
              <h3 class="feature-title">Add the Status Badge</h3>
              <p class="feature-desc">
                Paste the generated Markdown badge into your repository's{" "}
                <code>README.md</code>. It immediately renders your live
                operational health badge to everyone.
              </p>
            </div>

            <div class="feature-box">
              <div
                class="feature-icon-wrapper"
                style="color: #10b981; font-weight: 800; font-family: var(--font-mono);"
              >
                02
              </div>
              <h3 class="feature-title">Automatic CI/CD Tracking</h3>
              <p class="feature-desc">
                StatusZero polls GitHub Actions workflow runs, releases, and
                incident issues, caching metrics in globally distributed Deno KV
                to avoid GitHub rate limits.
              </p>
            </div>

            <div class="feature-box">
              <div
                class="feature-icon-wrapper"
                style="color: #a855f7; font-weight: 800; font-family: var(--font-mono);"
              >
                03
              </div>
              <h3 class="feature-title">Instant Status Dashboard</h3>
              <p class="feature-desc">
                Clicking the badge opens your dedicated status page: 90-day
                uptime bars, workflow logs, incident trackers, and RSS/JSON
                telemetry feeds.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section class="container" style="padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 48px;">
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; margin-bottom: 12px;">
              Built for Modern DevOps & Open Source
            </h2>
            <p style="color: var(--text-secondary); font-size: 1.05rem;">
              Like Vercel Status or Instatus, but free, edge-native, and zero
              maintenance.
            </p>
          </div>

          <div class="features-grid" style="margin: 0;">
            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="2"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 class="feature-title">Zero Subscription Costs</h3>
              <p class="feature-desc">
                Commercial status page providers charge $30–$200/month.
                StatusZero is free and runs seamlessly on Deno Deploy's generous
                free tier with zero upkeep.
              </p>
            </div>

            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#06b6d4"
                  stroke-width="2"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 class="feature-title">Global Deno KV Caching</h3>
              <p class="feature-desc">
                Snapshot caching in Deno KV protects against GitHub API
                rate-limiting while serving fresh status data to your users with
                sub-50ms latency across 35+ global edge locations.
              </p>
            </div>

            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 class="feature-title">Dynamic Vector Badges</h3>
              <p class="feature-desc">
                Crisp SVG status badges rendered in real time. Embed in READMEs,
                documentation sites, and marketing pages with automated HTTP
                edge caching.
              </p>
            </div>

            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  stroke-width="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 class="feature-title">Issue-Driven Incidents</h3>
              <p class="feature-desc">
                Open an issue in your repo labeled <code>incident</code> or{" "}
                <code>outage</code>, and StatusZero immediately triggers alert
                banners and incident timelines on your status page.
              </p>
            </div>

            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ec4899"
                  stroke-width="2"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3 class="feature-title">90-Day Interactive Timeline</h3>
              <p class="feature-desc">
                Full 90-day uptime visualization bars with interactive daily
                tooltips, workflow count, and incident history inspired by
                industry standards.
              </p>
            </div>

            <div class="feature-box">
              <div class="feature-icon-wrapper">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                  stroke-width="2"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3 class="feature-title">Headless JSON API</h3>
              <p class="feature-desc">
                Query <code>/api/status/:owner/:repo</code>{" "}
                anytime for clean, typed JSON data to build internal dashboards,
                Discord/Slack bots, or custom widgets.
              </p>
            </div>
          </div>
        </section>

        {/* GitHub Action Integration Section */}
        <section
          class="container"
          id="action-snippet"
          style="padding: 60px 24px;"
        >
          <div
            class="section-card"
            style="border: 1px solid var(--border-medium); background: var(--bg-surface-elevated);"
          >
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 24px;">
              <div>
                <span
                  class="hero-pill-badge"
                  style="margin-bottom: 8px; display: inline-block;"
                >
                  PRO TELEMETRY
                </span>
                <h2 style="font-family: var(--font-display); font-size: 1.75rem; font-weight: 700;">
                  Automate Real-Time Heartbeats via GitHub Actions
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 6px; max-width: 650px;">
                  Add this simple 3-line step to your existing CI/CD workflow.
                  Whenever your build passes or fails, it pings StatusZero's
                  Deno KV edge database immediately!
                </p>
              </div>

              <a
                href="#search-playground"
                class="btn btn-primary"
              >
                Generate for My Repo
              </a>
            </div>

            <div class="code-block" style="background: #060910;">
              <pre>{`# .github/workflows/ci.yml
name: CI & Status Ping

on:
  push:
    branches: [main, master]
  schedule:
    - cron: '*/30 * * * *' # Optional: periodic uptime check

jobs:
  test-and-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Your existing test / build commands:
      - run: npm test

      # 📡 Push live telemetry to StatusZero:
      - name: Ping StatusZero
        if: always()
        run: |
          curl -s -X POST https://statuszero.deno.dev/api/ping/\${{ github.repository }} \\
            -H "Content-Type: application/json" \\
            -d '{"workflow":"\${{ github.workflow }}","status":"\${{ job.status }}","branch":"\${{ github.ref_name }}","commit":"\${{ github.sha }}"}'`}</pre>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
