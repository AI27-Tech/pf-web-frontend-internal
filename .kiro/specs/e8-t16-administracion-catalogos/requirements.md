# Requirements Document

## Introduction

**Administración de catálogos (E8-T16)** permite al `administrador` administrar desde el panel interno los catálogos maestros y de tipo, para que la operación asigne recursos aptos y capture con valores controlados. La funcionalidad implementa el comportamiento de la historia técnica que satisface `E5-HU-021` (vehículos de AI27: coche/moto), `E5-HU-022` (custodios), `E5-HU-023` (catálogos de tipo) y `E5-HU-024` (contratos/SLA): crear, editar y desactivar valores en los cuatro catálogos; que los valores **activos** sean los que se ofrecen en solicitud, roster y bitácora; que **desactivar** un valor no rompa los registros históricos que ya lo usaban; y que la **aptitud** (administrada por el catálogo) y la **disponibilidad** (resuelta por la asignación) se muestren como dos cosas distintas.

El frontend interno consume **exclusivamente el BFF** como puerta única y nunca llama al servicio `catalogos` directo. El contrato verificado (`@ai27-tech/contracts`, tag `v0.1.0-tracer.20`, el que fija `package.json` del frontend interno) **no expone en el BFF ninguna superficie de administración** (crear/editar/desactivar) de los cuatro catálogos: el BFF solo expone `GET /api/v1/clientes`, `POST /api/v1/clientes` y `GET /api/v1/unidades`. Esta es la brecha contractual central del spec. Por tanto, el comportamiento funcional de escritura se especifica completo, pero cada requisito de escritura queda **condicionado** a operaciones del BFF que hoy no existen y que no se inventan.

Este documento define el comportamiento funcional del frontend interno. Las notas de brecha están separadas al final y no agregan reglas de producto. El frontend no inventará endpoints, payloads, campos, catálogos, valores ni componentes compartidos, y no resolverá en el cliente autorización, alcance, atomicidad ni auditoría del dominio.

## Glossary

- **Catalogos_UI**: flujo del panel interno para administrar (listar, crear, editar y desactivar) los valores de los catálogos maestros y de tipo.
- **Administrador (`administrador`)**: actor interno autorizado para administrar los catálogos.
- **Catálogos**: servicio dueño de los cuatro catálogos administrables; el frontend no lo consume directo.
- **Catálogo de vehículos**: catálogo maestro de vehículos de AI27 (coche/moto), átomo con el que el Jefe Operativo arma unidades (`E5-HU-021`).
- **Catálogo de custodios**: catálogo maestro de personas custodio, sin clasificación por nivel ni tipo (`E5-HU-022`).
- **Catálogos de tipo**: listas de valores controlados (tipos de servicio/monitoreo, tipos de unidad, tipos de tracto, líneas de transporte, lista de GPS, zonas de riesgo) (`E5-HU-023`).
- **Catálogo de contratos**: catálogo de contratos/SLA, cada uno referido a una organización cliente existente (`E5-HU-024`).
- **Unidad**: paquete operacional vehículo + custodios que vive en el roster de `operacion`; no se administra en este flujo.
- **Valor del catálogo**: elemento individual de un catálogo (un vehículo, un custodio, un tipo, un contrato).
- **Estado activo/inactivo**: condición del valor del catálogo; solo los valores activos se ofrecen en solicitud, roster y bitácora.
- **Desactivar**: acción que marca un valor como inactivo sin eliminarlo ni romper los registros históricos que ya lo referencian.
- **Aptitud**: estatus **informativo** de un recurso (apto/no apto) administrado por el catálogo; en V1 no bloquea (DEC-043/DEC-055).
- **Disponibilidad**: condición que resuelve la asignación en `operacion`; es distinta de la aptitud y no se administra aquí.
- **Cliente**: organización existente (`E4-HU-019`) a la que un contrato referencia.
- **BFF**: backend-for-frontend, puerta única del frontend interno; aplica autorización, alcance, atomicidad y auditoría del dominio.

## Requirements

### Requirement 1: Acceso al flujo de administración

**User Story:** Como `administrador`, quiero abrir el flujo de administración de catálogos, para mantener los valores con los que la operación asigna recursos y captura.

#### Acceptance Criteria

