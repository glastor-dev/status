# StatusZero

> **The Zero-Config Status Page for Any GitHub Repository** — An open-source,
> edge-native alternative to Vercel Status and Instatus. Powered by **Cloudflare
> Workers**, **Hono SSR**, **Cloudflare KV**, and **GitHub Actions**.

[![Status](https://statuszero.pii-veilglastores.workers.dev/badge/glastor-dev/status.svg)](https://statuszero.pii-veilglastores.workers.dev/glastor-dev/status)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/glastor-dev/status/ci.yml?branch=master&label=CI%2FCD)](https://github.com/glastor-dev/status/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Hono](https://img.shields.io/badge/Hono-4.x-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![Repo](https://img.shields.io/badge/GitHub-glastor--dev%2Fstatus-181717?logo=github)](https://github.com/glastor-dev/status)

---

## Highlights

- **Zero Configuration**: No signup, database setup, or third-party paid
  accounts. Visit `/:owner/:repo` for any public GitHub repository and get a
  live status page instantly.
- **Dynamic Real-Time SVG Badges**: Crisp vector status badges
  (`/badge/:owner/:repo.svg?lang=en|es&label=...`) with XML escaping and edge
  HTTP caching.
- **Cloudflare Edge & KV Caching**: Runs across 300+ global edge locations (~35
  KiB gzipped bundle, ~5 ms startup) with dynamic KV TTL, conditional GitHub
  **ETag (`304 Not Modified`)** requests, and consolidated 90-day daily history
  snapshots.
- **Deep GitHub Actions CI/CD Telemetry**: Tracks recent workflow runs,
  durations, commit SHAs, authors, branches, and failure rates in parallel.
- **Issue-Driven Incident Management**: Opening an issue labeled `incident`,
  `outage`, `downtime`, or `degradation` automatically updates system status and
  the RSS 2.0 feed (`/rss/:owner/:repo.xml`).
- **Headless JSON REST API**: Query `/api/status/:owner/:repo` (with cooldown
  protection on `?refresh=true`) to power bots, widgets, or dashboards.
- **Fail-Closed Push Telemetry & Webhooks**: Authenticated
  `POST /api/ping/:owner/:repo` heartbeats (with latency & HTTP status
  integrated into overall status) and HMAC-SHA256 verified
  `POST /api/webhook/github`.

---

## Quick Start: Add to Your README

Paste this Markdown badge into your repository's `README.md`:

```markdown
[![Status](https://statuszero.pii-veilglastores.workers.dev/badge/YOUR_OWNER/YOUR_REPO.svg)](https://statuszero.pii-veilglastores.workers.dev/YOUR_OWNER/YOUR_REPO)
```

Clicking the badge opens your dedicated status page:
`https://statuszero.pii-veilglastores.workers.dev/YOUR_OWNER/YOUR_REPO`

---

## Optional: Push Instant Heartbeats via GitHub Actions

To record immediate status pings whenever your CI/CD pipeline finishes, add this
step to `.github/workflows/ci.yml` (configure `STATUSZERO_PING_SECRET` in your
repository secrets to match `PING_SECRET` in Cloudflare Workers):

```yaml
- name: Report Telemetry to StatusZero
  if: always()
  env:
    STATUSZERO_PING_SECRET: ${{ secrets.STATUSZERO_PING_SECRET }}
  run: |
    curl -fsS -X POST "https://statuszero.pii-veilglastores.workers.dev/api/ping/${{ github.repository }}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${STATUSZERO_PING_SECRET}" \
      -d '{"workflow":"${{ github.workflow }}","status":"${{ job.status }}","branch":"${{ github.ref_name }}","commit":"${{ github.sha }}"}'
```

---

## Tech Stack

- **Runtime & Hosting**: [Cloudflare Workers](https://workers.cloudflare.com) +
  Workers Static Assets (`./public`)
- **Framework**: [Hono](https://hono.dev) (`hono/jsx` Server-Side Rendering)
- **Storage & Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/)
  (`STATUS_KV` binding)
- **GitHub Integration**: Native Web `fetch` + conditional `If-None-Match` ETag
  requests + Web Crypto API (`crypto.subtle`)
- **Testing**: [Vitest](https://vitest.dev) + TypeScript strict mode

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run the Worker locally

```bash
npm run dev
```

### 3. Type-check, test, and dry-run bundle

```bash
npm run check
npx wrangler deploy --dry-run
```

---

## Deploy to Cloudflare Workers

1. Authenticate with Cloudflare and create the KV namespace:

```bash
npx wrangler login
npx wrangler kv namespace create STATUS_KV
```

2. Put the generated KV namespace `id` into `wrangler.jsonc`.
3. Configure production secrets (fail-closed by default):

```bash
npx wrangler secret put GITHUB_WEBHOOK_SECRET
npx wrangler secret put PING_SECRET
# Optional (recommended): fine-grained read-only token for 5,000 req/h
npx wrangler secret put GITHUB_TOKEN
```

4. Deploy to the global edge:

```bash
npm run deploy
```

---

## Documentación y Recursos

- [CONTRIBUTORS.md](CONTRIBUTORS.md) — Gobernanza, equipo y guía de patrocinio.
- [CHANGELOG.md](CHANGELOG.md) — Historial de versiones y notas de lanzamiento.
- [CITATION.cff](CITATION.cff) — Metadatos de citación académica y de software.
- [SECURITY.md](.github/SECURITY.md) — Políticas de seguridad y reporte de
  vulnerabilidades.
- [LICENSE](LICENSE) — Licencia de código abierto GNU Affero General Public
  License v3.0 (AGPL-3.0).

---

## Licencia

Este proyecto está licenciado bajo los términos de la **GNU Affero General
Public License v3.0 (AGPL-3.0)**. Consulta el archivo [LICENSE](LICENSE) para
más detalles.

AGPL-3.0 © 2010-2026 Andrés Antonio Cardoso — GLASTOR®. Todos los derechos
reservados.
