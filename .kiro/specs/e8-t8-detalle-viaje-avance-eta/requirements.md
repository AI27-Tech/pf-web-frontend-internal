# Requirements Document

## Introduction

El **detalle del viaje: avance y ETA manual** (E8-T8) es la pantalla del panel interno que, para un viaje concreto, permite al operador (Monitorista, o Supervisor/Coordinador en su alcance; DEC-060) registrar el avance mediante **transiciones de estado validadas** y **fijar el ETA a mano**, para que el cliente vea hitos y una estimación sin que exista telemetría. Satisface `E1-HU-005` más `DEC-007 A1` (el Monitorista captura y confirma el ETA). La pantalla vive en el outlet del AppShell (E8-T4), en una ruta de detalle bajo `/_private/viajes`.

Principios rectores: las acciones ofrecidas se **derivan de la máquina de estados generada** desde `contracts/estados/` (`@ai27-tech/contracts/estados`), nunca de una lista escrita en el portal; la única forma de mover un viaje es una transición validada (no existe escritura directa de `estado`); el ETA es un dato capturado a mano, marcado "estimado, no en vivo" (ADR 20 / DEC-001 / DEC-007). Los componentes de interfaz provienen de `@ai27-tech/ui`; esta tarea no crea componentes nuevos.

> **Nota de contrato (BLOQUEANTE PARCIAL — hecho verificado, no supuesto):** los endpoints que esta historia nombra NO existen hoy en el `bff` (`bff.yaml` / `bff.gen.ts`): solo expone `listarViajes`, `crearViaje`, `seguirViaje` (vista curada para cliente, sin estado canónico) y `descargarViaje`. `POST /viajes/{id}/transiciones` (`transicionarViaje`) y `PATCH /viajes/{id}/eta` (`fijarEta`) existen únicamente en `operacion.yaml`, que el frontend no consume directo. Se envió solicitud al dueño de `pf-pkg-contracts` para exponerlos en el `bff` (más una lectura de detalle con estado canónico). Mientras tanto, la pantalla se construye contra el **contrato esperado**, con la brecha aislada en una sola capa de tipos y servida con mocks (MSW).

## Glossary

- **Detalle**: pantalla de un viaje concreto en `/_private/viajes/$id`.
- **Detalle_UI**: el sistema de interfaz que renderiza el detalle (componente de ruta y sus elementos). Es el "sistema" al que refieren los criterios.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance/rol y reenvía a `operacion`.
- **Estado**: token de progreso del viaje (`EstadoViaje`, ADR 19). Una sola dimensión por viaje.
- **Transicion**: cambio de estado validado contra la máquina de estados (`a_estado`, `causa?`). La única forma de mover un viaje.
- **Accion**: afordancia de transición ofrecida al operador, derivada de `TRANSICIONES_VIAJE` / `puedeTransicionar` sobre el estado actual.
- **ETA**: estimación manual de llegada (`eta_estimado`), capturada por el operador; marcada "estimado, no en vivo". Sin recálculo automático (ADR 20).
- **Terminal**: estado sin transiciones de salida (`esTerminal` / `ESTADOS_TERMINALES`): `RECHAZADO_POR_AI27`, `RECHAZADO_POR_CLIENTE`, `CERRADO`, `CANCELADO`.
- **Carrera**: rechazo del servidor (409) a una transición que la UI sí ofrecía, porque otro actor movió el viaje antes.

## Requirements

### Requirement 1: Lectura del detalle con estado canónico

**User Story:** Como operador interno, quiero ver el detalle de un viaje con su estado actual, origen, destinos y ETA, para decidir el siguiente paso.

#### Acceptance Criteria

1. WHEN la Detalle_UI se monta con un identificador de viaje, THE Detalle_UI SHALL solicitar al `bff` la lectura de detalle del viaje usando el cliente de `@ai27-tech/contracts`.
2. WHEN el `bff` responde, THE Detalle_UI SHALL mostrar el estado canónico del viaje (token de `EstadoViaje`), su origen y sus destinos, tal como los entrega el `bff`, sin derivar ni normalizar.
3. WHERE el viaje tiene un ETA fijado, THE Detalle_UI SHALL mostrarlo marcado como "estimado, no en vivo".
4. WHERE el `bff` entrega condiciones activas del viaje (`INCIDENCIA`, `SIN_SENAL`), THE Detalle_UI SHALL mostrarlas como indicadores separados del estado (P15), usando `Badge` de `@ai27-tech/ui`.

### Requirement 2: Acciones derivadas de la máquina de estados

**User Story:** Como operador interno, quiero ver solo las transiciones permitidas desde el estado actual, para no intentar un avance inválido.

#### Acceptance Criteria

