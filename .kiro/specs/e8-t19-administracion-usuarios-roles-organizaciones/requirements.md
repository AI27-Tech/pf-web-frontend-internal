# Requirements Document

## Introduction

La **administración de usuarios, roles y organizaciones** (E8-T19) es la parte del panel interno donde el `administrador` gobierna el acceso: da de alta y desactiva usuarios, les asigna **uno de los ocho roles**, define su **alcance**, administra las **organizaciones cliente** (tenant) y puede **revocar todas las sesiones activas** de un usuario. Satisface `E4-HU-018`, `E4-HU-019` y `E4-HU-020` en el alcance de V1 que fijaron DEC-022, DEC-036, DEC-045, DEC-053/054, DEC-091 y DEC-103. La pantalla vive en `/administracion`, ruta que hoy es un stub (E8-T4) y que la navegación muestra a todos los roles internos.

**Estado de la superficie contractual (verificado).** Hoy el `bff` **no expone** sujetos, roles, organizaciones ni revocación administrativa de sesiones. `identidad` define seis operaciones sobre sujetos y una de sesión, pero `identidad` no es pública (DEC-137) y el frontend solo habla con el `bff`. No existe en ningún servicio la superficie de organizaciones, el listado de sujetos, el modelo de alcance, la operación de revocar todas las sesiones de un sujeto ni la consulta de auditoría de revocaciones. Por eso este spec **se escribe completo** y marca como **CONDICIONADO** todo comportamiento que depende de una operación inexistente en el contrato. Ese comportamiento queda definido pero **no es implementable ni verificable** hasta que la brecha se cierre; no se inventa una alternativa ni una superficie. El detalle de cada brecha está en `BRECHAS.md`.

**Alcance V1 (decidido):**

