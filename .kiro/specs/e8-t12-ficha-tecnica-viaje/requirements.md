# Requirements Document

## Introduction

**Ficha técnica del viaje (E8-T12)** permite al `monitorista` de la mesa de bitácora capturar y editar, desde el panel interno, la ficha técnica del servicio, para que el expediente del `viaje` quede completo aunque la custodia reporte por teléfono o radio. La funcionalidad implementa el comportamiento confirmado de `E1-HU-006`: el usuario interno captura y edita la ficha; la ficha refleja la **escolta** (una o más `unidades` del roster) sin recapturar custodios sueltos; el **tracto del cliente** es texto libre; el viaje admite **varios destinos (1..N)** y **0..N contenedores**; la **lista de GPS** se elige del catálogo registrado (DEC-047); la bitácora es **editable** con **activación manual** en V1 (DEC-043); y `cuenta espejo`, `clave_amago` y `kit de seguridad` **no existen** en V1 (DEC-009, DEC-039, DEC-047).

Este documento define el comportamiento funcional del frontend interno. El frontend no inventará endpoints, payloads, campos, catálogos ni componentes compartidos. La UI captura y edita, representa el resultado confirmado por el servidor y clasifica respuestas; autorización, alcance, atomicidad, auditoría y persistencia pertenecen al BFF y al dominio.

