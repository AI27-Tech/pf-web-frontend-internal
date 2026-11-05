# Requirements Document

## Introduction

**Crear viaje por Operación (E8-T11)** permite al `jefe_operativo` registrar desde el panel interno un `viaje` para un `cliente`, atendiendo solicitudes recibidas fuera del portal self-service. La funcionalidad implementa el comportamiento confirmado de `E1-HU-028`: crear un viaje con cliente, origen, uno o más destinos y fecha/hora; opcionalmente asignar una o más `unidades`; dejar el viaje en `APROBADO` sin asignación o en `ASIGNADO` con asignación confirmada; y conservar atomicidad de la reserva cuando la asignación participa en la creación.

El contrato verificado (`@ai27-tech/contracts`, operaciones `crearViaje` y `asignarRecursos` del BFF) modela el caso con asignación como **dos operaciones encadenadas**: `crearViaje` deja el viaje en `APROBADO` y `asignarRecursos` reserva la escolta en una escritura atómica que lleva el viaje de `APROBADO` a `ASIGNADO`. La atomicidad exigida por `E1-HU-028`/DEC-026 (todas las unidades o ninguna) la garantiza el BFF dentro de `asignarRecursos`; el frontend no reparte ni repara reservas, solo encadena las dos operaciones que el contrato define y clasifica su resultado.

Este documento define el comportamiento funcional del frontend interno. Las notas de brecha están separadas al final y no agregan reglas de producto. El frontend no inventará endpoints, payloads, campos, catálogos ni componentes compartidos.

## Glossary

- **CrearViaje_UI**: flujo del panel interno para capturar y confirmar la creación de un viaje por Operación.
- **Jefe Operativo (`jefe_operativo`)**: actor interno autorizado para crear viajes por Operación.
- **Viaje**: servicio de custodia registrado para un cliente.
- **Cliente**: organización para la que se registra el viaje.
- **Unidad**: recurso seleccionable para integrar la escolta del viaje.
- **Escolta**: conjunto de una o más unidades asignadas al viaje.
- **APROBADO**: estado resultante de crear el viaje sin escolta.
- **ASIGNADO**: estado resultante de crear el viaje con una escolta confirmada.
- **Atomicidad de la reserva**: condición, garantizada por el BFF dentro de `asignarRecursos`, en la que todas las unidades de la escolta se reservan juntas o ninguna se reserva. No existe reserva parcial.
- **crearViaje**: operación contractual del BFF que registra el viaje y lo deja en `APROBADO`. No acepta unidades.
- **asignarRecursos**: operación contractual del BFF que reserva la escolta sobre un viaje ya creado y lo lleva de `APROBADO` a `ASIGNADO` en una escritura atómica.
- **Aptitud**: información operativa de una unidad que no bloquea la creación o asignación en V1.
- **BFF**: backend-for-frontend que recibe la solicitud y aplica autorización, alcance y reglas de dominio.

## Requirements

### Requirement 1: Acceso al flujo

**User Story:** Como `jefe_operativo`, quiero abrir el flujo de creación por Operación, para registrar viajes solicitados por canales internos.

#### Acceptance Criteria

1. WHEN un usuario autorizado con rol `jefe_operativo` abre el flujo de creación por Operación, THE CrearViaje_UI SHALL mostrar el formulario de creación.
2. IF un usuario no autorizado intenta abrir o enviar el flujo, THEN THE CrearViaje_UI SHALL impedir la creación y delegar el manejo de sesión o autorización al flujo vigente del panel interno.
3. THE CrearViaje_UI SHALL permitir seleccionar un cliente desde las opciones disponibles del BFF y SHALL mantener el cliente como un dato seleccionado, no como texto libre.

### Requirement 2: Captura de datos

**User Story:** Como `jefe_operativo`, quiero capturar los datos esenciales del servicio, para crear un viaje completo para un cliente.

#### Acceptance Criteria

