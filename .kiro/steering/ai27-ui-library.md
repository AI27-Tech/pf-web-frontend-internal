---
inclusion: always
---

# Steering: usar siempre `@ai27-tech/ui`

Este archivo es para los portales que consumen la librería (`pf-web-frontend-internal`, `pf-web-frontend-client`, `pf-web-frontend-analist-panel`). Se copia a `.kiro/steering/ai27-ui-library.md` de cada portal.

**Catálogo al 2026-11-13, versión `@ai27-tech/ui@0.3.0-beta.1`.** Si el portal usa una versión anterior, los componentes nuevos no existen todavía; hay que actualizar la dependencia antes de usarlos.

## 1. La regla

La librería `@ai27-tech/ui` es la única fuente de componentes de interfaz. Antes de escribir cualquier elemento visual, en este orden:

1. Buscar el componente en el catálogo de la sección 3.
2. Si existe, importarlo y usarlo. No copiarlo ni imitarlo.
3. Si no existe, revisar si se resuelve combinando los que hay (sección 4).
4. Si de verdad falta, seguir el proceso de la sección 7. No se improvisa en silencio.

Un portal que solo usa `Card` y `Button` está repitiendo trabajo que la librería ya resuelve. Cuando una pantalla arme a mano un banner, una ficha de datos, una fila de métricas, una lista vacía o una línea de historial, hay que detenerse y buscar el componente.

## 2. Configuración que no se toca

- Los estilos se importan una sola vez, antes que el CSS del portal: `import '@ai27-tech/ui/styles.css';`. Ya está en `main.tsx` (client) y en `providers.tsx` (internal).
- El tema lo gobierna el atributo `data-theme="light" | "dark"` en `<html>`. No se redefinen los valores de los tokens `--ui-*` para cambiar el aspecto de un componente.
- El CSS propio del portal consume solo tokens: `var(--ui-color-*)`, `var(--ui-space-1)` a `var(--ui-space-6)`, `var(--ui-radius*)`, `var(--ui-text-*)`, `var(--ui-shadow-*)`. Nada de colores hexadecimales, `rgb()` ni tamaños sueltos que ya existan como token.
- Los iconos salen de `lucide-react`. No se escriben `<svg>` ni `<path>` a mano.
- Las importaciones salen de la raíz: `import { Button } from '@ai27-tech/ui';` y `import type { Column } from '@ai27-tech/ui';`. Nunca desde `@ai27-tech/ui/dist/...` ni desde rutas internas.

## 3. Catálogo

### Acciones y formularios

| Componente                                                   | Para qué                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                     | Toda acción. Variantes `primary`, `secondary`, `outline`, `ghost`, `danger`, `success`, `info`; tamaños `sm`, `md`, `lg`                          |
| `Form`, `FormSection`, `FormRow`, `FormActions`              | Estructura del formulario: secciones (colapsables), filas en columnas, barra de acciones (puede quedar fija abajo)                                |
| `FormField`                                                  | Etiqueta, ayuda, error, indicador de opcional y orientación horizontal. Envuelve cualquier control y le pasa `id`, `invalid` y `aria-describedby` |
| `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch` | Controles. `Select` admite `variant="searchable"`. `Input` admite `clearable` y `passwordToggle`. `Textarea` admite contador                      |
| `DateInput`, `TimePicker`, `DateTimeInput`, `Calendar`       | Fecha, hora y fecha con hora, con calendario y presets                                                                                            |

### Datos y listas

| Componente                 | Para qué                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Table`                    | Tabla con orden, selección, filas expandibles, encabezado fijo, acciones masivas, estado de carga con skeleton y estado vacío                                         |
| `FilterTable`, `FilterBar` | Tabla con búsqueda y filtros. `FilterBar` tiene los diseños `panel` y `toolbar`                                                                                       |
| `Pagination`               | Paginación                                                                                                                                                            |
| `DescriptionList`          | Pares etiqueta-valor (fichas, expedientes). De 1 a 4 columnas; valor vacío se muestra como "—"                                                                        |
| `Stat`                     | Una métrica con tendencia. Acepta `loading`                                                                                                                           |
| `Timeline`                 | Historial de estados o eventos. Vertical u horizontal, con N puntos, responsiva                                                                                       |
| `Badge`                    | Estado corto. Variantes `secure`, `alert`, `escort`, `warning`, `neutral`, `info`, `primary`, `secondary`; apariencias `soft`, `solid`, `outline`; tamaños `sm`, `md` |

### Estructura de pantalla

| Componente                                     | Para qué                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Stack`, `Inline`, `Grid`                      | Disposición con `gap` de 0 a 6. Sustituyen a los `style={{ display: 'flex' }}` y a los `div` con CSS suelto |
| `Card`, `CardHeader`, `CardBody`, `CardFooter` | Contenedor con borde. No es la herramienta para toda la pantalla                                            |
| `PageHeader`                                   | Título de pantalla, descripción, ruta (`Breadcrumb`) y acciones                                             |
| `Section`                                      | Bloque con título, descripción y acciones; puede colapsarse                                                 |
| `Tabs`, `TabList`, `Tab`, `TabPanel`           | Dividir una pantalla larga en secciones                                                                     |
| `Divider`                                      | Separador, con etiqueta opcional                                                                            |
| `EmptyState`                                   | Cuando no hay nada que mostrar                                                                              |

