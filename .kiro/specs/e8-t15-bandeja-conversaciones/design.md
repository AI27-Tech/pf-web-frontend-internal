# Design Document

## Overview

Diseño de la **bandeja de conversaciones** (E8-T15): la parte del panel interno donde el Ejecutivo reclama, responde, marca como atendida y devuelve al pool las conversaciones de la bandeja compartida. Se construye sobre las convenciones de `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que E8-T7, E8-T11, E8-T13 y E8-T14. La actualización viva usa **polling HTTP** (DEC-118); el SSE queda como deuda (DT-01) detrás de una interfaz.

El frontend no resuelve dominio. Membresía, un solo reclamo activo, ventana de escritura y auditoría las aplica el `bff`/`mensajeria`. La interfaz deriva **afordancias** (qué botón mostrar) y **clasifica respuestas**; la decisión del servidor prevalece siempre.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context` en `f8d5056` (2026-11-03), con DEC-116 a DEC-122. Contrato: último tag publicado `tracer.33`. La superficie interna de bandeja entró al `bff` en `tracer.30` y `tracer.31` (retiradas para TS por DEC-120), `tracer.32` las republica y `tracer.33` solo agrega la conversación por viaje del lado Cliente; `bff.yaml` es idéntico entre `tracer.32` y `tracer.33`. El frontend fija hoy `tracer.24`, que **no** incluye esta superficie; el diseño asume el pin a `tracer.33`. Montaje verificado en `pf-svc-bff` (`pf-bff-m`, `bff.go`).

```
# Lectura
GET    /api/v1/bandeja/trabajo?cursor&desde_revision   listarTrabajoBandeja   → TrabajoBandeja { items: Conversacion[], revision, cursor_siguiente }
                                                                                  / 403 sin membresía / 404 sin bandeja / 409 stream_resync_required
GET    /api/v1/conversaciones/{id}                     obtenerConversacion     → Conversacion
GET    /api/v1/conversaciones/{id}/mensajes?antes_de|despues_de&limite   listarMensajes → PaginaMensajes { items: Mensaje[], hay_mas }

# Escritura
POST   /api/v1/conversaciones/{id}/mensajes            enviarMensaje           body EnviarMensajeInternaEntrada { client_message_id, cuerpo, adjuntos_ids?, version_reclamo_esperada }
                                                                                  → 201 | 200 (reintento) Mensaje / 400 / 403 / 404 / 409 conflicto_version_reclamo | conversacion_solo_lectura
POST   /api/v1/conversaciones/{id}/reclamos            reclamarConversacion    body { version_esperada } → 201 Reclamo / 403 / 404 / 409
DELETE /api/v1/conversaciones/{id}/reclamos/{rid}?version_esperada   liberarReclamo → 204 / 403 / 404 / 409
POST   /api/v1/conversaciones/{id}/atendida            marcarAtendida          body { version_esperada } → 204 / 403 / 404 / 409
POST   /api/v1/conversaciones/{id}/recibos/entregado|leido   registrarRecibo*  body { hasta_secuencia } → 204 / 404

# No se usa en V1
POST   /api/v1/conversaciones/{id}/transferencias      transferirConversacion  body { version_esperada, responsable_destino_id, motivo? } (requiere destino; DEC-119)

# Nombre del cliente
GET    /api/v1/clientes                                listarClientes          (DEC-101, DEC-118)
```

Tipos (`components['schemas']`): `Conversacion { id, viaje_id, cliente_id, bandeja_id?, estado(abierta|solo_lectura|cerrada), escritura_hasta?, ultima_secuencia, version_reclamo, reclamo_activo?, atendida_en?, abierta_en }`, `Reclamo { id, conversacion_id, responsable_id, version, abierto_en, cerrado_en? }`, `Mensaje { id, conversacion_id, secuencia, client_message_id, audiencia_autor, alias_mostrado, actor_real?, rol_al_enviar?, cuerpo, adjuntos_ids?, creado_en }`. El error trae `codigo`, `mensaje` y `detalles?`; **el `409` no devuelve la versión ni el propietario vigentes**, así que tras un conflicto se recarga el detalle.

Tres cursores distintos que el diseño nunca mezcla: `cursor` de paginación, `revision` de la colección de bandeja y `secuencia` por conversación.

## Architecture

### Vista de capas

