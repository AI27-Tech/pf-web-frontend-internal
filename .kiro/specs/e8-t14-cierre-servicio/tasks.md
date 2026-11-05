# Implementation Plan: Cierre del servicio (E8-T14)

## Overview

Las tareas implementan el cierre del servicio en el detalle del viaje: acción dedicada "Cerrar servicio", motivo obligatorio (`normal` o `por_incidencia`), cierre anticipado solo por incidencia, comunicación de la ventana de escritura y manejo de resultados. No hay operación nueva del `bff`: se reutiliza `transicionarViaje`, ahora con `motivo_cierre` tipado (`tracer.24`, DEC-113). No se inventan superficies del `bff` ni componentes locales.

Las brechas 1, 2, 3 y 6 están cerradas (ver `BRECHAS.md`). Las tareas 1 a 10 se pueden ejecutar completas con el contrato publicado. La última ola (11 a 14) agrupa lo que sigue dependiendo de terceros: la fecha exacta de la ventana (Producto), los códigos de 409 en runtime y el 403 real (plataforma, diferidos), la decisión del senior sobre el 401 y la validación de textos. Esas tareas no bloquean el cierre de la tarea de implementación.

## Estado de avance

**Implementado hasta la tarea 10 y decisiones cerradas (2026-10-30).** Las tareas 2 a 10 están hechas. Las tareas 11, 13 y 14 se cerraron con la respuesta del Lead/Producto (Fabricio Fuentes, 2026-10-30). La tarea 12 queda cerrada **con limitación**: la matriz se cubre con mocks porque el BFF aún no monta la ruta interna `POST /api/v1/viajes/{id}/transiciones`. Línea base tras los cambios: `typecheck` ✓, `lint` ✓, `test` 202/202 ✓ (`build:mock` no se corrió).

## Task Dependency Graph

