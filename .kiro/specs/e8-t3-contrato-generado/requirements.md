# E8-T3 — Consumo del contrato generado y retiro de los tipos escritos a mano

|                     |                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Épica / eje**     | E8 — panel administrativo (eje de entrega, no épica funcional)                                                                                                                                 |
| **Tarea**           | E8-T3 — Consumo del contrato generado y retiro de los tipos escritos a mano                                                                                                                    |
| **Repositorios**    | `pf-web-frontend-internal` **y** `pf-web-frontend-client`. Tarea compartida, se hace una vez para los dos (no son dos specs independientes: la corrección de uno se valida contra la del otro) |
| **Rama base**       | `pf-wfi-d` (internal) / `pf-wfc-d` (client)                                                                                                                                                    |
| **Rama de trabajo** | `feature/e8-t3-contrato-generado` en cada repo                                                                                                                                                 |
| **Fuente**          | `ai27-platform-context/docs/historias-tecnicas/E8-panel-admin.md` → E8-T3; `docs/PLAN-EJECUCION-V1.md` §9 (comparación de los dos portales contra el contrato)                                 |
| **Dependencias**    | `E0-T2` — **cumplida**: `pf-pkg-contracts` publicó `v0.1.0-tracer.11`, con tag, SHA y paquete TS (`@ai27-tech/contracts`) generado                                                             |

## Verificación de fuentes (hecha al iniciar esta tarea)

- `repos/pf-pkg-contracts`: `git fetch --tags` sin errores de red. Checkout local en rama `feat/identidad-gobierno-sujetos-roles`, **no** en el tag `v0.1.0-tracer.11`. Diff `HEAD` vs `v0.1.0-tracer.11` sobre `contracts/openapi/bff.yaml`, `_comunes.yaml` y `packages/api-client-ts` → **sin diferencias**. Para esta tarea (sesión + roles) el checkout local y el tag coinciden; se cita `v0.1.0-tracer.11` como la versión verificada.
- `VERSION` del repo = `v0.1.0-tracer.11`. Es el último tag publicado (`v0.1.0-tracer.4` a `.11`, sin huecos).
- `repos/ai27-platform-context`: `git log --oneline HEAD..origin/main` sin salida → al día. Commit citado: `a648dd7`.

## Alcance de este spec

**Dentro de alcance:** el contrato de **sesión** (login, refresh, logout) y el **enum de roles**, en los dos portales. Es la parte que el contrato ya define con precisión y que ambos portales inventaron de forma incompatible (ver tabla en `docs/PLAN-EJECUCION-V1.md` §9).

**Fuera de alcance de este spec (ver §"Fuera de alcance" más abajo para la razón):** los tipos de dominio de `viaje` escritos a mano en `pf-web-frontend-client` (`dominio.ts`, `estados.ts`, `eta.ts`, `panel.ts`). La historia técnica original los incluye en el criterio "cero tipos escritos a mano", pero el contrato real (`ViajeResumen { id, estado, origen }`, `ViajeSeguimiento { id, hito, eta, incidencias }`) es mucho más simple que lo que esos archivos asumen (`folio`, `unidad`, `destino`, `origenSitio`, `destinoSitio`, `reporteSeguridad`, `contratoId`, `rutaId`). Sustituirlos ahora, sin una pantalla que los consuma todavía, no resuelve el desajuste de campos — solo lo traslada. Se defiere a las historias que construyen esas pantallas (`E8-T7` bandeja operativa, `E9-T3` mis viajes), que de todas formas necesitan reconciliar esos campos contra el contrato real.

## Historia técnica

Como equipo de desarrollo, necesito que los dos portales consuman los tipos y el cliente HTTP generados desde `pf-pkg-contracts`, fijados a una versión exacta, para que la forma del wire deje de ser una suposición de cada portal.

## Estado verificado hoy

### Lo que cada portal inventó (contrastado contra `contracts/openapi/bff.yaml` tracer.11)