```
routes/_private/conversaciones.tsx          (reemplaza el stub de E8-T4)
        │  monta
        ▼
features/conversaciones/
  BandejaConversaciones.tsx   composición: lista de trabajo + panel de conversación
  ListaTrabajo.tsx            filas de la bandeja (FilterTable) + estados
  PanelConversacion.tsx       historial + compositor + acciones (MessagePanel)
  AccionesReclamo.tsx         reclamar / devolver al pool / marcar atendida
  BannerEstado.tsx            razón del compositor deshabilitado, conflicto, actualización
  useTrabajoBandeja.ts        bootstrap + polling de catch-up + paginación
  useConversacion.ts          detalle + historial + polling por secuencia + mutaciones
  useNombresCliente.ts        resuelve cliente_id → nombre con listarClientes
  afordancias.ts              funciones puras: qué se puede hacer
  aplicarCambios.ts           reducer puro: mezcla de cambios por id y de mensajes por secuencia
  actualizacion.ts            interfaz de actualización (hoy: polling; mañana: SSE)
        │  usan
        ▼
lib/api/conversaciones.ts     wrappers de operaciones; clasifica 401/403/404/409
lib/contracts/conversaciones.ts   re-exporta tipos generados de openapi/bff
```

La conversación abierta se representa con un parámetro de búsqueda (`?conversacion=<id>`) sobre `/conversaciones`, para no convertir el stub en ruta con hijos.

### Estados de la interfaz

Lista: `cargando` · `vacio` · `error` (reintento) · `sin_acceso` (403) · `sin_bandeja` (404) · `datos`.
Conversación: `cargando` · `no_disponible` (404) · `error` · `datos`.
Actualización (transversal): `al_dia` (con hora de la última consulta correcta) · `desactualizada` (falló el polling) · `resincronizando` (bootstrap en curso).
Compositor: `habilitado` · `deshabilitado` con razón (`en_pool` · `reclamada_por_otro` · `solo_lectura`).

### Afordancias puras (`afordancias.ts`)

Función pura `capacidades(conversacion, sujetoId)` → `{ puedeReclamar, puedeResponder, puedeDevolverAlPool, puedeMarcarAtendida, razonCompositor }`. Entradas: `estado`, `reclamo_activo.responsable_id` frente al sujeto de la sesión. No calcula ventanas de tiempo ni mira el rol: **ningún rol tiene excepción** (DEC-107, DEC-118). Es afordancia de UI; el `bff` valida de nuevo.

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                                                          | Componente                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Lista de conversaciones con filtro/paginación                      | `FilterTable` (o `Table` + `Pagination`)                      |
| Panel de conversación                                              | `MessagePanel`                                                |
| Lista y burbujas de mensajes, separador por día                    | `MessageList`, `MessageBubble`, `MessageDayDivider`           |
| Compositor                                                         | `MessageComposer` (`disabled`, `value`, `onChange`, `onSend`) |
| Estado de reclamo (pool / mío / de otro / solo lectura) y atendida | `Badge`                                                       |
| Confirmación al devolver con borrador                              | `Modal`                                                       |
| Avisos de éxito y rechazo                                          | `Toast`, `ToastContainer`                                     |
| Banner de estado persistente                                       | `Card` + `Badge` (composición; sin componente local nuevo)    |
| Acciones                                                           | `Button`                                                      |

Verificación pendiente de la API exacta de `MessageBubble`, `MessageList` y `Modal` contra `@ai27-tech/ui@0.2.0-beta.6`; cualquier afordancia faltante se compone con primitivas y se registra en `BRECHAS.md`, no como componente local.

## Components and Interfaces

- **`lib/contracts/conversaciones.ts`**: re-exporta de `@ai27-tech/contracts/openapi/bff` (`Conversacion`, `Reclamo`, `Mensaje`, `TrabajoBandeja`, `PaginaMensajes`, `EnviarMensajeInternaEntrada`, `VersionEsperadaEntrada`, `ReciboEntrada`). Sin tipos de wire a mano.
- **`lib/api/conversaciones.ts`**: una función por operación. Clasifica errores en clases (`ErrorConflictoVersionReclamo`, `ErrorConversacionSoloLectura`, `ErrorResyncRequerido`, `ErrorSinAcceso`, `ErrorSinBandeja`, `ErrorNoEsResponsable`) por código HTTP y `codigo` de máquina. Sin reglas de dominio. El `401` se delega al flujo de sesión del AppShell. No expone `transferirConversacion`.
- **`useTrabajoBandeja`**: bootstrap (`listarTrabajoBandeja` sin `desde_revision`), guarda `revision`; cada intervalo consulta con `desde_revision` y mezcla los cambios por `id` con `aplicarCambios`. Ante `409 stream_resync_required` repite el bootstrap. `retry: false`.
- **`useConversacion`**: detalle e historial (`antes_de` hacia atrás; `despues_de` con la última `secuencia` en cada intervalo). Mutaciones `reclamar`, `devolverAlPool`, `marcarAtendida`, `enviar`: cada una envía la versión **vigente en la caché**, bloquea doble envío y, ante `409`/`403`, invalida y recarga el detalle.
- **`useNombresCliente`**: carga `listarClientes` (solo activos) y expone un mapa `cliente_id → nombre`. Un cliente sin entrada se muestra con texto neutro.
- **`aplicarCambios`**: reducer puro. Mezcla conversaciones por `id` y mensajes por `secuencia`, sin duplicados y en orden ascendente por `secuencia`.
- **`actualizacion.ts`**: interfaz `FuenteActualizacion { iniciar(); detener(); }` con una implementación de polling. Es el punto donde un SSE futuro (DT-01) sustituiría al polling sin tocar las vistas.

