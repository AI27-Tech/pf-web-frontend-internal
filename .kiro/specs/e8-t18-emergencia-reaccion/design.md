# Design Document

## Overview

E8-T18 agrega dos superficies al panel interno: la **bandeja de emergencias** de Reacción en `/emergencias` (lista, detalle, reclamar, devolver, resolver, cerrar) y el **botón de emergencia con notas** en el detalle del viaje para el usuario de monitoreo. La bandeja se construye sobre la superficie `tracer.35` del `bff`, y el botón, las notas y el selector de casos sobre el carril del monitoreo por viaje de `tracer.37` (DEC-135). **La transferencia dirigida queda fuera de V1** (DEC-134, DT-15). Sin tipos de wire locales.

Se reutiliza el patrón de `features/conversaciones` (E8-T15): afordancias puras, hooks de datos con polling detrás de una interfaz, wrapper de API que clasifica errores y vistas finas sobre `@ai27-tech/ui`.

### Hecho de contrato verificado (fundamento del diseño)

Contra `v0.1.0-tracer.37` de `contracts/openapi/bff.yaml`:

```
# Lectura (Interno: reaccion, supervisor, coordinador)
GET    /api/v1/panel/emergencias                    listarBandejaEmergencias  -> PaginaBandejaEmergencias (cursor; sin revision)
GET    /api/v1/panel/emergencias/{eid}              obtenerEmergencia         -> DetalleEmergenciaReaccion {caso, viaje}
GET    /api/v1/panel/emergencias/{eid}/notas        listarNotasEmergenciaPorId-> PaginaNotasEmergencia

# Escritura
POST   /api/v1/panel/emergencias/{eid}/reclamos       reclamarEmergenciaPorId   {version_esperada} -> 201 Reclamo   | 409 conflicto_version_reclamo
DELETE /api/v1/panel/emergencias/{eid}/reclamos/{rid} liberarReclamoEmergenciaPorId ?version_esperada -> 204
POST   /api/v1/panel/emergencias/{eid}/transferencias transferirEmergenciaPorId {version_esperada, responsable_destino_id, motivo?} -> 201 Reclamo   (en contrato, NO se ofrece en V1: DEC-134)
POST   /api/v1/panel/emergencias/{eid}/resolucion     resolverEmergenciaPorId   {version_esperada, nota 1..1000} -> 200 EmergenciaReaccion | 400
POST   /api/v1/panel/emergencias/{eid}/cierre         cerrarEmergenciaPorId     (sin cuerpo) -> 200 CasoEmergencia

# Carril del monitoreo por viaje (tracer.37, DEC-135)
GET    /api/v1/panel/viajes/{id}/emergencias                listarEmergenciasViaje        -> {items: EmergenciaViaje[]} (id, estado, activada_en; incluye cerrada; antiguo primero)
POST   /api/v1/panel/viajes/{id}/emergencias                activarEmergenciaInterno      {activacion_id} -> 201 nuevo | 200 reentrega | 409 viaje_en_estado_terminal
POST   /api/v1/panel/viajes/{id}/emergencias/{eid}/notas  agregarNotaEmergenciaInterno   {cuerpo 1..1000} -> 201 | 409 emergencia_cerrada
```

Reglas que impone el contrato y la UI no recalcula: reclamar solo si nadie tiene el caso (409 si hay responsable, DEC-125); liberar por responsable o supervisor/coordinador (DEC-126, DEC-131; la transferencia dirigida es V2, DEC-134); resolver solo por el responsable vigente; activar por monitorista, supervisor o coordinador; anotar y listar los casos del viaje por esos tres y administrador (Reacción y Ejecutivo reciben 403); cerrar por monitoreo o administrador, nunca Reacción ni Ejecutivo; bandeja sin casos `cerrada`, más antiguo primero.

## Architecture

### Vista de capas

