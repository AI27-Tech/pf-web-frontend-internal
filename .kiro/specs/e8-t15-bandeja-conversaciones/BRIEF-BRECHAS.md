# Brief para cerrar las brechas de E8-T15 (Bandeja de conversaciones)

**Origen:** `BRECHAS.md` de este spec. **Destinatarios:** Arquitectura / dueño de contratos (`pf-pkg-contracts`), Mensajería (`mensajeria`, `realtime`) y Producto (Product Management).
**Estado:** borrador para revisión. Todo lo marcado _Propuesta_ es una propuesta del frontend, **no** una regla de producto ni una decisión; no se registra como DEC hasta que su dueño la confirme.

## Verificado al redactar (segunda revisión)

- Contexto: `ai27-platform-context` en **`883732e`** (2026-10-30), igual a `origin/main`.
- Contrato: último tag publicado **`v0.1.0-tracer.25`**; el repo no tiene `main` y su rama por defecto es `pf-contracts-m`. `tracer.26` está abierto y no publicado. El frontend fija `tracer.22`. Entre `tracer.22` y `tracer.25` el `bff` solo añade conversación del lado **Cliente** y `transiciones-cliente`; `mensajeria.yaml` no cambió.
- **Corrección a la primera versión de este brief:** se redactó sobre el commit `3ca0d3b` y `tracer.24`, sin haber leído DEC-103, DEC-107, DEC-108 ni ADR 32 y 36. Dos de las brechas ya estaban decididas y otra estaba parcialmente resuelta; este texto las reclasifica.

## Resumen para decidir rápido

| #   | Qué se pide                                                    | Estado tras revisar el contexto                                                                               | Dueño                     | ¿Bloquea?               |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------- |
| 1   | Proyectar al `bff` la conversación interna y reconciliar rutas | **Abierta.** Ninguna DEC ni tag la cubre                                                                      | Contratos + Arquitectura  | **Sí**                  |
| 2   | Cómo obtiene el ejecutivo el `{id}` de su bandeja              | **Parcial.** DEC-103: cola única e implícita; falta la parte contractual y reconciliar con DEC-097 #3         | Mensajería + Arquitectura | **Sí**                  |
| 3   | Nombres y lista de Ejecutivos para transferir                  | **Abierta.** DEC-103 define el destino (otro Ejecutivo) pero no hay lectura                                   | Contratos + Mensajería    | **Sí**, para transferir |
| 4   | Campos de la fila (vista previa, no leídos)                    | **Abierta**                                                                                                   | Producto                  | No                      |
| 5   | Stream: frames y control                                       | **Parcial.** Host y bearer resueltos; tipos del sobre existen; faltan `id` SSE, `stream.stale`, serialización | Mensajería (`realtime`)   | No (HTTP funciona)      |
| 6   | Alerta de mensaje pendiente                                    | **Cerrada para V1: DEC-108**                                                                                  | —                         | No                      |
| 7   | Override de supervisor                                         | **Cerrada para V1: DEC-107**                                                                                  | —                         | No                      |
| 8   | Recibos y `marcarAtendida`                                     | **Mayormente resuelta: E3-T6.** Residual: si responder implica atendida                                       | Mensajería                | No                      |
| 9   | Corregir contradicciones en el repo de contexto                | **Nueva** (ver abajo)                                                                                         | Arquitectura / Producto   | No                      |

Orden sugerido: **1 → 2 → 3** desbloquean la bandeja, el reclamo y la transferencia. **5** habilita el tiempo real. **4, 8, 9** se resuelven en paralelo.

## 9. Contradicciones a corregir en el repo de contexto (nuevas)

