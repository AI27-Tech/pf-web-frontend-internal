# Requirements Document

## Introduction

Rediseño visual del Dashboard de Monitoreo (`src/features/monitoreo/dashboard/DashboardMonitoreo.tsx`, E8-T17 Bloque B) para el rol `monitorista` y los roles con acceso (`puedeUsarMonitoreo`). El dashboard funciona hoy, pero se ve plano: una tarjeta con la tabla, otra con `Stat` sueltos, un `SkeletonCard` genérico y el estado como texto sin color.

Este spec **solo cambia presentación y composición**. No cambia qué datos se consultan, quién ve el dashboard, ni las reglas de dominio. Todo se construye con `@ai27-tech/ui@0.3.0-beta.1` (steering `ai27-tech-library-first`).

Objetivos pedidos:

1. KPIs en la parte superior.
2. Barras de progreso (`ProgressBar`) para la distribución por estado.
3. Mejor distribución de los componentes en la pantalla.
4. Tabla con paginación y `Badge` de color por estado.
5. Interfaz más viva y con movimiento.
6. Skeletons y componentes de carga de la librería en todos los estados de carga.

### Fuentes verificadas

- Contexto: `ai27-platform-context` commit `2e12bc2`.
- Frontend: `@ai27-tech/ui` `0.3.0-beta.1`, `@ai27-tech/contracts` `0.1.0-tracer.40`.
- No se consultó ni se agrega ninguna operación nueva del `bff`. Se reutilizan `reporteViajes` y `reporteEstados` tal como las consume `useDashboardMonitoreo`.
- El checkout local de `pf-pkg-contracts` está en la rama `feat/ficha-tecnica-e-historico-tracer21` (60 commits adelante). No se leyó contrato desde ahí; el spec no depende de él.

## Glossary

- **Dashboard**: pantalla `/monitoreo/dashboard`.
- **Vista**: `en_curso` o `rango` (últimos 7 días), ya existentes.
- **KPI**: tarjeta `Stat` con un número derivado de las filas ya cargadas.
- **Cifra derivada**: valor calculado en el frontend con aritmética simple sobre datos del reporte (suma, porcentaje). No es regla de negocio.
- **Estado**: token de progreso del `viaje` tal como lo entrega el `bff` (ADR 19).
- **Condición**: marca ortogonal al estado (`INCIDENCIA`, `SIN_SENAL`). No es estado.

## Requirements

### Requirement 1: Fila de KPIs

**User Story:** Como monitorista, quiero ver al instante cuántos viajes hay y cómo se reparten, para decidir dónde mirar primero.

#### Acceptance Criteria

1. WHEN hay datos, THE Dashboard SHALL mostrar una fila de KPIs con `Grid` y `Stat`, cada uno con un icono de `lucide-react`.
2. THE KPIs SHALL ser, en la vista `en_curso`: total de viajes en curso, estado con más viajes (nombre y conteo) y número de estados distintos presentes.
3. THE KPIs SHALL ser, en la vista `rango`: total de viajes del periodo, total de cambios de estado (suma de `conteos` de `reporteEstados`) y viajes cerrados en el periodo (filas con `cerrado_en` no nulo).
4. THE KPIs SHALL usar solo cifras derivadas de los datos ya cargados. No se muestra `trend` ni comparativo con periodos anteriores (ver BRECHAS-UI).
5. WHILE los datos cargan, THE `Stat` SHALL usar `loading` y conservar su espacio, de modo que no haya salto de layout al llegar los datos.
6. THE `Stat` SHALL tener `aria-label` o texto accesible equivalente; el número nunca se comunica solo con color.

### Requirement 2: Distribución por estado con barras de progreso

**User Story:** Como monitorista, quiero ver qué proporción de los viajes está en cada estado, para detectar cuellos de botella.

#### Acceptance Criteria

1. THE Dashboard SHALL mostrar una sección «Distribución por estado» con una fila por estado: `Badge` de estado, `ProgressBar` con el porcentaje sobre el total y el conteo.
2. THE porcentaje SHALL calcularse como `conteo / total * 100`, redondeado a entero. IF el total es 0, THEN la sección SHALL mostrar `EmptyState` en lugar de barras.
3. THE `ProgressBar` SHALL llevar `label` con el estado y el porcentaje (p. ej. «EN_TRANSITO, 42 %»).
4. THE orden de las filas SHALL ser por conteo descendente y, a igualdad, alfabético por estado.
5. IF la vista es `rango`, THEN la sección SHALL usar los `conteos` de `reporteEstados` (cambios de estado en el periodo) con el mismo formato, y su título SHALL decir «Cambios de estado en el periodo».
6. THE `ProgressBar` SHALL mostrar el cambio de valor con la transición propia de la librería. El frontend no inventa «avance del viaje» ni umbrales; la barra representa solo proporción.

### Requirement 3: Badges de color por estado y condición

**User Story:** Como monitorista, quiero distinguir los estados a golpe de vista.

