# Adopción de `@ai27-tech/ui@0.3.0-beta.1`: brechas y registro

Este archivo registra la línea base, las brechas encontradas durante la migración y los cambios de la librería que afectan al portal. Cada entrada indica su fuente.

## 1. Línea base (tarea 1.3, 2026-11-13)

Medida antes de tocar componentes de `src/features`. Única modificación previa: eliminación de `src/components/ui/Input.tsx` (tarea 1.2).

| Métrica                                   | Valor                                                            | Cómo se midió                          |
| ----------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| `display: 'flex' \| 'grid'` en línea      | 115 líneas en 43 archivos                                        | `Select-String` sobre `src/**/*.ts(x)` |
| `role="alert"` o `role="status"` en `src` | 99 líneas                                                        | `Select-String` sobre `src/**/*.ts(x)` |
| `<h1>` manuales                           | 14 líneas                                                        | `Select-String` sobre `src/**/*.ts(x)` |
| Pruebas unitarias                         | 21 fallando, 604 pasando, 625 en total (5 de 85 archivos fallan) | `npx vitest run`                       |

**Brecha: la línea base no coincide con el CHANGELOG.** La entrada del 2026:11:11 afirma "625 pruebas en verde". Hoy hay 21 pruebas en rojo. Las 21 fallas están en:

- `tests/roster/Roster.test.tsx` (9 pruebas, alta de unidad y diálogo de monitoristas).
- `tests/viajes/CierreViaje.test.tsx` (9 pruebas, E8-T14).
- `tests/viajes/ClienteSelector.test.tsx` (1 prueba).
- `tests/viajes/CrearViaje.test.tsx` (2 pruebas).
- `tests/viajes/HistoricoViaje.test.tsx` (1 prueba).

**Causa: la librería, no el código del portal.** El `Select` de `@ai27-tech/ui` (instalado en `0.3.0-beta.1`, commit `20288f4`) cambió su nombre accesible dentro de `FormField`:

- Antes, el `id` no llegaba al control, así que el botón del `Select` se nombraba por su texto visible ("Selecciona un cliente", "Elige un vehículo", "Selecciona un motivo").
- Ahora, `FormField` asocia `<label for>` con el botón. El nombre accesible pasa a ser la etiqueta del campo ("Cliente", "Motivo", "Vehículo"), y el texto visible deja de contar.
- Se comprobó con un render temporal de `FormField` + `Select` (archivo ya borrado): el botón tiene `id="_r_0_"`, el `label` tiene `for="_r_0_"` y `aria-labelledby` es nulo.
- Esta es la entrada 0.2.0-beta.7 del CHANGELOG de la librería: "`FormField` lo asocia con su etiqueta (antes el `id` no llegaba al control)". Es una mejora de accesibilidad, pero rompe las consultas `getByRole('button', { name: 'Selecciona…' })`.

Las pruebas de `ClienteSelector`, `CrearViaje`, `HistoricoViaje`, `CierreViaje` y `Roster` consultan por el texto del placeholder. Se revisaron los mensajes de error de los 21 casos: la mayoría son `Unable to find role="button" and name "Selecciona…"/"Elige…"`. Un caso de `CierreViaje` busca un botón con el nombre de la opción elegida y tiene la misma causa. No se revisó cada caso uno por uno.

**Corrección aplicada:** las consultas de esas pruebas ahora buscan el selector por su etiqueta de `FormField` (`Cliente`, `Vehículo`, `Motivo de cierre`, `Motivo de la estadía`, `Eje de autorización`). Las aserciones que comparaban el nombre con el valor elegido ahora usan `toHaveTextContent` sobre el mismo botón, así que siguen verificando el valor. Ningún caso se eliminó ni se relajó. Resultado: `vitest run` con 625 de 625 en verde. Archivos: `tests/viajes/ClienteSelector.test.tsx`, `tests/viajes/CrearViaje.test.tsx`, `tests/viajes/CierreViaje.test.tsx`, `tests/viajes/HistoricoViaje.test.tsx`, `tests/roster/Roster.test.tsx`.

## 0. Decisiones de ejecución

- **Tarea 1.2, `components/ui/Input.tsx`:** eliminado. Ningún archivo lo importa.
- **Tarea 1.2, `components/ui/Button.tsx`:** eliminado junto con `tests/Button.test.tsx`, por decisión de Product Management (todo debe venir de `@ai27-tech/ui`). Sin referencias restantes en `src`, `tests` ni `e2e`. La prueba eliminada tenía 3 casos, por eso el total de pruebas baja de 628 a 625 (604 en verde, las mismas 21 en rojo).
- **Tarea 2:** `BloqueError` se crea en `src/components/feedback/BloqueError.tsx`, importa `Alert`, `Button` e `Inline` de `@ai27-tech/ui` (no del `Button` local). Pruebas en `tests/feedback/BloqueError.test.tsx`: 3 de 3 en verde.

## 2. Cambios de `pf-library-frontend-components` entre 0.2.0-beta.8 y 0.3.0-beta.1 (tarea 1.4)