1. **Historia técnica E8-T15 (y E3-HU-016, E3-T2, E3-T3) vs DEC-107/DEC-108.** E8-T15 todavía incluye "override" en el título y lista override y alerta en "Cubre". Proponer: actualizar esas historias para marcar ambos como fuera de V1.
2. **DEC-103 / ADR 36 vs DEC-097 #1 y #3, DEC-098, E3-HU-034 y E3-T4.** DEC-103 fija un pool único con vínculo por auto-asignación, pero solo declara complementar a DEC-045/046. DEC-097 dice membresía "administrada a mano" y bandeja por usuario de cliente; E3-T4 describe `bandeja` única por nombre y alcance y `pool_membresia` por usuario. Proponer: una enmienda explícita que diga qué partes de DEC-097/098 y E3-HU-034 siguen vigentes. Pregunta concreta: ¿existe todavía la administración de membresía de E3-HU-034 en V1, o la reemplaza la auto-asignación?
3. **Rutas del `bff`.** Ver §1.

---

## 1. Proyectar la conversación interna al `bff` y reconciliar rutas

**Contexto.** El `bff` es la única superficie HTTP del frontend. Las operaciones de conversación interna existen en `mensajeria.yaml` (declarado "consumido por `bff`") pero no en `bff.yaml`. Además hay dos juegos de rutas:

| Fuente                                      | Rutas                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Historia técnica E8-T15 y `mensajeria.yaml` | `GET /bandejas/{id}/trabajo`, `POST /conversaciones/{id}/reclamos`, `DELETE /conversaciones/{id}/reclamos/{rid}`, `POST /conversaciones/{id}/transferencias` |
| `docs/arquitectura/services/bff.md`         | `GET /bandejas`, `GET /bandejas/{id}/conversaciones`, `POST /conversaciones/{id}/claim\|release\|transfer`                                                   |

**Se pide.**

1. **Decisión de Arquitectura:** qué juego de rutas es el definitivo. _Propuesta:_ el de `mensajeria.yaml`, porque es el contrato publicado, ya tiene schemas y errores, y es el que cita la historia técnica; corregir `bff.md`.
2. **Ola contractual aditiva** que proyecte al `bff` estas operaciones, con los mismos `operationId`, schemas y códigos de error que en `mensajeria.yaml` (precedente: DEC-105 para el histórico, E8-T13, `tracer.21`):

| operationId                                         | Método y ruta (según la decisión anterior)          | Uso en la bandeja                                |
| --------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `listarTrabajoBandeja`                              | `GET /api/v1/bandejas/{id}/trabajo`                 | Bootstrap y catch-up (`desde_revision`)          |
| `obtenerConversacion`                               | `GET /api/v1/conversaciones/{id}`                   | Detalle                                          |
| `listarMensajes`                                    | `GET /api/v1/conversaciones/{id}/mensajes`          | Historial (`antes_de`, `despues_de`)             |
| `enviarMensaje`                                     | `POST /api/v1/conversaciones/{id}/mensajes`         | Respuesta (sin `motivo_override` en V1, DEC-107) |
| `reclamarConversacion`                              | `POST /api/v1/conversaciones/{id}/reclamos`         | Reclamar                                         |
| `liberarReclamo`                                    | `DELETE /api/v1/conversaciones/{id}/reclamos/{rid}` | Liberar                                          |
| `transferirConversacion`                            | `POST /api/v1/conversaciones/{id}/transferencias`   | Transferir                                       |
| `marcarAtendida`                                    | `POST /api/v1/conversaciones/{id}/atendida`         | Atendida (ver §8)                                |
| `registrarReciboEntregado` / `registrarReciboLeido` | `POST .../recibos/entregado\|leido`                 | Recibos (ver §8)                                 |

3. Conservar los códigos de máquina `conflicto_version_reclamo`, `conversacion_solo_lectura` y `stream_resync_required`, y la regla de que `404` no distingue inexistente de sin acceso.
4. Dejar la autorización (rol, alcance por cliente, **membresía efectiva**) en el `bff`/`mensajeria`, no en el cliente.

**Criterio de cierre.** Un tag `v0.1.0-tracer.N` cuyo `bff.yaml` contiene las operaciones anteriores y cuyo paquete TS genera sus tipos; `bff.md` y `mensajeria.yaml` coinciden en rutas.

**Qué cambia en el spec al cerrar.** Se sube el pin a `tracer.N` (con aprobación explícita), `lib/contracts/conversaciones.ts` pasa a tomar tipos de `openapi/bff`, y se levanta el condicionamiento de los Requirements 1 a 8.

---

