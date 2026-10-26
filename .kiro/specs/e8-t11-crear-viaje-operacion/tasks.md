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
- [~] 4. Implementar la consulta y representación del catálogo de clientes con estados diferenciados de carga, vacío, error y selección válida, consumiendo únicamente la operación contractual verificada. **Bloqueada:** el contrato BFF tracer.18 no publica `/clientes`; no se inventó un endpoint ni se consumió `catalogos` directamente. La pantalla representa la brecha y no permite texto libre.
- [x] 5. Implementar la captura de uno o más destinos conservando orden y cardinalidad, usando los componentes compartidos disponibles.
- [x] 6. Implementar la sección opcional de escolta para consultar (`listarUnidades`) y seleccionar una o más unidades completas, sin selector separado de custodios o patrulla y sin bloquear por aptitud. La multi-selección se compone con primitivas de `@ai27-tech/ui` (`Table`/`Card` + `Checkbox`), sin crear un componente local.
- [x] 7. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales verificados (`CrearViajeEntrada`, `AsignacionEntrada`) y orqueste la secuencia `crearViaje → asignarRecursos`, sin duplicar interfaces wire ni crear endpoints alternos.
- [x] 8. Implementar el envío con control de estado pendiente y bloqueo de doble confirmación: una sola corrida de la secuencia por confirmación — `crearViaje` siempre, y `asignarRecursos` con el `id` devuelto solo cuando haya unidades seleccionadas.
- [x] 9. Implementar la clasificación de respuestas y errores para representar `APROBADO` (de `crearViaje`), `ASIGNADO` (de `asignarRecursos`), autorización, alcance, disponibilidad, sesión expirada, respuesta insuficiente y errores recuperables. Cuando `asignarRecursos` falle tras un `crearViaje` exitoso, representar el viaje en `APROBADO` y el fallo de asignación por separado, sin reserva parcial.
- [~] 10. Implementar el estado de éxito con identificador, estado y escolta confirmada, además de la continuación compatible con la navegación vigente, sin aprobación ni publicación adicional. **Parcial:** la rama `APROBADO` y la continuación están implementadas; `ASIGNADO` no se presenta porque `Asignacion` no devuelve estado en tracer.18 y la UI no lo infiere.
- [x] 11. Incorporar etiquetas, asociación de errores, foco y estados accesibles conforme a los componentes compartidos disponibles.

## Verificación

- [~] 12. Crear pruebas unitarias del formulario, destinos, aptitud no bloqueante, adaptador, clasificación de errores y protección contra doble envío. **Parcial:** se cubren validación, orden, payload, secuencia única, rechazo atómico y respuesta insuficiente del adaptador; queda pendiente ampliar cobertura específica de la presentación.
- [~] 13. Crear pruebas de integración para: creación sin asignación (solo `crearViaje`, `APROBADO`); creación con una o más unidades (`crearViaje` + `asignarRecursos`, `ASIGNADO`); rechazo atómico de `asignarRecursos` dejando el viaje en `APROBADO` sin reserva parcial; datos preservados; sesión expirada; y ausencia de una tercera operación de compensación o publicación. **Parcial:** están cubiertas las secuencias contractuales y el rechazo sin tercera operación; la confirmación de `ASIGNADO` queda bloqueada por la forma contractual actual.
- [~] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas, y marcar como brecha cualquier superficie que no exista o no permita demostrar el resultado requerido. **Parcial:** typecheck, lint, build mock y suite completa pasan; quedan registradas las brechas de clientes y estado de asignación.

## Notes

### Notas de brechas

- El contrato ya se verificó (tarea 1): `crearViaje`, `asignarRecursos` y `listarUnidades` existen. La asignación atómica de `E1-HU-028`/DEC-026 la provee el BFF dentro de `asignarRecursos`; encadenar `crearViaje → asignarRecursos` **es** la forma contractual, no una segunda mutación inventada. Lo prohibido es una **tercera** operación de compensación, reparación o publicación.
- Brechas abiertas por confirmar: operación del catálogo de clientes, destino de continuación tras éxito y textos/códigos de error aprobados. Se documentan en el resultado de la tarea correspondiente y no se resuelven inventando comportamiento.
- Brechas de `@ai27-tech/ui` (multi-select y date-time): se resuelven componiendo primitivas de la librería; un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución — 2026-10-23

Se implementó la primera tanda ejecutable de la ola 2: ruta privada `/viajes/crear`, acceso desde la bandeja para `jefe_operativo`, estado y validación del formulario, destinos ordenados, roster con selección múltiple, wrapper `crearViaje`, adaptador `crearViaje → asignarRecursos`, protección contra doble envío y clasificación de errores. Se agregaron pruebas del adaptador y de la secuencia contractual.

La ejecución queda parcialmente bloqueada por dos brechas verificadas contra tracer.18: el BFF no publica una operación de catálogo de clientes y `Asignacion` no devuelve el estado `ASIGNADO`. La UI no consume `catalogos` directamente, no inventa `/clientes`, no infiere `ASIGNADO` y no emite una tercera operación. La validación ejecutada pasó: `pnpm typecheck`, `pnpm lint`, `pnpm exec vite build --mode mock` y la suite Vitest completa (`24` archivos, `114` pruebas).