### Presentación de personas

El contrato no entrega nombres de Ejecutivos y DEC-119 los deja fuera de V1. El autor de un mensaje se muestra con `alias_mostrado` y `rol_al_enviar`. El reclamante se muestra como "Tú" cuando `responsable_id` es el sujeto de la sesión y como "otra persona" en otro caso. Nunca se muestra un UUID como nombre.

### Gestos y su operación

| Gesto            | Operación                                                       | Quién lo ve                         |
| ---------------- | --------------------------------------------------------------- | ----------------------------------- |
| Reclamar         | `reclamarConversacion` con `version_esperada = version_reclamo` | Conversación en el pool, escribible |
| Responder        | `enviarMensaje` con `version_reclamo_esperada`                  | Solo el reclamante activo           |
| Marcar atendida  | `marcarAtendida` con `version_esperada`                         | Solo el reclamante activo           |
| Devolver al pool | `liberarReclamo` con `version_esperada`                         | Solo el reclamante activo           |

No existe gesto de transferir con destino, override ni liberar/atender una conversación ajena.

## Flujo de actualización por polling

```
1. bootstrap HTTP      → GET /bandeja/trabajo → items + revision R0
2. cada intervalo      → GET /bandeja/trabajo?desde_revision=R0 → cambios hasta R1
                          · aplicar con aplicarCambios (mezcla por id)
                          · R0 ← R1
3. 409 stream_resync_required → volver al paso 1
4. falla de red/5xx    → conservar datos, marcar "desactualizada", reintentar
```

En la conversación abierta el cursor es la `secuencia` del último mensaje: la recuperación es `listarMensajes?despues_de=<secuencia>`. El estado `atendida_en` y `reclamo_activo` se leen del detalle recargado, no se infieren.

## Data Models

Los modelos de wire son los generados del contrato; no se redefinen. El estado local de la vista añade solo:

- **`EstadoBandeja`**: `{ items, revision, cursorSiguiente, actualizacion }`, con `actualizacion` en `al_dia | desactualizada | resincronizando` y la hora de la última consulta correcta.
- **`EstadoConversacion` de vista**: `{ conversacion, mensajes (ordenados por secuencia), hayMasAtras, borrador, pendiente }`. `borrador` es texto local que nunca se pierde por una pérdida de reclamo.
- **`SolicitudEnvio`**: `{ client_message_id, cuerpo }` que se conserva mientras no se confirme, para reutilizar el identificador en el reintento.

## Error Handling

| Respuesta                       | Clasificación                  | Comportamiento de la vista                     |
| ------------------------------- | ------------------------------ | ---------------------------------------------- |
| `401`                           | Sesión                         | Delegar al flujo del AppShell                  |
| `403` en lectura de bandeja     | `ErrorSinAcceso`               | Estado `sin_acceso`, sin conversaciones        |
| `404` en bandeja                | `ErrorSinBandeja`              | Estado `sin_bandeja`                           |
| `403` en liberar / atendida     | `ErrorNoEsResponsable`         | Aviso "solo el responsable"; recargar          |
| `403` en envío / reclamo        | Autorización insuficiente      | Aviso; deshabilitar acción; recargar           |
| `404` en conversación           | No disponible                  | Aviso sin distinguir inexistente de sin acceso |
| `409 conflicto_version_reclamo` | `ErrorConflictoVersionReclamo` | Aviso; recargar el detalle; conservar borrador |
| `409 conversacion_solo_lectura` | `ErrorConversacionSoloLectura` | Deshabilitar compositor; conservar texto       |
| `409 stream_resync_required`    | `ErrorResyncRequerido`         | Repetir bootstrap; sin revelar causa           |
| `409` en atendida sin reclamo   | Conflicto                      | Aviso; recargar                                |
| Red / `5xx`                     | Error recuperable              | Reintento; conservar datos y borrador          |

