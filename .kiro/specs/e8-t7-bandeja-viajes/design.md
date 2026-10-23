# Design Document

## Overview

Este documento define el diseño de la **bandeja operativa de viajes** (E8-T7): la pantalla del panel administrativo interno que lista los viajes del alcance del usuario autenticado, con su estado de progreso y sus condiciones activas separadas del estado (P15), pidiendo los datos al `bff` y mostrando exactamente lo que el `bff` autoriza y devuelve (P10).

El diseño se construye sobre lo que ya existe en `pf-web-frontend-internal` y no introduce convenciones nuevas:

- **Enrutado:** TanStack Router por archivos. La bandeja reemplaza el stub `src/routes/_private/viajes.tsx` y vive en el outlet del `AppShell` (ruta padre `_private.tsx`, E8-T4).
- **Acceso a datos:** el patrón de capas ya establecido — `lib/api/client.ts` (única puerta HTTP contra el `bff`) → wrapper de dominio en `lib/api/` → tipos de contrato en `lib/contracts/`. El consumo de red se hace contra el paquete generado `@ai27-tech/contracts`.
- **Estado de la petición:** TanStack Query (`@tanstack/react-query`, ya en `package.json`), que hoy está declarado pero **aún no montado** en `src/app/providers.tsx` (el comentario del archivo ya lo anticipa: _"el resto (Query, …) se añadirá aquí"_). Este diseño lo monta.
- **Interfaz:** componentes de `@ai27-tech/ui` (`0.2.0-beta.1`) como única fuente de verdad de UI. Esta tarea **no crea componentes de interfaz nuevos**.
- **Pruebas:** Vitest + Testing Library + MSW, con los tests bajo `tests/` reflejando la estructura de `src/`.

### Hecho de contrato verificado (fundamento del diseño)

Se leyó el contrato instalado `@ai27-tech/contracts@0.1.0-tracer.11` (`src/openapi/bff.gen.ts`). La operación `listarViajes` (`GET /api/v1/viajes`) responde `PaginaViajesResumen`, y hoy:

```ts
// @ai27-tech/contracts/openapi/bff → components['schemas']
ViajeResumen       = { id: Id; estado: string; origen: string }
PaginaViajesResumen = { items: ViajeResumen[]; cursor_siguiente: string | null }
// query de listarViajes
{ estado?: string; cursor?: Cursor }   // Cursor es string opaco
```

Esto tiene tres consecuencias que el diseño asume como hechos, no como supuestos:

