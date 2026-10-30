# Brechas — E8-T15 Bandeja de conversaciones

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado

**Abierto en las brechas 1 a 4; parcial en la 5; cerradas para V1 la 6 y la 7.** Las decisiones DEC-107 y DEC-108 sacan de V1 el override y la alerta. La brecha 1 (proyección al `bff`) sigue sin decisión ni tag. El spec condiciona el comportamiento bloqueado y no inventa la superficie.

## Fuentes y versiones verificadas (revisión repetida)

- **Contexto:** `repos/ai27-platform-context`, `git fetch --all` y `pull --ff-only` hechos; commit **`883732e`** (2026-10-30), igual a `origin/main`. Una primera pasada se hizo sobre `3ca0d3b`, que estaba 2 commits atrás (solo regeneraciones de `HARNESS.md` y `ESTADO-REPOS-VS-PLAN.md`). Historia técnica: `docs/historias-tecnicas/E8-panel-admin.md` §E8-T15 y `E3-comunicacion-mensajeria.md` §E3-T2 a E3-T6. HU `E3-HU-015`, `E3-HU-016`. Decisiones leídas: DEC-014, DEC-015, DEC-021, DEC-029, DEC-030, DEC-041, DEC-045, DEC-046, DEC-097, DEC-098, **DEC-103**, **DEC-107**, **DEC-108**; ADR 28, 32 y 36.
- **Contrato:** `repos/pf-pkg-contracts`, `git fetch --all --tags`. El repo no tiene `main`; la rama por defecto es `pf-contracts-m` (`15ab635`, `VERSION` `tracer.25`). **Último tag publicado: `v0.1.0-tracer.25`.** `tracer.26` está abierto en la rama `fix/conversacion-cliente-paginacion-secuencia` (conversación del Cliente) y no está publicado. Una primera pasada se hizo sobre `tracer.24` y la rama `feat/conversacion-cliente-e9-t8`.
- **Pin del frontend:** `@ai27-tech/contracts@0.1.0-tracer.22`, **tres tracers atrás** del último publicado. No se sube sin que se pida. Entre `tracer.22` y `tracer.25`, `bff.yaml` solo añade `/api/v1/viajes/{id}/conversacion`, `/conversacion/mensajes` (audiencia **Cliente**) y `/viajes/{id}/transiciones-cliente`; `mensajeria.yaml` no cambia salvo la versión. La conclusión sobre la brecha 1 no cambia.
- **Checkout local de `pf-pkg-contracts`:** rama `feat/ficha-tecnica-e-historico-tracer21`, en el commit de `tracer.24`, no en el tag que fija el frontend. La superficie se leyó de los tags `tracer.22` y `tracer.25`.
- **UI:** `@ai27-tech/ui@0.2.0-beta.6`.

## Contradicciones de fuentes (a corregir en el repo de contexto)

1. **E8-T15 vs DEC-107 y DEC-108.** La historia técnica de E8-T15 (título, "Cubre") todavía lista el override de supervisor auditado y la alerta de mensaje pendiente. DEC-107 cierra el override en V1 y DEC-108 saca la alerta de V1. E3-T3 también describe el override, y E3-T2 la alerta. Este spec sigue a las DEC.
2. **DEC-103 vs DEC-097 / DEC-098 / E3-T4.** DEC-103 y ADR 36 fijan un pool único e implícito y un vínculo por auto-asignación. DEC-097 #1 dice que la membresía se administra a mano y #3 que la bandeja se asocia al usuario-cliente; DEC-098 y E3-HU-034 administran la membresía; E3-T4 describe `bandeja` "único por nombre y alcance" y `pool_membresia` por usuario. DEC-103 solo declara complementar a DEC-045/046; no enmienda explícitamente a DEC-097/098.
3. **Rutas del `bff`.** `bff.md` usa `/claim`, `/release`, `/transfer`; la historia técnica y `mensajeria.yaml` usan `/reclamos` y `/transferencias`.

---

## Brecha 1 — Superficie de conversación interna en el `bff`

**Qué pide la tarea.** La historia técnica declara como contrato `GET /api/v1/bandejas/{id}/trabajo`, `POST /api/v1/conversaciones/{id}/mensajes`, `POST /reclamos`, `DELETE /reclamos/{rid}` y `POST /transferencias`. El frontend interno habla **solo** con el `bff`.

