# Adopción de `@ai27-tech/ui@0.3.0-beta.1` en el portal interno: requisitos

**Estado:** borrador para revisión. **Fecha:** 2026-11-13. **Rama base:** `feature/evolucion-ux-ui-interno` (commit `20288f4`, instala la versión).

## 1. Contexto

La versión `0.3.0-beta.1` ya está instalada (`package.json` y `node_modules`). El portal hoy importa 35 símbolos de la librería y usa sobre todo `Button`, `Card*`, `FormField`, `Badge`, `Form*`, `Modal`, `Table` e `Input`. No usa ninguno de los componentes agregados desde 0.2: `PageHeader`, `Breadcrumb`, `Section`, `Stack`, `Inline`, `Grid`, `Alert`, `DescriptionList`, `Stat`, `Timeline`, `Tabs`, `EmptyState`, `Skeleton*`, `Spinner`, `DateInput`, `TimePicker`, `DateTimeInput`, `Popover`, ni la mensajería nueva (`MessageThread`, `ConversationStatus`, `MessageAttachment`, `MessageDock`).

El steering `ai27-tech-library-first.md` (catálogo al 2026-11-13) exige usar la librería antes de armar a mano un banner, una ficha, un historial, una lista vacía o una disposición. Este spec lleva el portal a ese estado.

## 2. Hallazgos medidos (línea base)

| Hallazgo                                                                                        | Medición                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `style={{ display: 'flex' \| 'grid' }}` en línea                                                | 115 ocurrencias                                                                                           |
| `<p role="alert\|status">` con color manual                                                     | unas 70 ocurrencias en administración, catálogos, conversaciones, emergencias, roster, monitoreo y viajes |
| `<h1>` manuales con `ui-text-headline-lg`                                                       | 12 pantallas                                                                                              |
| `Input type="datetime-local"`                                                                   | 3 archivos: `CrearViaje.tsx`, `etaForm.tsx`, `fechaHoraForm.tsx`                                          |
| Componente `Dato` propio (etiqueta-valor)                                                       | `FichaTecnicaViaje.tsx`, `PanelUsuario.tsx` (`filas`)                                                     |
| Historial a mano con `ul/li` y borde izquierdo                                                  | bitácora, estadías e incidencias en `HistoricoViaje.tsx`; notas en `PanelCaso.tsx`                        |
| Textos "Cargando…" / "No hay…" a mano                                                           | unos 15 sitios                                                                                            |
| `Select` por defecto con lista que crece                                                        | `ClienteSelector.tsx`                                                                                     |
| Dashboard con contadores armados a mano                                                         | `DashboardMonitoreo.tsx`                                                                                  |
| Mensajería con `MessageList` + `MessageBubble`, sin `ConversationStatus` ni adaptador camelCase | `PanelConversacion.tsx`                                                                                   |
| Wrappers locales `components/ui/Input.tsx` y `Button.tsx`                                       | sin importadores encontrados                                                                              |
| Colores hex, `rgb()`, `<svg>`, `<path>`                                                         | cero (ya cumple)                                                                                          |
| Steering de la librería en el repo del portal                                                   | no existe en `.kiro/steering/`                                                                            |

Las cifras vienen de grep sobre `src/` sin pruebas. No se revisaron los 88 archivos de prueba; el riesgo por pantalla está en el diseño.

## 3. Requisitos

**R1. Steering de la librería en el portal.**
Cuando se abra el repo, el steering de la librería debe estar en `.kiro/steering/ai27-ui-library.md` con `inclusion: always`, con la fecha y versión del catálogo.

**R2. Avisos con `Alert`.**
Los mensajes de error, éxito, aviso e información de pantalla (`<p role="alert|status">` con color manual) deben usar `Alert` con la variante equivalente (`danger`, `success`, `warning`, `info`). Se conservan los mensajes y los roles ARIA que ya consumen las pruebas. Quedan fuera los errores de campo dentro de `FormField`.

**R3. Encabezados con `PageHeader`.**
Cada pantalla interna con `<h1>` manual debe usar `PageHeader` con `title`, `description` y `actions`. Las pantallas con jerarquía (detalle, ficha, histórico, expediente) deben pasar `Breadcrumb` con `as` apuntando al `Link` de TanStack Router. Las pantallas de autenticación quedan fuera.

**R4. Disposición con `Stack`, `Inline` y `Grid`.**
Los `div` con `style={{ display: 'flex' | 'grid' }}` dentro de pantallas deben pasar a `Stack`, `Inline` o `Grid`, con `gap` mapeado a `--ui-space-N`. Quedan fuera `AppShell.tsx` y el layout de página hasta validarlos visualmente (ver D3).

**R5. Secciones y fichas de datos.**
Las fichas etiqueta-valor deben usar `DescriptionList` dentro de `Section`. El componente `Dato` local se elimina. Un valor vacío se muestra como "—" (`emptyValue`), salvo donde hoy se muestre un texto de negocio ("No informado", "Capturado"), que se conserva.

**R6. Historiales con `Timeline`.**
La bitácora, las estadías, las incidencias del viaje y las notas de resolución de una emergencia deben usar `Timeline`, con `status` según el estado del registro (incidencia abierta: `warning`; resuelta: `completed`; estadía abierta: `current`). Las acciones por registro ("Cerrar estadía", "Resolver incidencia") se conservan en `content`. Los estados de carga, vacío y error usan `loading` y `emptyState` del componente cuando existen.

