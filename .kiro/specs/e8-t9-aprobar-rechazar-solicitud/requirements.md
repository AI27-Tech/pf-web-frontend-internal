# Requirements Document

## Introduction

**Revisar, aprobar o rechazar la solicitud** (E8-T9) es la decisión explícita del Jefe Operativo (DEC-060) sobre un viaje en estado `SOLICITADO`, dentro de la misma pantalla de detalle del panel interno (E8-T8). Satisface `E1-HU-003`: aprobar o rechazar en `Solicitado`; la aprobación es explícita; **no se puede aprobar sin la `fecha/hora` del servicio** y el Jefe Operativo la completa antes; al aprobar el viaje pasa a `Aprobado`; al rechazar pasa a `Rechazada por AI27` y el **motivo es obligatorio**; la decisión queda en el histórico con actor y marca de tiempo (añadidos por `operacion`).

Principios rectores: las acciones ofrecidas se **derivan de la máquina de estados generada** (`@ai27-tech/contracts/estados`), no de una lista escrita en el portal; desde `SOLICITADO` las aristas son exactamente `APROBADO`, `RECHAZADO_POR_AI27` y `CANCELADO`; la única forma de mover un viaje es una transición validada (no hay escritura directa de `estado`). Los componentes de interfaz provienen de `@ai27-tech/ui`; esta tarea **no crea componentes nuevos**. No existe un estado `En revisión` separado (DEC-005 #8): `SOLICITADO` ya significa "en espera de revisión".

Esta tarea se apoya en la infraestructura de E8-T8 (lectura de detalle con estado canónico, derivación de acciones, modal de causa obligatoria, wrapper de API con clasificación de 409, mocks). E8-T9 añade sobre esa base: el **guard de `fecha/hora` obligatoria para aprobar**, la **captura de la `fecha/hora`** cuando falta, y el afinado del rechazo con motivo para la solicitud.

> **Nota de contrato (BLOQUEANTE PARCIAL — hecho verificado, no supuesto):** el contrato instalado `@ai27-tech/contracts@0.1.0-tracer.13` expone la lectura del detalle (`obtenerViajeInterno`, con `fecha_hora_servicio` **solo de lectura**) y la transición (`transicionarViaje`, cuerpo `TransicionEntrada { a_estado, causa? }`), pero **NO expone ningún endpoint de escritura para completar/editar `fecha_hora_servicio`**: no hay `PATCH /viajes/{id}` en el `bff`, `TransicionEntrada` no lleva fecha/hora, y en `operacion` ese campo solo entra en la **creación** (`ViajeEntrada`), no en edición. Se procede con **Opción A**: la brecha se aísla en una sola capa de tipos (capa de contrato del detalle) y se sirve con mocks (MSW) contra el **contrato esperado** de completar fecha/hora; se reporta al dueño de `pf-pkg-contracts` para que publique el endpoint. El reemplazo será mecánico cuando el `bff` lo exponga.

## Glossary

- **Detalle_UI**: el sistema de interfaz que renderiza el detalle del viaje (`DetalleViaje`, E8-T8). Es el "sistema" al que refieren los criterios.
- **Solicitud**: viaje en estado `SOLICITADO`, a la espera de la decisión del Jefe Operativo.
- **Aprobar**: transición `SOLICITADO → APROBADO`. Requiere que exista `fecha_hora_servicio`.
- **Rechazar**: transición `SOLICITADO → RECHAZADO_POR_AI27`. Requiere causa (motivo) obligatoria.
- **fecha_hora_servicio**: fecha y hora pactada del servicio (`MarcaTiempo`, ISO 8601). Guarda de la aprobación.
- **Completar fecha/hora**: capturar o editar `fecha_hora_servicio` cuando falta, antes de aprobar. Depende de un endpoint **esperado** (brecha aislada, servido por mock).
- **Carrera**: rechazo del servidor (409 `transicion_no_permitida`) a una decisión que la UI sí ofrecía, porque otro Jefe Operativo ya resolvió la solicitud.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance/rol y reenvía a `operacion`.

## Requirements

### Requirement 1: Decisión visible solo en solicitudes

**User Story:** Como Jefe Operativo, quiero ver las acciones de aprobar y rechazar solo cuando el viaje está en `SOLICITADO`, para no intentar una decisión sobre un viaje ya resuelto.

#### Acceptance Criteria

1. WHEN el viaje está en `SOLICITADO`, THE Detalle_UI SHALL ofrecer Aprobar (`APROBADO`) y Rechazar (`RECHAZADO_POR_AI27`) como acciones, derivadas de `TRANSICIONES_VIAJE` / `puedeTransicionar`.
2. WHEN el viaje NO está en `SOLICITADO`, THE Detalle_UI SHALL NOT ofrecer la decisión de aprobar/rechazar como tal (las acciones vuelven a derivarse del estado actual, sin tratamiento especial de solicitud).
3. THE Detalle_UI SHALL derivar estas acciones de la máquina de estados generada, sin una lista de estados escrita a mano.

### Requirement 2: Aprobar exige fecha/hora del servicio

**User Story:** Como Jefe Operativo, quiero que aprobar quede bloqueado si falta la `fecha/hora` del servicio, para que ningún viaje avance sin ese dato.

#### Acceptance Criteria

1. WHERE el viaje en `SOLICITADO` no tiene `fecha_hora_servicio`, THE Detalle_UI SHALL mantener la acción Aprobar **deshabilitada**.
2. WHERE el viaje en `SOLICITADO` no tiene `fecha_hora_servicio`, THE Detalle_UI SHALL indicar que falta la `fecha/hora` y ofrecer completarla.
3. WHERE el viaje en `SOLICITADO` tiene `fecha_hora_servicio`, THE Detalle_UI SHALL habilitar la acción Aprobar.
4. WHEN el Jefe Operativo confirma Aprobar con `fecha_hora_servicio` presente, THE Detalle_UI SHALL enviar `POST /viajes/{id}/transiciones` con `{ a_estado: 'APROBADO' }` al `bff`.
5. WHEN el `bff` confirma la aprobación, THE Detalle_UI SHALL reflejar el nuevo estado `APROBADO` y recalcular las acciones ofrecidas.

### Requirement 3: Completar la fecha/hora antes de aprobar (brecha aislada)

**User Story:** Como Jefe Operativo, quiero completar la `fecha/hora` del servicio cuando falta, para poder aprobar la solicitud sin salir del detalle.

#### Acceptance Criteria

1. WHEN el Jefe Operativo elige completar la `fecha/hora`, THE Detalle_UI SHALL ofrecer un campo de captura de fecha y hora usando `Input type="datetime-local"` de `@ai27-tech/ui` dentro de un `Modal`.
2. THE Detalle_UI SHALL mantener la confirmación de la `fecha/hora` deshabilitada mientras el campo esté vacío.
3. WHEN el Jefe Operativo confirma una `fecha/hora`, THE Detalle_UI SHALL enviar la captura al `bff` a través de la operación **esperada** de completar fecha/hora (aislada en la capa de contrato; servida por mock mientras el `bff` no la publique).
4. WHEN la captura se confirma, THE Detalle_UI SHALL reflejar la `fecha_hora_servicio` y habilitar la acción Aprobar sin recargar la pantalla.
5. THE Detalle_UI SHALL aislar la forma de wire y la ruta de esta operación en un único punto de cambio, de modo que publicar el endpoint real sea un reemplazo mecánico.

### Requirement 4: Rechazar exige motivo

**User Story:** Como Jefe Operativo, quiero que rechazar una solicitud exija un motivo, para que el rechazo quede justificado en el histórico.

#### Acceptance Criteria

1. WHEN el Jefe Operativo elige Rechazar, THE Detalle_UI SHALL solicitar la causa (motivo) obligatoria antes de enviar, usando el modal de causa de E8-T8 (`CausaForm`).
2. THE Detalle_UI SHALL mantener la confirmación del rechazo deshabilitada mientras la causa esté vacía.
3. WHEN el Jefe Operativo confirma el rechazo con causa, THE Detalle_UI SHALL enviar `POST /viajes/{id}/transiciones` con `{ a_estado: 'RECHAZADO_POR_AI27', causa }` al `bff`.
4. WHEN el `bff` confirma el rechazo, THE Detalle_UI SHALL reflejar el estado `RECHAZADO_POR_AI27` (terminal) y dejar de ofrecer acciones de decisión.

### Requirement 5: Solicitud ya resuelta por otro Jefe Operativo (carrera)

**User Story:** Como Jefe Operativo, quiero un aviso claro cuando otro ya resolvió la solicitud, para no insistir sobre un viaje que ya cambió de estado.

#### Acceptance Criteria

1. IF el `bff` responde `409` con código `transicion_no_permitida` al aprobar o rechazar (Carrera), THEN THE Detalle_UI SHALL informar el rechazo sin romper la vista y recargar el estado actual.
2. WHEN el estado recargado ya no es `SOLICITADO`, THE Detalle_UI SHALL dejar de ofrecer la decisión de aprobar/rechazar.
3. IF el `bff` responde `401`, THEN THE Detalle_UI SHALL delegar el manejo de sesión al flujo del AppShell en lugar de mostrar un error genérico.

### Requirement 6: Señales de carga, confirmación y error

**User Story:** Como Jefe Operativo, quiero señales claras del resultado de mi decisión, para saber qué ocurrió.

#### Acceptance Criteria

1. WHILE una decisión (aprobar, rechazar o completar fecha/hora) está en curso, THE Detalle_UI SHALL deshabilitar la confirmación correspondiente para evitar envíos dobles.
2. WHEN una decisión se confirma con éxito, THE Detalle_UI SHALL mostrar un aviso de éxito con `Toast`.
3. IF una decisión falla por un error distinto de 401/409, THEN THE Detalle_UI SHALL informar el fallo con `Toast` sin romper la vista.

## Brechas y supuestos a verificar

1. **Endpoint de completar `fecha_hora_servicio` ausente (brecha de contrato abierta, Opción A).** Ni el `bff` ni `operacion` (tracer.13) exponen escritura de `fecha_hora_servicio` sobre un viaje existente. La operación esperada se aísla en la capa de contrato del detalle y se sirve con mock. Punto único de reemplazo cuando el `bff` publique el endpoint. No escribir un cliente a mano como autoridad paralela.
2. **Forma de wire de completar fecha/hora.** Se asume un cuerpo equivalente a `{ fecha_hora_servicio: string }` (ISO 8601, `MarcaTiempo`) que devuelve el `ViajeDetalle` actualizado, por simetría con `fijarEta`/`transicionar`. Si el `bff` publica otra forma (nombre de ruta, campo o verbo), se ajusta solo el wrapper y la capa de contrato.
3. **Código de 409 de carrera.** `transicion_no_permitida` proviene de la máquina de estados; ya lo clasifica el wrapper de E8-T8. No se introduce un código nuevo.
4. **Componente de fecha/hora.** `@ai27-tech/ui` no publica un `DatePicker` dedicado; la captura usa `Input type="datetime-local"`, igual que `etaForm.tsx` (E8-T8). Si en el futuro la librería publica un selector dedicado, se sustituye el `Input` sin cambiar la lógica. **Ningún componente nuevo.**
5. **Versión de `@ai27-tech/contracts`.** Trabajar contra el paquete instalado (tracer.13); verificar que las aristas desde `SOLICITADO` sigan siendo `APROBADO` / `RECHAZADO_POR_AI27` / `CANCELADO`.

## Fuera de alcance (V1)

- Estado `En revisión` como paso separado (DEC-005 #8): `SOLICITADO` ya lo cubre.
- Asignar o crear viajes desde esta decisión (otras tareas: E8-T10 asignar, E8-T11 crear por Operación).
- Motivo en texto libre para la creación interna (E8-T11 no pasa por este paso de aprobación).
- Cancelar la solicitud (`SOLICITADO → CANCELADO`): es una arista válida de la máquina, pero no es parte de la decisión aprobar/rechazar de E1-HU-003; se maneja con el flujo genérico de transición de E8-T8.
- Creación de componentes de interfaz nuevos: se usan los de `@ai27-tech/ui`; toda necesidad no cubierta se reporta como brecha.