1. WHEN un usuario autorizado con rol `administrador` abre el flujo de administración de catálogos, THE Catalogos_UI SHALL mostrar los cuatro catálogos administrables: vehículos, custodios, catálogos de tipo y contratos.
2. IF un usuario no autorizado intenta abrir o enviar el flujo, THEN THE Catalogos_UI SHALL impedir la operación y delegar el manejo de sesión o autorización al flujo vigente del panel interno.
3. THE Catalogos_UI SHALL montarse sobre el shell del panel interno (`E8-T4`) y SHALL depender de la navegación y sesión vigentes de ese shell.

### Requirement 2: Listado de valores de un catálogo

**User Story:** Como `administrador`, quiero listar los valores de un catálogo, para ver qué valores existen y cuáles están activos.

#### Acceptance Criteria

1. WHEN el `administrador` selecciona un catálogo, THE Catalogos_UI SHALL listar sus valores mostrando el estado activo/inactivo de cada uno, usando la operación contractual verificada del BFF.
2. WHILE la lista de un catálogo se carga, THE Catalogos_UI SHALL mostrar un estado de carga diferenciado de un catálogo vacío.
3. WHEN un catálogo no tiene valores, THE Catalogos_UI SHALL mostrar un estado de catálogo vacío diferenciado del estado de carga.
4. THE Catalogos_UI SHALL permitir filtrar y paginar la lista de valores de un catálogo.
5. THE Catalogos_UI SHALL mostrar la aptitud de un valor como un estatus informativo distinto de la disponibilidad, y SHALL NOT presentar la aptitud como una compuerta que bloquee.

### Requirement 3: Alta de un valor de catálogo

**User Story:** Como `administrador`, quiero crear un valor en un catálogo, para que la operación disponga de valores controlados.

#### Acceptance Criteria

1. WHEN el `administrador` solicita crear un valor, THE Catalogos_UI SHALL mostrar un formulario de alta con los campos del catálogo correspondiente.
2. THE Catalogos_UI SHALL exigir los campos obligatorios confirmados del catálogo antes de enviar el alta y SHALL marcar como sujetos a confirmación los campos no confirmados.
3. IF falta un campo obligatorio confirmado, THEN THE Catalogos_UI SHALL impedir el envío y señalar el campo faltante.
4. WHEN el `administrador` confirma un alta válida, THE Catalogos_UI SHALL enviar la solicitud mediante la operación contractual de administración del BFF, cuando esa operación esté disponible.
5. IF la operación contractual de administración del BFF no está disponible, THEN THE Catalogos_UI SHALL reportar la brecha descrita en las Notas de brechas y SHALL NOT llamar al servicio `catalogos` directo ni inventar un endpoint.
6. IF el BFF rechaza el alta, THEN THE Catalogos_UI SHALL mostrar el error, SHALL conservar los datos capturados y SHALL NOT presentar el valor como creado.

### Requirement 4: Edición de un valor de catálogo

**User Story:** Como `administrador`, quiero editar un valor existente, para corregir o actualizar sus datos sin recrearlo.

#### Acceptance Criteria

1. WHEN el `administrador` selecciona editar un valor, THE Catalogos_UI SHALL mostrar un formulario con los datos actuales del valor.
2. THE Catalogos_UI SHALL aplicar las mismas reglas de obligatoriedad y de campos sujetos a confirmación que el alta.
3. WHEN el `administrador` confirma una edición válida, THE Catalogos_UI SHALL enviar la solicitud mediante la operación contractual de administración del BFF, cuando esa operación esté disponible.
4. IF la operación contractual de administración del BFF no está disponible, THEN THE Catalogos_UI SHALL reportar la brecha descrita en las Notas de brechas y SHALL NOT llamar al servicio `catalogos` directo ni inventar un endpoint.
5. IF el BFF rechaza la edición, THEN THE Catalogos_UI SHALL mostrar el error, SHALL conservar los datos capturados y SHALL NOT presentar la edición como aplicada.

### Requirement 5: Desactivación de un valor sin romper la historia

**User Story:** Como `administrador`, quiero desactivar un valor, para retirarlo de la oferta sin afectar los registros históricos que ya lo usaban.

#### Acceptance Criteria

1. WHEN el `administrador` solicita desactivar un valor, THE Catalogos_UI SHALL pedir confirmación antes de enviar la desactivación.
2. WHEN el `administrador` confirma la desactivación, THE Catalogos_UI SHALL enviar la solicitud mediante la operación contractual de administración del BFF, cuando esa operación esté disponible.
3. IF la operación contractual de administración del BFF no está disponible, THEN THE Catalogos_UI SHALL reportar la brecha descrita en las Notas de brechas y SHALL NOT llamar al servicio `catalogos` directo ni inventar un endpoint.
4. IF el valor por desactivar está en uso, THEN THE Catalogos_UI SHALL advertir que el valor está en uso y SHALL permitir continuar sin bloquear la desactivación.
5. WHEN el BFF confirma la desactivación, THE Catalogos_UI SHALL mostrar el valor como inactivo y SHALL NOT representarlo como eliminado.
6. THE Catalogos_UI SHALL NOT presentar la desactivación como una operación que altere los registros históricos que ya referenciaban el valor.

