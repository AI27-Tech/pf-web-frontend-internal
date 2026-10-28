# Design Document

## Overview

Diseño de la **administración de catálogos** (E8-T16): la parte del panel interno donde el `administrador` lista, crea, edita y desactiva los valores de los cuatro catálogos —vehículos de AI27, custodios, catálogos de tipo y contratos/SLA—, con los valores **activos** como los únicos que la operación ofrece en solicitud, roster y bitácora, la **aptitud** mostrada como estatus informativo (nunca compuerta) y la **desactivación** modelada como un cambio de estado que no rompe la historia. Se construye sobre las convenciones ya establecidas en `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que el detalle del viaje (E8-T8) y el histórico (E8-T13), sin introducir patrones nuevos. Esta vista **reemplaza el stub existente** `src/routes/_private/catalogos.tsx` (creado en E5 como `StubPage`) por la pantalla real, sobre la misma ruta `/_private/catalogos`.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context@ba1abc3` (árbol limpio, al día). Contrato fijado por el frontend: `@ai27-tech/contracts@0.1.0-tracer.20`, `@ai27-tech/ui@0.2.0-beta.6`. El contrato se leyó contra el tag `v0.1.0-tracer.20` del repo de contratos (el checkout local está en la rama `pf-contracts-m`, no en el tag; el tag `.20` es también el último publicado, así que el frontend está al día).

El `bff` (`bff.yaml`) hoy **NO expone** la administración de catálogos. De este dominio solo tiene tres rutas: `GET /api/v1/clientes` (`listarClientes`, reenvía a `catalogos`), `POST /api/v1/clientes` (`crearCliente`) y `GET /api/v1/unidades` (lectura del roster de `operacion` para asignación). La superficie CRUD completa de los cuatro catálogos existe **solo en `catalogos.yaml`**, que el frontend no consume directo. Las operaciones que esta historia necesita, esperadas en el `bff` como reenvío a `catalogos`, son:

```
# Vehículos (E5-HU-021)
GET   /api/v1/vehiculos                 listarVehiculos     → PaginaVehiculos { items: Vehiculo[], cursor_siguiente }
POST  /api/v1/vehiculos                 crearVehiculo       body VehiculoEntrada { tipo, estado, cliente_id, ... } → 201 Vehiculo { id, tipo, estado, ... }
PATCH /api/v1/vehiculos/{id}            actualizarVehiculo  body VehiculoCambios → 200 Vehiculo   (edición Y desactivación = cambio de estado)
GET   /api/v1/vehiculos/{id}/aptitud    aptitudVehiculo     → aptitud (SOLO LECTURA, informativa — DEC-043/DEC-055)

# Custodios (E5-HU-022)
GET   /api/v1/custodios                 listarCustodios     → PaginaCustodios { items: Custodio[], cursor_siguiente }
POST  /api/v1/custodios                 crearCustodio       body CustodioEntrada { nombre, estado, ... } → 201 Custodio { id, nombre, estado }
PATCH /api/v1/custodios/{id}            actualizarCustodio  body CustodioCambios → 200 Custodio   (edición Y desactivación = cambio de estado)
GET   /api/v1/custodios/{id}/aptitud    aptitudCustodio     → aptitud (SOLO LECTURA, informativa)

# Catálogos de tipo (E5-HU-023)
GET   /api/v1/catalogos-tipo/{tipo}         listarValoresCatalogo   → ValorCatalogo[]
POST  /api/v1/catalogos-tipo/{tipo}         crearValorCatalogo      body ValorCatalogoEntrada → 201 ValorCatalogo { id, nombre, estado }
PATCH /api/v1/catalogos-tipo/{tipo}/{id}    actualizarValorCatalogo body ValorCatalogoCambios → 200 ValorCatalogo   (edición Y desactivación)

# Contratos / SLA (E5-HU-024)
POST  /api/v1/contratos         crearContrato     body ContratoEntrada { cliente_id, ... } → 201 Contrato { id, cliente_id, vigencia_desde, ... }
GET   /api/v1/contratos/{id}    obtenerContrato   → Contrato
PATCH /api/v1/contratos/{id}    actualizarContrato body ContratoCambios → 200 Contrato
POST  /api/v1/sla               crearSla          body SlaEntrada { contrato_id } → 201 Sla { id, contrato_id, ... }
GET   /api/v1/sla/{id}          obtenerSla        → Sla
PATCH /api/v1/sla/{id}          actualizarSla     body SlaCambios → 200 Sla
#   Campos required (tag .20): Vehiculo[id,tipo,estado], VehiculoEntrada[tipo,estado,cliente_id];
#                              Custodio[id,nombre,estado], CustodioEntrada[nombre,estado];
#                              Contrato[id,cliente_id,vigencia_desde], ContratoEntrada[cliente_id];
#                              Sla[id,contrato_id], SlaEntrada[contrato_id]; ValorCatalogo[id,nombre,estado].
#   Cada catálogo tiene su variante `XCambios` para el PATCH. El contenido funcional del SLA más allá
#   de estos campos está PENDIENTE (Brecha 3): no se inventan campos de SLA.
#   NO hay DELETE en el servicio: DESACTIVAR = PATCH .../{id} con estado activo → inactivo.
```

