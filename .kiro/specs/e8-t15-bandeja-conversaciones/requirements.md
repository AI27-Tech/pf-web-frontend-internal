# Requirements Document

## Introduction

La **bandeja de conversaciones** (E8-T15) es la parte del panel interno donde el Ejecutivo atiende las conversaciones de los clientes desde una bandeja compartida con **reclamo exclusivo**, para que dos personas no le contesten lo mismo al cliente. Cubre listar el trabajo de la bandeja, leer el historial, **reclamar**, responder, **marcar como atendida**, y **devolver la conversación al pool** (liberar). Satisface `E3-HU-015` y `E3-HU-016` en el alcance de V1 que fijaron las decisiones DEC-103, DEC-107, DEC-108 y DEC-116 a DEC-122. La pantalla vive en `/conversaciones`, ruta que hoy es un stub (E8-T4) y que `useInitialRoute` ya asigna al rol `ejecutivo`.

**Alcance V1 (decidido):**

- **Cola única e implícita.** No hay `{id}` de bandeja: la ruta es `GET /api/v1/bandeja/trabajo` y el servidor resuelve la bandeja por la membresía del sujeto (DEC-103, DEC-116).
- **Sin override de supervisor** (DEC-107) y **sin alerta de mensaje pendiente** (DEC-108).
- **La fila no lleva vista previa ni conteo de no leídos.** El nombre del cliente se obtiene con `listarClientes` (DEC-118).
- **Transferir devuelve al pool.** No hay selector de destino ni nombres de Ejecutivos (DEC-119, DT-04).
- **`marcarAtendida` es una acción explícita**; responder no la marca (DEC-117). Un mensaje nuevo del cliente la desmarca (DEC-122).
- **Un Supervisor no libera ni transfiere conversaciones ajenas** (DEC-118).
- **La actualización es por polling HTTP** (bootstrap y catch-up con `desde_revision`). El SSE queda como deuda (DT-01, DEC-118).

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos ni componentes compartidos. Autorización, alcance, membresía, un solo reclamo activo, ventana de escritura y auditoría los resuelve el `bff`/`mensajeria`; la interfaz consume resultados y clasifica respuestas.

## Glossary

- **Bandeja_UI**: el sistema de interfaz de la bandeja de conversaciones (ruta `/conversaciones` y sus elementos). Es el "sistema" al que refieren los criterios.
- **Ejecutivo**: rol `ejecutivo` (DEC-046). Solo conversación con el cliente. No ve unidades ni viajes.
- **Bandeja**: cola única e implícita a la que pertenecen todos los Ejecutivos (DEC-103, ADR 36). El servidor la resuelve por membresía efectiva; el frontend no pasa identificador.
- **Conversación**: hilo cliente↔AI27 ligado a un viaje (DEC-029). Estados de ciclo de vida: `abierta`, `solo_lectura`, `cerrada`.
- **Reclamo**: asignación exclusiva del derecho a responder. Hay **un reclamo activo** por conversación (DEC-014).
- **Versión de reclamo**: entero de concurrencia optimista (`version_reclamo` en la conversación). Se envía como `version_esperada` o `version_reclamo_esperada`.
- **Devolver al pool**: dejar la conversación sin reclamo para que otro Ejecutivo la tome. En V1 es lo que hace la "transferencia" (DEC-119) y se ejecuta con la liberación del reclamo.
- **Atendida**: marca explícita del responsable (`atendida_en`). La desmarca un mensaje nuevo del cliente (DEC-122).
- **Revisión de bandeja**: cursor de dominio de la colección (`revision`), distinto del cursor de paginación.
- **Secuencia de mensaje**: orden canónico por conversación. Nunca se ordena por `creado_en`.
- **Polling**: consulta HTTP periódica (bootstrap y catch-up) con la que la bandeja se mantiene al día en V1.
- **BFF**: backend-for-frontend de AI27. Única puerta HTTP del frontend.

## Requirements

### Requirement 1: Bandeja de trabajo

**User Story:** Como Ejecutivo, quiero ver las conversaciones de la bandeja compartida, para saber cuáles atender.

#### Acceptance Criteria

