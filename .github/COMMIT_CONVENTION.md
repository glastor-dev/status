# 🏛️ Arquitectura de Mensajes de Commit (Conventional Commits)

Para escalar el desarrollo y garantizar una **Software Supply Chain**
transparente, este repositorio implementa una convención estricta basada en el
[estándar de Angular](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular).
Esta práctica no es solo estética: es el motor que impulsa nuestra
automatización de versiones, generación de changelogs y auditoría técnica.

## ⚙️ Especificación Técnica y Validación

Todo aporte debe superar el esquema de validación definido por la siguiente
expresión regular para integrarse en el flujo de CI/CD:

```js
/^(revert: )?(feat|fix|polish|docs|style|refactor|perf|test|workflow|ci|chore|types)(\([\w.-]+\))?: .{1,50}$/;
```

### Parámetros de Calidad (Linting):

- **Scope (Opcional):** Define el contexto del cambio entre paréntesis (ej.
  `core`, `kv`, `api`, `routes`, `islands`, `badge`, `rss`, `webhook`,
  `security`).
- **Sujeto:** Máximo 50 caracteres. Debe ser conciso y descriptivo.
- **DX-First:** Historiales limpios facilitan el _debugging_ y el
  _cherry-picking_.

---

## 🏗️ Estructura del Mensaje

Adoptamos un formato de tres bloques para maximizar la legibilidad y la
compatibilidad con herramientas de orquestación:

```text
<tipo>(<scope>): <asunto>

<body>

<footer>
```

### 1. Header (Obligatorio)

| Tipo              | Impacto en DX                                 | ¿Aparece en Changelog? |
| :---------------- | :-------------------------------------------- | :--------------------: |
| `feat`            | Implementación de nueva funcionalidad.        |         **Sí**         |
| `fix`             | Resolución de un bug o regresión.             |         **Sí**         |
| `perf`            | Optimización de recursos sin cambios lógicos. |         **Sí**         |
| `refactor`        | Mejora de arquitectura o legibilidad.         |           No           |
| `docs`            | Actualización de documentación técnica.       |           No           |
| `test`            | Incremento de cobertura o fixes de testing.   |           No           |
| `ci` / `workflow` | Ajustes en pipelines y automatización.        |           No           |
| `chore`           | Mantenimiento de dependencias y tooling.      |           No           |
| `style`           | Formateo de código (deno fmt/lint).           |           No           |
| `types`           | Refinamiento de definiciones de tipos.        |           No           |
| `polish`          | Refinamientos menores de UX/UI.               |           No           |

> 💡 **Impacto en SemVer:** Cualquier commit con un `BREAKING CHANGE` en el
> footer forzará un incremento de versión mayor (_Major Release_),
> independientemente del tipo.

### 2. Body (Opcional)

Describe la motivación técnica del cambio. Contrasta la solución actual con el
comportamiento previo para facilitar la revisión de pares (Code Review).

### 3. Footer (Opcional)

Espacio crítico para metadatos y gobernanza de la tarea:

- **Referencias:** Vincula tickets mediante palabras clave: `Closes #123`,
  `Resolves #456`.
- **Breaking Changes:** Debe iniciar con `BREAKING CHANGE:` seguido de una
  explicación clara sobre la pérdida de compatibilidad hacia atrás.

---

## 🔄 Reversiones (Reverts)

En caso de rollback, el mensaje debe iniciar con `revert:`, seguido del header
original. Es imperativo incluir el hash del commit afectado en el cuerpo:
`This reverts commit <hash>`.

## ✍️ Firmas y Trazabilidad (DCO)

Se fomenta el uso de trailers estándar de Git como `Co-authored-by:` para dar
crédito a colaboraciones múltiples. La firma `Signed-off-by:` garantiza el
cumplimiento con el Developer Certificate of Origin si el flujo de trabajo lo
requiere.

© 2010-2026 Andrés Antonio Cardoso — Todos los derechos reservados