|                | Contrato `Sesion` / `CredencialesEntrada`                                                                                                                                                   | `internal` asume                                                                                    | `client` asume                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Login (body)   | `{usuario, contrasena}`                                                                                                                                                                     | `{email, password}` ✗                                                                               | `{usuario, password}` ✗ (campo `password` en vez de `contrasena`) |
| Respuesta      | `{sesion_id, access_token, expira_en}` + `refresh_token` opcional                                                                                                                           | anida `usuario:{id,email,name,rol,audiencia}` ✗                                                     | `{access_token, expira_en, requiere_segundo_factor}` ✗            |
| Refresh (body) | `{refresh_token}`                                                                                                                                                                           | igual ✓                                                                                             | sin cuerpo, asume cookie ✗                                        |
| Roles          | 8 identificadores de DEC-053 (`cliente`, `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion`, `administrador`), generados en `@ai27-tech/contracts/roles` | `RolInterno = 'operador' \| 'ejecutivo' \| 'supervisor' \| 'auditor'` (hardcodeado, incompatible) ✗ | no declara roles propios (no los necesita hoy)                    |

Dos consecuencias de fondo, no solo de nombres de campo:

1. **El contrato no devuelve `rol` ni `audiencia` en el cuerpo.** Vienen en los claims del JWT (`access_token`), nunca en el body — coherente con que el frontend no decida autorización (regla transversal 1 de `E8-panel-admin.md`). `internal` hoy depende de `wire.usuario.rol` en el cuerpo; eso deja de existir.
2. **`sesion_id` sí viene en la respuesta** y es lo que `E0-T4`/ADR 26 necesitan para el corte de revocación de 30 segundos. Ningún portal lo captura hoy.

### Estado de los repos

- `internal`: `src/lib/contracts/sesion.ts` tiene los tipos de sesión escritos a mano, marcados `PROVISIONAL`. No existe `scripts/gen-contracts.mjs` (declarado en `package.json`, archivo ausente). No hay dependencia a ningún paquete de contratos.
- `client`: `src/lib/contracts/` tiene 6 archivos provisionales (`dominio.ts`, `estados.ts`, `eta.ts`, `freshness.ts`, `panel.ts`, `sequences.ts`). El tipo de sesión vive aparte, en `src/lib/api/sesion.ts` (`SesionEmitida`/`SesionWire` locales a ese archivo, no en el barrel). `scripts/gen-contracts.mjs` existe y está **bloqueado a propósito** hasta que exista `CONTRACTS_DIR`.
- Ninguno de los dos tiene `@ai27-tech/contracts` como dependencia. (Nota de sesión anterior: `client/package.json` tiene sin commit una línea `"@ai27-tech/pf-pkg-contracts": "0.1.0-tracer.11"` — nombre de paquete **incorrecto**; se corrige como parte de esta tarea, ver R1.)
- El paquete real, verificado en `repos/pf-pkg-contracts/packages/api-client-ts/package.json`: `name: "@ai27-tech/contracts"`, `version: "0.1.0-tracer.11"`, con subrutas `./roles`, `./openapi/bff`, `./estados`, `./registro`, `./eventos/*`.

## Requisitos

### R1 — Dependencia fijada al paquete real, versión exacta

Los dos portales DEBEN depender de `@ai27-tech/contracts` en `0.1.0-tracer.11` exacta (sin rango, sin `^`/`~`), conforme a ADR 25. Prohibido `CONTRACTS_DIR`, rama mutable o `latest` como mecanismo de consumo.

**Criterios de aceptación:**

- `package.json` de los dos portales declara `"@ai27-tech/contracts": "0.1.0-tracer.11"`.
- `client/package.json` ya no declara `@ai27-tech/pf-pkg-contracts` (nombre incorrecto, de una edición previa sin commit).
- `pnpm install` resuelve el paquete en los dos portales (mismo mecanismo de auth por `NODE_AUTH_TOKEN`/scope que ya usa `@ai27-tech/ui` en CI; en local, el `~/.npmrc` del desarrollador).
- Búsqueda (`grep`) confirma cero referencias a `CONTRACTS_DIR` en ninguno de los dos portales tras esta tarea.

### R2 — Retiro de `scripts/gen-contracts.mjs` y del flujo de generación local