### Requirement 6: Catálogo de vehículos de AI27

**User Story:** Como `administrador`, quiero administrar los vehículos de AI27, para que el Jefe Operativo arme unidades con vehículos aptos.

#### Acceptance Criteria

1. THE Catalogos_UI SHALL permitir capturar para un vehículo: Económico (obligatorio), Placas (sujeto a confirmación), Tipo de vehículo coche/moto (obligatorio), Marca (texto libre) y Estatus de aptitud apto/no apto (informativo).
2. THE Catalogos_UI SHALL tratar la Marca como texto libre y SHALL NOT ofrecerla como catálogo.
3. THE Catalogos_UI SHALL mostrar el estatus de aptitud del vehículo como información y SHALL NOT bloquear la administración del vehículo por su aptitud.
4. THE Catalogos_UI SHALL administrar el vehículo como un átomo y SHALL NOT administrar aquí la unidad (paquete vehículo + custodios), que vive en el roster de `operacion`.

### Requirement 7: Catálogo de custodios

**User Story:** Como `administrador`, quiero administrar los custodios, para que la operación disponga de personas custodio para integrar unidades.

#### Acceptance Criteria

1. THE Catalogos_UI SHALL permitir administrar custodios como personas y SHALL NOT clasificarlos por nivel ni por tipo.
2. THE Catalogos_UI SHALL permitir una referencia **opcional** al usuario de `identidad` por identificador y SHALL NOT exigir esa referencia para crear un custodio.
3. THE Catalogos_UI SHALL mostrar la aptitud del custodio como información y SHALL NOT bloquear la administración del custodio por su aptitud.

### Requirement 8: Catálogos de tipo

**User Story:** Como `administrador`, quiero administrar las listas de valores de tipo, para que la captura use valores controlados donde apliquen.

#### Acceptance Criteria

1. THE Catalogos_UI SHALL permitir administrar valores en las listas de tipo: tipos de servicio/monitoreo, tipos de unidad, tipos de tracto, líneas de transporte, lista de GPS y zonas de riesgo.
2. THE Catalogos_UI SHALL capturar por cada valor de tipo: el catálogo al que pertenece, el valor/nombre y el estado activo/inactivo.
3. WHERE el valor pertenece a líneas de transporte, THE Catalogos_UI SHALL asociar el valor a un cliente existente.
4. THE Catalogos_UI SHALL tratar las zonas de riesgo como una lista simple de valores y SHALL NOT capturar geometría.
5. THE Catalogos_UI SHALL NOT ofrecer "tipos de custodia" ni "kit de seguridad" como catálogos de tipo.
6. THE Catalogos_UI SHALL aplicar el modelado de líneas de transporte y lista de GPS conforme a la Nota de brechas, sin asumir un modelado final no confirmado.

### Requirement 9: Catálogo de contratos/SLA

**User Story:** Como `administrador`, quiero administrar los contratos de los clientes, para registrar la información de contrato/SLA de forma controlada.

#### Acceptance Criteria

1. THE Catalogos_UI SHALL permitir capturar para un contrato: Cliente (referencia a una organización existente, obligatorio), Identificador de contrato (sujeto a confirmación), Vigencia (sujeta a confirmación), SLA (contenido pendiente de definición) y Estado activo/inactivo.
2. IF la organización cliente referenciada no existe, THEN THE Catalogos_UI SHALL impedir la creación del contrato.
3. THE Catalogos_UI SHALL tratar el contrato como **solo informativo** en V1 y SHALL NOT condicionar el servicio por el contrato.
4. THE Catalogos_UI SHALL representar el contenido funcional del SLA conforme a la Nota de brechas mientras su definición esté pendiente, sin inventar campos de SLA.

### Requirement 10: Estados de interfaz y errores

**User Story:** Como `administrador`, quiero conocer el estado de las consultas y del envío, para corregir datos sin perder la operación.

#### Acceptance Criteria

