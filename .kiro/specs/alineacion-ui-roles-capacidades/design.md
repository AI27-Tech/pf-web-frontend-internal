# Design Document: Alineación de la UI interna con roles y capacidades (v2)

## Overview

Se centraliza la decisión de rol en un módulo puro y se hace que navegación, rutas y acciones lo consulten. Después se adapta la UI a las respuestas de `tracer.41` (`403` por rol, `404` por alcance, `cliente` y `unidades` en `ViajeResumen`) y se cambia `/roster` a "mis clientes". No se calcula alcance en el navegador y no se agrega superficie de API.

## Hechos verificados en el código (rama `feature/estilizacion-viajes`)

| Dónde                                                             | Hoy                                     | Problema frente a DEC-149                                          |
| ----------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `components/layout/navigationConfig.ts`                           | `ocultarPara` + `visiblePara` mezclados | Dos modelos (C8)                                                   |
| `features/catalogos/afordancias.ts`                               | `ROLES_ROSTER = [JO, ADM]`              | Correcto; debe salir de la política                                |
| `features/monitoreo/puedeUsarMonitoreo.ts`                        | MON, SUP, COORD, ADM                    | Correcto; debe salir de la política                                |
| `features/viajes/detalle/cierreViaje.ts`                          | `puedeCerrar`: JO, ADM                  | Correcto; sin política única                                       |
| `features/viajes/detalle/DetalleViaje.tsx`                        | Filtra solo `CERRADO` por rol (l. 180)  | Aprobar, rechazar, asignar, avanzar, ETA y fecha sin filtro de rol |
| `features/viajes/NavegacionViaje.tsx`                             | `verFicha = rol === 'monitorista'`      | Excluye ADM, JO y a SUP/COORD                                      |
| `features/viajes/ficha/FichaTecnicaViaje.tsx`                     | Solo `monitorista` (l. 56)              | Igual; JO debe ver en solo lectura                                 |
| `features/viajes/crear/CrearViaje.tsx` y `BandejaViajes.tsx`      | Solo `jefe_operativo`                   | Excluye ADM                                                        |
| `features/viajes/historico/visibilidadCorreccion.ts`              | SUP, COORD                              | Falta ADM                                                          |
| `features/emergencias/afordancias.ts`                             | `ROLES_MONITOREO` local                 | Sale de la política                                                |
| `features/roster/UnidadesMonitoristas*.tsx`, `lib/api/alcance.ts` | `fijarUnidadesSujeto`                   | Deprecado en tracer.41                                             |
| `features/administracion/AlcanceEditor.tsx`                       | `opcionesUnidadesAlcance`               | Verificar que migre a clientes                                     |
| `routes/_private.tsx`                                             | Solo revisa que haya sesión             | Sin guarda por rol; cada pantalla se protege sola                  |
| `lib/api/errors.ts`                                               | `prohibido` (403) ya existe             | Falta distinguir `404` de "alcance" en detalle                     |

## Arquitectura

```
src/lib/permisos/
  capacidades.ts      // tipo Capacidad + tabla CAPACIDADES: Record<Capacidad, readonly Rol[]>
  puede.ts            // puede(rol, capacidad): boolean  (rol null/undefined => false)
  transiciones.ts     // capacidadDeTransicion(estadoDestino, estadoOrigen): Capacidad | null
src/components/permisos/
  RequiereCapacidad.tsx   // guarda de pantalla: renderiza hijos o <SinPermiso/>
  SinPermiso.tsx          // estado "sin permiso" (EmptyState de @ai27-tech/ui)
```

**Tabla única.** `CAPACIDADES` contiene los ids de la tabla de `requirements.md`. Un `const MONITOREO = [monitorista, supervisor, coordinador]` evita repetir la herencia. `administrador` se agrega en cada fila, y una prueba comprueba que ADM aparece en todas.

**Reutilización de los módulos viejos.** `puedeArmarRoster`, `puedeUsarMonitoreo`, `puedeCerrar`, `puedeAdministrar`, `puedeCorregirIncidencia` y `ROLES_*` quedan como funciones delgadas que llaman a `puede(...)`. Así los puntos de uso y las pruebas existentes no cambian de golpe. Se retiran cuando ya nadie las importa.

**Transiciones.** `accionesDesde(estado)` sigue siendo la fuente de aristas. `capacidadDeTransicion` solo mapea destino a capacidad:

| Destino                                                                                             | Capacidad                                                         |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `APROBADO`, `RECHAZADO_POR_AI27`                                                                    | `viaje.decidirSolicitud`                                          |
| `ASIGNADO` (desde `APROBADO`)                                                                       | `viaje.asignarEscolta`                                            |
| `APTO_PARA_SALIDA`                                                                                  | `viaje.marcarApto`                                                |
| `EN_EMBARQUE`, `EN_TRANSITO`, `EN_DESTINO`, `EN_DESCARGA` (incluye avance directo desde `ASIGNADO`) | `viaje.avanzar`                                                   |
| `CERRADO`                                                                                           | `viaje.cerrar`                                                    |
| Otro destino (p. ej. cancelación del cliente)                                                       | `null`: no se ofrece en el panel interno (verificar en tarea 4.1) |

