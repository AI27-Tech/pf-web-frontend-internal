# Design Document

## Overview

Diseño de **revisar, aprobar o rechazar la solicitud** (E8-T9): la decisión explícita del Jefe Operativo sobre un viaje en `SOLICITADO`, montada sobre la pantalla de detalle de E8-T8 sin introducir patrones nuevos. Reutiliza las capas ya establecidas (`lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`) y añade tres piezas acotadas:

1. **Guard de aprobación**: Aprobar queda deshabilitado mientras `fecha_hora_servicio` esté vacía (dato de lectura del detalle).
2. **Completar fecha/hora**: captura de `fecha_hora_servicio` cuando falta, contra un endpoint **esperado** aislado (brecha de contrato, Opción A, servida por mock).
3. **Afinado del rechazo**: el rechazo de la solicitud reutiliza el modal de causa obligatoria de E8-T8.

El rechazo con motivo y la derivación de acciones desde la máquina de estados ya existen en E8-T8 y E8-T9 no los reescribe: se apoya en `accionesTransicion.ts`, `causaTransicion.ts`, el wrapper `lib/api/viajeDetalle.ts` y el hook `useDetalleViaje.ts`.

### Hecho de contrato verificado (fundamento del diseño)

Desde `SOLICITADO`, la máquina de estados generada (`@ai27-tech/contracts/estados`) publica exactamente:

```
SOLICITADO → APROBADO
SOLICITADO → RECHAZADO_POR_AI27
SOLICITADO → CANCELADO
```

El `bff` (tracer.13) expone la lectura y la transición:

```
GET  /api/v1/viajes/{id}/detalle      (obtenerViajeInterno)  → ViajeDetalle { viaje: ViajeInterno{ ..., fecha_hora_servicio? }, condiciones_activas[] }
POST /api/v1/viajes/{id}/transiciones (transicionarViaje)    body TransicionEntrada { a_estado, causa? } → ViajeDetalle / 409 transicion_no_permitida
```

**Brecha verificada (BLOQUEANTE PARCIAL):** no existe endpoint de **escritura** de `fecha_hora_servicio` sobre un viaje existente. `fecha_hora_servicio` es solo lectura en `ViajeInterno`; `TransicionEntrada` no la lleva; en `operacion` solo entra en la creación (`ViajeEntrada`). **Opción A:** se aísla la operación esperada de completar fecha/hora en la capa de contrato del detalle y se sirve con mock (MSW). Cuando el `bff` la publique, se reemplazan tipos y ruta en un único punto.

Consecuencia de diseño: NO se escribe tabla de transiciones ni lista de "acciones de solicitud"; Aprobar/Rechazar salen de `accionesDesde('SOLICITADO')`. El único añadido de lógica es el **predicado de guard** (`fecha_hora_servicio` presente) y la **operación de completar fecha/hora**.

## Architecture

### Vista de capas (añadidos de E8-T9 marcados con +)

```
routes/_private/viajes/$id.tsx        (ruta TanStack ya existente de E8-T8; sin cambios)
        │  usa
        ▼
features/viajes/detalle/
  ├─ accionesTransicion.ts            (E8-T8; sin cambios: SOLICITADO ya deriva APROBADO/RECHAZADO)
  ├─ causaTransicion.ts               (E8-T8; sin cambios: RECHAZADO_POR_AI27 ya requiere causa)
  ├─ causaForm.tsx                    (E8-T8; reutilizado para el rechazo de la solicitud)
  ├─ decisionSolicitud.ts            (+ función pura: puedeAprobar(viaje) = fecha_hora_servicio presente)
  ├─ fechaHoraForm.tsx               (+ captura de fecha/hora: Form + FormField + Input datetime-local)
  ├─ useDetalleViaje.ts               (+ mutación completarFechaHora; invalida la lectura)
  └─ DetalleViaje.tsx                 (+ guard de Aprobar + modal de completar fecha/hora)
        │  usa
        ▼
lib/api/viajeDetalle.ts               (+ completarFechaHora(id, { fecha_hora_servicio }, token))
        │  usa
        ▼
lib/api/client.ts                     (única puerta HTTP contra el bff — sin cambios)
        │  tipos
        ▼
lib/contracts/viajeDetalle.ts         (+ tipo FechaHoraEntrada: brecha de contrato aislada)
```

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                            | Componente                                                     |
| ------------------------------------ | -------------------------------------------------------------- |
| Acciones Aprobar / Rechazar          | `Button` (reutiliza la lista de acciones de E8-T8)             |
| Aprobar deshabilitado sin fecha/hora | `Button disabled` (prop existente)                             |
| Aviso "falta fecha/hora" + completar | `Card` / texto + `Button`                                      |
| Capturar fecha/hora                  | `Modal` + `Form` + `FormField` + `Input type="datetime-local"` |
| Rechazo con motivo obligatorio       | `Modal` + `CausaForm` (E8-T8: `Form`/`FormField`/`Textarea`)   |
| Éxito / carrera / error              | `Toast` + `ToastContainer` (E8-T8)                             |

