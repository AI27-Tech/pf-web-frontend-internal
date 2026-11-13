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

## 3. Bloque 3: `Alert` por área (tareas 3.1 a 3.7, 2026-11-13)

Conteo medido con grep sobre `src/**/*.tsx`: antes del bloque había 99 usos reales de `role="alert|status"` (sin contar dos comentarios de `BloqueError`). Después quedan 19, así que se migraron 80. Los 19 restantes se describen abajo. `vitest run` da 625 de 625 en verde; `tsc --build`, `eslint .` y `vite build --mode mock` pasan.

### 3.1 Restos que se quedan por decisión de bloque posterior

- **Carga con `role="status"` (bloque 9, decisión D6):** 13 usos en `PanelUsuario`, `DesactivarOrganizacionDialog`, `RevocarSesionesDialog`, `ListaTrabajo`, `SeccionEmergenciasViaje`, `BandejaEmergencias` ("Cargando emergencia..."), `ListaCasos`, `DashboardMonitoreo`, `ClienteSelector`, `CrearViaje` (roster) y tres en `HistoricoViaje` ("Cargando bitácora/estadías/incidencias...").
- **Región `aria-live` (Req 10.8, no es aviso visual):** `BandejaEmergencias.tsx` (`role="status" aria-live="polite"`) y `BannerEstado.tsx` (`aria-live="polite"`, fuera de la lista de tareas). Se dejan sin cambios.

### 3.2 Restos que requieren decisión

- **`AltaUsuarioDialog.tsx`:** `<p role="alert">{errores.organizacionId}</p>` es un error de validación del grupo de organizaciones (radio group dentro de `FormSection`, no dentro de `FormField`). Se trató como error de campo y se dejó. Confirmar si debe ir dentro de `FormField`.
- **`CrearViaje.tsx` (Resultado):** cuatro `CardBody role="status|alert"` (éxito, escolta confirmada, respuesta insuficiente y error). Son `CardBody`, no `<p>`, y el Card tiene encabezado e información útil. Se dejaron. Si se quieren migrar a `Alert`, habría que rediseñar el bloque de resultado.

### 3.3 Decisiones de variante tomadas al migrar (revisar)

- Errores sin `role` previo que ahora sí lo anuncian: `asignacionForm` y `EstadoError` de `DetalleViaje`. Cambio positivo de accesibilidad.
- Avisos que tenían `role="status"` y ahora son `danger` (`role="alert"`): errores 403 y de "rol sin acceso" en `ficha` e `histórico`. Se anuncian de forma más intensa.
- Mensaje "solo disponibles para el Jefe Operativo" en `catalogos`: `danger` para conservar `role="alert"`. `warning` también lo emite; si se prefiere un tono informativo, cambiarlo.
- `datos_desactualizado` (administración) y "no se determinó el nombre del archivo" (`SubirEvidencia`): `danger`. `warning` sería más preciso.
- Estado `brecha` de `PanelUsuario`: `Alert info` con botón "Reintentar" a mano, para no cambiar el comportamiento.

### 3.4 Otros cambios de presentación

- `BloqueError` usa botón `outline` `sm`. Los sitios que tenían `secondary` ahora se ven distintos. Revisión visual en claro y oscuro pendiente (tarea 12.2).
- Los avisos de éxito en `roster` conservan su separación con `marginBottom: var(--ui-space-2)`. El aviso de confirmación de `catalogos` perdió su `margin` inferior al quitar `style`; revisar visualmente.
- Excepciones a la regla "usar `BloqueError`": la escolta de `FichaTecnicaViaje` y el error de catálogo GPS de `FichaEditor` siguen con `Alert` y botón a mano, porque `BloqueError` no acepta `disabled` ni una etiqueta distinta de "Reintentar" (la prueba de la escolta busca "Reintentar escolta").

### 3.5 Pendientes fuera de este bloque

- `type="datetime-local"` en `CrearViaje.tsx`: ya existía y no se tocó. Lo cubre el bloque 7.2 (`DateTimeInput`).
- Prettier marca archivos que no se tocaron en `administracion` (p. ej. `AccionesUsuario.tsx`) por los finales de línea CRLF del repo. Problema anterior; no se reformatearon.
- Un proceso `vite --mode mock` (PID 17748, iniciado a las 12:32) sigue corriendo en el repo. No lo inicié yo; conviene detenerlo si nadie lo usa.

