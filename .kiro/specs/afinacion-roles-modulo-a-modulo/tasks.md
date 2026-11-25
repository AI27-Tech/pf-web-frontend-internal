# Implementation Plan: Afinación de acciones y vistas por rol, módulo a módulo (v3)

Las tareas marcadas con `*` son pruebas. Las tareas 0.x no cambian código.

Cada módulo sigue el mismo ciclo (Requirement 0), y cada ciclo tiene estos cinco pasos:

- **a. Línea base.** Búsqueda dirigida de cómo decide el rol hoy cada acción del módulo (archivo y línea). Resultado: tabla corta en la conversación.
- **b. Comparación.** Matriz objetivo contra línea base; lista de diferencias.
- **c. Decisión.** Las filas `D` y `P` se resuelven con el usuario. Sin respuesta, la fila no se toca.
- **d. Implementación.** Política, UI, mocks y pruebas del módulo.
- **e. Cierre.** Matriz marcada, pruebas en verde, nota en este archivo.

## Grafo de dependencias

```
0.x (verificación) ─ 1 (M0 política) ─ 2 (M1 navegación) ─┬─ 3 (M2 bandeja) ─ 4 (M3 crear)
                                                          ├─ 5 (M4 detalle) ─ 6 (M5 ficha) ─ 7 (M6 histórico) ─ 8 (M7 expediente)
                                                          ├─ 9 (M8 dashboard)
                                                          ├─ 10 (M9 emergencias)
                                                          ├─ 11 (M10 conversaciones)
                                                          ├─ 12 (M11 roster) ─ 13 (M12 administración)
                                                          └─ 14 (M13 catálogos y reportes)
                                  pin .46 (0.3) ─ 15 (M14 solicitudes) ─ 16 (validación final)
```

Las fases 1, 2 y 5 a 11 y 14 no dependen del pin. Las fases 3, 4, 12, 13 y 15 necesitan `tracer.46` (0.3). Los pendientes de backend (`BRECHAS.md`, BE-1 a BE-7) no bloquean ninguna fase: el panel sigue la tabla de `requirements.md` y no espera el `403`.

## 0. Verificación

- [x] 0.1 Confirmar Q-3 (rama) y Q-4 (orden) de `BRECHAS.md`, y P-A (inicio del Administrador).
- [x] 0.2 Sin preguntas abiertas al Lead: solo quedan los pendientes de backend (`BRECHAS.md`, BE-1 a BE-7).
- [x] 0.3 Subir `@ai27-tech/contracts` directo a `0.1.0-tracer.46` (decidido). Revisar `CHANGELOG.md` de contratos, correr typecheck y corregir lo que rompa el enum del viaje y `Rol` (nueve valores). Verificar `MiAlcance`, `ViajeResumen.cliente` y `unidades`, `AlcanceSujeto.clientes_*`, `ClientesSujetoEntrada` y las operaciones de solicitudes. _(Hecho con `pnpm add`; `npm install` falla con un error de Arborist. Con `.46` se retiraron `SOLICITADO`, `RECHAZADO_*` y `CANCELADO`: se quitó aprobar y rechazar del detalle y su guard `decisionSolicitud`; el selector de rol ya tiene nueve valores.)_
- [x] 0.4 Confirmar la rama de trabajo (Q-3) antes del primer commit.

## 1. M0: Política de capacidades (Requirement T1, 1)

- [x] 1.1 Ciclo a y b: levantar la línea base de lógica por rol fuera de `mocks/` (`navigationConfig.ts`, `DetalleViaje.tsx`, `features/emergencias/afordancias.ts` y el resto del conteo de `design.md`).
- [x] 1.2 Crear `src/lib/permisos/` (`roles.ts`, `capacidades.ts`, `excepciones.ts`, `puede.ts`, `transiciones.ts`) con la matriz de `requirements.md`. Las filas `P` entran como capacidad **sin cambiar el comportamiento actual** hasta resolverse.
- [x] 1.3 Convertir `puedeArmarRoster`, `puedeUsarMonitoreo`, `puedeCerrar`, `puedeAdministrar`, `puedeCorregirIncidencia` y las afordancias de emergencias en adaptadores sobre `puede`. _(Quedó pendiente `puedeEscribirCatalogos`: pasa a `catalogos.escribir` en 14.1. `ROLES_CON_CARRIL` sigue como adaptador hasta M9.)_
- [x] 1.4 Página de inicio: `cotizacion` aterriza en la bandeja de solicitudes; revisar la de `administrador` (`getInitialRouteForRole`), según P-A. _(Administrador aterriza en el panel del JO, `cotizacion` en `/solicitudes`, que es un stub marcado `BRECHA-UI` hasta M14.)_
- [x]* 1.5 Prueba de tabla: cada capacidad × los ocho roles internos; rol sintético sin capacidades; ADM en toda capacidad o en excepciones.
- [x]* 1.6 Prueba de transiciones: todo destino ofrecido tiene capacidad; los `disparador: cliente` no se ofrecen.
- [x] 1.7 Cierre de M0.

