# Adopción de `@ai27-tech/ui@0.3.0-beta.1`: tareas

Cada bloque termina con: `tsc --build`, `eslint .`, `vite build --mode mock`, `vitest run` (y `test:e2e` donde se indica), y su entrada en `CHANGELOG.md`.
Las decisiones D1 a D6 están resueltas en `requirements.md` (sección 5).

- [x] 1. Base
  - [x] 1.1 Copiar `ai27-tech-library-first.md` a `.kiro/steering/ai27-ui-library.md` con `inclusion: always` (R1)
  - [x] 1.2 Buscar importadores (alias y rutas relativas) de `src/components/ui/Input.tsx` y `Button.tsx`; si no hay, eliminarlos (R13). `Input.tsx` y `Button.tsx` eliminados, junto con `tests/Button.test.tsx` (ver BRECHAS.md, sección 0)
  - [x] 1.3 Registrar la línea base: conteo de `display: flex|grid`, `role="alert|status"`, `<h1>` manuales y número de pruebas verdes (ver BRECHAS.md, sección 1)
  - [x] 1.4 Revisar el CHANGELOG de `pf-library-frontend-components` entre 0.2 y 0.3.0-beta.1 por cambios visibles y anotar los relevantes en `BRECHAS.md`

- [x] 2. Componente de composición `BloqueError` (D-B)
  - [x] 2.1 Crear `src/components/feedback/BloqueError.tsx` con `Alert variant="danger"` + `Button "Reintentar"`
  - [x] 2.2 Prueba: rol `alert`, mensaje y callback de reintento

- [ ] 3. `Alert` (R2), por área, un commit por área
  - [x] 3.1 `roster/` (`Roster`, `UnidadForm`, `UnidadesMonitoristas`, `UnidadesMonitoristaForm`)
  - [x] 3.2 `catalogos/` (`Catalogos`, `CustodioForm`, `VehiculoForm`)
  - [x] 3.3 `administracion/` (diálogos, `PanelUsuario`, `Administracion*`, `AlcanceEditor`)
  - [x] 3.4 `emergencias/` (bandeja, panel, acciones, lista, diálogo)
  - [x] 3.5 `conversaciones/` (bandeja, lista de trabajo, panel; el panel se vuelve a tocar en el bloque 10)
  - [x] 3.6 `viajes/` (`BandejaViajes`, `FichaTecnicaViaje`, `FichaEditor`, `ExpedienteViaje`, `HistoricoViaje`, `DetalleViaje`, `etaForm`) y `monitoreo/dashboard`
  - [x] 3.7 Revisar a mano que no queden `role="alert|status"` sobre `<p>` fuera de errores de campo. Quedan 19 usos, todos documentados en BRECHAS.md, sección 3 (carga para bloque 9, aria-live, un error de campo y cuatro `CardBody` de resultado en CrearViaje por decidir)

- [x] 4. `PageHeader` y `Breadcrumb` (R3). Detalle en BRECHAS.md, sección 4
  - [x] 4.1 Pantallas sin jerarquía: `Catalogos`, `Roster`, `BandejaViajes`, `BandejaEmergencias`, `BandejaConversaciones`, `DashboardMonitoreo`, `StubPage`
  - [x] 4.2 `Administracion.tsx`: resolver foco y `aria-labelledby` (id y `tabIndex` en un `span` dentro del título; sin BRECHA-UI)
  - [x] 4.3 Pantallas con jerarquía y `Breadcrumb` con `as={Link}`: `DetalleViaje`, `FichaTecnicaViaje`, `HistoricoViaje`, `ExpedienteViaje` (con `EnlaceRuta` para pasar `href` como `to`)
  - [x] 4.4 `h2` de bloque a `Section`: `Catalogos`, `Roster`, `UnidadesMonitoristas`, `PanelCaso`, `SeccionEmergenciasViaje`, `SeccionUsuarios`, `PanelUsuario`. El título va en `span role="heading" aria-level={2}` porque `Section` no pinta encabezado
  - [x] 4.5 `test:e2e` (el login espera el título «Dashboard de Monitoreo»). 5 de 5 en verde

- [x] 5. `Stack`, `Inline`, `Grid` (R4). Detalle en BRECHAS.md, sección 5
  - [x] 5.1 Archivos con más ocurrencias: `HistoricoViaje`, `PanelCaso`, `DetalleViaje`, `CrearViaje`, `FichaTecnicaViaje`, `FichaEditor`
  - [x] 5.2 Resto de `src/features` (roster, catalogos, administracion, conversaciones, dashboard). Administración no tenía `display:`. Los formularios quedaron con tres enfoques, pendiente de unificar (BRECHAS.md, sección 5.2)
  - [-] 5.3 `AppShell.tsx`: fuera de este spec por D3 (se hará después de una revisión visual en claro y oscuro)
  - [x] 5.4 Medir el conteo final y justificar cada `display:` restante. Inicio 97 líneas; final 11 (3 en AppShell por D3, 8 en `Form` y `CardFooter` sin props de disposición). Detalle en BRECHAS.md, sección 5

