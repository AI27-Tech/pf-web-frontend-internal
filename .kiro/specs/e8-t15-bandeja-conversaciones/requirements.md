# Requirements Document

## Introduction

La **bandeja de conversaciones** (E8-T15) es la parte del panel interno donde el Ejecutivo atiende las conversaciones de los clientes de su alcance desde una bandeja compartida con **reclamo exclusivo**, para que dos personas no le contesten lo mismo al cliente. Cubre listar el trabajo de la bandeja, leer el historial, **reclamar**, responder, **liberar** y **transferir** una conversación, sin override de Supervisor ni alerta de mensaje pendiente, que quedaron **fuera de alcance V1** (DEC-107 y DEC-108). Satisface `E3-HU-015` y `E3-HU-016`. La pantalla vive en `/conversaciones`, ruta que hoy es un stub (E8-T4) y que `useInitialRoute` ya asigna al rol `ejecutivo`.

La actualización viva usa SSE según `E0-T9` y ADR 28: bootstrap por HTTP, apertura del stream, catch-up posterior al cursor con buffer de deltas vivos, y aplicación por secuencia de dominio con deduplicación por `evento_id`.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos ni componentes compartidos. Autorización, alcance, membresía, un solo reclamo activo, atomicidad de la transferencia, ventana de escritura y auditoría los resuelve el `bff`/backend; la interfaz consume resultados y clasifica respuestas.

**Decisiones ya tomadas que acotan el alcance:** DEC-107 cierra el override de supervisor en el envío en V1 (`mensajeria` rechaza `motivo_override` con `400`); DEC-108 saca de V1 la alerta de mensaje pendiente; DEC-103 / ADR 36 fijan un pool único e implícito con vínculo ejecutivo↔cliente por auto-asignación pegajosa. La historia técnica de E8-T15 todavía menciona override y alerta; esta versión sigue a las DEC (ver `BRECHAS.md`, Contradicciones de fuentes).

**Esta versión del spec está condicionada por brechas abiertas** (ver `BRECHAS.md` y las Notas de brechas): el `bff` no expone todavía la superficie de conversación interna (Brecha 1), por lo que los requisitos marcados _(condicionado)_ no se pueden verificar contra el `bff` real.

## Glossary

- **Bandeja_UI**: el sistema de interfaz de la bandeja de conversaciones (ruta `/conversaciones` y sus elementos). Es el "sistema" al que refieren los criterios.
- **Ejecutivo**: rol `ejecutivo` (DEC-046). Solo conversación con el cliente, acotada por cliente. No ve unidades ni viajes.
- **Supervisor**: rol `supervisor` o `coordinador` (o `administrador` con alcance global). En V1 no tiene override sobre conversaciones (DEC-107); lo que pueda leer o liberar lo decide el `bff`.
- **Bandeja**: cola compartida de conversaciones. Requiere **membresía efectiva** además del rol; con el pool único (DEC-103) todos los Ejecutivos pertenecen a ella.
- **Conversación**: hilo cliente↔AI27 ligado a un viaje (DEC-029). Estados de ciclo de vida: `abierta`, `solo_lectura`, `cerrada`.
- **Reclamo**: asignación exclusiva del derecho a responder. Hay **un reclamo activo** por conversación (DEC-014).
- **Versión de reclamo**: entero de concurrencia optimista (`version_reclamo`). Se envía como `version_esperada` o `version_reclamo_esperada`.
- **Pool**: cola única e implícita a la que pertenecen todos los Ejecutivos (DEC-103, ADR 36). El vínculo ejecutivo↔cliente nace al tomar la primera conversación del cliente y es pegajoso.
- **Override**: envío excepcional de un Supervisor que salta el reclamo normal (`motivo_override`). **Cerrado en V1** (DEC-107).
- **Revisión de bandeja**: cursor de dominio de la colección de trabajo (`revision`), distinto del cursor de paginación y del `seq` de transporte.
- **Secuencia de mensaje**: orden canónico por conversación. Nunca se ordena por `creado_en`.
- **Stream**: línea SSE de entrega viva (`GET /api/v1/stream`) del servicio `realtime`. No es fuente durable.
- **BFF**: backend-for-frontend de AI27. Única puerta HTTP del frontend.

