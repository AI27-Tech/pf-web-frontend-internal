# Implementation Plan: Bandeja operativa de viajes (E8-T7)

## Overview

El plan implementa la bandeja respetando el orden de capas del diseño, de adentro hacia afuera: primero los tipos de wire tomados del contrato, luego el wrapper de dominio, la adaptación de la brecha de condiciones, el reducer puro, las columnas, el hook, la presentación, el montaje de TanStack Query y, al final, el reemplazo del stub de ruta. Cada capa se prueba antes de montar la siguiente, de modo que no quede código huérfano: la ruta final solo compone piezas ya verificadas.

Las pruebas de propiedad (Vitest + un generador de PBT como `fast-check`, dependencia de desarrollo) usan mínimo 100 iteraciones y la etiqueta `Feature: e8-t7-bandeja-viajes, Property {n}`. Las pruebas de ejemplo de UI montan el componente con un `QueryClientProvider` de prueba y MSW contra el `bff`. Los tests viven bajo `tests/viajes/` reflejando `src/features/viajes/` y `src/lib/`.

Lenguaje de implementación: **TypeScript** (detectado del repo y del diseño).

## Tasks

- [x] 1. Tipos de wire de viajes desde el contrato
  - [x] 1.1 Crear `src/lib/contracts/viajes.ts`
    - Reexportar `ViajeResumen` y `PaginaViajesResumen` desde `components['schemas']` de `@ai27-tech/contracts/openapi/bff`, siguiendo el patrón de `lib/contracts/sesion.ts`.
    - Reexportar `EstadoViaje`, `CondicionViaje` y `ESTADOS_VIAJE` desde `@ai27-tech/contracts/estados`.
    - No escribir ninguna forma de wire a mano; si un tipo esperado no existe en la versión instalada del contrato, dejar nota de brecha (no inventarlo).
    - _Requirements: 1.1, 2.5, 3.1_

- [x] 2. Wrapper de dominio del recurso viajes
  - [x] 2.1 Crear `src/lib/api/viajes.ts` con `listarViajes` y `construirQueryString`
    - Implementar `listarViajes(params, accessToken)` que delega en `request<PaginaViajesResumen>('/viajes…', { accessToken })` de `lib/api/client.ts` (gemelo de `lib/api/sesion.ts`; features/routes nunca llaman a `client.ts` directo).
    - Implementar `construirQueryString` como función pura exportada que fija `estado` y `cursor` solo cuando están presentes y omite las claves ausentes (P10: sin filtrado local).
    - Definir la interfaz `ParamsListarViajes = { estado?: string; cursor?: string }`, limitada a lo que el contrato admite (sin `cliente`).
    - _Requirements: 1.1, 3.2, 3.3, 4.2_

  - [x]* 2.2 Pruebas unitarias de `construirQueryString` en `tests/viajes/viajesApi.test.ts`
    - Casos de ejemplo: sin params → cadena vacía; solo `estado`; solo `cursor`; ambos; valores que requieren codificación.
    - _Requirements: 3.2, 3.3, 4.2_

- [x] 3. Modelo de vista y adaptación de la brecha de condiciones
  - [x] 3.1 Crear `src/features/viajes/viajeVista.ts`
    - Definir `ViajeVista = { id; estado; origen; condiciones_activas? }`, con `estado` como token literal del `bff` (sin normalizar) y `condiciones_activas` opcional marcado como brecha de contrato aislada.
    - Implementar `adaptarItem` preservando el token de estado y dejando el punto de integración de condiciones comentado (no derivar ni inventar condiciones).
    - Implementar `adaptarPagina` que mapea `items` preservando el orden e índice y propaga `cursor_siguiente`.
    - _Requirements: 1.2, 1.4, 1.5, 2.5_

  - [x]* 3.2 Property test de render fiel (orden y conjunto) en `tests/viajes/viajeVista.property.test.ts`
    - **Property 1: Render fiel — orden y conjunto idénticos a lo que entrega el `bff`**
    - **Validates: Requirements 1.2, 1.4, 3.4**
    - Generar `PaginaViajesResumen` arbitrarias y afirmar que `adaptarPagina` produce una fila por ítem, con mismo `id/estado/origen`, en el mismo orden, sin agregar ni omitir.
    - Mínimo 100 iteraciones; etiqueta `Feature: e8-t7-bandeja-viajes, Property 1`.

  - [x]* 3.3 Property test de estado literal en `tests/viajes/viajeVista.property.test.ts`
    - **Property 2: Estado mostrado literal (procedencia del `bff`)**
    - **Validates: Requirements 1.5**
    - Generar tokens `estado` dentro y fuera del enum `EstadoViaje` y afirmar que `adaptarItem` los conserva sin derivar ni sustituir.
    - Mínimo 100 iteraciones; etiqueta `Feature: e8-t7-bandeja-viajes, Property 2`.

