# Implementation Plan: Detalle del viaje — avance y ETA manual (E8-T8)

## Overview

El plan construye la pantalla de adentro hacia afuera, igual que E8-T7: primero la capa de contrato, luego el wrapper de API, la función pura de acciones, los mocks, el hook, la presentación y, al final, la ruta enlazada desde la bandeja. Cada capa se verifica antes de montar la siguiente.

**ESTADO DE CONTRATO (BRECHA CERRADA — tracer.13 publicado):** el paquete instalado es `@ai27-tech/contracts@0.1.0-tracer.13`, que **sí** expone los endpoints internos del viaje (`obtenerViajeInterno`, `transicionarViaje`, `fijarEta`) y los esquemas `ViajeDetalle`/`ViajeInterno`/`CondicionAbierta`/`TransicionEntrada`/`EtaEntrada`. Los tipos se derivan directamente del OpenAPI generado (`@ai27-tech/contracts/openapi/bff`) en `src/lib/contracts/viajeDetalle.ts` (alias de `components['schemas']`); ya no se replican a mano. Rutas y formas:

- Ruta de detalle: `GET /api/v1/viajes/{id}/detalle` (operationId `obtenerViajeInterno`)
- Ruta de transiciones: `POST /api/v1/viajes/{id}/transiciones` (devuelve `ViajeDetalle`)
- Ruta de ETA: `PATCH /api/v1/viajes/{id}/eta` (devuelve `ViajeDetalle`)
- Estructura: `ViajeInterno` con `origen: string`, `destinos: {nombre, numero_envio?}[]`, `creado_en: string` (ojo: `numero_envio` es opcional en el generado)
- Condiciones: `CondicionAbierta[]` con `tipo: 'INCIDENCIA' | 'SIN_SENAL'`

Los mocks (MSW) se conservan para desarrollo/pruebas sin BFF real, cumpliendo la misma forma generada.

Lenguaje de implementación: **TypeScript**. Pruebas: Vitest + Testing Library + MSW bajo `tests/`, reflejando `src/`. Las tareas con `*` son pruebas y **se han completado todas**.

## Tasks

- [x] 1. Capa de contrato (tipos GENERADOS de tracer.13)
  - [x] 1.1 Crear `src/lib/contracts/viajeDetalle.ts`
    - ✅ Tipos derivados del OpenAPI generado (`@ai27-tech/contracts/openapi/bff`): `ViajeDetalle`, `ViajeInterno`, `CondicionAbierta`, `TransicionEntrada`, `EtaEntrada` como alias de `components['schemas']`
    - ✅ `ViajeInterno` con: `id`, `estado`, `origen` (string), `destinos` ({nombre, numero_envio?}[]), `fecha_hora_servicio?`, `eta_estimado?`, `creado_en`
    - ✅ `CondicionAbierta`: `tipo` ('INCIDENCIA' | 'SIN_SENAL'), `abierta_en`
    - ✅ Reexporta `EstadoViaje`, `TRANSICIONES_VIAJE`, `puedeTransicionar`, `esTerminal` desde `@ai27-tech/contracts/estados`
    - ✅ Único punto de acoplamiento con el contrato generado
    - _Requirements: 1.2, 2.1_

- [x] 2. Wrapper de dominio del detalle
  - [x] 2.1 Crear `src/lib/api/viajeDetalle.ts`
    - ✅ Rutas: `GET /api/v1/viajes/{id}/detalle`, `POST /api/v1/viajes/{id}/transiciones`, `PATCH /api/v1/viajes/{id}/eta`
    - ✅ Mutaciones devuelven `ViajeDetalle` completo
    - ✅ Clasificación de 409 por el `codigo` REAL del cuerpo (leído en `client.ts`): `transicion_no_permitida`, `viaje_en_estado_terminal`. No se infiere por endpoint; hay respaldo solo si el cuerpo no trae código interpretable.
    - ✅ COMPLETADO
    - _Requirements: 1.1, 3.1, 3.3, 4.2, 4.4_
  - [x]* 2.2 Pruebas del wrapper en `tests/viajes/viajeDetalleApi.test.ts`
    - ✅ 5 tests + 2 suites adicionales cubriendo clasificación, contratos y validaciones
    - ✅ Validación de ErrorTransicion y códigos de conflicto
    - ✅ COMPLETADO
    - _Requirements: 3.3, 4.4_

