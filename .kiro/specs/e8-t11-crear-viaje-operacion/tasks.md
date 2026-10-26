# Implementation Plan: Crear viaje por Operación (E8-T11)

## Overview

Las tareas implementan el flujo funcional de E8-T11 y dejan las brechas como prerrequisitos o notas, sin inventar superficies contractuales.

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

La tarea 1 (contrato y UI) ya está verificada: la creación con asignación son dos operaciones encadenadas (`crearViaje → asignarRecursos`). Las tareas 2 a 11 implementan el flujo. Las tareas 12 a 14 verifican comportamiento, accesibilidad y contrato.

## Tasks

## Prerrequisito breve

- [x] 1. Verificar el contrato y la librería compartida instalados. **Resultado (contra `@ai27-tech/contracts@0.1.0-tracer.18` y `@ai27-tech/ui@0.2.0-beta.6`):** la creación con asignación son **dos operaciones encadenadas** — `crearViaje` (`POST /api/v1/viajes`, `CrearViajeEntrada` sin unidades → `ViajeResumen`, deja `APROBADO`) y `asignarRecursos` (`POST /api/v1/viajes/{id}/asignacion`, `AsignacionEntrada { unidades_ids[] }` → `Asignacion`, reserva atómica `APROBADO → ASIGNADO`). Roster con `listarUnidades` (`GET /api/v1/unidades`). Brechas de UI: no hay multi-select ni date-time picker dedicados (se componen con primitivas). Falta confirmar: operación de catálogo de clientes y textos/códigos de error.

## Implementación

- [x] 2. Integrar la entrada de navegación del panel interno al flujo de creación por Operación y aplicar la experiencia de acceso para `jefe_operativo`, reutilizando la sesión y navegación existentes.
- [x] 3. Implementar el estado del formulario para cliente, origen, destinos ordenados y fecha/hora, incluyendo validación de campos obligatorios y preservación de datos ante errores.
- [x] 4. Implementar la consulta y representación del catálogo de clientes con estados diferenciados de carga, vacío, error y selección válida, consumiendo únicamente la operación contractual verificada. **Implementado contra `@ai27-tech/contracts@0.1.0-tracer.20`:** `listarClientes` (`GET /clientes`) paginado por cursor; el BFF devuelve solo clientes activos dentro del alcance.
- [x] 5. Implementar la captura de uno o más destinos conservando orden y cardinalidad, usando los componentes compartidos disponibles.
- [x] 6. Implementar la sección opcional de escolta para consultar (`listarUnidades`) y seleccionar una o más unidades completas, sin selector separado de custodios o patrulla y sin bloquear por aptitud. La multi-selección se compone con primitivas de `@ai27-tech/ui` (`Table`/`Card` + `Checkbox`), sin crear un componente local.
- [x] 7. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales verificados (`CrearViajeEntrada`, `AsignacionEntrada`) y orqueste la secuencia `crearViaje → asignarRecursos`, sin duplicar interfaces wire ni crear endpoints alternos.
- [x] 8. Implementar el envío con control de estado pendiente y bloqueo de doble confirmación: una sola corrida de la secuencia por confirmación — `crearViaje` siempre, y `asignarRecursos` con el `id` devuelto solo cuando haya unidades seleccionadas.
- [x] 9. Implementar la clasificación de respuestas y errores para representar `APROBADO` (de `crearViaje`), `ASIGNADO` (de `asignarRecursos`), autorización, alcance, disponibilidad, sesión expirada, respuesta insuficiente y errores recuperables. Cuando `asignarRecursos` falle tras un `crearViaje` exitoso, representar el viaje en `APROBADO` y el fallo de asignación por separado, sin reserva parcial.
- [x] 10. Implementar el estado de éxito con identificador, estado y escolta confirmada, además de la continuación compatible con la navegación vigente, sin aprobación ni publicación adicional. **Implementado contra tracer.20:** `Asignacion.estado` confirma `ASIGNADO`; la escolta se representa con sus unidades y el fallo de asignación permite continuar al viaje `APROBADO`.
- [x] 11. Incorporar etiquetas, asociación de errores, foco y estados accesibles conforme a los componentes compartidos disponibles.

## Verificación

