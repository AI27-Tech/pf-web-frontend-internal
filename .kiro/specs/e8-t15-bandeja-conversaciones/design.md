# Design Document

## Overview

Diseño de la **bandeja de conversaciones** (E8-T15): la parte del panel interno donde el Ejecutivo reclama, responde, libera y transfiere conversaciones de los clientes de su alcance. El override de supervisor (DEC-107) y la alerta de mensaje pendiente (DEC-108) están fuera de V1. Se construye sobre las convenciones de `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que E8-T7, E8-T11 y E8-T13, sin patrones nuevos salvo la capa de transporte vivo, que es nueva y se aísla en un módulo.

El frontend no resuelve dominio. Alcance, membresía efectiva, un solo reclamo activo, atomicidad de la transferencia, ventana de escritura y auditoría las aplica el `bff`/`mensajeria`. La interfaz deriva **afordancias** (qué botón mostrar) y **clasifica respuestas**; la decisión del servidor prevalece siempre.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context` al día (commit `3ca0d3b`). Contrato fijado por el frontend: `@ai27-tech/contracts@0.1.0-tracer.22`, `@ai27-tech/ui@0.2.0-beta.6`. Último tag publicado: `tracer.24` (sin cambios de bandeja respecto de `tracer.22`).

La superficie existe en **`mensajeria.yaml`**, no en `bff.yaml` (ver `BRECHAS.md`, Brecha 1). El diseño usa los nombres de operación y schemas de `mensajeria` y deja el prefijo de ruta como único punto de cambio hasta que el `bff` proyecte la superficie.

```
# Lectura
GET    /api/v1/bandejas/{id}/trabajo?cursor&desde_revision  listarTrabajoBandeja   → TrabajoBandeja { items: Conversacion[], revision, cursor_siguiente } / 409 stream_resync_required
GET    /api/v1/conversaciones/{id}                          obtenerConversacion    → Conversacion
GET    /api/v1/conversaciones/{id}/mensajes?antes_de|despues_de&limite  listarMensajes → PaginaMensajes { items: Mensaje[], hay_mas }

# Escritura
POST   /api/v1/conversaciones/{id}/mensajes                 enviarMensaje          body { client_message_id, cuerpo, version_reclamo_esperada }   (sin motivo_override: DEC-107) → 201 | 200 (reintento idempotente) Mensaje / 403 / 409 conflicto_version_reclamo | conversacion_solo_lectura
POST   /api/v1/conversaciones/{id}/reclamos                 reclamarConversacion   body { version_esperada } → 201 Reclamo / 409 conflicto_version_reclamo
DELETE /api/v1/conversaciones/{id}/reclamos/{rid}?version_esperada  liberarReclamo → 204 / 409 conflicto_version_reclamo
POST   /api/v1/conversaciones/{id}/transferencias           transferirConversacion body { version_esperada, responsable_destino_id, motivo? } → 201 Reclamo / 409 conflicto_version_reclamo
POST   /api/v1/conversaciones/{id}/atendida                 marcarAtendida         body { version_esperada } → 204
POST   /api/v1/conversaciones/{id}/recibos/entregado|leido  registrarRecibo*       body { hasta_secuencia } → 204

# Transporte vivo (realtime, NO pasa por el bff)
GET    /api/v1/stream   abrirStream   sin selector; text/event-stream; 409 stream_resync_required
```

Tipos: `Conversacion { id, viaje_id, cliente_id, bandeja_id?, estado(abierta|solo_lectura|cerrada), escritura_hasta?, ultima_secuencia, version_reclamo, reclamo_activo?, atendida_en?, abierta_en }`, `Reclamo { id, conversacion_id, responsable_id, version, abierto_en, cerrado_en? }`, `Mensaje { id, conversacion_id, secuencia, client_message_id, audiencia_autor, alias_mostrado, actor_real?, rol_al_enviar?, cuerpo, adjuntos_ids?, creado_en }`.