## 2. M1: Navegación y acceso por URL (Requirement 2)

- [x] 2.1 Ciclo a y b del menú y de las guardas de ruta (`routes/_private/*`).
- [x] 2.2 Decidir si `tokenStore` permite `beforeLoad` por rol; si no, solo componente. _(Decidido: solo componente. `tokenStore.cargar()` sí expone `usuario.rol`, pero la regla pide mostrar "sin permiso" sin redirigir.)_
- [x] 2.3 Crear `RequiereCapacidad` y `SinPermiso` (con `EmptyState`).
- [x] 2.4 Reescribir `NAV_ITEMS` a un solo modelo con capacidad; retirar `ocultarPara`. Catálogos para JO (lectura), COO y ADM; Reportes para MON, SUP, COO y ADM; `cotizacion` no ve ninguno. _(Se agregó "Panel" para JO y ADM, y "Solicitudes" para JO, ADM y `cotizacion`.)_
- [x] 2.5 Envolver con `RequiereCapacidad` las rutas de la matriz M1 (`/roster`, `/administracion`, `/jefe-operativo/panel`, `/monitoreo/dashboard`, `/viajes/crear`, `/viajes/$id/{ficha,expediente,historico}`, y `/viajes` y `/viajes/$id` para EJE y REA).
- [x] 2.6 Mocks: sesión demo para los ocho roles. _(Los ocho roles internos tienen cuenta demo.)_
- [x]* 2.7 Pruebas: menú por rol (incluido `cotizacion`) y URL directa por rol restringido, sin cerrar sesión (E7, E14). _(Incluye `cotizacion`, escenario E14.)_
- [x] 2.8 Cierre de M1.

## 3. M2: Bandeja de viajes (Requirement 3; requiere 0.3)

- [x] 3.1 Ciclo a y b de `BandejaViajes.tsx` y su filtro de estados.
- [x] 3.2 Columnas Cliente y Escolta con `cliente` y `unidades`; respaldo al `id` y "sin escolta".
- [x] 3.3 Filtro de estado desde el enum generado; sin función por rol (el pin `.46` ya no tiene estados previos a `APROBADO`). _(Ya salía del enum generado; no había función por rol.)_
- [x] 3.4 `lib/api/alcance.ts`: `obtenerMiAlcance`; hook `useMiAlcance` que solo se invoca con lista vacía y rol con `alcance.leerPropio`.
- [x] 3.5 `EmptyState` que distingue "sin clientes asignados" de "sin viajes" (E11, E12); JO y ADM siempre "sin viajes".
- [x] 3.6 Botón "Crear viaje" por `viaje.crear`.
- [x] 3.7 Mocks: `listarViajes` con filtro por "mis clientes", `403` para EJE y REA, `obtenerMiAlcance`. _(`autorizarMock` lee el rol del token y usa la política. `CLIENTES_EFECTIVOS_DEMO` define el alcance; los viajes semilla traen `cliente_id`; versión del almacén 3.)_
- [x]* 3.8 Pruebas de columnas, vacíos por rol, `403` y llamadas que no deben ocurrir (propiedad 5).
- [x] 3.9 Cierre de M2.

## 4. M3: Crear viaje (Requirement 4)

- [ ] 4.1 Ciclo a y b de `CrearViaje.tsx` y `useCrearViaje`.
- [ ] 4.2 Habilitar a ADM; ADM carga clientes con `listarClientes` (decisión del Lead 3).
- [ ] 4.3 Manejo de `403` y `404` según Requirement T2.
- [ ]* 4.4 Pruebas con JO y ADM (feliz) y MON (negativa).
- [ ] 4.5 Cierre de M3.

