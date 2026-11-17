# Design Document

## Overview

Se recompone `DashboardMonitoreo.tsx` en bloques pequeños con una responsabilidad visual cada uno, y se extraen funciones puras de lo que hoy está mezclado en el JSX. Los hooks de datos y el contrato no cambian.

Datos (existentes, sin modificar):

- `ReporteViajes`: `filas: FilaViaje[]` (`viaje_id`, `estado`, `creado_en`, `cerrado_en`) y marca de frescura (`proyeccion_al`).
- `ReporteEstados`: `conteos: { estado, conteo }[]` y marca de frescura.
- `conteosEnCurso(filas)` ya produce los conteos de la vista `en_curso`.

## Lenguaje visual (reutilizable)

Cada regla se logra con props y variantes de la librería. El spec no escribe CSS.

| Principio             | Cómo se logra con `@ai27-tech/ui`                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Superficies por capas | Página sobre `--ui-color-surface`; tarjetas con `Card variant="outlined"` (fondo `--ui-color-surface-container-low`, borde `--ui-color-border-subtle`) |
| Icono                 | Prop `icon` de `Stat` con icono de `lucide-react`                                                                                                      |
| Cifra                 | `Stat` con su estilo por defecto                                                                                                                       |
| Unidad atenuada       | `--ui-text-body-sm-*` en `--ui-color-text-subtle`                                                                                                      |
| Insignia en píldora   | `Badge pill dot appearance="soft"`                                                                                                                     |
| Pie de tarjeta        | `Inline` con `justify` entre dos textos `--ui-text-label-sm-*`                                                                                         |
| Chips de contexto     | `Badge appearance="outline"`                                                                                                                           |
| Entrada               | Ninguna propia; solo shimmer, `pulse` y `hover` de la librería                                                                                         |

## Arquitectura

```
DashboardMonitoreo            (título siempre visible, guarda de rol)
└─ DashboardAutorizado
   ├─ EncabezadoDashboard     PageHeader + chip «Actualizado hace…» + botón Actualizar
   ├─ FilterBar               vista (sin cambios)
   ├─ FilaKpis                Grid de TarjetaKpi
   ├─ Grid 2 zonas
   │  ├─ ViajesPorEstado      Card + lista de filas (Badge, conteo, porcentaje)
   │  └─ TarjetaViajes        Card con encabezado, Table, Pagination y pie
   └─ estados: prohibido | error | vacío | cargando
```

| Archivo (`src/features/monitoreo/dashboard/`) | Tipo | Contenido                                                                                                             |
| --------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| `kpis.ts`                                     | puro | `kpisEnCurso(conteos)`, `kpisRango(filas, conteos)`                                                                   |
| `distribucion.ts`                             | puro | `distribucionPorEstado(conteos)`: porcentaje entero, orden conteo desc y alfabético                                   |
| `estadoBadge.ts`                              | puro | `ESTADO_BADGE` y `badgeDeEstado(token)` con respaldo `neutral`                                                        |
| `paginar.ts`                                  | puro | `paginar`, `ajustarPagina`                                                                                            |
| `tiempoRelativo.ts`                           | puro | `haceCuanto(ahora, marca)` → «hace 14 min»                                                                            |
| `TarjetaKpi.tsx`                              | UI   | Composición de `Card` + `Stat` + `Badge` + pie, solo con componentes y props de la librería, sin CSS (`// BRECHA-UI`) |
| `FilaKpis.tsx`                                | UI   | Compone las tarjetas por vista                                                                                        |
| `ViajesPorEstado.tsx`                         | UI   | Lista de estados                                                                                                      |
| `TarjetaViajes.tsx`                           | UI   | Tabla, paginación y pie                                                                                               |
| `EncabezadoDashboard.tsx`                     | UI   | Encabezado y recarga                                                                                                  |

`useDashboardMonitoreo` suma `recargando`, `actualizar` y `actualizadoEn`.

## Decisiones

