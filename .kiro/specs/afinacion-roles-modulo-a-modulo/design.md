# Design Document: Afinación de acciones y vistas por rol, módulo a módulo (v3)

## Overview

Una política de capacidades pura, de lista blanca y con nueve roles, que navegación, guardas de ruta y acciones consultan. Sobre ella se afina cada módulo por ciclos. La UI nunca calcula alcance: oculta lo que el rol no puede y representa bien `403`, `404` y las listas vacías que el BFF entrega.

Este diseño extiende el de `alineacion-ui-roles-capacidades` (v2). Lo que no se repite aquí (guardas de ruta con `RequiereCapacidad`, `SinPermiso`, adaptadores delgados) se conserva tal como está en aquel documento.

## Hechos verificados en el código (rama `feature/refinacion-ui-roles`)

| Dónde                                                                                           | Hoy                                                                               | Problema                                                                                             |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/lib/permisos/`                                                                             | No existe                                                                         | Sin política única (DT-24)                                                                           |
| `components/layout/navigationConfig.ts`                                                         | `ocultarPara` + `visiblePara` mezclados                                           | Con `cotizacion` (rol 9) las entradas con `ocultarPara` quedan visibles por omisión                  |
| `features/catalogos/afordancias.ts`                                                             | `ROLES_ROSTER = [JO, ADM]`, `puedeEscribirCatalogos` solo ADM                     | Salen de la política                                                                                 |
| `features/monitoreo/puedeUsarMonitoreo.ts`                                                      | MON, SUP, COO, ADM                                                                | Sale de la política                                                                                  |
| `features/viajes/detalle/cierreViaje.ts`                                                        | `puedeCerrar`: JO, ADM                                                            | Sale de la política                                                                                  |
| `features/viajes/historico/visibilidadCorreccion.ts`                                            | SUP, COO                                                                          | ADM pendiente (B-04)                                                                                 |
| `features/emergencias/afordancias.ts`                                                           | `ROLES_MONITOREO` y `ROLES_CON_CARRIL` locales; `puedeDevolver` incluye SUP y COO | Correcto en el fondo; sale de la política. La entrada de menú "Emergencias" sigue visible para todos |
| `features/roster/UnidadesMonitoristas*.tsx`, `useUnidadesMonitoristas.ts`, `lib/api/alcance.ts` | `fijarUnidadesSujeto`                                                             | Retirado por DEC-149 #18                                                                             |
| `routes/_private.tsx`                                                                           | Solo revisa que haya sesión                                                       | Sin guarda por rol                                                                                   |

Conteo de ocurrencias de lógica por rol: 20+ archivos fuera de `mocks/` (mayores: `features/emergencias/afordancias.ts`, `components/layout/navigationConfig.ts`, `features/viajes/detalle/DetalleViaje.tsx`).

## Arquitectura

```
src/lib/permisos/
  roles.ts            // ROLES_INTERNOS (los ocho) sobre el tipo Rol generado
  capacidades.ts      // Capacidad (unión de ids) y MATRIZ: Record<Capacidad, readonly Rol[]>
  excepciones.ts      // EXCEPCIONES_ADM: Capacidad -> fuente (por qué ADM no la tiene)
  puede.ts            // puede(rol, capacidad): boolean  (rol null, undefined o desconocido => false)
  transiciones.ts     // capacidadDeTransicion(origen, destino): Capacidad | null
src/components/permisos/
  RequiereCapacidad.tsx   // guarda de pantalla: hijos o <SinPermiso/>
  SinPermiso.tsx          // EmptyState de @ai27-tech/ui