- [x] 4. Reducer puro del estado de vista (filtro + cursor)
  - [x] 4.1 Crear `src/features/viajes/bandejaReducer.ts`
    - Definir `EstadoVista = { estado?; cursor? }` y `AccionVista` (`cambiarFiltro`, `siguientePagina`).
    - Implementar `reducir`: `cambiarFiltro` descarta el cursor previo (reinicio de paginación, Req 4.5); `siguientePagina` conserva el filtro y avanza el cursor.
    - Implementar `paramsDesdeVista` que traduce el estado de vista a `{ estado?, cursor? }` para la clave de query.
    - _Requirements: 4.2, 4.5_

  - [x]* 4.2 Property test de mapeo de params con reinicio de cursor en `tests/viajes/bandejaReducer.property.test.ts`
    - **Property 4: Mapeo de selección a query params con reinicio de cursor**
    - **Validates: Requirements 3.2, 3.3, 4.2, 4.5**
    - Generar estados de vista `{ estado?, cursor? }` y afirmar que `paramsDesdeVista` incluye `estado`/`cursor` si y solo si están presentes y nada más; y que aplicar `cambiarFiltro` sobre cualquier (cursor previo, nuevo estado) produce un estado sin el cursor previo.
    - Mínimo 100 iteraciones; etiqueta `Feature: e8-t7-bandeja-viajes, Property 4`.

- [x] 5. Columnas y celdas de la tabla
  - [x] 5.1 Crear `src/features/viajes/filaViaje.tsx`
    - Definir `columnasViaje: Column<ViajeVista>[]` con columnas `id`, `estado`, `origen` y `condiciones`, usando `Table`/`Column` de `@ai27-tech/ui` (no crear componentes nuevos).
    - Renderizar el estado tal cual lo entrega el `bff` con `data-testid="estado"`; renderizar las condiciones en columna separada con `data-testid="condiciones"`, un `Badge` de `@ai27-tech/ui` por condición activa, vacío cuando no hay.
    - Mapear `VARIANTE_CONDICION` cubriendo el enum `CondicionViaje`; columnas no `sortable` (el orden lo fija el `bff`, P10).
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 5.2 Property test de separación estado/condición (P15) en `tests/viajes/filaViaje.property.test.tsx`
    - **Property 3: Estado y condiciones separados (P15)**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Generar combinaciones de un `estado` y cero/una/dos condiciones; renderizar la fila y afirmar que el slot de estado nunca contiene un valor de condición ni viceversa, que hay un `Badge` por condición activa y ninguno cuando el conjunto está vacío.
    - Mínimo 100 iteraciones; etiqueta `Feature: e8-t7-bandeja-viajes, Property 3`.

  - [x]* 5.3 Prueba de ejemplo de variantes de condición (incluida en `tests/viajes/filaViaje.property.test.tsx`)
    - Verificar que `INCIDENCIA` y `SIN_SENAL` provienen del enum `CondicionViaje` y mapean a sus variantes de `Badge` (ejemplo que acompaña a Req 2.5).
    - _Requirements: 2.5_