**D1. Sin `ProgressBar`.** Una barra comunica «avance hacia algo». El dashboard no tiene meta, umbral ni SLA definido (DEC-025 #3), y la proporción por estado no es avance. La distribución se muestra como lista con texto, que es más precisa y más accesible. La recarga se comunica con el botón (spinner y deshabilitado) y el chip «Actualizando…».

**D2. KPIs derivados, sin tendencia.** Salen de datos ya cargados. `trend` exige un periodo previo que hoy no se consulta (BRECHAS-UI #2).

**D3. La insignia de la tarjeta KPI tiene significado real.** En la primera tarjeta refleja la frescura de la proyección con `estadoFrescura`. Las otras tarjetas no llevan insignia salvo que tengan un estado verdadero, para no repetir el patrón de la referencia sin sentido.

**D4. Un solo mapa estado → Badge.** `variant` da la familia y `appearance` el matiz (guía del steering §4). Propuesta de trabajo, sujeta a aprobación de Producto:

| Estado                    | variant     | appearance | pulse |
| ------------------------- | ----------- | ---------- | ----- |
| `SOLICITADO`              | `info`      | `soft`     | no    |
| `APROBADO`                | `primary`   | `soft`     | no    |
| `ASIGNADO`                | `secondary` | `soft`     | no    |
| `APTO_PARA_SALIDA`        | `secure`    | `outline`  | no    |
| `EN_EMBARQUE`             | `escort`    | `soft`     | sí    |
| `PATRULLA_EN_CAMINO` (V2) | `escort`    | `outline`  | no    |
| `EN_TRANSITO`             | `escort`    | `solid`    | sí    |
| `EN_DESTINO`              | `warning`   | `soft`     | sí    |
| `EN_DESCARGA`             | `warning`   | `solid`    | sí    |
| `CERRADO`                 | `secure`    | `soft`     | no    |
| `CANCELADO`               | `neutral`   | `outline`  | no    |
| `RECHAZADO_POR_AI27`      | `alert`     | `soft`     | no    |
| `RECHAZADO_POR_CLIENTE`   | `alert`     | `outline`  | no    |
| desconocido               | `neutral`   | `soft`     | no    |

Todas con `pill` y `dot`. `alert` se reserva para rechazos y condiciones, para que un estado terminal no se confunda con una incidencia activa.

**D5. Paginación en cliente.** El reporte ya está en memoria y `Table` no pagina; se compone `Table` + `Pagination`.

**D6. «Actualizado hace…» sin llamadas extra.** Se calcula de `dataUpdatedAt` de TanStack Query y se refresca cada 30 s con un temporizador local que solo vuelve a pintar el texto. No consulta al `bff` (E8-T17 sin sondeo).

**D7. Tarjeta KPI como composición.** `Stat` no permite insignia ni pie. Se compone `Card` + `Stat` (`icon`, `loading`) + `Badge` + `Inline` con el pie dentro de `TarjetaKpi`, sin una línea de CSS, marcada `// BRECHA-UI` y reportada (BRECHAS-UI #6).

**D8. Sin estilos ni animaciones propias.** El spec no crea CSS, tokens, `@keyframes` ni un `Reveal`. El movimiento es el que ya trae la librería (shimmer, `pulse`, `hover`).

## Composición con `@ai27-tech/ui`

| Necesidad             | Componente                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Encabezado y acciones | `PageHeader` con `actions`                                                                  |
| Filtro de vista       | `FilterBar` (sin cambios)                                                                   |
| Tarjetas              | `Card variant="outlined"`, `CardHeader`, `CardBody`, `CardFooter`                           |
| Cifra                 | `Stat` (`icon`, `loading`)                                                                  |
| Estados y chips       | `Badge` (`pill`, `dot`, `pulse`, `appearance`)                                              |
| Tabla                 | `Table` (`hoverable`, `stickyHeader`, `density="compact"`, `loading`, `emptyState`)         |
| Paginación            | `Pagination`                                                                                |
| Carga                 | `Stat loading`, `Skeleton`, `SkeletonText`, `Table loading`                                 |
| Recarga               | `Button` + `Spinner size="sm"`                                                              |
| Avisos y vacío        | `Alert`, `EmptyState`, `BloqueError`                                                        |
| Iconos                | `lucide-react`: `Truck`, `Activity`, `Layers`, `ClipboardList`, `RefreshCw`, `CheckCircle2` |

## Estados de UI

| Estado     | KPIs           | Por estado    | Tabla                       |
| ---------- | -------------- | ------------- | --------------------------- |
| Sin acceso | no             | no            | no                          |
| Cargando   | `Stat loading` | `Skeleton`    | `Table loading`             |
| Recargando | datos previos  | datos previos | datos previos               |
| Error      | no             | no            | `BloqueError` con reintento |
| Prohibido  | no             | no            | `Alert danger`              |
| Vacío      | no             | `EmptyState`  | `EmptyState`                |
| Con datos  | sí             | sí            | sí                          |

## Accesibilidad

- El color nunca va solo: `Badge` con texto y filas con texto completo para lector de pantalla.
- Botones de solo icono con `aria-label`.
- Región de carga con `role="status"`.
- `pulse` de `Badge` se omite con `prefers-reduced-motion` si la librería lo respeta; si no, se registra como brecha.
- Foco y `aria-*` de la librería intactos.
- Contraste ≥ 4.5:1 verificado en ambos temas.

## Manejo de errores

Igual que E8-T17: `ErrorReportesProhibido` → `Alert`; otro error → `BloqueError`. Un fallo de `reporteEstados` (vista `rango`) no oculta la tabla de viajes si esta cargó.

## Correctness Properties

1. **Distribución**: para total > 0, cada porcentaje está en 0..100 y los conteos suman el total.
2. **Orden**: conteo descendente y luego alfabético; determinista.
3. **Mapa de badges**: todo token del enum generado tiene entrada; un token desconocido devuelve `neutral` sin lanzar.
4. **Paginación**: `paginar` devuelve a lo mucho `tamano` filas; la unión de páginas es la lista original; `ajustarPagina` devuelve una página en `[1, max(1, ceil(total/tamano))]`.
5. **KPI en curso**: el total es igual al número de filas; el estado predominante tiene el conteo máximo.
6. **KPI rango**: cerrados = filas con `cerrado_en` no nulo; cambios de estado = suma de `conteos`.
7. **Tiempo relativo**: monótono con la diferencia de tiempo; nunca negativo.

## Estrategia de pruebas

- Unitarias (`vitest`): `kpis`, `distribucion`, `estadoBadge`, `paginar`, `tiempoRelativo`.
- Componente (Testing Library con hook simulado): carga, recarga, vacío, error, prohibido, sin acceso, paginación y reinicio al cambiar de vista.
- Regresión: `IndicadorFrescura`, `estadoFrescura`, `conteos`.
- Manual: claro y oscuro, ancho angosto, teclado.