## 5. M4: Detalle del viaje (Requirement 5)

- [ ] 5.1 Ciclo a y b de `DetalleViaje.tsx` (hoy solo filtra `CERRADO` por rol) y `NavegacionViaje.tsx`.
- [ ] 5.2 Filtrar `d.acciones` con `capacidadDeTransicion` y `puede`.
- [ ] 5.3 Aplicar capacidades a ETA, botón de emergencia (incluye ADM) y pestañas. Retirar de la UI aprobar, rechazar y la fecha previa a aprobar (pasan a M14).
- [ ] 5.4 `completarFechaHora` solo para JO y ADM; SUP y COO no (confirmado por el Lead).
- [ ] 5.5 Errores: `404` = "viaje no encontrado", `403` = "sin permiso"; corregir el copy "rol o alcance"; `Toast` en acciones.
- [ ]* 5.6 Pruebas por rol y estado (`APROBADO`, `ASIGNADO`, `EN_TRANSITO`, `EN_DESTINO`, terminal) con E1, E2, E5, E6 y E8. Regresiones de E8-T8, T10 y T14.
- [ ] 5.7 Cierre de M4.

## 6. M5: Ficha técnica (Requirement 6)

- [ ] 6.1 Ciclo a y b de `FichaTecnicaViaje.tsx`, `FichaEditor.tsx` y `useFichaTecnica`.
- [ ] 6.2 Montar los hooks de datos dentro de `RequiereCapacidad(viaje.ficha.ver)`: EJE y REA no piden `obtenerAsignacion` (E7).
- [ ] 6.3 Modo solo lectura para JO; edición con `viaje.ficha.editar` (incluye ADM).
- [ ]* 6.4 Pruebas: E3, E4 y E7. Regresión de E8-T12.
- [ ] 6.5 Cierre de M5.

## 7. M6: Histórico (Requirement 7)

- [ ] 7.1 Ciclo a y b de `features/viajes/historico`.
- [ ] 7.2 Capacidades en estadías, notas e incidencias; corrección de incidencias para SUP y COO.
- [ ] 7.3 JO en solo lectura de estadías e incidencias; resolver incidencia para SUP, COO y ADM.
- [ ]* 7.4 Pruebas por rol. Regresión de E8-T13.
- [ ] 7.5 Cierre de M6.

## 8. M7: Expediente y evidencia (Requirement 8)

- [ ] 8.1 Ciclo a y b de `EvidenciaViaje`, `ExpedienteViaje` y descarga.
- [ ] 8.2 Pestaña y acciones por `monitoreo.consultar`; `404` fuera de alcance como "no encontrado".
- [ ] 8.3 Fila "subir adjunto" con `monitoreo.consultar` (confirmado por el Lead).
- [ ]* 8.4 Pruebas por rol. Regresión de E8-T17.
- [ ] 8.5 Cierre de M7.

## 9. M8: Dashboard de monitoreo (Requirement 9)

- [ ] 9.1 Ciclo a y b.
- [ ] 9.2 Guarda con `monitoreo.dashboard`; sin filtro por cliente en el navegador.
- [ ]* 9.3 Pruebas por rol. Cierre de M8.

## 10. M9: Emergencias (Requirement 10)

- [ ] 10.1 Ciclo a y b de `features/emergencias` (afordancias, `PanelCaso`, `SeccionEmergenciasViaje`).
- [ ] 10.2 Menú "Emergencias" solo para REA, SUP y COO; carril del viaje para MON, SUP, COO y ADM.
- [ ] 10.3 Botón "activar" para MON, SUP, COO y ADM; `Toast` de sin permiso si el servidor responde `403` a ADM (BE-5).
- [ ] 10.4 Afordancias sobre `puede`; conservar la regla de estado y del responsable.
- [ ]* 10.5 Pruebas por rol y estado del caso (E13 y E16). Regresión de E8-T18.
- [ ] 10.6 Cierre de M9.

## 11. M10: Conversaciones (Requirement 11)