## 4. Bloque 4: `PageHeader`, `Breadcrumb` y `Section` (tareas 4.1 a 4.5, 2026-11-13)

Resultado: `vitest run` 629 de 629 en verde (625 previas más 4 pruebas nuevas). `tsc --build`, `eslint src tests e2e` y `vite build --mode mock` pasan. `playwright test`: 5 de 5 en verde, incluido el login que espera el título «Dashboard de Monitoreo».

### 4.1 Encabezados de página

- `PageHeader` sustituye el `h1` manual en Catálogos, Roster, BandejaViajes, BandejaEmergencias, BandejaConversaciones, DashboardMonitoreo y StubPage. El `h1` lo genera la librería.
- En `Administracion.tsx`, el id y el `tabIndex={-1}` se pusieron en un `span` dentro del título, que se pasa como `title`. El foco y `aria-labelledby` siguen funcionando. No quedó ninguna `BRECHA-UI`.
- Breadcrumb en DetalleViaje, FichaTecnicaViaje, HistoricoViaje y ExpedienteViaje. Items: `Viajes` → `/viajes`, luego `Viaje {id}` → `/viajes/{id}` en ficha, histórico y expediente. El último item es la pantalla actual, sin enlace.
- Para el enlace se creó `src/components/layout/EnlaceRuta.tsx`. La librería renderiza cada item con `href`, pero `Link` de TanStack espera `to`; el componente traduce uno al otro.

### 4.2 Problema de la librería: `Section` sin encabezado

`Section` pinta el título en un `span` cuando no es `collapsible`. Un `h2` solo aparece en el modo plegable. Para no perder la estructura de encabezados, cada título de `Section` se envuelve así: `<span role="heading" aria-level={2}>Texto</span>`. Se aplicó en 9 lugares: `Catalogos` (2), `Roster`, `UnidadesMonitoristas`, `SeccionEmergenciasViaje`, `PanelCaso` (3), `PanelUsuario` y `SeccionUsuarios`.

**Propuesta para el equipo de la librería:** que `Section` acepte `titleAs` (`h2` o `h3`), como ya lo hace `PageHeader`. Así desaparece el envoltorio.

### 4.3 Nombre accesible de las secciones

La librería pone `aria-labelledby` apuntando al título, así que el `aria-label` de `Section` no tiene efecto. Se quitó en `PanelCaso` y `SeccionEmergenciasViaje`. Los nombres ahora son los títulos visibles:

- `PanelCaso`: «Viaje» (antes se anunciaba «Datos del viaje»).
- `SeccionEmergenciasViaje`: «Emergencias» (antes «Emergencias del viaje»).

**Decisión a revisar:** cambiar el título visible a «Datos del viaje» y «Emergencias del viaje», o aceptar los nombres cortos.

### 4.4 Revisiones visuales pendientes (tarea 12.2)

- En `DetalleViaje`, los tres botones de navegación pasaron a la zona `actions` del `PageHeader`. Ahora «Expediente y evidencia» aparece antes del bloque de emergencias.
- `Section` no pone separador bajo el encabezado. Se quitó la separación que daba `CardHeader` en Catálogos y Roster. Si hace falta, usar `divider`.
- Los botones «Reintentar» de los `BloqueError` ya se revisaron en el bloque 3.

### 4.5 Fuera de la lista de tareas

- `login.tsx` (panel de marca con `h2`), `LoginForm.tsx` (`h1` con clases de Tailwind) y `two-factor.tsx` (`h1`). Siguen con encabezados manuales. No están en las tareas 4.x; quedan para decidir.
- `BandejaViajes.tsx`: los comentarios tienen texto corrupto por codificación (anterior a este bloque, no tocado).

### 4.6 Pruebas

- 9 archivos de `tests/viajes/` añadieron un stub de `Link` a sus mocks de `@tanstack/react-router`, porque el breadcrumb lo usa.
- Nueva prueba en `tests/administracion/encabezado-administracion.test.tsx` (3 casos) y en `HistoricoViaje.test.tsx` (enlaces del breadcrumb).
- `e2e/roster.spec.ts`: el selector del vehículo buscaba «Elige un vehículo». Ahora busca «Vehículo», como las pruebas unitarias del bloque anterior.