- [x] 12. Crear pruebas unitarias del formulario, destinos, aptitud no bloqueante, adaptador, clasificación de errores y protección contra doble envío. **Verificado:** cobertura del formulario y doble confirmación en `CrearViaje.test.tsx`, destinos/adaptador en `crearViaje.test.ts`, catálogo en `clientesApi.test.ts` y estados accesibles del selector en `ClienteSelector.test.tsx`.
- [x] 13. Crear pruebas de integración para: creación sin asignación (solo `crearViaje`, `APROBADO`); creación con una o más unidades (`crearViaje` + `asignarRecursos`, `ASIGNADO`); rechazo atómico de `asignarRecursos` dejando el viaje en `APROBADO` sin reserva parcial; datos preservados; sesión expirada; y ausencia de una tercera operación de compensación o publicación. **Verificado:** adapter, wrappers paginados, mocks tracer.20 y pantalla cubren las secuencias y el bloqueo de tercera operación.
- [x] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas, y marcar como brecha cualquier superficie que no exista o no permita demostrar el resultado requerido. **Verificado contra tracer.20:** typecheck, lint, build mock, pruebas de estados accesibles y suite completa pasan; no quedan superficies contractuales faltantes.

## Notes

### Notas de brechas

- El contrato ya se verificó (tarea 1): `crearViaje`, `asignarRecursos` y `listarUnidades` existen. La asignación atómica de `E1-HU-028`/DEC-026 la provee el BFF dentro de `asignarRecursos`; encadenar `crearViaje → asignarRecursos` **es** la forma contractual, no una segunda mutación inventada. Lo prohibido es una **tercera** operación de compensación, reparación o publicación.
- Brechas abiertas por confirmar: operación del catálogo de clientes, destino de continuación tras éxito y textos/códigos de error aprobados. Se documentan en el resultado de la tarea correspondiente y no se resuelven inventando comportamiento.
- Brechas de `@ai27-tech/ui` (multi-select y date-time): se resuelven componiendo primitivas de la librería; un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución — 2026-10-23

Se implementó la primera tanda ejecutable de la ola 2: ruta privada `/viajes/crear`, acceso desde la bandeja para `jefe_operativo`, estado y validación del formulario, destinos ordenados, roster con selección múltiple, wrapper `crearViaje`, adaptador `crearViaje → asignarRecursos`, protección contra doble envío y clasificación de errores. Se agregaron pruebas del adaptador y de la secuencia contractual.

La ejecución queda parcialmente bloqueada por dos brechas verificadas contra tracer.18: el BFF no publica una operación de catálogo de clientes y `Asignacion` no devuelve el estado `ASIGNADO`. La UI no consume `catalogos` directamente, no inventa `/clientes`, no infiere `ASIGNADO` y no emite una tercera operación. La validación ejecutada pasó: `pnpm typecheck`, `pnpm lint`, `pnpm exec vite build --mode mock` y la suite Vitest completa (`24` archivos, `114` pruebas).

### Avance preparatorio pendiente de tracer — 2026-10-26

Se avanzó sin inventar contrato: se aisló `ClienteSelector` como componente de presentación desacoplado de tipos wire, con estados de brecha actual, carga, vacío, error con reintento y catálogo disponible sin texto libre. Se agregaron pruebas de esos estados y se integró la representación de la brecha en `CrearViaje`.

La consulta real de `listarClientes`, el wrapper contractual, el mapeo de `Cliente`/`PaginaClientes` y el uso de `Asignacion.estado` quedan pendientes hasta que Contratos publique el tracer siguiente. Se mantiene abierto el tratamiento de clientes inactivos; la respuesta de Contratos deja esa decisión a Producto/selector. Las pruebas nuevas del selector y del adaptador pasan; typecheck y lint pasan.

### Integración tracer.20 — 2026-10-26

Contratos publicó y se integró `@ai27-tech/contracts@0.1.0-tracer.20`. Se verificó `GET /api/v1/clientes` (`listarClientes`), `Cliente`, `PaginaClientes` y `Asignacion.estado`; el BFF devuelve solo clientes `activo` dentro del alcance del `jefe_operativo`.

Se implementaron el wrapper paginado de clientes, la consulta agregada para el selector, fixtures y handlers MSW de clientes y creación, y la respuesta de asignación con `estado: ASIGNADO`. La UI ahora representa `APROBADO`, `ASIGNADO` y la escolta confirmada. Si la asignación falla, conserva el viaje creado y permite continuar al detalle sin crear otro viaje ni emitir compensación.

Validación: `pnpm typecheck`, `pnpm lint`, `pnpm build:mock` y suite completa (`26` archivos, `121` pruebas) pasan. El rol demo quedó alineado a `jefe_operativo` y su prueba de sesión fue actualizada.

Las tareas 12–14 quedaron verificadas con las pruebas de formulario, adaptador, catálogo, estados accesibles y doble confirmación; el spec puede cerrarse.
