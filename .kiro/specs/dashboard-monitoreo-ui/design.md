# Design Document

## Overview

Se recompone `DashboardMonitoreo.tsx` en bloques pequeños, cada uno con una responsabilidad visual, y se extraen funciones puras para lo que hoy está mezclado en el JSX. Los hooks de datos y el contrato no cambian.

Forma de los datos (ya existente, no se modifica):

- `ReporteViajes`: `filas: FilaViaje[]` (`viaje_id`, `estado`, `creado_en`, `cerrado_en`) y marca de frescura.
- `ReporteEstados`: `conteos: { estado, conteo }[]` y marca de frescura.
- `conteosEnCurso(filas)` ya produce los conteos de la vista `en_curso`.

## Arquitectura

```
DashboardMonitoreo            (título siempre visible, guarda de rol)
└─ DashboardAutorizado
   ├─ EncabezadoDashboard     PageHeader + IndicadorFrescura + botón Actualizar + ProgressBar de recarga
   ├─ FilterBar               vista (sin cambios)
   ├─ FilaKpis                Grid de Stat
   ├─ Grid 2 zonas
   │  ├─ DistribucionEstados  Section + filas Badge/ProgressBar/conteo
   │  └─ TablaViajes          Section + Table + Pagination
   └─ estados: prohibido | error | vacío | cargando
```

Estructura de archivos (dentro de `src/features/monitoreo/dashboard/`):

| Archivo                                  | Tipo | Contenido                                                                                                           |
| ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- |
| `kpis.ts`                                | puro | `kpisEnCurso(conteos)`, `kpisRango(filas, conteos)`                                                                 |
| `distribucion.ts`                        | puro | `distribucionPorEstado(conteos)`: porcentaje entero, orden por conteo desc y alfabético                             |
| `estadoBadge.ts`                         | puro | `ESTADO_BADGE: Record<EstadoViaje, { variant, appearance, pulse }>` y `badgeDeEstado(token)` con respaldo `neutral` |
| `paginar.ts`                             | puro | `paginar(filas, pagina, tamano)` y `ajustarPagina(pagina, total, tamano)`                                           |
| `FilaKpis.tsx`                           | UI   | KPIs con iconos                                                                                                     |
| `DistribucionEstados.tsx`                | UI   | Distribución con barras                                                                                             |
| `TablaViajes.tsx`                        | UI   | Tabla con badges y paginación                                                                                       |
| `EncabezadoDashboard.tsx`                | UI   | Encabezado y recarga                                                                                                |
| `dashboard.module.css` o `dashboard.css` | CSS  | Solo tokens `--ui-*`; animación de entrada                                                                          |

`useDashboardMonitoreo` recibe dos adiciones: `recargando` (`isFetching && !isLoading` de las consultas activas) y `actualizar` (`refetch` de las consultas activas). Ninguna cambia contrato ni claves de query.

## Decisiones

