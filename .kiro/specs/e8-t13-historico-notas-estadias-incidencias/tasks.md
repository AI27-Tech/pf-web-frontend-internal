# Implementation Plan: Histórico — notas, estadías e incidencias (E8-T13)

## Overview

Las tareas implementan el comportamiento funcional de E8-T13 (histórico append-only con notas, estadías e incidencias) y dejan la brecha de contrato aislada y servida con mocks, sin inventar superficies del `bff`. La tarea 1 es un prerrequisito de verificación, no una invitación a rellenar contrato.

## Task Dependency Graph

`1 → 2–11 → 12–14`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "dependsOn": [1] },
    { "id": 3, "tasks": [12, 13, 14], "dependsOn": [2] }
  ]
}
```

La tarea 1 verifica el contrato y la librería. Las tareas 2 a 11 implementan la lectura y los registros. Las tareas 12 a 14 verifican comportamiento, accesibilidad y contrato.

## Tasks

## Prerrequisito

- [ ] 1. Verificar el contrato y la librería instalados y aislar la brecha. **Hecho verificado (contra `@ai27-tech/contracts@0.1.0-tracer.20` y `@ai27-tech/ui@0.2.0-beta.6`):** el `bff` **no expone** `listarBitacora`, `registrarEntradaBitacora`, `abrirIncidencia`, `resolverIncidencia`, `listarEstadias`, `abrirEstadia` ni `cerrarEstadia`; existen solo en `operacion.yaml`. Crear `lib/contracts/historicoViaje.ts` con los tipos de wire esperados (ver `design.md` y `BRECHAS.md`), como punto único de reemplazo cuando el `bff` publique. No escribir clientes a mano como autoridad paralela. Registrar en `BRECHAS.md` la brecha de contrato y las de catálogo (tipo de entrada de bitácora y tipos internos de incidencia no tipados hoy).

## Implementación

- [ ] 2. Crear la ruta `/_private/viajes/$id/historico` bajo el detalle del viaje (E8-T8) y enlazarla desde el detalle, reutilizando la sesión y navegación existentes del panel interno.
- [ ] 3. Implementar `lib/api/historicoViaje.ts`: wrappers de las siete operaciones contra el contrato esperado, con clasificación de `409` por `codigo` (`condicion_ya_abierta`, `estadia_ya_cerrada`) y de `403` (autorización de corrección) en clases de error, sin reglas de dominio.
- [ ] 4. Implementar `useHistoricoViaje.ts`: consultas de bitácora, incidencias y estadías (`retry: false`), con estados diferenciados de carga, vacío y error, y mutaciones que invalidan la lectura correspondiente al confirmar.
- [ ] 5. Implementar `HistoricoViaje.tsx`: lista cronológica append-only con actor y marca de tiempo por entrada, **sin ningún gesto de editar ni borrar**, con estado vacío diferenciado.
- [ ] 6. Implementar `NotaForm.tsx`: captura de nota/observación con contenido obligatorio, envío por `registrarEntradaBitacora`, y aparición de la nueva entrada sin alterar las previas. El tipo de entrada (nota/observación) se ofrece como dato tipado solo si el catálogo está disponible; si no, queda como brecha (sin texto libre inventado).
- [ ] 7. Implementar `EstadiaForm.tsx`: apertura de estadía con `motivo` y `eje_autorizacion` tomados de los enums del contrato (sin texto libre), sin capturar el `inicio`. Envío por `abrirEstadia`.
- [ ] 8. Implementar el cierre de estadía por `cerrarEstadia` (cuerpo vacío) y `duracionEstadia.ts`: mostrar inicio, cierre y duración derivada (creciente mientras esté abierta), **sin rótulo `prolongada` ni umbral** (DEC-038).
- [ ] 9. Implementar `IncidenciaForm.tsx`: marcado de incidencia con `tipo_interno` (del catálogo disponible; si no, brecha) y descripción opcional, envío por `abrirIncidencia`, con representación de `en atención`, sin cambiar el estado de progreso y reconociendo el curado hacia el cliente por el `bff` (sin paso de publicación).
- [ ] 10. Implementar `visibilidadCorreccion.ts` y la resolución de incidencia: ofrecer resolver/cerrar solo a Supervisor/Coordinador por `resolverIncidencia`, reflejar `resuelta` agregando el cierre (no reescribir la apertura), y clasificar `403` como autorización insuficiente sin romper la vista.
- [ ] 11. Incorporar estados de carga, vacío y error con reintento, bloqueo de doble envío por cada registro, avisos de éxito y rechazo (`condicion_ya_abierta`, `estadia_ya_cerrada`, `403`) con `Toast`, delegación de `401`/sesión expirada al flujo del AppShell, y etiquetas/foco/estados accesibles de los componentes compartidos.

## Verificación

- [ ] 12. Crear pruebas unitarias: `duracionEstadia` (derivación y ausencia de clasificación), `visibilidadCorreccion` (gesto por rol), clasificación de errores del wrapper (`409`/`403`), y que la presentación no ofrece editar ni borrar.
- [ ] 13. Crear pruebas de integración con mocks (MSW): registrar nota y verla en el histórico sin alterar previas; abrir y cerrar estadía con duración derivada; segunda incidencia del mismo tipo rechazada con `condicion_ya_abierta`; resolución por Supervisor y `403` para Monitorista; sesión expirada delegada al AppShell.
- [ ] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas (`typecheck`, `lint`, build mock, suite completa), y marcar en `BRECHAS.md` cualquier superficie que no exista o no permita demostrar el resultado requerido.

## Notes

### Notas de brechas

- **Brecha de contrato (BLOQUEANTE):** las siete operaciones del histórico no existen en el `bff` (solo en `operacion.yaml`). Se construye contra el contrato esperado, aislado en `lib/contracts/historicoViaje.ts` y servido con mocks; reemplazo mecánico cuando el `bff` publique. No se inventa `/bitacora`, `/incidencias` ni `/estadias` del `bff`. Ver `BRECHAS.md`.
- **Brechas de catálogo:** el tipo de entrada de bitácora (nota/observación) y el catálogo de tipos internos de incidencia no están tipados como enum en el contrato verificado. La UI no inventa valores; mientras no haya catálogo publicado, el tipo de entrada y el tipo de incidencia quedan condicionados. Los motivos y ejes de estadía **sí** son enums cerrados verificados.
- **Rol efectivo:** la visibilidad del gesto de corregir/cerrar incidencia depende del rol de sesión; la autoridad final es el `403` del `bff`. Verificar cómo expone el panel el rol efectivo.
- **Brechas de `@ai27-tech/ui`:** verificar primitivas para la lista cronológica y los formularios; toda afordancia faltante se compone con primitivas y se registra como solicitud a la librería, no como componente local.
- **Mensajes:** verificar textos y códigos aprobados para `condicion_ya_abierta`, `estadia_ya_cerrada`, autorización insuficiente y contrato incompleto.
