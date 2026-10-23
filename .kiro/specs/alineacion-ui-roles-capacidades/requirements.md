# Requirements Document: Alineación de la UI interna con roles y capacidades

## Estado

**Propuesta de trabajo — pendiente de refinamiento y aprobación de Product Management.**

Este spec no recibe identificador `E8-Txx` porque todavía no existe una tarea funcional aprobada para esta iniciativa. Su objetivo es alinear las capacidades ya construidas del frontend interno con los roles y reglas confirmados en el contexto de producto, sin inventar permisos ni sustituir la autorización del BFF.

## Introduction

La UI interna de AI27 ya cuenta con sesión, navegación, bandeja de viajes, detalle del viaje, transiciones, ETA, fecha/hora del servicio y asignación de escolta. Sin embargo, varias acciones y áreas se muestran a cualquier usuario autenticado, aunque el contexto funcional distingue ocho roles y dos dimensiones de alcance:

- el monitoreo se acota por `unidad`;
- la conversación con el cliente se acota por `cliente`;
- el BFF es la autoridad de rol y alcance;
- el frontend no debe calcular alcances que no vienen en el contrato.

El problema se observa de forma concreta en E8-T10: el mock emite una sesión `monitorista`, pero la UI permite asignar escolta, capacidad confirmada para `jefe_operativo` y `administrador`.

La iniciativa corrige la capa de experiencia y las pruebas de autorización del frontend. No crea permisos nuevos, no calcula alcances en el navegador y no conecta el frontend directamente con servicios internos.

## Fuentes de verdad

La implementación deberá verificarse contra estas fuentes, en este orden:

1. `repos/ai27-platform-context/docs/hu/E4-HU-018-usuarios-roles-y-alcances.md`.
2. `repos/ai27-platform-context/.kiro/steering/decision-log.md`, especialmente DEC-045 y DEC-060.
3. `repos/pf-pkg-contracts/contracts/openapi/bff.yaml` y los esquemas comunes de error.
4. El tracer publicado que Product Management/Contratos confirme como vigente.
5. El código y specs existentes del frontend interno.

Si una fuente futura contradice este documento, no se elige una interpretación en silencio: se detiene la tarea afectada y se registra la contradicción.

## Roles funcionales confirmados

