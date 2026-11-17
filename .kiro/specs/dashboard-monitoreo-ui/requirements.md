# Requirements Document

## Introduction

Rediseño visual del Dashboard de Monitoreo (`src/features/monitoreo/dashboard/DashboardMonitoreo.tsx`, E8-T17 Bloque B). Hoy es plano: una tarjeta con la tabla, otra con `Stat` sueltos, un `SkeletonCard` genérico y el estado como texto sin color.

Este spec **solo cambia presentación y composición**. No cambia qué datos se consultan, quién ve el dashboard ni las reglas de dominio. Todo se construye con `@ai27-tech/ui@0.3.0-beta.1` (steering `ai27-tech-library-first`).

### Lenguaje visual objetivo

La referencia es un dashboard oscuro de tarjetas (ErgoSense). No se copia su diseño; se adopta su lenguaje, que debe poder repetirse en otras pantallas:

1. **Superficies por capas.** Fondo de página, tarjetas un nivel arriba, bordes finos y suaves.
2. **Tarjeta KPI con anatomía fija:** recuadro de icono + etiqueta, insignia de estado arriba a la derecha, cifra grande con unidad atenuada, y pie con una o dos frases cortas.
3. **Cifras y horas en tipografía de telemetría** (tokens `--ui-text-telemetry-*`), para que los números no bailen al cambiar.
4. **Insignias en píldora con punto**, en color suave, siempre con texto.
5. **Tarjeta de tabla con encabezado propio:** icono, título, descripción corta, chips a la derecha; pie con estado de sincronización y enlace.
6. **Jerarquía de texto:** el dato principal en peso fuerte, lo secundario atenuado.
7. **Movimiento discreto:** entrada suave y `pulse` solo donde hay actividad real.
8. **Barras de progreso solo cuando hay una meta o un denominador real.**

### Decisión sobre `ProgressBar`

