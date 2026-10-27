# Brechas — E8-T13 (Histórico: notas, estadías e incidencias)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context@ba1abc3` (árbol limpio, al día con `origin/main`). Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T13. HU `E1-HU-007`, `E1-HU-008`, `E1-HU-009`. Decisiones DEC-003, DEC-006, DEC-011, DEC-020 #3, DEC-038, DEC-045, DEC-060.
- **Contrato:** fijado por `repos/pf-web-frontend-internal/package.json`: `@ai27-tech/contracts@0.1.0-tracer.20`, `@ai27-tech/ui@0.2.0-beta.6`. El checkout local de `repos/pf-pkg-contracts` está en la rama `pf-contracts-m` (`31e6e2a`), **no** en un tag; el contrato se leyó contra el tag `v0.1.0-tracer.20`, que es también el último publicado. Por tanto el frontend está en la versión más reciente.

---

## Brecha 1 — Operaciones del histórico ausentes en el `bff` (BLOQUEANTE)

**Qué pide la tarea.** E8-T13 declara el contrato `POST`/`GET /api/v1/viajes/{id}/bitacora` y `POST`/`PATCH /api/v1/viajes/{id}/incidencias[/{iid}]`, y la historia de estadías (`E1-HU-008`) exige abrir/cerrar/listar estadías. El frontend interno solo habla con el `bff`.

**Qué existe hoy.**

- En `bff.yaml@v0.1.0-tracer.20`: de este dominio solo **lecturas curadas** — `IncidenciaCurada` (categoría + estado para el cliente, DEC-006), `IncidenciaActiva`/`CondicionAbierta` embebidas en el detalle interno (solo lectura), y `EntradaBitacoraDescarga` (expediente de descarga, E6). **No hay** ninguna ruta de escritura ni lectura operativa del histórico.
- En `operacion.yaml@v0.1.0-tracer.20`: existen las siete operaciones — `listarBitacora`, `registrarEntradaBitacora`, `abrirIncidencia`, `resolverIncidencia`, `listarEstadias`, `abrirEstadia`, `cerrarEstadia`. `operacion` es consumo interno del `bff`, **no** del frontend.

**Qué falta exactamente.** Que el `bff` exponga (reenviando a `operacion`):

| Operación esperada         | Método y ruta (esperada)                      | Request                                            | Response                                                        |
| -------------------------- | --------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `listarBitacora`           | `GET /api/v1/viajes/{id}/bitacora`            | cursor?                                            | `PaginaBitacora { items: EntradaBitacora[], cursor_siguiente }` |
| `registrarEntradaBitacora` | `POST /api/v1/viajes/{id}/bitacora`           | `EntradaBitacoraEntrada { texto }`                 | `201 EntradaBitacora { id, viaje_id, texto, autor, ts }`        |
| `abrirIncidencia`          | `POST /api/v1/viajes/{id}/incidencias`        | `IncidenciaEntrada { tipo_interno, descripcion? }` | `201 Incidencia` / `409 condicion_ya_abierta`                   |
| `resolverIncidencia`       | `PATCH /api/v1/viajes/{id}/incidencias/{iid}` | `ResolucionIncidenciaEntrada { resolucion }`       | `200 Incidencia`                                                |
| `listarEstadias`           | `GET /api/v1/viajes/{id}/estadias`            | cursor?                                            | `PaginaEstadias { items: Estadia[], cursor_siguiente }`         |
| `abrirEstadia`             | `POST /api/v1/viajes/{id}/estadias`           | `EstadiaEntrada { motivo, eje_autorizacion }`      | `201 Estadia`                                                   |
| `cerrarEstadia`            | `PATCH /api/v1/viajes/{id}/estadias/{eid}`    | `CierreEstadiaEntrada {}` (vacío)                  | `200 Estadia` / `409 estadia_ya_cerrada`                        |

Formas de respuesta (verificadas en `operacion.yaml@v0.1.0-tracer.20`):