Consecuencia de diseño: la ausencia de estas operaciones en el `bff` se maneja como **brecha de contrato aislada** —tipos de wire esperados en una sola capa (`lib/contracts/catalogos.ts`) y mocks (MSW) que los sirven. Cuando el `bff` publique el contrato, se reemplazan esos tipos por los generados de `@ai27-tech/contracts/openapi/bff` —cambio de importación, no reescritura. Nada del resto del código asume más que el contrato esperado. Detalle y resolución en `BRECHAS.md`.

Dos propiedades del dominio son del `bff`/backend, no de la UI: la **autorización por rol** (`administrador`) y **alcance** de la administración (`403` cuando no procede), y la **atomicidad y auditoría** del cambio de estado al desactivar. La interfaz no las reimplementa: deriva la visibilidad del gesto del rol de sesión y clasifica las respuestas. Dos conceptos distintos del catálogo se representan como dos cosas separadas: la **aptitud** es dato informativo del propio catálogo (endpoints `/aptitud` en GET, DEC-043/DEC-055; nunca bloquea), mientras que la **disponibilidad** la resuelve la asignación en `operacion` y **no** se administra ni se muestra en esta vista.

## Architecture

### Vista de capas

```
routes/_private/catalogos.tsx     (ruta TanStack; REEMPLAZA el StubPage de E5 — misma ruta /_private/catalogos)
        │  usa
        ▼
features/catalogos/
  ├─ useCatalogos.ts            (hook: Query de la lista por catálogo + mutaciones alta/edición/desactivación)
  ├─ estadoAptitud.ts          (función pura: valor → presentación de estado activo/inactivo y aptitud; NO compuerta)
  ├─ valoresSeleccionables.ts  (función pura: lista de valores → solo los activos ofrecibles donde apliquen)
  ├─ CatalogoList.tsx          (presentación: lista filtrable y paginada de valores con su estado y aptitud)
  ├─ VehiculoForm.tsx          (alta/edición de vehículo: tipo coche/moto, económico, placas, marca)
  ├─ CustodioForm.tsx          (alta/edición de custodio: nombre, referencia opcional a identidad)
  ├─ ValorCatalogoForm.tsx     (alta/edición de un valor de catálogo de tipo: tipo + nombre + estado)
  ├─ ContratoForm.tsx          (alta/edición de contrato: cliente_id existente + campos sujetos a confirmación)
  └─ DesactivarDialog.tsx      (confirmación de desactivación; advierte "valor en uso" sin bloquear)
        │  usa
        ▼
lib/api/catalogos.ts           (wrappers: listar/crear/actualizar de los cuatro catálogos + aptitud en GET;
                                clasifica 403/409/404)
        │  usa
        ▼
lib/api/client.ts              (única puerta HTTP contra el bff — ya existe)
        │  tipos
        ▼
lib/contracts/catalogos.ts     (tipos de wire ESPERADOS; brecha de contrato aislada — único punto de cambio)
```

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                                                  | Componente                                               |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| Contenedor y secciones por catálogo                        | `Card`, `CardHeader`, `CardBody`                         |
| Listar valores con filtro y paginación                     | `Table`, `FilterTable`, `Pagination`                     |
| Estado activo/inactivo y aptitud (apto/no apto)            | `Badge`                                                  |
| Alta y edición de un valor                                 | `Form`, `FormField`, `FormRow`                           |
| Capturar texto (económico, placas, marca, nombre)          | `Input`, `Textarea`                                      |
| Elegir tipo de vehículo, tipo de catálogo, cliente         | `Select` (valores del enum del contrato / lista cargada) |
| Activar/inactivar en la edición                            | `Switch`                                                 |
| Acciones (crear, guardar, desactivar)                      | `Button`                                                 |
| Confirmar desactivación (incluye aviso "valor en uso")     | `Modal` + `Form`/`FormField`                             |
| Éxito / rechazo (`403`, valor en uso, cliente inexistente) | `Toast` + `ToastContainer`                               |
| Aclaración "aptitud informativa, no compuerta"             | `Tooltip` / texto                                        |

