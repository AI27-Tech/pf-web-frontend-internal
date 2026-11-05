# Implementation Plan: Emergencia, activación por monitoreo y bandeja de Reacción (E8-T18)

## Overview

Las tareas implementan E8-T18 en su alcance V1: bandeja de Reacción (lista, detalle, reclamo, devolución, resolución con nota, cierre) sobre la superficie `tracer.35` del `bff`, y el botón de emergencia con notas, selector de casos y cierre desde el viaje para el usuario de monitoreo sobre el carril por viaje de `tracer.37` (DEC-135). Las brechas 1 a 3 quedaron resueltas por el contrato (BRECHAS.md). **La transferencia dirigida queda fuera de V1** (DEC-134, DT-15); la tarea 14 se descarta. No se inventan superficies, campos ni componentes.

## Estado de avance

Sin iniciar. El pin vigente es `@ai27-tech/contracts@0.1.0-tracer.36`; la tarea 1 requiere subirlo a `tracer.37` con aprobación explícita. Las tareas 13 y 15 ya no están condicionadas al contrato; dependen de la tarea 1.

## Task Dependency Graph

`1 → 2 → 3–8 → 9 → 13, 15 → 10–12`. La tarea 14 está descartada de V1.

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2], "dependsOn": [1] },
    { "id": 3, "tasks": [3, 4, 5, 6, 7, 8], "dependsOn": [2] },
    { "id": 4, "tasks": [9, 13, 15], "dependsOn": [3] },
    { "id": 5, "tasks": [10, 11, 12], "dependsOn": [9, 13, 15] }
  ]
}
```

La tarea 1 sube el contrato y verifica la librería. La tarea 2 fija tipos y API. Las tareas 3 a 8 implementan lógica pura, hooks y flujos. La tarea 9 monta la ruta real; las tareas 13 y 15 montan el carril del monitoreo en el detalle del viaje. Las tareas 10 a 12 verifican.

## Tasks

## Prerrequisito

- [ ] 1. Subir el contrato y verificar lo instalado. **Requiere aprobación explícita.** Cambiar `@ai27-tech/contracts` de `0.1.0-tracer.36` a `0.1.0-tracer.37` y agregar `|| 0.1.0-tracer.37` a la entrada de `@ai27-tech/contracts` en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`. La ruptura de `crearIntencionSubidaAdjunto` (`nombre` obligatorio, desde `tracer.35`) ya está cubierta: `useEvidenciaViaje.ts` envía `nombre`. Instalar y confirmar en `bff.gen.ts` las ocho operaciones de la bandeja (`listarBandejaEmergencias`, `obtenerEmergencia`, `listarNotasEmergenciaPorId`, `reclamarEmergenciaPorId`, `liberarReclamoEmergenciaPorId`, `resolverEmergenciaPorId`, `cerrarEmergenciaPorId`, más `transferirEmergenciaPorId`, que no se usa) y las tres del monitoreo (`listarEmergenciasViaje`, `activarEmergenciaInterno`, `agregarNotaEmergenciaInterno`). Confirmar que `estados.esTerminal`/`ESTADOS_TERMINALES` están exportados (brecha 5). Verificar la API exacta de `Modal`, `Textarea`, `Badge`, `Toast`, `FilterTable`/`Table`, `Select` y `Button` en `@ai27-tech/ui@0.2.0-beta.6`. Probar que las ramas de `useTrabajoBandeja.ts` y `conversaciones.ts` (E8-T15) que comparan contra `conflicto_version_reclamo`, `conversacion_solo_lectura` y `stream_resync_required` ahora se ejecutan.

## Implementación

- [ ] 2. Crear `lib/contracts/emergencias.ts` (re-exporta de `@ai27-tech/contracts/openapi/bff`; sin tipos de wire a mano) y `lib/api/emergencias.ts` con las operaciones de la tarea 1, salvo `transferirEmergenciaPorId`. Clasificar errores (`401`, `403` en lectura y en acciones, `404`, `400` en resolver y notas, `409 conflicto_version_reclamo`, `409 emergencia_cerrada`, `409 viaje_en_estado_terminal`) por el `codigo` del contrato.
- [ ] 3. Implementar `afordancias.ts` (funciones puras): `puedeReclamar`, `puedeDevolver`, `puedeResolver`, `puedeCerrar`, `puedeActivar` y `puedeAnotar`, a partir de rol, `estado`, `reclamo_activo` y el sujeto de la sesión, sin calcular alcance ni ventanas. `puedeActivar` deriva los terminales de `esTerminal`, sin copiar la lista.
- [ ] 4. Implementar `actualizacion.ts` (interfaz de actualización con implementación de polling; cadencia desde configuración del cliente) y `BannerActualizacion.tsx` (hora de la última consulta correcta, desactualizada).
- [ ] 5. Implementar `useBandejaEmergencias.ts` y `ListaCasos.tsx`: bootstrap sin identificador de bandeja, polling que reemplaza la lista, paginación por `cursor_siguiente`, estado, origen, responsable ("Tú" / "otra persona" / sin reclamar) y `activada_en`; estados de carga, vacío, error y `sin_acceso` (403/404). Sin datos de viaje, cliente ni notas en la fila.
- [ ] 6. Implementar `useCasoEmergencia.ts` y `PanelCaso.tsx`: detalle con bloque de viaje (cliente, estado, origen, destinos, tipo de servicio, fecha, ETA), escolta con teléfonos cuando exista y texto neutro si no, notas en orden con paginación y marca de resolución, polling del detalle y de las notas. Sin ubicación, `viaje_id` ni enlaces al viaje.
- [ ] 7. Implementar `useAccionesCaso.ts`: reclamar (con `caso.version_reclamo`), devolver al pool con confirmación (con la versión del `reclamo_activo`), cierre con confirmación; bloqueo de doble envío, recarga ante `403`/`409` y sin reintento silencioso. No se implementa transferir (DEC-134).
- [ ] 8. Implementar `DialogoResolucion.tsx` y la acción de resolver: nota de 1 a 1.000 caracteres con recorte y contador, confirmación deshabilitada mientras sea inválida, conservación de la nota ante `400`, mensaje específico ante `403` y recarga ante `409`.
- [ ] 9. Reemplazar el stub `routes/_private/emergencias.tsx` por la feature real `BandejaEmergencias` (caso abierto por parámetro de búsqueda `caso`), con modo de consulta para `supervisor`/`coordinador` (sin reclamar ni resolver), delegación de `401` al AppShell, avisos con `Toast`, anuncios accesibles de cambios de estado y reclamo, y etiquetas/foco de los componentes compartidos. Verificar que `reaccion` no ve entradas al viaje, bitácora, incidencias ni conversación.

