## 📝 Descripción del Cambio

<!-- Explica de forma concisa qué problema resuelve este Pull Request o qué funcionalidad agrega a StatusZero. -->

## 🎯 Tipo de Cambio

- [ ] 🚀 `feat`: Nueva funcionalidad o capacidad para el sistema.
- [ ] 🐛 `fix`: Corrección de un error o problema de disponibilidad/resiliencia.
- [ ] 🔒 `security`: Mejora o parche de AppSec / DevSecOps.
- [ ] ⚡ `perf`: Optimización de rendimiento o consumo de recursos en Edge/KV.
- [ ] ♻️ `refactor`: Refactorización interna sin cambio de comportamiento
      visible.
- [ ] 📚 `docs`: Actualización de documentación, guías o gobernanza.
- [ ] 🧪 `test`: Incorporación o mejora de pruebas unitarias/integración.
- [ ] 🔧 `chore`: Mantenimiento de configuración, tooling o dependencias.

## 🔗 Issues Vinculados

<!-- Vincula issues relacionados, ej: Closes #12, Fixes #34 -->

Closes #

## 📋 Checklist de Calidad y Gobernanza (Lead Quality / AppSec)

Por favor, confirma que tu contribución cumple con los siguientes estándares
antes de solicitar revisión:

- [ ] He ejecutado `deno task check` localmente y **no existen advertencias ni
      errores de linter ni de tipos**.
- [ ] He ejecutado `deno test --unstable-kv -A` y **todas las pruebas pasan al
      100%**.
- [ ] Se respeta el tipado estricto de TypeScript (**0 tipos `any`**
      introducidos).
- [ ] Las entradas de usuario y llamadas a la API de GitHub están
      sanitizadas/validadas contra path traversal y XSS.
- [ ] He seguido la convención de mensajes
      [Conventional Commits](.github/COMMIT_CONVENTION.md).
- [ ] He actualizado el archivo [CHANGELOG.md](CHANGELOG.md) si este cambio
      añade o altera funcionalidades públicas.
- [ ] He revisado y acepto los marcos de
      [CONTRIBUTING.md](.github/CONTRIBUTING.md) y
      [CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md).

---

© 2010-2026 Andrés Antonio Cardoso — GLASTOR®.
