# Brechas — E8-T13 (Histórico: notas, estadías e incidencias)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-10-29)

**Todas las brechas de contrato están cerradas.** `tracer.22` publicó la última pieza (la lectura de incidencias); `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.22` y el contrato instalado expone las ocho operaciones del histórico con sus schemas y códigos de error. La **implementación de E8-T13 está completa y verificada** (`typecheck` ✓, `lint` ✓, `test` 157/157 ✓, `build:mock` ✓). `lib/contracts/historicoViaje.ts` consume los tipos generados y el histórico de incidencias previas ya es observable. No quedan pendientes externos de contrato.

| Brecha                                   | Estado                                                | Base verificada                                                      |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Operaciones del histórico en el `bff` | **Cerrada:** publicada en `tracer.21`, pin ya subido  | `bff.gen.ts` instalado + DEC-105                                     |
| 2. Tipo de entrada de bitácora           | Decidida: V1 solo `{ texto }`, sin tipo               | `propuesta-clasificacion-estatus-v1.md` §5 (no hay catálogo cerrado) |
| 3. `tipo_interno` de incidencia          | Decidida: V1 `string`, enum en ola aditiva posterior  | DEC-003 §2 (lista existe) + DEC-105                                  |
| 4. Componentes de `@ai27-tech/ui`        | **Verificada:** sin componente local, solo primitivas | exports de `@ai27-tech/ui@0.2.0-beta.6`                              |
| 5. Lectura (`GET`) de incidencias        | **Cerrada:** publicada en `tracer.22`, pin ya subido  | `bff.gen.ts` instalado (`listarIncidencias`)                         |