**Hallazgo de verificación.** El comportamiento funcional de E8-T12 **está decidido** en el repo de contexto (commit `ba1abc3`): ficha editable e incremental (DEC-011, DEC-043), destinos 1..N y contenedores 0..N (DEC-012, DEC-013), lista de GPS del catálogo registrado (DEC-012 #3 + DEC-047 #2, que cierra el antiguo punto abierto de GPS), tracto texto libre (DEC-011 #2, DEC-044 #6) y exclusiones de `cuenta espejo`/`clave_amago`/`kit de seguridad` (DEC-009, DEC-039, DEC-047 #3). Ninguna de estas es una decisión de producto pendiente.

Lo que está **pendiente es la superficie contractual**, no la decisión. Contra el contrato instalado (`@ai27-tech/contracts@0.1.0-tracer.20`, verificado en el tag `v0.1.0-tracer.20` del repo `pf-pkg-contracts`), el `bff` **no expone escritura ni edición de la ficha técnica**, ni campos para **contenedores**, **tracto del cliente** o **lista de GPS del catálogo**. Lo único disponible es la lectura del detalle interno (`obtenerViajeInterno` → `ViajeDetalle`), limitada a `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id`, `fecha_hora_servicio`, `eta_estimado` y condiciones activas; y la proyección de solo lectura `FichaTecnicaDescarga` usada por la descarga del expediente (E6-T3). Por lo tanto la capacidad central de E8-T12 —capturar y editar la ficha— queda **condicionada a una brecha de contrato** documentada en `BRECHAS.md`, no a una decisión de negocio. Este documento especifica el comportamiento decidido sin inventar la superficie faltante; los requisitos de escritura quedan marcados como condicionados a la brecha de contrato.

Pendientes de producto reales (dueño Operación, ver `BRECHAS.md` P-1 y P-2): los campos exactos de la `unidad` en la ficha y la obligatoriedad por campo. Son los únicos puntos genuinamente abiertos.

## Glossary

- **FichaTecnica_UI**: flujo del panel interno para capturar y editar la ficha técnica de un `viaje`.
- **Monitorista (`monitorista`)**: actor interno de la mesa de bitácora que captura y edita la ficha (DEC-008).
- **Viaje**: servicio de custodia cuyo expediente incluye la ficha técnica.
- **Ficha técnica**: expediente de datos del servicio (datos generales, escolta, tracto, destinos, contenedores, lista de GPS) distinto del histórico de bitácora (E8-T13).
- **Escolta**: conjunto de una o más `unidades` asignadas al viaje (E1-HU-004 / E8-T10), cada una un paquete pre-armado de vehículo + custodios.
- **Unidad**: paquete del roster (vehículo + custodios) que integra la escolta; se muestra derivada de la asignación y no se recaptura.
- **Tracto del cliente**: identificación del tractocamión del cliente, capturada como **texto libre** (DEC-011/DEC-017).
- **Contenedor**: dato repetible (0..N) de la ficha.
- **Destino**: parada del viaje; la ficha admite 1..N destinos ordenados.
- **Lista de GPS**: referencia a dispositivos elegidos del **catálogo registrado** de GPS (DEC-047); sin ingestión ni seguimiento en vivo.
- **Activación manual**: en V1 la bitácora se activa manualmente; no hay disparo por telemetría (DEC-043).
- **Campo excluido de V1**: `cuenta espejo` (DEC-009), `clave_amago` (DEC-039) y `kit de seguridad` (DEC-047 §F.1); no existen campos, DOM, payloads ni contrato para ellos.
- **BFF**: backend-for-frontend; única frontera de datos del panel interno. Aplica autorización, alcance, validación y persistencia.
- **Brecha contractual**: capacidad que la tarea requiere y el contrato verificado no ofrece; se reporta, no se rellena (ver `BRECHAS.md`).

## Requirements

### Requirement 1: Acceso al flujo de ficha técnica

**User Story:** Como `monitorista`, quiero abrir la ficha técnica de un viaje de mi alcance, para capturar o completar su expediente.

#### Acceptance Criteria

1. WHEN un usuario autorizado con rol `monitorista` abre la ficha técnica de un viaje de su alcance, THE FichaTecnica_UI SHALL mostrar la ficha con los datos que el BFF devuelva.
2. IF un usuario no autorizado o fuera del alcance intenta abrir o guardar la ficha, THEN THE FichaTecnica_UI SHALL impedir la operación y delegar el manejo de sesión o autorización al flujo vigente del panel interno.
3. THE FichaTecnica_UI SHALL tratar la ficha técnica y el histórico de bitácora (E8-T13) como dos superficies distintas y SHALL NOT capturar entradas de histórico en este flujo.

### Requirement 2: Lectura de la ficha

**User Story:** Como `monitorista`, quiero ver los datos ya conocidos del viaje, para no recapturar lo que el servicio ya tiene.

#### Acceptance Criteria

1. WHEN la ficha se abre, THE FichaTecnica_UI SHALL mostrar los datos del viaje que el BFF entregue mediante la operación de lectura verificada, incluyendo origen, destinos y los campos de servicio disponibles.
2. THE FichaTecnica_UI SHALL representar la **escolta** como derivada de la asignación (E8-T10 / E1-HU-004) y SHALL NOT ofrecer recaptura de custodios ni de patrulla como recursos sueltos.
3. WHILE la ficha se carga, THE FichaTecnica_UI SHALL mostrar un estado de carga diferenciado de una ficha vacía o inexistente.
4. IF la lectura falla o el viaje no existe o está fuera de alcance, THEN THE FichaTecnica_UI SHALL mostrar el estado correspondiente y SHALL NOT presentar datos inventados.

### Requirement 3: Captura y edición de la ficha (condicionado a brecha)

**User Story:** Como `monitorista`, quiero capturar y editar la ficha técnica con los datos faltantes, para dejar el expediente completo aunque la custodia reporte por teléfono.

#### Acceptance Criteria

1. WHEN exista una operación contractual verificada de escritura o edición de la ficha, THE FichaTecnica_UI SHALL permitir capturar y editar los datos de la ficha y SHALL enviar la escritura usando únicamente esa operación. **(Condicionado a la Brecha 1 de `BRECHAS.md`.)**
2. THE FichaTecnica_UI SHALL permitir edición incremental: guardar la ficha con datos faltantes y completarlos después, conforme a DEC-043. **(Condicionado a la Brecha 1.)**
3. WHEN el BFF confirme la escritura, THE FichaTecnica_UI SHALL representar la ficha según la respuesta del servidor y SHALL NOT inferir el resultado a partir del estado local del formulario. **(Condicionado a la Brecha 1.)**
4. IF el BFF rechaza la escritura, THEN THE FichaTecnica_UI SHALL mostrar un error accionable, SHALL conservar los datos capturados y SHALL NOT presentar la ficha como guardada. **(Condicionado a la Brecha 1.)**
5. WHILE no exista la operación de escritura en el contrato, THE FichaTecnica_UI SHALL NOT inventar un endpoint, payload o campo de ficha, SHALL reportar la brecha y SHALL operar en modo de solo lectura sobre lo que el contrato sí expone.

### Requirement 4: Tracto del cliente como texto libre

**User Story:** Como `monitorista`, quiero capturar el tracto del cliente como texto libre, para registrarlo sin depender de un catálogo.

#### Acceptance Criteria

1. WHEN la captura del tracto esté disponible por contrato, THE FichaTecnica_UI SHALL capturar el tracto del cliente como **texto libre** y SHALL NOT exigir una selección de catálogo para ese dato. **(Condicionado a la Brecha 1.)**
2. THE FichaTecnica_UI SHALL conservar el valor capturado de tracto tal como el usuario lo ingrese, sujeto a las reglas de validación confirmadas.

### Requirement 5: Destinos y contenedores como grupos repetibles

**User Story:** Como `monitorista`, quiero agregar y quitar destinos y contenedores, para reflejar viajes multi-parada con carga variable.

#### Acceptance Criteria

1. THE FichaTecnica_UI SHALL permitir conservar uno o más destinos ordenados y SHALL mostrar los destinos que el BFF devuelva en la lectura.
2. WHEN exista superficie de escritura de ficha, THE FichaTecnica_UI SHALL permitir **agregar y quitar destinos** conservando orden y cardinalidad (1..N). **(Condicionado a la Brecha 1.)**
3. WHEN exista superficie de escritura de ficha, THE FichaTecnica_UI SHALL permitir **agregar y quitar contenedores** (0..N) como grupo repetible. **(Condicionado a la Brecha 1 y a la Brecha 2: el contrato no modela contenedores.)**
4. THE FichaTecnica_UI SHALL permitir una ficha con **cero contenedores** sin tratarlo como error.

### Requirement 6: Lista de GPS desde catálogo registrado

**User Story:** Como `monitorista`, quiero elegir los GPS del catálogo registrado, para referenciar los dispositivos sin teclearlos.

#### Acceptance Criteria

1. WHEN exista superficie contractual de la lista de GPS, THE FichaTecnica_UI SHALL permitir **elegir** dispositivos del **catálogo registrado** de GPS y SHALL NOT permitir teclearlos como texto libre (DEC-047). **(Condicionado a la Brecha 3.)**
2. THE FichaTecnica_UI SHALL tratar la lista de GPS como **referencia** y SHALL NOT implicar seguimiento ni ingestión en vivo.
3. WHILE el catálogo de GPS se carga, THE FichaTecnica_UI SHALL mostrar un estado de carga diferenciado de un catálogo vacío.

### Requirement 7: Campos excluidos de V1

**User Story:** Como Product Management, quiero que los campos excluidos no existan en la ficha, para que el expediente V1 no capture datos prohibidos.

#### Acceptance Criteria

1. THE FichaTecnica_UI SHALL NOT presentar campo, sección, control ni DOM para `cuenta espejo` (DEC-009).
2. THE FichaTecnica_UI SHALL NOT presentar campo, sección, control ni DOM para `clave_amago` (DEC-039).
3. THE FichaTecnica_UI SHALL NOT presentar campo, sección, control ni DOM para `kit de seguridad` (DEC-047 §F.1).
4. THE FichaTecnica_UI SHALL NOT incluir en ningún payload que construya valores de `cuenta espejo`, `clave_amago` ni `kit de seguridad`.
5. THE FichaTecnica_UI SHALL NOT presentar campos de posición ni de señal en la ficha (fuera de alcance V1).

### Requirement 8: Estados de interfaz y errores

**User Story:** Como `monitorista`, quiero conocer el estado de la lectura y del guardado, para corregir sin perder lo capturado.

#### Acceptance Criteria

1. WHILE una lectura o un catálogo se carga, THE FichaTecnica_UI SHALL mostrar un estado de carga diferenciado de vacío.
2. WHILE un guardado está en curso, THE FichaTecnica_UI SHALL deshabilitar la confirmación y SHALL impedir guardados duplicados.
3. IF una lectura o un guardado falla, THEN THE FichaTecnica_UI SHALL mostrar un error accionable y SHALL conservar los datos capturados cuando el flujo de sesión lo permita.
4. IF la sesión expira durante el flujo, THEN THE FichaTecnica_UI SHALL delegar el manejo al flujo de sesión vigente del panel interno.
5. WHEN un guardado termina exitosamente, THE FichaTecnica_UI SHALL mostrar un aviso de éxito y la ficha actualizada según la respuesta del BFF.

## Escenarios

### Escenarios positivos

**Escenario 1. Lectura de ficha con escolta derivada**
Dado que un viaje tiene escolta asignada, cuando el `monitorista` abre la ficha, entonces la interfaz muestra origen, destinos y la escolta derivada de la asignación, sin ofrecer recaptura de custodios sueltos.

**Escenario 2. Captura incremental (condicionado a brecha)**
Dado que existe la operación de escritura de ficha, cuando el `monitorista` guarda la ficha con datos faltantes y después los completa, entonces la interfaz permite ambos guardados y refleja lo que el BFF confirma.

**Escenario 3. Multi-destino y contenedores (condicionado a brecha)**
Dado que existe superficie de escritura y de contenedores, cuando el `monitorista` agrega varios destinos y varios contenedores y guarda, entonces la ficha conserva orden y cardinalidad.

**Escenario 4. Lista de GPS desde catálogo (condicionado a brecha)**
Dado que existe superficie de la lista de GPS, cuando el `monitorista` elige dispositivos del catálogo registrado, entonces la interfaz referencia los dispositivos sin permitir texto libre y sin implicar seguimiento en vivo.

### Escenarios negativos y de borde

**Escenario 5. Campos excluidos ausentes**
Dado que el `monitorista` abre la ficha, cuando revisa los campos disponibles, entonces no existe campo, sección ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, y ningún payload los incluye.

**Escenario 6. Ficha sin contenedores**
Dado que un viaje no lleva contenedores, cuando el `monitorista` guarda la ficha, entonces cero contenedores es un resultado válido y no un error.

**Escenario 7. Guardado rechazado (condicionado a brecha)**
Dado que existe superficie de escritura, cuando el BFF rechaza el guardado, entonces la interfaz muestra el error, conserva los datos capturados y no presenta la ficha como guardada.

**Escenario 8. Doble guardado**
Dado que un guardado está en curso, cuando el usuario intenta guardar otra vez, entonces la interfaz mantiene el control deshabilitado y produce una sola solicitud.

**Escenario 9. Contrato incompleto**
Dado que el contrato no expone escritura de ficha, contenedores o lista de GPS, cuando el `monitorista` abre la ficha, entonces la interfaz opera en solo lectura sobre lo disponible, reporta la brecha y no inventa endpoints ni campos.

## Dependencias

- `E1-HU-006`: comportamiento funcional confirmado de la ficha técnica.
- `E8-T10` / `E1-HU-004`: escolta asignada que la ficha refleja (derivada, no recapturada).
- `E5-T1`/`E5-T2` y E5-HU-021/022/023: catálogos (GPS, líneas de transporte) que la ficha referencia.
- `E1-T5`: ficha técnica tal como la expone `operacion`.
- Contrato generado (`@ai27-tech/contracts`) y componentes de `@ai27-tech/ui`: verificados antes de implementar.
- Flujo vigente de sesión, navegación y detalle del viaje del panel interno.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del BFF.
- Capturar `cuenta espejo`, `clave_amago` o `kit de seguridad` (no existen en V1).
- Capturar campos de posición o de señal.
- Registrar notas, estadías o incidencias del histórico (eso es E8-T13).
- Recapturar custodios o patrulla como recursos sueltos; la escolta se deriva de la asignación.
- Activación automática de la bitácora por telemetría (V2).
- Ingestión o seguimiento en vivo de GPS.
- Resolver en el frontend autorización, alcance, atomicidad, persistencia o auditoría del dominio.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas de producto. Si una verificación no está disponible, se documenta la brecha en `BRECHAS.md` y no se inventa una alternativa. Todas verificadas contra `@ai27-tech/contracts@0.1.0-tracer.20` (tag `v0.1.0-tracer.20`) y `@ai27-tech/ui@0.2.0-beta.6`.

- **Lectura (verificada):** el BFF expone `obtenerViajeInterno` (`GET /api/v1/viajes/{id}/detalle`) → `ViajeDetalle` con `viaje` (`ViajeInterno`: `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`, `creado_en`) y `condiciones_activas[]`. Es la base de solo lectura disponible.
- **Escolta (verificada):** `GET /api/v1/viajes/{id}/asignacion` (`asignarRecursos`/espejo) y `listarUnidades` (`GET /api/v1/unidades`) dan la escolta/roster; la ficha representa la escolta derivada, no la recaptura.
  Las brechas 1–4 son de **contrato, no de decisión**: el comportamiento está decidido (se cita la DEC) y falta publicar la superficie en el `bff`.

- **Brecha 1 — escritura/edición de ficha (decidida en DEC-011/DEC-043; contrato pendiente):** el BFF **no** expone ninguna operación `PUT`/`PATCH`/`POST` de ficha técnica que capture o edite los datos. `FichaTecnicaDescarga` es solo lectura para la descarga del expediente (E6-T3). Ver `BRECHAS.md` Brecha 1.
- **Brecha 2 — contenedores (decididos 0..N en DEC-012 #2; contrato pendiente):** el contrato no modela contenedores en ningún schema del viaje. Ver `BRECHAS.md` Brecha 2.
- **Brecha 3 — lista de GPS de catálogo (decidida en DEC-012 #3 / DEC-047 #2; contrato pendiente):** el BFF no expone la superficie para elegir GPS del catálogo registrado ni asociarlos a la ficha. Ver `BRECHAS.md` Brecha 3.
- **Brecha 4 — tracto del cliente (decidido texto libre en DEC-011 #2 / DEC-044 #6; contrato pendiente):** no hay campo de tracto en la lectura ni en ninguna entrada de escritura disponible. Ver `BRECHAS.md` Brecha 4.
- **Pendiente de producto P-1 (realmente abierto):** los **campos exactos** de la `unidad` que muestra la ficha están abiertos en `propuesta-modelo-bitacora-v1.md §4 #8`, con dueño Operación. La escolta se muestra derivada de la asignación y no se recaptura; los campos mostrados quedan sujetos a esa definición. Ver `BRECHAS.md` P-1.
- **Pendiente de producto P-2 (realmente abierto):** la **obligatoriedad por campo** (incluidos destinos y contenedores) está abierta en `propuesta-modelo-bitacora-v1.md §4 #7` y la Nota de DEC-012. La UI solo fuerza obligatorios confirmados; mientras tanto admite datos faltantes (DEC-043). Ver `BRECHAS.md` P-2.
- **Librerías compartidas (verificado):** `@ai27-tech/ui@0.2.0-beta.6` ofrece `Form`/`FormSection`/`FormRow`/`FormActions`, `Input`/`Textarea`/`Select`/`Checkbox`/`Radio`/`Switch`/`FormField`, `Button`, `Table`, `Modal`, `Toast`, `Badge`, `Card`, `Pagination`, `FilterTable`, `Navbar`, `Sidebar`, `Tooltip`. **Sin componente dedicado de grupo repetible ni de multiselección de catálogo:** los grupos de destinos/contenedores y la selección de GPS se componen con primitivas (`FormRow` + `Input`/`Textarea` + `Button` para agregar/quitar; `Table`/`Card` + `Checkbox` para selección múltiple), nunca con un componente local nuevo; un control dedicado sería una solicitud a la librería.

## Trazabilidad

- Acceso y separación ficha/histórico: Requirement 1 y escenario 1.
- Lectura y escolta derivada: Requirement 2 y escenario 1.
- Captura/edición incremental: Requirement 3 y escenarios 2, 7, 9 (condicionados a Brecha 1).
- Tracto texto libre: Requirement 4 (condicionado a Brecha 1/4).
- Destinos y contenedores repetibles: Requirement 5 y escenarios 3, 6 (contenedores condicionados a Brecha 2).
- Lista de GPS de catálogo: Requirement 6 y escenario 4 (condicionado a Brecha 3).
- Campos excluidos ausentes: Requirement 7 y escenario 5.
- Estados y errores: Requirement 8 y escenarios 7, 8.
- Contrato incompleto y no invención: Requirement 3.5 y escenario 9.