### Navegación

| Componente                               | Para qué                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Navbar`, `NavbarLink`                   | Barra superior                                                                                                |
| `Sidebar`, `SidebarGroup`, `SidebarItem` | Barra lateral con botón de colapso de solo icono en el encabezado. Acepta `as` para usar el `Link` del router |
| `Breadcrumb`                             | Ruta de navegación, con `as` por elemento y plegado con `maxItems`                                            |

### Avisos, cargas y superposiciones

| Componente                                                  | Para qué                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Alert`                                                     | Aviso dentro de la página (`info`, `success`, `warning`, `danger`)     |
| `Toast`, `ToastContainer`                                   | Aviso efímero                                                          |
| `Modal`                                                     | Diálogo que bloquea la pantalla                                        |
| `Popover`                                                   | Contenido flotante anclado a un elemento. Para menús o paneles propios |
| `Tooltip`                                                   | Texto flotante sobre coordenadas                                       |
| `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable` | Placeholders de carga con la forma del contenido                       |
| `Spinner`, `ProgressBar`                                    | Carga sin forma conocida, o con porcentaje                             |

### Imágenes

`ImageCard`, `ImageGrid`, `ImageCarousel`, `Visor`.

### Mensajería (conversación con el cliente)

`MessagePanel`, `MessageDock`, `MessageDockBar`, `useMessageDock`, `MessageThread`, `MessageList`, `MessageBubble`, `MessageComposer`, `MessageAttachment`, `MessageDayDivider`, `ConversationStatus`, `groupMessages`.

## 4. Necesito X, uso Y

| Necesito                                          | Uso                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Mostrar el estado de un `viaje`                   | `Badge` (variante y apariencia; hoy la paleta distingue cuatro tonos, así que combinar con `appearance`) |
| Ficha técnica o datos de un expediente            | `DescriptionList` dentro de `Section`                                                                    |
| Historial de estados del `viaje` o bitácora       | `Timeline`                                                                                               |
| Fila de indicadores                               | `Grid` con varios `Stat`                                                                                 |
| Encabezado de pantalla con ruta y botones         | `PageHeader` con `Breadcrumb` en `breadcrumb` y `Button` en `actions`                                    |
| Poner elementos en fila o columna                 | `Inline`, `Stack`, `Grid`                                                                                |
| Banner de aviso o de "información desactualizada" | `Alert`                                                                                                  |
| Confirmar algo con un clic y que se cierre solo   | `Toast`                                                                                                  |
| Pedir confirmación antes de una acción            | `Modal`                                                                                                  |
| Lista sin resultados                              | `EmptyState`, o el `emptyState` por defecto de `Table`                                                   |
| Datos cargando                                    | `Table` con `loading`, `Skeleton*`, o `Stat` con `loading`. Evitar spinners centrados                    |
| Elegir fecha, hora o ambas                        | `DateInput`, `TimePicker`, `DateTimeInput`. No usar `<input type="date">` ni `type="time"`               |
| Lista con búsqueda y filtros                      | `FilterTable`                                                                                            |
| Elegir entre muchas opciones escribiendo          | `Select` con `variant="searchable"`                                                                      |
| Menú o panel flotante propio                      | `Popover`                                                                                                |
| Dividir una pantalla en áreas                     | `Tabs`                                                                                                   |
| Chat con el cliente                               | Familia de mensajería (sección 6)                                                                        |
| Cualquier icono                                   | `lucide-react`                                                                                           |

## 5. Reglas de uso