1. **`ViajeResumen` trae únicamente `{ id, estado, origen }`.** No incluye condiciones activas, ni `cliente_id`, `destinos`, `fecha_hora_servicio`, `eta_estimado` ni `creado_en`. La forma rica `Viaje`/`FichaTecnica` pertenece a `operacion` y el frontend interno no la consume por el listado.
2. **`estado` es un `string` plano en el wire del `bff`**, no un enum tipado. El enum `EstadoViaje` (y `CondicionViaje`) viven en `@ai27-tech/contracts/estados`, y se usan para **poblar las opciones del filtro** y el mapa de presentación de condiciones, no para validar/normalizar lo que el `bff` devuelve (P10, Requirement 1.5).
3. **La query solo admite `estado` y `cursor`.** No hay parámetro `cliente`; el filtro por cliente queda fuera de V1 (brecha de contrato, Requirement/Brechas #3).

La ausencia de condiciones por ítem (Requirement 2) es una **brecha de contrato abierta** que el diseño maneja explícitamente en la capa de adaptación local, más abajo.

---

## Architecture

### Vista de capas

```
routes/_private/viajes.tsx         (ruta TanStack: compone la pantalla)
        │  usa
        ▼
features/viajes/
  ├─ useBandejaViajes.ts           (hook: TanStack Query + estado de vista)
  ├─ bandejaReducer.ts             (función pura: filtro+cursor → EstadoVista)
  ├─ BandejaViajes.tsx             (presentación: FilterTable + Pagination)
  ├─ filaViaje.tsx                 (columnas Table + celdas estado/condición)
  └─ viajeVista.ts                 (modelo de vista + adaptación de brecha)
        │  usa
        ▼
lib/api/viajes.ts                  (wrapper de dominio: listarViajes)
        │  usa
        ▼
lib/api/client.ts                  (única puerta HTTP contra el bff — ya existe)
        │  tipos
        ▼
lib/contracts/viajes.ts            (tipos de wire desde @ai27-tech/contracts)
```

Se respeta la regla ya vigente en el repo: _"features/ y routes/ hablan con los wrappers, nunca con `client.ts`"_ (ver `lib/api/sesion.ts`). El nuevo wrapper `lib/api/viajes.ts` es el gemelo de `lib/api/sesion.ts` para el recurso `viajes`.

### Flujo de datos (una página del listado)

```
montar ruta
  → useBandejaViajes() calcula params = construirParams(estadoVista)
  → useQuery(['viajes', params], () => listarViajes(params))
  → lib/api/viajes.listarViajes()  →  request<PaginaViajesResumen>('/viajes?...')
  → bff responde PaginaViajesResumen
  → adaptarPagina(pagina) → ViajeVista[]  (orden preservado; condiciones vacías por brecha)
  → BandejaViajes renderiza FilterTable<ViajeVista> + Pagination
```

### Por qué TanStack Query y no un `useEffect` a mano

El repo ya depende de `@tanstack/react-query` y `providers.tsx` reserva el lugar para montarlo. Query da, sin librería nueva, los cuatro estados de UI obligatorios (`isPending`, `isError`, datos vacíos, datos con contenido), el reintento manual (`refetch`) del Requirement 7.2, y el reinicio limpio al cambiar la clave de query cuando cambia el filtro o el cursor (Requirement 4.5). Montarlo es coherente con el diseño previsto, no una desviación; se documenta como el paso que `providers.tsx` ya anticipaba.

> **Decisión de diseño — reintentos automáticos desactivados en esta query.** Para que el estado de error del Requirement 7 sea observable y el 401 se delegue de inmediato (Requirement 7.3), la query se configura con `retry: false`. El reintento es **explícito** (acción del usuario, Requirement 7.2), no automático.

---

## Components and Interfaces

### 1. Ruta — `src/routes/_private/viajes.tsx`

Reemplaza el stub. Sigue el patrón de `monitoreo/dashboard.tsx` (export `Route` con `createFileRoute('/_private/viajes')`). Su único trabajo es componer `BandejaViajes`; la lógica vive en el hook.

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { BandejaViajes } from '@/features/viajes/BandejaViajes';

export const Route = createFileRoute('/_private/viajes')({
  component: BandejaViajes,
});
```

### 2. Tipos de wire — `src/lib/contracts/viajes.ts`

Único punto donde se nombran las formas del wire de viajes, tomadas del contrato generado (como hace `lib/contracts/sesion.ts`). **No se escriben tipos de wire a mano.**

```ts
import type { components } from '@ai27-tech/contracts/openapi/bff';
export type { EstadoViaje, CondicionViaje } from '@ai27-tech/contracts/estados';
export { EstadoViaje, CondicionViaje, ESTADOS_VIAJE } from '@ai27-tech/contracts/estados';

/** Ítem del listado tal como lo entrega el bff: { id, estado, origen }. */
export type ViajeResumen = components['schemas']['ViajeResumen'];
/** Respuesta de listarViajes: { items, cursor_siguiente }. */
export type PaginaViajesResumen = components['schemas']['PaginaViajesResumen'];
```

### 3. Wrapper de dominio — `src/lib/api/viajes.ts`

Gemelo de `lib/api/sesion.ts` para el recurso `viajes`. Construye el query string y delega en `request`. Toma el `accessToken` de la sesión viva (igual que el resto de la app).

```ts
import { request } from './client';
import type { PaginaViajesResumen } from '@/lib/contracts/viajes';

/** Parámetros admitidos por listarViajes (contrato bff): estado y cursor. */
export interface ParamsListarViajes {
  estado?: string;
  cursor?: string;
}

/** Lista viajes del alcance del usuario. El alcance lo deriva el bff del token. */
export async function listarViajes(
  params: ParamsListarViajes,
  accessToken: string,
): Promise<PaginaViajesResumen> {
  const qs = construirQueryString(params);
  return request<PaginaViajesResumen>(`/viajes${qs}`, { accessToken });
}

/** Mapea params → query string. Omite claves ausentes (P10: nada de filtrado local). */
export function construirQueryString(params: ParamsListarViajes): string {
  const sp = new URLSearchParams();
  if (params.estado) sp.set('estado', params.estado);
  if (params.cursor) sp.set('cursor', params.cursor);
  const s = sp.toString();
  return s ? `?${s}` : '';
}
```

`construirQueryString` es una función pura, exportada aparte para poder probarla sin red (base de la Property 4).

### 4. Modelo de vista y adaptación de brecha — `src/features/viajes/viajeVista.ts`

Aquí se aísla la **brecha de contrato** de las condiciones activas (Requirement 2 / P15). El modelo de vista declara `condiciones_activas` como campo **opcional**, y la función de adaptación lo deja vacío mientras el `bff` no lo publique.

```ts
import type { ViajeResumen, PaginaViajesResumen, CondicionViaje } from '@/lib/contracts/viajes';

/**
 * Modelo de vista de una fila de la bandeja.
 *
 * `condiciones_activas` es una BRECHA DE CONTRATO ABIERTA (ver Brechas #1):
 * el ViajeResumen del bff NO entrega condiciones hoy. Se modela como opcional
 * para que, cuando el contrato lo publique, el único cambio sea leerlo en
 * `adaptarItem` (punto de integración marcado abajo). NO se deriva ni se inventa
 * en el frontend (P15, Requirement 2.5).
 */
export interface ViajeVista {
  id: string;
  estado: string; // token literal del bff, sin normalizar (Requirement 1.5)
  origen: string;
  condiciones_activas?: CondicionViaje[];
}

/** Adapta un ítem del wire al modelo de vista, preservando el token de estado. */
export function adaptarItem(item: ViajeResumen): ViajeVista {
  return {
    id: item.id,
    estado: item.estado,
    origen: item.origen,
    // ── PUNTO DE INTEGRACIÓN (brecha de contrato) ─────────────────────────
    // Cuando el bff publique condiciones por ítem en ViajeResumen, leerlas aquí:
    //   condiciones_activas: item.condiciones_activas,
    // Hasta entonces el campo queda ausente y la columna de condición va vacía.
    // ──────────────────────────────────────────────────────────────────────
  };
}

/** Adapta la página completa. Preserva el ORDEN de `items` (P10, Requirement 1.4). */
export function adaptarPagina(pagina: PaginaViajesResumen): {
  filas: ViajeVista[];
  cursorSiguiente: string | null;
} {
  return {
    filas: pagina.items.map(adaptarItem), // map preserva orden e índice
    cursorSiguiente: pagina.cursor_siguiente,
  };
}
```

Esta capa es la única que conoce la brecha; el resto del componente trabaja contra `ViajeVista` como si las condiciones ya existieran. El cambio futuro es una sola línea.

### 5. Columnas y celdas — `src/features/viajes/filaViaje.tsx`

Define las columnas de la `Table` limitadas a lo que el contrato entrega hoy, más la columna de condiciones (provisional por brecha). El estado y la condición se renderizan en **columnas separadas** (P15, Requirement 2.2).

| Columna       | `key`         | Fuente                                    | Celda                                  |
| ------------- | ------------- | ----------------------------------------- | -------------------------------------- |
| Identificador | `id`          | `ViajeResumen.id`                         | texto                                  |
| Estado        | `estado`      | `ViajeResumen.estado`                     | indicador de estado (token literal)    |
| Origen        | `origen`      | `ViajeResumen.origen`                     | texto                                  |
| Condiciones   | `condiciones` | `ViajeVista.condiciones_activas` (brecha) | `Badge` por condición; vacío si no hay |

```tsx
import { Badge } from '@ai27-tech/ui';
import type { Column } from '@ai27-tech/ui';
import { CondicionViaje } from '@/lib/contracts/viajes';
import type { ViajeVista } from './viajeVista';

/** Variante de Badge por condición (P15: la condición NUNCA sustituye al estado). */
const VARIANTE_CONDICION: Record<CondicionViaje, 'alert' | 'warning'> = {
  [CondicionViaje.Incidencia]: 'alert',
  [CondicionViaje.SinSenal]: 'warning',
};

export const columnasViaje: Column<ViajeVista>[] = [
  { key: 'id', header: 'Viaje', accessor: 'id' },
  {
    key: 'estado',
    header: 'Estado',
    // El estado se muestra tal cual lo entrega el bff (Requirement 1.5).
    cell: (v) => <span data-testid="estado">{v.estado}</span>,
  },
  { key: 'origen', header: 'Origen', accessor: 'origen' },
  {
    key: 'condiciones',
    header: 'Condiciones',
    cell: (v) => (
      <span data-testid="condiciones" style={{ display: 'flex', gap: 'var(--ui-space-1)' }}>
        {(v.condiciones_activas ?? []).map((c) => (
          <Badge key={c} variant={VARIANTE_CONDICION[c]} dot>
            {c}
          </Badge>
        ))}
      </span>
    ),
  },
];
```

El `data-testid="estado"` y `data-testid="condiciones"` dan celdas distinguibles para las pruebas de P15 (que verifican que una condición nunca cae en el slot de estado). Las columnas **no** son `sortable`: el orden lo fija el `bff` (P10).

### 6. Estado de vista (función pura) — `src/features/viajes/bandejaReducer.ts`

La máquina de estados de la vista es pura y testeable sin React. Modela las dos únicas entradas que el usuario controla —filtro y cursor— y codifica el **reinicio de cursor al cambiar filtro** (Requirement 4.5).

```ts
export interface EstadoVista {
  estado?: string; // valor del Filtro_Estado; undefined = "todos"
  cursor?: string; // cursor vigente; undefined = primera página
}

export type AccionVista =
  { tipo: 'cambiarFiltro'; estado?: string } | { tipo: 'siguientePagina'; cursor: string };

export function reducir(_prev: EstadoVista, accion: AccionVista): EstadoVista {
  switch (accion.tipo) {
    case 'cambiarFiltro':
      // Requirement 4.5: cambiar filtro reinicia la paginación (descarta cursor).
      return accion.estado ? { estado: accion.estado } : {};
    case 'siguientePagina':
      // Conserva el filtro vigente, avanza con el nuevo cursor.
      return { ..._prev, cursor: accion.cursor };
  }
}

/** Mapea el estado de vista a los params del wrapper (base de la clave de query). */
export function paramsDesdeVista(v: EstadoVista): { estado?: string; cursor?: string } {
  return { ...(v.estado ? { estado: v.estado } : {}), ...(v.cursor ? { cursor: v.cursor } : {}) };
}
```

### 7. Hook de datos — `src/features/viajes/useBandejaViajes.ts`

Conecta el estado de vista con TanStack Query y expone a la presentación un contrato plano (estados de UI + acciones).

```ts
import { useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import { listarViajes } from '@/lib/api/viajes';
import { adaptarPagina } from './viajeVista';
import { reducir, paramsDesdeVista, type EstadoVista } from './bandejaReducer';

export function useBandejaViajes() {
  const { sesion /* delegación de sesión del AppShell */ } = useSession();
  const [vista, dispatch] = useReducer(reducir, {} as EstadoVista);
  const params = paramsDesdeVista(vista);

  const query = useQuery({
    queryKey: ['viajes', params], // cambia con filtro y cursor → refetch
    queryFn: () => listarViajes(params, sesion!.accessToken),
    retry: false, // el reintento es explícito (Req 7.2)
    // 401 se detecta en el componente/efecto por query.error (ver abajo).
  });

  const datos = query.data ? adaptarPagina(query.data) : undefined;

  return {
    filas: datos?.filas ?? [],
    cursorSiguiente: datos?.cursorSiguiente ?? null,
    estadoSeleccionado: vista.estado,
    cargando: query.isPending,
    error: query.isError ? query.error : null,
    esNoAutorizado: query.error instanceof ApiError && query.error.kind === 'noAutorizado',
    reintentar: () => void query.refetch(), // mismo queryKey = mismo filtro (Req 7.2)
    cambiarFiltro: (estado?: string) => dispatch({ tipo: 'cambiarFiltro', estado }),
    siguientePagina: (cursor: string) => dispatch({ tipo: 'siguientePagina', cursor }),
  };
}
```

### 8. Presentación — `src/features/viajes/BandejaViajes.tsx`

Compone `FilterTable` (que envuelve `Table`) con las columnas, el filtro de estado y la paginación. Resuelve los **cuatro estados de UI**.

```tsx
import { FilterTable, Pagination } from '@ai27-tech/ui';
import type { FilterDefinition } from '@ai27-tech/ui';
import { ESTADOS_VIAJE } from '@/lib/contracts/viajes';
import { columnasViaje } from './filaViaje';
import { useBandejaViajes } from './useBandejaViajes';

// Opciones del Filtro_Estado desde el enum (Requirement 3.1).
const filtroEstado: FilterDefinition = {
  key: 'estado',
  placeholder: 'Todos los estados',
  options: ESTADOS_VIAJE.map((e) => ({ label: e, value: e })),
};

export function BandejaViajes() {
  const b = useBandejaViajes();

  // Requirement 7.3: 401 se delega al flujo de sesión del AppShell, no al error de listado.
  if (b.esNoAutorizado) {
    // El AppShell/SessionContext maneja el cierre/relogin; aquí no se pinta error genérico.
    return <DelegacionSesion />; // dispara logout()/redirect del flujo de sesión
  }

  if (b.error) {
    return <EstadoError onReintentar={b.reintentar} />; // Requirement 7.1, 7.2
  }

  return (
    <>
      <FilterTable<ViajeVista>
        columns={columnasViaje}
        data={b.filas}
        loading={b.cargando} // Requirement 5.1
        emptyState={<MensajeVacio />} // Requirement 6.1
        filters={[filtroEstado]} // Requirement 3.5
        filterValues={{ estado: b.estadoSeleccionado ?? '' }}
        onFilterChange={(_key, value) => b.cambiarFiltro(value || undefined)} // Req 3.2/3.3/4.5
        aria-label="Bandeja de viajes"
      />
      <Pagination // Requirement 4.4
        page={1}
        pageSize={b.filas.length || 1}
        total={b.cursorSiguiente ? b.filas.length + 1 : b.filas.length} // habilita "siguiente" si hay cursor
        onPageChange={() => b.cursorSiguiente && b.siguientePagina(b.cursorSiguiente)} // Req 4.2
      />
    </>
  );
}
```

> **Nota sobre `Pagination` y el cursor (brecha de afordancia, no de contrato).** El `Pagination` de la librería es de **páginas numeradas** (`page`, `pageSize`, `total`), pensado para paginación por offset, mientras que el `bff` pagina por **cursor opaco** (Requirement 4). El diseño usa `Pagination` como el control de "avanzar/no avanzar" que exige la Definición de Terminado: hay siguiente página **si y solo si** `cursor_siguiente` no es nulo (Requirement 4.1/4.3), y avanzar dispara la petición con `cursor = cursor_siguiente` (Requirement 4.2). El mapeo de `total` codifica "¿hay siguiente?" sin inventar un conteo que el `bff` no entrega. **Brecha registrada:** la librería no ofrece hoy un control de paginación por cursor (prev/next puro). Si se requiere una afordancia más fiel (sin número de página sintético), se reporta a `@ai27-tech/ui`; no se construye un control propio (restricción de la tarea).

`MensajeVacio`, `EstadoError` y `DelegacionSesion` se componen con `Card`/texto de `@ai27-tech/ui` y tokens de estilo; no son componentes de interfaz nuevos en el sentido de la librería (son composición local de los primitivos existentes, igual que los stubs actuales usan `Card`).

### 9. Montaje de TanStack Query — `src/app/providers.tsx`

Se añade el `QueryClientProvider` en el lugar que el archivo ya reservaba. Es el único cambio fuera de la feature.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/context/SessionContext';
import '@ai27-tech/ui/styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
```

---

## Data Models

### Formas del wire (desde el contrato, no escritas a mano)

| Tipo                    | Origen                             | Forma                                                         |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `ViajeResumen`          | `@ai27-tech/contracts/openapi/bff` | `{ id: string; estado: string; origen: string }`              |
| `PaginaViajesResumen`   | idem                               | `{ items: ViajeResumen[]; cursor_siguiente: string \| null }` |
| `EstadoViaje`           | `@ai27-tech/contracts/estados`     | enum-como-dato (13 tokens, ADR 19)                            |
| `CondicionViaje`        | idem                               | `"INCIDENCIA" \| "SIN_SENAL"`                                 |
| query de `listarViajes` | contrato                           | `{ estado?: string; cursor?: string }`                        |

### Modelo de vista (propio de la app, mínimo)

| Tipo          | Forma                                          | Nota                                                        |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `ViajeVista`  | `{ id; estado; origen; condiciones_activas? }` | `condiciones_activas` opcional = brecha de contrato aislada |
| `EstadoVista` | `{ estado?; cursor? }`                         | único estado mutable de la bandeja                          |

`ViajeVista` **no duplica** el contrato: reexpone `id/estado/origen` del wire y añade el único campo de brecha, claramente marcado como provisional en `adaptarItem`.

---

## Mapeo Requisito → Componente de `@ai27-tech/ui` → Punto de contrato

| Requirement                                       | Componente(s) `@ai27-tech/ui`                      | Punto de contrato                                 | Notas                                                  |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| 1.1 solicitar `listarViajes` al montar            | — (hook + wrapper)                                 | `GET /api/v1/viajes` (`listarViajes`)             | vía `lib/api/viajes.ts`                                |
| 1.2 una fila por ítem con id/estado/origen        | `Table` (vía `FilterTable`)                        | `ViajeResumen`                                    | `columnasViaje`                                        |
| 1.3 renderizar con `Table`                        | `Table`/`FilterTable`                              | —                                                 | `Column<ViajeVista>`                                   |
| 1.4 orden del `bff`                               | `Table`                                            | `PaginaViajesResumen.items`                       | `adaptarPagina` preserva orden; columnas no `sortable` |
| 1.5 estado literal, sin derivar                   | `Table` (celda)                                    | `ViajeResumen.estado` (`string`)                  | token tal cual                                         |
| 2.1 condiciones como indicador distinto           | `Badge`                                            | **brecha** (`ViajeVista.condiciones_activas`)     | `Badge` por condición                                  |
| 2.2–2.4 estado y condición separados (P15)        | `Table` (columnas `estado` vs `condiciones`)       | `EstadoViaje` vs `CondicionViaje`                 | celdas con `data-testid` distintos                     |
| 2.5 valores de condición del enum                 | `Badge`                                            | `CondicionViaje` (`@ai27-tech/contracts/estados`) | `VARIANTE_CONDICION` cubre el enum                     |
| 3.1 opciones del filtro desde el enum             | `FilterTable` (`FilterDefinition`)                 | `ESTADOS_VIAJE`                                   | `filtroEstado.options`                                 |
| 3.2/3.3 refetch con/sin `estado`                  | `FilterTable` (`onFilterChange`)                   | query `estado`                                    | `construirQueryString`                                 |
| 3.4 solo lo que devuelve el `bff` (P10)           | `Table`                                            | `PaginaViajesResumen.items`                       | sin predicado local                                    |
| 3.5 control de filtro con `FilterTable`           | `FilterTable` (`FilterDefinition`, `FilterValues`) | —                                                 | —                                                      |
| 4.1/4.3 estado del control por `cursor_siguiente` | `Pagination`                                       | `PaginaViajesResumen.cursor_siguiente`            | `total` codifica "hay siguiente"                       |
| 4.2 siguiente página con `cursor`                 | `Pagination` (`onPageChange`)                      | query `cursor`                                    | `siguientePagina(cursor)`                              |
| 4.4 control con `Pagination`                      | `Pagination`                                       | —                                                 | brecha: paginación por cursor                          |
| 4.5 reinicio de paginación al cambiar filtro      | `FilterTable` + `Pagination`                       | query (sin `cursor`)                              | `reducir('cambiarFiltro')`                             |
| 5.1/5.2 estado de carga                           | `Table` (`loading`)                                | —                                                 | `query.isPending`                                      |
| 6.1/6.2 estado vacío + filtro visible             | `Table` (`emptyState`), `FilterTable`              | `items: []`                                       | filtro siempre montado                                 |
| 7.1/7.2 error + reintento                         | `Card`/texto + acción `refetch`                    | fallo de `request`                                | `retry: false`, `reintentar()`                         |
| 7.3 401 → flujo de sesión del AppShell            | — (delegación)                                     | `401 NoAutorizado`                                | `ApiError.kind === 'noAutorizado'`                     |

---

## Error Handling

El cliente HTTP ya traduce el código a `ApiError` con su `kind` (`lib/api/errors.ts`): `401/403 → 'noAutorizado'`, `5xx → 'degradado'`, red → `'red'`, etc. La bandeja ramifica sobre `kind`, no sobre el mensaje:

1. **401 (`noAutorizado`) — Requirement 7.3.** No se pinta el error genérico del listado. Se delega al flujo de sesión del `AppShell`/`SessionContext` (el mismo que ya refresca/cierra sesión). El `useBandejaViajes` expone `esNoAutorizado`; `BandejaViajes` lo detecta antes que cualquier otro error y cede el control al flujo de sesión (p. ej. `logout()` + redirección de la guarda `_private`, que preserva `?redirect=`).
2. **Cualquier otro fallo (`degradado`, `red`, `conflicto`, `noEncontrado`) — Requirement 7.1/7.2.** Se muestra un mensaje de error en lugar del listado, con una acción de **reintento** que vuelve a ejecutar `listarViajes` con el **filtro vigente** (mismo `queryKey` → mismos params). Con `retry: false`, el error es inmediato y la recuperación es decisión del usuario.
3. **Vacío ≠ error — Requirement 6.** `items: []` es una respuesta exitosa: se muestra el estado vacío (mensaje de "sin viajes en tu alcance"), con el filtro visible para cambiarlo. Nunca se confunde con el estado de error.

---

## Testing Strategy

Marco del repo: **Vitest + @testing-library/react + MSW**, con tests bajo `tests/` reflejando `src/` (p. ej. `tests/viajes/…`). Las pruebas puras (reducer, mapeo de params, adaptación) no necesitan DOM. Las de UI montan el componente con un `QueryClientProvider` de prueba y MSW para el `bff`.

**Enfoque dual:**

- **Pruebas unitarias / de ejemplo:** cubren las ramas concretas de UI (montaje llama a `listarViajes`, carga, vacío, error, reintento, 401 delegado, composición con los componentes de la librería, procedencia de opciones y variantes de condición).
- **Pruebas de propiedad:** cubren las garantías universales (render fiel de orden y conjunto, estado literal, separación estado/condición, mapeo de params con reinicio de cursor, estado del control de paginación). Mínimo **100 iteraciones** por property, con generadores de `ViajeResumen`, listas de ítems, tokens de estado (dentro y fuera del enum) y combinaciones de condiciones.

**Configuración de property tests:** cada property referencia su propiedad de diseño con la etiqueta **Feature: e8-t7-bandeja-viajes, Property {n}: {texto}**. Se puede usar un generador propio ligero o una librería de PBT del ecosistema (p. ej. `fast-check`); si se añade, se registra como dependencia de desarrollo, no de runtime.

**Pruebas que demuestran la Definición de Terminado:**

- _"Estado y condición se muestran separados (P15)"_ → Property 3 + ejemplo de 2.5.
- _"La UI no reordena ni filtra lo del `bff` (P10)"_ → Property 1 (orden+conjunto idénticos) + Property 4 (los params solo trasladan la selección al `bff`, no filtran localmente).
- _"El filtro cambia la petición y reinicia la paginación"_ → Property 4 (reinicio de cursor) + ejemplos de 3.2/3.3/4.5 con MSW.
- _"Cuatro estados de UI"_ → ejemplos de 5.1, 6.1, 7.1/7.2, 7.3.

**Qué NO se prueba aquí (coherente con las brechas):** el cálculo de alcance por rol (es del `bff`, Brechas #5); el poblado real de condiciones por ítem (brecha de contrato abierta — se prueba el _modelo de vista_ con condiciones inyectadas, no que el `bff` las entregue).

---

## Correctness Properties

_Una propiedad es una característica o comportamiento que debe cumplirse en todas las ejecuciones válidas del sistema: un enunciado formal de lo que el sistema debe hacer. Las propiedades son el puente entre la especificación legible por humanos y las garantías de corrección verificables por máquina._

### Property 1: Render fiel — orden y conjunto idénticos a lo que entrega el `bff`

_Para toda_ `PaginaViajesResumen` devuelta por el `bff`, la bandeja renderiza exactamente una fila por cada ítem de `items`, con el mismo `id`, `estado` y `origen`, y en el **mismo orden** en que `items` los entrega; no se filtra, no se reordena, no se agrega ni se omite ninguna fila en el navegador.

**Validates: Requirements 1.2, 1.4, 3.4**

### Property 2: Estado mostrado literal (procedencia del `bff`)

_Para todo_ `ViajeResumen` recibido, el indicador de estado de su fila muestra el token `estado` exactamente como lo entregó el `bff`, incluso si ese token no pertenece al enum `EstadoViaje` conocido; el frontend nunca deriva, normaliza ni sustituye el estado.

**Validates: Requirements 1.5**

### Property 3: Estado y condiciones separados (P15)

_Para toda_ combinación de un `estado` y un conjunto de cero, una o dos condiciones activas (`CondicionViaje`) en una fila, el indicador de estado y los indicadores de condición ocupan elementos de interfaz distintos: se renderiza un `Badge` por cada condición activa, ningún valor de condición aparece en el lugar del estado ni el estado en el lugar de una condición, y cuando no hay condiciones no se renderiza ningún indicador de condición.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Mapeo de selección a query params con reinicio de cursor

_Para todo_ estado de vista `{ estado?, cursor? }`, el query string enviado a `listarViajes` contiene el parámetro `estado` si y solo si hay un estado seleccionado, y el parámetro `cursor` si y solo si hay un cursor vigente, sin ningún otro parámetro; y _para todo_ par (cursor previo, nuevo estado), aplicar un cambio de filtro produce un estado de vista sin el cursor previo (la paginación se reinicia a la primera página del listado filtrado).

**Validates: Requirements 3.2, 3.3, 4.2, 4.5**

### Property 5: Estado del control de paginación como función de `cursor_siguiente`

_Para todo_ valor de `cursor_siguiente` en la respuesta, el control de paginación habilita la acción de siguiente página si y solo si `cursor_siguiente` no es nulo; cuando es nulo, el control indica que no hay más páginas, y cuando no lo es, avanzar envía ese mismo valor como el parámetro `cursor` de la siguiente petición.

**Validates: Requirements 4.1, 4.2, 4.3**
