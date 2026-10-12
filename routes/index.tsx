// routes/index.tsx
import { Navbar } from "../components/Navbar.tsx";
import { Footer } from "../components/Footer.tsx";
import RepoSearch from "../islands/RepoSearch.tsx";

const FEATURED_REPOS = [
  {
    owner: "denoland",
    repo: "deno",
    desc: "Un runtime moderno y seguro para JavaScript y TypeScript.",
    stars: "96k+",
  },
  {
    owner: "facebook",
    repo: "react",
    desc: "La librería para crear interfaces de usuario web y nativas.",
    stars: "230k+",
  },
  {
    owner: "vercel",
    repo: "next.js",
    desc: "El framework de React para la web.",
    stars: "128k+",
  },
  {
    owner: "glastor-dev",
    repo: "tiandao",
    desc: "Inteligencia de código con AST seguro y hardening AppSec.",
    stars: "Destacado",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* Sección Hero */}
        <section class="hero container">
          <div class="hero-pill">
            <span class="hero-pill-badge">NUEVO</span>
            <span>Página de Estado Zero-Config para GitHub</span>
            <span style="color: var(--brand-cyan);">
              • Gratis y Open Source
            </span>
          </div>

          <h1 class="hero-title">
            La Página de Estado Zero-Config<br />
            para{" "}
            <span class="gradient-text">cualquier repositorio de GitHub</span>
          </h1>

          <p class="hero-desc">
            Un solo botón en tu README que convierte automáticamente los flujos
            de GitHub Actions, releases e incidencias en una página de estado
            ultra rápida y en tiempo real. Sin registro. Sin infraestructura.
            Despliegue instantáneo en el Edge.
          </p>

          {/* Playground interactivo de búsqueda y generación */}
          <RepoSearch initialRepo="denoland/deno" />
        </section>

        {/* Repositorios destacados en vivo */}
        <section class="container" id="ejemplos" style="padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; font-weight: 700; margin-bottom: 8px;">
              Repositorios en Vivo Destacados
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              Haz clic en cualquier repositorio para inspeccionar su panel de
              estado en vivo y el historial de 90 días:
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
                    alt="Badge de estado"
                    height="18"
                    style="border-radius: 3px;"
                  />
                  <span style="font-size: 0.8rem; color: var(--brand-cyan); font-weight: 600;">
                    Ver Panel ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Cómo funciona en 3 pasos */}
        <section
          class="container"
          id="como-funciona"
          style="padding: 60px 24px;"
        >
          <div style="text-align: center; margin-bottom: 48px;">
            <div class="hero-pill" style="margin-bottom: 12px;">
              <span>SIMPLE Y SIN ESFUERZO</span>
            </div>
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; margin-bottom: 12px;">
              Cómo Funciona en 3 Simples Pasos
            </h2>
            <p style="color: var(--text-secondary); font-size: 1.05rem; max-width: 600px; margin: 0 auto;">
              Convierte cualquier repositorio público de GitHub en una página de
              estado de nivel productivo en menos de 30 segundos.
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
              <h3 class="feature-title">Añade el Badge de Estado</h3>
              <p class="feature-desc">
                Pega el badge generado en Markdown dentro del{" "}
                <code>README.md</code>{" "}
                de tu proyecto. Mostrará de inmediato el estado operacional en
                vivo a toda la comunidad.
              </p>
            </div>

            <div class="feature-box">
              <div
                class="feature-icon-wrapper"
                style="color: #10b981; font-weight: 800; font-family: var(--font-mono);"
              >
                02
              </div>
              <h3 class="feature-title">Seguimiento Automático de CI/CD</h3>
              <p class="feature-desc">
                StatusZero monitoriza las ejecuciones de GitHub Actions,
                releases e incidencias, almacenando snapshots en Deno KV
                distribuido globalmente para evitar rate-limits.
              </p>
            </div>

            <div class="feature-box">
              <div
                class="feature-icon-wrapper"
                style="color: #a855f7; font-weight: 800; font-family: var(--font-mono);"
              >
                03
              </div>
              <h3 class="feature-title">Panel de Estado Instantáneo</h3>
              <p class="feature-desc">
                Al pulsar en el badge se abre tu página de estado dedicada:
                barras de uptime de 90 días, registros de flujos de trabajo,
                seguimiento de incidencias y API JSON.
              </p>
            </div>
          </div>
        </section>

        {/* Rejilla de características */}
        <section class="container" style="padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 48px;">
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; margin-bottom: 12px;">
              Diseñado para DevOps Modernos y Open Source
            </h2>
            <p style="color: var(--text-secondary); font-size: 1.05rem;">
              Como Vercel Status o Instatus, pero gratis, nativo del Edge y sin
              mantenimiento.
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
              <h3 class="feature-title">Cero Costes de Suscripción</h3>
              <p class="feature-desc">
                Los servicios tradicionales cobran $30–$200/mes. StatusZero es
                gratuito y corre perfectamente en la capa free de Deno Deploy
                sin costes ocultos.
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
              <h3 class="feature-title">Caché Global en Deno KV</h3>
              <p class="feature-desc">
                El almacenamiento en Deno KV protege contra las limitaciones de
                peticiones de GitHub y entrega respuestas con latencia inferior
                a 50ms desde más de 35 ubicaciones edge.
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
              <h3 class="feature-title">Badges Vectoriales Dinámicos</h3>
              <p class="feature-desc">
                Badges SVG nítidos renderizados en tiempo real. Incrústalas en
                READMEs, sitios de documentación y páginas web con cabeceras de
                caché HTTP optimizadas.
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
              <h3 class="feature-title">Gestión de Incidentes vía Issues</h3>
              <p class="feature-desc">
                Abre una issue en tu repositorio con la etiqueta{" "}
                <code>incident</code> o{" "}
                <code>outage</code>, y StatusZero activará automáticamente los
                avisos de alerta y la cronología en tu página.
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
              <h3 class="feature-title">Línea Temporal de 90 Días</h3>
              <p class="feature-desc">
                Barras de visualización de disponibilidad de 90 días con
                tooltips interactivos diarios, recuento de flujos de trabajo y
                estados de fiabilidad en vivo.
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
              <h3 class="feature-title">API REST JSON Headless</h3>
              <p class="feature-desc">
                Consulta <code>/api/status/:owner/:repo</code>{" "}
                en cualquier momento para obtener datos JSON estructurados y
                alimentar bots de Discord/Slack o paneles internos.
              </p>
            </div>
          </div>
        </section>

        {/* Sección de integración con GitHub Actions */}
        <section
          class="container"
          id="accion-github"
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
                  TELEMETRÍA PRO
                </span>
                <h2 style="font-family: var(--font-display); font-size: 1.75rem; font-weight: 700;">
                  Automatiza Heartbeats en tiempo real mediante GitHub Actions
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 6px; max-width: 650px;">
                  Añade este sencillo paso de 3 líneas a tu workflow existente
                  de CI/CD. Cada vez que tu build finalice, enviará un ping
                  inmediato a la base de datos distribuida en Deno KV.
                </p>
              </div>

              <a
                href="#search-playground"
                class="btn btn-primary"
              >
                Generar para mi Repositorio
              </a>
            </div>

            <div class="code-block" style="background: #060910;">
              <pre>{`# .github/workflows/ci.yml
name: CI y Ping de Estado

on:
  push:
    branches: [main, master]
  schedule:
    - cron: '*/30 * * * *' # Opcional: comprobación periódica de uptime

jobs:
  test-and-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Tus comandos de test / build habituales:
      - run: npm test

      # 📡 Enviar telemetría en vivo a StatusZero:
      - name: Ping a StatusZero
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