Una prueba recorre `TRANSICIONES_VIAJE` y falla si algún destino ofrecido por la UI no tiene capacidad. Así una arista nueva del contrato no queda abierta a todos los roles sin que nadie lo note.

**Guardas de ruta.** `beforeLoad` no puede usar `useSession`. Se mantiene el patrón vigente de `roster.tsx` y `administracion.tsx` (decisión en pantalla) pero unificado en `RequiereCapacidad`, que lee `useSession()`. Si `tokenStore.cargar()` expone el rol sin decodificar a mano, se añade además `beforeLoad` para evitar el parpadeo; si no, se queda solo el componente (decisión en tarea 3.1).

**Navegación.** `NavItem` queda con `visiblePara: Capacidad`-derivado: cada entrada declara una capacidad y se muestra si `puede(rol, capacidad)`. Conversaciones y Emergencias, que la tabla no cubre, declaran roles explícitos (`ejecutivo` y los que ya la ven hoy). Catálogos y Reportes conservan sus reglas actuales hasta resolver P-3. Se retira `ocultarPara`.

**Errores.** `ApiError.kind` ya trae `prohibido`. Se añade el tratamiento de `404` en detalle: "viaje no encontrado" (no "sin permiso"). Se corrige el copy de `403` ("el rol o el alcance"). No se agrega taxonomía nueva si `no_encontrado` ya existe (verificar en 5.1).

**Bandeja de viajes.** `listarViajes` ya devuelve lo que el BFF filtra. Se agregan columnas "Cliente" y "Escolta" con `ViajeResumen.cliente` y `unidades`. Las opciones del filtro de estado salen de la política (`estadosVisiblesPara(rol)`): todas para JO y ADM, y desde `APROBADO` para MON, SUP y COORD. Solo cambia el contenido de un filtro; no se filtran filas.

**Roster.**

- `lib/api/alcance.ts`: nuevo `fijarClientesSujeto(id, clientes_ids, token)`; se deja de llamar a `fijarUnidadesSujeto`.
- `ClientesMonitoristas` reemplaza a `UnidadesMonitoristas`: por Monitorista, selección múltiple de clientes activos (`listarTodosClientes` + filtro `activo`). Muestra `clientes_ids` (propios) y `clientes_efectivos_ids` cuando existan.
- `UnidadForm`: campo opcional "Cliente al que sirve" con `Select variant="searchable"`; editar permite "sin cliente" (`null`).
- Errores: `400` (cliente inexistente o desactivado, refresca la lista) y `409 rol_sin_alcance`.

**Mocks.** Un helper `autorizarMock(request, capacidad)` lee el rol del token demo y devuelve `403` si `puede` es falso. Lo usan los handlers de las operaciones con capacidad. `listarViajes` mock filtra por clientes del Monitorista (fixture `CLIENTES_POR_MONITORISTA`), desde `APROBADO`. Es una emulación de la frontera del BFF, no lógica del frontend real.

## Componentes de `@ai27-tech/ui`

`EmptyState` y `Alert` (sin permiso, no encontrado), `Table` (columnas nuevas), `Badge`, `Select variant="searchable"` (clientes), `Section`, `Inline` y `Stack`, `Toast` (403 de acción), `Modal`. Sin componentes locales nuevos; sin brecha de UI.

## Manejo de errores

| Respuesta | Lista y detalle                            | Acción                                       |
| --------- | ------------------------------------------ | -------------------------------------------- |
| `401`     | Recuperación de sesión existente           | Igual                                        |
| `403`     | "Sin permiso", sesión intacta              | `Toast` "No tienes permiso para esta acción" |
| `404`     | Lista: n/a. Detalle: "Viaje no encontrado" | "Ya no disponible", vuelve a la lista        |
| `409`     | Se conserva la clasificación vigente       | Igual                                        |

## Correctness properties

1. Para todo rol R y capacidad C, `puede(R, C)` coincide con la tabla de DEC-149; `administrador` tiene todas.
2. Para todo rol R y toda arista de `TRANSICIONES_VIAJE` que la UI ofrece, la acción se muestra si y solo si la arista es alcanzable desde el estado **y** `puede(R, capacidadDeTransicion(...))`.
3. Ninguna entrada de navegación se muestra a un rol que no tiene la capacidad de su ruta.
4. Ningún `403` ni `404` cierra la sesión.
5. Ningún código del frontend filtra viajes por cliente o unidad.

## Riesgos

- Tocar muchos archivos con roles dispersos. Se mitiga con adaptadores delgados y una migración por área.
- El alcance real no se prueba hasta que `identidad`, `operacion` y `bff` apliquen DT-07; antes solo hay mocks (B-03).
- Subir el pin a `tracer.41` puede traer cambios de tipos; revisar `CHANGELOG.md` del contrato.
