# Requirements Document: Alineación de la UI interna con roles y capacidades (v2)

## Estado

Reescritura del spec de la rama `feature/alineacion-ui-roles-capacidades` (commit `09ae619`), actualizada a **DEC-149** y al contrato **`v0.1.0-tracer.41`**. Reemplaza a aquel spec; retira PM-001, PM-002, PM-003, PM-006 y PM-007.

**Fuentes y su estado (verificadas al 2026-11-17):**

- Contexto: `repos/ai27-platform-context`, commit `df42d43`, al día con `origin/main`. Árbol con cambios locales ajenos (`scripts/`); no se hizo pull.
- Decisiones: respuesta del Lead del 2026-11-12 y nota "mis clientes" (`.scratch/brief-roles-panel/`), que citan **DEC-149**. **DEC-149 aún no está en `decision-log.md`** ("decidida, pendiente de registro como DEC"). Ver `BRECHAS.md` B-01.
- Contrato: `v0.1.0-tracer.41` publicado. `package.json` fija **`tracer.40`**; el checkout local de `pf-pkg-contracts` está en `feat/ficha-tecnica-e-historico-tracer21`, no en un tag. Se lee siempre `git show v0.1.0-tracer.41:contracts/openapi/bff.yaml`.
- HU: `docs/hu/v2/E4-HU-018` y `E1-HU-031` (actualizadas a "mis clientes").

## Introduction