- [ ] 11.1 Ciclo a y b de `features/conversaciones`.
- [ ] 11.2 Bandeja de chat del viaje para EJE; SUP y COO en solo lectura, sin reclamar, responder, liberar, transferir ni marcar atendida.
- [ ] 11.3 ADM ve Conversaciones y opera como EJE (BE-6); estado "bandeja no disponible" ante `404`. Override (PM-008): sin botones.
- [ ]* 11.4 Pruebas por rol y `409`/`403` sin `onRetry`. Regresión de E8-T15.
- [ ] 11.5 Cierre de M10.

## 12. M11: Roster (Requirement 12; requiere 0.3)

- [ ] 12.1 Ciclo a y b de `features/roster`.
- [ ] 12.2 `fijarClientesSujeto` y `ClientesMonitoristas` (reemplaza `UnidadesMonitoristas` y `useUnidadesMonitoristas`); solo activos para agregar.
- [ ] 12.3 Clientes desactivados: marcados en la lista y fuera del payload (E10).
- [ ] 12.4 `UnidadForm`: campo opcional "Cliente al que sirve" con `null` para quitar; texto de que no define el alcance.
- [ ] 12.5 Errores `400`, `409 rol_sin_alcance` y rechazo por unidad con reserva.
- [ ] 12.6 Mocks de `fijarClientesSujeto` y `AlcanceSujeto` con `clientes_*`.
- [ ]* 12.7 Pruebas: E9, E10 y `409`. Cierre de M11.

## 13. M12: Administración (Requirement 13; requiere 0.3)

- [ ] 13.1 Ciclo a y b de `features/administracion` (incluye `AlcanceEditor`).
- [ ] 13.2 Selector de rol de nueve valores; `cotizacion` incluido.
- [ ] 13.3 `AlcanceEditor` migra de `opcionesUnidadesAlcance` a clientes, con los criterios 3 a 7 de Requirement 12.
- [ ]* 13.4 Pruebas. Regresión de E8-T19. Cierre de M12.

## 14. M13: Catálogos y Reportes (Requirement 14)

- [ ] 14.1 Ciclo a y b: Catálogos para JO (lectura), COO y ADM; escritura para COO y ADM, vehículos y custodios incluidos (`puedeEscribirCatalogos` hoy es solo ADM); mover las reglas a la política.
- [ ] 14.2 `403` por sección como "sin permiso".
- [ ] 14.3 Reportes sin cambio de roles; `cotizacion` no ve Catálogos ni Reportes.
- [ ]* 14.4 Pruebas. Cierre de M13.

## 15. M14: Solicitudes (Requirement 15; requiere `tracer.46`)

- [ ] 15.1 Tomar el alcance de E10-HU-035 a 038, E1-HU-003 v2 y las operaciones del BFF; se trabaja directo, sin esperar tarea E8.
- [ ] 15.2 Ciclo a y b del panel del Jefe Operativo (stub E8-T20) y de la aprobación actual (E8-T9).
- [ ] 15.3 Bandeja y detalle de solicitudes por capacidad; JO sin datos comerciales.
- [ ] 15.4 Acciones por rol: aprobar y rechazar (JO, ADM); cotizar, reprogramar y confirmar pago (COT, ADM); revertir pago (ADM).
- [ ] 15.5 Conversación de la solicitud (COT, ADM) y su bandeja.
- [ ] 15.6 Mocks de solicitudes con las guardas del contrato.
- [ ]* 15.7 Pruebas: E14 y E15. Cierre de M14.

## 16. Validación final

- [ ] 16.1 Typecheck, lint, suite completa en una sola ejecución, build con mocks.
- [ ] 16.2 Buscar en `src/` comparaciones `rol ===` y listas de roles fuera de `lib/permisos` (debe quedar solo lo declarado).
- [ ] 16.3 Checklist de PR de `ai27-tech-library-first` (sin `svg` ni colores nuevos; `Stack`, `Inline`, `Grid`; iconos de `lucide-react`).
- [ ] 16.4 Actualizar este spec con los avances reales. Marcar `alineacion-ui-roles-capacidades` como reemplazado.
- [ ] 16.5 Cerrar DT-24 en el repo de contexto: **lo registra el Lead**; este spec solo lo propone.

## Pendientes de definición dentro del spec

- **P-A. RESUELTA.** `administrador` aterriza en el panel del Jefe Operativo (decisión del usuario); `getInitialRouteForRole` no cambia. Falta solo la página de `cotizacion`, que entra con 0.3.