- [x] 6. Hook de datos de la bandeja
  - [x] 6.1 Crear `src/features/viajes/useBandejaViajes.ts`
    - Conectar `useReducer(reducir)` con `useQuery` (`queryKey: ['viajes', params]`, `retry: false`), tomando el `accessToken` de `useSession`.
    - Exponer contrato plano a la presentación: `filas`, `cursorSiguiente`, `estadoSeleccionado`, `cargando` (`isPending`), `error`, `esNoAutorizado` (`ApiError.kind === 'noAutorizado'`), `reintentar` (`refetch`, mismo filtro, Req 7.2), `cambiarFiltro`, `siguientePagina`.
    - Adaptar `query.data` con `adaptarPagina`; no filtrar ni reordenar en el hook.
    - _Requirements: 1.1, 3.2, 3.3, 4.1, 4.2, 4.5, 5.1, 7.2, 7.3_

  - [x]* 6.2 Property test del estado del control de paginación en `tests/viajes/useBandejaViajes.property.test.tsx`
    - **Property 5: Estado del control de paginación como función de `cursor_siguiente`**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Generar valores de `cursor_siguiente` (nulo y no nulo) servidos por MSW y afirmar que `cursorSiguiente` habilita "siguiente" si y solo si no es nulo, y que avanzar reenvía ese mismo valor como `cursor`.
    - Mínimo 100 iteraciones; etiqueta `Feature: e8-t7-bandeja-viajes, Property 5`.

- [x] 7. Checkpoint — capas internas verificadas
  - Ejecutar las pruebas puras y de hook (reducer, adaptación, wrapper, hook). Asegurar que todas pasan; preguntar al usuario si surgen dudas.

- [x] 8. Montaje de TanStack Query en providers
  - [x] 8.1 Montar `QueryClientProvider` en `src/app/providers.tsx`
    - Crear el `QueryClient` con `defaultOptions.queries = { retry: false, refetchOnWindowFocus: false }` y envolver `SessionProvider` en el lugar que el archivo ya reservaba (no reordenar providers existentes ni cambiar otra configuración).
    - _Requirements: 1.1, 7.1_

- [x] 9. Presentación de la bandeja
  - [x] 9.1 Crear `src/features/viajes/BandejaViajes.tsx`
    - Componer `FilterTable<ViajeVista>` con `columnasViaje`, `loading` (Req 5.1), `emptyState` (Req 6.1), `filters=[filtroEstado]` cuyas opciones salen de `ESTADOS_VIAJE` (Req 3.1/3.5) y `onFilterChange` que llama a `cambiarFiltro` (Req 3.2/3.3/4.5).
    - Componer `Pagination` de `@ai27-tech/ui` mapeando el estado a `cursor_siguiente`: habilitar "siguiente" si y solo si hay cursor, y al avanzar llamar a `siguientePagina(cursorSiguiente)` (Req 4.1/4.2/4.3/4.4).
    - Resolver los cuatro estados de UI con composición local de `Card`/texto de `@ai27-tech/ui` (`MensajeVacio`, `EstadoError` con reintento, `DelegacionSesion`): ramificar primero `esNoAutorizado` (delegar al flujo de sesión del AppShell, Req 7.3), luego `error` (Req 7.1/7.2), y mantener el filtro visible en vacío (Req 6.2).
    - No crear componentes de interfaz nuevos; si una afordancia necesaria no existe en `@ai27-tech/ui` (p. ej. paginación por cursor pura), reportar como brecha, no escribirla a mano.
    - _Requirements: 3.1, 3.4, 3.5, 4.1, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x]* 9.2 Pruebas de ejemplo de los cuatro estados de UI en `tests/viajes/BandejaViajes.test.tsx`
    - Con MSW y `QueryClientProvider` de prueba: (a) estado de carga mientras la petición está en curso (Req 5.1/5.2); (b) estado vacío con filtro visible cuando `items: []` (Req 6.1/6.2); (c) estado de error con acción de reintento que reejecuta `listarViajes` con el filtro vigente (Req 7.1/7.2); (d) respuesta 401 delegada al flujo de sesión del AppShell, sin pintar el error genérico (Req 7.3).
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x]* 9.3 Pruebas de ejemplo de filtro y paginación con MSW en `tests/viajes/BandejaViajes.test.tsx`
    - Seleccionar un estado reejecuta `listarViajes` con `estado` (Req 3.2); limpiarlo reejecuta sin `estado` (Req 3.3); cambiar el filtro reinicia la paginación sin reenviar el `cursor` previo (Req 4.5); la UI muestra solo lo que el `bff` devuelve, sin filtrar en el navegador (Req 3.4/P10).
    - _Requirements: 3.2, 3.3, 3.4, 4.5_

