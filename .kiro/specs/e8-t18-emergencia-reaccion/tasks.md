# Implementation Plan: Emergencia, activación por monitoreo y bandeja de Reacción (E8-T18)

## Overview

Las tareas implementan E8-T18 en su alcance V1: bandeja de Reacción (lista, detalle, reclamo, devolución, resolución con nota, cierre) sobre la superficie `tracer.35` del `bff`, y el botón de emergencia con notas para el usuario de monitoreo. **La activación interna, las notas internas y el listado de casos por viaje no existen en el contrato** (BRECHAS.md, brechas 1 a 3); esas tareas están marcadas como condicionadas y no se ejecutan hasta que el contrato las publique. La transferencia depende de la brecha 4. No se inventan superficies, campos ni componentes.

## Estado de avance

Sin iniciar. El pin vigente es `@ai27-tech/contracts@0.1.0-tracer.33`; la tarea 1 requiere subirlo a `tracer.35` con aprobación explícita.

## Task Dependency Graph

`1 → 2 → 3–8 → 9 → 10–12`; las tareas 13 a 15 (condicionadas) dependen de la publicación del contrato.

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2], "dependsOn": [1] },
    { "id": 3, "tasks": [3, 4, 5, 6, 7, 8], "dependsOn": [2] },
    { "id": 4, "tasks": [9], "dependsOn": [3] },
    { "id": 5, "tasks": [10, 11, 12], "dependsOn": [9] }
  ]
}
```

La tarea 1 sube el contrato y verifica la librería. La tarea 2 fija tipos y API. Las tareas 3 a 8 implementan lógica pura, hooks y flujos. La tarea 9 monta la ruta real. Las tareas 10 a 12 verifican.

## Tasks

## Prerrequisito

- [ ] 1. Subir el contrato y verificar lo instalado. **Requiere aprobación explícita.** Cambiar `@ai27-tech/contracts` de `0.1.0-tracer.33` a `0.1.0-tracer.35` y agregar `|| 0.1.0-tracer.35` a la entrada de `@ai27-tech/contracts` en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`. Antes de subir, buscar usos de `crearIntencionSubidaAdjunto` (ruptura de `tracer.35`). Instalar y confirmar en `bff.gen.ts` las operaciones `listarBandejaEmergencias`, `obtenerEmergencia`, `listarNotasEmergenciaPorId`, `reclamarEmergenciaPorId`, `liberarReclamoEmergenciaPorId`, `transferirEmergenciaPorId`, `resolverEmergenciaPorId` y `cerrarEmergenciaPorId`. Confirmar si el enum de estados de viaje permite derivar los terminales (brecha 5). Verificar la API exacta de `Modal`, `Textarea`, `Badge`, `Toast`, `FilterTable`/`Table`, `Select` y `Button` en `@ai27-tech/ui@0.2.0-beta.6`. Revisar si el contrato publicó ya las operaciones de las brechas 1 a 4 y actualizar `BRECHAS.md`.

## Implementación

- [ ] 2. Crear `lib/contracts/emergencias.ts` (re-exporta de `@ai27-tech/contracts/openapi/bff`; sin tipos de wire a mano) y `lib/api/emergencias.ts` con las ocho operaciones de la tarea 1. Clasificar errores (`401`, `403` en lectura y en acciones, `404`, `400` en resolver, `409 conflicto_version_reclamo`, `409 emergencia_cerrada`, `409 viaje_en_estado_terminal`).
- [ ] 3. Implementar `afordancias.ts` (funciones puras): `puedeReclamar`, `puedeDevolver`, `puedeTransferir`, `puedeResolver`, `puedeCerrar` y `puedeActivar`, a partir de rol, `estado`, `reclamo_activo` y el sujeto de la sesión, sin calcular alcance ni ventanas.
- [ ] 4. Implementar `actualizacion.ts` (interfaz de actualización con implementación de polling; cadencia desde configuración del cliente) y `BannerActualizacion.tsx` (hora de la última consulta correcta, desactualizada).
- [ ] 5. Implementar `useBandejaEmergencias.ts` y `ListaCasos.tsx`: bootstrap sin identificador de bandeja, polling que reemplaza la lista, paginación por `cursor_siguiente`, estado, origen, responsable ("Tú" / "otra persona" / sin reclamar) y `activada_en`; estados de carga, vacío, error y `sin_acceso` (403/404). Sin datos de viaje, cliente ni notas en la fila.
- [ ] 6. Implementar `useCasoEmergencia.ts` y `PanelCaso.tsx`: detalle con bloque de viaje (cliente, estado, origen, destinos, tipo de servicio, fecha, ETA), escolta con teléfonos cuando exista y texto neutro si no, notas en orden con paginación y marca de resolución, polling del detalle y de las notas. Sin ubicación, `viaje_id` ni enlaces al viaje.
- [ ] 7. Implementar `useAccionesCaso.ts`: reclamar (con `caso.version_reclamo`), devolver al pool con confirmación (con la versión del `reclamo_activo`), cierre con confirmación; bloqueo de doble envío, recarga ante `403`/`409` y sin reintento silencioso. Transferir solo si la tarea 14 está habilitada.
- [ ] 8. Implementar `DialogoResolucion.tsx` y la acción de resolver: nota de 1 a 1.000 caracteres con recorte y contador, confirmación deshabilitada mientras sea inválida, conservación de la nota ante `400`, mensaje específico ante `403` y recarga ante `409`.
- [ ] 9. Reemplazar el stub `routes/_private/emergencias.tsx` por la feature real `BandejaEmergencias` (caso abierto por parámetro de búsqueda `caso`), con modo de consulta para `supervisor`/`coordinador` (sin reclamar ni resolver), delegación de `401` al AppShell, avisos con `Toast`, anuncios accesibles de cambios de estado y reclamo, y etiquetas/foco de los componentes compartidos. Verificar que `reaccion` no ve entradas al viaje, bitácora, incidencias ni conversación.