> Verificado: `@ai27-tech/ui` no exporta un `DatePicker`/`DateTimePicker`. La captura usa `Input type="datetime-local"`, idéntico a `etaForm.tsx`. No se crea ningún componente; si faltara alguna afordancia se reportaría como brecha.

## Componentes y responsabilidades

- **`lib/contracts/viajeDetalle.ts`** (+) — añade `FechaHoraEntrada` como tipo de la operación **esperada** de completar fecha/hora (`{ fecha_hora_servicio: string }`), documentado como brecha. Único punto de acoplamiento; cuando el `bff` publique el esquema, se alias-a a `components['schemas']` como el resto.
- **`lib/api/viajeDetalle.ts`** (+) — `completarFechaHora(id, { fecha_hora_servicio }, token)`: delega en `request` de `client.ts` contra la ruta esperada, devuelve `ViajeDetalle` actualizado. Reutiliza la clasificación de 409 existente.
- **`features/viajes/detalle/decisionSolicitud.ts`** (+) — función pura `puedeAprobar(viaje): boolean` = `viaje.estado === 'SOLICITADO'` y `fecha_hora_servicio` presente. Punto único del guard, testeable sin UI.
- **`features/viajes/detalle/fechaHoraForm.tsx`** (+) — captura de `fecha_hora_servicio` con `Input type="datetime-local"`; confirmación deshabilitada si el campo está vacío; propaga el error de la mutación. Simétrico a `etaForm.tsx`.
- **`features/viajes/detalle/useDetalleViaje.ts`** (+) — añade `useMutation` de `completarFechaHora`, invalidando `['viaje', id]` al confirmar; expone `completarFechaHora` en el contrato plano del hook.
- **`features/viajes/detalle/DetalleViaje.tsx`** (+) — para una acción `APROBADO` aplica el guard `puedeAprobar`: si falta fecha/hora, el botón va deshabilitado y se muestra el aviso con acción "Completar fecha/hora" que abre el `fechaHoraForm` en `Modal`. La acción `RECHAZADO_POR_AI27` ya abre el modal de causa por `requiereCausa` (E8-T8). Carrera 409 y éxito con `Toast`, igual que E8-T8.

## Correctness Properties (candidatas a PBT)

1. **Guard de aprobación.** Para todo viaje, `puedeAprobar(v)` es verdadero si y solo si `v.estado === 'SOLICITADO'` y `v.fecha_hora_servicio` no es vacío/nulo.
2. **Decisión solo en solicitud.** Para todo estado distinto de `SOLICITADO`, `accionesDesde(estado)` no contiene simultáneamente `APROBADO` y `RECHAZADO_POR_AI27` como par de decisión (se deriva de la máquina, no de una lista).
3. **Rechazo exige causa.** `requiereCausa('RECHAZADO_POR_AI27')` es verdadero (E8-T8), por lo que el rechazo siempre pasa por el modal de causa.
4. **Clasificación de 409.** Un 409 `transicion_no_permitida` al aprobar/rechazar se clasifica como carrera y recarga el estado, sin colapsar en error genérico.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `src/mocks/handlers.ts`:

- Un viaje demo en `SOLICITADO` **con** `fecha_hora_servicio` (aprobable) y otro en `SOLICITADO` **sin** `fecha_hora_servicio` (Aprobar bloqueado, fuerza el flujo de completar fecha/hora).
- Handler de la operación **esperada** de completar fecha/hora: valida que el cuerpo traiga `fecha_hora_servicio`, actualiza el detalle y devuelve `ViajeDetalle`.
- Transición `SOLICITADO → APROBADO` (válida) y `SOLICITADO → RECHAZADO_POR_AI27` (válida, con causa) ya cubiertas por `transicionarViajeMock`.
- Un caso de **carrera** forzable: transición que la UI ofrece pero el mock rechaza con 409 `transicion_no_permitida` para probar Requirement 5.1.

## Decisiones

- **Sin lista de acciones de solicitud:** Aprobar/Rechazar se derivan de `accionesDesde('SOLICITADO')`; el único añadido es el predicado de guard.
- **Brecha aislada (Opción A):** la operación de completar fecha/hora vive en `lib/contracts/viajeDetalle.ts` + `lib/api/viajeDetalle.ts` + mock; el resto del código no asume más que el contrato esperado.
- **Reutilizar E8-T8:** rechazo con causa, clasificación de 409, Toast, delegación de 401 y derivación de acciones se reutilizan tal cual; E8-T9 no los duplica.
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; `Input type="datetime-local"` para la captura, como el ETA.