Los dos portales DEBEN dejar de generar tipos localmente con `openapi-typescript`. Los tipos ya vienen generados dentro de `@ai27-tech/contracts`; generar otra vez en el consumidor crea una segunda autoridad paralela (contradice ADR 25 §1, §4).

> **Desviación de la historia técnica original:** `E8-panel-admin.md` pide crear `scripts/gen-contracts.mjs` en `internal` y desbloquear el de `client`. Dado que `pf-pkg-contracts` ya publica el paquete TS compilado, ese paso quedaría generando una copia local redundante del mismo artefacto. Se opta por retirar el mecanismo en vez de completarlo. **Confirmar con el equipo antes de ejecutar** si se prefiere conservar `gen-contracts.mjs` por algún motivo no documentado aquí (p. ej. pipeline de verificación de drift).

**Criterios de aceptación:**

- `client/scripts/gen-contracts.mjs` y el script `gen:contracts` de `package.json` se eliminan en los dos portales (en `internal` nunca se crean).
- `openapi-typescript` se retira de `devDependencies` en los dos portales (dependencia ahora sin uso).
- `CONTRACTS_DIR` se elimina de `.env.example` en los dos portales.

### R3 — Contrato de sesión consumido desde el tipo generado

Los dos portales DEBEN consumir `Sesion`, `CredencialesEntrada` y `RefrescoEntrada` desde `@ai27-tech/contracts/openapi/bff` (vía el barrel de cada portal), no declarados a mano.

**Criterios de aceptación:**

- `internal`: `src/lib/contracts/sesion.ts` deja de declarar `SesionWire`, `CredentialsWire`, `UsuarioWire` a mano; el modelo de sesión de la app se construye a partir del tipo generado + el rol/audiencia derivados del JWT (R5).
- `client`: `src/lib/api/sesion.ts` deja de declarar `SesionWire`/`SesionEmitida` a mano con `requiere_segundo_factor`; usa el tipo `Sesion` generado.
- Los dos portales envían `{usuario, contrasena}` en el login (no `{email, password}` ni `{usuario, password}`) y `{refresh_token}` en el refresh.
- Un cambio incompatible en el contrato (p. ej. el tracer publica un campo renombrado) rompe el `typecheck` del portal, no se descubre en ejecución.
- El modelo de sesión de la app conserva `sesion_id` (no se descarta al parsear), para que `E0-T4`/E8-T6 puedan consumirlo después.

### R4 — Roles desde el enum generado

`internal` DEBE reemplazar `RolInterno` (hardcodeado, 4 valores incompatibles) por `Rol` de `@ai27-tech/contracts/roles` (8 valores, DEC-053). `client` no declara un enum de roles propio hoy; esta tarea no le agrega uno (no lo necesita hasta que consuma audiencia interna).

**Criterios de aceptación:**

- `internal` ya no declara `type RolInterno = 'operador' | 'ejecutivo' | 'supervisor' | 'auditor'`.
- Donde `internal` usa un rol (hoy: solo el mock), usa el `Rol` generado y, si aplica, los helpers `esRol`/`esInterno` ya generados en vez de reimplementarlos.
- Búsqueda confirma cero ocurrencias de `'operador'` o `'auditor'` como literal de rol en `src/` de `internal` (quedan solo en comentarios que documenten la corrección, si acaso).

### R5 — Rol y Audiencia resueltos desde los claims del JWT, no del cuerpo

Como el contrato confirma que `Sesion` no trae `usuario`, `rol` ni `audiencia` en el cuerpo, `internal` DEBE dejar de leerlos de ahí y resolverlos de los claims del `access_token`.