`1 → {2, 3} → {4, 5, 7} → 6 → {8, 9} → 10 → {11, 12, 13, 14}`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2, 3], "dependsOn": [1] },
    { "id": 3, "tasks": [4, 5, 7], "dependsOn": [2, 3] },
    { "id": 4, "tasks": [6], "dependsOn": [4, 5] },
    { "id": 5, "tasks": [8, 9], "dependsOn": [6, 7] },
    { "id": 6, "tasks": [10], "dependsOn": [8, 9] },
    { "id": 7, "tasks": [11, 12, 13, 14], "dependsOn": [10] }
  ]
}
```

La tarea 1 sube el pin y verifica contrato y librería. Las 2 y 3 son independientes (capa de contrato y funciones puras). Las 4, 5 y 7 construyen el formulario, el cambio mínimo de API/hook y los mocks. La 6 cablea todo en el detalle. Las 8 y 9 verifican, la 10 corre las validaciones y las 11 a 14 cierran los pendientes de terceros.

## Tasks

## Prerrequisito

- [x] 1. **Hecho (2026-10-29):** pin subido a `0.1.0-tracer.24` (`package.json`, `pnpm-lock.yaml` y la exclusión de `minimumReleaseAge` en `pnpm-workspace.yaml`, que agregó pnpm); verificado en `node_modules` que existen `MotivoCierre` (`"normal" | "por_incidencia"`), `TransicionEntrada.motivo_cierre`, los códigos de 409 y las aristas `EN_DESTINO/EN_DESCARGA/EN_TRANSITO → CERRADO`; línea base: `typecheck` ✓, `lint` ✓, `test` 170/170 ✓ (`build:mock` no se corrió). Falta commitear. Texto original de la tarea: subir el pin de `@ai27-tech/contracts` de `0.1.0-tracer.22` a `0.1.0-tracer.24` en `package.json` y reinstalar. Confirmar en `node_modules/@ai27-tech/contracts` que existen `components['schemas']['MotivoCierre']` (`"normal" | "por_incidencia"`) y `TransicionEntrada.motivo_cierre`, que `EstadoViaje.Cerrado` y las aristas `EN_DESTINO/EN_DESCARGA/EN_TRANSITO → CERRADO` siguen en `@ai27-tech/contracts/estados`, y que `CondicionAbierta.tipo` incluye `INCIDENCIA`. Correr `typecheck`, `lint` y `test` como línea base para descartar regresiones de `tracer.23`/`tracer.24` (aditivos). Confirmar en `@ai27-tech/ui@0.2.0-beta.6` que existen `Modal`, `Select`, `Form`, `FormField`, `Button`, `Toast`, `ToastContainer`. Si el paquete `tracer.24` no está disponible en el registro del equipo, detener y avisar; no escribir el tipo a mano. Registrar el resultado en `BRECHAS.md` (brecha 8). _Requisitos: 2.3, 2.4. Cierra: brecha 8._

## Implementación

- [x] 2. Crear `lib/contracts/cierreViaje.ts`: tipo `MotivoCierre` tomado de `components['schemas']['MotivoCierre']`, `MOTIVOS_CIERRE` (`['normal', 'por_incidencia']`, tipado contra el enum generado) y `entradaDeCierre(motivo): TransicionEntrada` que devuelve `{ a_estado: EstadoViaje.Cerrado, motivo_cierre: motivo }` sin `causa`. No duplicar ningún tipo generado. _Requisitos: 2.1, 2.3, 2.4._

- [x] 3. Implementar `features/viajes/detalle/cierreViaje.ts` (funciones puras): `puedeCerrar(rol)` (`jefe_operativo` y `administrador`), `tipoDeCierre(estado)` apoyado en `accionesDesde` (sin tabla propia de aristas), `bloqueoDeCierre(estado, condiciones)`, `motivosPermitidos(tipo)` y `ventanaDeEscritura(motivo)` como `Record<MotivoCierre, string>` (`normal → 3 días`, `por_incidencia → 6 meses`; nunca devuelve fechas). Cada regla cita su fuente (DEC-020 #6, DEC-030, DEC-041, DEC-060, DEC-113). _Requisitos: 1.1, 1.2, 1.4, 1.7, 3.1 a 3.4, 4.1, 4.3._

- [x] 4. Implementar `features/viajes/detalle/cierreForm.tsx` con `Form`, `FormField` (`required`, `error`), `Select` de motivo (`motivosPermitidos(tipo)`, preseleccionado y fijo si solo hay uno) y el texto de ventana derivado de `ventanaDeEscritura`. Confirmar deshabilitado sin motivo o mientras envía; cancelar también deshabilitado durante el envío; el error del envío se muestra en el campo y conserva el motivo. Solo componentes de `@ai27-tech/ui`. _Requisitos: 2.1, 2.2, 2.3, 4.1, 5.3, 5.7, 5.8._

- [x] 5. Cambio mínimo en la capa de API y el hook: en `lib/api/viajeDetalle.ts`, ampliar `ConflictoCodigoTransicion` con `cierre_anticipado_solo_por_incidencia` y `cierre_anticipado_requiere_incidencia` (y su mensaje en `MENSAJE_CONFLICTO`), conservando el respaldo `transicion_no_permitida` para códigos no reconocidos (incluido el `conflicto` que envía hoy el runtime); en `useDetalleViaje.ts`, exponer el cierre (por ejemplo `cerrarServicio(motivo)`) que envía `entradaDeCierre(motivo)` sin `causa` e invalida `['viaje', id]` también cuando la mutación falla con 409. No modificar `client.ts`. _Requisitos: 2.3, 3.5, 5.2._

- [x] 6. Cablear el cierre en `DetalleViaje.tsx`: estado `cierreAbierto`; en la lista de acciones, ocultar `CERRADO` si `!puedeCerrar(usuario.rol)`, mostrarlo deshabilitado con la razón visible si `bloqueoDeCierre(...)` devuelve texto, y si no mostrar el botón "Cerrar servicio" (se elimina "Transicionar a: CERRADO"); interceptar `CERRADO` en `handleAccion` para abrir el diálogo; `handleCierreConfirm` llama al cierre del hook, cierra el diálogo, lanza el `Toast` de éxito con la ventana del motivo y clasifica los errores (409 con mensaje por `codigo` o genérico y recarga, 400 en el formulario, 403 con mensaje de facultad); mostrar "Este viaje está cerrado" cuando el estado es `CERRADO`. _Requisitos: 1.2 a 1.5, 3.2, 3.3, 3.5, 4.2, 4.5, 5.1, 5.2, 5.4, 5.5, 5.6._

- [x] 7. Ampliar los mocks MSW: agregar `VJ-1010` (`EN_TRANSITO` con `INCIDENCIA` abierta); hacer que el manejo de `a_estado === 'CERRADO'` en `POST /viajes/:id/transiciones` imite `validarCierre` (`motivo_cierre` ausente o fuera del enum → `400`; anticipado con motivo distinto de `por_incidencia` → `409 cierre_anticipado_solo_por_incidencia`; anticipado sin `INCIDENCIA` → `409 cierre_anticipado_requiere_incidencia`; arista inválida → `409 transicion_no_permitida`); encabezado `x-mock-409-generico` que devuelve esos `409` con `codigo: conflicto`; encabezado `x-mock-rol-sin-facultad` que fuerza `403`; caso de carrera forzable (incidencia resuelta antes del cierre). Sin cambiar el contrato. _Requisitos: 3.5, 5.2 a 5.4._

## Verificación

- [x] 8. Crear pruebas unitarias y de propiedades de `cierreViaje.ts` (feature) y `cierreViaje.ts` (contrato): `puedeCerrar` por rol (propiedad 5); anticipado solo `por_incidencia` y bloqueo sin `INCIDENCIA` (propiedad 2); sin bloqueo en `EN_DESTINO`/`EN_DESCARGA` (propiedad 3); terminal sin cierre (propiedad 4); `ventanaDeEscritura` total y sin fechas (propiedad 6); `tipoDeCierre` coherente con `accionesDesde` (propiedad 7); `entradaDeCierre` siempre `CERRADO` con `motivo_cierre` del catálogo y sin `causa` (propiedad 1); clasificación de 409 con código reconocido y con `conflicto` (propiedad 8). Ubicación: `tests/viajes/cierreViaje.property.test.ts` y `tests/viajes/cierreViaje.unit.test.ts`. _Requisitos: 1 a 3, 5._

- [x] 9. Crear pruebas de integración con MSW (`tests/viajes/CierreViaje.test.tsx`): cierre normal con ventana de 3 días (escenario 1); cierre por incidencia con 6 meses (2); cierre anticipado con incidencia solo ofrece "por incidencia" (3); Administrador cierra (4); confirmar sin motivo no envía (5); anticipado sin incidencia queda deshabilitado con razón visible (6); viaje cerrado sin acciones (7); rol sin facultad no ve la acción (8); carrera `409` informa y recarga sin mostrar cerrado (9, 10); `409` con `codigo: conflicto` muestra el mensaje genérico (11); fallo de red conserva el motivo (12); `403` informa el mensaje de facultad. Comprobar que no existe el botón "Transicionar a: CERRADO" ni el motivo `bitacora`. _Requisitos: 1 a 5._

- [x] 10. Ejecutar `typecheck`, `lint`, `test` y `build:mock` contra las versiones instaladas; verificar accesibilidad básica del diálogo (etiquetas, foco, estado deshabilitado anunciado) con los componentes compartidos; actualizar `BRECHAS.md` con cualquier superficie que no permita demostrar el resultado requerido. Dejar constancia en este archivo del resultado y de qué tareas de la última ola siguen pendientes. _Requisitos: todos._

### Resultado de verificación (2026-10-30)

`pnpm typecheck` ✓, `pnpm lint` ✓, `pnpm test` ✓ (40 archivos, 200 pruebas), `pnpm build:mock` ✓ y `prettier --check` ✓ sobre los archivos modificados. Las pruebas de integración validan etiquetas, foco del modal, selector deshabilitado en cierre anticipado, estado disabled y conservación del motivo después de errores. Las tareas 11 a 14 siguen pendientes por dependencias externas y no se simularon como resueltas.

## Cierre de pendientes de terceros (hecho 2026-10-30)

Cada tarea de esta ola se cerró con la respuesta del Lead/Producto del 2026-10-30. La DEC-115 y la deuda técnica DT-02 que cita la respuesta **no aparecen todavía en `origin/main` de `ai27-platform-context` (commit `c21d21d`)**; hasta que se publiquen, la fuente es el mensaje del Lead.

- [x] 11. **Brecha 4, fecha exacta de la ventana (Producto, C5). CERRADA (2026-10-30):** Producto eligió la Opción A: la pantalla comunica la regla (3 días más / 6 meses), no la fecha. La fecha exacta queda como deuda técnica DT-02. Sin código; solo documentos. _Cierra: Requisitos 4.3, 4.5._

- [x] 12. **Brecha 5, códigos de 409 y 403 real. CERRADA CON LIMITACIÓN (2026-10-30).** La Ola C entregó el 403 y el código de máquina (`pf-pkg-platform-go` `bd0d3b9`, `pf-svc-operacion` `46fea3c`, `pf-svc-bff` `5aa0f01`; PR #38, #66 y #43 según el Lead; verificado en las ramas `-d`) y el frontend ya clasifica los dos códigos de cierre, el `conflicto` genérico, el `400`, el `403`, la carrera y el `401` (pruebas en `tests/viajes/CierreViaje.test.tsx`). **Limitación:** la verificación de punta a punta no es posible porque `bff.go` no monta la ruta interna `POST /api/v1/viajes/{id}/transiciones` (fase (a) del scaffolding, `ports.go:41`); la matriz se cubre con mocks. Seguimiento: cuando el BFF monte la ruta (el Lead lo coordina con el dueño del BFF), repetir la matriz contra el runtime. _Cierra: Requisitos 3.5, 5.2, 5.4 (con la limitación anotada)._

- [x] 13. **Brecha 5, riesgo del 401. CERRADA (2026-10-30):** el Lead aceptó el riesgo residual (Opción A) y no se modifica `client.ts`: el `401` por falta de facultad ya no existe en la ruta de cierre (`operacion` responde `403`) y el `403` no entra al ciclo de refresco y corte de sesión (`client.ts` solo trata `response.status === 401`). Evidencia: pruebas "un 403 de cierre no corta la sesión" y "un 401 de sesión durante el cierre se delega al corte de sesión del cliente". La alternativa transversal sobre `client.ts` queda como deuda técnica DT-03. _Cierra: Requisito 5.6._

- [x] 14. **Textos (Producto, C6). CERRADA (2026-10-30):** aprobados los seis textos con dos ajustes, aplicados en el código. Fila 1 (cierre exitoso): "aceptará mensajes durante 3 días más / 6 meses y después pasará a sólo lectura" (`ventanaTrasCierre`; el "más" solo aclara que el plazo corre desde el cierre). Fila 5 (conflicto genérico): se agrega "Se actualizó el detalle; puedes reintentar." Estilo: "sólo lectura" con tilde en todo el producto; "por incidencia" en etiquetas que nombran el motivo y "con incidencia" solo en prosa. _Cierra: textos de los Requirements 3, 4 y 5._

## Notes

### Notas de brechas

- **Brechas 1, 2, 3 y 6 (cerradas):** motivo tipado en `tracer.24`; observaciones omitidas en V1; `bitacora` retirado por DEC-113; criterio por estado de origen y roles facultados (`jefe_operativo`, `administrador`) confirmados.
- **Brecha 4, ventana de escritura (cerrada):** Producto eligió comunicar la regla, no la fecha; fecha exacta como deuda técnica DT-02. Tarea 11.
- **Brecha 5, códigos de 409 y 403 (cerrada con limitación):** la Ola C entregó el `403` y el código de máquina (verificado en las ramas `-d`); el riesgo del `401` lo aceptó el Lead y queda DT-03 para la alternativa transversal. Limitación: el BFF aún no monta la ruta interna `/transiciones`, así que la matriz se prueba con mocks. Tareas 12 y 13.
- **Brecha 7, librería:** sin aviso en línea dedicado; se compone con texto semántico y tokens. Sin acción; solicitud opcional registrada en `BRECHAS.md`.
- **Brecha 8, pin del frontend (cerrada):** `tracer.22` → `tracer.24`. Tarea 1. El contrato publicado ya es `tracer.29` (`.26` retirada, DEC-114); T14 no necesita subirlo, y si se sube debe ser a `.27` o posterior.
- **Contrato:** verificar siempre con `git show` sobre el tag; el checkout local de `pf-pkg-contracts` no está en el tag del `package.json`.
- **Vinculación con otras tareas:** la incidencia abierta que habilita el cierre anticipado se marca en E8-T13 (histórico); el panel del Jefe Operativo con viajes listos para cerrar (`E6-HU-033`) es una tarea aparte que enlazará a esta acción.
