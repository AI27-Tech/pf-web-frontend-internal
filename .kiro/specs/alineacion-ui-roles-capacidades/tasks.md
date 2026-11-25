# Implementation Plan: Alineación de la UI interna con roles y capacidades (v2)

> **REEMPLAZADO.** Este spec lo sustituye finacion-roles-modulo-a-modulo (política única de capacidades en src/lib/permisos, un módulo a la vez). No se sigue ejecutando; queda como referencia histórica.

Las tareas marcadas con `*` son pruebas. Las tareas 0.x no cambian código.

## Grafo de dependencias

```
0.1 ─ 0.2 (pin tracer.41) ───────────────┐
1 (política) ─┬─ 2 (navegación y rutas)  │
              ├─ 3 (acciones del viaje)  ├─ 6 (roster)   ─┐
              └─ 4 (errores 403/404) ────┤  5 (bandeja)  ─┼─ 7 (mocks) ─ 8 (validación)
                                         └────────────────┘
```

Las fases 1 a 4 no dependen del pin. Las 5 y 6 sí (0.2). El extremo a extremo del alcance espera al backend de `tracer.41` (B-03).

## 0. Verificación

- [ ] 0.1 Pedir a Product/Lead el registro de DEC-149 en `decision-log.md` y respuesta a P-1 a P-4 (`requirements.md`). No bloquea 1 a 4, salvo las filas de Supervisor y Coordinador.
- [ ] 0.2 Subir `@ai27-tech/contracts` a `0.1.0-tracer.41` **solo con confirmación del usuario**. Revisar `CHANGELOG.md` y correr typecheck.
  - Verificar el tipo `ViajeResumen.cliente` y `unidades`, `fijarClientesSujeto` y `AlcanceSujeto.clientes_*` en `@ai27-tech/contracts/openapi/bff`.

## 1. Política de capacidades

- [ ] 1.1 Crear `src/lib/permisos/capacidades.ts` y `puede.ts` con la tabla de `requirements.md`.
- [ ] 1.2 Crear `transiciones.ts` con `capacidadDeTransicion` y `estadosVisiblesPara(rol)`.
- [ ] 1.3 Convertir `puedeArmarRoster`, `puedeUsarMonitoreo`, `puedeCerrar`, `puedeAdministrar` y `puedeCorregirIncidencia` en llamadas a `puede`. Agregar a `administrador` en la corrección de incidencias.
- [ ]* 1.4 Prueba de tabla: capacidad × ocho roles. ADM aparece en todas. Un rol ausente niega.
- [ ]* 1.5 Prueba de transiciones: todo destino que ofrece la UI tiene capacidad (property 2).

## 2. Navegación y rutas

- [ ] 2.1 Decidir si `tokenStore` permite `beforeLoad` por rol; si no, solo componente.
- [ ] 2.2 Crear `RequiereCapacidad` y `SinPermiso` (con `EmptyState`).
- [ ] 2.3 Reescribir `NAV_ITEMS` a un solo modelo `visiblePara`; retirar `ocultarPara`. Conservar Catálogos y Reportes como hoy (P-3).
- [ ] 2.4 Envolver con `RequiereCapacidad`: `/roster`, `/administracion`, `/jefe-operativo/panel`, `/monitoreo/dashboard`, `/viajes/crear`, `/viajes/$id/ficha`, `/viajes/$id/expediente`, y `/viajes` y `/viajes/$id` para `ejecutivo` y `reaccion`.
- [ ] 2.5 Revisar `getInitialRouteForRole`: ADM debe aterrizar en una ruta que puede usar. El panel del JO es stub (E8-T20); decidir si el ADM aterriza ahí o en el dashboard.
- [ ]* 2.6 Pruebas: menú por rol y URL directa por rol restringido, sin logout.

## 3. Acciones del viaje

