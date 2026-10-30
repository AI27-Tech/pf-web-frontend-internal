# Implementation Plan: Bandeja de conversaciones (E8-T15)

## Overview

Las tareas implementan el comportamiento funcional de E8-T15: bandeja compartida con reclamo exclusivo, lectura del historial, respuesta, liberación, transferencia y actualización viva (sin override ni alerta: DEC-107 y DEC-108). **Hay brechas de contrato abiertas** (ver `BRECHAS.md`): el `bff` no expone todavía la superficie de conversación interna (Brecha 1), por lo que la capa de API se escribe contra los tipos de `mensajeria` con el prefijo de ruta como un único punto de cambio y se verifica con mocks MSW. Las tareas que dependen de una brecha están marcadas y no se publican contra el `bff` real hasta que se cierre. No se inventan superficies, campos ni componentes.

## Estado de avance

**Sin iniciar.** El spec está escrito; no hay código. La ruta `/conversaciones` es un stub (E8-T4).

## Task Dependency Graph

`1 → 2 → 3–11 → 12–14`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2], "dependsOn": [1] },
    { "id": 3, "tasks": [3, 4, 5, 6, 7, 8, 9, 10, 11], "dependsOn": [2] },
    { "id": 4, "tasks": [12, 13, 14], "dependsOn": [3] }
  ]
}
```

La tarea 1 verifica contrato y librería. La tarea 2 fija las capas de tipos y API. Las tareas 3 a 11 implementan la vista y los flujos. Las tareas 12 a 14 verifican comportamiento, accesibilidad y contrato.

## Tasks

## Prerrequisito

- [ ] 1. Verificar el contrato instalado, la librería y las brechas abiertas. Confirmar contra `@ai27-tech/contracts@0.1.0-tracer.22` (y el último tracer publicado) si el `bff` ya expone `bandejas`, `conversaciones`, `reclamos` y `transferencias`; confirmar los tipos de `mensajeria.gen.ts` y de `realtime.gen.ts`; verificar la API exacta de `MessagePanel`, `MessageList`, `MessageBubble`, `MessageComposer`, `Modal` y `FilterTable` en `@ai27-tech/ui@0.2.0-beta.6`. Actualizar `BRECHAS.md` con lo que haya cambiado. No subir el pin del `package.json` sin que se pida.

## Implementación

- [ ] 2. Crear `lib/contracts/conversaciones.ts` (re-exporta los tipos generados; sin tipos de wire a mano) y `lib/api/conversaciones.ts` con las operaciones `listarTrabajoBandeja`, `obtenerConversacion`, `listarMensajes`, `enviarMensaje`, `reclamarConversacion`, `liberarReclamo`, `transferirConversacion`, `marcarAtendida`, con el prefijo de ruta en un único punto de cambio y clasificación de errores (`401`, `403`, `404`, `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura`, `409 stream_resync_required`). _(Condicionado: Brecha 1.)_
- [ ] 3. Implementar `afordancias.ts` (funciones puras): `puedeReclamar`, `puedeResponder`, `puedeLiberar`, `puedeTransferir` y `razonCompositor`, a partir de `estado`, `reclamo_activo`, sujeto y rol de sesión, sin calcular ventanas de tiempo.
- [ ] 4. Implementar `useTrabajoBandeja.ts` y `ListaTrabajo.tsx`: bootstrap con `revision`, paginación por cursor sin confundirlo con `revision`, distinción visual de pool / mía / de otra persona, estados de carga, vacío, error y sin acceso. No se muestran vista previa ni conteo de no leídos. _(Condicionado: Brechas 2 y 4.)_
- [ ] 5. Implementar `useConversacion.ts` y `PanelConversacion.tsx` sobre `MessagePanel`/`MessageList`/`MessageBubble`: detalle, historial ordenado por `secuencia`, carga hacia atrás, autor y rol al enviar, estado `404` sin distinguir causa, estado vacío y sin adjuntos ni edición.
- [ ] 6. Implementar el reclamo en `AccionesReclamo.tsx`: reclamar con la `version_esperada` vigente, bloqueo de doble envío, conflicto `409 conflicto_version_reclamo` con aviso del ganador y recarga, sin reintento silencioso.
- [ ] 7. Implementar el envío de respuesta con `MessageComposer`: `client_message_id` generado en el cliente y reutilizado en el reintento, `version_reclamo_esperada`, cuerpo no vacío, conservación del borrador ante `403`/`409`, y la regla de `marcarAtendida` una vez verificada con Mensajería.
- [ ] 8. Implementar `BannerEstado.tsx` y el comportamiento de reclamo perdido y solo lectura: compositor deshabilitado con la razón visible, historial conservado, borrador conservado, y `conversacion_solo_lectura` sin recalcular la ventana.
- [ ] 9. Implementar liberar y `TransferirDialogo.tsx`: liberar con confirmación si hay borrador; transferir con selección de destino de la lista que entregue el `bff` y motivo opcional, sin estado intermedio, y recarga ante `409`. _(La transferencia queda condicionada a la Brecha 3: sin lista de miembros no se puede poblar el destino.)_
- [ ] 10. Verificar la exclusión de override y alerta en V1 (DEC-107, DEC-108): ningún envío incluye `motivo_override`, ningún rol ve gesto de override y no se muestra alerta de mensaje pendiente. No se construye `OverrideDialogo` ni la alerta; si las DEC se reabren, se cambia el spec.
- [ ] 11. Implementar `aplicarDelta.ts`, `useStreamVivo.ts` y `lib/api/stream.ts`: bootstrap → apertura sin selector → catch-up con buffer → modo vivo, deduplicación por `evento_id`, orden por secuencia de dominio, repetición de bootstrap ante `409 stream_resync_required`, degradación a recuperación HTTP ante `stream.stale` y marca de frescura visible. La parte viva queda condicionada a los frames publicados; la recuperación HTTP se entrega completa. _(Condicionado: Brecha 5.)_
- [ ] 12. Reemplazar el stub `routes/_private/conversaciones.tsx` por la feature real `BandejaConversaciones` (conversación abierta por parámetro de búsqueda), integrar estados de carga/vacío/error con reintento, delegación de `401` al AppShell, avisos con `Toast`, anuncios accesibles de cambios de reclamo y pérdida de frescura, y etiquetas/foco de los componentes compartidos.

## Verificación

- [ ] 13. Crear pruebas unitarias y de propiedades: `afordancias` (compositor por estado y reclamante, sin excepción por rol), `aplicarDelta` (idempotencia, orden por `secuencia`, deduplicación por `evento_id`, exactamente una vez con bootstrap + catch-up + buffer), reutilización de `client_message_id`, uso de la versión vigente y clasificación de errores del wrapper.
- [ ] 14. Crear pruebas de integración con MSW: reclamar y responder; reclamo concurrente con `409` y ganador visible; perder el reclamo con la conversación abierta (compositor deshabilitado, historial y borrador conservados); liberar; transferir entre dos usuarios simulados sin pérdida de historia; `conversacion_solo_lectura`; `403` sin membresía; `401` delegado al AppShell; `409 stream_resync_required` y `stream.stale` con recuperación HTTP. Ejecutar `typecheck`, `lint`, `test` y `build:mock`, y registrar en `BRECHAS.md` toda superficie que no permita demostrar el resultado requerido.

## Notes

### Notas de brechas

- **Superficie en el `bff` (Brecha 1):** el `bff` (`tracer.22` a `tracer.24`) no expone la conversación interna; existe solo en `mensajeria.yaml`. `bff.md` y `mensajeria.yaml` difieren en las rutas. Bloquea publicar contra el `bff` real.
- **Bandeja del usuario (Brecha 2, parcial por DEC-103), nombres y miembros (Brecha 3), datos de fila (Brecha 4):** sin resolver. Condicionan las tareas 4, 5 y 9.
- **Stream (Brecha 5, parcial):** host y bearer están resueltos; falta la codificación de frames y los eventos de control. La tarea 11 entrega la rebanada HTTP completa y deja el stream detrás de una interfaz.
- **Alerta y override (Brechas 6 y 7): cerradas para V1** por DEC-108 y DEC-107; no hay superficie que esperar.
- **Pendientes de verificación antes de implementar:** regla de `marcarAtendida` (si responder lo implica); textos aprobados para conflicto, reclamo perdido, solo lectura y autorización insuficiente.
- **Contrato fijado:** `package.json` fija `tracer.22`; el último publicado es `tracer.24`. No se sube sin que se pida.
- **Fuera de alcance:** adjuntos (Q107), chat ejecutivo-a-ejecutivo (E3-T7, DEC-029), administración de membresía (E3-HU-034), conversación del cliente (E9), emergencias (E7).