## Requirements

### Requirement 1: Bandeja de trabajo del alcance _(condicionado: Brechas 1, 2 y 4)_

**User Story:** Como Ejecutivo, quiero ver las conversaciones de los clientes de mi alcance en una bandeja compartida, para saber cuáles atender.

#### Acceptance Criteria

1. WHEN el Ejecutivo abre `/conversaciones`, THE Bandeja_UI SHALL cargar el trabajo de la bandeja (bootstrap) y mostrar, por conversación, el cliente, el estado, quién la tiene reclamada (o que está en el pool) y la marca de tiempo de apertura.
2. THE Bandeja_UI SHALL mostrar únicamente las conversaciones que devuelve el `bff` y SHALL NOT filtrar ni ampliar el alcance en el cliente.
3. THE Bandeja_UI SHALL diferenciar visualmente las conversaciones en el pool (sin reclamar), las reclamadas por el usuario de la sesión y las reclamadas por otra persona.
4. THE Bandeja_UI SHALL guardar la `revision` de la colección devuelta por el bootstrap para usarla como punto de catch-up.
5. WHEN la respuesta incluye un cursor de paginación, THE Bandeja_UI SHALL permitir cargar más conversaciones sin confundir ese cursor con la `revision`.
6. WHERE la bandeja no tiene conversaciones, THE Bandeja_UI SHALL mostrar un estado vacío diferenciado de un estado de carga y de un estado de error.
7. IF el `bff` responde `403` porque el usuario no tiene membresía efectiva en la bandeja, THEN THE Bandeja_UI SHALL mostrar un aviso de acceso no autorizado y SHALL NOT mostrar conversaciones.
8. THE Bandeja_UI SHALL NOT mostrar vista previa del último mensaje ni conteo de no leídos mientras el contrato no publique esos campos (Brecha 4).

### Requirement 2: Abrir una conversación y leer el historial

**User Story:** Como Ejecutivo, quiero abrir una conversación y leer todo su historial, incluso el anterior a mi alta en el pool, para responder con contexto.

#### Acceptance Criteria

1. WHEN el usuario abre una conversación, THE Bandeja_UI SHALL cargar su detalle y su historial de mensajes ordenado por secuencia ascendente.
2. THE Bandeja_UI SHALL ordenar los mensajes siempre por `secuencia` y SHALL NOT ordenarlos por `creado_en`.
3. WHEN existen mensajes anteriores, THE Bandeja_UI SHALL permitir cargarlos hacia atrás sin perder la posición de lectura.
4. THE Bandeja_UI SHALL mostrar, por mensaje, el autor, su rol al enviar y la marca de tiempo, usando los datos de audiencia Interno que entrega el `bff`, y SHALL distinguir los mensajes del cliente de los de AI27.
5. THE Bandeja_UI SHALL mostrar nombres reales entre internos y SHALL NOT mostrar un identificador crudo como si fuera un nombre _(condicionado: Brecha 3)_.
6. THE Bandeja_UI SHALL permitir leer el historial completo de una conversación sin reclamo, a un miembro con membresía efectiva, incluido el anterior a su alta (DEC-015). La auditoría de ese acceso la registra el `bff`; la interfaz SHALL NOT afirmar que fue auditado.
7. IF el `bff` responde `404` al abrir una conversación, THEN THE Bandeja_UI SHALL mostrar un aviso de no disponible sin distinguir si no existe o si no hay acceso.
8. WHERE la conversación no tiene mensajes, THE Bandeja_UI SHALL mostrar un estado vacío.
9. THE Bandeja_UI SHALL NOT ofrecer adjuntos (Q107, fuera de alcance V1) ni edición o borrado de mensajes.

### Requirement 3: Reclamar una conversación

**User Story:** Como Ejecutivo, quiero reclamar una conversación del pool, para ser el único que le responde al cliente.

#### Acceptance Criteria

