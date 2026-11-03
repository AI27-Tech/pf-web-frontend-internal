# Brechas — E8-T15 Bandeja de conversaciones

Documento de brechas del spec. Cada brecha indica qué pedía la tarea, cómo se resolvió y qué queda. **No** se rellena nada con una alternativa local.

## Estado (2026-11-03)

**Las brechas de contrato están cerradas o diferidas por decisión.** El backend ya expone la superficie por el `bff`. Queda trabajo del frontend (subir el pin y construir) y cuatro verificaciones menores (ver "Pendientes residuales").

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` en **`f8d5056`** (2026-11-03), igual a `origin/main` tras `pull --ff-only`. Registra DEC-116 a DEC-122, DT-04 y DT-05, y el mensaje del equipo `.scratch/mensajes-equipo-2026-11-03.md`. La respuesta de Plataforma a este spec está en `.scratch/e8-t15-bandeja-conversaciones/RESPUESTA-BRIEF-E8-T15.md`.
- **Contrato:** `repos/pf-pkg-contracts`, rama por defecto `pf-contracts-m` en **`a8fcfb7`**, `VERSION` **`v0.1.0-tracer.33`**, último tag publicado. `tracer.30` y `tracer.31` no existen para TS (DEC-120); `tracer.32` los republica y `tracer.33` agrega `obtenerConversacionDeViaje` (Cliente). `bff.yaml` es idéntico entre `tracer.32` y `tracer.33`. Hay ramas abiertas `tracer-34` (bandeja de Reacción, E8-T18); no afectan a E8-T15.
- **Pin del frontend:** `@ai27-tech/contracts@0.1.0-tracer.24`. **No** contiene la superficie interna de bandeja (entró en `tracer.30`). Hay que subirlo a `tracer.33` y agregar `|| 0.1.0-tracer.33` a `minimumReleaseAgeExclude`. No se hizo sin aprobación explícita.
- **Backend verificado:** `pf-svc-bff` (`pf-bff-m`) monta en `bff.go` `GET /api/v1/bandeja/trabajo`, `GET /api/v1/conversaciones/{id}`, `GET/POST .../mensajes`, `POST .../reclamos`, `DELETE .../reclamos/{rid}`, `POST .../transferencias`, `POST .../atendida` y `POST .../recibos/entregado|leido`. `pf-svc-mensajeria` (`pf-msg-m`) sirve la bandeja sin `{id}`.
- **UI:** `@ai27-tech/ui@0.2.0-beta.6` (`MessagePanel`, `MessageList`, `MessageBubble`, `MessageComposer`, `Table`, `FilterTable`, `Badge`, `Modal`, `Toast`).

## Resolución por brecha

| #   | Brecha                                              | Resolución                                                                                                                                                                 | Fuente                       |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Conversación interna no proyectada al `bff` / rutas | **Cerrada.** Juego de rutas de `mensajeria.yaml`, mismas operaciones, schemas y errores en `bff.yaml`                                                                      | DEC-116, `tracer.30` a `.33` |
| 2   | Cómo se obtiene la bandeja                          | **Cerrada.** `GET /api/v1/bandeja/trabajo` sin `{id}`; el servidor resuelve por membresía. `404` sin pool de chat; error si hay más de una bandeja de chat                 | DEC-103, DEC-116             |
| 3   | Nombres y lista de Ejecutivos para transferir       | **Diferida a V2.** En V1 la transferencia devuelve al pool, sin selector ni nombres. El nombre del Ejecutivo solo vive en el IdP                                           | DEC-119, DT-04               |
| 4   | Datos de la fila                                    | **Cerrada.** Sin vista previa ni no leídos; nombre del cliente con `listarClientes`                                                                                        | DEC-118                      |
| 5   | Stream SSE                                          | **Cerrada para V1.** Polling HTTP (bootstrap y catch-up con `desde_revision`); el SSE queda como deuda detrás de una interfaz                                              | DEC-118, DT-01               |
| 6   | Alerta de mensaje pendiente                         | **Fuera de V1**                                                                                                                                                            | DEC-108                      |
| 7   | Override y mando de Supervisor                      | **Fuera de V1.** Un Supervisor no libera ni transfiere ajeno                                                                                                               | DEC-107, DEC-118             |
| 8   | `marcarAtendida` y recibos                          | **Cerrada.** `marcarAtendida` explícita; un mensaje del cliente la desmarca; sin reclamo activo es `409`; los recibos no se auditan y el cliente no ve el "leído por AI27" | DEC-117, DEC-122, DT-05      |
| 9   | Contradicciones del repo de contexto                | **Parcial.** `bff.md` se corrigió (rutas). Siguen: historia técnica E8-T15 (ver abajo) y DEC-097/098 vs DEC-103                                                            | DEC-116                      |
| 10  | Componentes de `@ai27-tech/ui`                      | **Sin brecha.** Hay `Message*`, `Table`, `FilterTable`, `Badge`, `Modal`, `Toast`; el banner se compone con `Card` y `Badge`                                               | —                            |

## Pendientes residuales

1. **`transferirConversacion` sigue exigiendo destino.** En `bff.yaml` (`tracer.33`) y en el handler de `mensajeria`, `TransferenciaEntrada` requiere `responsable_destino_id` ("miembro del pool"), y la respuesta se describe como "reclamo nuevo del responsable destino". DEC-119 dice que en V1 la transferencia devuelve al pool y que "el Ejecutivo libera y otro la toma", sin aclarar si existe una operación de transferir sin destino. El spec asume que el gesto de la UI es solo `liberarReclamo` (Requirement 7) y no invoca `transferirConversacion`. **Confirmar con el dueño del `bff`.**
2. **PR #41 de `mensajeria` por mergearse** (rama `fix/reclamo-version-y-responsable`, `0007_reclamo_version_por_conversacion.sql`): hace monótona la `version_reclamo` y exige al responsable para liberar, transferir y marcar atendida (`403`). Sin él, reclamar desde el pool puede exigir un `0` y el `403` puede no darse. Reverificar al mergearse.
3. **`listarClientes` para `ejecutivo`.** DEC-118 lo asume. El adaptador de core que lo sirve no muestra guarda de rol, pero el contrato lo describe con las guardas del `jefe_operativo` (E8-T11). Solo devuelve clientes activos; la conversación de un cliente inactivo no resolvería el nombre.
4. **Historia técnica E8-T15 en el repo de contexto sigue desactualizada:** título con "override", contrato `GET /api/v1/bandejas/{id}/trabajo`, transporte SSE y "Cubre" con alerta y override. Lo mismo para E3-HU-016 y las historias E3-T2/T3. Las DEC prevalecen; falta corregir las fuentes. DEC-097 #1/#3 y DEC-098 frente a DEC-103 siguen sin enmienda explícita.
5. **Productos pendientes:** textos aprobados (conflicto de reclamo, reclamo perdido, solo lectura, autorización insuficiente) y cadencia del polling (configuración del cliente).
6. **La respuesta de Plataforma menciona "mensajeria #31 pendiente de promover a `-m`"**; verificado: la bandeja sin `{id}` ya está en `pf-msg-m` y `pf-msg-d`. El pendiente real es el PR #41.
