# Implementation Plan: Revisar, aprobar o rechazar la solicitud (E8-T9)

## Overview

El plan se construye de adentro hacia afuera sobre la pantalla de detalle de E8-T8, igual que aquella se construyó sobre E8-T7. E8-T9 añade solo lo imprescindible: la operación esperada de completar fecha/hora (brecha aislada), el guard de aprobación, el formulario de fecha/hora y el cableado en la presentación. El rechazo con motivo y la derivación de acciones ya existen en E8-T8 y se reutilizan.

**ESTADO DE CONTRATO (BRECHA ABIERTA — Opción A):** `@ai27-tech/contracts@0.1.0-tracer.13` expone la lectura (`obtenerViajeInterno`, `fecha_hora_servicio` **solo lectura**) y la transición (`transicionarViaje`, `TransicionEntrada { a_estado, causa? }`), pero **NO** expone escritura de `fecha_hora_servicio`. La operación esperada de completar fecha/hora se aísla en `lib/contracts/viajeDetalle.ts` (tipo `FechaHoraEntrada`) + `lib/api/viajeDetalle.ts` (`completarFechaHora`) y se sirve con mocks (MSW). Reemplazo mecánico cuando el `bff` publique el endpoint. Se reporta la brecha al dueño de `pf-pkg-contracts`.

Lenguaje de implementación: **TypeScript**. Pruebas: Vitest + Testing Library + MSW bajo `tests/`, reflejando `src/`. Las tareas con `*` son pruebas.

## Tasks

- [x] 1. Capa de contrato: operación esperada de completar fecha/hora (brecha aislada)
  - [x] 1.1 Añadir `FechaHoraEntrada` en `src/lib/contracts/viajeDetalle.ts`
    - ✅ Tipo `{ fecha_hora_servicio: string }` (ISO 8601, `MarcaTiempo`), documentado como brecha de contrato abierta (Opción A)
    - ✅ Único punto de acoplamiento: cuando el `bff` publique el esquema, se alias a `components['schemas']`
    - ✅ No se tocaron los tipos ya generados (`ViajeDetalle`, `ViajeInterno`, `TransicionEntrada`, `EtaEntrada`)
    - _Requirements: 3.3, 3.5_

- [x] 2. Wrapper de dominio: completar fecha/hora
  - [x] 2.1 Añadir `completarFechaHora(id, entrada, accessToken)` en `src/lib/api/viajeDetalle.ts`
    - ✅ `PATCH /viajes/{id}/fecha-hora` (ruta esperada); devuelve `ViajeDetalle` actualizado
    - ✅ Reutiliza `clasificarConflicto` existente para 409; sin códigos nuevos
    - _Requirements: 3.3, 3.4_
  - [x]* 2.2 Pruebas del wrapper en `tests/viajes/completarFechaHora.test.ts`
    - ✅ Petición correcta (ruta, verbo, cuerpo) y retorno de `ViajeDetalle`
    - ✅ Clasificación de 409 por código real; propagación de 404 como `ApiError`
    - _Requirements: 3.3_

- [x] 3. Guard de aprobación (función pura)
  - [x] 3.1 Crear `src/features/viajes/detalle/decisionSolicitud.ts`
    - ✅ `puedeAprobar(viaje)` = `estado === 'SOLICITADO'` && `fecha_hora_servicio` presente (no vacío/nulo)
    - ✅ Módulo puro, sin dependencia de UI; único punto del guard. Helper `tieneFechaHora`
    - _Requirements: 1.1, 2.1, 2.3_
  - [x]* 3.2 Property tests en `tests/viajes/decisionSolicitud.property.test.ts`
    - ✅ Property 1: guard verdadero sii `SOLICITADO` con fecha/hora presente (200 iteraciones)
    - ✅ Property 2: bloquea en todo estado ≠ SOLICITADO; Property 3: determinismo
    - _Requirements: 2.1, 2.3_

- [x] 4. Formulario de captura de fecha/hora
  - [x] 4.1 Crear `src/features/viajes/detalle/fechaHoraForm.tsx`
    - ✅ `Input type="datetime-local"` dentro de `Form` + `FormField` (solo `@ai27-tech/ui`)
    - ✅ Confirmar deshabilitado mientras el campo esté vacío; botones deshabilitados durante el envío
    - ✅ Propaga el error de la mutación al campo. Simétrico a `etaForm.tsx`; **ningún componente nuevo**
    - _Requirements: 3.1, 3.2, 6.1_