- `Incidencia { id, viaje_id, tipo_interno, estado(en_atencion|resuelta), abierta_en, resuelta_en? }`.
- `Estadia { id, viaje_id, motivo, eje_autorizacion, inicio, cierre? }`. La **duración se deriva** de `inicio`/`cierre`; no es un campo, no existe `prolongada` ni umbral (DEC-038).

**Impacto en el spec.** Bloquea las operaciones reales de los Requirements 1–5. La pantalla se construye contra el **contrato esperado**, con la brecha aislada en `lib/contracts/historicoViaje.ts` y servida con mocks (MSW). Reemplazo mecánico cuando el `bff` publique.

**Propuesta de resolución.** Solicitar al dueño de `pf-pkg-contracts` exponer las siete operaciones en el `bff` (reenvío a `operacion`), preservando el curado de incidencia hacia el cliente (DEC-006) y el índice único parcial (`409 condicion_ya_abierta`). Es la misma brecha de superficie que ya reportó E8-T8 para transiciones/ETA; conviene resolverlas juntas. Mientras tanto, no se escriben clientes a mano como autoridad paralela.

---

## Brecha 2 — Catálogo de tipo de entrada de bitácora (CONDICIONA)

**Qué pide la tarea.** `E1-HU-009` define un campo **Tipo de entrada** (nota de monitoreo / observación) como catálogo obligatorio.

**Qué existe hoy.** `EntradaBitacoraEntrada` del contrato tiene solo `{ texto }`; no hay enum de tipo de entrada.

**Qué falta.** Un catálogo/enum de tipo de entrada, o la confirmación de que en V1 la bitácora es solo texto.

**Impacto en el spec.** Requirement 2.4 queda condicionado: la UI ofrece el tipo como dato tipado solo si el contrato lo publica; no inventa valores.

**Propuesta de resolución.** Confirmar con Operación (DEC-003 cita la validación del catálogo del histórico como pendiente) y, si aplica, solicitar el enum en el contrato.

---

## Brecha 3 — Catálogo de tipos internos de incidencia (CONDICIONA)

**Qué pide la tarea.** `E1-HU-007` registra la incidencia con su **tipo** desde un catálogo interno (DEC-003).

**Qué existe hoy.** `IncidenciaEntrada.tipo_interno` es `string` libre en el contrato; no hay enum publicado del catálogo operativo.

**Qué falta.** El enum/catálogo de tipos internos de incidencia (DEC-003 marca la clasificación como validada por Operación el 2026-10-02, pero el contrato aún no lo tipa).

**Impacto en el spec.** Requirement 4.2 queda condicionado: el selector de tipo se ofrece desde el catálogo cuando exista; la UI no inventa tipos.

**Propuesta de resolución.** Solicitar el catálogo tipado (o su fuente desde `catalogos`) para el `bff`/contrato. Mientras tanto, el tipo se trata como el `string` del contrato sin una lista cerrada inventada.

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (POR VERIFICAR)

**Qué pide la tarea.** Lista cronológica del histórico, formularios de nota/estadía/incidencia, modal de resolución y avisos de rechazo.

**Qué existe hoy.** `@ai27-tech/ui@0.2.0-beta.6` ofrece (según E8-T11) `Form`/`FormField`/`FormRow`, `Input`, `Textarea`, `Select`, `Radio`, `Checkbox`, `Button`, `Modal`, `Toast`, `Badge`, `Table`, `Card`, `Tooltip`, entre otros.

**Qué falta (a verificar en la tarea 1).** Un componente dedicado de **línea de tiempo / histórico** podría no existir; se compone con `Table`/`Card` + lista. No se crea un componente local.

**Impacto en el spec.** Ninguno bloqueante: afordancias faltantes se componen con primitivas.

**Propuesta de resolución.** Si se quisiera un control dedicado de línea de tiempo, es una **solicitud a la librería**, no duplicación local.