1. THE CrearViaje_UI SHALL permitir capturar un cliente, un origen, uno o más destinos y la fecha/hora del servicio.
2. THE CrearViaje_UI SHALL exigir cliente, origen, al menos un destino y fecha/hora antes de enviar la creación.
3. IF falta cualquiera de los datos obligatorios, THEN THE CrearViaje_UI SHALL impedir el envío y señalar el dato faltante.
4. THE CrearViaje_UI SHALL conservar el orden y la cantidad de destinos capturados al preparar la solicitud.
5. THE CrearViaje_UI SHALL aplicar únicamente las reglas adicionales de `E1-HU-001` que estén confirmadas; los datos no confirmados quedan sujetos a la Nota de brechas.

### Requirement 3: Creación sin asignación

**User Story:** Como `jefe_operativo`, quiero crear un viaje sin asignar unidades, para dejarlo listo en estado `APROBADO`.

#### Acceptance Criteria

1. WHEN el `jefe_operativo` confirma datos válidos sin unidades seleccionadas, THE CrearViaje_UI SHALL enviar una solicitud de creación mediante la operación contractual verificada.
2. WHEN el BFF confirma la creación sin asignación, THE CrearViaje_UI SHALL mostrar el viaje en estado `APROBADO`.
3. WHEN la creación sin asignación es confirmada, THE CrearViaje_UI SHALL permitir continuar el flujo sin exigir una aprobación manual posterior.
4. IF el BFF rechaza la creación, THEN THE CrearViaje_UI SHALL mostrar el error y SHALL NOT presentar el viaje como creado.

### Requirement 4: Creación con asignación opcional

**User Story:** Como `jefe_operativo`, quiero seleccionar una o más unidades durante la creación, para dejar el viaje en estado `ASIGNADO` cuando la escolta esté disponible.

#### Acceptance Criteria

1. WHEN el `jefe_operativo` abre la selección de escolta, THE CrearViaje_UI SHALL mostrar las unidades disponibles que entregue el BFF mediante la operación contractual verificada de roster.
2. THE CrearViaje_UI SHALL permitir seleccionar una o más unidades como una escolta y SHALL NOT requerir selectores separados de custodios o patrulla.
3. WHEN el `jefe_operativo` confirma datos válidos con una o más unidades, THE CrearViaje_UI SHALL ejecutar `crearViaje` y, usando el identificador devuelto, encadenar `asignarRecursos` con las unidades seleccionadas, usando únicamente las operaciones contractuales verificadas.
4. WHEN el BFF confirma la asignación mediante `asignarRecursos`, THE CrearViaje_UI SHALL mostrar el viaje en estado `ASIGNADO` y SHALL representar la escolta confirmada que devuelve la respuesta.
5. IF `crearViaje` tiene éxito pero `asignarRecursos` falla o no puede confirmarse, THEN THE CrearViaje_UI SHALL mostrar el fallo de la asignación, SHALL conservar los datos capturados, SHALL representar el viaje creado en `APROBADO` según la respuesta del BFF y SHALL NOT presentar una reserva parcial como resultado exitoso.
6. THE CrearViaje_UI SHALL NOT reintentar automáticamente ni emitir una operación de compensación cuando `asignarRecursos` falle; la recuperación queda a cargo del usuario sobre el viaje ya creado en `APROBADO`.
7. THE CrearViaje_UI SHALL permitir continuar con una creación sin asignación (solo `crearViaje`) cuando el usuario quite las unidades seleccionadas y los demás datos sigan siendo válidos.
8. THE CrearViaje_UI SHALL NOT bloquear la creación ni la asignación únicamente por la aptitud conocida, desconocida o no apta de una unidad.

### Requirement 5: Atomicidad de la reserva y resultado

**User Story:** Como Product Management, quiero que la reserva de la escolta sea atómica, para evitar reservas incompletas.

#### Acceptance Criteria