```
routes/_private/emergencias.tsx          reemplaza el stub; <BandejaEmergencias/> (caso abierto por search param `caso`)
routes/_private/viajes/$id/index.tsx     (E8-T8) monta <AccionEmergencia/> y <SelectorCaso/> según rol

features/emergencias/
  afordancias.ts            puras: puedeReclamar, puedeDevolver, puedeResolver, puedeCerrar, puedeActivar, puedeAnotar
  actualizacion.ts          interfaz de actualización + implementación de polling (cadencia desde config del cliente)
  useBandejaEmergencias.ts  bootstrap + polling + cursor; estados cargando/vacio/error/sin_acceso
  useCasoEmergencia.ts      detalle + notas + polling; acciones con invalidación
  useAccionesCaso.ts        reclamar, devolver, resolver, cerrar (bloqueo de doble envío, recarga ante 403/409)
  BandejaEmergencias.tsx    lista + panel del caso
  ListaCasos.tsx            filas mínimas (estado, origen, responsable, activada_en)
  PanelCaso.tsx             bloque de viaje, escolta, notas, acciones
  DialogoResolucion.tsx     nota obligatoria 1..1000
  BannerActualizacion.tsx   hora de última actualización correcta / desactualizada
  activacion/               AccionEmergencia.tsx, useActivarEmergencia.ts, NotaEmergencia.tsx, SelectorCaso.tsx

lib/contracts/emergencias.ts   re-exporta de @ai27-tech/contracts/openapi/bff (sin tipos de wire a mano)
lib/api/emergencias.ts         wrapper de las operaciones; clasifica errores
```

El wrapper expone las operaciones de `tracer.37` y no ofrece `transferirEmergenciaPorId` a la UI (sigue en el contrato, sin lectura de destinos). Las piezas de `activacion/` se construyen una vez subido el pin.

### Estados de la interfaz

- **Bandeja:** `cargando`, `vacia`, `con_casos`, `error` (reintento), `sin_acceso` (403/404), `desactualizada` (fallo de polling con datos conservados).
- **Caso:** `cargando`, `no_disponible` (404), `sin_acceso` (403), `abierta_sin_reclamar`, `en_atencion_mia`, `en_atencion_otra`, `resuelta`, `cerrada`.
- **Acción:** `idle`, `en_curso` (bloquea doble envío), `exito`, `rechazada` (403/409/400 con recarga o conservación del texto).

### Afordancias puras (`afordancias.ts`)

Funciones que reciben `rol`, `estado`, `reclamo_activo` y `sujetoId` y devuelven si la acción se ofrece. Espejan las guardas documentadas del contrato solo para **mostrar u ocultar** el gesto; el `bff` decide:

| Función         | Condición de oferta                                                                    |
| --------------- | -------------------------------------------------------------------------------------- |
| `puedeReclamar` | rol `reaccion`; `estado = abierta`; sin `reclamo_activo`                               |
| `puedeDevolver` | `estado = en_atencion`; responsable es el sujeto, o rol `supervisor`/`coordinador`     |
| `puedeResolver` | rol `reaccion`; `estado = en_atencion`; responsable es el sujeto                       |
| `puedeCerrar`   | `estado = resuelta`; rol `monitorista`, `supervisor`, `coordinador` o `administrador`  |
| `puedeActivar`  | rol `monitorista`/`supervisor`/`coordinador`; viaje no `esTerminal` (paquete generado) |
| `puedeAnotar`   | rol `monitorista`/`supervisor`/`coordinador`/`administrador`; caso no `cerrada`        |

No calculan ventanas de tiempo ni alcance por unidad (lo resuelve el `bff`).

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

`Card`, `Button`, `Badge` (estado y origen), `FilterTable`/`Table` (bandeja), `Modal` (confirmaciones y resolución), `Textarea` (nota), `Select` (destino y selector de caso), `Toast` (avisos). Verificar APIs exactas en la tarea 1. Para vacío, banner y carga, que el índice no confirma como componentes, componer con `Card` y tokens como en T15 y registrar la solicitud a la librería. Sin estilos ni componentes copiados.

## Components and Interfaces

### Presentación de personas

El responsable se muestra como "Tú" u "otra persona" comparando `reclamo_activo.responsable_id` con el sujeto de la sesión. No hay nombres de integrantes de Reacción en el contrato (DEC-134, DT-15). El autor de una nota se muestra por `audiencia_autor` ("Cliente" o "Interno"); `actor_real` no se muestra como nombre.

### Gestos y su operación