Fuente: `repos/pf-library-frontend-components/CHANGELOG.md`, sección `[0.3.0-beta.1] — 2026-11-12`, y `[0.2.0-beta.8]`, `[0.2.0-beta.7]`. Solo se listan los cambios que afectan a este portal.

### 2.1 Componentes que este spec usa

- **`Alert`**: `warning` y `danger` usan `role="alert"`; `info` y `success` usan `role="status"`. Hay que tenerlo en cuenta en la tarea 3.7 y en las pruebas que buscan `role`.
- **`Breadcrumb`**: acepta `as` por elemento (para `Link` del router) y `maxItems`. El último elemento lleva `aria-current="page"`.
- **`PageHeader`**: título con `titleAs` (`h1` o `h2`), `breadcrumb` y `actions`. Por debajo de 40 rem, las acciones bajan bajo el título.
- **`Section`**: usa `<section>` con `aria-labelledby`. Con `collapsible`, el encabezado es un botón con `aria-expanded`.
- **`DescriptionList`**: `dl`, `dt`, `dd`. De 1 a 4 columnas. `emptyValue` por defecto; este portal debe confirmar que muestra "—".
- **`Stat`**: `loading` muestra `Skeleton`. La tendencia se comunica con texto accesible.
- **`Timeline`**: `orientation`, `labels`, `emptyState`, `loading`. Estados `completed`, `current`, `upcoming`, `error`, `warning`.
- **`EmptyState`**: tamaños `sm` y `md`.
- **`Skeleton*`**: el contenedor anuncia "Cargando" con `role="status"` y `aria-busy`. Los skeleton son decorativos para lectores de pantalla. Coincide con D6.
- **`Select`**: `variant="searchable"`, `noResultsText`, `searchPlaceholder` (0.2.0-beta.7). `state`, `readOnly`, `id` y `aria-describedby` (0.3.0-beta.1).
- **`DateTimeInput`, `DateInput`, `TimePicker`**: valor `YYYY-MM-DDTHH:mm` para `DateTimeInput`. Esto afecta a la tarea 7.
- **`Table`**: con `loading`, muestra filas skeleton en lugar de spinner. El checkbox de seleccionar todo queda deshabilitado. Cambia el DOM durante la carga; revisar pruebas de `Table`.
- **`Sidebar`**: el botón de colapso pasa al encabezado y es solo icono. La prop `footer` es la única que renderiza el pie. Afecta a la tarea 11.1.
- **`Badge`**: `appearance` (`soft`, `solid`, `outline`), `size` (`sm`, `md`) y las variantes `info`, `primary`, `secondary`.
- **`Checkbox`, `Radio`, `Switch`**: `size` e `invalid`. Ya no pasan `invalid` al `input`; usan `aria-invalid`.
- **`FormField`**: `showOptional`, `orientation="horizontal"`.
- **`Input`**: `clearable`, `passwordToggle`, `readOnly`. El estado `error` pinta el borde. (El portal ya no usa `components/ui/Input.tsx`.)
- **`Textarea`**: `showCount`.
- **`FormSection`**: `collapsible`, `defaultOpen`, `open`, `onOpenChange`.
- **`FormActions`**: `sticky`.
- **`Stack`, `Inline`, `Grid`**: `gap` de 0 a 6, `align`, `justify`, `as`, `wrap`, `columns`, `minItemWidth`.
- **`Popover`**: se renderiza en portal a `document.body`. Si el portal usa menús propios, revisar el `z-index`.
- **`Tabs`**: fuera de alcance por D4.

### 2.2 Cambios de comportamiento a revisar

- **Textos por defecto en español** (`Table`, `FilterTable`, `FilterBar`). Antes eran en inglés. Si el portal depende de textos en inglés en pruebas, cambian.
- **`Iconos`**: los iconos de la librería ahora salen de `lucide-react`. El trazo cambia un poco.
- **`MessagePanel` y mensajería**: el campo `secuenciaMensaje` pasa a `secuencia`, alineado con el contrato `v0.1.0-tracer.9` de la librería. El portal usa `pf-pkg-contracts` `0.1.0-tracer.40` (`package.json`). **Brecha relacionada con D5 y el bloque 10:** hay que confirmar los campos del `Mensaje` en el contrato de `tracer.40` antes de adoptar `MessagePanel` o `MessageThread`.
- **`Sidebar`**: ver 2.1.
- **`ImageCard`**: muestra placeholder mientras carga. No aplica a este portal por ahora.

### 2.3 Fuera de alcance de este portal

Ver CHANGELOG de la librería: `Visor`, `ImageCarousel`, `ImageGrid`, `Tooltip`, `Badge.truncate`, `ImageCard`, `Muelle` (`MessageDock`), y la integración de Storybook y CI de la librería. Este spec no los usa (`MessageDock` y `useMessageDock` están excluidos en el spec, sección 4).

**Dato sin verificar:** el CHANGELOG de la librería contiene una sección `[0.2.1] — 2026-10-01` después de una segunda sección `[Unreleased]` (línea 214 del archivo). No se revisó porque queda fuera del rango 0.2 a 0.3.0-beta.1 pedido en la tarea 1.4.
