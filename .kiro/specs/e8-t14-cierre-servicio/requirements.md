# Requirements Document

## Introduction

El **cierre del servicio** (E8-T14) es la acción del panel interno con la que el Jefe Operativo (o el Administrador) da por terminado un viaje, indicando un **motivo**, para que el viaje quede en `CERRADO` (terminal) y el expediente conserve por qué se cerró. Satisface `E1-HU-010`. La acción vive en el detalle del viaje (E8-T8), reemplaza el botón genérico "Transicionar a: CERRADO" que hoy ofrece ese detalle y reutiliza sus capas, sesión, toasts y modales.

Principios rectores de la historia técnica E8-T14:

- El cierre exige un **motivo** del catálogo cerrado de V1: **`normal`** o **`por_incidencia`** (DEC-113; el motivo `bitacora` se retiró). Sin motivo, el cierre queda **bloqueado**.
- El **cierre anticipado** (antes de llegar a una parada) solo es válido **por incidencia**, con una condición `INCIDENCIA` abierta, y solo lo hace el Jefe Operativo o el Administrador (DEC-020 #6, DEC-060). Sin incidencia abierta se **bloquea con la razón visible**.
- `CERRADO` es **terminal**: un viaje ya cerrado no ofrece acciones.
- Al cerrar, la conversación conserva escritura **3 días** si el viaje terminó sin incidencia (`normal`) y **6 meses** si terminó con incidencia (`por_incidencia`); después pasa a **sólo lectura** (DEC-030, DEC-041). La interfaz **comunica** esa regla según el motivo y anticipa el paso a sólo lectura. La regla de la ventana la aplica `mensajeria`, no la interfaz.
- **El cliente no cierra** viajes. Esta pantalla es del panel interno. **Supervisor y Coordinador tampoco cierran en V1** (DEC-060).
- Autorización, alcance, validación de la máquina de estados y de las guardas del cierre las aplica el `bff`/`operacion`. La interfaz **previene** lo que puede con datos que ya tiene (rol, estado, condiciones activas) y **clasifica** las respuestas; no reimplementa dominio.

> **Estado de las brechas (2026-10-29).** El brief de cierre fue respondido y `@ai27-tech/contracts@0.1.0-tracer.24` está publicado (motivo tipado y códigos de 409 declarados). Quedan tres condicionamientos, marcados en el texto: **[Condicionado a brecha 4]** (fecha exacta de la ventana, depende de Producto), **[Condicionado a brecha 5]** (códigos de 409 en runtime y 403 real, diferidos a plataforma) y **[Condicionado a brecha 8]** (el pin del frontend debe subir a `tracer.24`). Detalle en `BRECHAS.md`.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos ni componentes compartidos.

## Glossary

- **Cierre_UI**: el sistema de interfaz que ofrece y confirma el cierre del servicio dentro del detalle del viaje. Es el "sistema" al que refieren los criterios.
- **Cierre**: transición del viaje a `CERRADO` mediante `transicionarViaje` (`POST /api/v1/viajes/{id}/transiciones`) con `a_estado: CERRADO` y `motivo_cierre`.
- **Motivo de cierre**: dato obligatorio del cierre; enum generado `MotivoCierre = normal | por_incidencia` (`TransicionEntrada.motivo_cierre`, `tracer.24`, DEC-113).
- **Cierre normal**: cierre desde `EN_DESTINO` o `EN_DESCARGA`, es decir, con la unidad en una parada (guarda `ultima_parada`). La interfaz lo deriva del estado de origen, igual que `operacion` (criterio vigente de V1).
- **Cierre anticipado**: cierre desde `EN_TRANSITO`, antes de llegar a una parada (guarda `cierre_anticipado_por_incidencia`, DEC-020 #6).
- **Incidencia abierta**: elemento de `condiciones_activas` del detalle con `tipo === 'INCIDENCIA'`.
- **Ventana de escritura**: periodo posterior al cierre en el que la conversación del viaje admite mensajes: 3 días con motivo `normal`, 6 meses con motivo `por_incidencia`; luego sólo lectura (DEC-030, DEC-041).
- **Rol facultado**: `jefe_operativo` o `administrador` (DEC-060 #1).
- **Estado terminal**: estado sin transiciones salientes; incluye `CERRADO`.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance/rol y reenvía a `operacion`.

## Requirements

### Requirement 1: Ofrecer el cierre solo cuando corresponde

**User Story:** Como Jefe Operativo, quiero ver la acción "Cerrar servicio" cuando el viaje puede cerrarse, y no verla cuando no me corresponde, para no intentar lo que el sistema va a rechazar.

#### Acceptance Criteria

1. THE Cierre_UI SHALL derivar si el viaje puede cerrarse de la máquina de estados generada (`accionesDesde(estado)` incluye `CERRADO`), y SHALL NOT mantener una lista local de estados desde los que se cierra.
2. WHEN el viaje está en `EN_DESTINO`, `EN_DESCARGA` o `EN_TRANSITO` y la sesión tiene rol facultado, THE Cierre_UI SHALL mostrar la acción "Cerrar servicio" dentro de las acciones del detalle.
3. THE Cierre_UI SHALL reemplazar el botón genérico "Transicionar a: CERRADO" por la acción dedicada "Cerrar servicio", de modo que el cierre nunca se envíe sin pasar por la captura del motivo.
4. WHERE la sesión no tiene rol facultado (monitorista, supervisor, coordinador, ejecutivo, reacción), THE Cierre_UI SHALL NOT mostrar la acción de cierre. La decisión final de autorización es del `bff`.
5. WHEN el viaje está en `CERRADO` (o en cualquier estado terminal), THE Cierre_UI SHALL NOT ofrecer la acción de cierre ni ninguna otra transición, y SHALL indicar de forma visible que el viaje ya está cerrado.
6. THE Cierre_UI SHALL NOT ofrecer la acción de cierre al cliente: la pantalla pertenece al panel interno.
7. THE Cierre_UI SHALL NOT usar `destinos[].arribo` para decidir si ofrece, advierte o bloquea el cierre: el criterio vigente de V1 es el estado de origen.

### Requirement 2: Motivo de cierre obligatorio

**User Story:** Como Jefe Operativo, quiero indicar el motivo al cerrar, para que el expediente conserve por qué se cerró el servicio.

#### Acceptance Criteria

1. WHEN el usuario elige "Cerrar servicio", THE Cierre_UI SHALL abrir un diálogo que solicita el motivo de cierre del enum generado `MotivoCierre` (`normal`, `por_incidencia`), sin texto libre.
2. THE Cierre_UI SHALL mantener deshabilitada la confirmación mientras no se haya elegido un motivo, y IF el usuario intenta confirmar sin motivo THEN THE Cierre_UI SHALL impedir el envío y señalar el dato faltante.
3. WHEN el usuario confirma con un motivo, THE Cierre_UI SHALL enviar `transicionarViaje` con `a_estado: CERRADO` y `motivo_cierre` en la entrada, y SHALL NOT enviar el motivo en `causa`. **[Condicionado a brecha 8: requiere el pin `tracer.24`]**
4. THE Cierre_UI SHALL tomar los valores del motivo del tipo generado y SHALL NOT declarar localmente un catálogo propio.
5. THE Cierre_UI SHALL NOT capturar observaciones de cierre en V1 (decisión de Producto: se omiten).
6. THE Cierre_UI SHALL NOT ofrecer el motivo `bitacora` ni mencionarlo (DEC-113).

### Requirement 3: Cierre anticipado solo por incidencia

**User Story:** Como Jefe Operativo, quiero poder cerrar antes de la última parada únicamente cuando hay una incidencia, y entender por qué no puedo hacerlo cuando no la hay.

#### Acceptance Criteria

1. WHEN el viaje está en `EN_TRANSITO`, THE Cierre_UI SHALL tratar el cierre como anticipado y SHALL ofrecer únicamente el motivo "por incidencia".
2. IF el viaje está en `EN_TRANSITO` y `condiciones_activas` no contiene una `INCIDENCIA`, THEN THE Cierre_UI SHALL mostrar la acción de cierre deshabilitada con la **razón visible** ("El cierre anticipado solo es válido con una incidencia abierta") y SHALL NOT permitir enviarlo.
3. WHEN el viaje está en `EN_TRANSITO` y `condiciones_activas` contiene una `INCIDENCIA`, THE Cierre_UI SHALL habilitar el cierre con el motivo "por incidencia" ya determinado.
4. WHEN el viaje está en `EN_DESTINO` o `EN_DESCARGA`, THE Cierre_UI SHALL ofrecer los dos motivos del catálogo.
5. IF el `bff` rechaza el cierre con `409`, THEN THE Cierre_UI SHALL informar el conflicto, recargar el detalle y SHALL NOT presentar el viaje como cerrado. Cuando el `codigo` recibido sea `cierre_anticipado_requiere_incidencia` o `cierre_anticipado_solo_por_incidencia`, THE Cierre_UI SHALL mostrar el mensaje específico de esa causa; mientras el runtime envíe `codigo: conflicto`, SHALL mostrar el mensaje genérico de conflicto. **[Condicionado a brecha 5: emisión de códigos en runtime]**

### Requirement 4: Comunicar la ventana de escritura

**User Story:** Como Jefe Operativo, quiero saber, antes y después de cerrar, cuánto tiempo seguirá escribible la conversación del viaje y cuándo pasará a sólo lectura, para anticipar el efecto del cierre.

#### Acceptance Criteria

1. WHEN el usuario elige un motivo en el diálogo de cierre, THE Cierre_UI SHALL mostrar la ventana de escritura resultante: 3 días para "normal" y 6 meses para "por incidencia", e indicar que al vencer la conversación pasa a sólo lectura.
2. WHEN el `bff` confirma el cierre, THE Cierre_UI SHALL mostrar un aviso de éxito que repita la ventana del motivo enviado y el paso posterior a sólo lectura.
3. THE Cierre_UI SHALL NOT calcular una fecha de vencimiento (`cerrado_en` + ventana): esa regla es de `mensajeria`. Mostrar la fecha exacta queda condicionado a que Producto la exija y el contrato la publique. **[Condicionado a brecha 4]**
4. THE Cierre_UI SHALL NOT afirmar que la ventana ya se aplicó en la conversación; solo comunica la regla asociada al motivo.
5. WHEN el detalle de un viaje ya `CERRADO` se carga de nuevo, THE Cierre_UI SHALL mostrar que el viaje está cerrado sin reconstruir la ventana, porque el detalle no trae el motivo ni el vencimiento. **[Condicionado a brecha 4]**

### Requirement 5: Resultado del cierre y manejo de errores

**User Story:** Como Jefe Operativo, quiero un resultado claro cuando cierro (éxito, conflicto o error) sin que la pantalla se rompa, para saber si el viaje quedó cerrado.

#### Acceptance Criteria

1. WHEN el `bff` responde `200` con el detalle actualizado, THE Cierre_UI SHALL cerrar el diálogo, reflejar el estado `CERRADO`, retirar todas las acciones y mostrar el aviso de éxito de Requirement 4.2.
2. IF el `bff` responde `409`, THEN THE Cierre_UI SHALL informar que el cierre no es posible en el estado actual, recargar el detalle y SHALL NOT presentar el viaje como cerrado (ver Requirement 3.5 para los mensajes por `codigo`). **[Condicionado a brecha 5]**
3. IF el `bff` responde `400` (motivo ausente o fuera de catálogo), THEN THE Cierre_UI SHALL mostrar el error en el diálogo y conservar el motivo elegido.
4. IF el `bff` responde `403`, THEN THE Cierre_UI SHALL informar que el cierre requiere Jefe Operativo o Administrador, sin romper la vista. **[Condicionado a brecha 5: hoy `operacion` responde `401` para este caso]**
5. IF el `bff` responde `404`, THEN THE Cierre_UI SHALL tratar el viaje como inexistente, igual que el detalle del viaje.
6. IF el `bff` responde `401` o la sesión expira durante el flujo, THEN THE Cierre_UI SHALL delegar el manejo al flujo de sesión vigente (`client.ts`) y SHALL NOT modificar ese flujo en esta tarea. Un `401` por falta de facultad cortaría la sesión; la prevención por rol de Requirement 1.4 es la mitigación. **[Condicionado a brecha 5 y a la decisión del senior]**
7. IF la petición falla por red u otro error no clasificado, THEN THE Cierre_UI SHALL mostrar un error accionable, conservar el motivo elegido y permitir reintentar.
8. WHILE el cierre está en curso, THE Cierre_UI SHALL deshabilitar la confirmación y el cierre del diálogo para impedir envíos duplicados.

## Escenarios

### Escenarios positivos

**Escenario 1. Cierre normal**
Dado que un viaje descargó en su última parada (`EN_DESCARGA`) y el usuario es Jefe Operativo, cuando elige "Cerrar servicio", selecciona el motivo "normal" y confirma, entonces el `bff` aplica la transición, el detalle muestra `CERRADO` sin acciones, y el aviso indica que la conversación acepta mensajes durante 3 días y luego pasa a sólo lectura.

**Escenario 2. Cierre por incidencia desde una parada**
Dado que un viaje está en `EN_DESTINO` y tuvo una incidencia, cuando el Jefe Operativo cierra con el motivo "por incidencia", entonces el viaje pasa a `CERRADO` y el aviso indica 6 meses de escritura antes de sólo lectura.

**Escenario 3. Cierre anticipado con incidencia abierta**
Dado que un viaje está `EN_TRANSITO` con una `INCIDENCIA` en `condiciones_activas`, cuando el Jefe Operativo elige "Cerrar servicio", entonces el diálogo ofrece solo el motivo "por incidencia"; al confirmar, el viaje pasa a `CERRADO` y el aviso indica 6 meses.

**Escenario 4. Cierre por el Administrador**
Dado que el usuario es Administrador y el viaje está `EN_DESTINO`, cuando cierra con el motivo "normal", entonces el flujo es idéntico al del Jefe Operativo.

### Escenarios negativos y de borde

**Escenario 5. Cierre sin motivo**
Dado que el diálogo de cierre está abierto, cuando el usuario no ha elegido motivo, entonces la confirmación está deshabilitada y, si se intenta, la interfaz señala el dato faltante sin enviar nada.

**Escenario 6. Cierre anticipado sin incidencia**
Dado que un viaje está `EN_TRANSITO` y `condiciones_activas` no trae `INCIDENCIA`, cuando el Jefe Operativo observa las acciones, entonces "Cerrar servicio" aparece deshabilitado con la razón "El cierre anticipado solo es válido con una incidencia abierta" y no se puede enviar.

**Escenario 7. Viaje ya cerrado**
Dado que un viaje está en `CERRADO`, cuando se abre su detalle, entonces no hay acciones de cierre ni de otra transición, y la pantalla indica que el viaje está cerrado.

**Escenario 8. Rol sin facultad**
Dado que el usuario es Monitorista, Supervisor, Coordinador, Ejecutivo o Reacción, cuando abre el detalle de un viaje cerrable, entonces no ve la acción "Cerrar servicio".

**Escenario 9. Carrera: la incidencia se cerró**
Dado que el detalle mostraba una incidencia abierta en un viaje `EN_TRANSITO`, cuando otro usuario la cierra y el Jefe Operativo confirma el cierre anticipado, entonces el `bff` responde `409`, la interfaz informa el conflicto, recarga el detalle (donde "Cerrar servicio" ya aparece bloqueado con su razón) y no muestra el viaje como cerrado.

**Escenario 10. Viaje cerrado por otro operador**
Dado que otro operador cerró el viaje entre la lectura y el envío, cuando el Jefe Operativo confirma, entonces el `bff` responde `409`, la interfaz informa que el viaje ya no admite el cierre y recarga el detalle en `CERRADO`.

**Escenario 11. 409 sin código diferenciado**
Dado que el runtime todavía envía `codigo: conflicto` para el rechazo del cierre, cuando el `bff` responde `409`, entonces la interfaz muestra el mensaje genérico de conflicto y recarga el detalle sin intentar adivinar la causa. Cuando el runtime emita los códigos de `tracer.24`, la misma pantalla muestra el mensaje específico. **[Condicionado a brecha 5]**

**Escenario 12. Falla de red al cerrar**
Dado que la petición de cierre falla por red, cuando ocurre el error, entonces la interfaz muestra un error accionable, conserva el motivo elegido y permite reintentar sin presentar el viaje como cerrado.

**Escenario 13. Sesión expirada durante el cierre**
Dado que la sesión expira durante el cierre, cuando el `bff` responde `401` y el refresco no es posible, entonces el flujo de sesión del panel interno toma el control en lugar de un error genérico.

## Dependencias

- `E1-HU-010` (corregida: motivos `normal` y `por_incidencia`; cierran solo Jefe Operativo y Administrador). `E1-T8`: cierre como transición validada con motivo obligatorio y evento `viaje.cerrado`.
- E8-T8 (detalle del viaje, acciones derivadas de la máquina de estados, toasts, wrapper `transicionar`), E8-T13 (la incidencia abierta que habilita el cierre anticipado se marca en el histórico) y E8-T4 (rol efectivo en la sesión).
- DEC-020 #6 (cierre anticipado), DEC-030 y DEC-041 (ventanas y sólo lectura), DEC-060 (facultades por rol), **DEC-113** (motivos de cierre), DEC-111 (nota: `operacion` responde `401` en lugar de `403`; A3/B1 diferidos).
- Contrato `@ai27-tech/contracts@0.1.0-tracer.24` (pin vigente; brecha 8 cerrada) y `@ai27-tech/ui@0.2.0-beta.6`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`.
- Cierre por el cliente (el cliente cancela o rechaza por su propia superficie, E9-T7).
- Observaciones de cierre (omitidas en V1 por decisión de Producto).
- El motivo `bitacora` (retirado por DEC-113).
- Calcular o mostrar la fecha exacta de paso a sólo lectura de la conversación (brecha 4, condicionada a Producto).
- Aplicar la ventana de escritura o el sólo lectura de la conversación: lo hace `mensajeria` (E3-HU-014).
- Resolver en el frontend autorización, alcance, guardas del cierre, atomicidad o auditoría: lo aplica el `bff`/backend.
- Definir "listo para cerrar" desde `destinos[].arribo` o desde un puntero de parada.
- El panel del Jefe Operativo y su lista de viajes listos para cerrar (`E6-HU-033`, tarea propia); T14 cubre la acción en el detalle.
- Modificar el flujo de sesión de `client.ts` para distinguir un `401` por falta de facultad (decisión transversal del senior).
- Emitir en runtime los códigos de 409 o el `403` real (tarea de plataforma diferida).
- Retención legal total de mensajes (pendiente de Legal).

## Notas de brechas

Estas notas son prerrequisitos de verificación y no reglas. El detalle, las fuentes y las propuestas están en `BRECHAS.md`.

- **Brecha 4, ventana de escritura:** el `bff` no expone el vencimiento; la UI comunica la regla, no la fecha. Condicionada a la respuesta de Producto (C5).
- **Brecha 5, códigos de 409 y 403:** `tracer.24` declara `cierre_anticipado_solo_por_incidencia`, `cierre_anticipado_requiere_incidencia` y `transicion_no_permitida`, pero el runtime envía `conflicto`; `operacion` responde `401` (no `403`) a un rol sin facultad. Ambos cambios son de plataforma y están diferidos. `client.ts` refresca y, si el reintento vuelve a dar `401`, corta la sesión; la mitigación es la prevención por rol.
- **Brecha 8, pin del frontend:** cerrada; el `package.json` fija `tracer.24` y los tipos `motivo_cierre`/`MotivoCierre` están disponibles.
- **Brechas 1, 2, 3 y 6:** cerradas (motivo tipado en `tracer.24`; observaciones omitidas; `bitacora` retirado por DEC-113; criterio por estado de origen y roles facultados confirmados).
- **Brecha 7, librería:** no hay aviso en línea dedicado; se compone con texto semántico y tokens `--ui-*`.
- **Textos (C6):** los mensajes de bloqueo y de ventana de este spec son propuestos y están pendientes de validación de copy por Producto.

## Trazabilidad

- Cierre desde un estado válido, `CERRADO` terminal y sin acciones posteriores (`E1-HU-010`): Requirements 1 y 5; escenarios 1, 7 y 10.
- Motivo obligatorio (DoD "cierre sin motivo bloqueado") y catálogo `normal`/`por_incidencia` (DEC-113): Requirement 2; escenarios 1, 2 y 5.
- Cierre anticipado solo por incidencia y solo por Jefe Operativo/Administrador (DEC-020 #6, DEC-060): Requirements 1.4 y 3; escenarios 3, 6, 8 y 9. DoD "el cierre anticipado se bloquea sin incidencia": Requirement 3.2.
- Ventana de escritura de 3 días o 6 meses y paso a sólo lectura (DEC-030, DEC-041): Requirement 4; escenarios 1, 2 y 3. DoD "la interfaz comunica la ventana": Requirements 4.1 y 4.2.
- Cliente no cierra: Requirement 1.6 y fuera de alcance.
- Errores y sesión: Requirement 5; escenarios 9, 10, 11, 12 y 13.