| Rol              | Capacidades confirmadas relevantes para esta UI                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jefe_operativo` | Crear viajes internos, aceptar/rechazar solicitudes por AI27, armar roster, asignar escolta, cerrar viajes y consultar su panel propio.              |
| `monitorista`    | Operar viajes de sus unidades: ficha, ETA, avance, estadías, notas, incidencias y emergencias. No arma roster, no asigna escolta y no cierra viajes. |
| `supervisor`     | Facultades de Monitorista sobre la unión de unidades de sus monitoristas, más intervención supervisora y override auditado.                          |
| `coordinador`    | Facultades de Supervisor sobre la unión de unidades de sus supervisores. No agrega capacidades nuevas.                                               |
| `ejecutivo`      | Solo conversación con clientes asignados y chat interno vertical. No ve ni opera unidades o viajes.                                                  |
| `reaccion`       | Solo emergencias y la visibilidad autorizada del caso alertado. No opera viajes generales.                                                           |
| `administrador`  | Facultades funcionales y administrativas globales.                                                                                                   |
| `cliente`        | Usa el portal externo; no pertenece al panel interno.                                                                                                |

El alcance de `unidad` o `cliente` lo resuelve el BFF. La UI solo puede aplicar reglas de rol/audiencia confirmadas y representar las respuestas del BFF.

## Requirements

### Requirement 1: La sesión distingue autenticación, audiencia y rol

**User Story:** Como usuario de AI27, quiero que la UI interprete mi sesión de acuerdo con mi audiencia y rol, para no recibir capacidades de otra audiencia o rol.

#### Acceptance Criteria

1. THE frontend SHALL use the role and `Audiencia` derived from the session contract as the source for role-level UI decisions.
2. THE frontend SHALL NOT infer monitoring scope from the JWT, from the role name, from the URL or from locally maintained unit/client lists.
3. WHEN a session belongs to `cliente`, THE internal frontend SHALL NOT present internal navigation or internal travel operations.
4. WHEN a session is internal, THE frontend SHALL keep the BFF as the authority for role and scope authorization.
5. IF the current contract does not provide enough information to decide a capability, THE UI SHALL not invent a permission and the affected capability SHALL remain a documented gap or pending decision.

### Requirement 2: La navegación refleja capacidades confirmadas

**User Story:** Como usuario interno, quiero ver solamente las áreas que corresponden a mi rol, para no entrar a funciones que no puedo ejecutar.

#### Acceptance Criteria

1. THE navigation SHALL represent explicit allowed roles/capabilities instead of relying only on a list of roles to hide.
2. `jefe_operativo` SHALL see the travel/operation areas that are supported by the available contract and SHALL NOT be presented as a monitorista.
3. `monitorista`, `supervisor` and `coordinador` SHALL see monitoring-related travel areas, with records and actions still restricted by the BFF scope.
4. `ejecutivo` SHALL NOT see general travel, roster or monitoring navigation.
5. `reaccion` SHALL NOT see general travel, roster, monitoring, catalog or report navigation unless a confirmed emergency workflow explicitly requires a contextual view.
6. `administrador` SHALL have global administrative navigation only where the corresponding UI and BFF operation exist.
7. Navigation visibility SHALL NOT be treated as the security boundary; direct URL access SHALL receive an explicit route-level denial or a safe forbidden state.
8. A stub or area without a published BFF capability SHALL NOT be presented as an operational feature without an explicit unavailable state or Product decision.

### Requirement 3: Las rutas internas respetan audiencia y rol

**User Story:** Como organización, quiero que una URL directa no permita entrar a una capacidad ajena al rol del usuario, para que ocultar un menú no sea la única protección de experiencia.

#### Acceptance Criteria

1. THE internal route guard SHALL reject unauthenticated sessions through the existing session flow.
2. THE internal route guard SHALL reject `cliente` sessions from internal-only routes.
3. WHEN a role is not allowed to enter an internal route according to a confirmed capability rule, THE UI SHALL render a forbidden state or redirect to an allowed destination without logging out a valid session.
4. Route guards SHALL not claim to validate unit or client scope locally; resource scope SHALL remain enforced by the BFF.
5. A direct URL test SHALL cover each restricted role/area rule implemented by this spec.

### Requirement 4: Las acciones del viaje respetan el rol sin reemplazar la máquina de estados

**User Story:** Como usuario operativo, quiero ver únicamente las acciones de viaje que mi rol puede ejecutar y que el estado actual permite, para evitar intentos inválidos en la interfaz.

#### Acceptance Criteria

1. THE UI SHALL continue deriving state transitions from the generated travel state machine.
2. THE UI SHALL combine a state-derived action with a confirmed role capability before presenting the action.
3. `Asignar escolta` SHALL be visible only to `jefe_operativo` and `administrador`, and only when the generated state machine exposes the `APROBADO → ASIGNADO` action.
4. `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion` and `cliente` SHALL NOT see the general assignment action.
5. The UI SHALL not add a local transition table to decide actions that the generated machine already owns.
6. Approval, rejection and closure SHALL not receive a new Supervisor/Coordinador permission in this work until the pending Product decision about those faculties is resolved and registered.
7. The UI SHALL not use absence of a button as the only authorization mechanism; the BFF SHALL remain authoritative for direct requests and resource scope.

### Requirement 5: `401` y `403` se comportan de forma diferente

**User Story:** Como usuario autenticado, quiero conservar mi sesión cuando carezco de permisos, para distinguir una prohibición de una sesión vencida.

#### Acceptance Criteria

1. A `401` SHALL delegate to the existing session recovery/logout flow.
2. A `403` SHALL preserve the valid session and render an access-denied or forbidden state appropriate to the current screen.
3. The API error taxonomy SHALL not classify `403` as an expired/invalid session.
4. A forbidden action SHALL not silently retry or log the user out.
5. Tests SHALL cover `401` and `403` separately for the travel list and travel detail.

### Requirement 6: Los mocks representan roles y autorización

**User Story:** Como equipo de producto, quiero probar la UI con sesiones de distintos roles, para que los mocks no presenten capacidades que el producto niega.

#### Acceptance Criteria

1. MSW SHALL provide role fixtures for the eight V1 roles or a clearly documented subset used by the current UI.
2. The E8-T10 assignment fixture SHALL use `jefe_operativo` for the successful assignment path.
3. A `monitorista` assignment attempt SHALL return `403` in the mock.
4. `jefe_operativo` and `administrador` SHALL be the only roles allowed by the mock for the assignment capability unless a future decision changes the rule.
5. Mocks SHALL return scope-shaped data from the BFF boundary rather than asking the UI to calculate scope.
6. Tests SHALL not use a `monitorista` fixture as evidence that assignment authorization works.

### Requirement 7: Las pruebas cubren comportamiento visible y autorización

**User Story:** Como Product Management, quiero pruebas por rol y acceso directo, para detectar regresiones de visibilidad y autorización en las capacidades existentes.

#### Acceptance Criteria

1. Tests SHALL cover navigation visibility for each role rule implemented by this spec.
2. Tests SHALL cover direct URL access for restricted routes.
3. Tests SHALL cover assignment visibility and rejection for `jefe_operativo`, `administrador` and `monitorista`.
4. Tests SHALL cover `403` without logout and `401` with session delegation.
5. Tests SHALL preserve existing behavior for generated state-machine actions, ETA, date/time and assignment happy path.
6. Tests SHALL assert user-visible behavior and API boundary behavior, not internal implementation details.

### Requirement 8: Las brechas contractuales permanecen explícitas

**User Story:** Como equipo de frontend, quiero identificar qué capacidades todavía no publica el BFF, para no presentar mocks como integración real.

#### Acceptance Criteria

1. THE implementation SHALL verify the currently published tracer before changing contract-dependent behavior.
2. The frontend SHALL call only BFF wrappers, never `operacion`, `mensajeria`, `identidad`, `catalogos` or `reportes` directly.
3. Missing BFF operations SHALL be recorded as contractual gaps, not recreated as an untracked parallel authority.
4. A UI capability without a published BFF operation SHALL remain a stub, unavailable state or explicitly mocked development path, according to Product Management approval.
5. Replacing an expected mock wrapper with a published BFF contract SHALL be isolated to the contract/API seam.

## Ambiguities and decisions required

These points are not resolved by this spec and SHALL NOT be decided in implementation:

1. Si `supervisor` y `coordinador` pueden aprobar/rechazar solicitudes además de `jefe_operativo`.
2. Si `supervisor` y `coordinador` pueden cerrar viajes además de `jefe_operativo`.
3. El alcance exacto del override conversacional de `supervisor` y `coordinador` frente a la dimensión de `cliente`.
4. La mecánica de vínculo Monitorista↔`unidad` cuando la UI necesite representarla.
5. Qué pantallas stub se deben mostrar como “no disponible” frente a ocultarlas hasta que exista contrato BFF.
6. El tracer vigente que debe consumir el frontend: el paquete instalado, el checkout local y el último tracer publicado deben reconciliarse antes de modificar contratos.

## Out of scope

- Implementar o modificar el BFF, `operacion`, `mensajeria`, `identidad`, `catalogos` o `reportes`.
- Crear endpoints, eventos, códigos de error o permisos no publicados o no decididos.
- Calcular en el frontend el alcance por `unidad`, la jerarquía de Supervisor/Coordinador o la asignación por `cliente`.
- Resolver las decisiones pendientes sobre aprobación, rechazo, cierre y override conversacional.
- Implementar dashboards, conversaciones, emergencias, gobierno, catálogos o reportes que no tengan contrato BFF publicado.
- Reasignación de escolta.
- Cambiar la máquina de estados del viaje.
- Reemplazar la autorización del BFF por una autorización únicamente visual.