## Correctness Properties

1. **Habilitación del compositor.** Para todo `(conversacion, sujetoId)`, el compositor está habilitado si y solo si la conversación admite escritura, el usuario es el responsable de `reclamo_activo` y no hay solicitud en curso, sin excepción por rol.
2. **Perder el reclamo conserva la lectura.** Para toda transición de `reclamo_activo` del usuario a otro valor, el historial renderizado después es superconjunto del anterior y el borrador no cambia.
3. **Mezcla idempotente.** Aplicar dos veces el mismo conjunto de cambios, o con duplicados, produce el mismo estado; los mensajes quedan ordenados por `secuencia` ascendente sin repeticiones y las conversaciones sin ids duplicados.
4. **Cobertura sin huecos.** Bootstrap más catch-ups sucesivos reflejan cada conversación y cada mensaje exactamente una vez; ante `409 stream_resync_required` el resultado del nuevo bootstrap reemplaza al estado previo.
5. **Versión vigente.** Toda mutación de reclamo (reclamar, devolver, marcar atendida) y todo envío usan la versión del último detalle cargado, nunca un valor fijo; tras un `409`, la siguiente acción usa la versión recargada.
6. **Reintento idempotente.** Reintentar el mismo envío reutiliza el `client_message_id` y nunca produce dos mensajes en la vista.
7. **Sin cursores mezclados.** `revision`, `cursor` y `secuencia` no se intercambian: el `desde_revision` siempre es la `revision` guardada.
8. **Sin gestos excluidos.** Ningún envío incluye `motivo_override`, ningún rol ve override, liberar o atender una conversación ajena, ni selector de destino, y la interfaz no invoca `transferirConversacion`.
9. **Atendida solo por lo declarado.** La marca de atendida se muestra si y solo si el detalle trae `atendida_en`; enviar un mensaje nunca la cambia en la vista.

## Testing Strategy

- **Unitarias y de propiedades** (fast-check, ya presente en el repo): `afordancias`, `aplicarCambios`, y la política de versión y de `client_message_id`.
- **Integración con MSW**: reclamo, respuesta, devolver al pool, marcar atendida, solo lectura, `403` en lectura y en acciones, `404` sin bandeja, `401`, `409 stream_resync_required` y falla de polling, contra la superficie del `bff`.
- **Accesibilidad**: etiquetas, foco y anuncios de cambios de reclamo y de desactualización con los componentes compartidos.
- **Contrato**: `typecheck` sobre los tipos generados de `tracer.33`; cualquier superficie ausente se registra en `BRECHAS.md`.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir la superficie del `bff`:

- bandeja con conversaciones en el pool, reclamadas por el usuario y reclamadas por otra persona, con `revision` y `version_reclamo`; `404` para un sujeto sin bandeja y `403` sin membresía;
- historial con paginación hacia atrás y `despues_de`;
- reclamo exitoso y un caso que fuerza `409 conflicto_version_reclamo`; devolver al pool exitoso, con `409` y con `403`;
- `marcarAtendida` exitosa, con `409` y con `403`; un mensaje nuevo del cliente que deja `atendida_en` vacío en el siguiente detalle;
- envío con `201` y con reintento idempotente `200`, `403`, `409 conversacion_solo_lectura`;
- `409 stream_resync_required` en catch-up y una falla de red intermitente.

## Decisiones

- **Afordancia en UI, autoridad en el `bff`:** la UI oculta o muestra gestos por estado y reclamante, pero nunca los da por válidos; todo rechazo se clasifica y se refleja.
- **Conflicto de versión visible, nunca silencioso:** no hay reintento automático de un reclamo ni reasignación sin que el usuario lo vea (HU-015 Escenario 2).
- **Perder reclamo no vacía el panel:** el compositor se deshabilita y el historial sigue; es el DoD de E8-T15.
- **Devolver al pool es la "transferencia" de V1:** `transferirConversacion` exige un destino que la interfaz no puede conocer (DEC-119, DT-04). Se confirma con el dueño del `bff`.
- **Polling detrás de una interfaz:** el SSE (DT-01) sustituye al polling sin cambiar las vistas.
- **Versión desde la conversación, no `0`:** el reclamo usa el `version_reclamo` recibido (PR #41 de `mensajeria`).
- **Sin componentes locales nuevos:** todo con `@ai27-tech/ui`.