## 2. ¿Cómo obtiene el ejecutivo su bandeja?

**Lo que ya está decidido.** DEC-103 / ADR 36 (2026-10-27): **pool único e implícito**, una sola cola compartida a la que pertenecen todos los Ejecutivos; el vínculo con un cliente nace al tomar su primera conversación y es pegajoso. DEC-097 #3 (2026-10-19) decía que la bandeja se asocia al usuario-cliente; DEC-103 #1 habla de una sola cola. Ver §9.2.

**Contexto contractual.** `listarTrabajoBandeja` exige el `{id}` de bandeja. No hay operación que lo entregue. `bff.md` menciona `GET /api/v1/bandejas`, ausente de todo OpenAPI. Cada `Conversacion` trae `bandeja_id` (nullable, solo Interno).

**Preguntas (solo lo que sigue sin respuesta).**

- Con la cola única, ¿el frontend debe conocer un `{id}` fijo, o el `bff` lo resuelve de la sesión?

**Propuesta.** Que el `bff` resuelva la bandeja del sujeto (ruta sin `{id}`, o `{id}` obtenido por una operación mínima `obtenerBandeja`), para que el frontend no codifique un identificador. Si Arquitectura prefiere conservar `{id}`, una operación que lo devuelva.

**Criterio de cierre.** Respuesta de Mensajería/Arquitectura y, si aplica, la operación en el contrato.
---

## 3. Nombres mostrables y lista de Ejecutivos para transferir