> **Brecha contractual señalada, no inventada:** el nombre exacto de los claims (p. ej. si es `rol` o `role`, `tenant_id` o `tenant`) **no está en ningún esquema generado** — las fuentes OpenAPI no modelan el JWT, solo el wire HTTP. La prosa de `docs/arquitectura/services/identidad.md` describe en texto que "el token lleva identidad, tenant, `rol` y `Audiencia`", pero eso no es un contrato ejecutable. Esta tarea implementa la decodificación con los nombres de claim documentados en prosa (`rol`, `tenant_id`, `sesion_id`) de forma **aislada y fácil de corregir en un solo archivo**, y deja marcado un `TODO(contracts)` citando esta brecha. No se bloquea la tarea por esto — se decide con la mejor fuente disponible y se marca para corrección cuando el _mapper_ real del IdP (ADR 32 §4) esté implementado y se pueda confirmar contra un token real.
>
> `Audiencia` (`Cliente` | `Interno`) no viaja en el token como claim propio: se deriva del rol en el cliente, mapeo fijo de DEC-054 (`cliente` → `Cliente`; los otros siete → `Interno`). Esto sí es una regla de negocio cerrada (HECHO), no una suposición.

**Criterios de aceptación:**

- Existe una función de decodificación de JWT (solo lectura de claims para UX de enrutado; la autorización real la decide el servidor en cada petición — regla transversal 1) en un único archivo, sin librería externa nueva si el decode cabe en unas pocas líneas (base64url + `JSON.parse`); si se prefiere una librería, se fija versión exacta y se justifica.
- `Usuario`/`rol` en el modelo de sesión de `internal` se deriva de los claims decodificados del `access_token`, no del cuerpo de `Sesion`.
- Un token sin el claim de rol, o con un valor fuera de los 8 válidos, no se trata como un rol válido (usar `esRol` generado para la validación) — se documenta qué hace la app en ese caso (p. ej. tratar como sesión inválida) como parte del diseño, no silenciosamente.

### R6 — Mocks regenerados en forma de contrato real

Los fixtures de MSW de los dos portales DEBEN reflejar la forma real del contrato de sesión (`sesion_id`, sin `usuario` anidado, sin `requiere_segundo_factor`), y el mock debe producir un `access_token` del que la app pueda extraer claims (R5), no un string opaco.

**Criterios de aceptación:**

- `internal/src/mocks/data.ts`: `createSessionWire` devuelve la forma de `Sesion` del contrato; el token mock lleva claims decodificables (rol, tenant, sesion_id) en vez de ser un UUID de mentira.
- `client/src/mocks/handlers.ts` y `data.ts`: las respuestas de `/sesion` y `/sesion/refresh` incluyen `sesion_id` y dejan de incluir `requiere_segundo_factor`.
- Las pruebas/e2e existentes que dependían de la forma vieja (si las hay) se actualizan o se confirma que ninguna dependía de los campos retirados.

### R7 — Cero tipos de sesión escritos a mano, verificable por búsqueda

Tras esta tarea, ningún archivo de `src/` de ninguno de los dos portales declara una interfaz de wire para sesión, credenciales o roles por su cuenta.

**Criterios de aceptación:**

- `grep` por `interface SesionWire`, `interface CredentialsWire`, `type RolInterno` en `src/` de los dos portales → sin resultados.
- El barrel de contratos de cada portal (`lib/contracts/index.ts`) reexporta desde `@ai27-tech/contracts` para lo que cubre esta tarea (sesión, roles), y sigue siendo el único punto de entrada (se conserva `no-restricted-imports` hacia los archivos internos).

## Fuera de alcance

- **Tipos de dominio de `viaje` en `client`** (`dominio.ts`, `estados.ts`, `eta.ts`, `panel.ts`): ver razón en "Alcance de este spec" arriba. Se defiere a `E8-T7`/`E9-T3`.
- **AppShell ni navegación** (`E8-T4`): esta tarea no construye UI, solo la capa de tipos y el wrapper HTTP de sesión.
- **Completar el segundo factor / MFA** (`E8-T5`, `E9-T2`): el contrato de `Sesion` no tiene `requiere_segundo_factor`; esta tarea retira ese campo de los dos portales pero no construye el flujo de MFA.
- **Corte de sesión revocada** (`E8-T6`): esta tarea conserva `sesion_id` en el modelo de sesión para que `E8-T6` lo use; no implementa el manejo de revocación en sí.
- **Resolver la decisión abierta de `tokenStore`** (localStorage vs memoria+cookie httpOnly): queda igual que hoy en los dos portales; fuera de alcance de esta tarea.
- **Scripts de generación de contratos para servicios Go**: no aplica a este spec (es de frontend).