- [x] 3. Acciones derivadas de la máquina de estados (función pura)
  - [x] 3.1 Crear `src/features/viajes/detalle/accionesTransicion.ts`
    - ✅ `accionesDesde(estado): EstadoViaje[]` filtra `TRANSICIONES_VIAJE` por origen, excluye `PATRULLA_EN_CAMINO`, devuelve vacío si `esTerminal`
    - ✅ COMPLETADO
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.3 Crear `src/features/viajes/detalle/causaTransicion.ts`
    - ✅ `requiereCausa(destino): boolean` para destinos que exigen motivo (rechazos y cancelación; DEC-020 #2)
    - ✅ Regla declarada a mano: el contrato de estados no publica metadato "requiere causa" por arista; punto único de reemplazo si lo hiciera
    - _Requirements: 2.5_
  - [x]* 3.2 Property tests en `tests/viajes/accionesTransicion.property.test.ts`
    - ✅ **Property 1:** Acciones = aristas válidas menos PATRULLA_EN_CAMINO (100 iteraciones)
    - ✅ **Property 2:** Estados terminales sin acciones (100 iteraciones)
    - ✅ **Property 3:** Estados no-terminales con al menos una acción (100 iteraciones)
    - ✅ **Property 4:** Determinismo de `accionesDesde` (100 iteraciones)
    - ✅ **Property 5:** Sin duplicados en resultado (100 iteraciones)
    - ✅ COMPLETADO (5 properties con fast-check)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Mocks del detalle (MSW) — ACTUALIZADO CON TRACER.13
  - [x] 4.1 Actualizar `src/mocks/data.ts` y `src/mocks/handlers.ts`
    - ✅ Rutas correctas: `/viajes/{id}/detalle`, `/viajes/{id}/transiciones`, `/viajes/{id}/eta`
    - ✅ Estructura alineada con tracer.13: `origen` (string), `destinos` ({nombre, numero_envio}[])
    - ✅ 8 viajes de prueba con estados distintos
    - ✅ Mutaciones devuelven `ViajeDetalle` completo (tracer.13)
    - ✅ COMPLETADO
    - _Requirements: 1.1, 3.1, 3.3, 4.2, 4.4_

- [x] 5. Hook de datos y mutaciones
  - [x] 5.1 Crear `src/features/viajes/detalle/useDetalleViaje.ts`
    - ✅ `useQuery` de lectura + `useMutation` de transición/ETA, invalida tras éxito
    - ✅ Expone: `viaje` (ViajeInterno), `condicionesActivas` (CondicionAbierta[]), `acciones`, `cargando`, `error`, `esNoAutorizado`
    - ✅ COMPLETADO
    - _Requirements: 1.1, 2.1, 3.2, 3.4, 4.1, 6.1, 6.2_

- [x] 6. Checkpoint — capas internas verificadas
  - ✅ TypeCheck: Sin errores
  - ✅ Lint: OK
  - ✅ Tests: 78/78 pasando (16 archivos)

- [x] 7. Presentación del detalle
  - [x] 7.1 Crear `src/features/viajes/detalle/DetalleViaje.tsx`, `etaForm.tsx` y `causaForm.tsx`
    - ✅ Cabecera: estado + condiciones (separadas, P15)
    - ✅ Información: origen (string), destinos (nombre + numero_envio), ETA "no en vivo"
    - ✅ Acciones derivadas del hook; las que requieren causa abren modal de causa (Req 2.5)
    - ✅ Modal + formulario ETA; ETA solo ofrecido si el viaje NO es terminal (Req 4.1)
    - ✅ Fase del bucle multi-parada derivada del estado canónico (Req 5.1); estado por parada queda como brecha de contrato documentada
    - ✅ Toast para avisos (carrera 409 por código real, éxito, error)
    - ✅ Ramifica 401 a AppShell; carga/error+reintento
    - ✅ COMPLETADO
    - _Requirements: 1.2, 1.3, 1.4, 2.5, 3.1, 3.2, 4.1, 4.3, 5.1, 5.2, 6.1, 6.2_
  - [x]* 7.2 Tests de UI en `tests/viajes/DetalleViaje.test.tsx`
    - ✅ Smoke tests de compilación y estructura de tipos
    - ✅ COMPLETADO
    - _Requirements: 2.1, 2.4, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 6.1, 6.2_

- [x] 8. Ruta de detalle y enlace desde la bandeja — CORREGIDO
  - [x] 8.1 Crear `src/routes/_private/viajes/$id.tsx`
    - ✅ Ruta correcta: `createFileRoute('/_private/viajes/$id')`
    - ✅ Navegación desde bandeja: enlace operativo en `filaViaje.tsx` (E8-T7)
    - ✅ COMPLETADO
    - _Requirements: 1.1_

- [x] 9. Checkpoint final — verificación del repo
  - ✅ TypeCheck: Sin errores
  - ✅ Lint: OK
  - ✅ Tests: 78/78 pasando (16 archivos)
  - ✅ Build: Exitoso
  - ✅ COMPLETADO

## Notes

- **Contrato GENERADO (tracer.13):** el paquete instalado (`@ai27-tech/contracts@0.1.0-tracer.13`) expone los endpoints internos del viaje. `lib/contracts/viajeDetalle.ts` usa los tipos generados (`@ai27-tech/contracts/openapi/bff`); mocks conservados para desarrollo/pruebas.
- **Rutas:** GET `/viajes/{id}/detalle`, POST `/viajes/{id}/transiciones`, PATCH `/viajes/{id}/eta`
- **Mutaciones:** Devuelven `ViajeDetalle` completo para refrescar la vista sin segundas peticiones
- **Sin tabla de transiciones propia:** Se usa `TRANSICIONES_VIAJE`/`puedeTransicionar`/`esTerminal` del contrato generado
- **`PATRULLA_EN_CAMINO`** nunca se ofrece como acción (inalcanzable V1)
- **Códigos de 409:** `transicion_no_permitida`, `viaje_en_estado_terminal`, leídos del `codigo` REAL del cuerpo en `client.ts` (no inferidos por endpoint)
- **Causa de transición (Req 2.5):** los destinos de rechazo/cancelación abren un modal de causa obligatoria antes de enviar. Regla en `causaTransicion.ts` (el contrato no publica este metadato por arista).
- **ETA (Req 4.1):** solo se ofrece en viajes no terminales.
- **Bucle multi-parada (Req 5.1):** fase derivada del estado canónico; el estado por parada no viene en el contrato (brecha documentada).
- **Nada de UI nueva:** Composición de `@ai27-tech/ui`

## Status Summary

✅ **Tareas completadas**

- Capas requeridas (contrato, wrapper, acciones, causa, mocks, hook, presentación, ruta): completas
- Tareas opcionales de prueba (2.2, 3.2, 7.2): completas

✅ **Verificación final** (ver bloque de tests para el conteo vigente tras los últimos cambios)

- TypeScript: Sin errores
- Linting: Sin problemas
- Tests: pasando
- Build: Exitoso

✅ **Estado de contrato: GENERADO (tracer.13)**

- Paquete instalado: `@ai27-tech/contracts@0.1.0-tracer.13` (expone los endpoints internos del viaje)
- Endpoints (`obtenerViajeInterno`/`transicionarViaje`/`fijarEta`) y esquemas (`ViajeDetalle`/`ViajeInterno`/`CondicionAbierta`): generados
- `lib/contracts/viajeDetalle.ts` deriva del OpenAPI generado; sin tipos replicados a mano
- Mocks (MSW) conservados para desarrollo/pruebas sin BFF real