Tres cursores distintos que el diseño nunca mezcla: `cursor` de paginación, `revision` de la colección de bandeja y `secuencia` por conversación. El `seq` de transporte del stream no ordena nada de dominio.

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
  AccionesReclamo.tsx         reclamar / liberar / transferir
  TransferirDialogo.tsx       selección de destino y motivo (Modal)
  BannerEstado.tsx            razón del compositor deshabilitado, conflicto, frescura
  useTrabajoBandeja.ts        bootstrap + catch-up + paginación
  useConversacion.ts          detalle + historial + mutaciones
  useStreamVivo.ts            ciclo de vida del stream y recuperación
  afordancias.ts              funciones puras: qué se puede hacer (ver abajo)
  aplicarDelta.ts             reducer puro de deltas (orden, deduplicación)
        │  usan
        ▼
lib/api/conversaciones.ts     wrappers de operaciones; clasifica 401/403/404/409
lib/api/stream.ts             apertura del stream y lectura de frames
lib/contracts/conversaciones.ts   re-exporta tipos generados (punto único de cambio)
```

La ruta de detalle se representa con un parámetro de búsqueda (`?conversacion=<id>`) sobre `/conversaciones`, para no convertir el stub en ruta con hijos. Los dos paneles comparten la vista.

### Estados de la interfaz

Lista: `cargando` · `vacio` · `error` (reintento) · `sin_acceso` (403) · `datos`.
Conversación: `cargando` · `no_disponible` (404) · `error` · `datos`.
Frescura (transversal): `fresca` · `recuperando` (HTTP periódico) · `resincronizando` (bootstrap en curso).
Compositor: `habilitado` · `deshabilitado` con razón (`en_pool` · `reclamada_por_otro` · `solo_lectura` · `reclamo_perdido` · `sin_membresia`).

### Afordancias puras (`afordancias.ts`)

Función pura `capacidades(conversacion, usuario)` → `{ puedeReclamar, puedeResponder, puedeLiberar, puedeTransferir, razonCompositor }`. Entradas: `estado`, `escritura_hasta` ya evaluado por el servidor (`estado`), `reclamo_activo.responsable_id` frente al sujeto de la sesión, y el rol. No calcula ventanas de tiempo. Es **afordancia de UI**: el `bff` valida de nuevo.

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                                               | Componente                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Lista de conversaciones con filtro/paginación           | `FilterTable` (o `Table` + `Pagination`)                      |
| Panel de conversación                                   | `MessagePanel`                                                |
| Lista y burbujas de mensajes, separador por día         | `MessageList`, `MessageBubble`, `MessageDayDivider`           |
| Compositor                                              | `MessageComposer` (`disabled`, `value`, `onChange`, `onSend`) |
| Estado de reclamo (pool / mío / de otro / solo lectura) | `Badge`                                                       |
| Diálogo de transferencia                                | `Modal`, `Form`, `FormField`, `Select`, `Textarea`            |
| Avisos de éxito y rechazo                               | `Toast`, `ToastContainer`                                     |
| Banner de estado persistente                            | `Card` + `Badge` (composición; sin componente local nuevo)    |
| Acciones                                                | `Button`                                                      |

Verificación de la API exacta de `MessageBubble`, `MessageList` y `Modal` pendiente contra `@ai27-tech/ui@0.2.0-beta.6`; cualquier afordancia faltante se compone con primitivas y se registra en `BRECHAS.md` (Brecha 8), no como componente local.

## Components and Interfaces

- **`lib/contracts/conversaciones.ts`**: re-exporta los tipos generados de `@ai27-tech/contracts` (`Conversacion`, `Reclamo`, `Mensaje`, `TrabajoBandeja`, `EnviarMensajeEntrada`, `TransferenciaEntrada`). Hoy salen del módulo `openapi/mensajeria`; cuando el `bff` proyecte la superficie, el único cambio es el módulo de origen. No se declaran tipos de wire a mano.
- **`lib/api/conversaciones.ts`**: una función por operación. Clasifica los errores en clases (`ErrorConflictoVersionReclamo`, `ErrorConversacionSoloLectura`, `ErrorResyncRequerido`, `ErrorSinAcceso`) por código HTTP y `codigo` de máquina. No contiene reglas de dominio. El `401` se delega al flujo de sesión del AppShell.
- **`useTrabajoBandeja`**: bootstrap (`listarTrabajoBandeja` sin `desde_revision`), guarda `revision`, expone paginación. En catch-up pasa `desde_revision`; ante `409 stream_resync_required` repite el bootstrap. `retry: false`.
- **`useConversacion`**: detalle e historial (`antes_de` hacia atrás, `despues_de` para cerrar huecos tras reconexión). Mutaciones `reclamar`, `liberar`, `transferir`, `enviar`: cada una envía la versión **vigente en la caché**, bloquea doble envío y, ante `409 conflicto_version_reclamo`, invalida y recarga el detalle.
- **`aplicarDelta`**: reducer puro. Aplica deltas por secuencia de dominio, descarta duplicados por `evento_id`, ignora los ya reflejados por el bootstrap y nunca ordena por `seq` de transporte.
- **`useStreamVivo`**: orquesta apertura → catch-up → vaciado del buffer → modo vivo. Gestiona reconexión, `409 stream_resync_required` (repite bootstrap), `stream.stale` (cambia a recuperación HTTP periódica y marca la vista como no fresca).
- **`lib/api/stream.ts`**: abre el stream contra la base URL del `realtime` por entorno y entrega frames al hook. **Condicionado a la Brecha 5**: hasta que el contrato publique los tipos de frame y control, solo se implementa la rebanada HTTP; el módulo expone la interfaz y un cliente simulado para pruebas.

### Presentación de personas (Brecha 3)

Mientras el contrato no entregue nombres, el responsable y el autor se muestran con `alias_mostrado` (en el mensaje) y con una etiqueta neutra ("Otra persona", "Tú") para el reclamo. **No** se muestra un UUID como si fuera un nombre. El nombre real entre internos queda condicionado a la Brecha 3.

## Flujo de bootstrap, catch-up y buffer

```
1. bootstrap HTTP  → items + revision R0
2. abrir stream (sin selector); los deltas vivos entran a un BUFFER
3. catch-up HTTP   → listarTrabajoBandeja(desde_revision=R0) → cambios hasta R1
4. aplicar cambios del catch-up, luego vaciar el buffer deduplicando por evento_id
5. modo vivo: aplicar cada delta por secuencia de dominio
   · 409 stream_resync_required (catch-up o reconexión) → volver a 1
   · stream.stale con socket vivo → modo "recuperando": polling HTTP, vista no fresca
