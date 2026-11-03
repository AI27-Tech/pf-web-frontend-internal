# Implementation Plan: Bandeja de conversaciones (E8-T15)

## Overview

Las tareas implementan el comportamiento funcional de E8-T15 en su alcance V1: bandeja compartida de cola única, lectura del historial, reclamo exclusivo, respuesta, marcar atendida y devolver la conversación al pool, con actualización por polling HTTP. **El backend ya expone la superficie por el `bff`** (`tracer.30` en adelante, montada en `pf-svc-bff`); el frontend todavía no la consume. Las exclusiones de V1 (override, alerta, transferencia dirigida, mando sobre conversaciones ajenas, vista previa, no leídos y SSE) están decididas en DEC-107, DEC-108, DEC-118, DEC-119 y DT-01; no se construyen. No se inventan superficies, campos ni componentes.

## Estado de avance

**Sin iniciar.** El spec está al día con DEC-116 a DEC-122. La ruta `/conversaciones` es un stub (E8-T4). `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.24`, que no trae la superficie interna de bandeja; la tarea 1 sube el pin.

## Task Dependency Graph

`1 → 2 → 3–10 → 11 → 12–14`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2], "dependsOn": [1] },
    { "id": 3, "tasks": [3, 4, 5, 6, 7, 8, 9, 10], "dependsOn": [2] },
    { "id": 4, "tasks": [11], "dependsOn": [3] },
    { "id": 5, "tasks": [12, 13, 14], "dependsOn": [11] }
  ]
}
```

La tarea 1 sube el contrato y verifica la librería. La tarea 2 fija las capas de tipos y API. Las tareas 3 a 10 implementan la lógica pura, los hooks y los flujos. La tarea 11 monta la ruta real. Las tareas 12 a 14 verifican comportamiento, accesibilidad y contrato.

## Tasks

## Prerrequisito

- [ ] 1. Subir el contrato y verificar lo instalado. **Requiere aprobación explícita.** Cambiar `@ai27-tech/contracts` de `0.1.0-tracer.24` a `0.1.0-tracer.33` (`tracer.30` y `tracer.31` no existen para TS, DEC-120) y agregar `|| 0.1.0-tracer.33` a la entrada de `@ai27-tech/contracts` en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`. Instalar y confirmar en `bff.gen.ts` las operaciones `listarTrabajoBandeja`, `obtenerConversacion`, `listarMensajes`, `enviarMensaje`, `reclamarConversacion`, `liberarReclamo`, `marcarAtendida`, `registrarReciboLeido` y `listarClientes`. Verificar la API exacta de `MessagePanel`, `MessageList`, `MessageBubble`, `MessageComposer`, `Modal` y `FilterTable` en `@ai27-tech/ui@0.2.0-beta.6`. Revisar si el PR #41 de `mensajeria` ya se mergeó (semántica de `version_reclamo` y `403`) y actualizar `BRECHAS.md` con lo que cambie.

## Implementación