1. WHEN el Ejecutivo abre `/conversaciones`, THE Bandeja_UI SHALL cargar el trabajo de la bandeja (bootstrap) sin enviar identificador de bandeja y mostrar, por conversación, el cliente, el estado, quién la tiene reclamada (o que está en el pool), si está atendida y la marca de tiempo de apertura.
2. THE Bandeja_UI SHALL mostrar únicamente las conversaciones que devuelve el `bff` y SHALL NOT filtrar ni ampliar el alcance en el cliente.
3. THE Bandeja_UI SHALL diferenciar visualmente las conversaciones en el pool (sin reclamo), las reclamadas por el usuario de la sesión y las reclamadas por otra persona, comparando `reclamo_activo.responsable_id` con el sujeto de la sesión.
4. THE Bandeja_UI SHALL obtener el nombre del cliente con `listarClientes` y SHALL NOT mostrar un `cliente_id` crudo como si fuera un nombre; si el cliente no se resuelve, SHALL mostrar un texto neutro.
5. THE Bandeja_UI SHALL guardar la `revision` de la colección devuelta por el bootstrap para usarla como `desde_revision` en el catch-up.
6. WHEN la respuesta incluye un cursor de paginación, THE Bandeja_UI SHALL permitir cargar más conversaciones sin confundir ese cursor con la `revision`.
7. WHERE la bandeja no tiene conversaciones, THE Bandeja_UI SHALL mostrar un estado vacío diferenciado de un estado de carga y de un estado de error.
8. IF el `bff` responde `404` porque el sujeto no tiene bandeja, THEN THE Bandeja_UI SHALL mostrar un aviso de que no tiene una bandeja asignada y SHALL NOT mostrar conversaciones.
9. IF el `bff` responde `403` porque el usuario no tiene membresía efectiva, THEN THE Bandeja_UI SHALL mostrar un aviso de acceso no autorizado y SHALL NOT mostrar conversaciones.
10. THE Bandeja_UI SHALL NOT mostrar vista previa del último mensaje ni conteo de no leídos (DEC-118).

### Requirement 2: Abrir una conversación y leer el historial

**User Story:** Como Ejecutivo, quiero abrir una conversación y leer todo su historial, incluso el anterior a mi alta en el pool, para responder con contexto.

#### Acceptance Criteria

1. WHEN el usuario abre una conversación, THE Bandeja_UI SHALL cargar su detalle y su historial de mensajes ordenado por secuencia ascendente.
2. THE Bandeja_UI SHALL ordenar los mensajes siempre por `secuencia` y SHALL NOT ordenarlos por `creado_en`.
3. WHEN existen mensajes anteriores, THE Bandeja_UI SHALL permitir cargarlos hacia atrás sin perder la posición de lectura.
4. THE Bandeja_UI SHALL mostrar, por mensaje, el `alias_mostrado`, el rol al enviar y la marca de tiempo, y SHALL distinguir los mensajes del cliente de los de AI27.
5. THE Bandeja_UI SHALL NOT mostrar nombres reales de Ejecutivos ni un identificador crudo como si fuera un nombre (DEC-119); identifica al responsable como "Tú" u "otra persona".
6. THE Bandeja_UI SHALL permitir leer el historial completo de una conversación sin reclamo, a un miembro con membresía efectiva, incluido el anterior a su alta (DEC-015). La auditoría de ese acceso la registra el `bff`; la interfaz SHALL NOT afirmar que fue auditado.
7. IF el `bff` responde `404` al abrir una conversación, THEN THE Bandeja_UI SHALL mostrar un aviso de no disponible sin distinguir si no existe o si no hay acceso.
8. WHERE la conversación no tiene mensajes, THE Bandeja_UI SHALL mostrar un estado vacío.
9. THE Bandeja_UI SHALL NOT ofrecer adjuntos (Q107, fuera de alcance V1) ni edición o borrado de mensajes.

### Requirement 3: Reclamar una conversación

**User Story:** Como Ejecutivo, quiero reclamar una conversación del pool, para ser el único que le responde al cliente.

#### Acceptance Criteria