**Qué existe hoy.** Las cinco operaciones existen en `contracts/openapi/mensajeria.yaml` (tag `v0.1.0-tracer.22`): `listarTrabajoBandeja`, `listarConversaciones`, `obtenerConversacion`, `listarMensajes`, `enviarMensaje`, `reclamarConversacion`, `liberarReclamo`, `transferirConversacion`, `registrarReciboEntregado`, `registrarReciboLeido`, `marcarAtendida`. El contrato de `mensajeria` se declara "consumido por `bff`". En `contracts/openapi/bff.yaml` (`tracer.22` y `tracer.24`) **no existe ninguna** ruta de `bandejas`, `conversaciones`, `reclamos` ni `transferencias`. El paquete instalado trae `mensajeria.gen.ts`, pero el `bff` es la única superficie HTTP del frontend (cabecera de `bff.yaml`).

**Contradicción de fuentes (rutas).** `docs/arquitectura/services/bff.md` lista para el `bff` rutas distintas: `GET /api/v1/bandejas`, `GET /api/v1/bandejas/{id}/conversaciones` y `POST /api/v1/conversaciones/{id}/claim|release|transfer`. La historia técnica y `mensajeria.yaml` usan `/trabajo`, `/reclamos` y `/transferencias`. No se elige una en silencio.

**Qué falta.** La proyección al `bff` de las operaciones listadas, con la forma de ruta definitiva, o la decisión explícita de que el frontend consuma `mensajeria` por otra vía.

**Impacto en el spec.** Condiciona los Requirements 1 a 8. Mientras no exista, la capa `lib/api/conversaciones.ts` se escribe contra los tipos de `mensajeria.gen.ts` (nombres de operación y schemas), con el prefijo de ruta como un único punto de cambio, y las pruebas corren sobre mocks MSW. No se publica a producción un consumo que el `bff` no sirve.

**Propuesta.** Solicitud al repo de contratos: ola aditiva que proyecte al `bff` las once operaciones, con la misma forma de errores (`conflicto_version_reclamo`, `conversacion_solo_lectura`, `stream_resync_required`). Precedente: DEC-105 para el histórico (E8-T13). Pedir a Arquitectura que reconcilie `bff.md` con `mensajeria.yaml`.

---

## Brecha 2 — Cómo se descubre la bandeja del usuario

**Qué pide la tarea.** Un ejecutivo ve la bandeja compartida de los clientes de su alcance, con membresía efectiva.

**Qué existe hoy.** `listarTrabajoBandeja` exige el `{id}` de la bandeja. `listarConversaciones` lista por alcance sin `{id}` y cada `Conversacion` trae `bandeja_id` (nullable, solo Interno). No hay operación que liste las bandejas o membresías del sujeto. `bff.md` menciona `GET /api/v1/bandejas`, que no está en ningún OpenAPI.

**Qué falta.** Una operación para obtener las bandejas con membresía efectiva del llamante, o la regla de que se derive de `listarConversaciones`.

**Impacto.** Condiciona el Requirement 1 (qué `{id}` se consulta para el bootstrap) y el Requirement 11 (el stream no admite selector). Hasta resolverlo, la vista no fija cómo se obtiene el `{id}`.

**Propuesta.** Preguntar a Arquitectura/Mensajería si la bandeja del ejecutivo es única por sesión (DEC-097: bandeja al alta de la cuenta del cliente) o es una lista. Solicitar la operación si es lista.

**Actualización de verificación.** DEC-103 / ADR 36 fijan una **cola única e implícita**: todos los Ejecutivos pertenecen a ella y el vínculo con el cliente nace al tomar la primera conversación. Eso hace probable una sola bandeja, pero no resuelve cómo obtiene el frontend su `{id}`, y choca con DEC-097 #3 (bandeja por usuario de cliente). Sigue abierta la parte contractual y la contradicción (ver arriba).
---

## Brecha 3 — Nombres de personas y directorio de destino de transferencia

