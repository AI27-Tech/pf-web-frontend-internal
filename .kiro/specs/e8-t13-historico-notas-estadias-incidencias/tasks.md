# Implementation Plan: Histórico — notas, estadías e incidencias (E8-T13)

## Overview

Las tareas implementan el comportamiento funcional de E8-T13 (histórico append-only con notas, estadías e incidencias). Todas las brechas de contrato quedaron resueltas (ver `BRECHAS.md`): la escritura/lectura de bitácora y estadías y el abrir/resolver de incidencias llegaron en `tracer.21`, y la **lectura de incidencias (`listarIncidencias`) en `tracer.22`**. `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.22`. Las ocho operaciones y sus schemas están verificados en el contrato instalado (`node_modules/@ai27-tech/contracts/.../openapi/bff.gen.ts`). No se inventan superficies del `bff`.

## Estado de avance (actualizado 2026-10-29)

**Implementación completa, sin pendientes externos.** Las 14 tareas están hechas; el código vive en el working tree **sin commitear** (el commit de rama `da986e1` solo tocó documentos del spec).

- **Hecho:** capa de tipos consumiendo los generados de `tracer.22` (T1), wrappers de API con clasificación de errores (T3), hook de queries/mutaciones (T4), vista completa `HistoricoViaje` con lista append-only, formularios `NotaForm`/`EstadiaForm`/`IncidenciaForm`, cierre de estadía, resolución de incidencia por rol, estados de carga/vacío/error y toasts (T2, T5–T11), helpers `duracionEstadia` (T8) y `visibilidadCorreccion` (T10), ruta real montando la feature, mocks MSW cableados, y pruebas unitarias + de integración (T12–T13).
- **Contrato al día:** `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.22`. Las ocho operaciones del histórico (incluida la lectura de incidencias, `listarIncidencias`) están publicadas y el frontend las consume. `lib/contracts/historicoViaje.ts` usa los tipos generados.
- **Todas las brechas cerradas:** la última (lectura `GET` de incidencias) se resolvió en `tracer.22`. El hook `useHistoricoViaje` lee las incidencias con `useQuery` sobre `listarIncidencias` (ya no usa estado de sesión); el histórico de incidencias previas es observable y hay prueba que lo cubre. Ver `BRECHAS.md`.

Validaciones al día de hoy: `typecheck` ✓, `lint` ✓, `test` ✓ (157/157, 15 de T13), `build:mock` ✓.

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

- [x] 1. Verificar el contrato instalado y aislar la capa de tipos. **Estado verificado (2026-10-29):** `tracer.22` está publicado e instalado (`node_modules/@ai27-tech/contracts@0.1.0-tracer.22`) y `package.json` fija ese pin. El `bff` expone las ocho operaciones del histórico con todos sus schemas (`bitacora` listar/registrar, `estadias` listar/abrir/cerrar, `incidencias` listar/abrir/resolver, códigos `409 condicion_ya_abierta`/`estadia_ya_cerrada`, `403`, estado `en_atencion|resuelta`) — verificado en `bff.gen.ts`. `lib/contracts/historicoViaje.ts` es la capa de aislamiento y **consume los tipos generados** (no reafirma schemas a mano). **Catálogos decididos (no inventar):** bitácora es solo `{ texto }` en V1 (sin tipo de entrada); `tipo_interno` de incidencia es `string` en V1 (enum en ola posterior). Ver `BRECHAS.md`.

## Implementación