1. WHERE la conversación está en el pool y el usuario tiene membresía, THE Bandeja_UI SHALL ofrecer la acción de reclamar.
2. WHEN el usuario reclama, THE Bandeja_UI SHALL enviar como `version_esperada` el `version_reclamo` que trae la conversación o la bandeja, y SHALL NOT enviar un `0` fijo.
3. WHEN el `bff` confirma el reclamo, THE Bandeja_UI SHALL mostrar al usuario como reclamante activo y habilitar el compositor.
4. IF el `bff` responde `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL informar que otra persona reclamó antes o que la conversación cambió, SHALL recargar el detalle de la conversación y SHALL NOT presentar al usuario como reclamante.
5. WHEN la recarga tras un conflicto muestra a otra persona como reclamante, THE Bandeja_UI SHALL mostrar que la conversación ya la tiene otra persona.
6. THE Bandeja_UI SHALL bloquear el doble envío de la acción de reclamar mientras la solicitud está en curso.
7. THE Bandeja_UI SHALL NOT reasignar ni reintentar el reclamo en silencio después de un conflicto.

### Requirement 4: Responder como reclamante

**User Story:** Como Ejecutivo reclamante, quiero enviar mi respuesta al cliente, para atenderlo.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo y la conversación admite escritura, THE Bandeja_UI SHALL habilitar el compositor.
2. WHEN el usuario envía un mensaje, THE Bandeja_UI SHALL enviarlo con un `client_message_id` generado en el cliente y la `version_reclamo_esperada` vigente, sin `motivo_override`.
3. IF el envío falla por red y se reintenta, THEN THE Bandeja_UI SHALL reutilizar el mismo `client_message_id` para que no se cree un segundo mensaje.
4. THE Bandeja_UI SHALL NOT permitir enviar un cuerpo vacío o solo de espacios.
5. WHEN el `bff` confirma el mensaje, THE Bandeja_UI SHALL mostrarlo en el historial en el lugar que le corresponde por `secuencia`, una sola vez.
6. IF el `bff` responde `403` o `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL deshabilitar el compositor, conservar el texto escrito, informar que el reclamo cambió y recargar la conversación.
7. THE Bandeja_UI SHALL bloquear el doble envío del mismo mensaje mientras la solicitud está en curso.
8. WHEN el reclamante envía una respuesta, THE Bandeja_UI SHALL NOT marcar la conversación como atendida; eso es una acción aparte (Requirement 8, DEC-117).

### Requirement 5: Perder el reclamo quita el envío, no la lectura

**User Story:** Como Ejecutivo, quiero seguir leyendo una conversación cuya responsabilidad perdí, para no quedarme sin contexto.

#### Acceptance Criteria

1. WHEN el usuario deja de ser el reclamante (porque otra persona reclamó o la conversación se devolvió al pool), THE Bandeja_UI SHALL deshabilitar el compositor.
2. WHILE el compositor está deshabilitado por falta de reclamo, THE Bandeja_UI SHALL conservar visible el historial completo y SHALL seguir incorporando los mensajes nuevos que traiga el polling.
3. THE Bandeja_UI SHALL indicar la razón del compositor deshabilitado (en el pool, reclamada por otra persona, solo lectura), con un texto y no solo con un estado visual.
4. WHEN la pérdida ocurre con la conversación abierta, THE Bandeja_UI SHALL conservar el texto del borrador sin enviarlo.
5. THE Bandeja_UI SHALL NOT descartar el historial ya cargado al perder el reclamo.

### Requirement 6: Devolver la conversación al pool (liberar)

