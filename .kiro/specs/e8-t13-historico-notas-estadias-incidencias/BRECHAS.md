# Brechas — E8-T13 (Histórico: notas, estadías e incidencias)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-10-27)

Las tres brechas que dependían del contrato quedaron **resueltas o decididas** con fuente verificada. El único pendiente externo es la **publicación del tracer**: la ola vive en la rama `feat/ficha-tecnica-e-historico-tracer21` (PR #76, commit `a47ed70`), aún sin promover a `-m` ni taguear. Hoy `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.20`; cuando se publique `tracer.21` y se suba el pin, T13 cierra sus brechas de contrato.

| Brecha                                   | Estado                                                  | Base verificada                                                      |
| ---------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Operaciones del histórico en el `bff` | Resuelta en la rama (pendiente de publicar `tracer.21`) | `bff.yaml` de la rama + DEC-105                                      |
| 2. Tipo de entrada de bitácora           | Decidida: V1 solo `{ texto }`, sin tipo                 | `propuesta-clasificacion-estatus-v1.md` §5 (no hay catálogo cerrado) |
| 3. `tipo_interno` de incidencia          | Decidida: V1 `string`, enum en ola aditiva posterior    | DEC-003 §2 (lista existe) + DEC-105                                  |
| 4. Componentes de `@ai27-tech/ui`        | No depende del contrato                                 | Verificación en el frontend                                          |

---

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`. Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T13. HU `E1-HU-007`, `E1-HU-008`, `E1-HU-009`. Decisiones DEC-003, DEC-006, DEC-011, DEC-020 #3, DEC-038, DEC-045, DEC-060 y **DEC-105** (commit `1ee30db`: proyección del histórico al `bff` para E8-T13; `tipo_interno` se mantiene `string`, a tipificar en ola aditiva).
- **Contrato:** fijado por `repos/pf-web-frontend-internal/package.json`: `@ai27-tech/contracts@0.1.0-tracer.20`, `@ai27-tech/ui@0.2.0-beta.6`. El último tag publicado es `v0.1.0-tracer.20`. La ola de T13 (las 7 operaciones del histórico) vive en la rama `feat/ficha-tecnica-e-historico-tracer21` (PR #76, commit `a47ed70`), que sube `VERSION`/`package.json` a `tracer.21` y regenera los clientes (`bff.gen.ts`, `bff.gen.go`, etc.). Aún no promovida ni tagueada.

---

## Brecha 1 — Operaciones del histórico en el `bff` (RESUELTA en la rama; pendiente de publicar `tracer.21`)

**Qué pedía la tarea.** E8-T13 declara `POST`/`GET /api/v1/viajes/{id}/bitacora` y `POST`/`PATCH /api/v1/viajes/{id}/incidencias[/{iid}]`, y la historia de estadías (`E1-HU-008`) exige abrir/cerrar/listar estadías. El frontend interno solo habla con el `bff`.

**Estado.** En el último tag publicado (`v0.1.0-tracer.20`) el `bff` **no** exponía estas operaciones; solo tenía lecturas curadas (`IncidenciaCurada`, `IncidenciaActiva`/`CondicionAbierta` del detalle interno, `EntradaBitacoraDescarga`). La rama `feat/ficha-tecnica-e-historico-tracer21` (PR #76) **ya las agrega al `bff`**, reenviando a `operacion`, y DEC-105 registra la decisión. Verificado contra el `bff.yaml` de la rama: las siete operaciones existen con sus schemas, los `409` (`condicion_ya_abierta`, `estadia_ya_cerrada`), el `403` y el estado de incidencia tipado `enum [en_atencion, resuelta]`.

**Qué queda.** Que la rama pase CI, se promueva a `-m` y se taguee `tracer.21`, y que `package.json` del frontend suba el pin de `tracer.20` a `tracer.21`. Hasta entonces, la pantalla se construye contra el **contrato esperado**, con la brecha aislada en `lib/contracts/historicoViaje.ts` y servida con mocks (MSW); al publicar, se reemplazan esos tipos por los generados (`@ai27-tech/contracts/openapi/bff`) — cambio de importación, no reescritura.

**Operaciones (verificadas en el `bff.yaml` de la rama, reenviando a `operacion`):**

| Operación esperada         | Método y ruta (esperada)                      | Request                                            | Response                                                        |
| -------------------------- | --------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `listarBitacora`           | `GET /api/v1/viajes/{id}/bitacora`            | cursor?                                            | `PaginaBitacora { items: EntradaBitacora[], cursor_siguiente }` |
| `registrarEntradaBitacora` | `POST /api/v1/viajes/{id}/bitacora`           | `EntradaBitacoraEntrada { texto }`                 | `201 EntradaBitacora { id, viaje_id, texto, autor, ts }`        |
| `abrirIncidencia`          | `POST /api/v1/viajes/{id}/incidencias`        | `IncidenciaEntrada { tipo_interno, descripcion? }` | `201 Incidencia` / `409 condicion_ya_abierta`                   |
| `resolverIncidencia`       | `PATCH /api/v1/viajes/{id}/incidencias/{iid}` | `ResolucionIncidenciaEntrada { resolucion }`       | `200 Incidencia`                                                |
| `listarEstadias`           | `GET /api/v1/viajes/{id}/estadias`            | cursor?                                            | `PaginaEstadias { items: Estadia[], cursor_siguiente }`         |
| `abrirEstadia`             | `POST /api/v1/viajes/{id}/estadias`           | `EstadiaEntrada { motivo, eje_autorizacion }`      | `201 Estadia`                                                   |
| `cerrarEstadia`            | `PATCH /api/v1/viajes/{id}/estadias/{eid}`    | `CierreEstadiaEntrada {}` (vacío)                  | `200 Estadia` / `409 estadia_ya_cerrada`                        |

Formas de respuesta (verificadas en el `bff.yaml` de la rama):

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

## Brecha 4 — Componentes de `@ai27-tech/ui` (POR VERIFICAR)

**Qué pide la tarea.** Lista cronológica del histórico, formularios de nota/estadía/incidencia, modal de resolución y avisos de rechazo.

**Qué existe hoy.** `@ai27-tech/ui@0.2.0-beta.6` ofrece (según E8-T11) `Form`/`FormField`/`FormRow`, `Input`, `Textarea`, `Select`, `Radio`, `Checkbox`, `Button`, `Modal`, `Toast`, `Badge`, `Table`, `Card`, `Tooltip`, entre otros.

**Qué falta (a verificar en la tarea 1).** Un componente dedicado de **línea de tiempo / histórico** podría no existir; se compone con `Table`/`Card` + lista. No se crea un componente local.

**Impacto en el spec.** Ninguno bloqueante: afordancias faltantes se componen con primitivas.

**Propuesta de resolución.** Si se quisiera un control dedicado de línea de tiempo, es una **solicitud a la librería**, no duplicación local.