1. WHILE una lista, un alta, una edición o una desactivación está en curso, THE Catalogos_UI SHALL deshabilitar la confirmación correspondiente y SHALL impedir envíos duplicados.
2. IF una consulta o una operación de escritura falla, THEN THE Catalogos_UI SHALL mostrar un error accionable y SHALL conservar los datos capturados cuando el flujo de sesión lo permita.
3. IF la sesión expira durante el flujo, THEN THE Catalogos_UI SHALL delegar el manejo al flujo de sesión vigente del panel interno.
4. WHEN una operación de escritura termina exitosamente, THE Catalogos_UI SHALL mostrar un aviso de éxito y el estado resultante del valor.

## Escenarios

### Escenarios positivos

**Escenario 1. Crear un vehículo apto**  
Dado que el `administrador` está autorizado, cuando captura Económico y Tipo de vehículo y confirma, entonces la interfaz envía el alta mediante la operación de administración del BFF (cuando exista) y muestra el vehículo como activo con su estatus de aptitud informativo.

**Escenario 2. Editar un custodio sin referencia a identidad**  
Dado que un custodio existe sin referencia a `identidad`, cuando el `administrador` edita sus datos y confirma, entonces la interfaz envía la edición sin exigir la referencia y muestra el custodio actualizado.

**Escenario 3. Crear una línea de transporte para un cliente**  
Dado que un cliente existe, cuando el `administrador` crea un valor en líneas de transporte y lo asocia al cliente, entonces la interfaz registra el valor asociado al cliente y lo muestra como activo.

**Escenario 4. Registrar un contrato informativo**  
Dado que una organización cliente existe, cuando el `administrador` crea un contrato referido a ese cliente, entonces la interfaz lo registra como informativo sin condicionar el servicio.

### Escenarios negativos y de borde

**Escenario 5. Desactivar un valor en uso**  
Dado que un valor está en uso en registros históricos, cuando el `administrador` lo desactiva y confirma, entonces la interfaz advierte que está en uso sin bloquear, lo muestra como inactivo y no altera los registros históricos que ya lo usaban.

**Escenario 6. Catálogo vacío**  
Dado que un catálogo no tiene valores, cuando el `administrador` lo abre, entonces la interfaz muestra un estado de catálogo vacío diferenciado del estado de carga.

**Escenario 7. Aptitud frente a disponibilidad**  
Dado que un vehículo está "no apto", cuando el `administrador` lista los vehículos, entonces la interfaz muestra la aptitud como estatus informativo y no la confunde con la disponibilidad ni la presenta como compuerta.

**Escenario 8. Contrato sin organización existente**  
Dado que la organización cliente no existe, cuando el `administrador` intenta crear el contrato, entonces la interfaz impide la creación.

**Escenario 9. Operación de administración no expuesta por el BFF**  
Dado que el BFF no expone la operación de administración del catálogo, cuando el `administrador` intenta crear, editar o desactivar un valor, entonces la interfaz reporta la brecha contractual y no llama a `catalogos` directo ni inventa un endpoint.

## Dependencias

- `E5-HU-021`, `E5-HU-022`, `E5-HU-023`, `E5-HU-024`: comportamiento funcional de los cuatro catálogos que esta tarea administra.
- `E8-T4` (shell del panel interno: layout, navegación, sesión): prerrequisito del montaje de la vista. Según la trazabilidad de E8, el AppShell figura como "No existe"; el montaje de la vista depende de que ese prerrequisito se cierre.
- `E5-T1`..`E5-T4` (backend de catálogos en el servicio `catalogos`): definen la superficie CRUD y condicionan la disponibilidad real de datos; su exposición en el BFF es la brecha central.
- Contrato generado (`@ai27-tech/contracts`, tag `v0.1.0-tracer.20`) y componentes de `@ai27-tech/ui` (0.2.0-beta.6): se verifican antes de implementar, conforme a la Nota de brechas.
- Flujo vigente de sesión, navegación y bandeja del panel interno.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del BFF.
- Llamar al servicio `catalogos` directo; el frontend consume solo el BFF como puerta única.
- Resolver en el frontend autorización, alcance, atomicidad, reserva o auditoría del dominio.
- Administrar la unidad (paquete vehículo + custodios), que vive en el roster de `operacion`.
- Rutas de origen/destino: origen y destino son texto libre (DEC-010), sin rutas.
- Geometría de zonas de riesgo: solo lista de valores.
- Catalogar marcas de unidad, kit de seguridad u operador logístico: son texto libre (DEC-017), no catálogo.
- Segmentación de zonas por cliente y su temporalidad: V2 (DEC-047).
- Clasificar custodios por nivel o tipo; ofrecer "tipos de custodia" o "kit de seguridad" como catálogos de tipo.
- Usar la aptitud como compuerta: la aptitud es informativa en V1 (DEC-043/DEC-055).
- Definir los valores reales de los catálogos: los aporta Operación (DEC-017); se construye la administración, no se inventan los valores.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no preguntas que redefinan el comportamiento funcional de E8-T16. Si una verificación no está disponible, se documenta la brecha y no se inventa una alternativa. El detalle completo de la brecha contractual central se registra en `BRECHAS.md`, en esta misma carpeta.