**User Story:** Como reclamante, quiero devolver la conversación al pool, para que otro Ejecutivo la atienda conservando la historia.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo, THE Bandeja_UI SHALL ofrecer la acción de devolver la conversación al pool.
2. WHEN el usuario la devuelve, THE Bandeja_UI SHALL enviar la `version_esperada` vigente.
3. WHEN el `bff` confirma, THE Bandeja_UI SHALL mostrar la conversación en el pool, deshabilitar el compositor y conservar el historial.
4. IF el `bff` responde `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL informar que el reclamo ya cambió y SHALL recargar la conversación sin presentarla como devuelta.
5. IF el `bff` responde `403` porque el usuario no es el responsable activo, THEN THE Bandeja_UI SHALL informar que solo el responsable puede devolverla y SHALL recargar la conversación.
6. THE Bandeja_UI SHALL pedir confirmación antes de devolver si el compositor tiene un borrador sin enviar.
7. THE Bandeja_UI SHALL bloquear el doble envío mientras la solicitud está en curso.

### Requirement 7: Sin transferencia dirigida en V1 (DEC-119)

**User Story:** Como Ejecutivo, quiero que la interfaz no me ofrezca elegir a un compañero por nombre, porque en V1 la transferencia devuelve la conversación al pool.

#### Acceptance Criteria

1. THE Bandeja_UI SHALL NOT ofrecer un selector de destino ni mostrar nombres de Ejecutivos.
2. THE Bandeja_UI SHALL NOT invocar `transferirConversacion` con un `responsable_destino_id` escrito a mano ni inventado.
3. THE Bandeja_UI SHALL presentar la acción de pasar la conversación a otro Ejecutivo como "devolver al pool" (Requirement 6).
4. WHERE el contrato publique una transferencia que no requiera destino, THE Bandeja_UI SHALL incorporarla mediante un cambio de spec.
5. THE Bandeja_UI SHALL NOT mostrar al cliente ni referir el nombre de un Ejecutivo; el cliente ve `AI27 Operations` (DEC-021).

### Requirement 8: Marcar la conversación como atendida

**User Story:** Como reclamante, quiero marcar explícitamente una conversación como atendida, para dejar constancia de que ya respondí lo necesario.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo, THE Bandeja_UI SHALL ofrecer la acción de marcar como atendida, separada del envío del mensaje.
2. WHEN el usuario marca como atendida, THE Bandeja_UI SHALL enviar la `version_esperada` vigente.
3. WHEN el `bff` confirma, THE Bandeja_UI SHALL mostrar la conversación como atendida usando `atendida_en` del detalle recargado.
4. IF el `bff` responde `409` (versión obsoleta o sin reclamo activo), THEN THE Bandeja_UI SHALL informar que la conversación cambió y SHALL recargarla.
5. IF el `bff` responde `403` porque el usuario no es el responsable activo, THEN THE Bandeja_UI SHALL informar que solo el responsable puede marcarla y SHALL recargarla.
6. WHEN un detalle recargado trae `atendida_en` vacío tras un mensaje nuevo del cliente (DEC-122), THE Bandeja_UI SHALL dejar de mostrar la marca de atendida.
7. THE Bandeja_UI SHALL NOT rotular una conversación sin `atendida_en` como "pendiente de respuesta" ni como alerta (DEC-108).
8. THE Bandeja_UI SHALL llamar `registrarReciboLeido` solo cuando el usuario es el reclamante activo y SHALL NOT mostrar ni prometer que el cliente ve "leído por AI27" (DEC-122, DT-05).

### Requirement 9: Exclusiones de mando y alerta en V1

**User Story:** Como usuario interno, quiero que la interfaz no me ofrezca acciones que el sistema no admite en V1, para no intentar operaciones que serán rechazadas.

#### Acceptance Criteria

1. THE Bandeja_UI SHALL NOT ofrecer ningún gesto de override a ningún rol y SHALL NOT enviar `motivo_override` (DEC-107).
2. THE Bandeja_UI SHALL NOT ofrecer a un Supervisor, Coordinador o Administrador liberar, transferir ni marcar atendida una conversación ajena (DEC-118).
3. THE Bandeja_UI SHALL habilitar el compositor únicamente al reclamante activo, sin excepción por rol.
4. THE Bandeja_UI SHALL NOT mostrar ni calcular una alerta de mensaje pendiente para Supervisor ni inferirla de `atendida_en`, de la secuencia o de otros campos (DEC-108).
5. THE Bandeja_UI SHALL NOT liberar ni transferir una conversación en silencio; el reclamo no expira.
6. IF el `bff` responde `403` a una acción, THEN THE Bandeja_UI SHALL mostrar autorización insuficiente sin romper la vista.
7. WHERE DEC-107, DEC-108 o DEC-118 se reabran, THE Bandeja_UI SHALL incorporar el cambio mediante un cambio de spec.

### Requirement 10: Conversación en solo lectura

**User Story:** Como usuario interno, quiero saber cuándo una conversación ya no admite respuestas, para no intentar escribir.

#### Acceptance Criteria

1. WHERE el estado de la conversación es `solo_lectura` o `cerrada`, THE Bandeja_UI SHALL deshabilitar el compositor y SHALL mostrar el historial completo.
2. IF el `bff` responde `409` con código `conversacion_solo_lectura` al enviar, THEN THE Bandeja_UI SHALL deshabilitar el compositor, conservar el texto escrito e informar que venció la ventana de escritura.
3. THE Bandeja_UI SHALL NOT calcular por su cuenta la ventana de 6 meses o 3 días (DEC-030, DEC-041); usa el estado y `escritura_hasta` que entrega el `bff`.
4. THE Bandeja_UI SHALL mostrar la conversación en solo lectura aun cuando el usuario sea el reclamante.

### Requirement 11: Actualización por polling y recuperación

**User Story:** Como Ejecutivo, quiero que la bandeja y la conversación se actualicen sin recargar la página y se recuperen solas tras una falla, para no atender con datos viejos.

#### Acceptance Criteria

1. WHILE la bandeja está abierta, THE Bandeja_UI SHALL consultar periódicamente el trabajo con `desde_revision` igual a la última `revision` recibida y aplicar los cambios devueltos sin recargar la lista completa.
2. WHILE una conversación está abierta, THE Bandeja_UI SHALL consultar periódicamente los mensajes con `despues_de` igual a la última `secuencia` recibida y agregarlos en orden, una sola vez.
3. THE Bandeja_UI SHALL tomar la cadencia del polling de una configuración del cliente y SHALL NOT asumirla como parte del contrato.
4. IF el catch-up responde `409` con código `stream_resync_required`, THEN THE Bandeja_UI SHALL repetir el bootstrap sin mostrar ni suponer la causa.
5. IF una consulta de polling falla, THEN THE Bandeja_UI SHALL conservar los datos ya mostrados, indicar que la vista puede estar desactualizada y reintentar.
6. THE Bandeja_UI SHALL NOT presentar la vista como actualizada en tiempo real ni como "fresca por stream" (DEC-118); SHALL indicar el momento de la última actualización correcta.
7. THE Bandeja_UI SHALL mantener las acciones por HTTP (reclamar, responder, devolver, marcar atendida) operativas aunque falle el polling.
8. THE Bandeja_UI SHALL NOT mezclar `revision`, cursor de paginación y `secuencia` de mensaje.
9. THE Bandeja_UI SHALL aislar el mecanismo de actualización detrás de una interfaz, de modo que el SSE (DT-01) pueda sustituir al polling sin cambiar la vista.

### Requirement 12: Estados de carga, error, sesión y accesibilidad

**User Story:** Como usuario interno, quiero señales claras de carga, vacío y error con reintento, y una interfaz accesible, para saber qué ocurre y poder operar con teclado.

#### Acceptance Criteria

1. WHILE la bandeja o una conversación están cargando, THE Bandeja_UI SHALL mostrar un estado de carga diferenciado del vacío y del error.
2. IF una consulta falla, THEN THE Bandeja_UI SHALL mostrar un error recuperable con acción de reintento.
3. IF el `bff` responde `401`, THEN THE Bandeja_UI SHALL delegar el manejo al flujo de sesión del AppShell y SHALL NOT mostrar un error genérico.
4. WHEN una acción termina con éxito, THE Bandeja_UI SHALL mostrar un aviso de éxito y reflejar el cambio en la vista.
5. THE Bandeja_UI SHALL usar etiquetas, foco y estados accesibles de los componentes de `@ai27-tech/ui`, y SHALL anunciar de forma accesible los cambios de reclamo y la pérdida de actualización.
6. THE Bandeja_UI SHALL mostrar la bandeja solo a los roles con acceso a conversaciones y SHALL tratar la decisión del `bff` como autoridad final, aunque la navegación haya ocultado o mostrado la entrada.

## Escenarios

### Escenarios positivos

**Escenario 1. Reclamar y responder**  
Dado que hay una conversación en el pool de la bandeja, cuando la reclamo con su `version_reclamo` y envío una respuesta, entonces la respuesta aparece en el historial una sola vez y quedo como reclamante activo.

**Escenario 2. Devolver al pool**  
Dado que tengo el reclamo activo, cuando devuelvo la conversación al pool, entonces vuelve al pool, mi compositor se deshabilita y el historial se conserva.

**Escenario 3. Marcar atendida**  
Dado que tengo el reclamo activo y ya respondí, cuando la marco como atendida, entonces el detalle recargado muestra `atendida_en` y la conversación aparece como atendida.

**Escenario 4. Leer sin reclamo**  
Dado que me agregaron al pool, cuando abro una conversación anterior a mi alta, entonces leo el historial previo y el compositor está deshabilitado con la razón visible.

**Escenario 5. Mensaje nuevo del cliente**  
Dado que una conversación estaba atendida, cuando el cliente escribe y el siguiente polling trae `atendida_en` vacío, entonces la marca de atendida desaparece y el mensaje nuevo aparece en el historial.

**Escenario 6. Recuperación tras `stream_resync_required`**  
Dado que el catch-up queda fuera de la ventana, cuando el `bff` responde `409 stream_resync_required`, entonces la bandeja repite el bootstrap y queda sin huecos ni duplicados.

### Escenarios negativos y de borde

**Escenario 7. Reclamo concurrente**  
Dado que otra persona reclamó un instante antes, cuando mi reclamo recibe `409 conflicto_version_reclamo`, entonces veo que la conversación ya la tiene otra persona, la conversación se recarga y no quedo como reclamante.

**Escenario 8. Perder el reclamo con la conversación abierta**  
Dado que tengo la conversación abierta con un borrador, cuando el siguiente polling la muestra reclamada por otra persona, entonces mi compositor se deshabilita, el historial sigue visible y mi borrador se conserva sin enviarse.

**Escenario 9. Responder sin reclamo**  
Dado que no tengo el reclamo activo, cuando el `bff` rechaza un envío, entonces la interfaz no presenta el mensaje como enviado y explica que falta el reclamo.

**Escenario 10. Reintento idempotente**  
Dado que un envío falló por red, cuando reintento, entonces se reutiliza el mismo `client_message_id` y no se duplica el mensaje.

**Escenario 11. Ventana de escritura vencida**  
Dado que la conversación pasó a `solo_lectura`, cuando intento enviar, entonces recibo `conversacion_solo_lectura`, el compositor se deshabilita y conservo el texto.

**Escenario 12. Falla del polling**  
Dado que una consulta de polling falla, cuando el `bff` no responde, entonces la bandeja conserva lo ya mostrado, avisa que puede estar desactualizada e intenta de nuevo.

**Escenario 13. Sin bandeja o sin membresía**  
Dado que mi sesión no tiene bandeja (`404`) o membresía efectiva (`403`), cuando abro `/conversaciones`, entonces veo el aviso correspondiente y ninguna conversación.

**Escenario 14. Sesión expirada**  
Dado que la sesión expira durante una acción, cuando el `bff` responde `401`, entonces la interfaz delega al flujo de sesión del AppShell.

**Escenario 15. Acción sin ser el responsable**  
Dado que otra persona tiene el reclamo, cuando intento devolver o marcar atendida y el `bff` responde `403`, entonces la interfaz informa que solo el responsable puede hacerlo y recarga la conversación.

**Escenario 16. Supervisor sin gestos de mando**  
Dado que soy Supervisor y otra persona tiene el reclamo, cuando abro la conversación, entonces no se me ofrece override, ni liberar, ni transferir, ni compositor.

## Dependencias

- `E3-HU-015`, `E3-HU-016`: comportamiento funcional de la bandeja y el reclamo (en Borrador en el repo de contexto), acotado por las DEC del alcance V1.
- E8-T4: AppShell, navegación, rol efectivo y flujo de sesión (`401`).
- DEC-015, DEC-030, DEC-041, DEC-103, DEC-107, DEC-108, DEC-116 a DEC-119, DEC-122; ADR 36.
- `listarClientes` (DEC-101) para el nombre del cliente.
- Contrato generado `@ai27-tech/contracts` (superficie interna de bandeja en `bff.yaml` desde `tracer.30`; el pin recomendado es `tracer.33`) y componentes de `@ai27-tech/ui`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`.
- **Adjuntos** en la conversación (Q107).
- **Chat ejecutivo-a-ejecutivo / chat interno vertical:** `E3-T7` está bloqueado por DEC-029.
- **Transferencia dirigida a un Ejecutivo por nombre** (DT-04, V2) y cualquier lectura de nombres de Ejecutivos.
- **Override de supervisor** (DEC-107), **alerta de mensaje pendiente** (DEC-108) y **liberar o transferir una conversación ajena** (DEC-118).
- **Vista previa del último mensaje y conteo de no leídos** (DEC-118).
- **SSE / entrega viva** (DT-01) y exponer al cliente el "leído por AI27" (DT-05).
- Administración de la membresía del pool (E3-HU-034) y vista de auditoría (`listarAuditoriaConversacion`).
- Conversación del lado del cliente (portal de cliente, E9) y bandeja de emergencias (E7, E8-T18).
- Reparto de carga entre ejecutivos y equipos por segmento de cliente (DEC-103).
- Notificaciones al cliente (DEC-023); dashboard, descarga y evidencia (E8-T17).

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas. El detalle y el historial están en `BRECHAS.md`.

