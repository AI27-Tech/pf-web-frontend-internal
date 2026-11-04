# Brechas de E8-T18 — Emergencia: activación por usuario de monitoreo y bandeja de Reacción

**Verificado el 2026-11-04.** Contexto: `ai27-platform-context` en `ad3290c` (al día con `origin/main`). Contrato: último tag publicado `v0.1.0-tracer.35`; `package.json` del frontend fija `@ai27-tech/contracts@0.1.0-tracer.33`; el checkout local de `pf-pkg-contracts` está en la rama `feat/ficha-tecnica-e-historico-tracer21`, no en un tag, así que se leyó el contrato con `git show v0.1.0-tracer.35:contracts/openapi/bff.yaml`. Librería: `@ai27-tech/ui@0.2.0-beta.6`.

**Superficie contratada en `tracer.35` (BFF, audiencia Interno):** `listarBandejaEmergencias`, `obtenerEmergencia`, `listarNotasEmergenciaPorId`, `reclamarEmergenciaPorId`, `liberarReclamoEmergenciaPorId`, `transferirEmergenciaPorId`, `resolverEmergenciaPorId`, `cerrarEmergenciaPorId`. Con `tracer.33` (el pin actual) solo existen las tres operaciones de cliente (`listarEmergenciasCliente`, `activarEmergenciaCliente`, `agregarNotaEmergenciaCliente`).

## Resumen

| #   | Brecha                                            | Tipo             | Bloquea                                             |
| --- | ------------------------------------------------- | ---------------- | --------------------------------------------------- |
| 1   | Activar emergencia como usuario de monitoreo      | Contrato         | Requirement 1, escenarios 1, 2, 8 y 9               |
| 2   | Agregar nota como usuario interno                 | Contrato         | Requirement 2, escenarios 7 y 18                    |
| 3   | Listar los casos de un viaje (audiencia interna)  | Contrato         | Requirement 2.3, Requirement 8.5, escenarios 7 y 18 |
| 4   | Listar integrantes de Reacción para transferir    | Contrato         | Requirement 6.4                                     |
| 5   | Indicador de viaje terminal para decidir el botón | Contrato (menor) | Requirement 1.1 y 1.2                               |
| 6   | Código `404` vs `403` en la bandeja               | Discrepancia     | Ninguno (se trata igual)                            |
| 7   | Pin del contrato en `tracer.33`                   | Prerrequisito    | Todo el spec                                        |
| 8   | Componentes de librería por confirmar             | UI               | Diseño de vistas                                    |

## Brecha 1 — Activación por usuario de monitoreo

- **Qué pide la tarea:** E8-T18 y `E7-HU-029` (Escenario 1): un Monitorista, Supervisor o Coordinador presiona el botón y se crea de inmediato un caso con origen `operacion`, idempotente por reentrega.
- **Qué existe:** `POST /api/v1/viajes/{id}/emergencias` (`activarEmergenciaCliente`, entrada `{activacion_id}`), pensada para el portal de cliente. `mensajeria.yaml` tiene `activarEmergencia` y `OrigenActivacion` ya incluye `operacion`, pero el BFF no expone la ruta interna.
- **Qué falta:** una operación del BFF para audiencia Interno que reenvíe a `mensajeria.activarEmergencia` con origen `operacion`, con guarda de rol (`monitorista`/`supervisor`/`coordinador`) y de alcance por unidad, `activacion_id` idempotente, respuestas `201` (nuevo) y `200` (reentrega), y `409 viaje_en_estado_terminal`.
- **Impacto:** el Requirement 1 queda condicionado; no se construye el botón con wire. No se reutiliza `activarEmergenciaCliente` (otra audiencia y otro origen).
- **Propuesta:** solicitud al repo de contratos y al dueño de `bff` (E7-T1 declara el endpoint como pendiente técnico).

## Brecha 2 — Notas del usuario interno

- **Qué pide la tarea:** `E7-HU-029`: notas opcionales de 1 a 1.000 caracteres en `abierta`, `en_atencion` y `resuelta`; `cerrada` no admite.
- **Qué existe:** `POST /api/v1/viajes/{id}/emergencias/{eid}/notas` (`agregarNotaEmergenciaCliente`, `{cuerpo}`). Por id solo existe lectura (`listarNotasEmergenciaPorId`); `DEC-121 #4` fija que Reacción no escribe.
- **Qué falta:** operación de BFF para audiencia Interno (monitoreo) que reenvíe a `mensajeria.agregarNotaEmergencia`, con `409 emergencia_cerrada`.
- **Impacto:** Requirement 2 condicionado.
- **Propuesta:** solicitud de contrato junto con la brecha 1.