1. WHERE la conversación está en el pool y el usuario tiene membresía, THE Bandeja_UI SHALL ofrecer la acción de reclamar.
2. WHEN el usuario reclama, THE Bandeja_UI SHALL enviar la `version_esperada` igual a la `version_reclamo` que tiene cargada de la conversación.
3. WHEN el `bff` confirma el reclamo, THE Bandeja_UI SHALL mostrar al usuario como reclamante activo y habilitar el compositor.
4. IF el `bff` responde `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL informar que otra persona reclamó antes o que la conversación cambió, SHALL recargar el detalle de la conversación y SHALL NOT presentar al usuario como reclamante.
5. WHEN la recarga tras un conflicto muestra a otra persona como reclamante, THE Bandeja_UI SHALL mostrar quién ganó el reclamo.
6. THE Bandeja_UI SHALL bloquear el doble envío de la acción de reclamar mientras la solicitud está en curso.
7. THE Bandeja_UI SHALL NOT reasignar ni reintentar el reclamo en silencio después de un conflicto.

### Requirement 4: Responder como reclamante

**User Story:** Como Ejecutivo reclamante, quiero enviar mi respuesta al cliente, para atenderlo.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo y la conversación admite escritura, THE Bandeja_UI SHALL habilitar el compositor.
2. WHEN el usuario envía un mensaje, THE Bandeja_UI SHALL enviarlo con un `client_message_id` generado en el cliente y la `version_reclamo_esperada` vigente.
3. IF el envío falla por red y se reintenta, THEN THE Bandeja_UI SHALL reutilizar el mismo `client_message_id` para que no se cree un segundo mensaje.
4. THE Bandeja_UI SHALL NOT permitir enviar un cuerpo vacío o solo de espacios.
5. WHEN el `bff` confirma el mensaje, THE Bandeja_UI SHALL mostrarlo en el historial en el lugar que le corresponde por `secuencia`, una sola vez.
6. IF el `bff` responde `403` o `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL deshabilitar el compositor, conservar el texto escrito, informar que el reclamo cambió y recargar la conversación.
7. THE Bandeja_UI SHALL bloquear el doble envío del mismo mensaje mientras la solicitud está en curso.
8. WHEN el reclamante envía su respuesta y el contrato lo requiere, THE Bandeja_UI SHALL registrar la conversación como atendida con `marcarAtendida`. _(La regla de cuándo se marca como atendida se verifica antes de implementar; ver Notas de brechas.)_

### Requirement 5: Perder el reclamo quita el envío, no la lectura

**User Story:** Como Ejecutivo, quiero seguir leyendo una conversación cuya responsabilidad perdí, para no quedarme sin contexto.

#### Acceptance Criteria

1. WHEN el usuario deja de ser el reclamante (porque otra persona reclamó, la conversación se liberó o se transfirió), THE Bandeja_UI SHALL deshabilitar el compositor.
2. WHILE el compositor está deshabilitado por falta de reclamo, THE Bandeja_UI SHALL conservar visible el historial completo y SHALL seguir recibiendo mensajes nuevos.
3. THE Bandeja_UI SHALL indicar la razón del compositor deshabilitado (en el pool, reclamada por otra persona, solo lectura), con un texto y no solo con un estado visual.
4. WHEN la pérdida ocurre con la conversación abierta, THE Bandeja_UI SHALL conservar el texto del borrador sin enviarlo.
5. THE Bandeja_UI SHALL NOT descartar el historial ya cargado al perder el reclamo.

### Requirement 6: Liberar el reclamo

