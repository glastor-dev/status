import { Layout } from "./layout";

export function HomePage({ origin }: { origin: string }) {
  return (
    <Layout>
      <section class="hero container">
        <div class="hero-badge">Edge-Native • Cloudflare Workers + KV</div>
        <h1>
          Páginas de estado <span>Zero-Config</span> para cualquier repositorio
          de GitHub
        </h1>
        <p class="hero-subtitle">
          Convierte tus GitHub Actions, releases, incidencias y pings sintéticos
          en una status page en tiempo real, badge SVG y feed RSS. Sin registro.
        </p>

        <form id="repo-search-form" class="search-box" method="get" action="/">
          <input
            id="repo-input"
            type="text"
            placeholder="owner/repo (ej: glastor-dev/status)"
            aria-label="Repositorio de GitHub"
            required
          />
          <button type="submit">Ver Estado</button>
        </form>

        <div class="quick-examples">
          <span>Ejemplos:</span>
          <a href="/glastor-dev/status">glastor-dev/status</a>
          <a href="/glastor-core/vektor">glastor-core/vektor</a>
          <a href="/honojs/hono">honojs/hono</a>
        </div>

        <div class="code-card">
          <div class="code-card-header">Badge instantáneo para tu README</div>
          <pre>
            <code>{`[![Status](${origin}/badge/OWNER/REPO.svg)](${origin}/OWNER/REPO)`}</code>
          </pre>
        </div>
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById("repo-search-form")?.addEventListener("submit",function(e){e.preventDefault();var v=(document.getElementById("repo-input")?.value||"").trim().replace(/^https?:\\/\\/github\\.com\\//,"").replace(/\\/+$/,"");var parts=v.split("/");if(parts.length>=2&&parts[0]&&parts[1]){window.location.href="/"+encodeURIComponent(parts[0])+"/"+encodeURIComponent(parts[1]);}});`,
        }}
      />
    </Layout>
  );
}