**Lo que ya está decidido.** DEC-103 / ADR 36: la transferencia explícita reutiliza el reclamo/transferencia de la bandeja (E3-HU-015/016); con pool único, el destino es **otro Ejecutivo**. Entre internos se muestran nombres reales (DEC-021 #4).

**Contexto contractual.** `Reclamo.responsable_id`, `Mensaje.actor_real` y `TransferenciaEntrada.responsable_destino_id` son UUID sin nombre. No hay lectura de Ejecutivos para esta vista.

**Se pide.**

1. **Nombre mostrable** para audiencia Interno en `Reclamo` (responsable) y `Mensaje` (autor). _Propuesta:_ `responsable_nombre` / `autor_nombre`, solo audiencia Interno.
2. **Lectura de Ejecutivos elegibles como destino.** _Propuesta:_ `listarDestinosTransferencia` → `{ items: { sujeto_id, nombre }[] }` proyectada al `bff`.
3. Definir qué significa "disponible" para el destino (ADR 36 lo usa para la re-asignación, sin definirlo): ¿se filtra en la lectura o lo valida solo `transferirConversacion`?
4. Confirmar que un Ejecutivo puede leer los nombres de otros Ejecutivos.

**Criterio de cierre.** Operación y campos en el contrato; el frontend deja de usar etiquetas neutras ("Otra persona") y habilita el selector de destino.

**Si no se resuelve.** La transferencia no se puede construir; el frontend no aceptará un UUID escrito a mano.
---

## 4. Datos de la fila de la bandeja (Producto)

**Contexto.** `Conversacion` solo trae identificadores, estado, versión, reclamo, `atendida_en` y fechas.

**Preguntas para Producto.**

- ¿La bandeja V1 necesita **vista previa del último mensaje** y **conteo de no leídos**? Si no, no se construyen.
- El nombre del cliente se puede resolver con `listarClientes` (ya proyectado, DEC-101). ¿El rol `ejecutivo` puede leerlo? Si no, ¿se agrega `cliente_nombre` a la conversación?

**Criterio de cierre.** Decisión de alcance V1 registrada; si se requieren, solicitud de campos al contrato.

---

## 5. Stream SSE: lo que falta del contrato

**Lo que ya está resuelto.**

- **Host:** ADR 32 §2 pone `bff` y `realtime` (`/api/v1/stream`) en el mismo host `api.<dominio>`; es el mismo origen que el `bff`.
- **Autenticación:** `realtime.yaml` declara `bearer`. El `EventSource` nativo no envía cabeceras, así que el frontend usa `fetch` en streaming con bearer. Arquitectura solo debe avisar si pretende otro mecanismo.
- **Tipos del sobre de dominio:** `Sobre` (`evento_id`, `tipo`, `agregado_id`), `SobreVivo` (`cursor_dominio`, `audience_version`, `target_sujeto_ids`) y `conversacion.proto` ya están generados en el paquete TS.

**Lo que falta (se pide a Mensajería / `realtime`).**

1. La **codificación del `id` SSE / `Last-Event-ID`** (`stream_id` + `epoch` + `seq`). `realtime.yaml` la deja explícitamente fuera.
2. Los **eventos de control de línea** tipados: anuncio de `heartbeat_interval`, `liveness_timeout`, replay y `stream.stale`. No hay tipo generado.
3. **Cómo se serializa el sobre en el `data:` del frame** (JSON o protobuf codificado) y cómo se distingue un frame de dominio de uno de control.

**Criterio de cierre.** Tipos publicados en un tag y una nota de formato del frame.

**Mientras tanto.** El frontend entrega la recuperación HTTP completa (bootstrap, catch-up, `despues_de`) y deja el stream detrás de una interfaz; la bandeja funciona sin tiempo real y no se presenta como fresca por stream.
---

## 6. Alerta de mensaje pendiente para Supervisor — CERRADA para V1 (DEC-108)

DEC-108 (2026-10-28, FUERA DE ALCANCE): la condición no se implementa en V1; no existe superficie en `mensajeria.yaml` ni `registro.tipos.yaml`. El frontend no la muestra ni la infiere. Si Producto la reabre para V1.x, DEC-108 exige primero una sesión de diseño con cuatro preguntas (forma de la condición, cómo llega la alerta, qué ve el Supervisor y con qué alcance, si "se detiene" equivale a `conversacion.atendida`) y una ola de contrato.

**Acción pendiente:** corregir E8-T15, E3-T2 y E3-HU-016 en el repo de contexto (ver §9.1).
---

## 7. Override de supervisor — CERRADO para V1 (DEC-107)

DEC-107 (2026-10-28): `mensajeria` rechaza cualquier envío con `motivo_override` con `400`; reabrirlo exige construir antes la proyección de alcance jerárquico en `mensajeria`. El frontend no ofrece override ni envía `motivo_override`.

**Pregunta residual para Producto.** DEC-107 cierra solo el override del _envío_. ¿Puede un Supervisor liberar o transferir una conversación ajena en V1? `liberarReclamo` dice "supervisor dentro de su alcance" y E3-T3 lo menciona, pero necesita la misma proyección de mando. El frontend no ofrece el gesto y deja decidir al `bff`.
---

## 8. Recibos y `marcarAtendida` — mayormente resuelto (E3-T6)

E3-T6 fija que los recibos `entregado`/`leido` son llamadas del cliente que avanzan cursores por usuario; que el "leído por AI27" visible al cliente cambia solo cuando lo avanza el **responsable activo**; y que `atendida` lo invoca solo el responsable. **Residual para Mensajería:** si enviar una respuesta implica `atendida` o si es una acción explícita aparte.
---

## Textos pendientes (Producto)

Textos aprobados para: conflicto de versión al reclamar, reclamo perdido con la conversación abierta, conversación en solo lectura, autorización insuficiente, y confirmación al liberar con borrador. Mientras no existan, el frontend usa textos provisionales marcados como tales.

## Qué entrega el frontend al cerrar cada brecha

1. Actualizar `BRECHAS.md` (estado de cada brecha) y las Notas de brechas de `requirements.md` y `tasks.md`.
2. Con aprobación explícita, subir el pin de `@ai27-tech/contracts` y reemplazar el origen de los tipos en `lib/contracts/conversaciones.ts`.
3. Quitar el condicionamiento de los requirements correspondientes y completar las tareas bloqueadas (4, 9 y 11 de `tasks.md`).
4. Registrar la decisión como DEC (propuesta redactada por el frontend, registro por el dueño).

## Qué no se hace mientras tanto

No se escriben tipos de wire a mano, no se llama a `mensajeria` directamente desde el navegador, no se infiere la alerta, no se acepta un UUID escrito a mano como destino y no se muestran vista previa ni conteo de no leídos.