- [x] 2. Crear la ruta `/_private/viajes/$id/historico` bajo el detalle del viaje (E8-T8) y enlazarla desde el detalle, reutilizando la sesión y navegación existentes del panel interno. **Hecho:** `routes/_private/viajes/$id/historico.tsx` monta la feature real `HistoricoViaje` pasando `id` de `Route.useParams()` (ya no es placeholder); el enlace "Ver histórico del viaje" vive en `DetalleViaje.tsx` y el árbol de rutas (`routeTree.gen.ts`) está regenerado con la ruta anidada.
- [x] 3. Implementar `lib/api/historicoViaje.ts`: wrappers de las siete operaciones contra el contrato esperado, con clasificación de `409` por `codigo` (`condicion_ya_abierta`, `estadia_ya_cerrada`) y de `403` (autorización de corrección) en clases de error, sin reglas de dominio. **Hecho:** las 7 funciones y las clases `ErrorCondicionYaAbierta`/`ErrorEstadiaYaCerrada`/`ErrorAutorizacionInsuficiente` están implementadas.
- [x] 4. Implementar `useHistoricoViaje.ts`: consultas de bitácora, incidencias y estadías (`retry: false`), con estados diferenciados de carga, vacío y error, y mutaciones que invalidan la lectura correspondiente al confirmar. **Hecho**, con una salvedad: la query de incidencias está deshabilitada (`enabled: false`, stub vacío) porque el contrato no publica `listarIncidencias` (solo abrir/resolver) — revisar al construir la vista.
- [x] 5. Implementar `HistoricoViaje.tsx`: lista cronológica append-only con actor y marca de tiempo por entrada, **sin ningún gesto de editar ni borrar**, con estado vacío diferenciado. **Hecho:** `HistoricoViaje.tsx` compone la vista; `BitacoraLista` muestra cada entrada con autor y marca de tiempo, sin controles de editar/borrar, con estado vacío diferenciado del de carga y error.
- [x] 6. Implementar `NotaForm.tsx`: captura de nota con contenido obligatorio, envío por `registrarEntradaBitacora`, y aparición de la nueva entrada sin alterar las previas. **V1: solo `{ texto }`, sin campo de tipo de entrada** (decidido, no hay catálogo nota/observación; ver `BRECHAS.md`). Si Producto define el catálogo más adelante, se agrega el selector tipado como ola posterior. **Hecho:** `NotaForm.tsx` captura solo texto (obligatorio), envía por `registrarEntradaBitacora` vía el hook e invalida la lectura; la prueba de integración confirma que la nueva nota aparece sin alterar las previas.
- [x] 7. Implementar `EstadiaForm.tsx`: apertura de estadía con `motivo` y `eje_autorizacion` tomados de los enums del contrato (sin texto libre), sin capturar el `inicio`. Envío por `abrirEstadia`. **Hecho:** `EstadiaForm.tsx` usa `Select` con los enums `MotivoEstadia`/`EjeAutorizacionEstadia` del contrato (sin texto libre), no captura `inicio`, y envía por `abrirEstadia`.
- [x] 8. Implementar el cierre de estadía por `cerrarEstadia` (cuerpo vacío) y `duracionEstadia.ts`: mostrar inicio, cierre y duración derivada (creciente mientras esté abierta), **sin rótulo `prolongada` ni umbral** (DEC-038). **Hecho:** `EstadiasLista` en `HistoricoViaje.tsx` muestra inicio/cierre y la duración derivada por `duracionEstadia` (formateada a `Xh Ym`, sin rótulo), con botón "Cerrar estadía" solo mientras está abierta.
- [x] 9. Implementar `IncidenciaForm.tsx`: marcado de incidencia con `tipo_interno` como **texto en V1** (string, sin selector cerrado: el enum curado llega en ola posterior, DEC-105; no inventar los ~20 valores de DEC-003) y descripción opcional, envío por `abrirIncidencia`, con representación de `en_atencion`, sin cambiar el estado de progreso y reconociendo el curado hacia el cliente por el `bff` (sin paso de publicación). **Hecho:** `tipo_interno` es un `Input` de texto (no selector), descripción opcional, y `IncidenciasLista` representa `en_atencion`/`resuelta` con `Badge`.
- [x] 10. Implementar `visibilidadCorreccion.ts` y la resolución de incidencia: ofrecer resolver/cerrar solo a Supervisor/Coordinador por `resolverIncidencia`, reflejar `resuelta` agregando el cierre (no reescribir la apertura), y clasificar `403` como autorización insuficiente sin romper la vista. **Hecho:** el gesto "Resolver incidencia" solo aparece si `puedeCorregirIncidencia(rol)`; al resolver se agrega el cierre (no se reescribe la apertura) y el `403` se clasifica como `ErrorAutorizacionInsuficiente` con aviso, sin romper la vista.
- [x] 11. Incorporar estados de carga, vacío y error con reintento, bloqueo de doble envío por cada registro, avisos de éxito y rechazo (`condicion_ya_abierta`, `estadia_ya_cerrada`, `403`) con `Toast`, delegación de `401`/sesión expirada al flujo del AppShell, y etiquetas/foco/estados accesibles de los componentes compartidos. **Hecho:** cada lista tiene carga/vacío/error con reintento; cada formulario bloquea doble envío (`useRef` + `loading`); los toasts cubren éxito y los rechazos; `esNoAutorizado` delega al AppShell; se usan `FormField`/`Form`/`Button` accesibles de la librería.