- **Ocho roles** (DEC-045) con los identificadores de DEC-053. El rol se asigna **uno por usuario**.
- **Dos dimensiones de alcance distintas** (DEC-045 #8): monitoreo por `unidad` y conversación por `cliente`. El panel configura solo la de monitoreo.
- **El Ejecutivo no lleva clientes asignados en el alta** (E4-HU-018, DEC-103). Su alcance de chat nace por auto-asignación pegajosa y la interfaz no lo configura. La línea "un Ejecutivo puede tener varios clientes" de la historia técnica E8-T19 queda **superada** por E4-HU-018 y DEC-103.
- **Organizaciones planas**, con identificador de tenant **inmutable** (DEC-022).
- **No existe el rol Auditor** (DEC-036). La consulta y exportación de auditoría es del `administrador`.
- **Quitar un rol surte efecto en el siguiente refresco** de la sesión del usuario y no revoca sus sesiones vivas (DEC-091). El corte en vivo se logra con la desactivación del usuario o con la revocación de sesiones.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos ni componentes compartidos. Autorización, auto-escalada, regla del último administrador, aislamiento de tenant, revocación y auditoría los resuelve el `bff`/`identidad`; la interfaz consume resultados y clasifica respuestas.

## Glossary

- **Administracion_UI**: el sistema de interfaz de administración de usuarios, roles y organizaciones (ruta `/administracion` y sus elementos). Es el "sistema" al que refieren los criterios.
- **Administrador**: rol `administrador` (DEC-045). Único rol que usa esta interfaz. Alcance global sobre el lado interno.
- **Usuario**: persona con acceso a la plataforma. En el contrato se llama `sujeto` (`SujetoDetalle`, `AltaSujetoEntrada`); en la prosa se usa "usuario".
- **Rol**: uno de `cliente`, `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion`, `administrador`. Enum `Rol` de `@ai27-tech/contracts`. Cada usuario tiene exactamente uno.
- **Audiencia**: `Cliente` para el rol `cliente`; `Interno` para los otros siete (DEC-054).
- **Organización**: organización cliente (tenant). Plana, sin jerarquía. Su identificador de tenant se genera al crearla y es inmutable (E4-HU-019).
- **Alcance de monitoreo**: conjunto de `unidades` sobre las que un usuario monitorea. Monitorista: unidades asignadas. Supervisor: unión de las unidades de sus Monitoristas. Coordinador: unión de los alcances de sus Supervisores.
- **Alcance efectivo**: el alcance de monitoreo resultante que el `bff` reporta para un usuario. La interfaz lo muestra y no lo calcula.
- **Alcance de conversación**: clientes cuyas conversaciones atiende un Ejecutivo. Nace por auto-asignación pegajosa (DEC-103) y la interfaz no lo edita.
- **Auto-escalada**: intento de un usuario de modificar su propio rol o alcance.
- **Sujeto de la sesión**: el usuario autenticado en el panel. La interfaz lo compara con el usuario objetivo para detectar auto-escalada.
- **Sesión**: sesión viva de un usuario con `sesion_id` propio (ADR 26).
- **Revocación masiva**: acción administrativa que revoca todas las sesiones activas de un usuario (E4-HU-020). Es distinta de desactivar al usuario y de cerrar la propia sesión.
- **Último administrador**: condición en la que una desactivación o cambio de rol dejaría al sistema sin ningún `administrador`.
- **CONDICIONADO**: etiqueta `[CONDICIONADO a B-n]` al final de un criterio. Indica que el comportamiento depende de una operación o dato que no existe en el contrato del `bff`; `n` remite a la brecha en `BRECHAS.md`. Un criterio CONDICIONADO es una regla de producto confirmada, pero no es implementable ni verificable mientras la brecha siga abierta.
- **BFF**: backend-for-frontend de AI27. Única puerta HTTP del frontend (DEC-137).

## Requirements

### Requirement 1: Acceso exclusivo del Administrador

**User Story:** Como Administrador, quiero que la administración de usuarios, roles y organizaciones solo esté disponible para mi rol, para que nadie más pueda asignar roles ni alcances.

#### Acceptance Criteria

1. WHILE el rol efectivo de la sesión vigente es `administrador`, THE Administracion_UI SHALL mostrar la entrada de navegación "Administración" y SHALL permitir abrir la ruta `/administracion`.
2. WHEN un usuario cuyo rol efectivo de la sesión es distinto de `administrador` abre `/administracion` por URL directa, THE Administracion_UI SHALL mostrar un aviso de acceso no autorizado, SHALL NOT mostrar usuarios, roles, organizaciones ni controles de asignación, y SHALL NOT solicitar al `bff` datos de usuarios, roles ni organizaciones.
3. WHILE el rol efectivo de la sesión vigente es cualquiera de los siete roles distintos de `administrador` (`cliente`, `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion`), THE Administracion_UI SHALL NOT mostrar la entrada de navegación "Administración" y SHALL NOT renderizar controles para asignar roles, asignar alcances, desactivar usuarios, administrar organizaciones ni revocar sesiones.
4. IF el `bff` responde `403` a cualquier operación de esta pantalla, THEN THE Administracion_UI SHALL mostrar un aviso de autorización insuficiente, SHALL NOT presentar la acción como realizada, SHALL conservar sin cambios los datos que el Administrador tenía capturados en esa acción y SHALL NOT modificar los datos ya mostrados de usuarios, roles u organizaciones.
5. THE Administracion_UI SHALL enviar cada operación de esta pantalla al `bff` y SHALL NOT determinar localmente su resultado a partir del rol efectivo de la sesión, de modo que el resultado mostrado corresponda siempre a la respuesta del `bff`, tanto si la navegación mostró como si ocultó la entrada.
6. THE Administracion_UI SHALL construir las opciones del selector de roles exclusivamente a partir de los valores del enum `Rol` de `@ai27-tech/contracts` y SHALL NOT declarar localmente una lista de roles.

### Requirement 2: Consultar usuarios

**User Story:** Como Administrador, quiero ver los usuarios y abrir el detalle de cada uno, para conocer su rol, su estado y su alcance antes de cambiarlos.

#### Acceptance Criteria

1. WHEN el Administrador abre `/administracion`, THE Administracion_UI SHALL solicitar la lista de usuarios al `bff` y mostrar, por cada usuario devuelto, el nombre, el identificador de usuario, el rol, el estado (activo o inactivo) y, solo para el rol `cliente`, su organización. [CONDICIONADO a B-2]
2. THE Administracion_UI SHALL permitir buscar usuarios y paginar la lista, SHALL solicitar al `bff` cada búsqueda y cada cambio de página, y SHALL NOT filtrar, ordenar ni ampliar en el cliente el conjunto que devuelve el `bff`. [CONDICIONADO a B-2]
3. WHEN el Administrador abre el detalle de un usuario, THE Administracion_UI SHALL mostrar su nombre, su identificador de usuario, su rol, su estado, su organización (solo si es `cliente`) y, si es Monitorista, Supervisor o Coordinador, su alcance efectivo conforme al criterio 4. [CONDICIONADO a B-1]
4. WHERE el usuario es Monitorista, Supervisor o Coordinador, THE Administracion_UI SHALL mostrar su alcance efectivo exactamente como lo devuelve el `bff`, SHALL indicar que el usuario no tiene unidades en su alcance cuando el `bff` no devuelve ninguna, y SHALL NOT calcular la unión de unidades en el cliente. [CONDICIONADO a B-4]
5. WHEN el `bff` responde la lista sin usuarios (porque no existen o porque la búsqueda no tiene coincidencias), THE Administracion_UI SHALL mostrar un estado vacío visualmente distinto del estado de carga y del estado de error.
6. IF el `bff` responde `404` al abrir el detalle de un usuario, THEN THE Administracion_UI SHALL mostrar un aviso de usuario no disponible y SHALL NOT mostrar datos del usuario solicitado ni de ningún otro usuario consultado antes. [CONDICIONADO a B-1]
7. WHILE la solicitud de la lista de usuarios está en curso, THE Administracion_UI SHALL mostrar un estado de carga y SHALL NOT mostrar el estado vacío ni el estado de error.
8. IF la solicitud de la lista de usuarios falla por error de red o por una respuesta de error distinta de `403`, THEN THE Administracion_UI SHALL mostrar un estado de error visualmente distinto del estado vacío y SHALL NOT mostrar como vigente una lista cargada antes. [CONDICIONADO a B-2]
9. IF la solicitud del detalle de un usuario falla por error de red o por una respuesta de error distinta de `403` y `404`, THEN THE Administracion_UI SHALL mostrar un aviso de error al cargar el detalle y SHALL NOT mostrar datos de otro usuario. [CONDICIONADO a B-1]

### Requirement 3: Alta de usuario con uno de los ocho roles

**User Story:** Como Administrador, quiero dar de alta un usuario y asignarle uno de los ocho roles, para que acceda solo a lo que le corresponde.

#### Acceptance Criteria

1. WHEN el Administrador inicia el alta de un usuario, THE Administracion_UI SHALL mostrar un formulario con los campos nombre, identificador de usuario y rol, y SHALL ofrecer en el selector de rol, de selección única, exactamente los ocho valores del enum `Rol` (`cliente`, `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion`, `administrador`) tomados del enum de `@ai27-tech/contracts` (Requirement 1.6). [CONDICIONADO a B-1]
2. THE Administracion_UI SHALL exigir exactamente un rol por usuario y SHALL NOT habilitar la confirmación del alta mientras falte el nombre, el identificador de usuario o el rol, ni cuando el rol sea un valor fuera del enum. [CONDICIONADO a B-1]
3. WHERE el rol elegido es `cliente`, THE Administracion_UI SHALL exigir la selección de una única organización activa y SHALL NOT habilitar la confirmación del alta mientras no haya una seleccionada (Requirement 4). [CONDICIONADO a B-1, B-3]
4. IF el rol elegido es `cliente` y el `bff` no devuelve ninguna organización activa, THEN THE Administracion_UI SHALL mostrar un aviso de que no hay organizaciones activas disponibles, SHALL NOT habilitar la confirmación del alta y SHALL conservar lo capturado. [CONDICIONADO a B-1, B-3]
5. WHERE el rol elegido es distinto de `cliente`, THE Administracion_UI SHALL NOT pedir organización cliente ni pedir al Administrador un valor de `tenant_id`, y SHALL NOT derivar ese valor en el cliente. El valor de `tenant_id` que `AltaSujetoEntrada` exige para un usuario interno no está definido y se resuelve por la brecha B-7. [CONDICIONADO a B-1, B-7]
6. WHEN el `bff` confirma el alta, THE Administracion_UI SHALL mostrar un aviso de éxito y SHALL mostrar el usuario creado con el nombre, el identificador de usuario, el rol y el estado que devuelve el `bff`. [CONDICIONADO a B-1]
7. IF el `bff` rechaza el alta porque el identificador de usuario ya existe, THEN THE Administracion_UI SHALL indicar el conflicto junto al campo identificador de usuario, SHALL conservar todo lo capturado (incluidos el rol y, si aplica, la organización) y SHALL NOT crear ni mostrar un usuario duplicado. [CONDICIONADO a B-1]
8. IF el `bff` rechaza la entrada por validación, THEN THE Administracion_UI SHALL mostrar el error junto al campo que corresponda, o como aviso general del formulario cuando el error no sea atribuible a un campo, y SHALL conservar lo capturado.
9. IF la solicitud de alta falla por un error de red o por una respuesta del `bff` distinta de confirmación, conflicto de identificador de usuario o rechazo por validación, THEN THE Administracion_UI SHALL mostrar un aviso de fallo del alta, SHALL conservar lo capturado, SHALL NOT presentar el usuario como creado y SHALL permitir al Administrador reintentar la confirmación. [CONDICIONADO a B-1]
10. WHILE la solicitud de alta está en curso, THE Administracion_UI SHALL deshabilitar la confirmación del alta, de modo que una misma confirmación envíe una sola solicitud.

### Requirement 4: Usuario Cliente atado a una organización

**User Story:** Como Administrador, quiero que un usuario Cliente quede asociado a una sola organización, para que solo acceda a los datos de esa organización.

#### Acceptance Criteria

1. WHERE el rol del usuario es `cliente`, THE Administracion_UI SHALL mostrar un selector de organización de selección única que ofrece únicamente organizaciones con estado activa, identificadas por su nombre, y SHALL NOT ofrecer organizaciones con estado inactiva. [CONDICIONADO a B-3]
2. THE Administracion_UI SHALL NOT permitir asociar un usuario a más de una organización: el selector SHALL conservar como máximo una organización seleccionada y SHALL NOT enviar más de una organización por usuario. [CONDICIONADO a B-3]
3. WHERE el rol del usuario es distinto de `cliente`, THE Administracion_UI SHALL NOT mostrar el selector de organización y SHALL NOT enviar ninguna organización cliente seleccionada previamente en el formulario.
4. WHEN el Administrador cambia el rol de un usuario hacia `cliente`, THE Administracion_UI SHALL mantener deshabilitada la acción de confirmar mientras no haya una organización seleccionada, y SHALL habilitarla solo cuando exista exactamente una. [CONDICIONADO a B-1, B-3]
5. THE Administracion_UI SHALL NOT afirmar que el aislamiento entre organizaciones se aplicó; esa garantía la resuelve el servidor (E4-HU-019).
6. IF el rol del usuario es `cliente` y no existe ninguna organización activa, THEN THE Administracion_UI SHALL mostrar el selector sin opciones junto con un aviso de que no hay organizaciones activas disponibles, y SHALL mantener deshabilitada la acción de confirmar el alta o el cambio de rol hacia `cliente`. [CONDICIONADO a B-3]
7. IF falla la carga de las organizaciones para el selector, THEN THE Administracion_UI SHALL mostrar un error junto al selector con una acción de reintentar, SHALL conservar lo capturado en el formulario y SHALL mantener deshabilitada la acción de confirmar mientras el selector no tenga una organización seleccionada. [CONDICIONADO a B-3]
8. IF el `bff` rechaza el alta o el cambio de rol hacia `cliente` por la organización seleccionada, THEN THE Administracion_UI SHALL conservar lo capturado, indicar junto al selector que la organización no es válida, recargar las organizaciones disponibles y SHALL NOT presentar al usuario como asociado a esa organización. [CONDICIONADO a B-1, B-3]

### Requirement 5: Asignar o cambiar el rol de un usuario

**User Story:** Como Administrador, quiero cambiar el rol de un usuario existente, para que su acceso refleje su función real.

#### Acceptance Criteria

1. WHEN el Administrador abre el cambio de rol de un usuario activo distinto del sujeto de la sesión, THE Administracion_UI SHALL ofrecer los ocho roles de V1 (`cliente`, `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion`, `administrador`) y marcar de forma visible el rol actual del usuario. [CONDICIONADO a B-1]
2. WHEN el Administrador confirma un cambio de rol, THE Administracion_UI SHALL enviar la solicitud una sola vez y deshabilitar el control de confirmación mientras la solicitud esté en curso, de modo que un segundo clic o pulsación no genere una segunda solicitud. [CONDICIONADO a B-1]
3. WHEN el `bff` confirma el cambio de rol, THE Administracion_UI SHALL recargar el detalle del usuario y mostrar el rol resultante que devuelve el `bff`. [CONDICIONADO a B-1]
4. WHEN el `bff` confirma el cambio de rol, THE Administracion_UI SHALL informar que el cambio surte efecto en el siguiente refresco de la sesión del usuario y SHALL NOT prometer un corte inmediato (DEC-091). [CONDICIONADO a B-1]
5. WHEN el `bff` confirma el cambio de rol, THE Administracion_UI SHALL NOT revocar sesiones por su cuenta ni cambiar el estado de las sesiones del usuario; la revocación es una acción distinta del Administrador (Requirement 11) (DEC-091).
6. IF el `bff` responde `409` porque el usuario está desactivado, porque el rol solicitado es el que ya tiene o porque el cambio dejaría al sistema sin `administrador`, THEN THE Administracion_UI SHALL mostrar un mensaje que identifique cuál de esos tres motivos aplica, conservar el rol seleccionado en el formulario y SHALL NOT presentar el cambio como aplicado ni modificar el rol mostrado en el detalle. [CONDICIONADO a B-1]
7. IF el `bff` responde `403` porque el usuario objetivo es el sujeto de la sesión, THEN THE Administracion_UI SHALL mostrar el aviso de auto-escalada bloqueada (Requirement 7), recargar el detalle del usuario y SHALL NOT presentar el cambio como aplicado. [CONDICIONADO a B-1]
8. IF la solicitud de cambio de rol falla por una causa distinta de las de los criterios 6 y 7 (error del `bff` o sin respuesta por falla de red), THEN THE Administracion_UI SHALL mostrar un mensaje de error indicando que el cambio no se aplicó, conservar el rol seleccionado, volver a habilitar el control de confirmación para permitir reintento y SHALL NOT presentar el cambio como aplicado. [CONDICIONADO a B-1]
9. WHEN el Administrador cancela o cierra el cambio de rol sin confirmar, THE Administracion_UI SHALL descartar la selección, no enviar ninguna solicitud y mantener sin cambios el rol mostrado en el detalle del usuario. [CONDICIONADO a B-1]
10. WHERE el rol anterior del usuario tenía alcance de monitoreo asignado, THE Administracion_UI SHALL NOT asumir cómo se conserva o se retira ese alcance al cambiar de rol ni mostrar texto que lo afirme. Esa regla es una pregunta abierta (PA-6).

### Requirement 6: Alcance de monitoreo por rol

**User Story:** Como Administrador, quiero definir qué unidades alcanza cada Monitorista y de quién depende cada Supervisor y Coordinador, para que cada uno vea y opere únicamente lo que le corresponde.

#### Acceptance Criteria

1. WHERE el usuario es `monitorista`, THE Administracion_UI SHALL permitir asignarle una o más `unidades` y retirarle unidades, y SHALL ofrecer como opciones únicamente las unidades que devuelve `listarUnidades`. [CONDICIONADO a B-4]
2. WHERE el usuario es `supervisor`, THE Administracion_UI SHALL permitir indicar los Monitoristas que supervisa, y SHALL ofrecer como opciones únicamente usuarios con rol `monitorista` obtenidos del listado de usuarios del `bff`. [CONDICIONADO a B-2, B-4]
3. WHERE el usuario es `coordinador`, THE Administracion_UI SHALL permitir indicar los Supervisores que coordina, y SHALL ofrecer como opciones únicamente usuarios con rol `supervisor` obtenidos del listado de usuarios del `bff`. [CONDICIONADO a B-2, B-4]
4. WHEN el Administrador confirma un cambio de alcance de un usuario y el `bff` lo acepta, THE Administracion_UI SHALL mostrar el alcance efectivo resultante que devuelve el `bff` y SHALL NOT mostrar un alcance calculado localmente. [CONDICIONADO a B-4]
5. THE Administracion_UI SHALL NOT ofrecer campo, selector ni acción para asignar clientes a un Ejecutivo; el alcance de chat del Ejecutivo nace por auto-asignación pegajosa (E4-HU-018, DEC-103).
6. WHERE el usuario es `jefe_operativo`, `ejecutivo`, `reaccion`, `administrador` o `cliente`, THE Administracion_UI SHALL NOT mostrar controles de alcance de monitoreo.
7. THE Administracion_UI SHALL NOT definir la mecánica del vínculo Monitorista↔unidad (cuándo y cómo se establece); esa mecánica es una pregunta abierta (PA-3).
8. THE Administracion_UI SHALL presentar el alcance de monitoreo y el de conversación como dimensiones distintas y SHALL NOT mezclarlos en un mismo control.
9. IF el `bff` rechaza un cambio de alcance, THEN THE Administracion_UI SHALL mostrar un mensaje que indique el motivo del rechazo, conservar la selección que el Administrador había capturado, mantener visible el último alcance efectivo confirmado por el `bff` y SHALL NOT presentar el cambio como aplicado. [CONDICIONADO a B-4]
10. THE Administracion_UI SHALL NOT afirmar que Supervisor o Coordinador tienen alcance global por su rol; solo el `administrador` tiene alcance global.
11. IF `listarUnidades` o el listado de usuarios del `bff` falla o devuelve una lista vacía mientras el Administrador edita el alcance, THEN THE Administracion_UI SHALL mostrar un estado de error o de lista vacía según corresponda, SHALL NOT permitir confirmar el cambio con opciones no devueltas por el `bff` y SHALL conservar la selección ya capturada. [CONDICIONADO a B-2, B-4]

### Requirement 7: Bloqueo de auto-escalada

**User Story:** Como Administrador, quiero que la interfaz me impida modificar mi propio rol o alcance, para que nadie pueda escalar sus propios privilegios.

#### Acceptance Criteria

1. WHEN el usuario objetivo es el sujeto de la sesión, THE Administracion_UI SHALL deshabilitar los controles de cambio de rol y los de asignación o retiro de alcance (Requirement 6) sobre ese usuario, y SHALL mostrar junto a ellos un texto visible que indique que no se puede modificar el propio rol ni el propio alcance.
2. WHEN el usuario objetivo es el sujeto de la sesión, THE Administracion_UI SHALL NOT enviar al `bff` ninguna solicitud de cambio de rol ni de alcance sobre ese usuario, incluso si el Administrador intenta confirmar la acción por un medio distinto del control deshabilitado (por ejemplo, teclado o reenvío de formulario).
3. IF el `bff` rechaza con `403` un cambio de rol o de alcance por auto-escalada que la interfaz no previno, THEN THE Administracion_UI SHALL mostrar un aviso de auto-escalada bloqueada que indique que el servidor rechazó el cambio, SHALL recargar el detalle del usuario con el rol y el alcance vigentes que devuelva el `bff`, y SHALL NOT presentar el cambio como aplicado. [CONDICIONADO a B-1, B-4]
4. IF la recarga del detalle posterior al `403` de auto-escalada falla, THEN THE Administracion_UI SHALL mostrar el estado de error de carga del Requirement 13, conservar el aviso de auto-escalada bloqueada y SHALL NOT mostrar como vigente el rol ni el alcance que el Administrador intentó fijar. [CONDICIONADO a B-1, B-4]
5. IF la interfaz no puede determinar el sujeto de la sesión, THEN THE Administracion_UI SHALL deshabilitar los controles de cambio de rol y de alcance sobre todos los usuarios y SHALL mostrar un aviso de que no se pudo identificar la sesión.
6. THE Administracion_UI SHALL tratar el bloqueo de la interfaz como una afordancia y SHALL NOT sustituir la validación del servidor; la decisión del `bff` prevalece sobre el estado habilitado o deshabilitado de cualquier control.
7. THE Administracion_UI SHALL identificar el sujeto de la sesión comparando el identificador del sujeto de la sesión con el identificador del usuario objetivo, y SHALL NOT compararlos por nombre.

### Requirement 8: Desactivar y reactivar usuarios

**User Story:** Como Administrador, quiero desactivar y reactivar usuarios, para cortar o restablecer su acceso.

#### Acceptance Criteria

1. WHEN el Administrador elige desactivar un usuario activo, THE Administracion_UI SHALL mostrar una confirmación explícita que incluya el nombre y el identificador de usuario del usuario objetivo, y SHALL NOT enviar la solicitud al `bff` hasta que el Administrador confirme. [CONDICIONADO a B-1]
2. WHEN el Administrador cancela la confirmación de desactivación, THE Administracion_UI SHALL cerrar la confirmación sin enviar ninguna solicitud y SHALL mantener al usuario como activo. [CONDICIONADO a B-1]
3. WHEN el `bff` confirma la desactivación, THE Administracion_UI SHALL mostrar al usuario como inactivo en la lista y en el detalle, y SHALL informar que su sesión viva se revoca en un máximo de 30 segundos (ADR 26). [CONDICIONADO a B-1]
4. IF el `bff` responde `409` porque la desactivación dejaría al sistema sin `administrador`, THEN THE Administracion_UI SHALL explicar ese motivo, mantener al usuario como activo y SHALL NOT presentar la desactivación como aplicada. [CONDICIONADO a B-1]
5. WHEN el Administrador reactiva un usuario inactivo, THE Administracion_UI SHALL enviar la reactivación, bloquear un segundo envío mientras la solicitud está en curso y mostrar al usuario como activo, en la lista y en el detalle, solo cuando el `bff` lo confirme. [CONDICIONADO a B-1]
6. WHILE una solicitud de desactivación está en curso, THE Administracion_UI SHALL bloquear un segundo envío de la desactivación sobre el mismo usuario. [CONDICIONADO a B-1]
7. IF la desactivación o la reactivación falla por un motivo distinto del `409` del último administrador (error de red, falta de respuesta o rechazo del `bff`), THEN THE Administracion_UI SHALL mostrar un error que indique que la acción no se aplicó, conservar el estado previo del usuario y permitir reintentar. [CONDICIONADO a B-1]
8. WHILE un usuario está inactivo, THE Administracion_UI SHALL deshabilitar el cambio de rol y el cambio de alcance sobre ese usuario, SHALL NOT enviar solicitudes de cambio de rol ni de alcance para él, y SHALL ofrecer la reactivación.
9. THE Administracion_UI SHALL presentar la desactivación y la revocación masiva como dos acciones separadas, cada una con un texto que describa su efecto: la desactivación deja al usuario inactivo; la revocación masiva lo deja activo y le exige iniciar sesión de nuevo.
10. THE Administracion_UI SHALL permitir que el Administrador se desactive a sí mismo y SHALL NOT aplicar en el cliente la regla del último administrador. La regla de producto (PA-7, DEC-139) es que un administrador puede desactivarse mientras exista otro administrador activo; desactivar al último se rechaza en el servidor con `409` (criterio 4), y la interfaz muestra el resultado que devuelva el `bff`.

### Requirement 9: Administrar organizaciones cliente

**User Story:** Como Administrador, quiero crear, editar y desactivar organizaciones cliente, para habilitar su acceso aislado a la plataforma.

#### Acceptance Criteria

1. WHEN el Administrador abre la sección de organizaciones, THE Administracion_UI SHALL listar todas las organizaciones, activas e inactivas, mostrando por cada una su nombre, su identificador de tenant y su estado (activa o inactiva). [CONDICIONADO a B-3]
2. WHEN el Administrador crea una organización, THE Administracion_UI SHALL pedir nombre, correo de contacto y teléfono de contacto, los tres obligatorios (PA-2, DEC-139), y SHALL NOT pedir el identificador de tenant; el identificador lo genera el sistema y es inmutable. [CONDICIONADO a B-3]
3. WHEN el `bff` confirma la creación, THE Administracion_UI SHALL mostrar la organización en la lista con su identificador de tenant y su estado activa, y SHALL ofrecerla como opción seleccionable al asociar un usuario Cliente (Requirement 4). [CONDICIONADO a B-3]
4. WHEN el Administrador edita una organización, THE Administracion_UI SHALL permitir modificar su nombre, correo de contacto y teléfono de contacto, y SHALL mostrar el identificador de tenant como valor de solo lectura. [CONDICIONADO a B-3]
5. THE Administracion_UI SHALL NOT ofrecer ninguna acción que modifique el identificador de tenant de una organización existente.
6. THE Administracion_UI SHALL tratar las organizaciones como planas y SHALL NOT ofrecer organización padre, subordinadas ni agrupación de organizaciones (DEC-022).
7. THE Administracion_UI SHALL validar los datos de contacto así (PA-2, DEC-139): nombre, correo y teléfono obligatorios; el correo con validación mínima (contiene `@`); el teléfono sin regla de formato.
8. IF el `bff` rechaza la creación o la edición porque ya existe otra organización con el mismo nombre, THEN THE Administracion_UI SHALL conservar lo capturado en el formulario abierto, SHALL NOT modificar la lista y SHALL mostrar un mensaje que indique el conflicto de nombre. [CONDICIONADO a B-3]
9. WHERE la lista de organizaciones no tiene ningún elemento, THE Administracion_UI SHALL mostrar un estado vacío con la opción de crear la primera.
10. WHILE una solicitud de creación o de edición de organización está en curso, THE Administracion_UI SHALL deshabilitar la acción de envío del formulario correspondiente, de modo que se emita una sola solicitud por acción del Administrador, y SHALL volver a habilitarla cuando la solicitud termine.
11. IF el Administrador intenta crear o guardar una organización con el nombre, el correo o el teléfono vacíos o compuestos solo por espacios, o con un correo sin `@`, THEN THE Administracion_UI SHALL NOT enviar la solicitud al `bff`, SHALL conservar el formulario abierto y SHALL indicar qué campo es obligatorio o inválido.
12. IF la solicitud de creación o de edición falla por una causa distinta del conflicto de nombre (error del `bff` o falta de conexión), THEN THE Administracion_UI SHALL conservar lo capturado, SHALL NOT modificar la lista, SHALL mostrar un mensaje que indique que la operación no se completó y SHALL permitir reintentar sin recapturar. [CONDICIONADO a B-3]
13. IF la carga de la lista de organizaciones falla, THEN THE Administracion_UI SHALL mostrar un estado de error que indique que la lista no pudo obtenerse, SHALL NOT mostrar el estado vacío del criterio 9 y SHALL ofrecer una acción para reintentar la carga. [CONDICIONADO a B-3]

### Requirement 10: Desactivar una organización con consecuencia visible

**User Story:** Como Administrador, quiero ver cuántos usuarios perderán el acceso antes de desactivar una organización, para decidir con conocimiento de la consecuencia.

#### Acceptance Criteria

1. WHEN el Administrador inicia la desactivación de una organización, THE Administracion_UI SHALL mostrar, antes de enviar la solicitud, una confirmación que contenga el nombre de la organización, la consecuencia (sus usuarios pierden el acceso), una acción explícita para confirmar y una acción explícita para cancelar. [CONDICIONADO a B-3]
2. WHERE la organización tiene usuarios activos, THE Administracion_UI SHALL mostrar en la confirmación el número de usuarios activos afectados, tal como lo devuelve el `bff` y sin calcularlo en el cliente, y SHALL permitir revisar la lista de esos usuarios activos con su nombre e identificador de usuario. [CONDICIONADO a B-2, B-3]
3. WHERE la organización no tiene usuarios activos, THE Administracion_UI SHALL indicar en la confirmación que ningún usuario activo pierde el acceso. [CONDICIONADO a B-2, B-3]
4. THE Administracion_UI SHALL NOT enviar la desactivación hasta que el Administrador active la acción de confirmar después de haber visto la consecuencia en la confirmación. [CONDICIONADO a B-3]
5. WHEN el Administrador cancela la confirmación o la cierra sin confirmar, THE Administracion_UI SHALL NOT enviar la desactivación y SHALL mantener la organización como activa. [CONDICIONADO a B-3]
6. WHEN el `bff` confirma la desactivación, THE Administracion_UI SHALL mostrar la organización como inactiva con el estado que devuelve el `bff` y SHALL indicar que el acceso de sus usuarios se retira en su siguiente refresco (PA-8) y SHALL NOT afirmar que las sesiones vivas se hayan revocado ni prometer el plazo de 30 segundos. [CONDICIONADO a B-3]
7. WHILE una organización está inactiva, THE Administracion_UI SHALL NOT ofrecerla en el selector de organización del alta de usuarios Cliente ni en el cambio de rol de un usuario hacia `cliente`. [CONDICIONADO a B-3]
8. IF el `bff` rechaza la desactivación o la solicitud falla sin respuesta del `bff`, THEN THE Administracion_UI SHALL mostrar un aviso de error que indique el motivo cuando el `bff` lo devuelva, SHALL NOT presentar la desactivación como realizada y SHALL volver a mostrar la organización con el estado vigente que devuelva el `bff`. [CONDICIONADO a B-3]
9. THE Administracion_UI SHALL tratar la desactivación de una organización como terminal y SHALL NOT ofrecer reactivarla (PA-8, DEC-139). El retiro de acceso de sus usuarios llega en el siguiente refresco, acotado a la vida del token (DEC-091), y la interfaz SHALL NOT presentarlo como una revocación en vivo ni prometer el máximo de 30 segundos.
10. IF no es posible obtener el número de usuarios activos afectados o su lista al mostrar la confirmación, THEN THE Administracion_UI SHALL mostrar un aviso de error, SHALL ofrecer reintentar la consulta y SHALL NOT permitir confirmar la desactivación. [CONDICIONADO a B-2, B-3]
11. WHILE la solicitud de desactivación está en curso, THE Administracion_UI SHALL bloquear la acción de confirmar para impedir un segundo envío. [CONDICIONADO a B-3]

### Requirement 11: Revocar todas las sesiones de un usuario

**User Story:** Como Administrador, quiero revocar todas las sesiones activas de un usuario, para cortar su acceso sin desactivar su cuenta.

#### Acceptance Criteria

1. WHEN el Administrador elige revocar las sesiones de un usuario, THE Administracion_UI SHALL mostrar una confirmación explícita que contenga el nombre y el identificador de usuario del usuario objetivo, el texto de que perderá el acceso en todas sus sesiones, un campo de motivo obligatorio de texto libre (PA-1, DEC-139) y una acción para confirmar y una para cancelar. La acción de confirmar permanece deshabilitada mientras el motivo esté vacío o compuesto solo por espacios. [CONDICIONADO a B-5]
2. WHEN el Administrador cancela la confirmación o la cierra sin confirmar, THE Administracion_UI SHALL NOT enviar ninguna solicitud de revocación y SHALL conservar sin cambios el detalle del usuario. [CONDICIONADO a B-5]
3. WHILE la revocación masiva de un usuario está en curso (desde el envío hasta la respuesta del `bff` o el agotamiento del tiempo de espera de la solicitud), THE Administracion_UI SHALL mostrar el estado "revocación en curso" para ese usuario, deshabilitar la acción de revocar para ese usuario y SHALL NOT enviar una segunda solicitud para ese mismo usuario. [CONDICIONADO a B-5]
4. WHEN el `bff` confirma la revocación, THE Administracion_UI SHALL mostrar un aviso de éxito que presente el resultado que el `bff` devuelva, sin agregar ni calcular datos que el `bff` no devuelva, e indicar que el acceso HTTP y las conexiones SSE terminan en un máximo de 30 segundos (ADR 26). [CONDICIONADO a B-5]
5. THE Administracion_UI SHALL NOT afirmar que la sesión ya dejó de funcionar al momento de la confirmación del `bff`; el corte tiene un máximo contractual de 30 segundos.
6. IF la solicitud de revocación falla, el `bff` responde con error o el tiempo de espera de la solicitud se agota, THEN THE Administracion_UI SHALL informar que no se pudo confirmar la revocación, SHALL NOT presentar las sesiones como revocadas, SHALL NOT asumir que la revocación no se aplicó, SHALL volver a habilitar la acción de revocar y SHALL ofrecer reintentar. [CONDICIONADO a B-5]
7. IF el `bff` responde `403` a la revocación, THEN THE Administracion_UI SHALL mostrar el aviso de autorización insuficiente del Requirement 1 y SHALL NOT presentar la revocación como realizada. [CONDICIONADO a B-5]
8. WHERE el usuario objetivo no tiene sesiones activas, THE Administracion_UI SHALL mostrar el resultado que devuelva el `bff` como informativo y SHALL NOT presentarlo como error. [CONDICIONADO a B-5]
9. THE Administracion_UI SHALL NOT ofrecer la revocación de una sola sesión por `sesion_id` ni enumerar las sesiones de un usuario; esa superficie no existe (B-5).
10. THE Administracion_UI SHALL capturar el motivo de revocación como texto libre, sin catálogo (PA-1, DEC-139), y SHALL enviarlo en la solicitud de revocación. El motivo queda en la auditoría local de identidad y no cambia el evento `sesion.revocada`.
11. WHEN el usuario objetivo es el sujeto de la sesión, THE Administracion_UI SHALL NOT ofrecer la revocación masiva sobre sí mismo, SHALL NOT enviar solicitud de revocación sobre ese usuario y SHALL remitir al cierre de sesión propio.

### Requirement 12: Auditoría y exclusiones de V1

**User Story:** Como Administrador, quiero que la interfaz no prometa auditoría ni capacidades que V1 no tiene, para no confiar en algo que el sistema no ofrece.

#### Acceptance Criteria

1. WHEN el `bff` confirma una revocación de sesiones, un cambio de rol o un cambio de alcance, THE Administracion_UI SHALL NOT mostrar en ninguna superficie de la pantalla (mensaje de confirmación, detalle del usuario, lista o ayuda contextual) texto que afirme o sugiera que la acción fue auditada, registrada en bitácora o consultable; la auditoría la registra el servidor.
2. THE Administracion_UI SHALL NOT incluir en `/administracion` ningún control (botón, enlace, pestaña, opción de menú o acción de exportación) para consultar o exportar la auditoría de revocaciones o de cambios de rol y de alcance, porque la consulta de auditoría pertenece al `administrador` (DEC-036) y no existe superficie en el contrato (B-6).
3. THE Administracion_UI SHALL ofrecer exactamente los ocho roles de DEC-045 (identificadores de DEC-053) como opciones de rol en el alta y en el cambio de rol, y SHALL NOT incluir el rol Auditor entre ellas (DEC-036).
4. THE Administracion_UI SHALL tratar las organizaciones como una lista plana y SHALL NOT mostrar ni permitir seleccionar, crear o editar una relación de organización padre u organización hija (DEC-022).
5. THE Administracion_UI SHALL NOT incluir en `/administracion` ningún control para las siguientes acciones: break-glass administrativo (Q65), transferencia de usuarios entre organizaciones, ni edición del identificador de tenant, que se muestra solo como lectura (DEC-022).
6. IF el `bff` responde a una acción de la pantalla con un estado de éxito, THEN THE Administracion_UI SHALL limitar su confirmación al resultado que el `bff` devolvió y SHALL NOT añadir garantías sobre efectos que el contrato no declara (auditoría, notificación al usuario afectado o corte inmediato de sesiones vivas tras un cambio de rol, DEC-091).
7. WHERE DEC-022, DEC-036, DEC-091 o DEC-103 se reabran, THE Administracion_UI SHALL incorporar el cambio únicamente mediante un cambio de spec aprobado, y SHALL NOT habilitar la capacidad correspondiente antes de que ese cambio se registre.

### Requirement 13: Estados de carga, error, sesión y accesibilidad

**User Story:** Como Administrador, quiero señales claras de carga, vacío y error con reintento, y una interfaz accesible, para saber qué ocurre y poder operar con teclado.

#### Acceptance Criteria

1. WHILE se carga la lista de usuarios, la lista de organizaciones o el detalle de un usuario, THE Administracion_UI SHALL mostrar un indicador de carga en la región afectada y SHALL NOT mostrar en ella el mensaje de estado vacío ni el aviso de error.
2. IF una consulta de usuarios, de organizaciones o del detalle de un usuario falla con un error `5xx` o sin respuesta del `bff`, THEN THE Administracion_UI SHALL conservar visibles los datos de la última consulta exitosa, mostrar un aviso de error que identifique qué consulta falló y ofrecer un control de reintento que repita esa misma consulta. THE Administracion_UI SHALL NOT reintentar la consulta de forma automática, y SHALL NOT mostrar el estado vacío cuando no haya datos previos que conservar.
3. IF el `bff` responde `401`, THEN THE Administracion_UI SHALL delegar al flujo de sesión del AppShell, SHALL NOT reintentar la acción en silencio y SHALL NOT presentar la acción como realizada.
4. IF una acción de esta pantalla termina con un error del `bff` o sin respuesta, THEN THE Administracion_UI SHALL tratarla como no aplicada hasta que el `bff` confirme el éxito, SHALL NOT actualizar la lista ni el detalle como si se hubiera aplicado, SHALL conservar lo capturado en el formulario o diálogo, SHALL volver a habilitar el control de envío y SHALL mostrar un aviso de error. IF la acción terminó sin respuesta, THEN el aviso SHALL indicar que el resultado no está confirmado.
5. THE Administracion_UI SHALL permitir operar con teclado todas las acciones, los diálogos de confirmación y los selectores, SHALL mostrar un indicador de foco visible en cada elemento interactivo enfocado y SHALL asignar a cada control un nombre accesible no vacío.
6. THE Administracion_UI SHALL mostrar el estado de un usuario o de una organización (activo, inactivo, bloqueado) con una etiqueta de texto además de cualquier color, de modo que el estado se distinga sin percibir el color.
7. THE Administracion_UI SHALL usar componentes de `@ai27-tech/ui` y SHALL NOT duplicar localmente un componente que la librería ya ofrece.
8. THE Administracion_UI SHALL usar tipos de `@ai27-tech/contracts` y SHALL NOT declarar a mano tipos de wire, enums de rol ni errores que el contrato ya define.
9. WHERE la librería `@ai27-tech/ui` no ofrezca un componente necesario, THE Administracion_UI SHALL componerlo con primitivas de la librería y SHALL registrar la brecha de UI en `BRECHAS.md`.
10. WHEN se abre un diálogo, THE Administracion_UI SHALL mover el foco a un elemento dentro del diálogo y SHALL mantener el foco dentro de él mientras permanezca abierto.
11. WHEN se cierra un diálogo, THE Administracion_UI SHALL devolver el foco al elemento que lo abrió o, si ese elemento ya no existe, al encabezado de la sección en que se encontraba.

## Escenarios

### Escenarios positivos

**Escenario 1. Alta de un usuario interno** _(CONDICIONADO a B-1, B-7)_  
Dado que soy Administrador, cuando doy de alta a un usuario con nombre, identificador de usuario y el rol `monitorista`, entonces el usuario aparece activo con ese rol y la interfaz no me pide organización.

**Escenario 2. Alta de un usuario Cliente con organización** _(CONDICIONADO a B-1, B-3)_  
Dado que existe una organización activa, cuando doy de alta a un usuario con el rol `cliente` y elijo esa organización, entonces el usuario queda asociado a esa única organización.

**Escenario 3. Asignar unidades a un Monitorista** _(CONDICIONADO a B-4)_  
Dado que un Monitorista no tiene unidades, cuando le asigno dos unidades del roster, entonces su detalle muestra el alcance efectivo que devuelve el `bff` con esas dos unidades.

**Escenario 4. Cambiar el rol de un usuario** _(CONDICIONADO a B-1)_  
Dado que un usuario activo es `monitorista`, cuando le asigno el rol `supervisor`, entonces el detalle muestra el nuevo rol y un aviso de que el cambio surte efecto en el siguiente refresco de su sesión.

**Escenario 5. Crear una organización** _(CONDICIONADO a B-3)_  
Dado que soy Administrador, cuando creo una organización con su nombre, entonces aparece activa con un identificador de tenant que no pedí y que no puedo editar.

**Escenario 6. Desactivar una organización con usuarios activos** _(CONDICIONADO a B-2, B-3)_  
Dado que una organización tiene usuarios activos, cuando inicio su desactivación, entonces la confirmación muestra cuántos usuarios perderán el acceso y no se envía nada hasta que confirmo.

**Escenario 7. Revocar todas las sesiones de un usuario** _(CONDICIONADO a B-5)_  
Dado que un usuario tiene sesión viva, cuando confirmo la revocación de todas sus sesiones, entonces veo el estado "en curso", después el resultado y el aviso de que el corte tarda un máximo de 30 segundos.

**Escenario 8. Desactivar y reactivar un usuario** _(CONDICIONADO a B-1)_  
Dado que un usuario activo ya no debe acceder, cuando lo desactivo y confirmo, entonces aparece inactivo con el aviso del corte de sesión; cuando lo reactivo, entonces aparece activo.

### Escenarios negativos y de borde

**Escenario 9. Un usuario sin rol de administrador no ve la asignación** _(prueba de DoD)_  
Dado que mi rol es `jefe_operativo`, cuando recorro el panel, entonces no veo la entrada "Administración" y, si abro `/administracion` por URL, veo el aviso de acceso no autorizado sin controles de rol ni de alcance.

**Escenario 10. Intento de auto-escalada** _(prueba de DoD; el rechazo del servidor está CONDICIONADO a B-1, B-4)_  
Dado que soy Administrador y abro mi propio detalle, cuando intento cambiar mi rol o mi alcance, entonces los controles están deshabilitados con el motivo visible y no se envía ninguna solicitud; si el `bff` aun así responde `403`, veo el estado de auto-escalada bloqueada y mi rol no cambia.

**Escenario 11. Cambio de rol a un rol que ya tiene** _(CONDICIONADO a B-1)_  
Dado que un usuario ya es `ejecutivo`, cuando confirmo el mismo rol y el `bff` responde `409`, entonces veo el motivo y no se presenta ningún cambio.

**Escenario 12b. Autodesactivación con otro administrador** _(CONDICIONADO a B-1)_
Dado que existe otro administrador activo, cuando me desactivo y confirmo, entonces la desactivación se aplica; si soy el último administrador activo y el `bff` responde `409`, entonces veo el motivo y sigo activo.

**Escenario 12. Último administrador** _(CONDICIONADO a B-1)_  
Dado que solo existe un `administrador` activo, cuando intento desactivarlo o cambiarle el rol y el `bff` responde `409`, entonces veo que el sistema quedaría sin administrador y el usuario sigue como estaba.

**Escenario 13. Ejecutivo sin clientes asignables**  
Dado que abro el detalle o el alta de un usuario `ejecutivo`, cuando reviso los controles, entonces no existe campo ni acción para asignarle clientes.

**Escenario 14. Revocación masiva en curso con doble clic** _(CONDICIONADO a B-5)_  
Dado que la revocación de un usuario está en curso, cuando vuelvo a pulsar la acción, entonces no se envía una segunda solicitud y se mantiene el estado "en curso".

**Escenario 15. Falla de la revocación masiva** _(CONDICIONADO a B-5)_  
Dado que la revocación falla por red o `5xx`, cuando la respuesta no llega, entonces la interfaz informa que no se pudo confirmar, no presenta las sesiones como revocadas y permite reintentar.

**Escenario 16. Quitar un rol no corta la sesión viva** _(CONDICIONADO a B-1)_  
Dado que un usuario con sesión viva pierde un rol, cuando confirmo el cambio, entonces la interfaz no revoca sus sesiones por su cuenta y me recuerda que el cambio surte efecto en el siguiente refresco; si quiero cortar el acceso, uso la desactivación o la revocación masiva.

**Escenario 17. Identificador de tenant inmutable** _(CONDICIONADO a B-3)_  
Dado que edito una organización existente, cuando reviso el formulario, entonces el identificador de tenant se muestra de solo lectura y no hay forma de cambiarlo.

**Escenario 18. Organización inactiva fuera del alta de Cliente** _(CONDICIONADO a B-3)_  
Dado que una organización está inactiva, cuando doy de alta un usuario `cliente`, entonces esa organización no aparece en el selector.

**Escenario 19. Sesión expirada durante una acción**  
Dado que mi sesión expira al confirmar una acción, cuando el `bff` responde `401`, entonces la interfaz delega al flujo de sesión del AppShell y no presenta la acción como realizada.

**Escenario 20. Revocación masiva con dos usuarios con sesión viva** _(prueba e2e de DoD; CONDICIONADO a B-5; PA-5 resuelto)_  
Dado que dos usuarios distintos tienen cada uno su sesión viva, cuando el Administrador revoca las sesiones de cada uno con su motivo, entonces ambos dejan de acceder por HTTP y SSE dentro del máximo contractual de 30 segundos. En V1 un sujeto tiene a lo sumo una sesión viva y un login nuevo revoca la anterior (DEC-138), por lo que el e2e usa dos sujetos.

## Preguntas abiertas

Estos puntos no se fijan en este spec. Son decisiones de Producto o de Plataforma y no reglas.

Estado tras DEC-139 y la respuesta de Lead (2026-11-05). Lo decidido ya está incorporado en los requisitos; lo pendiente no se fija.

**Decididas**

- **PA-1.** Motivo de revocación obligatorio, texto libre, sin catálogo (Requirement 11).
- **PA-2.** Contacto de la organización: nombre, correo y teléfono obligatorios; correo con validación mínima de `@`, teléfono sin formato (Requirement 9).
- **PA-5.** El e2e de revocación masiva usa dos sujetos distintos (DEC-138; escenario 20).
- **PA-7.** Un administrador puede desactivarse si existe otro activo; desactivar al último se rechaza (Requirement 8.10).
- **PA-8.** Desactivar una organización es terminal, sin reactivar; el acceso de sus usuarios se retira en el siguiente refresco (Requirement 10).
- **PA-9.** El cambio de rol surte efecto en el siguiente refresco (DEC-091); el máximo de 30 s es solo de la revocación de sesión.
- **PA-10.** El identificador de usuario es inmutable en V1; editar un usuario cambia el nombre.

**Pendientes**

- **PA-3.** Vínculo Monitorista↔unidad (E4-HU-018, DEC-045). Owner: Operación/Producto. Bloquea el modelo de alcance (B-4).
- **PA-4.** Textos exactos de mensajes. Se usan los provisionales marcados, centralizados en `mensajes.ts`.
- **PA-6.** Qué pasa con el alcance previo al cambiar de rol. Ligado a PA-3.

## Dependencias

- `E4-HU-018`, `E4-HU-019`, `E4-HU-020`: comportamiento funcional de usuarios, roles, alcances, organizaciones y revocación (en Borrador en el repo de contexto).
- E8-T6: sesión y autenticación del panel interno (sujeto de la sesión, `401`).
- E8-T4: AppShell, navegación, rol efectivo y flujo de sesión. La navegación actual muestra "Administración" a todos los roles (`ocultarPara: []`); este spec lo acota a `administrador` (Requirement 1).
- `E4-T2` y `E4-T6`: servicio de identidad y gobierno (alta, baja, rol, resolución del sujeto). Su proyección al `bff` es la brecha B-1.
- DEC-022, DEC-036, DEC-045, DEC-053/054, DEC-091, DEC-103, DEC-137 y DEC-138; ADR 26 (30 s) y ADR 36.
- `listarUnidades` (`bff`) para alimentar el selector de unidades del Monitorista (Requirement 6).
- Contrato generado `@ai27-tech/contracts` y componentes de `@ai27-tech/ui`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff` o de `identidad`.
- Llamar directamente a `identidad`; el frontend solo habla con el `bff` (DEC-137).
- **Rol Auditor** y jerarquía de tenants (DEC-036, DEC-022).
- **Consulta y exportación de auditoría** de revocaciones y cambios (no hay superficie; B-6).
- **Asignar clientes a un Ejecutivo** y cualquier edición de su alcance de chat (E4-HU-018, DEC-103).
- Membresía de bandejas y pools de mensajería (se deriva del rol, DEC-127 y DEC-130).
- Break-glass administrativo (Q65), contratos y SLA por organización (E5-HU-024).
- Autenticación, segundo factor y cierre de la propia sesión (E8-T5, E8-T6).
- Cualquier cálculo local de autorización, alcance o regla del último administrador.
- Catálogos operativos (E8-T8 en adelante) y el portal de cliente (E9).

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas. El detalle, las fuentes y el estado de cada una están en `BRECHAS.md`. Si una verificación no está disponible, se documenta la brecha y no se inventa una alternativa.

- **B-1. Sujetos y roles no están en el `bff`.** `identidad.yaml` define `altaSujeto`, `obtenerSujeto`, `desactivarSujeto`, `reactivarSujeto`, `listarHistorialSujeto` y `fijarRolSujeto`, pero no son públicas (DEC-137). Falta la proyección al `bff` con `operationId` propios.
- **B-2. No existe listado ni búsqueda de sujetos** en ningún servicio.
- **B-3. No existe la superficie de organizaciones** en ningún OpenAPI.
- **B-4. No existe el modelo ni las operaciones de alcance** (unidades del Monitorista, Monitoristas del Supervisor, Supervisores del Coordinador). Depende de PA-3.
- **B-5. No existe "revocar todas las sesiones de un sujeto".** `revocarSesion` es por `sesion_id` y no hay forma de enumerar las sesiones de un sujeto. Solo `desactivarSujeto` revoca la sesión viva.
- **B-6. No existe consulta de auditoría de revocaciones.** La respuesta de Lead (2026-11-05) no la menciona; el motivo queda en la auditoría local de identidad (PA-1). Pendiente de confirmar si habrá vista.
- **B-7 (decidida, DEC-112/DEC-129). `tenant_id` para usuarios internos.** Hay un tenant interno único de AI27 para los siete roles internos y un tenant tipo cliente por organización. La interfaz no captura ni deriva el tenant de un interno; lo pone el servidor. Para `cliente` va la organización. Texto original de la brecha: `AltaSujetoEntrada` exige `tenant_id` para todo rol; E4-HU-018 solo liga la organización al rol `cliente`. No está definido qué valor lleva un usuario interno.
- **B-8 (decidida, PA-10).** El identificador de usuario es inmutable en V1; editar usuario cambia el nombre. Falta la operación en el contrato (ola de B-9).
- **B-9. Pin del contrato.** `package.json` fija `@ai27-tech/contracts@0.1.0-tracer.36`; el último publicado es `v0.1.0-tracer.37`. Para esta superficie `tracer.36` y `tracer.37` son idénticos. No se sube el pin sin aprobación explícita.
- **B-10. Contradicciones del repo de contexto.** La historia técnica E8-T19 dice "un Ejecutivo puede tener varios clientes" y cita `/api/v1/roles/...`; E4-HU-018 y DEC-103 la superan en lo primero, y el contrato de `identidad` no tiene rutas de roles aparte (el rol se fija con `PUT /sujetos/{id}/rol`). La historia técnica y la línea equivalente de E4-HU-018 (matriz del Ejecutivo) quedan por corregir.
- **B-11. Brechas de UI.** `@ai27-tech/ui@0.2.0-beta.6` no tiene un multi-select dedicado para varias unidades, Monitoristas o Supervisores. Se compone con `Table`/`Card` + `Checkbox` (mismo criterio que E8-T11). Verificar la API de `Modal`, `Table`, `FilterTable`, `Select`, `Badge` y `Toast`.
- **B-12. Navegación.** `navigationConfig.ts` muestra "Administración" a todos los roles internos. Cumplir el Requirement 1 exige restringirla a `administrador` (campo `visiblePara`). Es un cambio de E8-T4 que se hace al implementar, no antes.
- **B-13 (pendiente, Identidad/Seguridad).** Ninguna fuente exige reautenticación. **Segundo factor.** No se revisó si las acciones sensibles (desactivar, revocar) exigen reautenticación; no se asume.

## Trazabilidad

- Solo el `administrador` asigna roles y no hay controles para otros roles: Requirement 1 y escenario 9; DoD de E8-T19 (primera prueba); E4-HU-018 Escenario 9.
- Ocho roles, uno por usuario: Requirements 3 y 5 y escenarios 1, 2 y 4; E4-HU-018 (criterio 1); DEC-045, DEC-053.
- Usuario Cliente atado a una organización: Requirements 3 y 4 y escenarios 2 y 18; E4-HU-018 (criterio 2); E4-HU-019.
- Alcance de monitoreo (Monitorista, Supervisor, Coordinador): Requirement 6 y escenario 3; E4-HU-018 Escenarios 1 y 2; sujeto a B-4 y PA-3.
- Ejecutivo sin clientes asignados: Requirement 6.5 y escenario 13; E4-HU-018 (nota de DEC-103); la línea "varios clientes" de la historia técnica E8-T19 queda superada por E4-HU-018 y DEC-103.
- Un usuario no puede editar su propio rol o alcance: Requirement 7 y escenario 10; E4-HU-018 Escenario 9; DoD (segunda prueba).
- Quita de rol surte efecto en el siguiente refresco: Requirement 5.4 y 5.5 y escenarios 4 y 16; E4-HU-020 Escenario 3; DEC-091.
- Desactivar y reactivar usuarios, último administrador: Requirement 8 y escenarios 8 y 12; contrato de `identidad` (`desactivarSujeto`, `reactivarSujeto`).
- Organizaciones planas, tenant inmutable: Requirement 9 y escenarios 5 y 17; E4-HU-019 Escenario 1; DEC-022.
- Desactivar organización con consecuencia visible: Requirement 10 y escenarios 6 y 18; E4-HU-019 Escenario 3; estado obligatorio de E8-T19.
- Revocación masiva y revocación en curso: Requirement 11 y escenarios 7, 14, 15 y 20; E4-HU-020 Escenario 2; ADR 26; DoD (tercera prueba, sujeta a PA-5).
- Auditoría, rol Auditor y exclusiones: Requirement 12; DEC-036; E4-HU-020 (criterio de auditoría).
- Estados, sesión y accesibilidad: Requirement 13 y escenario 19.