1. WHEN una asignación es confirmada por el BFF mediante `asignarRecursos`, THE CrearViaje_UI SHALL considerar `ASIGNADO` exitoso únicamente ante una respuesta que confirme el viaje `ASIGNADO` y la escolta correspondiente.
2. IF el BFF rechaza la asignación o informa que la reserva atómica no se confirmó, THEN THE CrearViaje_UI SHALL mostrar el fallo y SHALL NOT presentar una reserva parcial; el viaje creado por `crearViaje` conserva el estado `APROBADO` que devuelve el BFF.
3. THE CrearViaje_UI SHALL usar el estado y el identificador devueltos por el BFF para representar el resultado y SHALL NOT inferir `APROBADO` o `ASIGNADO` a partir de la selección local.
4. THE CrearViaje_UI SHALL tratar `crearViaje` y `asignarRecursos` como las únicas operaciones de este flujo y SHALL NOT emitir una tercera operación de compensación, reparación o publicación.
5. IF la respuesta contractual no permite determinar el resultado requerido (identificador del viaje, estado o escolta confirmada), THEN THE CrearViaje_UI SHALL reportar una brecha contractual y SHALL NOT inventar una operación adicional.

### Requirement 6: Estados de interfaz y errores

**User Story:** Como `jefe_operativo`, quiero conocer el estado de las consultas y del envío, para corregir datos sin perder la operación.

#### Acceptance Criteria

1. WHILE el catálogo de clientes se carga, THE CrearViaje_UI SHALL mostrar un estado de carga diferenciado de un catálogo vacío.
2. WHILE las unidades se cargan, THE CrearViaje_UI SHALL mostrar un estado de carga diferenciado de una lista vacía.
3. WHILE la creación está en curso, THE CrearViaje_UI SHALL deshabilitar la confirmación y SHALL impedir envíos duplicados.
4. IF una consulta o la creación falla, THEN THE CrearViaje_UI SHALL mostrar un error accionable y SHALL conservar los datos capturados cuando el flujo de sesión lo permita.
5. IF la sesión expira durante el flujo, THEN THE CrearViaje_UI SHALL delegar el manejo al flujo de sesión vigente del panel interno.
6. WHEN la creación termina exitosamente, THE CrearViaje_UI SHALL mostrar un aviso de éxito, el identificador disponible y el estado resultante.

## Escenarios

### Escenarios positivos

**Escenario 1. Crear viaje sin escolta**  
Dado que el `jefe_operativo` está autorizado, cuando captura cliente, origen, uno o más destinos y fecha/hora y confirma sin unidades, entonces el BFF crea el viaje y la interfaz muestra `APROBADO` sin exigir aprobación posterior.

**Escenario 2. Crear viaje con una unidad**  
Dado que una unidad está disponible, cuando el `jefe_operativo` captura los datos obligatorios, selecciona la unidad y confirma, entonces la interfaz ejecuta `crearViaje`, encadena `asignarRecursos` con la unidad y muestra `ASIGNADO` y la escolta confirmada si el BFF acepta la reserva atómica.

**Escenario 3. Crear viaje con varias unidades**  
Dado que varias unidades están disponibles, cuando el `jefe_operativo` selecciona dos o más y confirma, entonces la interfaz envía todas las unidades en un solo `asignarRecursos`, conserva la escolta conjunta y muestra `ASIGNADO` si el BFF confirma la reserva atómica.

### Escenarios negativos y de borde

**Escenario 4. Dato obligatorio faltante**  
Dado que falta cliente, origen, destino o fecha/hora, cuando el `jefe_operativo` intenta confirmar, entonces la interfaz bloquea el envío y señala el dato faltante.

**Escenario 5. Unidad no disponible**  
Dado que una unidad deja de estar disponible, cuando el `jefe_operativo` confirma una creación con asignación, entonces `asignarRecursos` falla sin reserva parcial visible, la interfaz muestra el viaje en `APROBADO` según el BFF, conserva los datos y permite reintentar la asignación o continuar sin ella.

**Escenario 6. Doble confirmación**  
Dado que una creación está en curso, cuando el usuario intenta confirmar nuevamente, entonces la interfaz mantiene el control deshabilitado y produce una sola solicitud.

