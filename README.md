# StatusZero 🦕⚡

> **The Zero-Config Status Page for Any GitHub Repository** An open-source,
> edge-native alternative to Vercel Status and Instatus. Built with **Deno
> Deploy**, **Deno KV**, **Fresh SSR**, and **Octokit**.

[![Status](https://img.shields.io/github/actions/workflow/status/glastor-dev/status/ci.yml?branch=master&label=CI%2FCD)](https://github.com/glastor-dev/status/actions)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Built with Deno](https://img.shields.io/badge/Deno-2.x-black?logo=deno)](https://deno.land)
[![Fresh Framework](https://img.shields.io/badge/Fresh-1.7.3-yellow?logo=fresh)](https://fresh.deno.dev)
[![Repo](https://img.shields.io/badge/GitHub-glastor--dev%2Fstatus-181717?logo=github)](https://github.com/glastor-dev/status)

---

## ✨ Highlights

- **Zero Configuration**: No signup, database setup, or third-party paid
  accounts. Just type any GitHub repository (`owner/repo`) and get a live status
  page instantly.
- **Dynamic Real-Time SVG Badges**: Crisp, vector status badges
  (`/badge/:owner/:repo.svg`) that reflect real-time operational status
  (Operational, Degraded, Major Outage) with automatic HTTP edge caching.
- **Global Deno KV Caching**: Cached snapshots in Deno KV eliminate GitHub API
  rate-limiting while serving status metrics in sub-50ms across 35+ global edge
  locations.
- **Deep GitHub Actions CI/CD Telemetry**: Automatically tracks recent workflow
  runs, run durations, commit SHAs, authors, branches, and success rates.
- **Issue-Driven Incident Management**: Opening an issue labeled `incident`,
  `outage`, `downtime`, or `bug` automatically flags system degradation with
  real-time resolution timestamps.
- **90-Day Interactive Timeline**: Interactive daily uptime bars with hover
  tooltips displaying daily uptime percentages and execution metrics.
- **Headless JSON REST API**: Query `/api/status/:owner/:repo` to power
  Slack/Discord bots, widgets, or custom dashboards.
- **Automated CI Push Telemetry**: Optional 3-line step in your GitHub Actions
  workflow pushes instant heartbeats via `POST /api/ping/:owner/:repo`.

---

## 🚀 Quick Start: Add to Your README

Simply paste this Markdown badge into your repository's `README.md`:

```markdown
[![Status](https://statuszero.deno.dev/badge/YOUR_OWNER/YOUR_REPO.svg)](https://statuszero.deno.dev/YOUR_OWNER/YOUR_REPO)
```

Whenever users or team members click the badge, they are directed to your
dedicated status page: `https://statuszero.deno.dev/YOUR_OWNER/YOUR_REPO`

---

## ⚡ Optional: Push Instant Heartbeats via GitHub Actions

To record immediate status pings whenever your CI/CD pipeline finishes, add this
step to `.github/workflows/ci.yml`:

```yaml
- name: 📡 Report Telemetry to StatusZero
  if: always()
  run: |
    curl -s -X POST https://statuszero.deno.dev/api/ping/${{ github.repository }} \
      -H "Content-Type: application/json" \
      -d '{"workflow":"${{ github.workflow }}","status":"${{ job.status }}","branch":"${{ github.ref_name }}","commit":"${{ github.sha }}"}'
```

---

## 🛠 Tech Stack

- **Runtime**: [Deno 2.x](https://deno.com)
- **Framework**: [Fresh 1.7.3](https://fresh.deno.dev) (Islands architecture &
  Server-Side Rendering)
- **Database & Cache**: [Deno KV](https://deno.com/kv) (Global ACID Key-Value
  store on Deno Deploy)
- **API Client**: `@octokit/rest` (GitHub REST & Actions API)
- **Styling**: Modern Vanilla CSS Design System with dark mode, glassmorphism,
  and responsive layouts
- **Deployment Target**: [Deno Deploy](https://deno.com/deploy)

---

## 💻 Local Development

### 1. Prerequisites

Install Deno (version 2.0 or later):

```bash
# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Run the Development Server

```bash
deno task start
```

The server will start at `http://localhost:8000/`.

### 3. Run Tests & Validation

```bash
# Run unit & integration test suite
deno test --unstable-kv -A

# Type-check and lint
deno task check
```

---

## 🌐 Deploy to Deno Deploy

Deploy with 1-click or via GitHub integration on
[Deno Deploy Dashboard](https://dash.deno.com):

1. Connect your repository.
2. Set entry point to `main.ts`.
3. _(Optional)_ Add `GITHUB_TOKEN` environment variable in project settings to
   increase rate limit from 60 to 5,000 requests/hour.

---

## 📚 Documentación y Recursos

- 👥 [CONTRIBUTORS.md](CONTRIBUTORS.md) — Gobernanza, equipo y guía de
  patrocinio.
- 📜 [CHANGELOG.md](CHANGELOG.md) — Historial de versiones y notas de
  lanzamiento.
- 🔖 [CITATION.cff](CITATION.cff) — Metadatos de citación académica y de
  software.
- 🛡️ [SECURITY.md](.github/SECURITY.md) — Políticas de seguridad y reporte de
  vulnerabilidades.

---

## 📄 Licencia

GPL-3.0 © 2010-2026 Andrés Antonio Cardoso — GLASTOR®. Todos los derechos
reservados.