Verificación de la lista de la librería pendiente contra `@ai27-tech/ui@0.2.0-beta.6`, igual que en E8-T11/E8-T13; cualquier afordancia faltante (p. ej. un editor dedicado de líneas por cliente) se compone con primitivas y se registra como solicitud a la librería en `BRECHAS.md` (Brecha 5), **nunca** como componente local.

## Components and Interfaces

Componentes y responsabilidades:

- **`lib/contracts/catalogos.ts`** — tipos de wire esperados (`Vehiculo`, `VehiculoEntrada`, `VehiculoCambios`, `PaginaVehiculos`; `Custodio`, `CustodioEntrada`, `CustodioCambios`, `PaginaCustodios`; `ValorCatalogo`, `ValorCatalogoEntrada`, `ValorCatalogoCambios`; `Contrato`, `ContratoEntrada`, `ContratoCambios`; `Sla`, `SlaEntrada`, `SlaCambios`; enum cerrado del tipo de vehículo `coche`/`moto`; enum de estado `activo`/`inactivo`), documentados como brecha. Único punto de cambio cuando el `bff` publique el contrato. El contenido del SLA se mantiene al mínimo verificado (`id`, `contrato_id`): no se inventan campos (Brecha 3).
- **`lib/api/catalogos.ts`** — wrappers de las operaciones esperadas (`listarVehiculos`, `crearVehiculo`, `actualizarVehiculo`, `aptitudVehiculo`; `listarCustodios`, `crearCustodio`, `actualizarCustodio`, `aptitudCustodio`; `listarValoresCatalogo`, `crearValorCatalogo`, `actualizarValorCatalogo`; `crearContrato`, `obtenerContrato`, `actualizarContrato`; `crearSla`, `obtenerSla`, `actualizarSla`), delegando en `request` de `client.ts`. Traducen `403` (rol/alcance insuficiente), `409` (conflicto) y `404` (recurso inexistente, p. ej. cliente de un contrato) a clases de error, usando la clasificación de `lib/api/errors.ts`, para que la presentación decida la política. No contiene reglas de dominio ni llama a `catalogos` directo.
- **`features/catalogos/estadoAptitud.ts`** — función pura que traduce un valor del catálogo a su presentación: estado `activo`/`inactivo` y aptitud `apto`/`no apto` como estatus informativo. **No** deriva habilitación de acciones a partir de la aptitud; la aptitud nunca es compuerta (DEC-043/DEC-055).
- **`features/catalogos/valoresSeleccionables.ts`** — función pura `seleccionables(valores): Valor[]` que filtra a solo los valores `activos`, para alimentar selectores donde el catálogo se ofrece. No decide disponibilidad (eso es de `operacion`).
- **`features/catalogos/useCatalogos.ts`** — `useQuery` por catálogo (claves `['catalogos', catalogo, filtros]`, `retry: false`) + `useMutation` para alta, edición y desactivación, invalidando la lista del catálogo correspondiente al confirmar. Expone contrato plano a la presentación (`valores`, `cargando`, `vacio`, `error`, `esNoAutorizado`, `crear`, `editar`, `desactivar`, `reintentar`). La desactivación se envía como `PATCH` de estado, no como `DELETE`.
- **`features/catalogos/CatalogoList.tsx`** — composición de la lista por catálogo: `FilterTable` + `Pagination`, estado de cada valor y su aptitud con `Badge`, estados de carga y de catálogo vacío diferenciados, y los gestos de crear/editar/desactivar. Ramifica `esNoAutorizado` (delegar al AppShell/flujo de sesión) antes del error genérico.
- **`features/catalogos/{VehiculoForm,CustodioForm,ValorCatalogoForm,ContratoForm}.tsx`** — formularios de alta y edición por catálogo. Exigen los campos obligatorios confirmados (vehículo: económico, tipo; custodio: nombre; contrato: `cliente_id`) y marcan los campos sujetos a confirmación (placas; identificador y vigencia de contrato). `ContratoForm` exige un `cliente_id` existente (cargado por `GET /api/v1/clientes`) antes de enviar; no replica la regla de alcance. Ninguno ofrece la marca como catálogo (texto libre), ni "tipos de custodia"/"kit de seguridad" como catálogos de tipo, ni geometría de zonas de riesgo.
- **`features/catalogos/DesactivarDialog.tsx`** — `Modal` de confirmación de desactivación; cuando el valor está en uso, **advierte sin bloquear** y permite continuar; al confirmar envía el `PATCH` de estado. No presenta la desactivación como eliminación ni como alteración de los registros históricos.
- **`routes/_private/catalogos.tsx`** — `createFileRoute` que **reemplaza** el `StubPage` de E5 sobre la misma ruta; reutiliza la sesión y navegación del shell del panel interno (E8-T4).