## Verificación

- [ ] 10. Crear pruebas unitarias y de propiedades: `afordancias` (P2), versión enviada por operación (P1), validación de nota (P4), clasificación de errores del wrapper, ausencia de campos prohibidos en el render (P5), conservación ante falla de polling (P6) y salida de casos `cerrada` (P7).
- [ ] 11. Crear pruebas de integración con MSW: bandeja con casos y vacía; `403`/`404` sin acceso; reclamar y `409`; devolver al pool; resolver con nota válida y con `400`; resolver como no responsable (`403`); cerrar con `200`, `403` y `409`; detalle con y sin escolta; falla de polling con acciones operativas; `401` delegado al AppShell; activación (`201`, `200` por reentrega, `403`, `409 viaje_en_estado_terminal`); nota (`201`, `400`, `403`, `409 emergencia_cerrada`); lista de casos del viaje con un `cerrada` que la UI no ofrece. Crear fixtures y handlers en `src/mocks` siguiendo el patrón existente.
- [ ] 12. Ejecutar `typecheck`, `lint`, `test` y `build:mock`, y verificar la ausencia de gestos excluidos (reclamar o resolver para supervisor/coordinador, notas de Reacción, cierre por Reacción, ubicación, enlaces al viaje). Registrar en `BRECHAS.md` toda superficie que no permita demostrar el resultado requerido.

## Carril del monitoreo en el detalle del viaje (contrato publicado en tracer.37)

- [ ] 13. Implementar `AccionEmergencia.tsx` y `useActivarEmergencia.ts` en el detalle del viaje (E8-T8) sobre `activarEmergenciaInterno`: botón visible solo para `monitorista`/`supervisor`/`coordinador` en estados no terminales (`esTerminal`), `activacion_id` generado por pulsación y reutilizado en el reintento, bloqueo de doble clic de la misma pulsación, aviso de éxito (`201` y `200`) con oferta opcional de nota, tratamiento de `403` y `409 viaje_en_estado_terminal`. Pruebas P3 e integración (escenarios 1, 2, 8, 9 y 10). Usar `esTerminal` en los handlers de `src/mocks` en lugar de la lista copiada a mano.
- [ ] 14. **Descartada de V1 (DEC-134, DT-15).** Transferir con selector de destino. No hay lectura de integrantes de Reacción; `transferirEmergenciaPorId` queda en el contrato pero el panel no ofrece el botón. Se retoma en V2.
- [ ] 15. Implementar `SelectorCaso.tsx` (`listarEmergenciasViaje`; fecha y hora de activación, sin notas ni personal; sin casos `cerrada`) y `NotaEmergencia.tsx` (`agregarNotaEmergenciaInterno`, 1 a 1.000 caracteres, recorte, contador, texto conservado ante `409 emergencia_cerrada`), y el cierre desde el detalle del viaje sobre casos `resuelta` con `cerrarEmergenciaPorId`. Visible para `monitorista`, `supervisor`, `coordinador` y `administrador`; el `administrador` no ve el botón de activar (DEC-045 #9). Pruebas de integración (escenarios 7, 14 y 18).

## Notes

### Notas de brechas

- **Brechas 1 a 3:** resueltas en `tracer.37` (DEC-135). Las tareas 13 y 15 ya no están condicionadas.
- **Brecha 4:** transferencia dirigida diferida a V2 (DEC-134, DT-15). Tarea 14 descartada; devolver al pool cubre el mínimo.
- **Brecha 5:** resuelta con `esTerminal`/`ESTADOS_TERMINALES` del paquete generado; confirmar la exportación en la tarea 1.
- **Discrepancia 6:** resuelta (error de redacción). Interno sin acceso: `403`; la UI sigue tratando `403` y `404` igual.
- **Pin del contrato:** `tracer.37` requiere aprobación; `crearIntencionSubidaAdjunto` ya envía `nombre`.
- **Deuda del backend (sin acción aquí):** alcance por unidad del monitoreo (DT-07) y carrera de activación frente a viaje terminal (DT-16).- **Historia técnica E8-T18 en contexto:** desactualizada ("contrato por congelar", SSE). Las DEC y el contrato prevalecen.
- **Pendientes de producto:** textos aprobados y cadencia del polling; dónde ve el `administrador` el selector de casos (lista, anota y cierra, pero no activa).
- **Fuera de alcance:** activación por cliente (E9), ubicación, escalamiento automático (V2), relación de mando (DT-06), incidencia desde emergencia (E8-T13), SSE (DT-01).