| Gesto                  | Operación                       | Datos                                                                  | Resultado de UI                                |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Reclamar               | `reclamarEmergenciaPorId`       | `version_esperada = caso.version_reclamo`                              | recarga caso; 409 → "otra persona lo tiene"    |
| Devolver al pool       | `liberarReclamoEmergenciaPorId` | `rid = reclamo_activo.id`, `version_esperada = reclamo_activo.version` | caso `abierta` sin reclamar                    |
| Resolver               | `resolverEmergenciaPorId`       | `version_esperada`, `nota` recortada 1..1000                           | caso `resuelta`                                |
| Cerrar                 | `cerrarEmergenciaPorId`         | sin cuerpo                                                             | caso `cerrada`; sale de la bandeja             |
| Activar                | `activarEmergenciaInterno`      | `activacion_id` (UUID cliente)                                         | aviso + oferta opcional de nota                |
| Nota                   | `agregarNotaEmergenciaInterno`  | `cuerpo` 1..1000                                                       | aviso; texto conservado ante 409               |
| Listar casos del viaje | `listarEmergenciasViaje`        | `id` del viaje                                                         | selector (sin `cerrada`); cierre de `resuelta` |

Detalle de versiones: `reclamar` usa `caso.version_reclamo` (versión vigente del caso aun sin reclamo); `liberar` y `resolver` usan la versión del `reclamo_activo`. Nunca un valor fijo.

### Idempotencia de la activación

`useActivarEmergencia` genera un `activacion_id` por pulsación intencional y lo conserva mientras la respuesta no se confirme (éxito 201/200 o rechazo definitivo 4xx). Un fallo de red reutiliza el mismo id. Tras confirmación, la siguiente pulsación genera uno nuevo. El bloqueo de doble clic aplica solo mientras hay una petición en vuelo de ese mismo id.

## Flujo de actualización por polling

`actualizacion.ts` define una interfaz (`iniciar(callback)`, `detener()`, `ultimaCorrecta`) con una implementación de polling; la cadencia viene de configuración del cliente. La bandeja no tiene `revision`, por lo que cada ciclo reemplaza la página 1 y conserva las páginas ya cargadas por cursor solo si siguen presentes; un caso que desaparece (cerrado) sale de la lista. El caso abierto vuelve a consultar detalle y notas. Un fallo conserva lo mostrado, marca "desactualizada" y reintenta. Las acciones son HTTP independientes del polling. El SSE (DT-01) sustituiría la implementación sin tocar la vista.

## Data Models

Tipos re-exportados de `@ai27-tech/contracts/openapi/bff`: `EmergenciaReaccion`, `DetalleEmergenciaReaccion`, `ViajeEmergencia`, `UnidadEscoltaEmergencia`, `NotaEmergencia`, `PaginaBandejaEmergencias`, `PaginaNotasEmergencia`, `Reclamo`, `ResolucionEmergenciaEntrada`, `CasoEmergencia`, `EstadoEmergencia`. Del carril del monitoreo: `EmergenciaViaje`, `PaginaEmergenciasViaje`, `ActivarEmergenciaInternoEntrada` y `NotaEmergenciaInternoEntrada`. Solo se define localmente el tipo de estado de vista (`EstadoVistaCaso`), que no es wire.

## Error Handling

| Respuesta                                                                                 | Tratamiento                                                                                                                |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `401`                                                                                     | Delegar al flujo de sesión del AppShell                                                                                    |
| `403`                                                                                     | En lectura: acceso no autorizado. En acción: mensaje específico (solo el responsable / fuera de alcance), recarga del caso |
| `404`                                                                                     | Bandeja sin acceso o caso no disponible, sin distinguir causa                                                              |
| `400` (resolver)                                                                          | Conservar nota, señalar error de validación, estado sin cambio                                                             |
| `409 conflicto_version_reclamo`                                                           | "Otra persona lo tiene" o "cambió", recarga, sin reintento silencioso                                                      |
| `409 viaje_en_estado_terminal` / `emergencia_cerrada` (llegan con el código del contrato) | Aviso específico, recarga del viaje o selector, texto conservado                                                           |
| Red / 5xx                                                                                 | Error recuperable con reintento; en activación, reutilizar `activacion_id`                                                 |

Los textos son provisionales hasta que Producto los apruebe y están marcados como tales.

## Correctness Properties

**Property 1: Reclamo con versión vigente**