- [x] 6. `DescriptionList` y `Section` en fichas (R5). Detalle en BRECHAS.md, sección 6
  - [x] 6.1 `FichaTecnicaViaje.DatosViaje` y `FichaConfirmada`: eliminar `Dato` (ahora son dos `DescriptionList`)
  - [x] 6.2 `PanelUsuario` (`filas` → `items`)
  - [x] 6.3 Revisar `DetalleViaje` (destinos, condiciones) y `ExpedienteViaje` por etiqueta-valor manual. `ExpedienteViaje` sin cambios; `DetalleViaje` pendiente de decisión (BRECHAS.md, 6.3)

- [x] 7. `DateTimeInput` (R7). Detalle en BRECHAS.md, sección 7
  - [x] 7.1 Prueba de humo: cómo se simula el cambio de valor de `DateTimeInput` en Testing Library; helper en `tests/helpers/fechaHora.ts`
  - [x] 7.2 `CrearViaje.tsx`
  - [x] 7.3 `etaForm.tsx` y `fechaHoraForm.tsx`; comentario obsoleto quitado
  - [x] 7.4 Actualizar `CrearViaje.test.tsx` y `DecisionSolicitud.test.tsx`. La expectativa del `PATCH fecha-hora` no cambió
  - [x] 7.5 `fechaHoraAISO` sin cambios; caso vacío cubierto con una prueba nueva

- [ ] 8. `Timeline` (R6)
  - [ ] 8.1 `HistoricoViaje`: bitácora (D-D)
  - [ ] 8.2 `HistoricoViaje`: estadías, con "Cerrar estadía" en `content`
  - [ ] 8.3 `HistoricoViaje`: incidencias, con "Resolver incidencia" en `content` solo si `puedeCorregir`
  - [ ] 8.4 `PanelCaso`: notas de resolución
  - [ ] 8.5 Actualizar `tests/viajes/Historico*.test.tsx` y de emergencias según el DOM nuevo

- [ ] 9. Cargas, vacíos, `Select` y `Stat` (R8, R9, R10)
  - [ ] 9.1 Contenedor `role="status"` + `Skeleton*` en los bloques de carga manual (D-C)
  - [ ] 9.2 `EmptyState` en los vacíos de bloque que no pasan por `Table.emptyState`
  - [ ] 9.3 `ClienteSelector` con `variant="searchable"` y `noResultsText`
  - [ ] 9.4 `DashboardMonitoreo`: `Stat` en `Grid` con `loading`; conservar `IndicadorFrescura` y textos DEC-136
  - [ ] 9.5 `test:e2e`

- [ ] 10. Mensajería (R11), condicionada a D5
  - [ ] 10.1 Confirmar en `pf-pkg-contracts` (tag de `package.json`) los campos del `Mensaje` y si `actor_real` llega a audiencia Interno; si no, registrar brecha contractual y detener el bloque
  - [ ] 10.2 `adaptadorMensajeria.ts` con pruebas (mapeo y regla de `onRetry`)
  - [ ] 10.3 `PanelConversacion`: `MessageThread` + `ConversationStatus`, sin `own` calculado dentro del JSX
  - [ ] 10.4 Fallos de envío con `deliveryError`; sin `onRetry` en `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura` y `403`
  - [ ] 10.5 `BandejaConversaciones` y `ListaTrabajo`: `EmptyState` y `Skeleton`

- [ ] 11. Navegación (R12)
  - [ ] 11.1 Levantar el portal en mock y revisar `Sidebar` en claro/oscuro, expandido/colapsado (D-H)
  - [ ] 11.2 `EmptyState size="sm"` en los dos mensajes de vacío; quitar el cast `NavLinkItem` si `tsc` lo permite; corregir comentarios obsoletos

- [ ] 12. Cierre
  - [ ] 12.1 Ejecutar la lista de PR de la sección 8 del steering sobre los archivos tocados (sin `<svg>`, sin hex, sin `datetime-local`, iconos de `lucide-react`)
  - [ ] 12.2 Recorrido manual con los siete roles en mock, claro y oscuro
  - [ ] 12.3 Medir los criterios de aceptación globales y registrar resultados en `BRECHAS.md`
  - [ ] 12.4 Entrada final de `CHANGELOG.md`