## Data Models

Modelos de datos: son los **tipos de wire esperados** del contrato aún no expuesto por el `bff`, aislados en `lib/contracts/catalogos.ts` (Property 10, Brecha 1). Se declaran con el mínimo verificado contra el tag `v0.1.0-tracer.20`; el resto de campos llega cuando el `bff` publique, sin inventar nada.

| Tipo              | Campos verificados (required)        | Uso                                                      |
| ----------------- | ------------------------------------ | -------------------------------------------------------- |
| `Vehiculo`        | `id`, `tipo`, `estado`               | Valor del catálogo de vehículos en la lista              |
| `VehiculoEntrada` | `tipo`, `estado`, `cliente_id`       | Body de `crearVehiculo`                                  |
| `VehiculoCambios` | (parcial sobre `Vehiculo`)           | Body de `actualizarVehiculo` (edición y desactivación)   |
| `Custodio`        | `id`, `nombre`, `estado`             | Valor del catálogo de custodios                          |
| `CustodioEntrada` | `nombre`, `estado`                   | Body de `crearCustodio`                                  |
| `CustodioCambios` | (parcial sobre `Custodio`)           | Body de `actualizarCustodio`                             |
| `ValorCatalogo`   | `id`, `nombre`, `estado`             | Valor de un catálogo de tipo                             |
| `Contrato`        | `id`, `cliente_id`, `vigencia_desde` | Valor del catálogo de contratos                          |
| `ContratoEntrada` | `cliente_id`                         | Body de `crearContrato`                                  |
| `Sla`             | `id`, `contrato_id`                  | SLA ligado a un contrato (contenido pendiente, Brecha 3) |
| `SlaEntrada`      | `contrato_id`                        | Body de `crearSla`                                       |

Enums cerrados del contrato: tipo de vehículo `coche | moto`; estado `activo | inactivo`. Cada catálogo tiene su variante `XCambios` para el `PATCH`. La **aptitud** es un dato de solo lectura devuelto por los GET `/aptitud`, no un campo editable del valor.

## Correctness Properties

Propiedades candidatas a PBT.

_Una propiedad es una característica o comportamiento que debe sostenerse en todas las ejecuciones válidas del sistema: un enunciado formal de lo que el sistema debe hacer. Las propiedades son el puente entre la especificación legible por humanos y las garantías de corrección verificables por máquina._

### Property 1: Desactivar no elimina

_Para todo_ valor de catálogo, desactivarlo emite un `PATCH .../{id}` con estado `activo → inactivo` y **nunca** un `DELETE`; tras confirmarse, el valor sigue presente en la lista marcado `inactivo` y jamás desaparece como "eliminado".

**Validates: Requirements 5.2, 5.5, 5.6**

### Property 2: Solo los valores activos se ofrecen como seleccionables

_Para toda_ lista de valores de un catálogo, `seleccionables(valores)` devuelve exactamente los valores `activos` y ninguno `inactivo`, de modo que donde el catálogo se ofrece (solicitud, roster, bitácora) solo aparecen valores activos.

**Validates: Requirements 2.1**

### Property 3: La aptitud nunca es compuerta