**D1. KPIs derivados, sin tendencia.** Se calculan de datos ya cargados. `Stat.trend` requiere un periodo previo que hoy no se consulta; pedirlo sería superficie nueva (BRECHAS-UI #1).

**D2. Barra = proporción, no «avance».** El `ProgressBar` muestra `conteo/total`. No hay regla de negocio que defina porcentaje de avance de un viaje y no se inventa una.

**D3. Un solo mapa estado → Badge.** La paleta tiene ocho variantes y tres apariencias; el mapa usa `variant` para la familia y `appearance` para el matiz (guía del steering §4). Propuesta inicial, de trabajo, sujeta a aprobación de Producto:

| Estado                    | variant     | appearance | dot/pulse   |
| ------------------------- | ----------- | ---------- | ----------- |
| `SOLICITADO`              | `info`      | `soft`     | no          |
| `APROBADO`                | `primary`   | `soft`     | no          |
| `ASIGNADO`                | `secondary` | `soft`     | no          |
| `APTO_PARA_SALIDA`        | `secure`    | `outline`  | no          |
| `EN_EMBARQUE`             | `escort`    | `soft`     | dot + pulse |
| `PATRULLA_EN_CAMINO` (V2) | `escort`    | `outline`  | dot         |
| `EN_TRANSITO`             | `escort`    | `solid`    | dot + pulse |
| `EN_DESTINO`              | `warning`   | `soft`     | dot + pulse |
| `EN_DESCARGA`             | `warning`   | `solid`    | dot + pulse |
| `CERRADO`                 | `secure`    | `soft`     | no          |
| `CANCELADO`               | `neutral`   | `outline`  | no          |
| `RECHAZADO_POR_AI27`      | `alert`     | `soft`     | no          |
| `RECHAZADO_POR_CLIENTE`   | `alert`     | `outline`  | no          |
| desconocido               | `neutral`   | `soft`     | no          |

Nota: `alert` se reserva para rechazos y para condiciones (`VARIANTE_CONDICION`), de modo que un estado terminal no se confunda con una incidencia activa. Producto puede ajustar la tabla sin tocar componentes.

**D4. Recarga con `ProgressBar` indeterminado.** Verificado en la librería: sin `value` se renderiza indeterminado. Evita spinners centrados y no desmonta los datos.

**D5. Paginación en cliente.** El reporte ya trae todas las filas en memoria; la librería `Table` no pagina por sí misma, así que se compone `Table` + `Pagination`. Paginación en servidor queda fuera de alcance.

**D6. Movimiento.** Primero lo de la librería (shimmer, pulse, transición de la barra, hover). Una sola animación propia de entrada (`opacity` y `translateY` con tokens de espaciado), escalonada con `animation-delay` por índice, desactivada con `prefers-reduced-motion`. Va en CSS del portal con `// BRECHA-UI`.

## Composición con `@ai27-tech/ui`

| Necesidad                   | Componente                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Encabezado, ruta y acciones | `PageHeader`                                                                             |
| Bloques                     | `Section`                                                                                |
| KPIs                        | `Grid` + `Stat` (`icon`, `helpText`, `loading`)                                          |
| Proporciones                | `ProgressBar` (`label`, `size="md"`)                                                     |
| Estado y condición          | `Badge` (`variant`, `appearance`, `dot`, `pulse`, `pill`)                                |
| Tabla                       | `Table` (`loading`, `loadingRows`, `hoverable`, `striped`, `stickyHeader`, `emptyState`) |
| Paginación                  | `Pagination` (`pageSizeOptions`, `showInfo`)                                             |
| Carga inicial               | `Stat loading`, `Skeleton`, `SkeletonText`, `Table loading` o `SkeletonTable`            |
| Recarga                     | `ProgressBar` indeterminado, `Button` con estado ocupado                                 |
| Avisos                      | `Alert`, `EmptyState`, `BloqueError` (componente del portal ya existente)                |
| Iconos                      | `lucide-react`: `Truck`, `Activity`, `CheckCircle2`, `Layers`, `RefreshCw`               |

## Estados de UI

| Estado     | KPIs           | Distribución        | Tabla                               |
| ---------- | -------------- | ------------------- | ----------------------------------- |
| Sin acceso | no se muestra  | no                  | no                                  |
| Cargando   | `Stat loading` | `Skeleton` en filas | `Table loading`                     |
| Recargando | datos previos  | datos previos       | datos previos + barra indeterminada |
| Error      | no             | no                  | `BloqueError` con reintento         |
| Prohibido  | no             | no                  | `Alert danger`                      |
| Vacío      | no             | `EmptyState`        | `EmptyState` con acción             |
| Con datos  | sí             | sí                  | sí                                  |

## Accesibilidad

- Color nunca es el único canal: el `Badge` lleva el texto del estado y la barra lleva `label` con porcentaje.
- Botones de solo icono con `aria-label`.
- La región de carga conserva `role="status"`.
- `prefers-reduced-motion` desactiva animación propia y `pulse`.
- Foco visible y `aria-*` de la librería intactos.

## Manejo de errores

Sin cambios respecto a E8-T17: `ErrorReportesProhibido` → `Alert`; otro error → `BloqueError`. Un fallo en `reporteEstados` (vista `rango`) no oculta la tabla de viajes si esta cargó.

## Correctness Properties

1. **Suma de porcentajes**: para cualquier conteo con total > 0, cada porcentaje está en 0..100 y la distribución conserva los conteos originales (su suma es el total).
2. **Orden estable**: `distribucionPorEstado` ordena por conteo desc, luego alfabético; es determinista.
3. **Cobertura del mapa**: todo token de `viajeEstados.gen.ts` tiene entrada en `ESTADO_BADGE`; un token desconocido devuelve `neutral` sin lanzar.
4. **Paginación**: para cualquier `total`, `pagina`, `tamano > 0`, `paginar` devuelve a lo mucho `tamano` filas, la unión de todas las páginas es la lista original y `ajustarPagina` devuelve una página en `[1, max(1, ceil(total/tamano))]`.
5. **KPI en curso**: el total de KPIs es igual al número de filas; el estado líder tiene el conteo máximo.
6. **KPI rango**: viajes cerrados = filas con `cerrado_en` no nulo; cambios de estado = suma de `conteos`.

## Estrategia de pruebas

- Unitarias (`vitest`): `kpis`, `distribucion`, `estadoBadge`, `paginar`, con las propiedades de arriba.
- Componente (Testing Library, con mocks de hook): carga, vacío, error, prohibido, sin acceso, paginación y reinicio al cambiar de vista, recarga con datos previos.
- Regresión: `IndicadorFrescura`, `estadoFrescura` y `conteos` conservan su comportamiento.
- Verificación manual: tema claro y oscuro, viewport angosto, `prefers-reduced-motion`.
