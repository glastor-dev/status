# 🛡️ Política de Seguridad y Divulgación Responsable (AppSec)

La integridad de **StatusZero** (`glastor-dev/status`) y la protección de los
datos de infraestructura de nuestros usuarios es una prioridad técnica
innegociable. Este documento define los protocolos oficiales para el reporte
responsable de vulnerabilidades y los estándares de seguridad implementados en
el núcleo del proyecto.

---

## 📦 Versiones Soportadas

Actualmente se proporciona soporte activo de seguridad y parches inmediatos para
las siguientes versiones:

| Versión        | Estado de Soporte | Notas                            |
| :------------- | :---------------: | :------------------------------- |
| `1.x` (master) |   ✅ Soportada    | Rama principal de producción     |
| `< 1.0.0`      |  ❌ No soportada  | Versiones experimentales previas |

---

## 🚨 Reporte de Vulnerabilidades

Si descubres una posible vulnerabilidad de seguridad (inyecciones, evasión de
rate limiting, falsificación de firmas HMAC, filtraciones en Deno KV o bypass de
CSP), **no abras un issue público**.

Por favor, sigue nuestro protocolo de divulgación coordinada:

1. **Contacto Primario:** Envía los detalles técnicos por correo electrónico a:
   📧 **[glastor.info@gmail.com](mailto:glastor.info@gmail.com)**
2. **Asunto sugerido:**
   `[SECURITY] Reporte de Vulnerabilidad en StatusZero - <Componente>`
3. **Contenido del reporte:**
   - Descripción técnica precisa del vector de ataque.
   - Pasos determinísticos de reproducción (PoC o script mínimo).
   - Impacto estimado en confidencialidad, integridad o disponibilidad.
   - Posible propuesta de mitigación o parche (opcional).

### SLA de Respuesta y Compromiso

- **Acuse de recibo inicial:** En un plazo máximo de **24 a 48 horas**.
- **Evaluación y triaje:** Clasificación del impacto en menos de **72 horas**.
- **Divulgación coordinada:** Acordaremos una ventana de tiempo razonable
  (típicamente 30 a 90 días) para desplegar el parche antes de hacer público el
  informe.

---

## 🔒 Arquitectura de Seguridad Implementada (DevSecOps)

StatusZero sigue rigurosos principios de diseño seguro:

- **Principio de Mínimo Privilegio (PoLP):** Los flujos de GitHub Actions y los
  tokens de acceso personal de GitHub solo requieren permisos de lectura pública
  sobre repositorios.
- **Validación de Entradas Estricta:** Todos los identificadores (`owner/repo`)
  se validan contra Directory Traversal (`..`, `/`, `\`), SSRF e inyección de
  encabezados mediante `isValidGitHubIdentifier`.
- **Mitigación de Timing Attacks:** La autenticación de pings y webhooks utiliza
  comparación en tiempo constante (`timingSafeEqualString`) basada en XOR a
  nivel de bytes.
- **Autenticación HMAC-SHA256:** Verificación criptográfica opcional de payloads
  de telemetría y webhooks de GitHub (`x-statuszero-signature` /
  `X-Hub-Signature-256`).
- **Sanitización XML & SVG:** Todos los datos dinámicos insertados en badges SVG
  y feeds RSS se escapan rigurosamente con `escapeXml` para prevenir SVG-based
  XSS y ataques de entidad XML.
- **Cabeceras HTTP Defensivas:** Middleware con `Content-Security-Policy`
  estricto, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` y
  `Permissions-Policy`.
- **Cero Secretos Almacenados:** Las credenciales y tokens nunca se persisten en
  logs ni se exponen en las respuestas de la API pública.

---

© 2010-2026 Andrés Antonio Cardoso — GLASTOR®. Todos los derechos reservados.