- **Brecha contractual central (administración no expuesta por el BFF):** la administración (crear/editar/desactivar) de los cuatro catálogos **no está expuesta por el BFF** en `v0.1.0-tracer.20`. En ese tag el BFF solo expone `GET /api/v1/clientes`, `POST /api/v1/clientes` (espejo de clientes) y `GET /api/v1/unidades` (lectura del roster para asignación), y no reenvía ninguna superficie de administración de catálogos. El servicio `catalogos.yaml` sí tiene la superficie CRUD completa (`POST`/`PATCH` sobre `/vehiculos`, `/custodios`, `/catalogos-tipo/{tipo}`, `/contratos`, más `/sla` y `.../aptitud` en GET), pero el frontend no lo consume directo. **Impacto:** quedan condicionados los Requirements 3, 4 y 5 (alta, edición y desactivación) en los cuatro catálogos. **Propuesta:** solicitar al repo de contratos que exponga la superficie de administración de catálogos en el BFF; nunca relleno local ni llamada directa a `catalogos`.
- **Valores reales de los catálogos:** los aporta Operación (DEC-017). Se construye la administración; los valores no se inventan.
- **Contenido funcional del SLA:** pendiente de definición (`E5-HU-024`). No se inventan campos de SLA mientras la definición esté pendiente.
- **Modelado de líneas de transporte y lista de GPS:** pendiente si viven como HU propia o dentro de catálogos de tipo (DEC-047). Se especifican como catálogos de tipo administrables sin asumir el modelado final; en líneas de transporte solo Coordinadores crean una línea nueva (DEC-047 §D.1), regla que el BFF/backend aplica, no el frontend.
- **Campos sujetos a confirmación:** Placas (vehículos), Identificador de contrato y Vigencia (contratos) están por confirmar; se tratan como sujetos a confirmación, no como obligatorios fijos.
- **Referencia a `identidad`:** el custodio puede referir al usuario de `identidad` por identificador; nunca una FK entre schemas. La referencia es opcional.
- **Clientes para contratos:** verificar la operación publicada del BFF para obtener organizaciones cliente existentes (`GET /api/v1/clientes`) y su alcance; la UI consume la respuesta y no replica la regla de alcance.
- **Librerías compartidas:** `@ai27-tech/ui` (0.2.0-beta.6) ofrece `Form`/`FormField`/`FormRow`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Button`, `Modal`, `Toast`, `Badge`, `Table`, `Pagination`, `FilterTable`, `Card`, `Navbar`, `Sidebar`, `Tooltip`. Se usan `Table`/`FilterTable`/`Pagination` para listar, `Form`/`Input`/`Select` para alta y edición, `Modal` + `Toast` para desactivar con confirmación y `Badge` para mostrar la aptitud como estatus. Si falta un control dedicado, se compone con primitivas y se registra como brecha de UI (solicitud a la librería), nunca duplicación local.
- **Mensajes:** verificar códigos y textos aprobados para errores de autorización, valor en uso, organización inexistente y operación de administración no disponible.

## Trazabilidad

- Acceso y autorización delegada: Requirement 1.
- Listado, estados de carga/vacío y aptitud vs disponibilidad: Requirements 2 y 10 y escenarios 6 y 7.
- Alta, edición y desactivación condicionadas a la brecha del BFF: Requirements 3, 4 y 5 y escenario 9.
- Desactivar sin romper historia y advertir valor en uso: Requirement 5 y escenario 5.
- Catálogo de vehículos (`E5-HU-021`): Requirement 6 y escenario 1.
- Catálogo de custodios (`E5-HU-022`): Requirement 7 y escenario 2.
- Catálogos de tipo (`E5-HU-023`): Requirement 8 y escenario 3.
- Catálogo de contratos/SLA (`E5-HU-024`): Requirement 9 y escenarios 4 y 8.
