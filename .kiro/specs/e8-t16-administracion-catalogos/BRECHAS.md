# Brechas — E8-T16 (Administración de catálogos)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería. El frontend interno solo consume el `bff` (puerta única), nunca `catalogos` directo.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context@ba1abc3` (árbol limpio, al día con `origin/main`). Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T16. HU `E5-HU-021`, `E5-HU-022`, `E5-HU-023`, `E5-HU-024`. Decisiones DEC-010, DEC-017, DEC-043, DEC-044, DEC-047, DEC-055.
- **Contrato:** fijado por `repos/pf-web-frontend-internal/package.json`: `@ai27-tech/contracts@0.1.0-tracer.20`, `@ai27-tech/ui@0.2.0-beta.6`. El checkout local de `repos/pf-pkg-contracts` está en la rama `pf-contracts-m` (`31e6e2a`), **no** en un tag; el contrato se leyó contra el tag `v0.1.0-tracer.20`, que es también el último publicado. Por tanto el frontend está en la versión más reciente.

---

## Brecha 1 — Administración de catálogos ausente en el `bff` (BLOQUEANTE)

**Qué pide la tarea.** E8-T16 pide administrar (crear/editar/desactivar) los cuatro catálogos: vehículos (`E5-HU-021`), custodios (`E5-HU-022`), catálogos de tipo (`E5-HU-023`) y contratos/SLA (`E5-HU-024`). El frontend interno solo habla con el `bff`.

**Qué existe hoy.**

- En `bff.yaml@v0.1.0-tracer.20`: de catálogos solo **lecturas espejo** — `GET /api/v1/clientes` (`listarClientes` reenvía a `catalogos`), `POST /api/v1/clientes`, y `GET /api/v1/unidades` (lectura del roster de `operacion` para asignación). **No hay** ninguna ruta de administración (crear/editar/desactivar) de los cuatro catálogos.
- En `catalogos.yaml@v0.1.0-tracer.20`: **sí** existe la superficie completa de administración, pero `catalogos` es consumo interno del `bff`, **no** del frontend. OperationIds verificados: `listarVehiculos` (`GET /api/v1/vehiculos`), `crearVehiculo` (`POST /api/v1/vehiculos`), `obtenerVehiculo` (`GET /api/v1/vehiculos/{id}`), `actualizarVehiculo` (`PATCH /api/v1/vehiculos/{id}`), `aptitudVehiculo` (`GET /api/v1/vehiculos/{id}/aptitud`); `listarCustodios`, `crearCustodio`, `obtenerCustodio`, `actualizarCustodio` (`PATCH`), `aptitudCustodio` (`GET /api/v1/custodios/{id}/aptitud`); `listarValoresCatalogo` (`GET /api/v1/catalogos-tipo/{tipo}`), `crearValorCatalogo` (`POST /api/v1/catalogos-tipo/{tipo}`), `actualizarValorCatalogo` (`PATCH /api/v1/catalogos-tipo/{tipo}/{id}`); `crearContrato` (`POST /api/v1/contratos`), `obtenerContrato` (`GET /api/v1/contratos/{id}`), `actualizarContrato` (`PATCH /api/v1/contratos/{id}`); `crearSla` (`POST /api/v1/sla`), `obtenerSla` (`GET /api/v1/sla/{id}`), `actualizarSla` (`PATCH /api/v1/sla/{id}`).

**Qué falta exactamente.** Que el `bff` exponga (reenviando a `catalogos`, con las guardas de rol `administrador` y alcance) la superficie de administración de los cuatro catálogos. El mapeo 1:1 con `catalogos` es el punto de partida:

| Operación esperada en el `bff` | Método y ruta (esperada, bajo la puerta del `bff`) | Nota                                          |
| ------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| `listarVehiculos`              | `GET /api/v1/vehiculos`                            | Mapeo 1:1 con `catalogos`                     |
| `crearVehiculo`                | `POST /api/v1/vehiculos`                           | Mapeo 1:1 con `catalogos`                     |
| `actualizarVehiculo`           | `PATCH /api/v1/vehiculos/{id}`                     | Edición y desactivación (cambio de estado)    |
| `aptitudVehiculo`              | `GET /api/v1/vehiculos/{id}/aptitud`               | Estatus de aptitud (solo lectura)             |
| `listarCustodios`              | `GET /api/v1/custodios`                            | Mapeo 1:1 con `catalogos`                     |
| `crearCustodio`                | `POST /api/v1/custodios`                           | Mapeo 1:1 con `catalogos`                     |
| `actualizarCustodio`           | `PATCH /api/v1/custodios/{id}`                     | Edición y desactivación (cambio de estado)    |
| `aptitudCustodio`              | `GET /api/v1/custodios/{id}/aptitud`               | Estatus de aptitud (solo lectura)             |
| `listarValoresCatalogo`        | `GET /api/v1/catalogos-tipo/{tipo}`                | Valores por tipo de catálogo                  |
| `crearValorCatalogo`           | `POST /api/v1/catalogos-tipo/{tipo}`               | Alta de valor en el catálogo de tipo `{tipo}` |
| `actualizarValorCatalogo`      | `PATCH /api/v1/catalogos-tipo/{tipo}/{id}`         | Edición y desactivación (cambio de estado)    |
| `crearContrato`                | `POST /api/v1/contratos`                           | Alta de contrato                              |
| `obtenerContrato`              | `GET /api/v1/contratos/{id}`                       | Lectura de contrato                           |
| `actualizarContrato`           | `PATCH /api/v1/contratos/{id}`                     | Edición de contrato                           |
| `crearSla`                     | `POST /api/v1/sla`                                 | Alta de SLA                                   |
| `obtenerSla`                   | `GET /api/v1/sla/{id}`                             | Lectura de SLA                                |
| `actualizarSla`                | `PATCH /api/v1/sla/{id}`                           | Edición de SLA                                |