- [x] 5. Hook: mutación de completar fecha/hora
  - [x] 5.1 Ampliar `src/features/viajes/detalle/useDetalleViaje.ts`
    - ✅ `useMutation` de `completarFechaHora`, invalida `['viaje', id]` al confirmar
    - ✅ Expone `completarFechaHora(fecha_hora_servicio)` en el contrato plano del hook
    - ✅ No se alteraron las mutaciones existentes de transición/ETA
    - _Requirements: 3.3, 3.4_

- [x] 6. Checkpoint — capas internas verificadas
  - ✅ TypeCheck sin errores; Lint OK; tests de 2.2/3.2 en verde

- [x] 7. Presentación: guard de aprobar + completar fecha/hora
  - [x] 7.1 Ampliar `src/features/viajes/detalle/DetalleViaje.tsx`
    - ✅ Acción `APROBADO` aplica `puedeAprobar`: `Button` deshabilitado con "(falta fecha/hora)" si falta
    - ✅ Aviso "Falta la fecha y hora del servicio" con botón "Completar fecha y hora" cuando `SOLICITADO` sin fecha
    - ✅ "Completar fecha y hora" abre `FechaHoraForm` en `Modal`; al confirmar refleja el dato y habilita Aprobar sin recarga manual (Req 3.4)
    - ✅ `RECHAZADO_POR_AI27` abre el modal de causa (E8-T8): rechazo exige motivo (Req 4)
    - ✅ Defensa en profundidad: `handleAccion` no envía `APROBADO` sin fecha/hora
    - ✅ Carrera 409, éxito/error con `Toast`, 401 delegado al AppShell reutilizados de E8-T8
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 4.1, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_
  - [x]* 7.2 Tests de UI en `tests/viajes/DecisionSolicitud.test.tsx`
    - ✅ Aprobar deshabilitado sin fecha/hora; habilitado tras completarla (Req 3.4)
    - ✅ Rechazar exige motivo (Confirmar deshabilitado con causa vacía)
    - ✅ e2e de las dos ramas (aprobar → APROBADO, rechazar → RECHAZADO_POR_AI27)
    - _Requirements: 2.1, 2.3, 4.1, 4.2, 5.1_

- [x] 8. Mocks del flujo de decisión (MSW)
  - [x] 8.1 Ampliar `src/mocks/data.ts` y `src/mocks/handlers.ts`
    - ✅ VJ-1002 (`SOLICITADO` con fecha/hora, aprobable) y VJ-1009 (`SOLICITADO` sin fecha/hora, Aprobar bloqueado)
    - ✅ Handler `PATCH /viajes/{id}/fecha-hora`: valida cuerpo (400 si falta), 404 si no existe, devuelve `ViajeDetalle`
    - ✅ `transicionarViajeMock` valida contra la máquina (409 `transicion_no_permitida` forzable) para Req 5.1
    - _Requirements: 2.1, 3.3, 3.4, 5.1_

- [x] 9. Checkpoint final — verificación del repo
  - [x] 9.1 Ejecutar typecheck, lint y la suite en modo única ejecución; resolver errores; sin archivos temporales ni código huérfano
    - ✅ TypeCheck: sin errores · Lint: OK · Tests: **96/96** en 19 archivos · Build: exitoso (exit 0)
    - ✅ Sin archivos temporales; se retiró el placeholder `DetalleViaje.test.tsx` de E8-T8 reemplazado por pruebas reales
    - _Requirements: todos_

## Notes

- **Brecha de contrato (Opción A):** completar `fecha_hora_servicio` se implementa contra el contrato **esperado**, aislado en `lib/contracts/viajeDetalle.ts` (`FechaHoraEntrada`) + `lib/api/viajeDetalle.ts` (`completarFechaHora`) + mock. Reemplazo mecánico cuando el `bff` lo publique.
- **Reutiliza E8-T8:** derivación de acciones (`accionesTransicion.ts`), causa obligatoria (`causaTransicion.ts` + `causaForm.tsx`), clasificación de 409, `Toast` y delegación de 401. E8-T9 no los reescribe.
- **Guard de aprobar:** `puedeAprobar` en `decisionSolicitud.ts` es el único punto de la regla "no aprobar sin fecha/hora".
- **Sin lista de acciones de solicitud:** Aprobar/Rechazar salen de `accionesDesde('SOLICITADO')` (máquina de estados generada).
- **Nada de UI nueva:** composición de `@ai27-tech/ui`; `Input type="datetime-local"` para la fecha/hora (igual que el ETA). Afordancia faltante se reporta como brecha.
- **Cancelar (`SOLICITADO → CANCELADO`)** queda fuera de esta tarea: es arista válida pero no parte de la decisión de E1-HU-003.

## Definición de terminado (de la historia técnica)

- Prueba de que **Aprobar está deshabilitado sin fecha/hora** y de que **Rechazar exige motivo**.
- **e2e de las dos ramas** (aprobar y rechazar).