#### Acceptance Criteria

1. THE Dashboard SHALL mostrar el estado de cada viaje (tabla y distribución) con `Badge`, eligiendo `variant` y `appearance` desde un único mapa `ESTADO_BADGE`.
2. THE mapa SHALL cubrir todos los tokens del enum generado `viajeEstados.gen.ts`, incluidos los de V2 y los terminales, y SHALL usar `neutral` para un token desconocido (sin lanzar error).
3. THE texto del `Badge` SHALL ser el estado tal como lo entrega el `bff`, sin normalizar (coherente con E8-T7 Req 1.5). El color refuerza el texto; nunca lo sustituye.
4. THE Estados que indican actividad en curso (`EN_TRANSITO`, `EN_DESTINO`, `EN_DESCARGA`, `EN_EMBARQUE`) SHALL usar `dot` y `pulse` para dar sensación de movimiento.
5. THE Estados terminales (`CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27`, `RECHAZADO_POR_CLIENTE`) SHALL NO pulsar.
6. WHERE una fila tenga condiciones activas, THE tabla SHALL mostrarlas en una columna separada con `VARIANTE_CONDICION` de `features/viajes/filaViaje.tsx` (P15: la condición nunca ocupa el lugar del estado). IF `FilaViaje` no trae condiciones, THEN la columna no se agrega (ver BRECHAS-UI #2).

### Requirement 4: Tabla con paginación

**User Story:** Como monitorista, quiero recorrer listas largas sin perder el contexto.

#### Acceptance Criteria

1. THE tabla SHALL paginar en cliente las filas de `reporteViajes` con el componente `Pagination` de la librería, debajo de la `Table`.
2. THE tamaño de página SHALL ser 10 por defecto con `pageSizeOptions` `[10, 25, 50]` y `showInfo`.
3. WHEN cambia la vista o el tamaño de página, THE página actual SHALL volver a 1.
4. IF la página actual queda fuera de rango por una recarga con menos filas, THEN SHALL ajustarse a la última página válida.
5. THE tabla SHALL usar `hoverable`, `striped`, `stickyHeader` y `density="compact"`, y SHALL conservar `aria-label="Viajes del reporte"`.
6. THE `Pagination` SHALL ocultarse cuando `total <= menor opción de pageSizeOptions`.
7. THE orden de filas SHALL ser el que entrega el `bff`; este spec no agrega ordenamiento por columna.

### Requirement 5: Distribución de la pantalla

**User Story:** Como monitorista, quiero una pantalla ordenada, con lo más importante arriba.

#### Acceptance Criteria

1. THE Dashboard SHALL ordenarse así: `PageHeader` (título, descripción, frescura y botón «Actualizar») → `FilterBar` de vista → KPIs → cuerpo.
2. THE cuerpo SHALL ser un `Grid` de dos zonas en pantallas anchas: distribución por estado (columna angosta) y tabla de viajes (columna ancha). En pantallas angostas SHALL apilarse con la distribución primero.
3. THE bloques SHALL envolverse en `Section` con título y descripción; el uso de `Card` se limita a contenedores con borde que lo necesiten.
4. THE disposición SHALL usar `Stack`, `Inline` y `Grid`. No se usa CSS en línea para disponer elementos.
5. THE `IndicadorFrescura` SHALL ubicarse en las `actions` o la descripción del `PageHeader`, no dentro de la tarjeta de la tabla. Su lógica no cambia.
6. THE botón «Actualizar» SHALL llamar a `reintentar`/`refetch` de las consultas existentes; no agrega sondeo automático (se conserva «Sin sondeo automático» de E8-T17).

### Requirement 6: Estados de carga

**User Story:** Como monitorista, quiero que la pantalla muestre su forma mientras carga.

#### Acceptance Criteria

1. WHILE carga por primera vez, THE KPIs SHALL usar `Stat loading`, la distribución SHALL usar `Skeleton` con la forma de filas y la tabla SHALL usar `Table loading` con `loadingRows` igual al tamaño de página (o `SkeletonTable`).
2. THE región en carga SHALL conservar `role="status"` y un `aria-label` («Cargando el dashboard»).
3. WHILE se recarga con datos previos (cambio de vista o «Actualizar»), THE Dashboard SHALL mantener los datos visibles y mostrar un `ProgressBar size="sm"` sin `value` (modo indeterminado, verificado en la librería) bajo el encabezado como indicador de recarga.
4. THE botón «Actualizar» SHALL mostrar su estado ocupado y no aceptar doble clic mientras recarga.
5. THE Dashboard SHALL NOT usar spinners centrados para la carga inicial.

### Requirement 7: Movimiento y vida visual

**User Story:** Como monitorista, quiero que la pantalla se sienta viva sin distraerme.

#### Acceptance Criteria

1. THE movimiento SHALL provenir primero de la librería: shimmer de `Skeleton`, `pulse` de `Badge`, transición de `ProgressBar` y estados `hover` de `Table`.
2. THE bloques SHALL entrar con una animación breve (fundido y desplazamiento corto, escalonada entre KPIs) definida en el CSS del portal solo con tokens `--ui-*` y marcada `// BRECHA-UI` (ver BRECHAS-UI #3).
3. WHERE el usuario tenga `prefers-reduced-motion: reduce`, THE animaciones propias SHALL desactivarse y el `pulse` de `Badge` SHALL omitirse.
4. THE animación SHALL NOT retrasar la lectura de datos: duración máxima 300 ms por elemento y 60 ms de escalonado.
5. THE movimiento SHALL NOT comunicar información que no esté también en texto.

### Requirement 8: Estados vacío, error y acceso

#### Acceptance Criteria

1. THE comportamientos actuales SHALL conservarse: rol sin acceso muestra `Alert danger` y no consulta al `bff`; 403 muestra `Alert danger`; error muestra `BloqueError` con reintento; vacío muestra `EmptyState`.
2. THE `EmptyState` SHALL llevar icono y una acción «Actualizar».
3. THE título del `PageHeader` SHALL mostrarse siempre, también a roles sin acceso.
4. THE rótulos nuevos son de trabajo, pendientes de aprobación de Producto (igual que los actuales).

### Requirement 9: Calidad

#### Acceptance Criteria

1. THE cambios SHALL NOT introducir `<svg>`, `<path>`, colores hexadecimales, `rgb()`, `<select>` nativo ni librerías de UI externas.
2. THE iconos SHALL venir de `lucide-react`; los de solo icono llevan `aria-label`.
3. THE funciones puras nuevas (KPIs, porcentajes, orden, mapa de badges, paginación) SHALL tener pruebas unitarias con `vitest`.
4. THE componentes nuevos SHALL tener pruebas con Testing Library para carga, vacío, error, acceso, paginación y cambio de vista.
5. THE `npm run lint`, `typecheck` y `test` SHALL pasar.

## Escenarios

| #   | Escenario                                             | Resultado esperado                                           |
| --- | ----------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `en_curso` con 37 viajes en 5 estados                 | 3 KPIs, 5 barras ordenadas, tabla con 4 páginas de 10        |
| 2   | Cambio a `rango` estando en página 3                  | Página vuelve a 1; KPIs y barras cambian a cambios de estado |
| 3   | Token de estado nuevo que el mapa no conoce           | `Badge neutral`, sin error                                   |
| 4   | Todas las filas en `CERRADO`                          | Barra al 100 %, sin `pulse`                                  |
| 5   | Total 0                                               | `EmptyState` con «Actualizar»; sin KPIs en cero engañosos    |
| 6   | Carga inicial lenta                                   | Stat, barras y tabla en skeleton; sin salto de layout        |
| 7   | «Actualizar» con datos previos                        | Datos visibles, indicador de recarga, botón ocupado          |
| 8   | `prefers-reduced-motion`                              | Sin animación de entrada ni `pulse`                          |
| 9   | Rol sin acceso                                        | `Alert danger`; cero llamadas al `bff`                       |
| 10  | 403 en `reporteViajes`                                | `Alert danger` de autorización                               |
| 11  | Viewport angosto                                      | Distribución arriba, tabla abajo, KPIs en 1-2 columnas       |
| 12  | Recarga deja 8 filas estando en página 2 de tamaño 10 | Página se ajusta a 1                                         |

## Dependencias

- `useDashboardMonitoreo` (sin cambios de contrato; se le agrega solo `recargando` y `actualizar`).
- `@ai27-tech/ui@0.3.0-beta.1`: `Stat`, `ProgressBar`, `Badge`, `Table`, `Pagination`, `Skeleton*`, `Section`, `PageHeader`, `Grid`, `Inline`, `Stack`, `EmptyState`, `Alert`, `Button`, `Spinner`.
- `features/viajes/filaViaje.tsx` (`VARIANTE_CONDICION`).

## Fuera de alcance

- Incidencias y alertas (DT-09).
- Mapa en vivo, sondeo automático, tiempo real.
- Tendencias o comparativos entre periodos.
- Ordenamiento y filtros por columna; paginación en servidor.
- Cambios en `bff`, contrato o permisos.
- Tema oscuro nuevo (se hereda `data-theme`).

## Notas de brechas

Ver `BRECHAS-UI.md`. Las brechas no bloquean el spec; marcan comportamiento acotado.

## Trazabilidad

| Requirement | Origen                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------ |
| 1-8         | Solicitud de Producto/UX de mejora visual del Dashboard de Monitorista (sesión 2026-11-13) |
| 3.6         | P15 (estado y condición separados)                                                         |
| 5.6         | E8-T17 (sin sondeo automático)                                                             |
| 8.1         | E8-T17 Bloque B (comportamiento vigente)                                                   |
| 9           | `ai27-tech-library-first.md` §2, §5 y §8                                                   |