- [ ] 3.1 En `DetalleViaje`, filtrar `d.acciones` con `capacidadDeTransicion` y `puede` (reemplaza el filtro solo de `CERRADO`).
- [ ] 3.2 Aplicar `viaje.decidirSolicitud` a aprobar, rechazar y fijar fecha previa; `viaje.seguimiento` a ETA, estadías y notas; `viaje.incidencia.abrir` a incidencias; `emergencia.operar` al carril de emergencias.
- [ ] 3.3 `NavegacionViaje`: pestañas "Ficha técnica" por `viaje.ficha.ver`, "Expediente y evidencia" por `monitoreo.consultar`.
- [ ] 3.4 `FichaTecnicaViaje` y `FichaEditor`: entrar con `viaje.ficha.ver`; editar solo con `viaje.ficha.editar` (modo solo lectura para JO).
- [ ] 3.5 `CrearViaje` y botón "Crear" de `BandejaViajes`: usar `viaje.crear` (incluye ADM). Revisar `useCrearViaje(habilitado)`.
- [ ] 3.6 `EvidenciaViaje` y `ExpedienteViaje`: `monitoreo.consultar`.
- [ ]* 3.7 Pruebas por rol y estado (`APROBADO`, `ASIGNADO`, `EN_TRANSITO`, `EN_DESTINO`, terminal) con los escenarios E1 a E4, E6 y E8. Mantener regresiones de E8-T8, T9, T10, T12, T13, T14.

## 4. Errores 403 y 404

- [ ] 4.1 Confirmar qué transiciones sin capacidad ofrece hoy la UI (p. ej. cancelación) y decidir con P-4/Lead.
- [ ] 4.2 Detalle: `404` = "Viaje no encontrado"; `403` = "Sin permiso". Corregir el copy "rol o alcance".
- [ ] 4.3 Acciones: `403` = `Toast` de falta de permiso; `404` = "ya no disponible" y vuelta a la lista.
- [ ]* 4.4 Pruebas `401`, `403` y `404` por separado en lista, detalle y una mutación (property 4).

## 5. Bandeja de viajes (requiere 0.2)

- [ ] 5.1 Agregar columnas Cliente y Escolta con `cliente` y `unidades`; respaldo al `id` y "sin escolta".
- [ ] 5.2 Opciones del filtro de estado por rol con `estadosVisiblesPara`.
- [ ] 5.3 `EmptyState` para lista vacía de MON (ver B-04).
- [ ]* 5.4 Pruebas de columnas, filtro por rol y vacíos.

## 6. Roster: "mis clientes" (requiere 0.2)

- [ ] 6.1 `lib/api/alcance.ts`: agregar `fijarClientesSujeto`; dejar de usar `fijarUnidadesSujeto`.
- [ ] 6.2 `ClientesMonitoristas` (reemplaza `UnidadesMonitoristas` y `useUnidadesMonitoristas`) con solo clientes activos.
- [ ] 6.3 `UnidadForm`: campo opcional "Cliente al que sirve" (alta y edición, `null` para quitar).
- [ ] 6.4 Manejo de `400` (refresca clientes activos) y `409 rol_sin_alcance`.
- [ ] 6.5 `AlcanceEditor` de Administración: migrar de `opcionesUnidadesAlcance` a clientes si aplica.
- [ ] 6.6 Texto en la UI: el cliente de la unidad no define el alcance.
- [ ]* 6.7 Pruebas: un cliente en varios Monitoristas (E9), cliente desactivado (E10), `409`.

## 7. Mocks

- [ ] 7.1 Helper `autorizarMock(request, capacidad)`; aplicarlo a los handlers de operaciones con capacidad.
- [ ] 7.2 `listarViajes` mock: `403` para `ejecutivo` y `reaccion`; filtro por clientes del Monitorista desde `APROBADO`; `cliente` y `unidades` en cada fila.
- [ ] 7.3 Detalle mock: `404` fuera de alcance.
- [ ] 7.4 `fijarClientesSujeto` mock con `400` y `409`; `AlcanceSujeto` con `clientes_*`.
- [ ] 7.5 Corregir fixtures: el camino feliz de cada capacidad usa un rol con ella.
- [ ]* 7.6 Pruebas de handlers por rol.

## 8. Validación final

- [ ] 8.1 Typecheck, lint, suite completa en una sola ejecución, build con mocks.
- [ ] 8.2 Buscar en `src/` comparaciones `rol ===` o listas de roles fuera de `lib/permisos` (debe quedar solo lo declarado).
- [ ] 8.3 Checklist de PR de `ai27-tech-library-first` (sin `svg` ni colores nuevos, `Stack`/`Inline`/`Grid`).
- [ ] 8.4 Actualizar este spec con las respuestas a P-1 a P-4 y los avances reales.