- **Textos.** Los textos por defecto de la librería están en español. Para cambiarlos se usa la prop `labels` (o `tableLabels` en `FilterTable`); no se parchan con CSS ni se envuelve el componente.
- **Fechas y horas.** `DateInput`, `TimePicker` y `DateTimeInput` trabajan con cadenas de hora de pared, sin zona horaria: `"2026-11-13"`, `"14:30"` o `"14:30:00"`, `"2026-11-13T14:30"`. El valor vacío es `""`, no `null`. La conversión a UTC o a `Date` la hace el portal. Dentro de `FormField` funcionan sin cableado extra.
- **Formularios.** Cada control va dentro de `FormField`, y los campos dentro de `Form`, `FormSection` y `FormRow`. No se arma el error o la etiqueta a mano.
- **Layout.** No se usa CSS en línea para disponer elementos si `Stack`, `Inline` o `Grid` lo resuelven. Si hace falta CSS propio, el espacio sale de `--ui-space-*`.
- **Router.** Para enlaces dentro de `Sidebar` y `Breadcrumb` se usa la prop `as` con el `Link` del router.
- **Tabla.** El orden, el filtrado y la paginación se controlan desde el portal. Los textos de la tabla se cambian con `labels`.
- **Accesibilidad.** No se quitan `aria-*`, `role` ni el foco visible de los componentes. Un botón de solo icono lleva `aria-label`.

## 6. Mensajería: lo que la librería no hace

La librería dibuja la conversación; no decide quién puede hacer qué. Esas reglas vienen del contrato de `mensajeria` (`pf-pkg-contracts`) y las aplica el portal:

- Solo el rol `ejecutivo` reclama. Solo el responsable con reclamo activo responde, devuelve al pool, transfiere o marca atendida. `supervisor` y `coordinador` solo leen.
- Responder no marca la conversación como atendida.
- Si el envío falla por `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura` o `403`, no se pasa `onRetry` al mensaje: reintentar con el mismo envío no tiene sentido. Se explica el motivo con `deliveryError`.
- El orden de los mensajes es por `secuencia`, nunca por fecha. `MessageThread` ya lo hace; no se reordena por `creadoEn`.
- El portal calcula `isOwn` y pasa `labels` si necesita otros textos.
- El portal del cliente no pasa datos de reclamo ni de pool a `ConversationStatus`: el contrato solo los entrega a audiencia Interno.
- El portal convierte el JSON del contrato (`snake_case`) a los tipos de la librería (`camelCase`: `secuencia`, `aliasMostrado`, `clientMessageId`, `creadoEn`, …). La librería no importa `@ai27-tech/contracts`.
- Los archivos adjuntos se suben y se descargan desde el portal. `MessageAttachment` solo los muestra.

## 7. Cuando la librería no tiene lo que necesito

1. Revisar el catálogo de la sección 3 y las stories de Storybook de la librería.
2. Probar a combinar componentes existentes (sección 4).
3. Si falta, avisar al equipo de la librería con: qué pantalla lo necesita, qué comportamiento y qué se probó para resolverlo con lo que hay.
4. Mientras llega, se puede crear el componente en el portal, **marcado** con el comentario `// BRECHA-UI: <qué falta>` en la primera línea del archivo y usando solo tokens `--ui-*`. Cuando la librería lo publique, se reemplaza y se borra el local.
5. No se agrega una librería de UI externa (Radix, MUI, Chakra, etc.) para cubrir la brecha.

## 8. Antes de abrir un PR

- [ ] No hay `<svg>`, `<path>` ni colores hexadecimales nuevos en los archivos que toqué.
- [ ] No usé `<input type="date">`, `type="time"` ni un `<select>` nativo donde existe `DateInput`, `TimePicker` o `Select`.
- [ ] No armé a mano un aviso, una ficha de datos, una métrica, una lista vacía ni un historial que tenga componente.
- [ ] La disposición usa `Stack`, `Inline` o `Grid` en lugar de CSS en línea.
- [ ] Los iconos vienen de `lucide-react`.
- [ ] Si creé un componente local, tiene el comentario `// BRECHA-UI` y avisé al equipo de la librería.
- [ ] Si actualicé la versión de `@ai27-tech/ui`, revisé el CHANGELOG de la librería por cambios visibles.

## 9. Mantenimiento de este archivo

Este archivo vive en `pf-library-frontend-components/docs/steering-consumidores/ai27-ui-library.md`. Cada vez que la librería agrega, renombra o retira un componente, se actualiza aquí y se vuelve a copiar a los portales. La fecha y la versión del encabezado indican hasta dónde está al día.