- [ ] 2. Crear `lib/contracts/conversaciones.ts` (re-exporta de `@ai27-tech/contracts/openapi/bff`; sin tipos de wire a mano) y `lib/api/conversaciones.ts` con las operaciones de la tarea 1, sin exponer `transferirConversacion`. Clasificar errores (`401`, `403` en lectura y en acciones, `404` sin bandeja y en conversación, `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura`, `409 stream_resync_required`).
- [ ] 3. Implementar `afordancias.ts` (funciones puras): `puedeReclamar`, `puedeResponder`, `puedeDevolverAlPool`, `puedeMarcarAtendida` y `razonCompositor`, a partir de `estado`, `reclamo_activo` y el sujeto de la sesión, sin excepción por rol y sin calcular ventanas de tiempo.
- [ ] 4. Implementar `aplicarCambios.ts` (reducer puro: mezcla de conversaciones por `id` y de mensajes por `secuencia`, sin duplicados) y `actualizacion.ts` (interfaz de actualización con implementación de polling y cadencia tomada de configuración del cliente).
- [ ] 5. Implementar `useTrabajoBandeja.ts`, `useNombresCliente.ts` y `ListaTrabajo.tsx`: bootstrap sin identificador de bandeja, `revision`, polling con `desde_revision`, paginación por cursor sin confundirlo con `revision`, nombre del cliente con `listarClientes` y texto neutro si no se resuelve, distinción visual de pool / mía / de otra persona, marca de atendida, estados de carga, vacío, error, `sin_acceso` (403) y `sin_bandeja` (404). Sin vista previa ni conteo de no leídos.
- [ ] 6. Implementar `useConversacion.ts` y `PanelConversacion.tsx` sobre `MessagePanel`/`MessageList`/`MessageBubble`: detalle, historial ordenado por `secuencia`, carga hacia atrás, polling por `despues_de`, `alias_mostrado` y rol al enviar, "Tú" / "otra persona" para el reclamante, estado `404` sin distinguir causa, estado vacío, sin adjuntos ni edición.
- [ ] 7. Implementar el reclamo en `AccionesReclamo.tsx`: reclamar con la `version_reclamo` recibida (nunca un `0` fijo), bloqueo de doble envío, conflicto `409` con aviso de que otra persona lo tiene y recarga, sin reintento silencioso.
- [ ] 8. Implementar el envío con `MessageComposer`: `client_message_id` generado en el cliente y reutilizado en el reintento, `version_reclamo_esperada`, sin `motivo_override`, cuerpo no vacío, conservación del borrador ante `403`/`409`.
- [ ] 9. Implementar `BannerEstado.tsx` y el comportamiento de reclamo perdido y solo lectura: compositor deshabilitado con la razón visible, historial y borrador conservados, `conversacion_solo_lectura` sin recalcular la ventana, e indicador de actualización (hora de la última consulta correcta, desactualizada, resincronizando).
- [ ] 10. Implementar devolver al pool y marcar atendida: devolver con `liberarReclamo` y confirmación si hay borrador; marcar atendida como gesto separado del envío; tratamiento de `403` (no es el responsable) y `409` con recarga del detalle; `atendida_en` desde el detalle; `registrarReciboLeido` solo si el usuario es el reclamante. No hay selector de destino, override ni alerta, y ningún gesto sobre conversaciones ajenas.
- [ ] 11. Reemplazar el stub `routes/_private/conversaciones.tsx` por la feature real `BandejaConversaciones` (conversación abierta por parámetro de búsqueda), integrar estados con reintento, delegación de `401` al AppShell, avisos con `Toast`, anuncios accesibles de cambios de reclamo y de desactualización, y etiquetas/foco de los componentes compartidos.

## Verificación

- [ ] 12. Crear pruebas unitarias y de propiedades: `afordancias` (compositor por estado y reclamante, sin excepción por rol), `aplicarCambios` (idempotencia, orden por `secuencia`, sin duplicados, cobertura sin huecos con bootstrap + catch-ups), reutilización de `client_message_id`, uso de la versión vigente (nunca `0` fijo) y clasificación de errores del wrapper.
- [ ] 13. Crear pruebas de integración con MSW: reclamar y responder; reclamo concurrente con `409`; perder el reclamo con la conversación abierta (compositor deshabilitado, historial y borrador conservados); devolver al pool y reclamar por otro usuario simulado sin pérdida de historia; marcar atendida y que un mensaje nuevo del cliente la desmarque; `403` en devolver y en marcar atendida; `conversacion_solo_lectura`; `404` sin bandeja y `403` sin membresía; `401` delegado al AppShell; `409 stream_resync_required` y falla de polling.
- [ ] 14. Ejecutar `typecheck`, `lint`, `test` y `build:mock`, y verificar la ausencia de gestos excluidos (override, alerta, selector de destino, liberar o atender ajeno, vista previa, no leídos). Registrar en `BRECHAS.md` toda superficie que no permita demostrar el resultado requerido.

## Notes

### Notas de brechas

- **Brechas de la primera versión: cerradas** por DEC-116 a DEC-119 y DEC-122 (superficie en el `bff`, bandeja sin `{id}`, fila, tiempo real, `marcarAtendida`). La de nombres y destino de transferencia queda **diferida a V2** (DEC-119, DT-04).
- **Pin del contrato:** hoy `tracer.24`; la tarea 1 lo sube a `tracer.33` con aprobación explícita.
- **PR #41 de `mensajeria` (por mergearse):** `version_reclamo` monótona por conversación y `403` para quien no es el responsable al liberar, transferir o marcar atendida. Reverificar al mergearse.
- **`transferirConversacion`:** el contrato aún exige `responsable_destino_id`; en V1 la UI solo devuelve al pool con `liberarReclamo`. Confirmar con el dueño del `bff`.
- **`listarClientes` para `ejecutivo`:** DEC-118 lo asume; verificar en integración. Un cliente inactivo no aparece.
- **Historia técnica E8-T15 en contexto:** desactualizada (override, ruta con `{id}`, SSE). Las DEC prevalecen.
- **Pendientes de producto:** textos aprobados (conflicto de reclamo, reclamo perdido, solo lectura, autorización insuficiente) y cadencia del polling.
- **Fuera de alcance:** adjuntos (Q107), chat ejecutivo-a-ejecutivo (E3-T7, DEC-029), administración de membresía (E3-HU-034), conversación del cliente (E9), emergencias (E7, E8-T18), SSE (DT-01).