## Verificación

- [ ] 10. Crear pruebas unitarias y de propiedades: `afordancias` (P2), versión enviada por operación (P1), validación de nota (P4), clasificación de errores del wrapper, ausencia de campos prohibidos en el render (P5), conservación ante falla de polling (P6) y salida de casos `cerrada` (P7).
- [ ] 11. Crear pruebas de integración con MSW: bandeja con casos y vacía; `403`/`404` sin acceso; reclamar y `409`; devolver al pool; resolver con nota válida y con `400`; resolver como no responsable (`403`); cerrar con `200`, `403` y `409`; detalle con y sin escolta; falla de polling con acciones operativas; `401` delegado al AppShell. Crear fixtures y handlers en `src/mocks` siguiendo el patrón existente.
- [ ] 12. Ejecutar `typecheck`, `lint`, `test` y `build:mock`, y verificar la ausencia de gestos excluidos (reclamar o resolver para supervisor/coordinador, notas de Reacción, cierre por Reacción, ubicación, enlaces al viaje). Registrar en `BRECHAS.md` toda superficie que no permita demostrar el resultado requerido.

## Condicionadas al contrato (no ejecutar hasta que se publique)

- [ ] 13. **Condicionada a brechas 1 y 5.** Implementar `AccionEmergencia.tsx` y `useActivarEmergencia.ts` en el detalle del viaje (E8-T8): botón visible solo para `monitorista`/`supervisor`/`coordinador` en estados no terminales, `activacion_id` generado por pulsación y reutilizado en el reintento, bloqueo de doble clic de la misma pulsación, aviso de éxito con oferta opcional de nota, tratamiento de `403` y `409 viaje_en_estado_terminal`. Pruebas P3 e integración (escenarios 1, 2, 8, 9 y 10).
- [ ] 14. **Condicionada a brecha 4.** Implementar transferir con selector de destino (`Select`) y `motivo` opcional, usando la versión del `reclamo_activo`. Pruebas de integración de transferencia conservando el estado.
- [ ] 15. **Condicionada a brechas 2 y 3.** Implementar `SelectorCaso.tsx` (fecha y hora de activación, sin notas ni personal) y `NotaEmergencia.tsx` (1 a 1.000 caracteres, recorte, contador, texto conservado ante `409 emergencia_cerrada`), y el cierre desde el detalle del viaje sobre casos `resuelta`. Pruebas de integración (escenarios 7, 14 y 18).

## Notes

### Notas de brechas

- **Brechas 1 a 3 (contrato):** activación interna, notas internas y listado de casos por viaje no existen en `tracer.35`. Tareas 13 y 15 condicionadas.
- **Brecha 4 (contrato):** sin lista de integrantes de Reacción no hay destino de transferencia. Tarea 14 condicionada; devolver al pool funciona sin ella.
- **Brecha 5:** estados terminales del viaje a confirmar en la tarea 1.
- **Discrepancia 6:** `404` vs `403` en la bandeja para otro rol; la UI trata ambos como acceso no autorizado.
- **Pin del contrato:** `tracer.35` requiere aprobación; revisar la ruptura de `crearIntencionSubidaAdjunto`.
- **Historia técnica E8-T18 en contexto:** desactualizada ("contrato por congelar", SSE). Las DEC y el contrato prevalecen.
- **Pendientes de producto:** textos aprobados y cadencia del polling; botón y cierre para `administrador`.
- **Fuera de alcance:** activación por cliente (E9), ubicación, escalamiento automático (V2), relación de mando (DT-06), incidencia desde emergencia (E8-T13), SSE (DT-01).
