# Design Document

## Overview

Diseño del **detalle del viaje: avance y ETA manual** (E8-T8): la pantalla del panel interno que, para un viaje concreto, deriva las transiciones permitidas desde la máquina de estados generada, las ejecuta vía `bff`, y permite fijar el ETA a mano. Se construye sobre las convenciones ya establecidas en `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que la bandeja (E8-T7), sin introducir patrones nuevos.

### Hecho de contrato verificado (fundamento del diseño)

El `bff` (`bff.gen.ts`) hoy NO expone transiciones, ETA ni una lectura con estado canónico. Esas operaciones existen solo en `operacion` (`operacion.yaml`):

```
POST /api/v1/viajes/{id}/transiciones  (transicionarViaje)  body TransicionEntrada { a_estado, causa? }  → 200 Viaje / 409 transicion_no_permitida
PATCH /api/v1/viajes/{id}/eta          (fijarEta)           body EtaEntrada { eta_estimado }             → 200 Viaje / 409 viaje_en_estado_terminal
(detalle)  ViajeDetalle { viaje: Viaje{ id, estado, origen, destinos[], fecha_hora_servicio?, eta_estimado? }, condiciones_activas[] }
```

La derivación de acciones **ya existe como dato generado** en `@ai27-tech/contracts/estados`:

```ts
TRANSICIONES_VIAJE: ReadonlyArray<readonly [EstadoViaje, EstadoViaje]>
puedeTransicionar(de, a): boolean
esTerminal(e): boolean
ESTADOS_TERMINALES: readonly EstadoViaje[]
```

Consecuencia de diseño: NO se escribe tabla de transiciones; las acciones se calculan filtrando `TRANSICIONES_VIAJE` por el estado actual. Retirar una arista del contrato cambia la UI sin editarla (DoD de la historia).

La ausencia de los endpoints en el `bff` se maneja como **brecha de contrato aislada**: tipos de wire esperados en una sola capa (`lib/contracts/viajeDetalle.ts`) y mocks (MSW) que los sirven. Cuando el `bff` publique el contrato, se reemplazan esos tipos por los generados de `@ai27-tech/contracts/openapi/bff` — cambio de importación, no reescritura.

## Architecture

### Vista de capas

```
routes/_private/viajes.$id.tsx       (ruta TanStack: compone la pantalla; enlazada desde la fila de la bandeja)
        │  usa
        ▼
features/viajes/detalle/
  ├─ useDetalleViaje.ts              (hook: TanStack Query de lectura + mutaciones de transición/ETA)
  ├─ accionesTransicion.ts          (función pura: estado actual → Acciones vía puedeTransicionar)
  ├─ DetalleViaje.tsx               (presentación: Card/Button/Badge/Modal/Form/Toast)
  └─ etaForm.tsx                    (captura de ETA: Form + FormField + Input)
        │  usa
        ▼
lib/api/viajeDetalle.ts             (wrapper: obtenerDetalle, transicionar, fijarEta; clasifica 409 por código)
        │  usa
        ▼
lib/api/client.ts                   (única puerta HTTP contra el bff — ya existe)
        │  tipos
        ▼
lib/contracts/viajeDetalle.ts       (tipos de wire ESPERADOS; brecha de contrato aislada)
```

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                                  | Componente                                        |
| ------------------------------------------ | ------------------------------------------------- |
| Contenedor y secciones del detalle         | `Card`, `CardHeader`, `CardBody`, `CardFooter`    |
| Acciones de transición                     | `Button`                                          |
| Estado actual y condiciones activas        | `Badge`                                           |
| Confirmar transición que requiere causa    | `Modal` + `Form`/`FormField` + `Input`/`Textarea` |
| Capturar ETA                               | `Form`, `FormField`, `Input` (datetime), `Button` |
| Rechazo por carrera / error / confirmación | `Toast` + `ToastContainer`                        |
| Aclaración "estimado, no en vivo"          | `Tooltip` / texto                                 |

## Componentes y responsabilidades

- **`lib/contracts/viajeDetalle.ts`** — tipos de wire esperados (`ViajeDetalle`, `TransicionEntrada`, `EtaEntrada`), documentados como brecha; reexporta `EstadoViaje` y los helpers de transición. Único punto de cambio cuando el `bff` publique el contrato.
- **`lib/api/viajeDetalle.ts`** — `obtenerDetalle(id, token)`, `transicionar(id, { a_estado, causa? }, token)`, `fijarEta(id, { eta_estimado }, token)`. Delegan en `request` de `client.ts` y traducen el 409 a una clase de error por `codigo` (`transicion_no_permitida`, `viaje_en_estado_terminal`), para que la presentación decida la política.
- **`features/viajes/detalle/accionesTransicion.ts`** — función pura `accionesDesde(estado): EstadoViaje[]` que filtra `TRANSICIONES_VIAJE` por origen y excluye lo inalcanzable (`PATRULLA_EN_CAMINO`). Si `esTerminal(estado)`, devuelve lista vacía.
- **`features/viajes/detalle/useDetalleViaje.ts`** — `useQuery` para la lectura (`queryKey: ['viaje', id]`, `retry: false`) + `useMutation` para transición y ETA, invalidando la lectura al confirmar. Expone contrato plano a la presentación (`viaje`, `acciones`, `cargando`, `error`, `esNoAutorizado`, `transicionar`, `fijarEta`, `reintentar`).
- **`features/viajes/detalle/DetalleViaje.tsx`** — composición de la vista: cabecera con estado y condiciones, lista de acciones, modal de causa cuando aplica, formulario de ETA, y los avisos de carrera/error con `Toast`. Ramifica `esNoAutorizado` (delegar al AppShell) antes del error genérico.
- **`routes/_private/viajes.$id.tsx`** — `createFileRoute` que compone `DetalleViaje`; la fila de la bandeja (E8-T7) enlaza aquí.

## Correctness Properties (candidatas a PBT)

1. **Acciones = aristas del contrato.** Para todo estado, `accionesDesde(estado)` es exactamente `{ a | puedeTransicionar(estado, a) }` menos `PATRULLA_EN_CAMINO`. Retirar una arista cambia el resultado sin tocar la UI.
2. **Terminal sin acciones.** Para todo `e` con `esTerminal(e)`, `accionesDesde(e)` es vacío.
3. **Clasificación de 409.** Para todo 409 del wrapper, el `codigo` se mapea a la clase de error esperada (`transicion_no_permitida` → carrera; `viaje_en_estado_terminal` → ETA bloqueado) sin colapsarlos en un error genérico.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir el contrato esperado:

- lectura de detalle por id (incluye estado canónico, destinos y `eta_estimado`);
- transición validada contra `puedeTransicionar` (409 `transicion_no_permitida` si la arista no existe);
- ETA (409 `viaje_en_estado_terminal` si el viaje es terminal);
- un caso de **carrera** forzable (transición que la UI ofrece pero el mock rechaza) para probar Requirement 3.3.

## Decisiones

- **Sin tabla de transiciones propia:** se usa `TRANSICIONES_VIAJE`/`puedeTransicionar` del contrato generado (DoD de la historia).
- **Brecha aislada en una capa:** toda la incertidumbre de contrato vive en `lib/contracts/viajeDetalle.ts` + mocks; el resto del código no asume más que el contrato esperado.
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; cualquier afordancia faltante se reporta como brecha.
