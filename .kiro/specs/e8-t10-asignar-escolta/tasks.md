# Implementation Plan: Asignar la escolta (unidades) al viaje (E8-T10)

## Overview

El plan se construye de adentro hacia afuera sobre la pantalla de detalle de E8-T8, igual que E8-T9. E8-T10 añade solo lo imprescindible: la capa de contrato de asignación (brecha aislada), los wrappers de roster y asignación, el formulario de selección múltiple del roster y el cableado en la presentación. La derivación de acciones desde la máquina de estados, la clasificación de 409/401, `Toast` y la delegación de sesión ya existen en E8-T8 y se reutilizan.

**ESTADO DE CONTRATO (BRECHA ABIERTA — Opción A):** la superficie de asignación existe en `operacion` (`@ai27-tech/contracts@0.1.0-tracer.15`: `asignarRecursos`, `reasignarRecursos`, `listarUnidades`, `AsignacionEntrada`, `Asignacion`, `PaginaUnidades`), pero el **`bff`** —única puerta del frontend— **NO** expone `asignarEscolta` ni `listarUnidades` en tracer.15 ni en el último publicado tracer.16 (la superficie del `bff` no cambió entre 15 y 16). Las operaciones esperadas se aíslan en `lib/contracts/{unidades,viajeDetalle}.ts` + `lib/api/{unidades,viajeDetalle}.ts` y se sirven con mocks (MSW). Reemplazo mecánico cuando el `bff` las publique. Se reporta la brecha al dueño de `pf-pkg-contracts`.

Lenguaje de implementación: **TypeScript**. Pruebas: Vitest + Testing Library + MSW bajo `tests/`, reflejando `src/`. Las tareas con `*` son pruebas.

## Tasks

- [x] 1. Capa de contrato: operaciones esperadas de asignación y roster (brecha aislada)
  - [x] 1.1 Añadir tipos de roster en `src/lib/contracts/unidades.ts`
    - `Unidad { id, vehiculo_id, custodios_ids, tipo (solo lectura), activa }` y `PaginaUnidades { items, cursor_siguiente }`, espejo de `operacion.gen.ts`, documentados como brecha de contrato abierta (Opción A)
    - **La `Unidad` V1 NO lleva aptitud** (el roster solo da `activa`); no añadir un campo de aptitud a la lista. Único punto de acoplamiento a `components['schemas']` del `bff` cuando exista
    - Etiquetas legibles de vehículo/custodios (resolución de `id` contra `catalogos`) y columnas exactas: reportar, no inventar (punto abierto Operación)
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 1.2 Añadir tipos de asignación en `src/lib/contracts/viajeDetalle.ts`
    - `AsignacionEntrada { unidades_ids: string[] }` y `Asignacion { viaje_id, unidades: UnidadAsignada[] }` (con `aptitud` informativa por átomo en el **resultado**), documentados como brecha abierta; sin tocar los tipos ya generados
    - _Requirements: 3.1, 3.3, 3.4_

- [x] 2. Wrappers de dominio
  - [x] 2.1 Crear `src/lib/api/unidades.ts` con `listarUnidades(accessToken)`
    - `GET` del roster esperado; desempaqueta `PaginaUnidades` → `Unidad[]`; propaga `ApiError`; reutiliza `client` y manejo de 401
    - _Requirements: 2.1, 4.4, 5.1_
  - [x] 2.2 Añadir `asignarEscolta(id, { unidades_ids }, accessToken)` en `src/lib/api/viajeDetalle.ts`
    - `POST /viajes/{id}/asignacion` (ruta esperada); devuelve `ViajeDetalle`/`Asignacion`
    - Reutiliza `clasificarConflicto` de E8-T8 para el 409 de carrera; sin códigos nuevos sin confirmar
    - _Requirements: 3.1, 3.2, 3.3, 4.2_
  - [x]* 2.3 Pruebas de wrappers en `tests/viajes/{listarUnidades,asignarEscolta}.test.ts`
    - `listarUnidades`: ruta/verbo, desempaquetado de página, propagación de error
    - `asignarEscolta`: ruta/verbo/cuerpo, retorno, clasificación de 409 de carrera, propagación de 404 como `ApiError`
    - _Requirements: 2.1, 3.1, 4.2_

- [x] 3. Hook: query de roster + mutación de asignación
  - [x] 3.1 Ampliar `src/features/viajes/detalle/useDetalleViaje.ts`
    - `useQuery` de `listarUnidades` (estados de carga/vacío/error); `useMutation` de `asignarEscolta` que invalida `['viaje', id]` al confirmar
    - Expone `unidades`, `asignarEscolta(unidades_ids)` y sus estados en el contrato plano del hook; sin alterar las mutaciones existentes
    - _Requirements: 2.1, 3.1, 3.2, 5.1, 5.2_