_Para todo_ valor con cualquier aptitud (`apto` o `no apto`), `estadoAptitud` presenta la aptitud como estatus informativo y la habilitación de las acciones de administración es independiente de ella: ninguna acción se deshabilita por la aptitud.

**Validates: Requirements 2.5, 6.3, 7.3**

### Property 4: Enums cerrados solo ofrecen valores del contrato

_Para todo_ selector de tipo de vehículo, los valores ofrecidos son exactamente los del enum del contrato (`coche`, `moto`) y ninguno fuera de él; no hay captura de texto libre para ese campo.

**Validates: Requirements 6.1**

### Property 5: Obligatoriedad de campos confirmados

_Para toda_ entrada de alta o edición, el envío se permite si y solo si están presentes todos los campos obligatorios confirmados del catálogo (vehículo: económico y tipo; custodio: nombre; contrato: `cliente_id`); la ausencia de un campo sujeto a confirmación o de la referencia opcional del custodio a `identidad` **no** bloquea el envío.

**Validates: Requirements 3.2, 3.3, 4.2, 7.2**

### Property 6: Referencia a cliente existente antes de enviar

_Para toda_ alta de contrato (y de línea de transporte), si el `cliente_id` referenciado no existe entre los clientes cargados, el envío se impide; solo una referencia existente lo permite.

**Validates: Requirements 9.2, 8.3**

### Property 7: El rechazo del BFF conserva los datos capturados

_Para todo_ rechazo del BFF a un alta o edición (`403`, `409`, `404` u otro), la interfaz muestra el error, conserva los datos capturados y **no** presenta el valor como creado ni la edición como aplicada.

**Validates: Requirements 3.6, 4.5, 10.2**

### Property 8: No autorizado se clasifica y delega

_Para toda_ respuesta `403` de una operación de administración, el wrapper la clasifica como autorización insuficiente —no como error genérico— y la presentación delega el manejo al flujo vigente de sesión/autorización del panel, en lugar de resolver la autorización en el cliente.

**Validates: Requirements 1.2**

### Property 9: Confirmación idempotente mientras la operación está en curso

_Para toda_ operación de lista, alta, edición o desactivación en curso, la confirmación correspondiente queda deshabilitada: un segundo disparo del mismo gesto no produce una segunda solicitud.

**Validates: Requirements 10.1**

### Property 10: La brecha de contrato está aislada

_Para todo_ tipo de wire usado por la administración de catálogos, su definición vive en `lib/contracts/catalogos.ts`, y toda la comunicación sale por `lib/api/client.ts` contra el `bff`: no existe ninguna ruta directa a `catalogos` ni endpoint inventado. Reemplazar los tipos por los generados de `@ai27-tech/contracts/openapi/bff` es un cambio de importación, no una reescritura.

**Validates: Requirements 3.5, 4.4, 5.3, 9.4**

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `src/mocks/handlers.ts` para servir el contrato esperado de los cuatro catálogos:

- listado, alta, edición y desactivación de vehículos, custodios, valores de catálogo de tipo y contratos/SLA (cada valor con su estado `activo`/`inactivo`; vehículos y custodios con su aptitud en el GET `/aptitud`);
- un caso de **desactivación de un valor en uso** que devuelve éxito y conserva el valor presente marcado `inactivo`, para probar que la UI advierte sin bloquear (Requirement 5.4) y que no se elimina (Property 1);
- un caso que fuerza `403` por rol no `administrador` en una operación de escritura, para probar Requirements 1.2 y la Property 8;
- un caso de **alta de contrato con `cliente_id` inexistente** que la UI rechaza antes o que el `bff` rechaza con `404`, para probar Requirements 9.2 y la Property 6;
- un catálogo **vacío** y un estado de **carga** diferenciados, para Requirements 2.2 y 2.3.

Los datos de prueba son ilustrativos, no autoritativos: los valores reales los aporta Operación (Brecha 2) y el contenido funcional del SLA está pendiente (Brecha 3); los mocks no inventan campos de SLA más allá de los verificados.

## Error Handling

La interfaz no resuelve el dominio: clasifica lo que el `bff` responde y decide la presentación. `lib/api/catalogos.ts` traduce, con la ayuda de `lib/api/errors.ts`:

- **`403` (rol/alcance insuficiente):** se clasifica como autorización insuficiente y se delega al flujo vigente de sesión/autorización del panel (Property 8, Requirement 1.2), no se muestra como error genérico.
- **`404` (referencia inexistente, p. ej. `cliente_id` de un contrato):** impide presentar el valor como creado y señala la referencia faltante (Property 6, Requirement 9.2).
- **`409` (conflicto):** se muestra como conflicto sin colapsarlo en un error genérico.
- **Rechazo general de escritura:** se conservan los datos capturados y no se marca el valor como creado ni la edición como aplicada (Property 7, Requirements 3.6, 4.5, 10.2).
- **Sesión expirada (`401`):** se delega al flujo de sesión del panel (Requirement 10.3).
- **Operación de administración no expuesta por el `bff`:** se reporta la brecha (Brecha 1) y **no** se llama a `catalogos` directo ni se inventa endpoint (Property 10, Requirements 3.5, 4.4, 5.3).

Durante cualquier operación en curso la confirmación queda deshabilitada para impedir envíos duplicados (Property 9, Requirement 10.1), y el éxito muestra aviso y el estado resultante del valor (Requirement 10.4).

## Testing Strategy

Enfoque dual, igual que E8-T13:

- **Pruebas unitarias (ejemplos y casos de borde):** render de cada formulario y de la lista; estados de carga y vacío diferenciados (Requirements 2.2, 2.3); filtro y paginación (2.4); confirmación de desactivación y aviso de "valor en uso" sin bloquear (5.1, 5.4); éxito con aviso y estado resultante (10.4); montaje bajo el shell (1.3); ausencia de afordancias fuera de alcance (marca como catálogo, nivel/tipo de custodio, geometría de zonas, "tipos de custodia"/"kit de seguridad", campos de SLA no verificados). Se mantienen acotadas; las propiedades cubren el espacio amplio de entradas.
- **Pruebas basadas en propiedades (PBT):** se implementa una por cada propiedad de la sección Correctness Properties con una librería de PBT del ecosistema (p. ej. `fast-check`), **sin** implementar PBT desde cero. Cada prueba corre **mínimo 100 iteraciones** y se etiqueta con un comentario que referencia la propiedad del diseño, con el formato **Feature: e8-t16-administracion-catalogos, Property {número}: {texto}**. Las propiedades aplican a las funciones puras (`estadoAptitud`, `valoresSeleccionables`, validación de obligatoriedad y de referencia) y a la construcción de mutaciones (desactivar como `PATCH` de estado, nunca `DELETE`), usando mocks (MSW) para la frontera HTTP.

Los enunciados estructurales y de brecha (Property 10) se verifican además con pruebas de arquitectura (los wrappers delegan en `client.ts`, no existe ruta directa a `catalogos`).

## Decisiones

- **Brecha aislada en una capa:** toda la incertidumbre de contrato vive en `lib/contracts/catalogos.ts` + mocks; el resto del código asume solo el contrato esperado y habla únicamente con el `bff` vía `client.ts`. Reemplazo mecánico cuando el `bff` publique la superficie de administración, igual que en E8-T8/E8-T13.
- **Desactivar = `PATCH` de estado, no `DELETE`:** el servicio no tiene borrado; desactivar cambia el estado `activo → inactivo` y preserva la historia. Es la propiedad probatoria central de E8-T16.
- **Aptitud informativa, nunca compuerta:** la aptitud (dato del catálogo, DEC-043/DEC-055) se muestra con `Badge` y no deshabilita ninguna acción.
- **Aptitud (catálogo) y disponibilidad (asignación) separadas:** la disponibilidad la resuelve `operacion` y no aparece en esta vista; se representan como dos cosas distintas para no confundirlas.
- **Valores reales, SLA y modelado de líneas/GPS pendientes y condicionados a brechas:** la UI se construye sin inventar valores ni campos; consume la forma que el contrato publique (Brechas 2, 3 y 4).
- **Reemplaza el stub de E5:** la ruta `/_private/catalogos` pasa de `StubPage` a la pantalla real, misma ruta.
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; cualquier afordancia faltante se reporta como brecha de UI (Brecha 5), nunca componente local.
- **Rol como ayuda, `bff` como autoridad:** la visibilidad del gesto y la validación de referencia son conveniencia de interfaz; la autorización, el alcance, la atomicidad y la auditoría son del `bff`/backend.