**R7. Fecha y hora con `DateTimeInput`.**
Los tres campos `datetime-local` deben usar `DateTimeInput` dentro de `FormField`. El valor es `"YYYY-MM-DDTHH:mm"` (hora de pared, sin zona) y el vacío es `""`. La conversión a RFC 3339 sigue en `fechaHoraAISO` y no cambia.

**R8. Select con búsqueda.**
`ClienteSelector` debe usar `Select variant="searchable"` con `noResultsText` en español neutro del producto. Los demás `Select` (listas fijas y cortas) quedan como están.

**R9. Estados de carga y vacío.**
Los "Cargando…" de bloque deben usar `Skeleton*` o `Spinner` con `label`; los "No hay…" de bloque deben usar `EmptyState`. Se conserva el texto accesible que hoy consumen las pruebas, ya sea como `label`, `aria-label` o `title`.

**R10. Indicadores con `Stat`.**
Los contadores del dashboard de monitoreo deben usar `Stat` dentro de `Grid`, con `loading` mientras la consulta no resuelve. `IndicadorFrescura` y los textos de DEC-136 ("cambios de estado en el periodo") se conservan.

**R11. Mensajería.**
`PanelConversacion` debe adoptar `ConversationStatus` para el estado (abierta, solo lectura, cerrada, atendida, reclamo) y `MessageThread` para la lista, mediante un adaptador del wire (`snake_case`) a los tipos de la librería (`camelCase`). Debe cumplir la sección 6 del steering: orden por `secuencia`, `isOwn` calculado en el portal, y sin `onRetry` cuando el envío falla por `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura` o `403`, explicando el motivo con `deliveryError`. Este requisito depende de la decisión D5.

**R12. Navegación.**
`NavigationSidebar` debe seguir siendo correcto con la disposición de 0.3.0 (botón de colapso en el encabezado). Los mensajes "Sin sesión disponible" y "Sin permisos para acceder" deben usar `EmptyState size="sm"`. El cast de `SidebarItem` a `NavLinkItem` se elimina si el tipo de la librería ya acepta `to`.

**R13. Limpieza.**
Se eliminan los wrappers `components/ui/Input.tsx` y `Button.tsx` si ningún archivo los importa (R13 se confirma con búsqueda de importadores, incluidas rutas relativas).

**R14. Regresión y verificación.**
Tras cada bloque deben pasar `tsc --build`, `eslint .`, `vite build --mode mock` y `vitest run` (625 pruebas en la última referencia del CHANGELOG), más `test:e2e`. Las pruebas que dependan del DOM antiguo se actualizan al nuevo, sin debilitar lo que verifican. No se agregan dependencias de UI externas.

**R15. Trazabilidad.**
Cada bloque agrega su entrada en `CHANGELOG.md` (regla del repo).

## 4. Fuera de alcance

- Pantallas de autenticación (`LoginForm.tsx`, rutas `(auth)`), por usar Tailwind y un flujo propio. Se abre un seguimiento aparte si se decide alinearlas.
- Cambios de reglas de negocio, contratos o permisos.
- `MessageDock`/`useMessageDock` (no hay un caso de uso en V1 que lo pida), salvo que Producto lo solicite.
- `Tabs` en `DetalleViaje`, `HistoricoViaje` y `Catalogos`: se evalúa en D4 y no entra hasta decidirlo.
- Rediseño visual. Solo cambia la implementación de los elementos existentes.

## 5. Decisiones (resueltas el 2026-11-13)

| ID  | Decisión                                                                                                                                                | Efecto              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| D1  | Sí. `Alert` también para errores con botón "Reintentar", con el botón dentro del cuerpo.                                                                | R2                  |
| D2  | Sí. `Breadcrumb` con ruta completa en detalle, ficha, histórico y expediente.                                                                           | R3                  |
| D3  | No. `AppShell.tsx` no se migra en este spec; se hará después de una revisión visual en claro y oscuro.                                                  | R4, tarea 5.3 fuera |
| D4  | No. `Tabs` queda fuera de este spec.                                                                                                                    | Fuera de alcance    |
| D5  | La mensajería va al final y solo si el contrato entrega `actor_real` a la audiencia Interno. Si no, se reporta como brecha contractual y no se inventa. | R11, bloque 10      |
| D6  | Sí. Cargas y contadores se envuelven en un contenedor con `role="status"` y texto accesible "Cargando…".                                                | R6, R9, R10         |

## 6. Criterios de aceptación globales

1. `rg "display: '(flex|grid)'" src` baja de 115 a un número que se justifica archivo por archivo (solo `AppShell.tsx` y casos documentados).
2. `rg "role=\"(alert|status)\"" src` solo deja los usos justificados (errores de campo y regiones vivas propias).
3. No hay `datetime-local`, `<dl>`, `<hr>` ni `ul/li` de historial a mano en `src/features`.
4. El steering de la librería existe en el repo y la lista de verificación de PR (sección 8 del steering) se cumple en cada bloque.
5. Las verificaciones de R14 pasan en cada bloque.
