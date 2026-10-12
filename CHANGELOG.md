# Changelog

<p align="center">
  <img src="https://img.shields.io/badge/Format-Keep%20a%20Changelog-blue.svg" alt="Keep a Changelog">
  <img src="https://img.shields.io/badge/Versioning-SemVer%202.0.0-green.svg" alt="Semantic Versioning">
  <img src="https://img.shields.io/badge/Status-Maintained-success.svg" alt="Maintenance Status">
</p>

---

## Acerca de este Changelog

Todos los cambios notables en **StatusZero — Zero-Config Status Page** son
documentados en este archivo.

Este proyecto se adhiere a:

- **Formato:** [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
- **Versionado:** [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

### Categorías de Cambios

- **Added** ✨ - Nuevas características o funcionalidades
- **Changed** 🔄 - Cambios en funcionalidades existentes
- **Deprecated** ⚠️ - Características que serán eliminadas en el futuro
- **Removed** 🗑️ - Características eliminadas en esta versión
- **Fixed** 🐛 - Correcciones de errores
- **Security** 🔒 - Correcciones de vulnerabilidades de seguridad y mejoras
  AppSec

---

## [Unreleased]

### ✨ Added

- **Alertas de Caída (Webhooks Salientes):** Soporte en roadmap para
  notificaciones automáticas a canales de Discord y Slack cuando un repositorio
  pase a estado `degraded` o `outage`.
- **Modo Oscuro / Claro:** Selector dinámico de temas visuales para la interfaz
  web.

---

## [1.0.0] - 2026-10-12

**Nombre del Release:** "Fundación Edge-Native y Arquitectura de Resiliencia"\
**Tipo de Release:** Major Stable Release\
**Repositorio Oficial:**
[glastor-dev/status](https://github.com/glastor-dev/status)

### 🎉 Highlights del Release

Versión inicial de producción de **StatusZero**: plataforma de páginas de estado
sin configuración previa para cualquier repositorio público de GitHub alojado en
**Deno Deploy** con persistencia global en **Deno KV** y server-side rendering
con **Fresh 1.7** (Preact Islands).

### ✨ Added

#### Core Engine, Observabilidad & Dashboard

- **Dashboard de Estado Dinámico (`/:owner/:repo`):**
  - Generación de línea temporal interactiva con historial de **90 días de
    disponibilidad**.
  - Tarjetas de métricas: Disponibilidad global (%), Tasa de éxito de CI/CD,
    Conteo de incidencias activas y Última versión publicada (Releases).
  - Trazabilidad de las últimas 20 ejecuciones de **GitHub Actions** con tiempos
    de ejecución, autor, commit SHA y enlaces directos a los logs.
  - Seguimiento y filtrado de incidencias/issues de caída en tiempo real.
- **Fresh Islands Reactivas (Client-side):**
  - `RepoSearch`: Playground interactivo con autocompletado y validación de
    repositorios en la landing page.
  - `UptimeBarTooltip`: Tooltip flotante de precisión para cada barra de los 90
    días de historial.
  - `LiveRefresh`: Refresco automático de estado cada 60 segundos con indicador
    visual de actividad.
  - `BadgeCopier`: Modal de copiado en 1 clic de badges en formatos Markdown,
    HTML y enlace directo.
- **Badges SVG Vectoriales en Vivo (`/badge/:owner/:repo.svg`):**
  - Insignia SVG interactiva con estados `operational`, `degraded`, `outage` y
    `unknown`.
  - Encabezados de caché HTTP Edge optimizados
    (`public, max-age=60, s-maxage=120, stale-while-revalidate=300`).
- **Headless JSON REST API (`/api/status/:owner/:repo`):**
  - Acceso sin cabeza (headless) al payload completo del estado del repositorio
    para integraciones externas.

#### Telemetría, Monitoreo Sintético y Sindicación

- **Endpoint de Heartbeats (`POST /api/ping/:owner/:repo`):**
  - Reporte de estado desde flujos de GitHub Actions o cron jobs externos.
  - Rate limiting deslizante por ventana de minuto (30 pings/min por
    repositorio) en Deno KV.
- **Monitoreo Sintético y Latencia de Red:**
  - Soporte de campos `latencyMs`, `httpStatus` y `endpoint` en los payloads de
    ping.
  - Cálculo automático del promedio de tiempo de respuesta y visualización de
    tarjeta dedicada **"Latencia de Red / API"** (⚡ ms).
- **Feed RSS 2.0 de Incidentes (`/rss/:owner/:repo.xml`):**
  - Sindicación estándar RSS 2.0 con soporte para suscripciones automáticas
    desde lectores RSS, canales de Slack o bots de Discord.
  - Botón de suscripción directa en la barra de herramientas de la página de
    estado.
- **Modo Widget Embebible (`?view=embed`):**
  - Vista compacta, autocontenida y sin cabecera/pie, lista para incrustar en
    portales de documentación (VitePress, Docusaurus, Astro, Notion) mediante
    `<iframe>`.
- **Receptor Nativo de GitHub Webhooks (`POST /api/webhook/github`):**
  - Procesamiento push en tiempo real para eventos `workflow_run`, `issues` y
    `release`.
  - Invalida y refresca la caché de Deno KV en sub-segundos con **0 consumo de
    cuota de la API REST de GitHub**.

#### 🔒 Security & AppSec Hardening

- **Autenticación Criptográfica de Telemetría:**
  - Soporte para autenticación por token `Bearer` y firmas **HMAC-SHA256**
    (`x-statuszero-signature`) en el endpoint de ping.
  - Implementación de comparación en tiempo constante
    ([timingSafeEqualString](services/security.ts)) mediante operaciones XOR a
    nivel de bytes para prevenir ataques de canal lateral (timing attacks).
- **Validación de Identificadores y Prevención de Inyecciones:**
  - Función [isValidGitHubIdentifier](services/security.ts) que bloquea intentos
    de Path Traversal (`..`, `/`, `\`), caracteres de control y tokens
    inválidos.
  - Función [escapeXml](services/security.ts) para neutralizar XSS y ataques de
    entidad XML en badges SVG y feeds RSS.
  - Sanitización de textos arbitrarios ([sanitizeText](services/security.ts))
    con eliminación de caracteres de control ASCII.
- **Middleware de Cabeceras Seguras:**
  - `Content-Security-Policy` (CSP) estricta, `X-Content-Type-Options: nosniff`,
    `X-Frame-Options: SAMEORIGIN` y `Permissions-Policy`.
- **Pipelines DevSecOps y CI/CD:**
  - Workflows de GitHub Actions bajo el principio de menor privilegio (PoLP).
  - Escaneo estático de vulnerabilidades con GitHub CodeQL (SARIF).
  - Actualización automatizada de dependencias con Dependabot.

#### 🐛 Resiliencia y Mitigación de Rate Limits

- **Tolerancia a Fallos ante Límites de GitHub API (60 req/h):**
  - Recuperación automática de caché stale desde Deno KV (`allowStale = true`).
  - Modo degradado seguro (HTTP 200) que evita caídas del servicio y muestra el
    tiempo restante exacto de restablecimiento mediante `x-ratelimit-reset`.
  - Soporte de 5.000 req/h mediante Personal Access Token configurado en
    `GITHUB_TOKEN`.
- **Cero Warnings y Errores:**
  - Tipado 100% estricto en TypeScript (0 tipos `any`).
  - 13/13 pruebas unitarias pasando satisfactoriamente.

---

## Enlaces & Recursos

- 📖 [README.md](README.md) - Documentación Principal
- 👥 [CONTRIBUTORS.md](CONTRIBUTORS.md) - Guía de Gobernanza y Contribuciones
- 📜 [CITATION.cff](CITATION.cff) - Archivo de Citación Académica y de Software
- 🌐 [Repositorio Oficial](https://github.com/glastor-dev/status)