- [x] 10. Reemplazo del stub de ruta y limpieza
  - [x] 10.1 Reemplazar `src/routes/_private/viajes.tsx`
    - Sustituir el stub por `createFileRoute('/_private/viajes')({ component: BandejaViajes })`, siguiendo el patrón de `monitoreo/dashboard.tsx`; eliminar el contenido placeholder del stub de modo que no quede código huérfano.
    - _Requirements: 1.1, 1.3_

- [x] 11. Checkpoint final — verificación del repo
  - [x] 11.1 Ejecutar typecheck, lint y la suite de pruebas del repo
    - Correr el typecheck, el linter y los tests en modo de ejecución única (sin watch) y resolver cualquier error que aparezca.
    - Confirmar que no quedó rastro del stub anterior ni archivos temporales de prueba.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3_

## Notes

- Las tareas marcadas con `*` son pruebas y pueden omitirse para un MVP más rápido; las de implementación (sin `*`) son obligatorias. **Todas las pruebas `*` quedaron implementadas y pasan** (49 tests en 12 archivos; typecheck y lint en verde).
- **Ajuste durante las pruebas (Req 3.3 — limpiar filtro):** el `Select` de `@ai27-tech/ui` renderiza el `placeholder` como opción **deshabilitada**, así que, una vez elegido un estado, el usuario no podía volver a "todos". Se reemplazó el `placeholder` por una opción explícita y seleccionable `{ label: 'Todos los estados', value: '' }` al inicio de las opciones del filtro, en `BandejaViajes.tsx`. Con esto, limpiar el filtro (Req 3.3) es alcanzable por la interfaz. No se creó componente nuevo; es configuración de las opciones del `FilterTable`.
- **Setup de MSW:** los handlers se registran contra el patrón `*/api/v1/viajes` (wildcard de origen) en `tests/viajes/mswServer.ts`, porque `API_BASE_URL` es vacío en test y el cliente emite rutas relativas; un handler con URL absoluta no casaba en MSW 2.15 bajo jsdom.
- Las cinco Correctness Properties del diseño están cubiertas: Property 1 (3.2), Property 2 (3.3), Property 3 (5.2), Property 4 (4.2), Property 5 (6.2). Cada property corre con mínimo 100 iteraciones y la etiqueta `Feature: e8-t7-bandeja-viajes, Property {n}`.
- Los cuatro estados de UI (cargando, vacío, error+reintento, 401 delegado) se cubren con pruebas de ejemplo + MSW en la tarea 9.2.
- **Brechas de contrato (no se resuelven en código aquí; quedan como notas):**
  1. **Condiciones activas por ítem.** `ViajeResumen` del `bff` es `{ id, estado, origen }` y no incluye condiciones. `viajeVista.ts` aísla la brecha con `condiciones_activas` opcional y un punto de integración comentado; no se deriva ni se inventa el campo (P15). Reportar al equipo de contrato.
  2. **Filtro por cliente.** `listarViajes` del `bff` solo admite `estado` y `cursor`; no hay parámetro `cliente`. El filtro por cliente queda fuera de V1 (DEC-045). No se implementa aquí.
  3. **Versión de `@ai27-tech/contracts`.** El trabajo se hace contra el paquete instalado (`0.1.0-tracer.11`); verificar que corresponda a un tag real y que `ViajeResumen`, `EstadoViaje` y `CondicionViaje` existan en esa versión. Punto a verificar, no a inventar.
  4. **Paginación por cursor.** `Pagination` de `@ai27-tech/ui` es por páginas numeradas; se usa como control "avanzar/no avanzar" mapeado a `cursor_siguiente`. Si se requiere una afordancia de cursor pura, reportar a la librería; no construir un control propio.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 6, "tasks": ["11.1"] }
  ]
}
```
