# Requirements Document

## Introduction

**Emergencia: activación por usuario de monitoreo y bandeja de Reacción** (E8-T18) es la parte del panel interno donde (a) un Monitorista, Supervisor o Coordinador activa una emergencia sobre un viaje de su alcance y la documenta con notas, y (b) el área de Reacción recibe los casos en una bandeja y los lleva hasta su resolución, con el cierre administrativo a cargo de monitoreo. Satisface `E7-HU-029` y `E7-HU-030` en el alcance V1 de DEC-027, DEC-028, DEC-034, DEC-099, DEC-121 y DEC-125 a DEC-133. La bandeja vive en `/emergencias`, hoy un stub (E8-T4) que `useInitialRoute` ya asigna al rol `reaccion`.

**Alcance V1 (decidido):**

- **Un caso por pulsación intencional.** Cada pulsación crea y envía de inmediato un caso independiente, sin exigir nota previa. La reentrega técnica de la misma activación no duplica (idempotencia por `activacion_id`).
- **Ciclo del caso:** `abierta → en_atencion → resuelta → cerrada`. `resuelta` y `cerrada` son irreversibles.
- **Bandeja única por rol** (DEC-130): todo usuario `reaccion` es miembro. Supervisor y Coordinador ven bandeja, detalle y notas y liberan o transfieren, pero no reclaman ni resuelven (DEC-131).
- **Rutas por id del caso, sin `viaje_id`** (DEC-121). La fila de la bandeja no lleva viaje ni cliente; el detalle sí lleva la información del viaje que Reacción necesita (DEC-028 #5). Los casos `cerrada` no aparecen en la bandeja, ordenados del más antiguo al más reciente.
- **Reacción lee notas y no las escribe.** Las notas son unidireccionales de Cliente y usuario interno hacia Reacción (DEC-034). La nota de resolución es obligatoria.
- **Reacción no accede al viaje, la bitácora, las incidencias ni la conversación del cliente** (DEC-028): su interfaz es la bandeja y el caso.
- **Sin ubicación** en el caso (DEC-001). La activación no crea incidencia ni condición.
- **Sin escalamiento automático** de casos no reclamados: es V2 (DEC-099).

**Sobre el contrato (`tracer.37`):** la bandeja de Reacción, el cierre y el carril del monitoreo por viaje (activar, anotar y listar casos, DEC-135) están contratados y el backend los sirve. Los Requirements 1 y 2 y el cierre desde el viaje (Requirement 8, parte B) ya no están condicionados; su construcción solo espera la subida del pin a `tracer.37` (BRECHAS.md, prerrequisito 7). **La transferencia dirigida queda fuera de V1** (DEC-134, DT-15): el panel no la ofrece y "Devolver al pool" es el único modo de soltar un caso.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos ni componentes compartidos. Autorización, alcance, membresía, ventana de notas, atomicidad, idempotencia y auditoría los resuelve el `bff`/`mensajeria`; la interfaz consume resultados y clasifica respuestas.

## Glossary

- **Emergencia_UI**: el sistema de interfaz de emergencias del panel interno (acción de activar en el detalle del viaje y bandeja `/emergencias`). Es el "sistema" al que refieren los criterios.
- **Usuario_de_monitoreo**: rol `monitorista`, `supervisor` o `coordinador` (DEC-045 #9). El `ejecutivo` no activa emergencias.
- **Reacción**: rol `reaccion`. Atiende casos; sin acceso al viaje ni a la conversación del cliente.
- **Caso**: caso de emergencia. Agregado propio, distinto del estado del viaje. Estados: `abierta`, `en_atencion`, `resuelta`, `cerrada` (`EstadoEmergencia`).
- **Bandeja de emergencias**: cola única del rol `reaccion` (DEC-130), sin `{id}`.
- **Reclamo**: asignación exclusiva de la atención del caso; hay un responsable vigente. Reclamar solo procede si nadie lo tiene (DEC-125).
- **Versión de reclamo**: entero de concurrencia optimista (`version_reclamo`); se envía como `version_esperada`.
- **Activación**: pulsación intencional que crea un caso. `activacion_id` es la clave de idempotencia generada por el cliente.
- **Responsable vigente**: titular del `reclamo_activo` del caso.
- **Nota de resolución**: nota obligatoria de 1 a 1.000 caracteres con la que se resuelve el caso (`es_resolucion`).
- **BFF**: backend-for-frontend de AI27. Única puerta HTTP del frontend.

## Requirements

### Requirement 1: Activar una emergencia desde el viaje

**User Story:** Como Usuario_de_monitoreo, quiero activar una emergencia sobre un viaje de mi alcance con un solo gesto, para que Reacción la reciba de inmediato.

#### Acceptance Criteria

1. WHERE el rol de la sesión es `monitorista`, `supervisor` o `coordinador` y el viaje está en `Solicitado` o en cualquier estado no terminal, THE Emergencia_UI SHALL ofrecer el botón de emergencia en el detalle del viaje.
2. THE Emergencia_UI SHALL NOT ofrecer el botón en los estados terminales (`Cerrado`, `Cancelado`, `Rechazado por AI27`, `Rechazado por el cliente`) ni a los roles `ejecutivo`, `reaccion`, `jefe_operativo` y `administrador`.
3. WHEN el usuario pulsa el botón, THE Emergencia_UI SHALL crear el caso de inmediato, sin exigir ni pedir una nota previa, enviando una clave `activacion_id` generada en el cliente.
4. IF la activación falla por red o por una respuesta sin confirmar, THEN THE Emergencia_UI SHALL reutilizar el mismo `activacion_id` en el reintento para que no se cree un segundo caso.
5. WHEN el usuario realiza una nueva pulsación intencional después de una activación confirmada, THE Emergencia_UI SHALL generar un `activacion_id` nuevo, porque es otro caso.
6. WHILE una activación está en curso, THE Emergencia_UI SHALL bloquear el doble clic accidental sobre esa misma pulsación sin impedir una pulsación intencional posterior.
7. WHEN la activación se confirma, THE Emergencia_UI SHALL mostrar un aviso de éxito y ofrecer, sin obligarla, la captura de una nota para ese caso.
8. IF el `bff` responde `409` con `viaje_en_estado_terminal`, THEN THE Emergencia_UI SHALL informar que el viaje ya no admite emergencias y SHALL recargar el viaje.
9. IF el `bff` responde `403`, THEN THE Emergencia_UI SHALL informar que la acción no está autorizada para el viaje y SHALL NOT crear ni mostrar un caso.
10. THE Emergencia_UI SHALL NOT crear incidencia ni condición del viaje al activar, ni enviar ubicación.

### Requirement 2: Notas del caso por el usuario interno

**User Story:** Como Usuario_de_monitoreo o Administrador, quiero agregar notas a un caso de emergencia, para dar contexto a Reacción.

#### Acceptance Criteria

1. WHILE un caso del viaje está `abierta`, `en_atencion` o `resuelta`, THE Emergencia_UI SHALL permitir a `monitorista`, `supervisor`, `coordinador` y `administrador` agregarle notas opcionales y multilínea, y SHALL NOT ofrecerlas a `reaccion`, `ejecutivo` ni `jefe_operativo`.
2. THE Emergencia_UI SHALL recortar espacios al inicio y al final, SHALL NOT guardar una nota vacía o solo de espacios, y SHALL limitar la captura a 1.000 caracteres con contador visible.
3. WHERE el viaje tiene más de un caso que admite notas, THE Emergencia_UI SHALL ofrecer un selector del caso destino, obtenido con `listarEmergenciasViaje`, que muestre únicamente fecha y hora de activación, sin notas ni personal.
4. WHERE el caso está `cerrada`, THE Emergencia_UI SHALL NOT ofrecer nota ni listarlo en el selector, aunque `listarEmergenciasViaje` lo devuelva.
5. IF el `bff` responde `409 emergencia_cerrada`, THEN THE Emergencia_UI SHALL informar que el caso ya no admite notas, conservar el texto capturado y recargar el selector.
6. WHEN la nota se guarda, THE Emergencia_UI SHALL mostrar un aviso de éxito; la copia al histórico interno del viaje la hace el backend y la interfaz SHALL NOT afirmarla.

### Requirement 3: Bandeja de emergencias de Reacción

**User Story:** Como integrante de Reacción, quiero ver los casos pendientes y en atención, para decidir cuál tomar.

#### Acceptance Criteria

1. WHEN un usuario con acceso abre `/emergencias`, THE Emergencia_UI SHALL cargar la bandeja sin enviar identificador de bandeja y mostrar por caso su estado, el origen de activación (`cliente` u `operacion`), quién lo tiene (o que está sin reclamar) y la fecha y hora de activación.
2. THE Emergencia_UI SHALL mostrar los casos en el orden que devuelve el `bff` (del más antiguo al más reciente por `activada_en`) y SHALL NOT filtrar, reordenar ni ampliar el alcance en el cliente.
3. THE Emergencia_UI SHALL diferenciar visualmente los casos sin reclamar, los reclamados por el usuario de la sesión y los reclamados por otra persona, comparando `reclamo_activo.responsable_id` con el sujeto de la sesión.
4. THE Emergencia_UI SHALL NOT mostrar en la fila datos del viaje, del cliente ni notas, y SHALL NOT mostrar identificadores crudos como si fueran nombres; identifica al responsable como "Tú" u "otra persona".
5. WHEN la respuesta incluye `cursor_siguiente`, THE Emergencia_UI SHALL permitir cargar más casos.
6. WHERE la bandeja no tiene casos, THE Emergencia_UI SHALL mostrar un estado vacío diferenciado de carga y de error.
7. IF el `bff` responde `403` o `404` por falta de acceso a la bandeja, THEN THE Emergencia_UI SHALL mostrar un aviso de acceso no autorizado y SHALL NOT mostrar casos.
8. THE Emergencia_UI SHALL NOT mostrar casos `cerrada` en la bandeja.
9. WHERE el rol es `supervisor` o `coordinador`, THE Emergencia_UI SHALL mostrar la bandeja en modo de consulta y SHALL NOT ofrecer reclamar ni resolver (DEC-131).

### Requirement 4: Detalle del caso con información del viaje

**User Story:** Como integrante de Reacción, quiero ver el contexto del viaje del caso, para responder con la información necesaria.

#### Acceptance Criteria

1. WHEN el usuario abre un caso, THE Emergencia_UI SHALL cargar `obtenerEmergencia` por el id del caso y mostrar el estado, el origen de activación, las marcas de tiempo del caso y el bloque de viaje.
2. THE Emergencia_UI SHALL mostrar del viaje el nombre del cliente, el estado, el origen, los destinos con su fecha de cita y su arribo, el tipo de servicio, la fecha y hora del servicio y el ETA estimado, cuando existan.
3. THE Emergencia_UI SHALL mostrar la escolta asignada como las unidades del viaje (tipo, económico, placas) con el nombre y el teléfono de sus custodios, únicamente cuando existan, y un texto neutro cuando el viaje aún no tiene escolta.
4. THE Emergencia_UI SHALL NOT mostrar ubicación, `viaje_id`, bitácora, incidencias ni conversación, ni ofrecer navegación hacia ellos desde el caso.
5. THE Emergencia_UI SHALL mostrar las notas del caso con su autor (audiencia), fecha y hora, en orden de creación, distinguiendo la nota de resolución (`es_resolucion`), con paginación por cursor.
6. THE Emergencia_UI SHALL NOT ofrecer a Reacción escribir notas.
7. IF el `bff` responde `404` al abrir un caso, THEN THE Emergencia_UI SHALL mostrar un aviso de caso no disponible; IF responde `403`, THEN SHALL mostrar un aviso de acceso no autorizado.

### Requirement 5: Reclamar un caso

**User Story:** Como integrante de Reacción, quiero tomar un caso sin reclamar, para que nadie más lo atienda a la vez.

#### Acceptance Criteria

1. WHERE el rol es `reaccion` y el caso está sin reclamar en `abierta`, THE Emergencia_UI SHALL ofrecer "Reclamar".
2. WHEN el usuario reclama, THE Emergencia_UI SHALL enviar la `version_esperada` igual a la `version_reclamo` vigente del caso (nunca un valor fijo) y bloquear el doble envío.
3. WHEN el reclamo se confirma, THE Emergencia_UI SHALL mostrar el caso `en_atencion` con el usuario como responsable.
4. IF el `bff` responde `409` (`conflicto_version_reclamo` o caso ya tomado), THEN THE Emergencia_UI SHALL informar que otra persona lo tiene, recargar el caso y SHALL NOT reintentar en silencio.
5. WHERE el rol es `supervisor` o `coordinador`, THE Emergencia_UI SHALL NOT ofrecer "Reclamar".

### Requirement 6: Liberar el caso (la transferencia dirigida es V2)

**User Story:** Como responsable del caso, Supervisor o Coordinador, quiero devolver el caso al pool, sin perder el expediente.

#### Acceptance Criteria

1. WHERE el usuario es el responsable vigente, o el rol es `supervisor` o `coordinador`, y el caso está `en_atencion`, THE Emergencia_UI SHALL ofrecer "Devolver al pool".
2. WHEN el usuario devuelve el caso, THE Emergencia_UI SHALL pedir confirmación, enviar la versión vigente del reclamo y, al confirmarse, mostrar el caso `abierta` sin reclamar con su historial intacto.
3. THE Emergencia_UI SHALL NOT ofrecer "Devolver al pool" a un integrante de Reacción que no es el responsable vigente.
4. THE Emergencia_UI SHALL NOT ofrecer "Transferir" en V1: la transferencia dirigida se difirió a V2 porque no existe lectura de integrantes de Reacción (DEC-134, DT-15), aunque `transferirEmergenciaPorId` siga en el contrato.
5. IF el `bff` responde `403` o `409`, THEN THE Emergencia_UI SHALL informar el motivo, recargar el caso y SHALL NOT dar el cambio por hecho.

### Requirement 7: Resolver con nota obligatoria

**User Story:** Como responsable vigente de Reacción, quiero resolver el caso dejando constancia de lo que hice, para cerrar la atención operativa con trazabilidad.

#### Acceptance Criteria

1. WHERE el usuario es el responsable vigente y el caso está `en_atencion`, THE Emergencia_UI SHALL ofrecer "Resolver".
2. THE Emergencia_UI SHALL exigir una nota de resolución de 1 a 1.000 caracteres, multilínea, con espacios recortados, y SHALL deshabilitar la confirmación mientras no sea válida.
3. WHEN el usuario confirma, THE Emergencia_UI SHALL enviar la `version_esperada` vigente y la nota, y al confirmarse mostrar el caso `resuelta`.
4. IF el `bff` responde `400` por nota inválida, THEN THE Emergencia_UI SHALL conservar la nota y señalar el error, y SHALL NOT mostrar el caso como resuelto.
5. IF el `bff` responde `403`, THEN THE Emergencia_UI SHALL informar que solo el responsable vigente puede resolver; IF responde `409`, THEN SHALL recargar el caso.
6. THE Emergencia_UI SHALL NOT ofrecer "Resolver" a `supervisor`, `coordinador` ni a un integrante de Reacción que no es el responsable.
7. THE Emergencia_UI SHALL NOT ofrecer reabrir un caso `resuelta`.

### Requirement 8: Cierre administrativo

**User Story:** Como Usuario_de_monitoreo o Administrador, quiero cerrar un caso resuelto, para dar por terminado el expediente.

#### Acceptance Criteria

1. WHERE el caso está `resuelta` y el rol es `monitorista`, `supervisor`, `coordinador` o `administrador`, THE Emergencia_UI SHALL ofrecer "Cerrar caso" con confirmación y sin pedir texto adicional.
2. THE Emergencia_UI SHALL NOT ofrecer "Cerrar caso" a `reaccion` ni a `ejecutivo`, ni en un estado distinto de `resuelta`.
3. WHEN el cierre se confirma, THE Emergencia_UI SHALL mostrar el caso `cerrada`, sin notas nuevas y fuera de la bandeja.
4. IF el `bff` responde `403` (fuera de alcance o rol no autorizado) o `409`, THEN THE Emergencia_UI SHALL informar el motivo, recargar el caso y SHALL NOT dar el cierre por hecho.
5. **Parte B (desde el viaje):** WHERE el usuario cierra desde el detalle del viaje, THE Emergencia_UI SHALL ofrecer "Cerrar caso" sobre los casos `resuelta` devueltos por `listarEmergenciasViaje`. El `monitorista` y el `administrador` obtienen el `eid` de esa lista y cierran con `cerrarEmergenciaPorId`; no necesitan la bandeja.

### Requirement 9: Reacción sin acceso general al viaje

**User Story:** Como organización, quiero que Reacción solo vea el caso, para respetar el alcance de DEC-028.

#### Acceptance Criteria

1. WHERE el rol es `reaccion`, THE Emergencia_UI SHALL NOT mostrar entradas de navegación al viaje, la bitácora, las incidencias ni la conversación del cliente.
2. WHEN un usuario `reaccion` accede por URL a una vista general del viaje y el `bff` responde `403`, THE Emergencia_UI SHALL mostrar el aviso de acceso no autorizado del AppShell.
3. THE Emergencia_UI SHALL tratar la decisión del `bff` como autoridad final, aunque la navegación haya ocultado o mostrado la entrada.

### Requirement 10: Actualización y recuperación

**User Story:** Como integrante de Reacción, quiero que la bandeja y el caso se actualicen sin recargar, para no atender con datos viejos.

#### Acceptance Criteria

1. WHILE la bandeja está abierta, THE Emergencia_UI SHALL volver a consultarla periódicamente y reemplazar la lista con el resultado, sin perder la posición ni el caso abierto.
2. WHILE un caso está abierto, THE Emergencia_UI SHALL volver a consultar su detalle y sus notas periódicamente.
3. THE Emergencia_UI SHALL tomar la cadencia de una configuración del cliente y SHALL NOT asumirla como parte del contrato.
4. IF una consulta falla, THEN THE Emergencia_UI SHALL conservar los datos ya mostrados, indicar que la vista puede estar desactualizada, indicar el momento de la última actualización correcta y reintentar.
5. THE Emergencia_UI SHALL mantener operativas las acciones (activar, reclamar, devolver, transferir, resolver, cerrar, notas) aunque falle la actualización, porque son comandos HTTP durables; una caída de `realtime` no las impide.
6. THE Emergencia_UI SHALL NOT presentar la vista como "en tiempo real".
7. THE Emergencia_UI SHALL aislar el mecanismo de actualización detrás de una interfaz para que el SSE pueda sustituir al polling sin cambiar la vista.
8. WHEN el caso abierto cambia de responsable o de estado por una consulta, THE Emergencia_UI SHALL actualizar las acciones disponibles y anunciar el cambio de forma accesible.

### Requirement 11: Estados de carga, error, sesión y accesibilidad

**User Story:** Como usuario interno, quiero señales claras de carga, vacío y error con reintento, y una interfaz accesible, para saber qué ocurre y operar con teclado.

#### Acceptance Criteria

1. WHILE la bandeja o un caso están cargando, THE Emergencia_UI SHALL mostrar un estado de carga diferenciado del vacío y del error.
2. IF una consulta falla, THEN THE Emergencia_UI SHALL mostrar un error recuperable con acción de reintento.
3. IF el `bff` responde `401`, THEN THE Emergencia_UI SHALL delegar el manejo al flujo de sesión del AppShell y SHALL NOT mostrar un error genérico.
4. WHEN una acción termina con éxito, THE Emergencia_UI SHALL mostrar un aviso de éxito y reflejar el cambio en la vista.
5. THE Emergencia_UI SHALL usar etiquetas, foco y estados accesibles de los componentes de `@ai27-tech/ui`, con confirmaciones operables por teclado y anuncios accesibles de los cambios de estado y de reclamo.

## Escenarios

### Escenarios positivos

**Escenario 1. Activación por usuario de monitoreo**  
Dado un viaje no terminal de mi alcance, cuando pulso el botón de emergencia, entonces se crea un caso independiente de inmediato, sin nota, y veo el aviso de éxito.

**Escenario 2. Activación sin nota**  
Dado que acabo de activar, cuando cierro el panel de nota sin escribir, entonces el caso sigue creado y no se crea incidencia ni condición.

**Escenario 3. Reclamar y resolver**  
Dado un caso `abierta` en mi bandeja, cuando lo reclamo con su versión y después lo resuelvo con una nota válida, entonces pasa a `en_atencion` y luego a `resuelta`, y la nota aparece marcada como resolución.

**Escenario 4. Cierre administrativo**  
Dado un caso `resuelta`, cuando un Monitorista de su alcance lo cierra, entonces pasa a `cerrada`, sale de la bandeja y deja de admitir notas.

**Escenario 5. Devolver al pool**  
Dado que soy el responsable, cuando devuelvo el caso, entonces vuelve a `abierta` sin reclamar y el expediente se conserva.

**Escenario 6. Detalle con escolta**  
Dado un caso con viaje asignado, cuando lo abro, entonces veo cliente, estado, origen, destinos, escolta y teléfonos de custodios, sin ubicación.

**Escenario 7. Nueva información después de resolver**  
Dado un caso `resuelta`, cuando el usuario de monitoreo agrega una nota, entonces complementa el expediente sin reabrirlo.

### Escenarios negativos y de borde

**Escenario 8. Reintento técnico vs. dos pulsaciones**  
Dado que la activación falló por red, cuando reintento, entonces se reutiliza el mismo `activacion_id` y queda un solo caso; y cuando pulso de nuevo después de una confirmación, entonces se crea otro caso con otro `activacion_id`.

**Escenario 9. Viaje terminal**  
Dado un viaje cerrado, cancelado o rechazado, cuando abro su detalle, entonces no hay botón de emergencia; y si el `bff` responde `409 viaje_en_estado_terminal`, el viaje se recarga.

**Escenario 10. El Ejecutivo no activa**  
Dado un usuario `ejecutivo`, cuando consulta un viaje, entonces no dispone del botón de emergencia.

**Escenario 11. Reclamo concurrente**  
Dado que otra persona reclamó un instante antes, cuando mi reclamo recibe `409`, entonces veo que otra persona lo tiene y el caso se recarga.

**Escenario 12. Resolver sin nota**  
Dado el caso `en_atencion`, cuando intento resolver sin nota válida, entonces la confirmación está deshabilitada y, si llega al `bff`, el `400` conserva mi texto y el estado no cambia.

**Escenario 13. Resolver sin ser el responsable**  
Dado que otra persona es la responsable, cuando el `bff` responde `403` a mi resolución, entonces la interfaz informa que solo el responsable puede resolver.

**Escenario 14. Cerrar desde un estado incorrecto o sin rol**  
Dado un caso que no está `resuelta`, o un usuario `reaccion`, cuando se intenta cerrar, entonces no hay acción; y si el `bff` responde `403` o `409`, el caso se recarga sin cambios.

**Escenario 15. Supervisor en consulta**  
Dado un Supervisor, cuando abre un caso de otra persona, entonces puede devolverlo al pool, pero no reclamar ni resolver.

**Escenario 16. Reacción sin acceso al viaje**  
Dado un usuario `reaccion`, cuando intenta una acción general del viaje, entonces el `bff` responde `403` y la interfaz muestra acceso no autorizado.

**Escenario 17. Falla de actualización**  
Dado que una consulta periódica falla, cuando el `bff` no responde, entonces se conserva lo mostrado, se avisa que puede estar desactualizado y se reintenta; las acciones siguen operando.

**Escenario 18. Varios casos en un viaje**  
Dado un viaje con dos casos que admiten notas, cuando agrego una nota, entonces elijo el caso por fecha y hora sin ver notas ni personal.

**Escenario 19. Sesión expirada**  
Dado que la sesión expira durante una acción, cuando el `bff` responde `401`, entonces la interfaz delega al flujo de sesión del AppShell.

## Dependencias

- `E7-HU-029`, `E7-HU-030`; `E7-T1`, `E7-T2`, `E7-T3` (contrato y comportamiento de `mensajeria`); `E0-T9` (comandos HTTP durables).
- E8-T4: AppShell, navegación, rol efectivo y flujo de sesión (`401`).
- E8-T8: detalle del viaje (lugar del botón de emergencia).
- E8-T15: patrón de bandeja con reclamo, versión de concurrencia y polling que esta tarea reutiliza (su SSE es deuda, DT-01).
- DEC-001, DEC-027, DEC-028, DEC-034, DEC-045 #9, DEC-099, DEC-121, DEC-125, DEC-126, DEC-130, DEC-131, DEC-132, DEC-133.
- Contrato generado `@ai27-tech/contracts`: la bandeja y el caso entran en `tracer.34`/`tracer.35` y el carril del monitoreo por viaje en `tracer.37`; el `package.json` fija hoy `tracer.36` y hay que subirlo (tarea 1). Componentes de `@ai27-tech/ui`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`.
- Activación por el **cliente** (portal de cliente, E9).
- **Ubicación** en el caso y escalamiento automático de casos no reclamados (V2, DEC-099).
- Relación de mando Supervisor/Coordinador ↔ Reacción (DT-06): en V1 liberan y transfieren sin verificar mando (DEC-126, DEC-131).
- Conversación bidireccional dentro del caso y chat interno (DEC-034, DEC-029).
- Registrar una incidencia desde la emergencia (acción separada, E8-T13).
- SSE / entrega viva (DT-01).
- Auditoría visible de las acciones: la registra el backend.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas. El detalle está en `BRECHAS.md`.

- **Brechas 1, 2 y 3:** resueltas en `tracer.37` (`activarEmergenciaInterno`, `agregarNotaEmergenciaInterno`, `listarEmergenciasViaje`, DEC-135). Los Requirements 1, 2 y 8 (parte B) se construyen sobre ellas.
- **Brecha 4:** la transferencia dirigida se difirió a V2 (DEC-134, DT-15). Requirement 6.4 la excluye.
- **Brecha 5:** resuelta; los estados terminales se derivan de `esTerminal`/`ESTADOS_TERMINALES` del paquete generado.
- **Discrepancia 6:** resuelta; era un error de redacción. Interno sin acceso: `403` (DEC-132). La interfaz mantiene el tratamiento común de `403` y `404`.
- **Pin del contrato:** hay que subir `@ai27-tech/contracts` de `tracer.36` a `tracer.37` y agregarlo a `minimumReleaseAgeExclude`. No se hace sin aprobación explícita.
- **Códigos `409` de `mensajeria`:** ahora llegan con el código del contrato (`emergencia_cerrada`, `conflicto_version_reclamo`, `transicion_invalida`, etc.) y no como `conflicto`; el wrapper clasifica por ellos.
- **Deuda del backend, sin acción aquí:** alcance por unidad del monitoreo (DT-07) y carrera de la activación frente a un viaje que pasa a terminal (DT-16).
- **Historia técnica E8-T18:** sigue diciendo "contrato por congelar" y SSE; las DEC y el contrato `tracer.37` prevalecen. Falta corregirla en el repo de contexto.- **Textos y cadencia:** textos aprobados (conflicto de reclamo, resolución, cierre, acceso no autorizado) y cadencia del polling (configuración del cliente).
- **Componentes de `@ai27-tech/ui`:** verificar la API exacta de `Modal`, `FilterTable`, `Textarea`, `Badge` y `Toast`.
- **Administrador:** lista, anota y cierra casos pero no activa (DEC-045 #9); falta que Producto defina dónde ve el selector de casos.

## Trazabilidad

- Botón y reglas de estado, un caso por pulsación, sin nota previa: Requirement 1 y escenarios 1, 2, 9 y 10; HU-029 Escenarios 1, 3, 7 y 8.
- Idempotencia del reintento frente a dos pulsaciones: Requirement 1.4 y 1.5 y escenario 8; HU-029 Escenario 4; DoD de E8-T18.
- Notas 1 a 1.000, selector por fecha y hora, `Cerrada` sin notas: Requirement 2 y escenarios 7 y 18; HU-029 Escenarios 5 y 6.
- Bandeja, fila mínima y orden: Requirement 3; HU-030 Escenario 1; DEC-121, DEC-130.
- Detalle con información del viaje, sin ubicación: Requirement 4 y escenario 6; DEC-028 #5, DEC-121.
- Reclamo exclusivo: Requirement 5 y escenario 11; DEC-125.
- Liberar y transferir: Requirement 6 y escenarios 5 y 15; DEC-126, DEC-131.
- Resolución con nota obligatoria, solo responsable: Requirement 7 y escenarios 3, 12 y 13; HU-030 Escenario 5.
- Cierre por monitoreo o administrador, nunca Reacción ni Ejecutivo: Requirement 8 y escenarios 4 y 14; HU-030 Escenario 6.
- Reacción sin acceso general al viaje: Requirement 9 y escenario 16; DoD de E8-T18; DEC-028.
- Caída de `realtime` no impide operar: Requirement 10.5 y escenario 17; DoD de E8-T18, E0-T9.
- Estados y sesión: Requirement 11 y escenario 19.