- [x] 4. Formulario de selección del roster
  - [x] 4.1 Crear `src/features/viajes/detalle/asignacionForm.tsx`
    - `Table`/`FilterTable` + `Checkbox` para selección múltiple; `Badge` para **disponibilidad** (`activa`, único dato de estado del roster en V1); **no** pintar aptitud en la lista (no está en el contrato)
    - Confirmar deshabilitado sin al menos una unidad (Req 2.5) y durante el envío (Req 5.2)
    - Estados: cargando roster (Req 5.1) y **sin unidades disponibles** (Req 4.1), con texto distinto del de carrera
    - Solo `@ai27-tech/ui`; **ningún componente nuevo**
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.1, 5.1, 5.2_
  - [x]* 4.2 Pruebas del formulario en `tests/viajes/AsignacionForm.test.tsx`
    - Confirmar deshabilitado sin selección y durante envío; selección múltiple; se muestra `activa` y **no** aptitud en la lista; `activa` no bloquea
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. Checkpoint — capas internas verificadas
  - TypeCheck sin errores; Lint OK; tests de 2.3/4.2 en verde

- [x] 6. Presentación: acción de asignar + estados de rechazo
  - [x] 6.1 Ampliar `src/features/viajes/detalle/DetalleViaje.tsx`
    - Acción `ASIGNADO` visible solo en `APROBADO` (derivada de la máquina); abre `AsignacionForm` en `Modal`
    - Al confirmar con éxito, refleja `ASIGNADO` sin recarga manual (Req 3.2); defensa en profundidad: no envía asignación vacía
    - **Dos mensajes distintos**: "sin unidades disponibles" (Req 4.1) y carrera 409 (Req 4.2/4.3), recargando roster y estado
    - Éxito/error con `Toast`, 401 delegado al AppShell reutilizados de E8-T8
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_
  - [x]* 6.2 Tests de UI en `tests/viajes/Asignacion.test.tsx`
    - Asignar visible solo en `APROBADO`; e2e feliz (`APROBADO → ASIGNADO`)
    - Dos motivos de rechazo con mensajes distintos (sin disponibles vs carrera)
    - No se puede enviar asignación parcial/vacía; la disponibilidad (`activa`) **no** bloquea
    - _Requirements: 1.1, 2.5, 3.2, 4.1, 4.2, 4.3_

- [x] 7. Mocks del flujo de asignación (MSW)
  - [x] 7.1 Ampliar `src/mocks/data.ts` y `src/mocks/handlers.ts`
    - Roster con unidades (mezcla de `activa` true/false) y un caso **sin disponibles** (lista vacía o todas inactivas); viaje `APROBADO` asignable. La `Unidad` del roster **no** lleva aptitud
    - Handler `listarUnidades`; handler `asignarEscolta`: valida cuerpo (400 si vacío), 404 si no existe, **409 de carrera forzable** (Req 4.2), devuelve el viaje en `ASIGNADO` con `Asignacion.unidades[].aptitud` informativa en el resultado
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 8. Checkpoint final — verificación del repo
  - [x] 8.1 Ejecutar typecheck, lint y la suite en modo única ejecución; resolver errores; sin archivos temporales ni código huérfano
    - TypeCheck sin errores · Lint OK · Tests en verde · Build exitoso
    - _Requirements: todos_

## Notes

- **Brecha de contrato (Opción A):** `asignarEscolta` y `listarUnidades` se implementan contra el contrato **esperado** del `bff`, aisladas en `lib/contracts` + `lib/api` + mock. Reemplazo mecánico cuando el `bff` las publique. La superficie existe en `operacion` (tracer.15/16) pero **no** en el `bff`.
- **Reutiliza E8-T8:** derivación de acciones (`accionesTransicion.ts`), clasificación de 409, `Toast`, delegación de 401. E8-T10 no los reescribe.
- **Sin lista de acciones de aprobado:** Asignar sale de `accionesDesde('APROBADO')` (máquina de estados generada).
- **Disponibilidad vs aptitud (contrato V1):** la lista del roster solo expone `Unidad.activa` (se muestra con `Badge`); la **aptitud detallada NO está en la lista** (solo en `Asignacion`/`UnidadAsignada` tras reservar). Ni `activa` ni la aptitud gatean (DEC-043/DEC-055): no bloquean selección ni envío. No se inventa aptitud en la lista.
- **Unidad completa (DEC-044 / ADR 31):** se elige la unidad entera (vehículo + custodios); sin selector de custodios ni de patrulla.
- **Nada de UI nueva:** composición de `@ai27-tech/ui` (`Table`/`FilterTable`, `Checkbox`, `Badge`, `Modal`, `Button`, `Toast`, `Pagination`). Afordancia faltante se reporta como brecha.
- **Reasignación fuera de alcance:** esta tarea cubre la primera asignación (`APROBADO → ASIGNADO`); `reasignarRecursos` (`PATCH`, con motivo) es tarea aparte.

## Definición de terminado (de la historia técnica)

- Prueba de que los **dos motivos de rechazo** producen **mensajes distintos**.
- Prueba de que **no se puede enviar una asignación parcial/vacía**.
- Prueba de que la asignación **no se bloquea por aptitud**. Nota: en V1 el roster no expone aptitud en la lista (solo `activa`), así que esta prueba se cubre verificando que ni `activa` ni la aptitud del resultado impiden seleccionar/enviar.
