# Implementation Plan: Cierre del servicio (E8-T14)

## Overview

Las tareas implementan el cierre del servicio en el detalle del viaje: acción dedicada "Cerrar servicio", motivo obligatorio (`normal` o `por_incidencia`), cierre anticipado solo por incidencia, comunicación de la ventana de escritura y manejo de resultados. No hay operación nueva del `bff`: se reutiliza `transicionarViaje`, ahora con `motivo_cierre` tipado (`tracer.24`, DEC-113). No se inventan superficies del `bff` ni componentes locales.

Las brechas 1, 2, 3 y 6 están cerradas (ver `BRECHAS.md`). Las tareas 1 a 10 se pueden ejecutar completas con el contrato publicado. La última ola (11 a 14) agrupa lo que sigue dependiendo de terceros: la fecha exacta de la ventana (Producto), los códigos de 409 en runtime y el 403 real (plataforma, diferidos), la decisión del senior sobre el 401 y la validación de textos. Esas tareas no bloquean el cierre de la tarea de implementación.

## Estado de avance

**Listo para ejecutar desde la tarea 2 (2026-10-29).** Spec actualizado con las respuestas del brief; tarea 1 hecha (pin en `tracer.24`, línea base verde). Rama de trabajo: `feature/e8-t14-cierre-servicio` (sobre `pf-wfi-d`). Sin commitear: los 4 archivos del spec y el cambio del pin (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`); se recomiendan dos commits separados, spec y pin. Las tareas 2 a 10 no tienen bloqueos externos; las 11 a 14 dependen de terceros y no bloquean.

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

- [ ] 2. Crear `lib/contracts/cierreViaje.ts`: tipo `MotivoCierre` tomado de `components['schemas']['MotivoCierre']`, `MOTIVOS_CIERRE` (`['normal', 'por_incidencia']`, tipado contra el enum generado) y `entradaDeCierre(motivo): TransicionEntrada` que devuelve `{ a_estado: EstadoViaje.Cerrado, motivo_cierre: motivo }` sin `causa`. No duplicar ningún tipo generado. _Requisitos: 2.1, 2.3, 2.4._

- [ ] 3. Implementar `features/viajes/detalle/cierreViaje.ts` (funciones puras): `puedeCerrar(rol)` (`jefe_operativo` y `administrador`), `tipoDeCierre(estado)` apoyado en `accionesDesde` (sin tabla propia de aristas), `bloqueoDeCierre(estado, condiciones)`, `motivosPermitidos(tipo)` y `ventanaDeEscritura(motivo)` como `Record<MotivoCierre, string>` (`normal → 3 días`, `por_incidencia → 6 meses`; nunca devuelve fechas). Cada regla cita su fuente (DEC-020 #6, DEC-030, DEC-041, DEC-060, DEC-113). _Requisitos: 1.1, 1.2, 1.4, 1.7, 3.1 a 3.4, 4.1, 4.3._

- [ ] 4. Implementar `features/viajes/detalle/cierreForm.tsx` con `Form`, `FormField` (`required`, `error`), `Select` de motivo (`motivosPermitidos(tipo)`, preseleccionado y fijo si solo hay uno) y el texto de ventana derivado de `ventanaDeEscritura`. Confirmar deshabilitado sin motivo o mientras envía; cancelar también deshabilitado durante el envío; el error del envío se muestra en el campo y conserva el motivo. Solo componentes de `@ai27-tech/ui`. _Requisitos: 2.1, 2.2, 2.3, 4.1, 5.3, 5.7, 5.8._

- [ ] 5. Cambio mínimo en la capa de API y el hook: en `lib/api/viajeDetalle.ts`, ampliar `ConflictoCodigoTransicion` con `cierre_anticipado_solo_por_incidencia` y `cierre_anticipado_requiere_incidencia` (y su mensaje en `MENSAJE_CONFLICTO`), conservando el respaldo `transicion_no_permitida` para códigos no reconocidos (incluido el `conflicto` que envía hoy el runtime); en `useDetalleViaje.ts`, exponer el cierre (por ejemplo `cerrarServicio(motivo)`) que envía `entradaDeCierre(motivo)` sin `causa` e invalida `['viaje', id]` también cuando la mutación falla con 409. No modificar `client.ts`. _Requisitos: 2.3, 3.5, 5.2._

- [ ] 6. Cablear el cierre en `DetalleViaje.tsx`: estado `cierreAbierto`; en la lista de acciones, ocultar `CERRADO` si `!puedeCerrar(usuario.rol)`, mostrarlo deshabilitado con la razón visible si `bloqueoDeCierre(...)` devuelve texto, y si no mostrar el botón "Cerrar servicio" (se elimina "Transicionar a: CERRADO"); interceptar `CERRADO` en `handleAccion` para abrir el diálogo; `handleCierreConfirm` llama al cierre del hook, cierra el diálogo, lanza el `Toast` de éxito con la ventana del motivo y clasifica los errores (409 con mensaje por `codigo` o genérico y recarga, 400 en el formulario, 403 con mensaje de facultad); mostrar "Este viaje está cerrado" cuando el estado es `CERRADO`. _Requisitos: 1.2 a 1.5, 3.2, 3.3, 3.5, 4.2, 4.5, 5.1, 5.2, 5.4, 5.5, 5.6._

- [ ] 7. Ampliar los mocks MSW: agregar `VJ-1010` (`EN_TRANSITO` con `INCIDENCIA` abierta); hacer que el manejo de `a_estado === 'CERRADO'` en `POST /viajes/:id/transiciones` imite `validarCierre` (`motivo_cierre` ausente o fuera del enum → `400`; anticipado con motivo distinto de `por_incidencia` → `409 cierre_anticipado_solo_por_incidencia`; anticipado sin `INCIDENCIA` → `409 cierre_anticipado_requiere_incidencia`; arista inválida → `409 transicion_no_permitida`); encabezado `x-mock-409-generico` que devuelve esos `409` con `codigo: conflicto`; encabezado `x-mock-rol-sin-facultad` que fuerza `403`; caso de carrera forzable (incidencia resuelta antes del cierre). Sin cambiar el contrato. _Requisitos: 3.5, 5.2 a 5.4._

## Verificación

- [ ] 8. Crear pruebas unitarias y de propiedades de `cierreViaje.ts` (feature) y `cierreViaje.ts` (contrato): `puedeCerrar` por rol (propiedad 5); anticipado solo `por_incidencia` y bloqueo sin `INCIDENCIA` (propiedad 2); sin bloqueo en `EN_DESTINO`/`EN_DESCARGA` (propiedad 3); terminal sin cierre (propiedad 4); `ventanaDeEscritura` total y sin fechas (propiedad 6); `tipoDeCierre` coherente con `accionesDesde` (propiedad 7); `entradaDeCierre` siempre `CERRADO` con `motivo_cierre` del catálogo y sin `causa` (propiedad 1); clasificación de 409 con código reconocido y con `conflicto` (propiedad 8). Ubicación: `tests/viajes/cierreViaje.property.test.ts` y `tests/viajes/cierreViaje.unit.test.ts`. _Requisitos: 1 a 3, 5._

- [ ] 9. Crear pruebas de integración con MSW (`tests/viajes/CierreViaje.test.tsx`): cierre normal con ventana de 3 días (escenario 1); cierre por incidencia con 6 meses (2); cierre anticipado con incidencia solo ofrece "por incidencia" (3); Administrador cierra (4); confirmar sin motivo no envía (5); anticipado sin incidencia queda deshabilitado con razón visible (6); viaje cerrado sin acciones (7); rol sin facultad no ve la acción (8); carrera `409` informa y recarga sin mostrar cerrado (9, 10); `409` con `codigo: conflicto` muestra el mensaje genérico (11); fallo de red conserva el motivo (12); `403` informa el mensaje de facultad. Comprobar que no existe el botón "Transicionar a: CERRADO" ni el motivo `bitacora`. _Requisitos: 1 a 5._

- [ ] 10. Ejecutar `typecheck`, `lint`, `test` y `build:mock` contra las versiones instaladas; verificar accesibilidad básica del diálogo (etiquetas, foco, estado deshabilitado anunciado) con los componentes compartidos; actualizar `BRECHAS.md` con cualquier superficie que no permita demostrar el resultado requerido. Dejar constancia en este archivo del resultado y de qué tareas de la última ola siguen pendientes. _Requisitos: todos._

## Pendientes de terceros (no bloquean la tarea 10)

Cada tarea de esta ola pide la respuesta a su dueño, aplica el cambio mínimo en el módulo indicado y actualiza `BRECHAS.md` y los requisitos marcados **[Condicionado]**.

- [ ] 11. **Brecha 4, fecha exacta de la ventana (Producto, C5).** Si Producto responde que basta con la regla (3 días / 6 meses): registrar la decisión, retirar la condición de los Requirements 4.3 y 4.5 y cerrar la brecha 4. Si responde que la fecha es imprescindible: pedir a Contratos el campo `escritura_hasta` y la lectura en el `bff`, y mostrar la fecha tal como la devuelve el contrato (sin calcular `cerrado_en` + ventana) en el aviso de éxito y en el detalle de un viaje `CERRADO`. _Cierra: Requisitos 4.3, 4.5._

- [ ] 12. **Brecha 5, códigos de 409 en runtime y 403 real (plataforma, diferido).** Cuando la tarea de plataforma (A3 + B1) emita los códigos de máquina y el `403`: verificar contra el runtime que el `codigo` llega al cliente, confirmar que el mensaje específico de Requirement 3.5 se muestra y que el mensaje de facultad de Requirement 5.4 aparece con el `403`; retirar la advertencia sobre `401` y actualizar mocks y pruebas. Sin fecha. _Cierra: Requisitos 3.5, 5.2, 5.4._

- [ ] 13. **Brecha 5, riesgo del 401 (senior del frontend).** Obtener la decisión del senior: aceptar el riesgo con la prevención por rol hasta que llegue el `403`, o abrir una tarea transversal sobre `client.ts` (Backend sugiere que `transicionarViaje` no corte sesión ante un 401; `client.ts` ya refresca antes de cortar, por lo que hay que definir qué comportamiento se pide exactamente). Registrar la decisión en `BRECHAS.md`. T14 no modifica `client.ts`. _Cierra: Requisito 5.6._

- [ ] 14. **Textos (Producto, C6).** Validar con Producto los textos de bloqueo ("El cierre anticipado solo es válido con una incidencia abierta"), de conflicto, de facultad y de la ventana de escritura; ajustar los literales en `cierreViaje.ts`, `cierreForm.tsx` y `DetalleViaje.tsx` y actualizar las pruebas. _Cierra: textos de los Requirements 3, 4 y 5._

## Notes

### Notas de brechas

- **Brechas 1, 2, 3 y 6 (cerradas):** motivo tipado en `tracer.24`; observaciones omitidas en V1; `bitacora` retirado por DEC-113; criterio por estado de origen y roles facultados (`jefe_operativo`, `administrador`) confirmados.
- **Brecha 4, ventana de escritura:** el `bff` no expone el vencimiento; se comunica la regla, no la fecha. Tarea 11.
- **Brecha 5, códigos de 409 y 403:** códigos declarados en `tracer.24` pero el runtime envía `conflicto`; `operacion` responde `401` a un rol sin facultad y `client.ts` cortaría la sesión. Mitigación: prevención por rol. Tareas 12 y 13.
- **Brecha 7, librería:** sin aviso en línea dedicado; se compone con texto semántico y tokens. Sin acción; solicitud opcional registrada en `BRECHAS.md`.
- **Brecha 8, pin del frontend:** `tracer.22` → `tracer.24`. Tarea 1.
- **Contrato:** verificar siempre con `git show` sobre el tag; el checkout local de `pf-pkg-contracts` no está en el tag del `package.json`.
- **Vinculación con otras tareas:** la incidencia abierta que habilita el cierre anticipado se marca en E8-T13 (histórico); el panel del Jefe Operativo con viajes listos para cerrar (`E6-HU-033`) es una tarea aparte que enlazará a esta acción.