1. THE Detalle_UI SHALL derivar las Acciones ofrecidas de `TRANSICIONES_VIAJE` / `puedeTransicionar` de `@ai27-tech/contracts/estados`, tomando el estado actual como origen.
2. THE Detalle_UI SHALL NOT mostrar como Accion ningún destino que no sea alcanzable desde el estado actual según la máquina de estados generada.
3. THE Detalle_UI SHALL NOT ofrecer `PATRULLA_EN_CAMINO` como Accion (inalcanzable en V1).
4. WHEN el estado actual es Terminal, THE Detalle_UI SHALL NOT ofrecer ninguna Accion de transición.
5. WHERE un destino requiere causa (p. ej. rechazo, DEC-020 #2), THE Detalle_UI SHALL solicitar la causa antes de enviar la transición.

### Requirement 3: Registrar una transición

**User Story:** Como operador interno, quiero registrar una transición válida, para hacer avanzar el viaje y dejar constancia con actor y marca de tiempo.

#### Acceptance Criteria

1. WHEN el operador confirma una Accion, THE Detalle_UI SHALL enviar `POST /viajes/{id}/transiciones` con `{ a_estado, causa? }` al `bff`.
2. WHEN el `bff` confirma la transición, THE Detalle_UI SHALL reflejar el nuevo estado y recalcular las Acciones ofrecidas.
3. IF el `bff` responde `409` con código `transicion_no_permitida` (Carrera), THEN THE Detalle_UI SHALL informar el rechazo sin romper la vista y recargar el estado actual.
4. IF el `bff` responde `401`, THEN THE Detalle_UI SHALL delegar el manejo de sesión al flujo del AppShell en lugar de mostrar un error genérico.

### Requirement 4: Fijar el ETA manual

**User Story:** Como Monitorista, quiero capturar y confirmar el ETA a mano, para que el cliente vea una estimación sin telemetría.

#### Acceptance Criteria

1. WHERE el viaje no está en estado Terminal, THE Detalle_UI SHALL ofrecer la captura del ETA.
2. WHEN el operador confirma un ETA, THE Detalle_UI SHALL enviar `PATCH /viajes/{id}/eta` con `{ eta_estimado }` al `bff`.
3. WHEN el `bff` confirma el ETA, THE Detalle_UI SHALL mostrarlo marcado "estimado, no en vivo".
4. IF el `bff` responde `409` con código `viaje_en_estado_terminal`, THEN THE Detalle_UI SHALL informar que el viaje terminal no admite ETA, sin romper la vista.

### Requirement 5: Bucle multi-parada visible

**User Story:** Como operador interno, quiero ver qué destino sigue, cuál arribó y cuál descargó, para operar un viaje de varias paradas.

#### Acceptance Criteria

1. WHEN el viaje tiene más de un destino, THE Detalle_UI SHALL mostrar el progreso por parada (siguiente, arribado, descargado) a partir de los datos del `bff`.
2. THE Detalle_UI SHALL ofrecer el tramo `EN_DESTINO → EN_DESCARGA → EN_TRANSITO`/`CERRADO` según lo permita la máquina de estados, reconociendo que la descarga es opcional por destino.

### Requirement 6: Estados de carga y error

**User Story:** Como operador interno, quiero señales claras de carga y error con reintento, para saber qué ocurre.

#### Acceptance Criteria

1. WHILE la lectura de detalle está en curso, THE Detalle_UI SHALL mostrar un indicador de carga.
2. IF la lectura de detalle falla (no 401), THEN THE Detalle_UI SHALL mostrar un error con acción de reintento.

## Brechas y supuestos a verificar

1. **Endpoints del `bff` ausentes (brecha de contrato abierta, BLOQUEANTE PARCIAL).** `transicionarViaje`, `fijarEta` y una lectura de detalle con estado canónico no existen en el `bff` hoy; existen en `operacion`. La pantalla se construye contra el contrato esperado, con la brecha aislada en `src/lib/contracts/viajeDetalle.ts`, servida con mocks. Reemplazo mecánico cuando el `bff` publique los endpoints. No escribir clientes a mano como autoridad paralela.
2. **Forma de la lectura de detalle.** Se espera algo equivalente a `ViajeDetalle` de `operacion` (`{ viaje: { id, estado, origen, destinos[], fecha_hora_servicio?, eta_estimado? }, condiciones_activas[] }`). El nombre del operationId del `bff` puede diferir; punto único de cambio: la capa de contrato aislada.
3. **Códigos de 409.** `transicion_no_permitida` y `viaje_en_estado_terminal` provienen de `operacion.yaml`. Si el `bff` los renombra, ajustar el wrapper de API.
4. **Progreso por parada en el wire.** El Requirement 5 asume que el `bff` entrega información de destinos suficiente para derivar siguiente/arribado/descargado. Si el detalle no la trae, se registra como brecha y la vista se limita a lo disponible.
5. **Versión de `@ai27-tech/contracts`.** Trabajar contra el paquete instalado; verificar que `EstadoViaje`, `TRANSICIONES_VIAJE`, `puedeTransicionar` y `esTerminal` existan en esa versión (sí están en el contrato generado observado).

## Fuera de alcance (V1)

- Marcador vivo de posición, estado de señal y recálculo automático de ETA (DEC-001, DEC-007).
- `PATRULLA_EN_CAMINO` como acción (inalcanzable en V1).
- Guarda de aptitud que bloquee `APTO_PARA_SALIDA` (no gatea en V1, DEC-055).
- Creación o asignación de viajes desde esta pantalla (otras tareas: E8-T9, E8-T10).
- Creación de componentes de interfaz nuevos: se usan los de `@ai27-tech/ui`; toda necesidad no cubierta se reporta como brecha.