## Verificación

- [x] 12. Crear pruebas unitarias: `duracionEstadia` (derivación y ausencia de clasificación), `visibilidadCorreccion` (gesto por rol), clasificación de errores del wrapper (`409`/`403`), y que la presentación no ofrece editar ni borrar. **Hecho:** `tests/viajes/historicoViaje.unit.test.ts` (9 casos) cubre derivación de duración sin rótulo, gesto por rol, y clasificación de `condicion_ya_abierta`/`estadia_ya_cerrada`/`403`. La ausencia de editar/borrar se verifica en el test de integración (T13).
- [x] 13. Crear pruebas de integración con mocks (MSW): registrar nota y verla en el histórico sin alterar previas; abrir y cerrar estadía con duración derivada; segunda incidencia del mismo tipo rechazada con `condicion_ya_abierta`; resolución por Supervisor y `403` para Monitorista; sesión expirada delegada al AppShell. **Hecho:** `tests/viajes/HistoricoViaje.test.tsx` (5 casos) cubre nota append-only, apertura/cierre de estadía con duración derivada, segunda incidencia rechazada con `condicion_ya_abierta`, resolución por Supervisor y ausencia del gesto para Monitorista, y que la vista no ofrece editar ni borrar. **Salvedad:** la delegación de `401`/sesión expirada al AppShell está implementada (`esNoAutorizado` → `DelegacionSesion`) y cubierta por unidad en el wrapper; no se añadió un caso de integración 401 dedicado, dado que el corte de sesión lo gobierna el cliente/AppShell y ya tiene su propia cobertura en el repo.
- [x] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas (`typecheck`, `lint`, build mock, suite completa), y marcar en `BRECHAS.md` cualquier superficie que no exista o no permita demostrar el resultado requerido. **Hecho:** `typecheck` ✓, `lint` ✓, `test` ✓ (156/156, 14 nuevas de T13), `build:mock` ✓ (genera el chunk `historico-*.js`). La única superficie faltante del contrato (lectura `GET` de incidencias) quedó registrada en `BRECHAS.md` y la vista no la inventa.

## Notes

### Notas de brechas

- **Contrato del histórico (RESUELTO y PUBLICADO):** `tracer.22` está publicado e instalado y `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.22`. Las **ocho** operaciones del histórico —bitácora (listar/registrar), estadías (listar/abrir/cerrar) e incidencias (listar/abrir/resolver)— están verificadas en el contrato generado (`bff.gen.ts`). `lib/contracts/historicoViaje.ts` consume los tipos generados. La lectura de incidencias (`listarIncidencias`) llegó en `tracer.22` y cerró la última brecha; la vista la consume con `useQuery`. Ver `BRECHAS.md`.
- **Catálogos (DECIDIDOS):** bitácora es solo `{ texto }` en V1, sin tipo de entrada (no hay catálogo nota/observación). `tipo_interno` de incidencia es `string` en V1; el enum curado es una ola aditiva posterior (DEC-105), aunque la lista exista en DEC-003 §2. La UI **no inventa** esos valores. Los motivos y ejes de estadía **sí** son enums cerrados verificados.
- **Rol efectivo:** la visibilidad del gesto de corregir/cerrar incidencia depende del rol de sesión; la autoridad final es el `403` del `bff`. Verificar cómo expone el panel el rol efectivo.
- **Brechas de `@ai27-tech/ui`:** verificar primitivas para la lista cronológica y los formularios; toda afordancia faltante se compone con primitivas y se registra como solicitud a la librería, no como componente local.
- **Mensajes:** verificar textos y códigos aprobados para `condicion_ya_abierta`, `estadia_ya_cerrada`, autorización insuficiente y contrato incompleto.