```

En la conversación abierta el cursor es `ultima_secuencia`/`secuencia` del mensaje: la recuperación es `listarMensajes?despues_de=<secuencia>`.

## Error Handling

| Respuesta                       | Clasificación                  | Comportamiento de la vista                            |
| ------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `401`                           | Sesión                         | Delegar al flujo del AppShell                         |
| `403` en lectura                | `ErrorSinAcceso`               | Estado `sin_acceso`, sin conversaciones               |
| `403` en escritura              | Autorización insuficiente      | Aviso; deshabilitar acción; recargar detalle          |
| `404`                           | No disponible                  | Aviso sin distinguir inexistente de sin acceso        |
| `409 conflicto_version_reclamo` | `ErrorConflictoVersionReclamo` | Aviso de por qué perdió; recargar; conservar borrador |
| `409 conversacion_solo_lectura` | `ErrorConversacionSoloLectura` | Deshabilitar compositor; conservar texto              |
| `409 stream_resync_required`    | `ErrorResyncRequerido`         | Repetir bootstrap y catch-up; sin revelar causa       |
| Red / `5xx`                     | Error recuperable              | Reintento; el borrador no se pierde                   |

## Data Models

Los modelos de wire son los generados del contrato (`Conversacion`, `Reclamo`, `Mensaje`, `TrabajoBandeja`); no se redefinen. El estado local de la vista añade solo:

- **`EstadoBandeja`**: `{ items, revision, cursorSiguiente, frescura }`, con `frescura` en `fresca | recuperando | resincronizando`.
- **`EstadoConversacion` de vista**: `{ conversacion, mensajes (ordenados por secuencia), hayMasAtras, borrador, pendiente }`. `borrador` es texto local que nunca se pierde por una pérdida de reclamo.
- **`BufferDeltas`**: cola de deltas vivos recibidos durante el catch-up, con `evento_id` para deduplicar.
- **`SolicitudEnvio`**: `{ client_message_id, cuerpo }` que se conserva mientras no se confirme, para reutilizar el identificador en el reintento.

## Correctness Properties

1. **Habilitación del compositor.** Para todo `(conversacion, usuario)`, el compositor está habilitado si y solo si la conversación admite escritura, el usuario es el responsable de `reclamo_activo` y no hay solicitud en curso, sin excepción por rol (DEC-107). Un Ejecutivo sin reclamo nunca lo ve habilitado.
2. **Perder el reclamo conserva la lectura.** Para toda transición de `reclamo_activo` del usuario a otro valor, el historial renderizado después es superconjunto del anterior y el borrador no cambia.
3. **Idempotencia y orden del reducer.** Aplicar la misma secuencia de deltas dos veces, o con duplicados por `evento_id`, produce el mismo estado; los mensajes quedan ordenados por `secuencia` ascendente sin repeticiones.
4. **Exactamente una vez.** Para todo evento concurrente al bootstrap, bootstrap + catch-up + buffer vivo lo reflejan exactamente una vez.
5. **Versión vigente.** Toda mutación de reclamo (reclamar, liberar, transferir, marcar atendida) y todo envío usan la versión del último detalle cargado; tras un `409`, la siguiente acción usa la versión recargada.
6. **Reintento idempotente.** Reintentar el mismo envío reutiliza el `client_message_id` y nunca produce dos mensajes en la vista.
7. **Sin cursores mezclados.** `revision`, `cursor` y `secuencia` no se intercambian: el `desde_revision` siempre es la `revision` guardada y nunca el cursor de paginación.
8. **Sin override en V1.** Ningún envío incluye `motivo_override` y ningún rol ve un gesto de override (DEC-107).

## Testing Strategy

- **Unitarias y de propiedades** (fast-check, ya presente en el repo si aplica): `afordancias`, `aplicarDelta` y la política de versión y de `client_message_id`.
- **Integración con MSW**: los flujos de reclamo, respuesta, liberación, transferencia, solo lectura, `403`, `401`, `409 stream_resync_required` y `stream.stale`, contra el contrato esperado de `mensajeria`.
- **Accesibilidad**: etiquetas, foco y anuncios de cambios de reclamo y de frescura con los componentes compartidos.
- **Contrato**: `typecheck` sobre los tipos generados; cualquier superficie ausente se registra en `BRECHAS.md`.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir el contrato esperado de `mensajeria` (bajo el mismo prefijo único de ruta):

- bandeja con conversaciones en el pool, reclamadas por el usuario y reclamadas por otra persona, con `revision`;
- historial con paginación hacia atrás y `despues_de`;
- reclamo exitoso y un caso que fuerza `409 conflicto_version_reclamo`; liberación y transferencia exitosas y con `409`;
- envío con `201` y con reintento idempotente `200`, `403`, `409 conversacion_solo_lectura`;
- `409 stream_resync_required` en catch-up;
- un stream simulado (fuente de frames inyectable en pruebas) que emite deltas, duplicados y `stream.stale`.

## Decisiones

- **Afordancia en UI, autoridad en el `bff`:** la UI oculta o muestra gestos por rol y estado, pero nunca los da por válidos; todo rechazo se clasifica y se refleja.
- **Conflicto de versión visible, nunca silencioso:** no hay reintento automático de un reclamo ni reasignación sin que el usuario lo vea (HU-015 Escenario 2).
- **Perder reclamo no vacía el panel:** el compositor se deshabilita y el historial sigue; es el DoD de E8-T15.
- **HTTP primero, stream después:** la rebanada HTTP (bootstrap, catch-up, recuperación) es completa por sí misma; el stream solo acelera. Si el stream cae, la bandeja sigue operando.
- **Sin componentes locales nuevos:** todo con `@ai27-tech/ui`.
- **Condicionamiento por brechas:** los comportamientos de las Brechas 1, 2, 3 y 5 se construyen detrás de los puntos de cambio descritos y se verifican con mocks; no se publican contra el `bff` real hasta que existan.