---

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`. Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T13. HU `E1-HU-007`, `E1-HU-008`, `E1-HU-009`. Decisiones DEC-003, DEC-006, DEC-011, DEC-020 #3, DEC-038, DEC-045, DEC-060 y **DEC-105** (commit `1ee30db`: proyección del histórico al `bff` para E8-T13; `tipo_interno` se mantiene `string`, a tipificar en ola aditiva).
- **Contrato:** fijado por `repos/pf-web-frontend-internal/package.json`: `@ai27-tech/contracts@0.1.0-tracer.21`, `@ai27-tech/ui@0.2.0-beta.6`. `tracer.21` ya está publicado e instalado; incluye la ola de T13 (las 7 operaciones del histórico) regenerada en los clientes (`bff.gen.ts`, `bff.gen.go`, etc.), confirmada en el `bff.gen.ts` del paquete instalado.

---

## Brecha 1 — Operaciones del histórico en el `bff` (CERRADA: publicada en `tracer.21`)

**Qué pedía la tarea.** E8-T13 declara `POST`/`GET /api/v1/viajes/{id}/bitacora` y `POST`/`PATCH /api/v1/viajes/{id}/incidencias[/{iid}]`, y la historia de estadías (`E1-HU-008`) exige abrir/cerrar/listar estadías. El frontend interno solo habla con el `bff`.

**Estado.** `tracer.21` **ya está publicado** y `package.json` fija ese pin. Las siete operaciones existen en el contrato instalado, reenviando a `operacion`, con sus schemas, los `409` (`condicion_ya_abierta`, `estadia_ya_cerrada`), el `403` y el estado de incidencia tipado `enum [en_atencion, resuelta]`. Verificado directamente en `node_modules/@ai27-tech/contracts/.../openapi/bff.gen.ts`. DEC-105 registra la decisión.

**Qué queda.** Nada del lado del contrato. Deuda interna: `lib/contracts/historicoViaje.ts` debe dejar de reafirmar los schemas a mano (`components['schemas'] & {…}`) y consumir los tipos generados de `@ai27-tech/contracts/openapi/bff` — cambio de importación, no reescritura de lógica.

**Operaciones (verificadas en el `bff.gen.ts` instalado, reenviando a `operacion`):**

| Operación esperada         | Método y ruta (esperada)                      | Request                                            | Response                                                        |
| -------------------------- | --------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `listarBitacora`           | `GET /api/v1/viajes/{id}/bitacora`            | cursor?                                            | `PaginaBitacora { items: EntradaBitacora[], cursor_siguiente }` |
| `registrarEntradaBitacora` | `POST /api/v1/viajes/{id}/bitacora`           | `EntradaBitacoraEntrada { texto }`                 | `201 EntradaBitacora { id, viaje_id, texto, autor, ts }`        |
| `abrirIncidencia`          | `POST /api/v1/viajes/{id}/incidencias`        | `IncidenciaEntrada { tipo_interno, descripcion? }` | `201 Incidencia` / `409 condicion_ya_abierta`                   |
| `resolverIncidencia`       | `PATCH /api/v1/viajes/{id}/incidencias/{iid}` | `ResolucionIncidenciaEntrada { resolucion }`       | `200 Incidencia`                                                |
| `listarEstadias`           | `GET /api/v1/viajes/{id}/estadias`            | cursor?                                            | `PaginaEstadias { items: Estadia[], cursor_siguiente }`         |
| `abrirEstadia`             | `POST /api/v1/viajes/{id}/estadias`           | `EstadiaEntrada { motivo, eje_autorizacion }`      | `201 Estadia`                                                   |
| `cerrarEstadia`            | `PATCH /api/v1/viajes/{id}/estadias/{eid}`    | `CierreEstadiaEntrada {}` (vacío)                  | `200 Estadia` / `409 estadia_ya_cerrada`                        |

Formas de respuesta (verificadas en el `bff.gen.ts` instalado):

- `Incidencia { id, viaje_id, tipo_interno, estado(en_atencion|resuelta), abierta_en, resuelta_en? }`.
- `Estadia { id, viaje_id, motivo, eje_autorizacion, inicio, cierre? }`. La **duración se deriva** de `inicio`/`cierre`; no es un campo, no existe `prolongada` ni umbral (DEC-038).

---

## Brecha 2 — Tipo de entrada de bitácora (DECIDIDA: V1 solo texto)

**Qué pedía la tarea.** `E1-HU-009` define un campo **Tipo de entrada** (nota de monitoreo / observación).

**Resolución (confirmada por Contratos contra la fuente).** En `propuesta-clasificacion-estatus-v1.md` §5 las "anotaciones de bitácora" están como prosa suelta, **no** como un catálogo cerrado `nota/observacion`. No existe una lista validada de dos valores. Por tanto, en V1 la bitácora es solo `{ texto }`, sin tipo de entrada. El contrato **no** lo inventa.

**Impacto en el spec.** Requirement 2.4 queda como **"V1 sin tipo de entrada"**: la UI captura solo texto. Tipar el campo sería una decisión **nueva de Producto** (definir el catálogo), no una brecha de contrato.

---

## Brecha 3 — `tipo_interno` de incidencia (DECIDIDA: V1 `string`, enum en ola posterior)

**Qué pedía la tarea.** `E1-HU-007` registra la incidencia con su **tipo** desde un catálogo interno (DEC-003).

**Resolución (confirmada por Contratos contra la fuente).** Sí existe la lista de tipos internos, validada por Operación en `propuesta-clasificacion-estatus-v1.md` §2 (cerrada en DEC-003, 2026-10-02): ~20 valores (p. ej. _Asalto o Robo_, _Bloqueo Carretero_, _Desvío de Ruta_, _Falla Mecánica_, _Retiro de GPS_). Lo que impide tiparla a enum en esta ola **no** es la ausencia de catálogo, sino tres cosas: (1) la forma del token (prosa con acentos/espacios, falta fijar snake_case); (2) la lista no está congelada (DEC-003 deja un pendiente documental, p. ej. _LT No Responde_); (3) mezcla de dimensiones (algunos valores al curarse resultan observación o condición de señal, no incidencia). DEC-105 registra que `tipo_interno` se mantiene `string` y se tipifica en una **ola aditiva posterior** con su propia DEC.

**Impacto en el spec.** Requirement 4.2 queda como **"V1: `string`, enum planificado"**. La UI trata `tipo_interno` como texto; **no** inventa un selector cerrado con esos ~20 valores mientras el contrato no publique el enum curado.

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (VERIFICADA: sin componente local)

**Qué pide la tarea.** Lista cronológica del histórico, formularios de nota/estadía/incidencia, modal de resolución y avisos de rechazo.

**Qué existe (verificado en `@ai27-tech/ui@0.2.0-beta.6`).** La librería exporta `Form`, `FormField`, `FormRow`, `Input`, `Textarea`, `Select` (con `SelectOption`), `Radio`, `Checkbox`, `Switch`, `Button`, `Modal`, `Toast`, `ToastContainer`, `Badge`, `Table`, `Card`/`CardHeader`/`CardBody`, `Tooltip`, entre otros. `Textarea` y `Select` se exportan desde el módulo `Input`. **Nota de prueba:** el `Select` no es un `<select>` nativo sino un botón-trigger con popup (su nombre accesible es el placeholder); los tests lo operan abriendo el trigger y clicando la opción.

**Resolución.** No hay componente dedicado de línea de tiempo; la lista cronológica se compone con `Card` + `<ul>` semántica y `Badge` para el estado. No se creó ningún componente local; todo son primitivas de la librería. Sin solicitud nueva a la librería.

---

## Brecha 5 — Lectura (`GET`) de incidencias (CERRADA: publicada en `tracer.22`)

**Qué pedía la tarea.** `E1-HU-007` implica poder ver las incidencias del viaje en el histórico.

**Estado (verificado en `tracer.22`).** Resuelta. El `bff` ahora publica `GET /api/v1/viajes/{id}/incidencias` → `listarIncidencias` → `PaginaIncidencias { items: Incidencia[], cursor_siguiente }`, con `cursor` opcional y respuestas `200/401/404`, espejo de `listarEstadias`/`listarBitacora`. Incluye incidencias `en_atencion` y `resuelta`. Verificado en el contrato instalado (`bff.gen.ts` de `tracer.22`). El brief que originó el cambio está en `.scratch/brecha-contrato-bff-listar-incidencias/`.

**Adopción en el frontend.** `package.json` subió el pin a `@ai27-tech/contracts@0.1.0-tracer.22`. El hook `useHistoricoViaje` dejó de usar el estado de incidencias en sesión y ahora las lee con una `useQuery` sobre `listarIncidencias` (las mutaciones de abrir/resolver invalidan esa lectura). La presentación no cambió: ya consumía una lista de `Incidencia`. El histórico de incidencias previas de un viaje **ya es observable** y hay una prueba de integración que lo verifica (lectura al montar).