## Brecha 3 — Casos de un viaje (audiencia interna)

- **Qué pide la tarea:** selector mínimo por fecha y hora cuando hay varios casos abiertos; el usuario de monitoreo necesita el `eid` para anotar y cerrar.
- **Qué existe:** `listarEmergenciasCliente` (vista mínima de cliente, sin `eid` utilizable por el panel). `obtenerEmergencia` y la bandeja son de `reaccion`/`supervisor`/`coordinador` y no cubren al `monitorista` ni al `administrador`; `cerrarEmergenciaPorId` sí admite Monitorista y Administrador pero necesita el `eid`.
- **Qué falta:** una lectura de BFF para audiencia Interno con los casos del viaje (id, estado, `activada_en`) filtrada por alcance de monitoreo, sin notas ni personal en la fila del selector.
- **Impacto:** sin ella, el cierre y las notas desde el viaje no tienen de dónde tomar el `eid`. Requirements 2.3 y 8.5 condicionados. El cierre desde la bandeja (Supervisor/Coordinador) sí es viable.
- **Propuesta:** solicitud de contrato. Pregunta abierta para el dueño del `bff`: ¿cómo cierra un `monitorista` o `administrador` si no ve la bandeja (DEC-131 le da bandeja solo a supervisor y coordinador)?

## Brecha 4 — Destino de la transferencia

- **Qué pide la tarea:** `E7-HU-030` y DEC-126: el responsable, un Supervisor o un Coordinador transfieren el caso a otro miembro de Reacción.
- **Qué existe:** `transferirEmergenciaPorId` con `responsable_destino_id` obligatorio ("miembro de Reacción", DEC-130). No existe lectura de miembros de Reacción. T15 resolvió algo similar diferiendo la transferencia dirigida a V2 (DEC-119, DT-04), pero para emergencias DEC-126 la mantiene en V1.
- **Qué falta:** una lectura de BFF con los integrantes de Reacción (id y nombre mostrable).
- **Impacto:** Requirement 6.4 condicionado; "Devolver al pool" (`liberarReclamoEmergenciaPorId`) funciona sin la brecha y cubre el mínimo.
- **Propuesta:** solicitud de contrato o decisión de Producto de diferir como en DEC-119.

## Brecha 5 — Viaje terminal

- **Qué pide la tarea:** botón ausente en los cuatro estados terminales.
- **Qué existe:** `ViajeInterno.estado` como token canónico (ADR 19) y el enum generado de estados de viaje.
- **Qué falta:** confirmar en el paquete instalado (tarea 1) que el enum permite derivar los estados terminales sin duplicarlos a mano. Si no, es solicitud de contrato.
- **Impacto:** Requirement 1.1 y 1.2; el `409 viaje_en_estado_terminal` del `bff` es la autoridad final.

## Discrepancia 6 — `404` vs `403`

`listarBandejaEmergencias` dice que "otro rol responde `404`"; DEC-132 fija `403` para audiencia Interno. La interfaz clasifica ambos como acceso no autorizado. Confirmar con el dueño del `bff`.

## Prerrequisito 7 — Pin del contrato

El pin `tracer.33` no trae la bandeja. Subir a `tracer.35` y agregar `|| 0.1.0-tracer.35` a la entrada de `@ai27-tech/contracts` en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`. `tracer.35` también hace obligatorio `nombre` en `crearIntencionSubidaAdjunto` (ruptura declarada en `rompimientos/v0.1.0-tracer.35.yaml`): verificar que ningún código del frontend la use antes de subir. **Requiere aprobación explícita.**

## Brecha de UI 8 — Componentes

Verificar en `@ai27-tech/ui@0.2.0-beta.6` la API exacta de `Modal` (confirmación), `Textarea`, `Badge`, `Toast`, `FilterTable`/`Table`, `Select` y `Button`. No se detectó en el índice un componente de estado vacío, de banner ni de skeleton: si faltan, se componen con primitivas (`Card`, texto) como en `BannerEstado.tsx` de T15 y se registra la solicitud a la librería, sin copiar componentes localmente.

## Pendientes que quedan como pregunta abierta

1. Producto: textos aprobados de conflicto de reclamo, resolución, cierre y acceso no autorizado; cadencia del polling.
2. Dueño de `bff`: brechas 1, 2, 3 y 4; discrepancia 6; cierre por `monitorista`/`administrador`.
3. Arquitectura: actualizar la historia técnica E8-T18 ("contrato por congelar", SSE) con DEC-121 y `tracer.35`.
4. Producto: dónde se ve el botón para `administrador`, que puede cerrar casos pero no figura entre quienes activan (DEC-045 #9).