La versión anterior de este spec usaba `ProgressBar` para la distribución por estado y para la recarga, sin razón de dominio: una proporción no es un avance, y una recarga no necesita barra. **Este spec no usa `ProgressBar`.** El dashboard no tiene meta, umbral ni SLA que una barra pueda representar (los SLA son informativos y no se vigilan en V1, DEC-025 #3). Si más adelante Producto define una meta medible, se agrega una barra en la tarjeta KPI correspondiente (ver BRECHAS-UI #1).

### Fuentes verificadas

- Contexto: `ai27-platform-context` commit `2e12bc2`.
- Frontend: `@ai27-tech/ui` `0.3.0-beta.1`, `@ai27-tech/contracts` `0.1.0-tracer.40`.
- No se agrega ninguna operación del `bff`. Se reutilizan `reporteViajes` y `reporteEstados` como las consume `useDashboardMonitoreo`.
- Tokens disponibles confirmados en la librería: familia `--ui-color-surface-container*`, `--ui-color-{success,warning,danger}-container`, `--ui-text-telemetry-{sm,lg}-*`, `--ui-font-feature-numeric`, `--ui-shadow-*`, `--ui-radius*`, `--ui-duration-*`, `--ui-ease-*`.

## Glossary

- **Dashboard**: pantalla `/monitoreo/dashboard`.
- **Vista**: `en_curso` o `rango` (últimos 7 días), ya existentes.
- **Tarjeta KPI**: composición `Card` + `Stat` con la anatomía del punto 2 del lenguaje visual.
- **Cifra derivada**: valor calculado en el frontend con aritmética simple sobre datos ya cargados (suma, conteo, porcentaje). No es regla de negocio.
- **Estado**: token de progreso del `viaje` tal como lo entrega el `bff` (ADR 19).
- **Condición**: marca ortogonal al estado (`INCIDENCIA`, `SIN_SENAL`).

## Requirements

### Requirement 1: Tarjetas KPI

**User Story:** Como monitorista, quiero ver al instante cuántos viajes hay y qué tan fiable es el dato, para decidir dónde mirar.

#### Acceptance Criteria

1. WHEN hay datos, THE Dashboard SHALL mostrar una fila de tarjetas KPI en un `Grid` responsivo (1 columna angosta, 3 en ancho).
2. EACH tarjeta SHALL tener: recuadro de icono de `lucide-react`, etiqueta, `Badge` de estado opcional arriba a la derecha, cifra grande con unidad atenuada y un pie de una o dos frases.
3. THE vista `en_curso` SHALL mostrar: **Viajes en curso** (total; unidad «viajes»), **Estado predominante** (nombre en `Badge`, conteo) y **Estados activos** (número de estados distintos).
4. THE vista `rango` SHALL mostrar: **Viajes del periodo**, **Cambios de estado** (suma de `conteos` de `reporteEstados`) y **Cerrados en el periodo** (filas con `cerrado_en` no nulo).
5. THE `Badge` de la primera tarjeta SHALL reflejar la frescura real de la proyección con `estadoFrescura` (`Datos atrasados`, `Frescura no informada`, o ninguno si está al día). La lógica de frescura no cambia.
6. THE pie de la primera tarjeta SHALL mostrar «Proyección al {fecha y hora}» cuando exista; el de las demás, una frase descriptiva fija («Viajes con más registros», «Estados con al menos un viaje»).
7. THE cifras SHALL usar `--ui-text-telemetry-lg-*`. No hay `trend` ni comparativos (BRECHAS-UI #2).
8. WHILE los datos cargan, THE tarjeta SHALL mantener su estructura con `Stat loading` y `Skeleton` en el pie, sin salto de layout.
9. THE información SHALL ser legible sin color: el estado y la frescura llevan texto.

### Requirement 2: Viajes por estado

**User Story:** Como monitorista, quiero ver cómo se reparten los viajes entre estados.

#### Acceptance Criteria

1. THE Dashboard SHALL mostrar una tarjeta «Viajes por estado» con una fila por estado: `Badge` del estado, conteo en tipografía de telemetría y porcentaje sobre el total como texto atenuado (p. ej. «42 %»).
2. THE porcentaje SHALL ser `conteo / total * 100` redondeado a entero. IF el total es 0, THEN la tarjeta SHALL mostrar `EmptyState`.
3. THE orden SHALL ser por conteo descendente y, a igualdad, alfabético.
4. THE tarjeta SHALL NOT usar barras ni gráficas. Si Producto pide una visualización gráfica, se registra como solicitud a la librería (BRECHAS-UI #3).
5. IF la vista es `rango`, THEN la tarjeta SHALL usar los `conteos` de `reporteEstados` y titularse «Cambios de estado en el periodo».
6. THE cada fila SHALL ser un elemento de lista con texto accesible completo («EN_TRANSITO: 12 viajes, 42 %»).

### Requirement 3: Insignias de estado y condición

**User Story:** Como monitorista, quiero distinguir los estados a golpe de vista.

#### Acceptance Criteria

1. THE estado de cada viaje (tabla y distribución) SHALL mostrarse con `Badge` en píldora (`pill`) con `dot`, eligiendo `variant` y `appearance` desde un único mapa `ESTADO_BADGE`.
2. THE mapa SHALL cubrir todos los tokens de `viajeEstados.gen.ts` (incluidos V2 y terminales) y usar `neutral` para un token desconocido, sin lanzar error.
3. THE texto del `Badge` SHALL ser el estado tal como lo entrega el `bff` (coherente con E8-T7 Req 1.5). El color refuerza; nunca sustituye.
4. THE estados de actividad (`EN_EMBARQUE`, `EN_TRANSITO`, `EN_DESTINO`, `EN_DESCARGA`) SHALL usar `pulse`; los terminales y de espera no.
5. WHERE existan condiciones por fila, THE tabla SHALL mostrarlas en columna separada con `VARIANTE_CONDICION` (P15). IF `FilaViaje` no las trae, THEN la columna no se agrega (BRECHAS-UI #4).

### Requirement 4: Tarjeta de tabla con paginación

**User Story:** Como monitorista, quiero recorrer listas largas sin perder el contexto.

#### Acceptance Criteria

1. THE tabla SHALL ir dentro de una tarjeta con encabezado: recuadro de icono, título «Viajes», descripción corta y, a la derecha, un chip con el periodo (`en_curso` o rango en tipografía de telemetría).
2. THE filas SHALL mostrar: identificador en peso fuerte con punto de color del estado, `Badge` de estado, «Creado» y «Cerrado» en tipografía de telemetría y texto atenuado para lo secundario.
3. THE tabla SHALL paginar en cliente con `Pagination` (10 por defecto, `pageSizeOptions` `[10, 25, 50]`, `showInfo`) y ocultarla cuando `total` no supere la menor opción.
4. WHEN cambia la vista o el tamaño de página, THE página SHALL volver a 1. IF la página queda fuera de rango tras una recarga, THEN SHALL ajustarse a la última válida.
5. THE tabla SHALL usar `hoverable`, `stickyHeader` y `density="compact"` y conservar `aria-label="Viajes del reporte"`. El orden de filas es el del `bff`.
6. THE pie de la tarjeta SHALL mostrar el estado de sincronización («Proyección al {fecha}» o «Sin datos aplicados aún», con `IndicadorFrescura`) y, WHERE la ruta de la bandeja de viajes exista para el rol, un enlace «Ver todos los viajes».
7. THE tabla SHALL NOT agregar acciones por fila (menú de tres puntos) mientras no haya acciones definidas para el dashboard.

### Requirement 5: Distribución de la pantalla

#### Acceptance Criteria

1. THE orden SHALL ser: `PageHeader` (título, descripción y, en `actions`, chip «Actualizado hace …» y botón «Actualizar») → `FilterBar` de vista → tarjetas KPI → cuerpo.
2. THE cuerpo SHALL ser un `Grid` de dos zonas en ancho: «Viajes por estado» (angosta) y tarjeta de tabla (ancha). En ancho angosto SHALL apilarse con la distribución primero.
3. THE tarjetas SHALL usar `Card variant="outlined"` sobre la jerarquía de superficies de la librería. No se usan colores fijos.
4. THE disposición SHALL usar `Stack`, `Inline` y `Grid`; sin CSS en línea para disponer.
5. THE chip «Actualizado hace …» SHALL derivarse de la marca de tiempo de las consultas de TanStack Query (`dataUpdatedAt`) y refrescarse en pantalla sin nuevas llamadas al `bff`. No hay sondeo automático (E8-T17).
6. THE botón «Actualizar» SHALL invocar `refetch` de las consultas activas.

### Requirement 6: Estados de carga

#### Acceptance Criteria

1. WHILE carga por primera vez, THE KPIs SHALL usar `Stat loading` y `Skeleton` en el pie, la distribución `Skeleton`/`SkeletonText` con filas, y la tabla `Table loading` con `loadingRows` igual al tamaño de página (o `SkeletonTable`).
2. THE región en carga SHALL conservar `role="status"` y `aria-label` («Cargando el dashboard»).
3. WHILE se recarga con datos previos, THE Dashboard SHALL mantener los datos visibles; el botón «Actualizar» SHALL mostrar `Spinner size="sm"`, quedar deshabilitado y el chip de actualización SHALL decir «Actualizando…».
4. THE carga inicial SHALL NOT usar spinners centrados ni barras de progreso.

### Requirement 7: Movimiento

#### Acceptance Criteria

1. THE movimiento SHALL provenir primero de la librería: shimmer de `Skeleton`, `pulse` de `Badge`, `hover` de `Table` y transición de color de tarjetas interactivas.
2. THE bloques SHALL entrar con una animación breve (fundido y desplazamiento corto, escalonada entre tarjetas) en CSS del portal con tokens `--ui-duration-*`, `--ui-ease-*` y `--ui-space-*`, marcada `// BRECHA-UI` (BRECHAS-UI #5).
3. WHERE el usuario tenga `prefers-reduced-motion: reduce`, THE animaciones propias SHALL desactivarse y `pulse` SHALL omitirse.
4. THE animación SHALL durar a lo mucho 300 ms por elemento con 60 ms de escalonado.
5. THE movimiento SHALL NOT comunicar información que no esté también en texto.

### Requirement 8: Estados vacío, error y acceso

#### Acceptance Criteria

1. THE comportamientos actuales SHALL conservarse: rol sin acceso muestra `Alert danger` sin consultar al `bff`; 403 muestra `Alert danger`; error muestra `BloqueError` con reintento; vacío muestra `EmptyState`.
2. THE `EmptyState` SHALL llevar icono y acción «Actualizar».
3. THE título del `PageHeader` SHALL mostrarse siempre.
4. THE rótulos nuevos son de trabajo, pendientes de aprobación de Producto.

### Requirement 9: Calidad

#### Acceptance Criteria

1. THE cambios SHALL NOT introducir `<svg>`, `<path>`, hex, `rgb()`, `<select>` nativo, `ProgressBar` ni librerías de UI externas.
2. THE iconos SHALL venir de `lucide-react`; los de solo icono llevan `aria-label`.
3. THE funciones puras (KPIs, distribución, mapa de badges, paginación, texto «hace X») SHALL tener pruebas con `vitest`.
4. THE componentes SHALL tener pruebas con Testing Library para carga, vacío, error, acceso, paginación y cambio de vista.
5. THE contraste de los pares texto/fondo de cada `Badge` y de la jerarquía de superficies SHALL verificarse en tema claro y oscuro (mínimo 4.5:1 para texto).
6. `lint`, `typecheck` y `test` SHALL pasar.

## Escenarios

| #   | Escenario                             | Resultado esperado                                              |
| --- | ------------------------------------- | --------------------------------------------------------------- |
| 1   | `en_curso` con 37 viajes en 5 estados | 3 tarjetas KPI, 5 filas ordenadas, tabla con 4 páginas          |
| 2   | Proyección atrasada                   | Primera tarjeta con `Badge` «Datos atrasados» y pie con la hora |
| 3   | Cambio a `rango` en página 3          | Página 1; KPIs y distribución cambian al modo periodo           |
| 4   | Token de estado desconocido           | `Badge neutral`, sin error                                      |
| 5   | Todo en `CERRADO`                     | Una fila al 100 %, sin `pulse`                                  |
| 6   | Total 0                               | `EmptyState` con «Actualizar»; sin KPIs en cero engañosos       |
| 7   | Carga inicial lenta                   | Tarjetas, lista y tabla en skeleton; sin salto de layout        |
| 8   | «Actualizar» con datos previos        | Datos visibles, botón con spinner, chip «Actualizando…»         |
| 9   | `prefers-reduced-motion`              | Sin entrada animada ni `pulse`                                  |
| 10  | Rol sin acceso                        | `Alert danger`; cero llamadas al `bff`                          |
| 11  | 403 en `reporteViajes`                | `Alert danger` de autorización                                  |
| 12  | Ancho angosto                         | KPIs en una columna; distribución sobre la tabla                |
| 13  | Recarga deja 8 filas en página 2      | Página se ajusta a 1                                            |
| 14  | Tema oscuro y claro                   | Mismos componentes; contraste correcto en ambos                 |

## Dependencias

- `useDashboardMonitoreo`: se le agregan `recargando`, `actualizar` y `actualizadoEn` (`dataUpdatedAt`). Sin cambios de contrato ni de claves de query.
- `@ai27-tech/ui@0.3.0-beta.1`: `Card`, `Stat`, `Badge`, `Table`, `Pagination`, `Skeleton*`, `PageHeader`, `Section`, `Grid`, `Inline`, `Stack`, `EmptyState`, `Alert`, `Button`, `Spinner`, `FilterBar`.
- `features/viajes/filaViaje.tsx` (`VARIANTE_CONDICION`).

## Fuera de alcance

- Incidencias y alertas (DT-09), mapa, tiempo real, sondeo.
- Metas, SLA, barras de progreso y tendencias.
- Gráficas.
- Acciones por fila.
- Ordenamiento por columna y paginación en servidor.
- Cambios en `bff`, contrato o permisos.

## Trazabilidad

| Requirement                  | Origen                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| 1-8                          | Solicitud de mejora visual del Dashboard de Monitorista y referencia de estilo (sesión 2026-11-13) |
| 3.5                          | P15 (estado y condición separados)                                                                 |
| 5.5                          | E8-T17 (sin sondeo automático)                                                                     |
| «Decisión sobre ProgressBar» | Corrección del usuario; DEC-025 #3 (SLA informativo)                                               |
| 8.1                          | E8-T17 Bloque B                                                                                    |
| 9                            | `ai27-tech-library-first.md` §2, §5, §8                                                            |