Hoy el panel interno aplica el rol de forma dispersa: cada feature tiene su propia lista (`ROLES_ROSTER`, `ROLES_CON_MONITOREO`, `puedeCerrar`, `ROLES_CON_CARRIL`, `rol === 'monitorista'`, `rol === 'jefe_operativo'`). Las acciones de aprobar, rechazar, asignar escolta, ETA, avance y fecha no revisan rol. La ficha técnica solo deja pasar a `monitorista` y crear viaje solo a `jefe_operativo`, con lo que el `administrador` queda fuera aunque hereda todo (DEC-022, DEC-148 #20).

El objetivo es que **ningún rol vea ni dispare en la UI algo que la tabla rol × acción de DEC-149 #8 no le da**, y que la UI represente correctamente lo que el BFF responde (`403` por acción sin facultad, `404` por viaje fuera de alcance).

La UI no es la frontera de seguridad. El alcance por cliente y la autorización los aplican `operacion`, `reportes` y `mensajeria`, y el BFF reenvía el código (tracer.41). El frontend solo oculta lo que el rol no puede hacer y muestra bien las negativas.

## Glosario

- **Capacidad:** acción o área de la UI con un conjunto de roles permitidos (columna "Acción" de la tabla).
- **Monitoreo (roles):** `monitorista`, `supervisor`, `coordinador`. Supervisor y Coordinador heredan las facultades del Monitorista (E4-HU-018 v2); ver Pendiente P-1.
- **"Mis clientes":** lista de clientes (organizaciones) asignada a un Monitorista. Define su alcance (DEC-149 #18).
- **Fuera de alcance:** viaje que el rol no ve por su alcance. No aparece en la lista y toda operación sobre él responde `404`.

## Tabla rol × acción (fuente: DEC-149 #8)

`JO` = `jefe_operativo`, `MON` = `monitorista` (y, por herencia, `supervisor` y `coordinador`), `ADM` = `administrador`. ✔ permitido, ✘ no, 👁 solo lectura.

| Id de capacidad           | Acción                                                                                                                   | JO  | MON            | ADM |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --- | -------------- | --- |
| `viajes.listar`           | Ver lista de viajes (JO y ADM todos; MON los de sus clientes desde `APROBADO`)                                           | ✔   | ✔              | ✔   |
| `viaje.crear`             | Crear viaje                                                                                                              | ✔   | ✘              | ✔   |
| `viaje.decidirSolicitud`  | Aprobar, rechazar, fijar fecha antes de aprobar                                                                          | ✔   | ✘              | ✔   |
| `viaje.asignarEscolta`    | `APROBADO → ASIGNADO`, incluido el préstamo                                                                              | ✔   | ✘              | ✔   |
| `viaje.marcarApto`        | `ASIGNADO → APTO_PARA_SALIDA`                                                                                            | ✔   | ✔              | ✔   |
| `viaje.avanzar`           | `→ EN_EMBARQUE`, `→ EN_TRANSITO`, `→ EN_DESTINO`, `→ EN_DESCARGA`, regreso a tránsito, y avance directo desde `ASIGNADO` | ✘   | ✔              | ✔   |
| `viaje.cerrar`            | `→ CERRADO`, incluido cierre anticipado                                                                                  | ✔   | ✘              | ✔   |
| `viaje.ficha.ver`         | Ver ficha técnica y bitácora                                                                                             | 👁   | ✔              | ✔   |
| `viaje.ficha.editar`      | Capturar y editar ficha y bitácora                                                                                       | ✘   | ✔              | ✔   |
| `viaje.seguimiento`       | ETA, estadías y notas                                                                                                    | ✘   | ✔              | ✔   |
| `viaje.incidencia.abrir`  | Abrir incidencias                                                                                                        | ✘   | ✔              | ✔   |
| `emergencia.operar`       | Activar, notas, `Resuelta → Cerrada` (emergencia interna)                                                                | ✘   | ✔              | ✔   |
| `monitoreo.consultar`     | Dashboard de monitoreo, evidencia y expediente                                                                           | ✘   | ✔ (su alcance) | ✔   |
| `jefeOperativo.panel`     | Panel del Jefe Operativo                                                                                                 | ✔   | ✘              | ✔   |
| `roster.armar`            | `/roster`: unidades, cliente de la unidad, "mis clientes"                                                                | ✔   | ✘              | ✔   |
| `administracion.usuarios` | Administración de usuarios                                                                                               | ✘   | ✘              | ✔   |

`ejecutivo` y `reaccion` no tienen capacidad sobre viajes: reciben `403` en lista y detalle (tracer.41). `ejecutivo` conserva conversaciones y `reaccion` su bandeja de emergencias y el caso alertado. `cliente` no pertenece a este panel.

**Estados visibles para MON:** desde `APROBADO` en adelante, incluidos `CERRADO`, `CANCELADO` y `RECHAZADO_POR_CLIENTE` de sus clientes. No ve `SOLICITADO` ni `RECHAZADO_POR_AI27`. JO y ADM ven todos.

## Requirements

### Requirement 1: Una sola política de capacidades

**User Story:** Como equipo de frontend, quiero una única tabla de capacidades por rol, para que ninguna pantalla decida el rol por su cuenta.

#### Acceptance Criteria

1. THE frontend SHALL define las capacidades de la tabla en un módulo puro único, con el rol como única entrada.
2. THE navegación, las guardas de ruta y las acciones de pantalla SHALL consultar ese módulo; no SHALL comparar `usuario.rol` con literales.
3. THE política SHALL tratar a `administrador` como incluido en toda capacidad de la tabla (DEC-148 #20), y a `supervisor` y `coordinador` como `monitorista` en las capacidades de monitoreo (P-1).
4. THE política SHALL NOT calcular alcance por cliente ni por unidad; solo decide por rol.
5. IF un rol no está en la tabla para una capacidad, THEN la política SHALL negarla.

### Requirement 2: La navegación muestra solo lo permitido

**User Story:** Como usuario interno, quiero ver solo las áreas de mi rol.

#### Acceptance Criteria

1. THE navegación SHALL usar un único modelo "visible solo para estos roles" (C8); SHALL retirar `ocultarPara`.
2. `jefe_operativo` SHALL ver Panel, Viajes y Roster; SHALL NOT ver Dashboard de monitoreo.
3. `monitorista`, `supervisor` y `coordinador` SHALL ver Dashboard y Viajes; SHALL NOT ver Roster, Panel del Jefe Operativo ni Administración.
4. `administrador` SHALL ver todas las áreas que tengan pantalla y operación publicada.
5. `ejecutivo` SHALL ver solo Conversaciones; `reaccion` SHALL ver solo Emergencias.
6. THE entradas Catálogos y Reportes SHALL conservar sus reglas vigentes (DEC-022 #9) hasta que la tabla las incluya; ver Pendiente P-3.
7. THE página de inicio por rol SHALL conservarse (DEC-060); `administrador` SHALL aterrizar en una página que su rol puede usar.

### Requirement 3: El acceso directo por URL respeta la capacidad

**User Story:** Como organización, quiero que escribir una URL no abra una pantalla ajena al rol.

#### Acceptance Criteria

1. WHEN un rol sin la capacidad abre `/roster`, `/administracion`, `/jefe-operativo/panel`, `/monitoreo/dashboard`, `/viajes/crear` o `/viajes/{id}/{ficha|expediente}`, THE UI SHALL mostrar un estado "sin permiso" que conserve la sesión y el menú.
2. THE estado "sin permiso" SHALL NOT cerrar sesión ni reintentar.
3. WHEN `ejecutivo` o `reaccion` abren `/viajes` o `/viajes/{id}`, THE UI SHALL mostrar el mismo estado, sin esperar a la respuesta `403`.
4. THE guarda SHALL NOT afirmar que valida alcance; solo rol.

### Requirement 4: Las acciones del detalle de viaje respetan rol y máquina de estados

**User Story:** Como usuario operativo, quiero ver solo las acciones que mi rol puede hacer y el estado permite.

#### Acceptance Criteria

1. THE UI SHALL seguir derivando las transiciones de la máquina de estados generada, sin tabla local de aristas.
2. THE UI SHALL mostrar una transición solo si el estado la permite **y** el rol tiene la capacidad que le corresponde (tabla: `asignarEscolta`, `decidirSolicitud`, `marcarApto`, `avanzar`, `cerrar`).
3. THE mapeo de arista a capacidad SHALL vivir en un solo lugar y cubrir todos los estados destino que la UI ofrece; una arista sin capacidad SHALL NOT ofrecerse.
4. `jefe_operativo` SHALL NOT ver acciones de avance, ETA, estadías, notas, incidencias ni emergencia.
5. `monitorista`, `supervisor` y `coordinador` SHALL NOT ver crear viaje, aprobar, rechazar, fijar fecha previa a aprobación, asignar escolta ni cerrar.
6. THE avance directo desde `ASIGNADO` SHALL tratarse como `viaje.avanzar`.
7. THE ficha técnica y la bitácora SHALL ser editables solo con `viaje.ficha.editar`; `jefe_operativo` SHALL verlas en solo lectura (sin botones de guardar ni campos editables).
8. THE pestañas del viaje SHALL salir de la política: "Ficha técnica" para quien tenga `viaje.ficha.ver`; "Expediente y evidencia" para `monitoreo.consultar`.
9. `administrador` SHALL poder crear viaje y abrir y editar la ficha (C4).
10. THE corrección de incidencias (hoy solo `supervisor` y `coordinador`) SHALL incluir a `administrador`; ver Pendiente P-2 para el resto.

### Requirement 5: `403` y `404` significan cosas distintas

**User Story:** Como usuario, quiero saber si me falta permiso o si el viaje no existe para mí.

#### Acceptance Criteria

1. WHEN `listarViajes` o `obtenerViaje` responden `404`, THE UI SHALL mostrar "viaje no encontrado" sin sugerir un permiso faltante.
2. WHEN responden `403`, THE UI SHALL mostrar "sin permiso" (rol), conservar la sesión y no reintentar.
3. WHEN una acción responde `403`, THE UI SHALL avisar la falta de permiso con `Toast` y dejar el detalle intacto.
4. WHEN una operación responde `404` tras entrar a un viaje que el usuario veía, THE UI SHALL tratarlo como "ya no disponible" (p. ej. cambio de alcance) y regresar a la lista.
5. THE `401` SHALL seguir delegando en la recuperación de sesión existente.
6. THE copy actual de 403 en detalle ("el rol o el alcance no llega a este viaje") SHALL corregirse: el alcance ya no produce `403`.

### Requirement 6: La lista de viajes refleja el alcance del BFF

**User Story:** Como Monitorista, quiero ver los viajes de mis clientes y saber a qué cliente y escolta pertenecen.

#### Acceptance Criteria

1. THE lista SHALL mostrar `cliente` y `unidades` de `ViajeResumen` (solo interno) cuando vengan; SHALL mostrar el `id` si falta `nombre` o `economico`.
2. WHEN `unidades` viene vacío o ausente, THE lista SHALL mostrarlo como "sin escolta".
3. THE filtro de estado de MON, supervisor y coordinador SHALL ofrecer los estados desde `APROBADO` (sin `SOLICITADO` ni `RECHAZADO_POR_AI27`); el de JO y ADM, todos.
4. THE frontend SHALL NOT filtrar viajes por cliente ni por unidad en el navegador.
5. IF la lista llega vacía para MON, THEN THE UI SHALL mostrar un `EmptyState` que distinga "sin clientes asignados" de "sin viajes", usando `GET /sujetos/{id}/alcance` solo si el contrato lo permite al propio sujeto; si no, mensaje genérico (ver B-04).
6. THE Monitorista SHALL NOT tener vista de unidades; las ve solo dentro de sus viajes.

### Requirement 7: `/roster` pasa de "mis unidades" a "mis clientes"

**User Story:** Como Jefe Operativo o Administrador, quiero asignar clientes a cada Monitorista.

#### Acceptance Criteria

1. THE tarjeta "mis unidades" SHALL reemplazarse por "mis clientes" con `fijarClientesSujeto` (`PUT /api/v1/sujetos/{id}/alcance/clientes`, cuerpo `{ clientes_ids }`, `204`).
2. THE UI SHALL leer `clientes_ids` y `clientes_efectivos_ids` de `AlcanceSujeto`.
3. THE selector SHALL ofrecer solo clientes activos; un cliente puede estar en varios Monitoristas.
4. WHEN el BFF responde `400` por cliente inexistente o desactivado, THE UI SHALL indicarlo y refrescar la lista de clientes activos.
5. WHEN responde `409 rol_sin_alcance`, THE UI SHALL indicar que el usuario ya no es Monitorista.
6. THE alta y edición de unidad SHALL incluir "cliente al que sirve" (opcional, `cliente_id`); quitarlo envía `cliente_id: null` en la edición.
7. THE UI SHALL dejar de usar `fijarUnidadesSujeto`, `unidades_ids` y `unidades_efectivas_ids` (deprecados).
8. THE mismo cambio SHALL aplicarse al editor de alcance de Administración (E8-T19) si usa unidades.
9. THE texto de la UI SHALL aclarar que el cliente de la unidad no define el alcance.

### Requirement 8: Los mocks representan rol y alcance

**User Story:** Como equipo de producto, quiero probar cada rol contra el mock con las mismas negativas que dará el BFF.

#### Acceptance Criteria

1. MSW SHALL tener sesión para los ocho roles (ya existen cuentas demo; verificar cobertura).
2. EACH operación mock con capacidad en la tabla SHALL responder `403` a roles sin ella.
3. THE mock `listarViajes` SHALL filtrar por "mis clientes" del Monitorista (fixtures), desde `APROBADO`, y responder `403` a `ejecutivo` y `reaccion`.
4. THE mock de detalle SHALL responder `404` a un viaje fuera de alcance.
5. THE mock SHALL emitir `cliente` y `unidades` en `ViajeResumen`.
6. THE mock SHALL implementar `fijarClientesSujeto` con `400` y `409`.
7. THE pruebas de una capacidad SHALL usar un rol que la tenga para el camino feliz y uno que no la tenga para la negativa; nunca un rol sin la capacidad como evidencia de éxito.

### Requirement 9: Las pruebas cubren la tabla completa

#### Acceptance Criteria

1. THE suite SHALL incluir una prueba de tabla: para cada capacidad × cada uno de los ocho roles, el resultado esperado de la política.
2. THE suite SHALL cubrir menú y acceso directo por rol.
3. THE suite SHALL cubrir acciones del detalle por rol y por estado.
4. THE suite SHALL cubrir `403` y `404` por separado en lista, detalle y una mutación.
5. THE suite SHALL cubrir la tarjeta "mis clientes" y el campo cliente de la unidad.
6. THE pruebas SHALL afirmar comportamiento visible y de frontera API, no detalles internos.

## Escenarios

| #   | Tipo     | Escenario                                                 | Resultado                                                                         |
| --- | -------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| E1  | Positivo | JO abre un viaje `APROBADO`                               | Ve "Asignar escolta"; no ve avance ni ETA                                         |
| E2  | Negativo | MON abre un viaje `APROBADO`                              | No ve "Asignar escolta" ni aprobar/rechazar                                       |
| E3  | Positivo | ADM abre `/viajes/crear` y la ficha                       | Entra y edita                                                                     |
| E4  | Positivo | JO abre la ficha                                          | La ve sin controles de edición                                                    |
| E5  | Borde    | MON abre por URL un viaje de otro cliente                 | `404`: "viaje no encontrado"                                                      |
| E6  | Borde    | Viaje `ASIGNADO`: MON usa avance directo                  | Permitido (`viaje.avanzar`)                                                       |
| E7  | Negativo | `ejecutivo` abre `/viajes`                                | "Sin permiso", sesión intacta                                                     |
| E8  | Borde    | `403` al enviar una transición                            | `Toast` de sin permiso; detalle intacto                                           |
| E9  | Positivo | JO asigna dos clientes a un MON y uno ya está en otro MON | `204`; ambos MON lo conservan                                                     |
| E10 | Negativo | Cliente desactivado en el selector                        | No se ofrece; si llega un `400`, se refresca la lista                             |
| E11 | Borde    | Unidad prestada a un viaje de otro cliente                | El viaje lo ven los MON del cliente del viaje; la unidad se muestra en su escolta |

## Dependencias

- Subir el pin a `@ai27-tech/contracts@0.1.0-tracer.41` (tarea 0.2; requiere confirmación). Las partes de roster, `ViajeResumen` y `404` lo necesitan.
- Para el extremo a extremo del alcance: backend de `identidad`, `operacion` y `bff` aplicando DT-07 (Lead, `tracer.41`). Hasta entonces, el alcance se prueba solo contra mocks.

## Fuera de alcance

- Backend, contrato y DT-07 (Lead).
- Cotización, rol `cotizacion` y solicitudes pagadas (V2, DEC-148). No construir nada de eso.
- Calcular alcance, jerarquía o préstamo en el navegador.
- Reasignación de escolta; cambios a la máquina de estados.
- Retiro de `fijarUnidadesSujeto` del contrato (ola posterior).

## Pendientes que no bloquean (de la respuesta del Lead)

- Si el cliente de la unidad es obligatorio. Hoy es opcional.
- Si el préstamo pide motivo y se marca en el viaje. No se muestra marca de préstamo.
- Si al cambiar el cliente de una unidad los viajes en curso cambian de alcance de inmediato.

## Preguntas abiertas para Product / Lead

- **P-1.** La tabla de DEC-149 solo nombra `jefe_operativo`, `monitorista` y `administrador`. Este spec supone que `supervisor` y `coordinador` tienen las facultades del Monitorista y **no** aprueban, asignan ni cierran (E4-HU-018 v2 y el estado actual de la UI). ¿Se confirma?
- **P-2.** E4-HU-018 menciona intervención de Supervisor/Coordinador (override, corrección de incidencias) que la tabla no cubre. Este spec solo conserva la corrección de incidencias que ya existe. ¿Alguna otra acción exclusiva de ellos debe verse?
- **P-3.** Catálogos y Reportes no están en la tabla. ¿Quién los ve? Hoy: Catálogos todos menos `reaccion`; Reportes todos menos `reaccion`, `jefe_operativo` y `ejecutivo`.
- **P-4.** `ejecutivo` y `reaccion` no tienen entrada en la tabla de viajes. Se asume solo lo que ya tienen (conversaciones; emergencias).

## Trazabilidad

DEC-149 #2 a #8 y #18 a #21; DEC-148 #20 y #21; DEC-045; DEC-060; DEC-022; DEC-140; DEC-142; E4-HU-018 v2; E1-HU-031 v2; tracer.41 (`bff.yaml`: `listarViajes`, `obtenerViaje`, `fijarClientesSujeto`, `ViajeResumen`, `UnidadViajeResumen`, `AlcanceSujeto`, `ClientesSujetoEntrada`).
