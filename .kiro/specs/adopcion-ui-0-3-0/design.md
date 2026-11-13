# Adopción de `@ai27-tech/ui@0.3.0-beta.1`: diseño

Regla de trabajo: migrar por bloques pequeños, cada uno verificable y con su entrada de CHANGELOG. No se cambian contratos, permisos ni textos de negocio. Props verificadas contra los `.d.ts` de `node_modules/@ai27-tech/ui/dist/components`.

## 1. Mapa de reemplazos

| Hoy                                                                    | Después                                                     | Props que se usan                                                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<p role="alert\|status" style={{color}}>`                             | `Alert`                                                     | `variant: info\|success\|warning\|danger`, `title`, `onDismiss`. `warning` y `danger` emiten `role="alert"`; `info` y `success`, `role="status"` |
| `<h1 className="ui-text-headline-lg">` + descripción + div con botones | `PageHeader`                                                | `title`, `description`, `breadcrumb`, `actions`, `titleAs`                                                                                       |
| Ruta de navegación                                                     | `Breadcrumb`                                                | `items` con `as={Link}` y `to`; `maxItems`                                                                                                       |
| `div style={{display:'flex',flexDirection:'column',gap}}`              | `Stack`                                                     | `gap` 0 a 6, `align`, `justify`, `as`                                                                                                            |
| `div style={{display:'flex',gap}}` en fila                             | `Inline`                                                    | `gap`, `align`, `justify`, `wrap`                                                                                                                |
| `div` con `display:grid`                                               | `Grid`                                                      | `gap`, `columns`, `minItemWidth`                                                                                                                 |
| `h2` de bloque + contenido en `Card`                                   | `Section`                                                   | `title`, `description`, `actions`, `collapsible`                                                                                                 |
| `Dato`                                                                 | `DescriptionList`                                           | `items: {label,value,span?}`, `columns` 1 a 4, `orientation`, `emptyValue`                                                                       |
| `ul/li` de historial                                                   | `Timeline`                                                  | `items: {id,title,description,timestamp,dateTime,status,content}`, `loading`, `emptyState`, `reverse`, `labels`                                  |
| `Input type="datetime-local"`                                          | `DateTimeInput`                                             | `value`, `onChange(value: string)`, `min`, `max`, `invalid`, `withSeconds`, `defaultTime`                                                        |
| "Cargando…" de bloque                                                  | `SkeletonText`, `SkeletonCard`, `SkeletonTable` o `Spinner` | `lines`, `label`                                                                                                                                 |
| "No hay…" de bloque                                                    | `EmptyState`                                                | `title`, `description`, `action`, `size`, `icon`                                                                                                 |
| Contador a mano                                                        | `Stat` en `Grid`                                            | `label`, `value`, `helpText`, `trend`, `loading`                                                                                                 |
| Mensajería                                                             | `MessageThread`, `ConversationStatus`                       | `mensajes`, `isOwn`, `pendientes`, `estado`, `atendida`, `reclamadaPor`, `reclamoPropio`                                                         |

## 2. Decisiones de diseño

**D-A. `Alert` y los tests por `role`.** La pareja `danger`↔`alert` e `info`/`success`↔`status` replica los roles de hoy. Cambia el elemento (de `p` a `div`), así que cualquier prueba que consulte por etiqueta o `closest('p')` se corrige. Los errores dentro de `FormField` no cambian, y `components/ui/Input.tsx` se elimina (R13), no se migra.

**D-B. Errores con reintento.** Patrón único para los bloques que hoy tienen `div role="alert"` + `Button "Reintentar"` (`HistoricoViaje.tsx`, `FichaTecnicaViaje.tsx`, `Roster.tsx`, `Catalogos.tsx`, `UnidadesMonitoristas.tsx`): `Alert variant="danger"` con el `Button` como último hijo. Se crea un solo componente de presentación `BloqueError` en `src/components/feedback/` que envuelve esa combinación y lo reutilizan todos. No es un componente nuevo de UI sino una composición de `Alert` y `Button`, así que no lleva marca `BRECHA-UI`.

**D-C. Carga con texto accesible.** Hoy las pruebas buscan el texto "Cargando…" o `role="status"`. `Skeleton` no tiene texto, así que cada bloque de carga se envuelve en un contenedor con `role="status"` y `aria-label="Cargando <recurso>"`, y el `Skeleton*` queda dentro. El texto se conserva como `aria-label`, no visible. Las pruebas que usan `getByText('Cargando…')` pasan a `getByRole('status', { name: /Cargando/ })`. Para `Table` y `FilterTable` se usa su `loading` y no se agrega nada.

**D-D. `Timeline` para registros con acciones.**

- Bitácora: `title` = autor, `description` = texto, `timestamp` = `formatearFecha(entrada.ts)`, `dateTime` = `entrada.ts`.
- Estadía: `title` = `motivo · eje_autorizacion`, `status` = `current` si está abierta y `completed` si está cerrada. El `Badge` Abierta/Cerrada y la duración van en `content`, junto al botón "Cerrar estadía".
- Incidencia: `title` = `tipo_interno`, `status` = `warning` si está en atención y `completed` si está resuelta. El botón "Resolver incidencia" va en `content` solo si `puedeCorregir`.
- Notas de `PanelCaso`: `title` = autor, `description` = texto, `timestamp`. El `Badge "Nota de resolución"` va en `content`.
- Orden: `reverse` según el orden actual de cada lista; no se reordena en el portal.
- Estado de carga y vacío: `loading` y `emptyState` del componente, con los mismos textos de hoy.

**D-E. `DescriptionList`.** `FichaTecnicaViaje` pasa de `Dato` ×6 a un solo `DescriptionList` de 2 columnas. Los valores que hoy son texto de negocio ("No informado", "Capturado") se pasan tal cual para que `emptyValue` no los reemplace. `PanelUsuario` usa `filas` → `items` con la misma regla.

**D-F. `DateTimeInput` y la conversión.** La conversión a RFC 3339 ya vive en un solo lugar: `fechaHoraAISO` (`adaptadorCrearViaje.ts`), llamado por `CrearViaje`, `useDetalleViaje.mutacionEta` y `completarFechaHora`. El valor de `DateTimeInput` (`"2026-11-13T14:30"`) es el mismo formato que daba `datetime-local`, así que ese camino no cambia. Cambia el manejador: `onChange` recibe `string`, no un evento. Validación: `""` equivale a vacío. `required` queda en `FormField`; `min`/`max` no se agregan porque ninguna regla de negocio los define (no inventar reglas). Las pruebas que hacen `fireEvent.change(document.querySelector('input[type="datetime-local"]'))` (`CrearViaje.test.tsx`, `DecisionSolicitud.test.tsx`) deben cambiar a la interacción real del componente; se confirma con una prueba de humo del componente antes de reescribirlas (tarea 7.1).

**D-G. `Select` searchable.** Solo `ClienteSelector`. `onChange` entrega `string | number`; el estado actual es `string`, así que se normaliza con `String(value)`. `noResultsText="Sin clientes que coincidan"`.

**D-H. Sidebar.** El steering describe el botón de colapso "en el encabezado", y el comentario actual de `NavigationSidebar.tsx` lo ubica en el footer. Antes de tocar nada se levanta el portal en modo mock y se verifica el layout en claro y oscuro, expandido y colapsado. Si el `BrandHeader` y `margin-top:auto` del grupo de sesión siguen bien, solo se actualizan el comentario y los dos mensajes de vacío. El cast `NavLinkItem` se prueba quitándolo: si `tsc` pasa, se elimina.

**D-I. Mensajería (R11).** Capa nueva `src/features/conversaciones/adaptadorMensajeria.ts`:

- `aMensajeLib(m: MensajeWire): Mensaje` mapea `secuencia`, `alias_mostrado → aliasMostrado`, `creado_en → creadoEn`, `client_message_id → clientMessageId` y el cuerpo.
- `isOwn` se calcula en el portal con `actor_real === sujetoId`, como hoy. Antes de migrar se confirma en `pf-pkg-contracts` (tag de `go.mod`/`package.json`: `tracer.40`) que `actor_real` llega en el audiencia Interno; si no, se reporta como brecha contractual, no se inventa.
- `pendientes`: `MensajePendiente` con `deliveryStatus` y `deliveryError`. Regla de reintento: `onRetry` solo para fallos de red o `5xx`; nunca para `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura` ni `403`.
- `ConversationStatus` recibe `estado`, `atendida` y, solo en audiencia Interno (este portal), `reclamadaPor` y `reclamoPropio`. El portal del cliente no recibe estos datos y no es parte de este repo.
- Orden: lo hace `MessageThread` por `secuencia`; `aplicarCambios.ts` sigue ordenando el estado local.

## 3. Riesgos

| Riesgo                                                                                                                | Mitigación                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pruebas que consultan por etiqueta (`p`), texto "Cargando…" o `datetime-local`                                        | Revisar `tests/**` del bloque antes de migrar; ajustar el selector, no el comportamiento verificado                                                                                       |
| `PageHeader` no declara `id` ni `tabIndex` en el título, y `Administracion.tsx` los usa para foco y `aria-labelledby` | Mantener el foco en un contenedor con `id` y `tabIndex={-1}`, y pasar el `aria-labelledby` al contenedor; si no alcanza, conservar el `h1` en esa pantalla y registrarlo como `BRECHA-UI` |
| `Stat`, `Timeline` y `Skeleton` sin región viva                                                                       | D-C: contenedor `role="status"` propio                                                                                                                                                    |
| Cambio visual en claro/oscuro                                                                                         | Revisión manual de cada pantalla migrada en ambos temas                                                                                                                                   |
| Regresión de `Tabs`: `TabPanel` puede ocultar o desmontar contenido                                                   | Fuera de alcance (D4)                                                                                                                                                                     |
| Cambio de beta a estable de la librería                                                                               | Revisar el CHANGELOG de `pf-library-frontend-components` antes de subir el pin; este spec no sube la versión                                                                              |

## 4. Estrategia de pruebas

- Pruebas existentes actualizadas por selector, sin quitar aserciones.
- Pruebas nuevas solo donde se agrega lógica: `adaptadorMensajeria` (mapeo y regla de `onRetry`) y `BloqueError` (rol y botón).
- Verificación manual en modo mock con los siete roles de `modo-mock-roles-internos`, en claro y oscuro.
- `test:e2e` completo al final de cada bloque que toque login, dashboard o navegación.
