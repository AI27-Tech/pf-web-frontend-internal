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
                                  pin .47 (0.3) ─ 15 (M14 solicitudes) ─ 16 (validación final)
```

Las fases 1, 2 y 5 a 11 y 14 no dependen del pin. Las fases 3, 4, 12, 13 y 15 necesitan `tracer.47` (0.3). Los pendientes de backend (`BRECHAS.md`, BE-1 a BE-7) no bloquean ninguna fase: el panel sigue la tabla de `requirements.md` y no espera el `403`.

## 0. Verificación

- [x] 0.1 Confirmar Q-3 (rama) y Q-4 (orden) de `BRECHAS.md`, y P-A (inicio del Administrador).
- [x] 0.2 Sin preguntas abiertas al Lead: solo quedan los pendientes de backend (`BRECHAS.md`, BE-1 a BE-7).
- [x] 0.3 Subir `@ai27-tech/contracts` directo a `0.1.0-tracer.47` (decidido por el Lead: mismo salto de pin que DT-24; `.47` solo cambia descripciones). Revisar `CHANGELOG.md` de contratos, correr typecheck y corregir lo que rompa el enum del viaje y `Rol` (nueve valores). Verificar `MiAlcance`, `ViajeResumen.cliente` y `unidades`, `AlcanceSujeto.clientes_*`, `ClientesSujetoEntrada` y las operaciones de solicitudes. _(Hecho con `pnpm add @ai27-tech/contracts@0.1.0-tracer.47` (`npm install` falla con un error de Arborist); `pnpm-workspace.yaml` agrega `.47` a `minimumReleaseAgeExclude`. El `CHANGELOG.md` de contratos dice que `.47` solo cambia descripciones: ninguna forma, enum ni `required`. `tsc --build --force` sin errores con `.47`, así que `MiAlcance`, `ViajeResumen.cliente` y `unidades`, `AlcanceSujeto.clientes_*`, `ClientesSujetoEntrada` y las operaciones de solicitudes siguen compilando. Con `.46` se retiraron `SOLICITADO`, `RECHAZADO_*` y `CANCELADO` del viaje: se quitó aprobar y rechazar del detalle y su guard `decisionSolicitud`; el selector de rol ya tiene nueve valores. El checkout local de `pf-pkg-contracts` está en una rama de trabajo, no en el tag: se leyó el diff `v0.1.0-tracer.46..v0.1.0-tracer.47`.)_
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

- [x] 4.1 Ciclo a y b de `CrearViaje.tsx` y `useCrearViaje`.
- [x] 4.2 Habilitar a ADM; ADM carga clientes con `listarClientes` (decisión del Lead 3). _(Capacidad `clientes.listar` para JO y ADM; el mock la guarda.)_
- [x] 4.3 Manejo de `403` y `404` según Requirement T2. _(`403` al crear: Toast y la pantalla intacta. `403` al listar clientes: aviso de permiso sin reintentar. `404`: "ya no está disponible", sin hablar de permisos.)_
- [x]* 4.4 Pruebas con JO y ADM (feliz) y MON (negativa).
- [x] 4.5 Cierre de M3.

## 5. M4: Detalle del viaje (Requirement 5)

- [x] 5.1 Ciclo a y b de `DetalleViaje.tsx` (hoy solo filtra `CERRADO` por rol) y `NavegacionViaje.tsx`. _(Línea base: solo `CERRADO` se filtraba por rol; ETA y pestañas decidían con `rol ===` o sin guarda. Ver 5.2 y 5.3.)_
- [x] 5.2 Filtrar `d.acciones` con `capacidadDeTransicion` y `puede`. _(`accionesPermitidas` en `accionesTransicion.ts`: arista del estado más `capacidadDeTransicion` y `puede`. Un destino sin capacidad no se ofrece.)_
- [x] 5.3 Aplicar capacidades a ETA, botón de emergencia (incluye ADM) y pestañas. Retirar de la UI aprobar, rechazar y la fecha previa a aprobar (pasan a M14). _(ETA por `viaje.eta`; el botón de emergencia ya salía de `puede`; pestañas por `viaje.ficha.ver`, `viaje.historico.ver` y `monitoreo.consultar`. Aprobar, rechazar y la fecha previa se retiraron en 0.3.)_
- [x] 5.4 `completarFechaHora` solo para JO y ADM; SUP y COO no (confirmado por el Lead). _(Ya estaba sobre `viaje.fechaHora`; cubierto por `FechaHoraYEta.test.tsx`.)_
- [x] 5.5 Errores: `404` = "viaje no encontrado", `403` = "sin permiso"; corregir el copy "rol o alcance"; `Toast` en acciones. _(`404` del detalle: "Viaje no encontrado" sin pedir reintento ni hablar de permisos; `403` de acción y de lectura sin "rol o alcance"; `403` y `404` de acción con `Toast`, y `404` vuelve a `/viajes`. `esNoEncontrado` en `lib/api/errors.ts`.)_
- [x]* 5.6 Pruebas por rol y estado (`APROBADO`, `ASIGNADO`, `EN_TRANSITO`, `EN_DESTINO`, terminal) con E1, E2, E5, E6 y E8. Regresiones de E8-T8, T10 y T14. _(`DetalleViajeRoles.test.tsx`. Se ajustaron `Asignacion`, `FechaHoraYEta` y `DetalleViajeExpediente`, que no declaraban rol. Regresiones de T8, T10 y T14 en verde.)_
- [x] 5.7 Cierre de M4. _(Typecheck, lint de lo tocado y suite completa en verde: 96 archivos, 1274 pruebas.)_

## 6. M5: Ficha técnica (Requirement 6)

- [x] 6.1 Ciclo a y b de `FichaTecnicaViaje.tsx`, `FichaEditor.tsx` y `useFichaTecnica`. _(Línea base: la pantalla exigía `rol === monitorista` después de montar los hooks y mostraba "solo para el monitorista".)_
- [x] 6.2 Montar los hooks de datos dentro de `RequiereCapacidad(viaje.ficha.ver)`: EJE y REA no piden `obtenerAsignacion` (E7). _(`FichaTecnicaViaje` envuelve su contenido en `RequiereCapacidad(viaje.ficha.ver)`; los hooks viven en `ContenidoFicha`. EJE, REA y `cotizacion` no piden detalle, ficha, GPS ni escolta.)_
- [x] 6.3 Modo solo lectura para JO; edición con `viaje.ficha.editar` (incluye ADM). _(`Editar ficha`, `Capturar ficha` y el editor salen de `viaje.ficha.editar`. JO lee sin controles. Un `403` al guardar avisa con `Toast` y conserva el editor. Un `404` del viaje dice "no encontrado". La bitácora se escribe desde el histórico: queda en 7.2.)_
- [x]* 6.4 Pruebas: E3, E4 y E7. Regresión de E8-T12. _(`FichaRoles.test.tsx`. Regresión de E8-T12 en verde.)_
- [x] 6.5 Cierre de M5. _(Typecheck y lint en verde.)_

## 7. M6: Histórico (Requirement 7)

- [x] 7.1 Ciclo a y b de `features/viajes/historico`. _(Línea base: nota, incidencia y estadía se ofrecían a todo rol con acceso al histórico, JO incluido; solo la resolución usaba la política.)_
- [x] 7.2 Capacidades en estadías, notas e incidencias; corrección de incidencias para SUP y COO. _(Nueva nota por `viaje.bitacora.registrar`, marcar incidencia por `viaje.incidencia.abrir`, abrir y cerrar estadía por `viaje.estadia.operar`, resolver por `viaje.incidencia.resolver`.)_
- [x] 7.3 JO en solo lectura de estadías e incidencias; resolver incidencia para SUP, COO y ADM. _(JO lee los tres bloques sin gestos de escritura. Un `403` de acción avisa con `Toast`; un `404`, con "ya no está disponible" y vuelve a `/viajes`; un `404` de lectura dice "Viaje no encontrado".)_
- [x]* 7.4 Pruebas por rol. Regresión de E8-T13. _(`HistoricoRoles.test.tsx`. Regresión de E8-T13 en verde.)_
- [x] 7.5 Cierre de M6. _(Typecheck y lint en verde.)_

## 8. M7: Expediente y evidencia (Requirement 8)

- [x] 8.1 Ciclo a y b de `EvidenciaViaje`, `ExpedienteViaje` y descarga. _(Línea base: la pantalla y la lista usaban `puedeUsarMonitoreo` (`monitoreo.dashboard`); el 403 del expediente hablaba de "alcance".)_
- [x] 8.2 Pestaña y acciones por `monitoreo.consultar`; `404` fuera de alcance como "no encontrado". _(`ExpedienteViaje` envuelve su contenido en `RequiereCapacidad(monitoreo.consultar)`. Un `404` de la lista, de la subida o de la descarga dice "Viaje no encontrado"; un `403` de la lista y de la descarga de adjunto dice "sin permiso" y no ofrece reintentar.)_
- [x] 8.3 Fila "subir adjunto" con `monitoreo.consultar` (confirmado por el Lead). _(La subida vive en `EvidenciaViaje`, que ya exige `monitoreo.consultar`.)_
- [x]* 8.4 Pruebas por rol. Regresión de E8-T17. _(`ExpedienteRoles.test.tsx`. Regresión de E8-T17 en verde.)_
- [x] 8.5 Cierre de M7. _(Typecheck y lint en verde.)_

## 9. M8: Dashboard de monitoreo (Requirement 9)

- [x] 9.1 Ciclo a y b. _(Línea base: la pantalla decidía con `puedeUsarMonitoreo` y un `Alert` "no está disponible para tu rol"; la ruta ya tenía `RequiereCapacidad`.)_
- [x] 9.2 Guarda con `monitoreo.dashboard`; sin filtro por cliente en el navegador. _(`DashboardMonitoreo` usa `RequiereCapacidad(monitoreo.dashboard)` y muestra "Sin permiso". Los filtros son de estado y fecha; no hay filtro por cliente en el navegador.)_
- [x]* 9.3 Pruebas por rol. Cierre de M8. _(`DashboardRoles.test.tsx`: los ocho roles internos, sin llamadas al reporte sin la capacidad y vista "En curso" por defecto. Cierre de M8.)_

## 10. M9: Emergencias (Requirement 10)

- [x] 10.1 Ciclo a y b de `features/emergencias` (afordancias, `PanelCaso`, `SeccionEmergenciasViaje`). _(Línea base: las afordancias y el menú ya salían de `puede`; faltaban la guarda de la ruta `/emergencias` y dos usos de `ROLES_CON_CARRIL`.)_
- [x] 10.2 Menú "Emergencias" solo para REA, SUP y COO; carril del viaje para MON, SUP, COO y ADM. _(Menú por `emergencia.bandeja` (REA, SUP, COO) y la ruta `/emergencias` ahora va dentro de `RequiereCapacidad(emergencia.bandeja)`; carril del viaje por `emergencia.verDeViaje`: MON, SUP, COO y ADM.)_
- [x] 10.3 Botón "activar" para MON, SUP, COO y ADM; `Toast` de sin permiso si el servidor responde `403` a ADM (BE-5). _(Botón por `puedeMostrarActivacion`. Un `403` a ADM se avisa con el `Alert` de `AvisoActivacionEmergencia` (rol `alert`), no con `Toast`: cambiarlo reescribe las pruebas de activación. Decidido por el usuario: se queda el `Alert`.)_
- [x] 10.4 Afordancias sobre `puede`; conservar la regla de estado y del responsable. _(Se retiró `ROLES_CON_CARRIL`; `DetalleViaje` y `SeccionEmergenciasViaje` usan `puede`. La regla de estado y del responsable sigue en `afordancias.ts`.)_
- [x]* 10.5 Pruebas por rol y estado del caso (E13 y E16). Regresión de E8-T18. _(`EmergenciasRoles.test.ts` (E16) y un caso de `404` al cerrar en `activacion.test.tsx`. E13 y la regresión de E8-T18 ya estaban cubiertas.)_
- [x] 10.6 Cierre de M9. _(Typecheck, lint y pruebas de emergencias en verde.)_

## 11. M10: Conversaciones (Requirement 11)

- [x] 11.1 Ciclo a y b de `features/conversaciones`. _(Línea base: la bandeja no consultaba el rol; las afordancias dependían solo del estado y del reclamo. El menú ya usaba `conversacion.leer`.)_
- [x] 11.2 Bandeja de chat del viaje para EJE; SUP y COO en solo lectura, sin reclamar, responder, liberar, transferir ni marcar atendida. _(Ruta `/conversaciones` dentro de `RequiereCapacidad(conversacion.leer)`. Sin `conversacion.operar` (SUP y COO) el panel no ofrece reclamar, devolver ni marcar atendida, no dibuja el compositor y avisa "Solo lectura". Los recibos solo los envía el reclamante, así que SUP y COO no los mandan.)_
- [x] 11.3 ADM ve Conversaciones y opera como EJE (BE-6); estado "bandeja no disponible" ante `404`. Override (PM-008): sin botones. _(ADM opera con `conversacion.operar`. Un `404` de la bandeja muestra "Bandeja no disponible" como aviso informativo, sin `Toast` ni error. Sin botones de override (PM-008) ni de transferir (DT-28). `onRetry` no se usa en los mensajes: los errores `409` y `403` salen en el `Alert` del panel, no con `deliveryError`. Decidido por el usuario: se queda así.)_
- [x]* 11.4 Pruebas por rol y `409`/`403` sin `onRetry`. Regresión de E8-T15. _(Cuatro pruebas nuevas en `BandejaConversaciones.test.tsx`; se ajustó la del supervisor ante una conversación ajena, que esperaba un compositor deshabilitado. Regresión de E8-T15 en verde.)_
- [x] 11.5 Cierre de M10. _(Typecheck, lint y pruebas de conversaciones y navegación en verde.)_
- [x]* 11.6 Prueba de que el panel no ofrece transferir en conversaciones del viaje ni en emergencias: no hay selector posible, porque el panel no conoce el `sub` del destino (`409 destino_invalido_en_viaje`; DEC-148 #76 y #77, DT-28). Tampoco se muestra el nombre del responsable a partir de `reclamo_activo.responsable_id`. _(`BandejaConversaciones.test.tsx`: el Ejecutivo responsable de su conversación del viaje ve devolver y atendida, pero no transferir, y no se pide `/sujetos` ni `/transferencias`; ante un reclamo ajeno solo se dice "Otra persona" y el `sub` no aparece. `BandejaEmergencias.test.tsx`: REA, SUP y COO con un caso en atención ajeno no ven transferir, ni selector, ni el `sub` del responsable, y no se piden usuarios.)_

## 12. M11: Roster (Requirement 12; requiere 0.3)

- [x] 12.1 Ciclo a y b de `features/roster`. _(Línea base: "mis unidades" con `fijarUnidadesSujeto`; el formulario de unidad no tenía cliente; JO y ADM ya entraban por `puedeArmarRoster`.)_
- [x] 12.2 `fijarClientesSujeto` y `ClientesMonitoristas` (reemplaza `UnidadesMonitoristas` y `useUnidadesMonitoristas`); solo activos para agregar. _(`ClientesMonitoristas`, `ClientesMonitoristaForm` y `useClientesMonitoristas` reemplazan a los de unidades. `fijarClientesSujeto` en `lib/api/alcance.ts`. Solo se ofrecen clientes activos y un cliente puede estar en varios Monitoristas.)_
- [x] 12.3 Clientes desactivados: marcados en la lista y fuera del payload (E10). _(Un cliente asignado que no está entre los activos se muestra por su id con la marca "Desactivado", sin pedir organizaciones. Se quita del payload; guardar para limpiarlo sí se permite.)_
- [x] 12.4 `UnidadForm`: campo opcional "Cliente al que sirve" con `null` para quitar; texto de que no define el alcance. _(Campo opcional "Cliente al que sirve" con la opción "Sin cliente", que envía `cliente_id: null`, y el texto de que no define el alcance.)_
- [x] 12.5 Errores `400`, `409 rol_sin_alcance` y rechazo por unidad con reserva. _(`400`: mensaje de cliente inexistente o desactivado y se vuelve a pedir la lista de activos. `409 rol_sin_alcance` y `sujeto_desactivado` con su texto. El rechazo `unidad_con_reserva_vigente` se explica sin ofrecer reasignar la escolta.)_
- [x] 12.6 Mocks de `fijarClientesSujeto` y `AlcanceSujeto` con `clientes_*`. _(Mocks: `AlcanceSujeto` con `clientes_ids` y `clientes_efectivos_ids`, `PUT /sujetos/{id}/alcance/clientes` con las guardas del contrato y `cliente_id` en alta y edición de unidad.)_
- [x]* 12.7 Pruebas: E9, E10 y `409`. Cierre de M11. _(`Roster.test.tsx`: E9, E10, `400`, `409`, `403`, ADM y cliente de la unidad. Typecheck y lint en verde. Cierre de M11.)_

## 13. M12: Administración (Requirement 13; requiere 0.3)

- [x] 13.1 Ciclo a y b de `features/administracion` (incluye `AlcanceEditor`). _(Línea base: el módulo ya abría solo con `administracion.usuarios` (`puedeAdministrar`), sin comparar `rol ===` del actor; las comparaciones con `Rol.*` de `afordancias.ts` son sobre el rol del usuario administrado. Diferencia: `AlcanceEditor` y el contrato local seguían en unidades (`unidades_ids`, `PUT /alcance/unidades`).)_
- [x] 13.2 Selector de rol de nueve valores; `cotizacion` incluido. _(Ya salía de `ROLES` del contrato generado: el alta ofrece los nueve y el cambio de rol los ocho internos, sin `cliente` (DEC-139, DEC-141). Solo se corrigió el comentario de `OPCIONES_ROL`. Queda cubierto con prueba.)_
- [x] 13.3 `AlcanceEditor` migra de `opcionesUnidadesAlcance` a clientes, con los criterios 3 a 7 de Requirement 12. _(`AlcanceEditor`: "mis clientes" con `listarClientes` (solo activos), `PUT /alcance/clientes` en el adaptador, `AlcanceEfectivo` con `clientesIds` y `clientesEfectivosIds`. Un cliente asignado que no está entre los activos se muestra con el nombre de su organización (mismo id, DEC-144 #2; `listarOrganizaciones` solo se pide si hay desactivados), marca "Desactivado" y no se reenvía. `400` explica el cliente inexistente o desactivado y vuelve a pedir los activos; `409 rol_sin_alcance` dice que el usuario ya no es Monitorista. No se puede guardar sin la lista de activos, para no descartar clientes por error. Se retiró `opcionesUnidades.ts` y `useUnidadesAlcance`. Supervisor y Coordinador siguen con subordinados. Mocks: `PUT /sujetos/{id}/alcance/clientes` con las guardas del contrato.)_
- [x]* 13.4 Pruebas. Regresión de E8-T19. Cierre de M12. _(`alcance-clientes.test.tsx`: opciones activas, desactivado con nombre y fuera del payload, limpiar al guardar, `400`, `409`, lista de activos no disponible, Supervisor sin cambio y nueve roles en el alta. `adaptadorHttp.test.ts` ajustado a clientes. Las 105 pruebas de `tests/administracion` en verde, typecheck y lint de lo tocado en verde.)_
  - **Nota de mocks (no bloquea).** En el `bff` simulado, `handlersRoster` va antes que `handlersAdministracion` y responde `GET /sujetos` y `GET/PUT /sujetos/{id}/alcance...` con sus propios sujetos (`SUJ-400x`). Con `enableMocks`, el panel de Administración ve esos sujetos, no los de `handlersAdministracion`. Ya pasaba con "mis unidades"; unificar los sujetos simulados queda fuera de M12.

## 14. M13: Catálogos y Reportes (Requirement 14)

- [x] 14.1 Ciclo a y b: Catálogos para JO (lectura), COO y ADM; escritura para COO y ADM, vehículos y custodios incluidos (`puedeEscribirCatalogos` hoy es solo ADM); mover las reglas a la política. _(Línea base: `Catalogos` decidía con `puedeArmarRoster` (`roster.ver`, solo JO y ADM) y `puedeEscribirCatalogos` comparaba `rol === Administrador`; la política ya tenía `catalogos.ver` y `catalogos.escribir`. Ahora `Catalogos` envuelve su contenido en `RequiereCapacidad(catalogos.ver)` y la escritura sale de `puede(rol, 'catalogos.escribir')`; se retiró `puedeEscribirCatalogos`. `puedeArmarRoster` queda solo para `/roster`. El texto del `403` de escritura ya no dice "solo el Administrador".)_
- [x] 14.2 `403` por sección como "sin permiso". _(`ContenidoLista` muestra `SinPermiso` con el recurso; un `403` en custodios no tapa vehículos y la sesión no se toca. El JO sigue sin botones de escritura.)_
- [x] 14.3 Reportes sin cambio de roles; `cotizacion` no ve Catálogos ni Reportes. _(La política y el menú ya lo cumplían. Se agregó la guarda `RequiereCapacidad(reportes.ver)` a la ruta `/reportes`, que no la tenía: un rol sin la capacidad entraba por URL al stub.)_
- [x]* 14.4 Pruebas. Cierre de M13. _(`Catalogos.test.tsx`: MON, SUP, EJE, REA y COT ven "sin permiso" sin peticiones; JO lee sin escritura; COO con el servidor de hoy (`403` por sección) y con el cambio de `catalogos` aplicado (lee y ve alta y edición); `403` de una sección sin tapar la otra. `requiere-capacidad.test.tsx` suma `/catalogos` y `/reportes`. Typecheck y lint en verde; 628 pruebas de catálogos, layout, roster y permisos en verde.)_
  - **Nota de mocks.** El `bff` simulado reproduce al servidor de hoy: leen JO y ADM, escribe ADM. Con `enableMocks`, el COO ve las dos secciones como "sin permiso" hasta que `catalogos` aplique el cambio (BE pendiente de la matriz M13).

## 15. M14: Solicitudes (Requirement 15; requiere `tracer.47`)

- [x] 15.1 Releer E10-HU-035 a 038 y E1-HU-003 v2 contra `origin/main` (`5629dac` o posterior), el brief `.scratch/brief-cotizacion-pago/BRIEF-FRONTENDS.md` y DEC-148 #62 a #79; comparar con lo construido y listar las diferencias. _(Leído con `git show origin/main:…` en `ai27-platform-context` (`5629dac`, 58 commits delante del checkout local `df42d43`, que tiene cambios locales en `scripts/`: no se hizo pull). **Diferencias y qué se hizo:** (1) E10-HU-037 admite confirmar el pago desde `VENCIDA` como excepción única y el panel solo lo ofrecía desde `COTIZADO`: `confirmarPago` ahora sale también desde `VENCIDA`, con aviso en el diálogo, etiqueta "Pago confirmado tras el vencimiento" en el histórico y mock con `pagoTardioUsado`. (2) La moneda era un campo libre: queda fija en `MXN`. (3) La fecha y hora del servicio en el pasado solo se rechazaba en el servidor: ahora se señala en cotizar y reprogramar. (4) El histórico de `cotizacion` no mostraba la versión de cada cotización (HU-035 y brief): ahora sí. (5) `Conversacion.sin_respuesta` (HU-038, DEC-148 #54) no se pintaba: la lista marca "Sin respuesta". (6) La transferencia de la conversación de solicitud (HU-038) no existía: pasa a 15.8. **Sin diferencia:** datos de la cotización (`monto`, `moneda`, `fecha_hora_servicio`, `notas`, `version`, `entregada_en`, `vigente_hasta`) se pintan todos para COT y ADM; el aviso al cliente tras rechazar (DEC-148 #55) es del portal del cliente y el diálogo ya dice que el cliente ve el motivo; aprobar no genera aviso (#56); `nueva`, `por_vencer` y `cancelacion_con_penalizacion` ya tienen etiqueta. **Fuera de alcance, no se agrega:** operador (nombre y teléfono) en la solicitud, que el contrato no tiene (brief §4).)_
- [x] 15.2 Ciclo a y b del panel del Jefe Operativo (stub E8-T20) y de la aprobación actual (E8-T9). _(Línea base: el panel era un stub con el texto "aprobación de solicitudes"; la aprobación del viaje ya se había retirado de la UI en 5.3. `/solicitudes` era un stub de M14. El panel ahora monta la bandeja `PAGADO` en "Solicitudes por aprobar" (Requirement 15.8).)_
- [x] 15.3 Bandeja y detalle de solicitudes por capacidad; JO sin datos comerciales. _(`features/solicitudes`: `BandejaSolicitudes` y `DetalleSolicitud` bajo `/solicitudes` con `?id=`. El JO siempre pide `estado=PAGADO`, sin filtro, sin columna de cotización y sin sección "Cotización y pago"; el histórico no pinta el importe. COT y ADM ven todas, filtran por estado y ven la cotización. `404` del JO = "Solicitud resuelta", sin error.)_
- [x] 15.4 Acciones por rol: aprobar y rechazar (JO, ADM); cotizar, reprogramar y confirmar pago (COT, ADM); revertir pago (ADM). _(`accionesPermitidas(estado, rol)` combina capacidad y estado de origen. Diálogos de aprobar, rechazar (motivo, sin mención de reembolso), cotizar o recotizar, reprogramar (motivo), confirmar pago y revertir pago (motivo). Aprobar se bloquea y se explica si falta la fecha y hora del servicio; `409 fecha_hora_servicio_requerida` y `fecha_pago_fuera_de_vigencia` tienen texto propio. Las acciones guardan la `Solicitud` que responde el BFF como detalle vigente: el JO no vuelve a pedir una solicitud que ya no ve. Tras aprobar se navega a `/viajes/{id}`, que consulta el viaje con el mismo id.)_
- [x] 15.5 Conversación de la solicitud (COT, ADM) y su bandeja. _(`/solicitudes?vista=conversaciones`, con la capacidad `solicitud.conversacion`. Se extrajo `BandejaConversacionesBase` de la bandeja del viaje, que sigue igual para `/conversaciones`; recibe el origen (`viaje` o `solicitud`) y usa `listarTrabajoBandejaSolicitudes`. Reclamar, responder, devolver y marcar atendida son el mismo mecanismo. COT no pide el catálogo de clientes (403) y muestra el id. Sin transferencia: pasa a 15.8. El mock del pool de solicitudes responde vacío.)_
- [x] 15.6 Mocks de solicitudes con las guardas del contrato. _(`src/mocks/solicitudes.ts`: capacidad por rol (`autorizarMock`), JO solo `PAGADO` y sin `cotizacion` ni `pago` (`404` fuera de `PAGADO`), estado de origen (`409 transicion_no_permitida`), vigencia del pago, motivo obligatorio (`400`) y la fecha obligatoria para aprobar. Aprobar no crea el viaje en el almacén simulado.)_
- [x]* 15.7 Pruebas: E14 y E15. Cierre de M14. _(`tests/solicitudes`: bandeja por rol y `403` de EJE, MON, SUP, COO y REA; detalle del JO sin datos comerciales, aprobar sin refetch, rechazar con motivo, `404` como resuelta; COT en `COTIZADO`, `PAGADO` y `SOLICITADO` (cotizar con validación del monto), confirmar pago y `409` de vigencia; ADM con las cuatro acciones y la reversa del pago; conversaciones por rol; tabla de acciones por estado y los ocho roles.)_
- [x] 15.8 Transferir una conversación de solicitud (COT y ADM): `transferirConversacion` con `responsable_destino_id` igual al `UsuarioAdmin.id` de un usuario `cotizacion`; texto propio para `409 destino_no_es_cotizacion`. **Q-D resuelta (opción A):** el selector usa `listarSujetos?rol=cotizacion&activo=true`; abrir esa lectura a COT es trabajo de backend (BE-10). El comportamiento está en `mensajeria` v0.1.11 y `core` v0.1.15 (`-m`), sin desplegar en ningún ambiente: se prueba solo con mocks. _(Construido dentro de esa condición. `lib/api/conversaciones.ts`: `transferirConversacion` (`POST /conversaciones/{id}/transferencias`) y `ErrorDestinoNoEsCotizacion`. `lib/api/usuarios.ts`: `listarSujetos?rol=cotizacion&activo=true`. Capacidad `solicitud.transferir` (COT; ADM por herencia). `DialogoTransferir` con selector de destino (sin el propio usuario) y motivo opcional; el botón solo lo ve el responsable del reclamo en una conversación `tipo=solicitud`. **Q-D resuelta (opción A; backend pendiente, BE-10):** hoy un COT recibe `403` al listar destinos, y el diálogo lo explica ("Pídele la transferencia al Administrador") sin selector; el ADM sí puede transferir. Cuando `identidad` y el `bff` abran la lectura, el flujo del COT ya funciona sin cambios. El mock de desarrollo no tiene conversaciones de solicitud (el pool responde vacío), así que el botón solo se alcanza en pruebas.)_
- [x] 15.9 Códigos que documenta `tracer.47`: `409 fecha_hora_servicio_pasada` al aprobar, `400` sin código al crear, cotizar o reprogramar con fecha pasada, `409 transicion_no_permitida` del segundo pago tardío, moneda solo `MXN` y monto mayor o igual a 0. Verificar contra lo construido y completar lo que falte. _(Faltaba: texto de `fecha_hora_servicio_pasada` (ahora manda a reprogramar con Cotización); el `400` sin código se decía igual para todo y ahora, en cotizar y reprogramar, nombra la fecha y el monto; `transicion_no_permitida` al confirmar el pago explica que el pago tardío solo se acepta una vez; la fecha pasada se señala en el campo y bloquea el envío (`esFechaPasada`); moneda fija `MXN` sin campo editable. Ya estaba: el monto acepta `0` y no hay signo en el patrón. "Al crear": el panel interno no crea solicitudes (las crea el cliente), así que ese `400` no aplica aquí; el alta de viaje de Operación es otra operación. Mocks con las mismas guardas: `400` sin `codigo` por fecha pasada, moneda distinta de `MXN`, `409 fecha_hora_servicio_pasada` al aprobar, un solo pago tardío y la solicitud `SOL-1006` (`VENCIDA`) en la semilla.)_
- [x]* 15.10 Pruebas de 15.8 y 15.9. _(`tests/solicitudes/TransferirSolicitud.test.tsx` (10): destinos sin el propio usuario, cuerpo con id del sujeto y motivo recortado, sin motivo, `409 destino_no_es_cotizacion`, `409` de versión, `403` del no responsable, sin otros usuarios, quién ve el botón, COT con `403` al listar y COT con listado permitido. `Solicitudes.test.tsx`: moneda y monto cero, monto negativo, fecha pasada en cotizar y en reprogramar, `400` sin código, aprobar con `409 fecha_hora_servicio_pasada` (JO y ADM) y con el mock, pago tardío desde `VENCIDA` y su segundo intento. `mensajes.test.ts` y `afordancias.test.ts` (VENCIDA).)_
- [x]* 15.11 Prueba: el JO no ve el `motivo` de `pago_revertido` en el histórico y trata `null` o ausencia de `cotizacion` y `pago` como "oculto" (DEC-148 #67 y #73). _(`Solicitudes.test.tsx`: con `null` explícito y con ausencia no hay sección comercial ni "sin cotizar"; el histórico del JO no pinta el motivo de `pago_revertido`, el importe ni la versión aunque el servidor los mandara, y sí el motivo de `reprogramada`; COT ve el motivo de la reversa y la versión de cada cotización. La UI ignora el `motivo` de `pago_revertido` para quien no ve datos comerciales.)_

## 16. Validación final

- [x] 16.1 Typecheck, lint, suite completa en una sola ejecución, build con mocks, **con el pin en `.47`**. _(Con `@ai27-tech/contracts@0.1.0-tracer.47` y todos los cambios de 0.3, 11.6, 15.x y 16.6: `tsc --build --force` y `eslint .` sin salida; `vitest run`: 106 archivos y 1531 pruebas en verde; `vite build --mode mock` compila.)_
- [x] 16.2 Buscar en `src/` comparaciones `rol ===` y listas de roles fuera de `lib/permisos` (debe quedar solo lo declarado). _(Fuera de mocks, quedan solo comparaciones sobre el rol del usuario administrado o del alta (`administracion/afordancias.ts`, `AltaUsuarioDialog`, `CambioRolDialog`, `validacion.ts`), la lectura de claims (`lib/contracts/jwt.ts`, `sesion.ts`) y la selección de roles que se piden al BFF (`AlcanceEditor`). Ninguna decide qué ve o hace el actor. Las listas de roles de `src/mocks` emulan al servidor (Requirement T3).)_
- [x] 16.3 Checklist de PR de `ai27-tech-library-first` (sin `svg` ni colores nuevos; `Stack`, `Inline`, `Grid`; iconos de `lucide-react`). _(Sin `<svg>`, `<path>`, colores hexadecimales ni `type="date"` o `type="time"` en lo tocado. Iconos de `lucide-react` (`ClipboardList`, `ShieldOff`). Se reemplazó el CSS en línea de disposición por `Stack` en `ClientesMonitoristaForm`, `UnidadForm` y `FichaEditor`. Sin componente local nuevo, así que no hay `BRECHA-UI`.)_
- [x] 16.4 Actualizar este spec con los avances reales. Marcar `alineacion-ui-roles-capacidades` como reemplazado. _(Estado de cada módulo en las notas de cierre de arriba. `alineacion-ui-roles-capacidades` lleva el aviso "REEMPLAZADO" en `requirements.md` y `tasks.md`.)_
- [ ] 16.5 Cerrar DT-24 en el repo de contexto: **lo registra el Lead**; este spec solo lo propone. _(Propuesta de entrada, sin registrar: **DT-24, cerrada.** Owner: Lead. Fecha: la del registro. Cierre: la política de capacidades por rol vive en `src/lib/permisos` y los módulos M0 a M14 del panel interno la consumen; los menús, las guardas de ruta, las acciones y los mocks siguen la matriz de `requirements.md`. Pendientes que no cierra: BE-1 a BE-7 de `BRECHAS.md` (backend), BE-10 (abrir `listarSujetos` a `cotizacion` para que elija destino al transferir) y la unificación de los sujetos simulados de `mocks/roster.ts` y `mocks/administracion.ts`. **La tarea sigue abierta a propósito:** la propuesta está lista y solo la puede marcar quien registre la entrada en el repo de contexto (el Lead).)_
- [x] 16.6 Limpieza: corregir los comentarios que aún citan estados retirados (`lib/contracts/viajeDetalle.ts:123` y `lib/contracts/viajes.ts:25`) y revisar si `src/lib/contracts/*.ts` duplican tipos que ya da el paquete (lo pide el brief del Lead). _(Comentarios corregidos: terminales del viaje son `CERRADO` y `CANCELADO_POR_CLIENTE`; el ejemplo del enum usa `Aprobado`. Revisión de `src/lib/contracts/*.ts`: todos los tipos de wire ya son alias de `components['schemas']`. Único duplicado de valor: `ESTADOS_SOLICITUD` copiaba la lista del paquete; ahora se reexporta de `@ai27-tech/contracts/estados/solicitud`. Quedan `MOTIVOS_ESTADIA`, `EJES_AUTORIZACION_ESTADIA` y `MOTIVOS_CIERRE`: el paquete solo da su tipo (unión de OpenAPI), no una lista en tiempo de ejecución, y están tipadas contra esa unión. Las interfaces de `administracion.ts` son modelos de vista (camelCase) que mapean el wire, no copias. `jwt.ts` y `sesion.ts` leen claims que el OpenAPI no describe.)_

## Pendientes de definición dentro del spec

- **P-A. RESUELTA.** `administrador` aterriza en el panel del Jefe Operativo (decisión del usuario); `getInitialRouteForRole` no cambia. Falta solo la página de `cotizacion`, que entra con 0.3.

## Reaperturas por el brief del Lead con `tracer.47`

Tareas que cambiaron y perdieron la marca de terminado: **0.3** (pin a `.47`), **15.1** (releer HU y brief contra el contexto actual) y **16.1** (validación con `.47`). Tareas nuevas: **11.6**, **15.8** a **15.11** y **16.6**. La 15.5 conserva su marca: solo cambió a dónde pasa la transferencia.

**Estado:** todas están hechas salvo **16.5**, que registra el Lead. **15.8** está construida; la parte de `cotizacion` espera a BE-10 (el Lead abre `listarSujetos?rol=cotizacion`): hasta entonces solo el Administrador elige destino.