**Sobre la DESACTIVACIÓN:** el servicio `catalogos` **no** tiene endpoint `DELETE`; la desactivación se modela como un **cambio de estado** vía `PATCH .../{id}` (estado `activo` → `inactivo`). Desactivar = `PATCH` de estado, **no** borrado; coherente con "desactivar no elimina ni rompe historia".

**Impacto en el spec.** Bloquea las operaciones reales de los Requirements 3, 4 y 5 (alta, edición y desactivación) en los cuatro catálogos. La pantalla se construye contra el **contrato esperado**, con la brecha aislada en un módulo de contratos del frontend (p. ej. `lib/contracts/catalogos.ts`) y servida con mocks (MSW) mientras el `bff` no publique. Reemplazo mecánico cuando el `bff` exponga la superficie.

**Propuesta de resolución.** Solicitar al dueño de `pf-pkg-contracts` exponer la administración de catálogos en el `bff` (reenvío a `catalogos`), preservando rol `administrador` y alcance. Nunca relleno local ni llamada directa a `catalogos`.

---

## Brecha 2 — Valores reales de los catálogos pendientes de Operación (CONDICIONA)

**Qué pide la tarea.** Los valores reales de todos los catálogos (incluidos tipos de servicio, tipos de unidad/tracto, líneas, GPS, zonas de riesgo).

**Qué existe hoy.** DEC-017: los valores los debe Operación; no están en el contrato ni en las fuentes.

**Qué falta.** Los valores reales (Operación los aporta).

**Impacto en el spec.** Se construye la administración, no se inventan valores; los datos de prueba son ilustrativos, no autoritativos.

**Propuesta de resolución.** Recabar los valores con Operación (DEC-017); no bloquea construir la UI de administración.

---

## Brecha 3 — Contenido funcional del SLA pendiente (CONDICIONA)

**Qué pide la tarea.** Administrar contratos/SLA (`E5-HU-024`).

**Qué existe hoy.** El contenido funcional del SLA (qué métricas/compromisos) está pendiente de definición; en el contrato existe `crearSla`/`actualizarSla`/`obtenerSla` pero el modelo funcional del SLA no está definido en las fuentes.

**Qué falta.** La definición funcional del SLA.

**Impacto en el spec.** El Requirement 9 queda condicionado: la UI representa el SLA conforme a lo que el contrato exponga, sin inventar campos de SLA.

**Propuesta de resolución.** Definir con Product Management el contenido del SLA; en V1 es solo informativo (no condiciona el servicio).

---

## Brecha 4 — Modelado de líneas de transporte y lista de GPS (CONDICIONA)

**Qué pide la tarea.** Catálogos de tipo incluyen líneas de transporte (scope por cliente; solo Coordinadores crean una línea nueva, DEC-047 §D.1) y lista de GPS (inventario de dispositivos).

**Qué existe hoy.** DEC-047 deja pendiente si líneas de transporte y lista de GPS ameritan HU propia o se modelan dentro de catálogos de tipo. En el contrato se exponen vía `catalogos-tipo/{tipo}`.

**Qué falta.** La decisión de modelado final.

**Impacto en el spec.** El Requirement 8 se especifica como catálogos de tipo administrables sin asumir el modelado final; el scope por cliente de líneas y la regla de creación por Coordinador las aplica el backend/BFF, no el frontend.

**Propuesta de resolución.** Resolver el modelado (DEC-047) antes de fijar el detalle; la UI consume la forma que el contrato publique.

---

## Brecha 5 — Componentes de `@ai27-tech/ui` (POR VERIFICAR)

**Qué pide la tarea.** Listas de valores por catálogo, formularios de alta/edición, confirmación de desactivación, estatus de aptitud.

**Qué existe hoy.** `@ai27-tech/ui@0.2.0-beta.6` ofrece `Form`/`FormField`/`FormRow`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Button`, `Modal`, `Toast`, `Badge`, `Table`, `Pagination`, `FilterTable`, `Card`, `Navbar`, `Sidebar`, `Tooltip`.

**Qué falta (a verificar).** No se detecta un control dedicado faltante crítico; listar con `Table`/`FilterTable`/`Pagination`, alta/edición con `Form`/`Input`/`Select`, desactivar con `Modal` + `Toast`, aptitud con `Badge`.

**Impacto en el spec.** Ninguno bloqueante: afordancias faltantes se componen con primitivas.

**Propuesta de resolución.** Si se quisiera un control dedicado, es una **solicitud a la librería**, no duplicación local.