```

### Lista blanca y regla del administrador

`MATRIZ` enumera los roles de cada capacidad. `administrador` se agrega a toda capacidad salvo las de `EXCEPCIONES_ADM`, que declaran su fuente. Una prueba exige que toda capacidad contenga a ADM o figure en las excepciones. Un rol que la matriz no nombra niega por construcción (`MATRIZ[c].includes(rol)`), así `cotizacion` y cualquier rol futuro no heredan nada.

### Capacidades

| Id                                                                                                | Roles (además de ADM salvo excepción)                        | Módulo |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| `viajes.listar`, `viaje.ver`                                                                      | JO, MON, SUP, COO                                            | M2, M4 |
| `viaje.crear`                                                                                     | JO                                                           | M3     |
| `viaje.asignarEscolta`                                                                            | JO                                                           | M4     |
| `viaje.marcarApto`                                                                                | JO, MON, SUP, COO                                            | M4     |
| `viaje.avanzar`                                                                                   | MON, SUP, COO                                                | M4     |
| `viaje.cerrar`                                                                                    | JO                                                           | M4     |
| `viaje.eta`                                                                                       | MON, SUP, COO                                                | M4     |
| `viaje.fechaHora`                                                                                 | pendiente (B-08)                                             | M4     |
| `viaje.ficha.ver`                                                                                 | JO, MON, SUP, COO                                            | M5     |
| `viaje.ficha.editar`, `viaje.bitacora.registrar`                                                  | MON, SUP, COO                                                | M5     |
| `viaje.historico.ver`                                                                             | MON, SUP, COO; JO pendiente (B-09)                           | M6     |
| `viaje.estadia.operar`, `viaje.incidencia.abrir`                                                  | MON, SUP, COO                                                | M6     |
| `viaje.incidencia.resolver`                                                                       | SUP, COO; ADM pendiente (B-04)                               | M6     |
| `monitoreo.consultar` (expediente, descarga, adjuntos)                                            | MON, SUP, COO                                                | M7     |
| `monitoreo.dashboard`                                                                             | MON, SUP, COO                                                | M8     |
| `emergencia.verDeViaje`, `emergencia.anotar`, `emergencia.cerrar`                                 | MON, SUP, COO                                                | M9     |
| `emergencia.activar`                                                                              | MON, SUP, COO (excepción ADM, B-02)                          | M9     |
| `emergencia.bandeja`                                                                              | REA, SUP, COO (excepción ADM)                                | M9     |
| `emergencia.reclamar`, `emergencia.resolver`                                                      | REA (excepción ADM)                                          | M9     |
| `emergencia.devolver`, `emergencia.transferir`                                                    | REA (solo responsable), SUP, COO (excepción ADM)             | M9     |
| `conversacion.leer`                                                                               | EJE, SUP, COO (ADM pendiente, B-05)                          | M10    |
| `conversacion.operar`                                                                             | EJE (excepción ADM)                                          | M10    |
| `solicitud.listar`, `solicitud.ver`                                                               | JO (solo `PAGADO`), COT                                      | M14    |
| `solicitud.verComercial`, `solicitud.cotizar`, `solicitud.reprogramar`, `solicitud.confirmarPago` | COT                                                          | M14    |
| `solicitud.revertirPago`                                                                          | (solo ADM)                                                   | M14    |
| `solicitud.aprobar`, `solicitud.rechazar`                                                         | JO                                                           | M14    |
| `solicitud.conversacion`                                                                          | COT                                                          | M14    |
| `roster.ver`, `roster.unidad.editar`, `alcance.clientes.fijar`                                    | JO                                                           | M11    |
| `roster.recursos.escribir`, `alcance.subordinados.fijar`                                          | (solo ADM)                                                   | M11    |
| `alcance.leerPropio`                                                                              | MON, SUP, COO (excepción ADM: el contrato le responde `403`) | M2     |
| `administracion.usuarios`, `administracion.organizaciones`                                        | (solo ADM)                                                   | M12    |
| `catalogos.ver`, `reportes.ver`                                                                   | statu quo (P)                                                | M13    |
| `catalogos.escribir`                                                                              | (solo ADM)                                                   | M13    |

`solicitud.listar` y `solicitud.ver` para JO no incluyen datos comerciales; ese filtro lo hace el BFF (DEC-148 #67) y la UI solo evita pintarlos.

### Transiciones

`accionesDesde(estado)` sigue siendo la fuente de aristas (máquina generada). `capacidadDeTransicion` solo mapea:

| Destino                                                                                                                  | Capacidad                                   |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `ASIGNADO` (desde `APROBADO`)                                                                                            | `viaje.asignarEscolta`                      |
| `APTO_PARA_SALIDA`                                                                                                       | `viaje.marcarApto`                          |
| `EN_EMBARQUE`, `EN_TRANSITO`, `EN_DESTINO`, `EN_DESCARGA` (incluye avance directo desde `ASIGNADO` y regreso a tránsito) | `viaje.avanzar`                             |
| `CERRADO` (normal y anticipado)                                                                                          | `viaje.cerrar`                              |
| `CANCELADO_POR_CLIENTE`                                                                                                  | `null`: `disparador: cliente`, no se ofrece |

Con `tracer.45` ya no hay destinos `APROBADO` ni `RECHAZADO_*` en el viaje: se retira la fila `viaje.decidirSolicitud` del diseño v2. Una prueba recorre `TRANSICIONES_VIAJE` y falla si algún destino ofrecido por la UI no tiene capacidad. Cuando el pin sea anterior a `.45`, el mapeo de `APROBADO` y `RECHAZADO_POR_AI27` se conserva temporalmente.

### Navegación

Cada `NavItem` declara la capacidad que la hace visible; se muestra si `puede(rol, capacidad)`. Se retira `ocultarPara`. Las entradas "Catálogos" y "Reportes" usan `catalogos.ver` y `reportes.ver`, con los roles actuales como lista blanca explícita (statu quo): REA queda fuera, COT queda fuera hasta que el Lead decida (B-06 y Q-10).

### Guardas de ruta

Se conserva el patrón de v2: `RequiereCapacidad` lee `useSession()` y renderiza hijos o `SinPermiso`, sin disparar la carga de datos cuando el rol está negado (los hooks de datos se montan dentro del hijo). Se agrega `beforeLoad` solo si `tokenStore.cargar()` expone el rol sin decodificar a mano. `/viajes` y `/viajes/$id` quedan guardadas para EJE y REA.

### Errores

`ApiError.kind` ya trae `prohibido`. Se añade el tratamiento de `404` en detalle y expediente ("no encontrado"). Se corrige el copy de `403` en el detalle. Una acción con `403` muestra `Toast` y no limpia la pantalla; con `404` vuelve a la lista.

## Diseño por módulo

### M2. Bandeja

- Columnas "Cliente" y "Escolta" con `ViajeResumen.cliente` y `unidades` (respaldo al `id`, "sin escolta").
- Filtro de estado: opciones del enum generado; sin función por rol cuando el pin es `.45` o posterior.
- Lista vacía: si el rol tiene `alcance.leerPropio`, el hook `useMiAlcance` llama `obtenerMiAlcance` **solo cuando la lista llegó vacía**. `clientes_efectivos_ids` vacío con `200` produce "sin clientes asignados"; en cualquier otro caso "sin viajes". Los demás roles no llaman la operación.

### M4 a M7. Detalle del viaje

- `DetalleViaje` filtra las acciones con `puede(rol, capacidadDeTransicion(...))`. ETA, estadías, notas e incidencias se condicionan con sus capacidades.
- `NavegacionViaje`: pestañas por `viaje.ficha.ver`, `viaje.historico.ver` y `monitoreo.consultar`.
- `FichaTecnicaViaje` y `FichaEditor`: `useFichaTecnica` se invoca dentro de `RequiereCapacidad(viaje.ficha.ver)`, así EJE y REA no disparan `obtenerAsignacion`. Con `viaje.ficha.editar` falso, el editor entra en modo solo lectura.

### M9. Emergencias

`afordancias.ts` conserva la regla de estado del caso y del responsable (`reclamo_activo`) y delega el rol en `puede`. `puedeDevolver` y `puedeTransferir` aceptan: responsable vigente (REA) o SUP y COO.

### M11 y M12. Roster y Administración

- `lib/api/alcance.ts`: `fijarClientesSujeto(id, clientes_ids)`; no se llama `fijarUnidadesSujeto`.
- `ClientesMonitoristas` (reemplaza `UnidadesMonitoristas`): lista por Monitorista con `clientes_ids` (propios) y `clientes_efectivos_ids`. Un id de `clientes_ids` que no esté entre los activos se pinta como "desactivado" (con nombre solo para ADM, que lee `listarOrganizaciones`) y se excluye del payload al guardar.
- `UnidadForm`: "Cliente al que sirve" (`Select variant="searchable"`, `null` para quitar).
- Errores: `400` (refresca activos), `409 rol_sin_alcance`.
- El mismo editor sirve a Administración con el `Select` de rol de nueve valores.

### M14. Solicitudes (condicionado a B-01 y B-10)

Hook por operación del BFF, un `useQuery` o `useMutation` por acción. La respuesta de `obtenerSolicitud` y `listarHistoricoSolicitud` se modela con `cotizacion` y `pago` opcionales; el componente del JO no los renderiza. Tras `aprobarSolicitud`, la navegación va a `/viajes/{id}` con el mismo id; el `404` de `obtenerSolicitud` para JO se trata como solicitud resuelta.

## Mocks

Un helper `autorizarMock(request, capacidad)` lee el rol del token demo y responde `403` si `puede` es falso. Los handlers con capacidad lo usan. `listarViajes` mock filtra por `CLIENTES_POR_MONITORISTA` y emite `cliente` y `unidades`; el detalle mock responde `404` fuera de alcance. `obtenerMiAlcance` mock responde `{ clientes_efectivos_ids }` a MON, SUP y COO y `403` a los demás. `fijarClientesSujeto` mock valida `400` y `409`. Las cuentas demo cubren los ocho roles internos. Es una emulación de la frontera del BFF, no lógica del frontend real.

## Correctness properties

1. Para toda capacidad y todo rol, `puede(rol, c)` coincide con la matriz de `requirements.md`.
2. Toda capacidad contiene a `administrador` o figura en `EXCEPCIONES_ADM` con su fuente.
3. Todo destino de transición que la UI ofrece tiene capacidad; los destinos con `disparador: cliente` no se ofrecen.
4. Un rol que la matriz no nombra no tiene ninguna capacidad nueva (se prueba con un rol sintético).
5. La UI no emite `obtenerMiAlcance` con JO, ADM, EJE, REA ni COT, ni `obtenerAsignacion` con EJE ni REA.
6. `403` conserva la sesión y no reintenta; `404` nunca se muestra como falta de permiso.

## Estrategia de pruebas

Prueba de tabla (propiedades 1 y 2), recorrido de transiciones (3), rol sintético (4), pruebas de pantalla por rol con MSW y cuentas demo (5 y 6) y regresiones de E8-T7, T8, T10, T12, T13, T14, T15, T17, T18 y T19. Camino feliz con un rol que tenga la capacidad; negativa con uno que no.