**Validates: Requirements 5.2, 6.2, 7.3**

Para todo caso, la `version_esperada` enviada al reclamar es `caso.version_reclamo`; al liberar o resolver es la versión del `reclamo_activo`. Nunca `0` fijo salvo que sea la vigente.
**Property 2: Afordancias exclusivas**

**Validates: Requirements 1.1, 1.2, 5.1, 5.5, 6.1, 7.1, 7.6, 8.1, 8.2**

Para todo (rol, estado, responsable): `puedeResolver` implica rol `reaccion` y responsable = sujeto; `puedeCerrar` implica `estado = resuelta` y rol distinto de `reaccion`/`ejecutivo`; `puedeReclamar` implica rol `reaccion`, `abierta` y sin responsable; `puedeActivar` es falso en `ejecutivo` y `reaccion`.
**Property 3: Idempotencia de activación**

**Validates: Requirements 1.4, 1.5**

N reintentos tras fallo de red usan el mismo `activacion_id`; dos pulsaciones intencionales separadas por una confirmación usan ids distintos.
**Property 4: Nota válida**

**Validates: Requirements 7.2**

Para toda cadena, la nota de resolución enviada tiene entre 1 y 1.000 caracteres tras recortar; una cadena vacía o solo de espacios nunca habilita la confirmación.
**Property 5: Sin datos prohibidos**

**Validates: Requirements 3.4, 4.4, 4.6, 9.1**

La vista de Reacción nunca renderiza ubicación, `viaje_id`, `cliente_id`, `actor_real` ni enlaces al viaje.
**Property 6: Conservación ante falla**

**Validates: Requirements 10.4, 10.5**

Un fallo de polling no elimina datos ya mostrados.
**Property 7: Cerrados fuera**

**Validates: Requirements 2.4, 3.8**

Un caso `cerrada` nunca queda en la lista tras el siguiente ciclo y nunca ofrece notas.

## Testing Strategy

- **Unitarias y de propiedades (fast-check si el repo ya lo usa):** `afordancias` (P2), generación y reutilización de `activacion_id` (P3), recorte y validación de nota (P4), selección de versión (P1), clasificación de errores del wrapper.
- **Integración con MSW:** bandeja con casos y vacía; `403`/`404`; reclamar y `409`; devolver; resolver con nota válida y con `400`; cerrar (`200`, `403`, `409`); detalle con y sin escolta; caída de polling con acciones operativas; `401` delegado. Incluye activación (`201`, `200`, `403`, `409 viaje_en_estado_terminal`), notas (`201`, `400`, `403`, `409 emergencia_cerrada`) y lista de casos con un `cerrada` que la UI no ofrece.
- **Definición de terminado de E8-T18:** idempotencia del reintento frente a dos pulsaciones, negación a `reaccion` en acciones generales del viaje (el `bff` responde `403`, la UI lo muestra), guardas de resolución y cierre, y operación del caso con el polling caído.
- **Comandos:** `typecheck`, `lint`, `test`, `build:mock`.

## Mocks (MSW)

Fixtures y handlers de la bandeja y el caso (casos en cada estado, caso con escolta y sin escolta, notas con nota de resolución, `403`, `404`, `409`) siguiendo el patrón de `src/mocks`. No se simulan operaciones que el contrato no publica (p. ej. lectura de destinos de transferencia); los mocks de activación, notas y lista de casos del viaje siguen el contrato `tracer.37`.

## Decisiones

- **Polling, no SSE.** La historia técnica menciona reutilizar el transporte SSE de E8-T15, pero T15 quedó en polling (DT-01). Se aplica el mismo criterio detrás de una interfaz.
- **Bandeja sin `revision`.** `PaginaBandejaEmergencias` no trae revisión de colección, así que el ciclo reemplaza la lista en vez de aplicar cambios incrementales.
- **Devolver al pool es el único modo de soltar un caso en V1.** La transferencia dirigida se difirió a V2 (DEC-134, DT-15).
- **Dos caminos de cierre.** Supervisor y Coordinador cierran desde la bandeja; monitorista y administrador cierran desde el viaje con el `eid` de `listarEmergenciasViaje`.
- **Sin duplicar autorización.** Las afordancias solo ocultan gestos; el `bff` es autoridad (DEC-132).