**Qué pide la tarea.** La transferencia mueve el reclamo a otro miembro del pool, y el portal interno **muestra nombres reales** entre internos (historia técnica, Fuera de alcance V1; DEC-021 #4).

**Qué existe hoy.** `Reclamo.responsable_id`, `Mensaje.actor_real` y `TransferenciaEntrada.responsable_destino_id` son UUID. No hay nombre ni etiqueta. No hay operación que liste los miembros del pool (la administración de membresía es E3-HU-034 y no publica lectura para esta vista). `identidad.yaml` expone `/api/v1/sujetos`, pero no es superficie del `bff`.

**Qué falta.** Una lectura de miembros del pool con nombre mostrable, y un alias o nombre para `responsable_id` y `actor_real`.

**Impacto.** Condiciona el Requirement 7 (el selector de destino no se puede poblar) y la visualización de autor y responsable en los Requirements 2 y 3. Hasta que exista, la UI no muestra UUID crudo como si fuera un nombre; ver la decisión de presentación en `design.md`.

**Propuesta.** Solicitud al repo de contratos: lectura de miembros efectivos de la bandeja proyectada al `bff` con `{ sujeto_id, nombre }`, y nombre mostrable en `Reclamo` y `Mensaje` para audiencia Interno.

**Actualización de verificación.** Con el pool único (DEC-103), el destino de una transferencia es **otro Ejecutivo** y no un subconjunto administrado. Sigue faltando la lectura de Ejecutivos con nombre y la definición de "disponible" que menciona ADR 36 para la re-asignación. No hay DEC que la cierre.
---

## Brecha 4 — Datos de la fila de la bandeja

**Qué pide la tarea.** Una bandeja operable: saber qué conversación atender.

**Qué existe hoy.** `Conversacion` trae `id`, `viaje_id`, `cliente_id`, `bandeja_id`, `estado`, `escritura_hasta`, `ultima_secuencia`, `version_reclamo`, `reclamo_activo`, `atendida_en`, `abierta_en`.

**Qué falta.** Nombre del cliente (hay `cliente_id`; `listarClientes` ya se proyecta al `bff`, DEC-101), vista previa del último mensaje, indicador de mensajes sin leer y una marca explícita de "pendiente de respuesta". `atendida_en` indica atención, pero el contrato no declara que `atendida_en` nulo equivalga a "pendiente de respuesta".

**Impacto.** El spec muestra solo los campos del contrato. El nombre del cliente se resuelve con `listarClientes` si el rol lo puede leer (verificar alcance del `ejecutivo`). No se muestran vista previa ni conteo de no leídos.

**Propuesta.** Preguntar a Producto si la bandeja V1 requiere vista previa y conteo; si sí, solicitud de campos al `bff`.

---

## Brecha 5 — Frames y control del stream SSE

**Qué pide la tarea.** Transporte SSE según `E0-T9` y ADR 28: bootstrap por HTTP, apertura, catch-up con buffer de deltas vivos, aplicación por secuencia de dominio con deduplicación por `evento_id`, `409 stream_resync_required` y `stream.stale`.

**Qué existe hoy.** `realtime.yaml` (tag `tracer.22`) declara solo `GET /api/v1/stream`. Su cabecera deja **fuera** del contrato la codificación del `id` SSE / `Last-Event-ID`, los eventos de control de línea (anuncio de `heartbeat_interval`, `liveness_timeout`, replay y `stream.stale`) y el esquema de los frames. El stream **no pasa por el `bff`**: el cliente lo abre directo contra el proxy de la DMZ (`api.<dominio>`, ADR 32 §2). `contracts/events/INVENTARIO.md` declara `conversacion.*` y `mensaje.creado` con destino `realtime`.

**Qué falta.** Los tipos generados de los frames y de los eventos de control; la base URL del stream para el navegador; y cómo se autentica la apertura (el `EventSource` nativo no envía cabecera `Authorization`).

**Impacto.** Condiciona el Requirement 11. La rebanada HTTP (bootstrap, catch-up, recuperación) **no** depende de esta brecha y se construye completa. La parte viva queda condicionada: hasta que el contrato publique los frames, la bandeja se actualiza por recuperación HTTP periódica y no se presenta como fresca por tiempo real.

**Propuesta.** Solicitud al repo de contratos: tipos de frame y control. Preguntar a Arquitectura el mecanismo de autenticación del stream en navegador y la base URL por entorno.

**Actualización de verificación (parcial).**

- **Base URL: resuelta.** ADR 32 §2: `bff` y `realtime` (`/api/v1/stream`) comparten el host `api.<dominio>` detrás del mismo proxy. Mismo origen que el `bff`; no hay CORS adicional.
- **Autenticación: derivable del contrato.** `realtime.yaml` declara `bearer` en `security`. El `EventSource` nativo no envía cabeceras, así que el frontend usa `fetch` en streaming con bearer. Solo se confirma con Arquitectura si pretenden otro mecanismo.
- **Tipos del sobre: existen.** `contracts/events/.../sobre.proto` (`Sobre.evento_id`, `tipo`, `agregado_id`), `sobre_vivo.proto` (`SobreVivo.cursor_dominio`, `audience_version`, `target_sujeto_ids`) y `conversacion.proto` (`ConversacionReclamada`, `ConversacionLiberada`, `ConversacionTransferida`, `ConversacionAtendida`, `MensajeCreado`, `ReciboLeido`, `MembresiaCambiada`, entre otros) están generados en TS. La afirmación anterior de que faltaba el sobre de dominio era incorrecta.
- **Sigue abierto:** la codificación del `id` SSE / `Last-Event-ID`, los eventos de control de línea (`stream.stale`, anuncio de liveness y replay; no hay tipo generado) y cómo se serializa el sobre en el `data:` del frame.

---

## Brecha 6 — Alerta de mensaje pendiente para Supervisor (CERRADA para V1: DEC-108)

**Qué pedía la tarea.** E3-HU-016 (Escenarios 4 y 5): alerta inmediata a Supervisor por mensaje del cliente sin respuesta.

**Resolución.** **DEC-108** (2026-10-28, FUERA DE ALCANCE): la condición "mensaje pendiente de respuesta" no se implementa en V1. Verificado por el Lead contra el contrato `tracer.21`: no existe superficie, ni en `mensajeria.yaml` ni en `registro.tipos.yaml`. Reabrirla exige una sesión de diseño con cuatro preguntas (forma de la condición, entrega de la alerta, qué ve el Supervisor, si "se detiene" equivale a `conversacion.atendida`) y una ola de contrato.

**Impacto en el spec.** El Requirement 9 pasa a exclusión explícita. La interfaz no muestra ni infiere la alerta. Queda pendiente corregir la historia técnica de E8-T15 y E3-HU-016 en el repo de contexto.
---

## Brecha 7 — Override y alcance de supervisión (CERRADA para V1: DEC-107)

**Qué pedía la tarea.** Override de supervisor auditado y lectura/intervención de Supervisor y Coordinador.

**Resolución.** **DEC-107** (2026-10-28): el override del envío queda **cerrado en V1**. `mensajeria.Enviar` rechaza cualquier envío con `motivo_override` con `400` (`motivo_override no está disponible en V1`). La causa: el alcance jerárquico no viaja en el token (DEC-053 §3) y `mensajeria` no tiene la proyección de mando. Reabrirlo exige construir esa proyección primero.

**Impacto en el spec.** El Requirement 8 pasa a exclusión explícita: no hay gesto de override y ningún envío incluye `motivo_override`. **Pregunta residual (menor):** DEC-107 solo cierra el override del _envío_; no dice si en V1 un Supervisor puede liberar o transferir una conversación ajena (E3-T3 lo describe, y `liberarReclamo` dice "supervisor dentro de su alcance"). El frontend no ofrece el gesto y deja que decida el `bff`; si Producto lo quiere en V1, necesita la misma proyección de alcance.
---

## Brecha 8 — Componentes de `@ai27-tech/ui`

**Qué pide la tarea.** Lista de bandeja, panel de conversación con burbujas y compositor, avisos de conflicto y de solo lectura, diálogos de transferencia y de override.

**Qué existe hoy (`@ai27-tech/ui@0.2.0-beta.6`).** `MessagePanel`, `MessageList`, `MessageBubble`, `MessageDayDivider`, `MessageComposer` (props `value`, `onChange`, `onSend`, `disabled`, `placeholder`, `sendButton`), `MessageDock`, `Table`, `FilterTable`, `Pagination`, `Badge`, `Modal`, `Toast`/`ToastContainer`, `Button`, `Select`, `Textarea`, `FormField`, `Card`, `Tooltip`.

**Qué falta.** Posiblemente un banner de estado persistente (conexión/solo lectura/reclamo perdido). Se compone con `Card`/`Badge`. No hay lista de bandeja dedicada: se compone con `FilterTable`/`Table`.

**Impacto.** Ninguno bloqueante. Verificar la API exacta de `MessageBubble`, `MessageList` y `Modal` al implementar.

**Propuesta.** Sin duplicación local. Si falta una afordancia, solicitud a la librería.
---

## Brecha 9 — Recibos y `marcarAtendida` (MAYORMENTE RESUELTA: E3-T6)

E3-T6 fija que los recibos `entregado`/`leido` son llamadas del cliente que avanzan cursores por usuario; que el "leído por AI27" visible al cliente cambia **solo** cuando lo avanza el responsable activo (una vista incidental de un no responsable no lo mueve); y que `atendida` lo invoca solo el responsable. **Residual:** si enviar una respuesta implica `atendida` o si es una acción explícita aparte. Se confirma con Mensajería antes de implementar el Requirement 4.8.