- **Brechas 1, 2, 4, 5, 6, 7 y 8 de la primera versión: cerradas** por DEC-116 a DEC-119 y DEC-122. **Brecha 3 (nombres y destino): diferida a V2** (DEC-119, DT-04).
- **Pin del contrato:** `package.json` fija `tracer.24`, que no trae la superficie interna de bandeja. Hay que subirlo a `tracer.33` (`tracer.30` y `tracer.31` no existen para TS, DEC-120) y agregar `0.1.0-tracer.33` a `minimumReleaseAgeExclude`. No se hace sin aprobación explícita.
- **Cambios de `mensajeria` por mergearse (PR #41):** hoy `liberarReclamo`, `transferirConversacion` y `marcarAtendida` por un no responsable podrían no responder `403`, y la `version_reclamo` cambia de semántica (monótona por conversación). El spec asume el comportamiento de ese PR; hay que reverificar al mergearse.
- **`transferirConversacion` en el contrato:** todavía exige `responsable_destino_id` ("miembro del pool"). DEC-119 dice que en V1 se devuelve al pool, pero no aclara si el gesto de la UI es solo `liberarReclamo`. Este spec lo trata así (Requirement 7); se confirma con el dueño del `bff`.
- **`listarClientes` para el rol `ejecutivo`:** DEC-118 lo asume; el adaptador de core no muestra guarda de rol, pero el contrato lo describe con las guardas del `jefe_operativo`. Verificar en integración. Un cliente inactivo no aparece en esa lista (solo activos): prever el texto neutro.
- **Historia técnica E8-T15 en el repo de contexto:** sigue con "override" en el título, la ruta con `{id}`, el transporte SSE y la alerta. Las DEC prevalecen; falta corregirla.
- **Textos y cadencia:** textos aprobados para conflicto de reclamo, reclamo perdido, solo lectura y autorización insuficiente; y valor de la cadencia del polling (configuración del cliente).
- **Componentes de `@ai27-tech/ui`:** verificar la API exacta de `MessagePanel`, `MessageList`, `MessageBubble`, `Modal` y `FilterTable`.

## Trazabilidad

- Un reclamo activo, conflicto de versión y reclamo concurrente: Requirement 3 y escenarios 1 y 7; HU-015 Escenario 2.
- Solo el reclamante envía: Requirements 4, 5 y 9 y escenario 9; HU-015 Escenario 3.
- Historial para miembro nuevo, auditado: Requirement 2.6 y escenario 4; HU-015 Escenario 4; DEC-015.
- Perder el reclamo quita envío, no lectura: Requirement 5 y escenario 8; DoD de E8-T15.
- Liberar y "transferir" al pool: Requirements 6 y 7 y escenarios 2 y 15; HU-016 Escenarios 1 y 2 acotados por DEC-119; DoD ("e2e de transferencia entre dos usuarios sin pérdida de historia") se cubre con devolver al pool y reclamar por otro usuario.
- Atendida explícita y desmarca: Requirement 8 y escenarios 3 y 5; DEC-117, DEC-122.
- Override, mando ajeno y alerta: Requirement 9 y escenario 16 como exclusiones de V1; HU-016 Escenarios 3, 4 y 5 no se cubren (DEC-107, DEC-108, DEC-118).
- Solo lectura: Requirement 10 y escenario 11; DEC-030, DEC-041.
- Polling y recuperación: Requirement 11 y escenarios 6 y 12; DEC-118, DT-01.
- Estados y sesión: Requirement 12 y escenarios 13 y 14.