**Escenario 7. Aptitud no bloqueante**  
Dado que una unidad seleccionada tiene aptitud no apta o desconocida, cuando el usuario confirma y la unidad sigue disponible, entonces la interfaz no bloquea únicamente por aptitud.

## Dependencias

- `E1-HU-028`: comportamiento funcional confirmado para crear viajes por Operación.
- `E1-HU-001`: datos y reglas compartidas únicamente cuando estén confirmados.
- Contrato generado y componentes de `@ai27-tech`: se verifican antes de implementar, conforme a la Nota de brechas.
- Flujo vigente de sesión, navegación y bandeja del panel interno.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del BFF.
- Implementar aprobación posterior para un viaje creado por Operación.
- Implementar compensación, reparación o publicación mediante una operación distinta de `crearViaje` y `asignarRecursos`.
- Resolver en el frontend autorización, alcance, atomicidad, reserva o auditoría del dominio.
- Seleccionar custodios o patrulla por separado.
- Bloquear por aptitud.
- Mapa, telemetría o seguimiento en vivo.
- Modificar la ficha técnica, bitácora, roster o catálogos.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no preguntas que redefinan el comportamiento funcional de E8-T11. Si una verificación no está disponible, se documenta la brecha y no se inventa una alternativa.

- **Contrato de creación (verificado):** el BFF expone `crearViaje` (`POST /api/v1/viajes`) con entrada `CrearViajeEntrada` (`origen`, `destinos[]`, `cliente_id?`, `fecha_hora_servicio?`, `tipo_servicio?`) y respuesta `ViajeResumen` (`id`, `estado`, `origen`). La entrada de creación **no acepta unidades**; la obligatoriedad de cliente y fecha/hora la impone la UI conforme a DEC-026 #5, no el esquema wire.
- **Asignación atómica (verificada):** el BFF expone `asignarRecursos` (`POST /api/v1/viajes/{id}/asignacion`) con entrada `AsignacionEntrada` (`unidades_ids[]`) y reserva atómica que lleva el viaje `APROBADO → ASIGNADO`. Es la segunda operación del flujo, no una operación secundaria inventada. La aptitud (`AptitudRecurso`) es informativa y nunca bloquea (DEC-055).
- **Catálogo de clientes:** verificar la operación publicada para obtener clientes disponibles y su alcance. La UI consume la respuesta del BFF y no replica la regla de alcance.
- **Roster de unidades (verificado):** el BFF expone `listarUnidades` (`GET /api/v1/unidades`) para el roster interno; en V1 la lectura del roster no expone aptitud.
- **Librerías compartidas:** `@ai27-tech/ui` (0.2.0-beta.6) ofrece `Form`/`FormField`/`FormRow`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Button`, `Modal`, `Toast`, `Badge`, `Table`, `Pagination`, `FilterTable`, `Card`, `Navbar`, `Sidebar`, `Tooltip`. **Dos brechas de UI confirmadas, a resolver por composición de primitivas, no con componentes locales nuevos:** (1) no existe un multi-select dedicado para la selección de varias unidades —se compone con `Table`/`Card` + `Checkbox`—; (2) no existe un selector de fecha/hora —se usa `Input` nativo datetime—. Si se quisiera un control dedicado para cualquiera de los dos, es una solicitud a la librería, no duplicación local.
- **Resultado posterior:** verificar el destino de continuación permitido por el flujo existente, sin agregar una operación de publicación.
- **Mensajes:** verificar códigos y textos aprobados para errores de autorización, disponibilidad, contrato incompleto y atomicidad.

## Trazabilidad

- Datos obligatorios y destinos: Requirements 2 y escenarios 1, 3 y 4.
- `APROBADO` sin asignación: Requirement 3 y escenario 1.
- `ASIGNADO` vía `crearViaje` + `asignarRecursos` con una o más unidades: Requirement 4 y escenarios 2 y 3.
- Atomicidad de la reserva y no inferencia: Requirement 5 y escenario 5.
- Carga, errores y doble envío: Requirement 6 y escenarios 4 a 6.
- Aptitud no bloqueante: Requirement 4 y escenario 7.