**User Story:** Como reclamante, quiero devolver la conversación al pool, para que otra persona la atienda conservando la historia.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo, THE Bandeja_UI SHALL ofrecer la acción de liberar.
2. WHEN el usuario libera, THE Bandeja_UI SHALL enviar la `version_esperada` vigente.
3. WHEN el `bff` confirma, THE Bandeja_UI SHALL mostrar la conversación en el pool, deshabilitar el compositor y conservar el historial.
4. IF el `bff` responde `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL informar que el reclamo ya cambió y SHALL recargar la conversación sin presentarla como liberada.
5. THE Bandeja_UI SHALL pedir confirmación antes de liberar si el compositor tiene un borrador sin enviar.
6. THE Bandeja_UI SHALL bloquear el doble envío mientras la solicitud está en curso.

### Requirement 7: Transferir la conversación _(condicionado: Brechas 1 y 3)_

**User Story:** Como reclamante, quiero transferir la conversación a otro ejecutivo del pool, para pasar la responsabilidad sin perder historia ni dejarla sin responsable.

#### Acceptance Criteria

1. WHERE el usuario es el reclamante activo, THE Bandeja_UI SHALL ofrecer la acción de transferir con la selección del miembro destino y un motivo opcional.
2. THE Bandeja_UI SHALL ofrecer como destino únicamente a los miembros con membresía efectiva que entregue el `bff`, y SHALL NOT permitir escribir un identificador a mano.
3. WHEN el usuario confirma la transferencia, THE Bandeja_UI SHALL enviar la `version_esperada` vigente y el destino elegido en una sola solicitud.
4. WHEN el `bff` confirma, THE Bandeja_UI SHALL mostrar al destino como nuevo reclamante, deshabilitar el compositor del usuario original y conservar el historial completo.
5. IF el `bff` responde `409` con código `conflicto_version_reclamo`, THEN THE Bandeja_UI SHALL informar que el reclamo cambió y SHALL recargar la conversación sin presentarla como transferida.
6. IF el `bff` rechaza la transferencia por destino sin membresía, THEN THE Bandeja_UI SHALL mostrar el error y SHALL NOT presentar la transferencia como hecha.
7. THE Bandeja_UI SHALL NOT mostrar un estado intermedio sin responsable ni con dos responsables; la atomicidad es del `bff`.
8. THE Bandeja_UI SHALL bloquear el doble envío mientras la solicitud está en curso.

### Requirement 8: Sin override de Supervisor en V1 (DEC-107)

**User Story:** Como Ejecutivo, quiero que la interfaz no me ofrezca una intervención que el sistema no admite en V1, para no intentar acciones que serán rechazadas.

#### Acceptance Criteria

1. THE Bandeja_UI SHALL NOT ofrecer ningún gesto de override a ningún rol y SHALL NOT enviar `motivo_override` en ningún envío.
2. THE Bandeja_UI SHALL habilitar el compositor únicamente al reclamante activo (Requirement 4), sin excepción por rol.
3. THE Bandeja_UI SHALL tratar la decisión del `bff` como autoridad final sobre lo que cada rol puede leer, liberar o transferir; la interfaz SHALL NOT fijar qué conversaciones abarca la supervisión.
4. IF el `bff` responde `403` a una acción, THEN THE Bandeja_UI SHALL mostrar autorización insuficiente sin romper la vista.
5. WHERE DEC-107 se reabra (cuando `mensajeria` tenga la proyección de alcance jerárquico), THE Bandeja_UI SHALL incorporar el override mediante un cambio de spec, no por la vía de este requirement.

### Requirement 9: Sin alerta de mensaje pendiente en V1 (DEC-108)

**User Story:** Como usuario interno, quiero que la bandeja no afirme una alerta que el sistema no genera en V1, para no confiar en una señal inexistente.

#### Acceptance Criteria

1. THE Bandeja_UI SHALL NOT mostrar ni calcular una alerta de "mensaje pendiente de respuesta" para Supervisor.
2. THE Bandeja_UI SHALL NOT inferir ese estado a partir de `atendida_en`, de la secuencia ni de otros campos del contrato.
3. THE Bandeja_UI SHALL NOT liberar ni transferir una conversación en silencio; el reclamo no expira.
4. WHERE DEC-108 se reabra y el contrato publique la superficie, THE Bandeja_UI SHALL incorporar la alerta mediante un cambio de spec.

### Requirement 10: Conversación en solo lectura

**User Story:** Como usuario interno, quiero saber cuándo una conversación ya no admite respuestas, para no intentar escribir.

#### Acceptance Criteria

1. WHERE el estado de la conversación es `solo_lectura` o `cerrada`, THE Bandeja_UI SHALL deshabilitar el compositor y SHALL mostrar el historial completo.
2. IF el `bff` responde `409` con código `conversacion_solo_lectura` al enviar, THEN THE Bandeja_UI SHALL deshabilitar el compositor, conservar el texto escrito e informar que venció la ventana de escritura.
3. THE Bandeja_UI SHALL NOT calcular por su cuenta la ventana de 6 meses o 3 días (DEC-030, DEC-041); usa el estado y `escritura_hasta` que entrega el `bff`.
4. THE Bandeja_UI SHALL mostrar la conversación en solo lectura aun cuando el usuario sea el reclamante.

### Requirement 11: Actualización viva y recuperación _(condicionado: Brecha 5 para el stream)_

**User Story:** Como Ejecutivo, quiero que la bandeja y la conversación se actualicen sin recargar, y que se recuperen solas tras una desconexión, para no atender con datos viejos.

#### Acceptance Criteria

1. WHEN se abre la bandeja, THE Bandeja_UI SHALL hacer el bootstrap por HTTP, abrir el stream y hacer el catch-up posterior a la `revision` guardada, reteniendo en un buffer los deltas vivos que lleguen durante el catch-up.
2. THE Bandeja_UI SHALL abrir el stream sin enviar selector de bandeja ni de conversación; el flujo lo deriva el servidor de la sesión.
3. THE Bandeja_UI SHALL aplicar los deltas por secuencia de dominio y deduplicar por `evento_id`, de modo que un evento concurrente al bootstrap aparezca una sola vez.
4. THE Bandeja_UI SHALL NOT ordenar mensajes ni revisiones por el `seq` de transporte del stream.
5. IF el catch-up responde `409` con código `stream_resync_required`, THEN THE Bandeja_UI SHALL repetir el bootstrap y el catch-up sin mostrar ni suponer la causa.
6. IF la reconexión del stream responde `409 stream_resync_required`, THEN THE Bandeja_UI SHALL repetir bootstrap y catch-up durable; si la reconexión es aceptada dentro de la ventana, SHALL continuar sin huecos.
7. WHEN llega `stream.stale` con el socket vivo, THE Bandeja_UI SHALL dejar de presentar la vista como fresca, indicarlo al usuario y pasar a recuperación HTTP periódica.
8. WHILE el stream no está disponible, THE Bandeja_UI SHALL mantener las acciones por HTTP (reclamar, responder, liberar, transferir) operativas.
9. WHEN el stream recupera frescura, THE Bandeja_UI SHALL volver a presentar la vista como fresca y SHALL NOT duplicar eventos ya aplicados.
10. WHERE hay varias pestañas abiertas, THE Bandeja_UI SHALL no depender de que cada pestaña comparta estado con otra.

### Requirement 12: Estados de carga, error, sesión y accesibilidad

**User Story:** Como usuario interno, quiero señales claras de carga, vacío y error con reintento, y una interfaz accesible, para saber qué ocurre y poder operar con teclado.

#### Acceptance Criteria

1. WHILE la bandeja o una conversación están cargando, THE Bandeja_UI SHALL mostrar un estado de carga diferenciado del vacío y del error.
2. IF una consulta falla, THEN THE Bandeja_UI SHALL mostrar un error recuperable con acción de reintento.
3. IF el `bff` responde `401`, THEN THE Bandeja_UI SHALL delegar el manejo al flujo de sesión del AppShell y SHALL NOT mostrar un error genérico.
4. WHEN una acción termina con éxito, THE Bandeja_UI SHALL mostrar un aviso de éxito y reflejar el cambio en la vista.
5. THE Bandeja_UI SHALL usar etiquetas, foco y estados accesibles de los componentes de `@ai27-tech/ui`, y SHALL anunciar de forma accesible los cambios de reclamo y la pérdida de frescura.
6. THE Bandeja_UI SHALL mostrar la bandeja solo a los roles con acceso a conversaciones y SHALL tratar la decisión del `bff` como autoridad final, aunque la navegación haya ocultado o mostrado la entrada.

## Escenarios

### Escenarios positivos

**Escenario 1. Reclamar y responder**  
Dado que hay una conversación en el pool de mi bandeja, cuando la reclamo y envío una respuesta, entonces la respuesta aparece en el historial una sola vez y quedo como reclamante activo.

**Escenario 2. Liberar**  
Dado que tengo el reclamo activo, cuando libero la conversación, entonces vuelve al pool, mi compositor se deshabilita y el historial se conserva.

**Escenario 3. Transferir**  
Dado que tengo el reclamo activo, cuando transfiero a otro ejecutivo del pool, entonces el nuevo responsable aparece como reclamante y el historial se conserva completo.

**Escenario 4. Leer sin reclamo**  
Dado que me agregaron al pool, cuando abro una conversación anterior a mi alta, entonces leo el historial previo y el compositor está deshabilitado con la razón visible.

**Escenario 5. Sin override en V1**  
Dado que soy Supervisor y otro ejecutivo tiene el reclamo, cuando abro la conversación, entonces la interfaz no ofrece override ni compositor; lo que pueda leer lo decide el `bff`.

**Escenario 6. Recuperación tras desconexión**  
Dado que el stream se cayó, cuando la reconexión responde `409 stream_resync_required`, entonces la bandeja repite bootstrap y catch-up y queda sin huecos ni duplicados.

### Escenarios negativos y de borde

**Escenario 7. Reclamo concurrente**  
Dado que otra persona reclamó un instante antes, cuando mi reclamo recibe `409 conflicto_version_reclamo`, entonces veo por qué perdí, la conversación se recarga con el ganador y no quedo como reclamante.

**Escenario 8. Perder el reclamo con la conversación abierta**  
Dado que tengo la conversación abierta con un borrador, cuando un Supervisor la transfiere, entonces mi compositor se deshabilita, el historial sigue visible y mi borrador se conserva sin enviarse.

**Escenario 9. Responder sin reclamo**  
Dado que no tengo el reclamo activo, cuando el `bff` rechaza un envío, entonces la interfaz no presenta el mensaje como enviado y explica que falta el reclamo.

**Escenario 10. Reintento idempotente**  
Dado que un envío falló por red, cuando reintento, entonces se reutiliza el mismo `client_message_id` y no se duplica el mensaje.

**Escenario 11. Ventana de escritura vencida**  
Dado que la conversación pasó a `solo_lectura`, cuando intento enviar, entonces recibo `conversacion_solo_lectura`, el compositor se deshabilita y conservo el texto.

**Escenario 12. `stream.stale` con socket vivo**  
Dado que el socket sigue abierto pero el bus perdió frescura, cuando llega `stream.stale`, entonces la vista deja de presentarse como fresca y se actualiza por HTTP.

**Escenario 13. Sin membresía**  
Dado que tengo el rol `ejecutivo` pero no membresía efectiva en la bandeja, cuando el `bff` responde `403`, entonces veo un aviso de acceso no autorizado y ninguna conversación.

**Escenario 14. Sesión expirada**  
Dado que la sesión expira durante una acción, cuando el `bff` responde `401`, entonces la interfaz delega al flujo de sesión del AppShell.

**Escenario 15. Ejecutivo sin override**  
Dado que soy Ejecutivo, cuando abro una conversación reclamada por otra persona, entonces no se me ofrece ningún gesto de override.

## Dependencias

- `E3-HU-015`, `E3-HU-016`: comportamiento funcional de la bandeja, el reclamo, la liberación, la transferencia y el override (en estado Borrador en el repo de contexto).
- E8-T4: AppShell, navegación, rol efectivo y flujo de sesión (`401`).
- `E3-T2` a `E3-T6`, `E0-T9`, ADR 28: servicio y transporte.
- DEC-014, DEC-015, DEC-021, DEC-030, DEC-041, DEC-045, DEC-046, DEC-097.
- DEC-103 / ADR 36 (pool único), DEC-107 (override cerrado), DEC-108 (alerta fuera de V1).
- Contrato generado y componentes de `@ai27-tech`: se verifican antes de implementar, conforme a las Notas de brechas y a `BRECHAS.md`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`.
- **Adjuntos** en la conversación (Q107).
- **Chat ejecutivo-a-ejecutivo / chat interno vertical:** `E3-T7` está bloqueado por DEC-029 y no se construye.
- Administración de la membresía del pool (E3-HU-034).
- Conversación del lado del cliente (portal de cliente, E9). El cliente ve `AI27 Operations`, nunca el nombre real (DEC-021 #4); esta vista es solo interna.
- Bandeja de emergencias del rol Reacción (E7).
- Edición o borrado de mensajes, y vista de auditoría de la conversación (`listarAuditoriaConversacion`).
- Notificaciones al cliente (DEC-023).
- **Override de supervisor** en el envío (DEC-107) y **alerta de mensaje pendiente** para Supervisor (DEC-108): fuera de V1. La historia técnica de E8-T15 los menciona; las DEC prevalecen.
- Reparto de carga entre ejecutivos y equipos por segmento de cliente (DEC-103, fuera de V1 a propósito).
- Dashboard, descarga y evidencia (E8-T17).

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas que redefinan el comportamiento de E8-T15. Si una verificación no está disponible, se documenta en `BRECHAS.md` y no se inventa una alternativa.

- **Superficie en el `bff` (Brecha 1):** el `bff` (`tracer.22` y `tracer.24`) no expone bandeja, conversaciones, reclamos ni transferencias. Existen en `mensajeria.yaml`. Además `bff.md` y `mensajeria.yaml` difieren en las rutas. Bloquea la verificación real de los Requirements 1 a 8.
- **Bandeja del usuario (Brecha 2):** con el pool único (DEC-103) hay una sola cola, pero `listarTrabajoBandeja` sigue exigiendo el `{id}` de bandeja y ninguna operación lo entrega. DEC-097 #3 (bandeja por usuario de cliente) y DEC-103 #1 (cola única) no concuerdan; falta confirmar cuál rige.
- **Nombres y directorio de miembros (Brecha 3):** `responsable_id` y `actor_real` son UUID; no hay lectura de miembros del pool. Condiciona el Requirement 7 y los nombres del Requirement 2.
- **Datos de la fila (Brecha 4):** sin vista previa, no leídos ni marca de "pendiente de respuesta".
- **Stream (Brecha 5):** el contrato no publica frames ni eventos de control del stream, ni su base URL o autenticación en navegador. La rebanada HTTP no depende de esto.
- **Alerta y override (Brechas 6 y 7): CERRADAS para V1** por DEC-108 y DEC-107. No hay superficie que esperar; los Requirements 8 y 9 son exclusiones explícitas.
- **Regla de `marcarAtendida`:** E3-T6 fija que solo lo invoca el responsable y que es distinto de una vista incidental. Falta confirmar si enviar una respuesta lo implica o si es una acción explícita, antes de implementar el Requirement 4.8.
- **Recibos:** E3-T6 fija que los recibos son llamadas del cliente que avanzan cursores por usuario, y que el "leído por AI27" visible al cliente solo cambia cuando lo avanza el responsable activo. La interfaz llama `registrarReciboLeido` solo cuando el usuario es el reclamante.
- **Rol efectivo:** la visibilidad de la entrada y del override depende del rol de sesión; la autoridad final es el `bff`.
- **Mensajes:** verificar los textos aprobados para conflicto de versión, reclamo perdido, solo lectura y autorización insuficiente.
- **Brechas de `@ai27-tech/ui`:** verificar la API exacta de `MessagePanel`, `MessageList`, `MessageBubble`, `Modal` y `FilterTable`; toda afordancia faltante se compone con primitivas y se registra como solicitud a la librería.

## Trazabilidad

- Un reclamo activo, conflicto de versión y reclamo concurrente: Requirement 3 y escenarios 1 y 7; HU-015 Escenario 2.
- Solo el reclamante envía: Requirements 4 y 5 y escenario 9; HU-015 Escenario 3.
- Historial para miembro nuevo, auditado: Requirement 2.6 y escenario 4; HU-015 Escenario 4; DEC-015.
- Perder el reclamo quita envío, no lectura: Requirement 5 y escenario 8; DoD de E8-T15.
- Liberar: Requirement 6 y escenario 2; HU-016 Escenario 1.
- Transferencia atómica: Requirement 7 y escenario 3; HU-016 Escenario 2; DoD ("e2e de transferencia entre dos usuarios sin pérdida de historia").
- Override y alerta: Requirements 8 y 9 y escenario 5, como exclusiones de V1 (DEC-107, DEC-108); HU-016 Escenarios 3, 4 y 5 no se cubren en V1.
- Solo lectura: Requirement 10 y escenario 11; DEC-030, DEC-041.
- SSE, reconexión y `stream.stale`: Requirement 11 y escenarios 6 y 12; E0-T9, ADR 28.
- Estados y sesión: Requirement 12 y escenarios 13 y 14.
