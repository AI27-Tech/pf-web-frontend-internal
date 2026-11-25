# Requirements Document: Afinación de acciones y vistas por rol, módulo a módulo (v3)

## Estado

Reemplaza a `alineacion-ui-roles-capacidades` (v2, a `tracer.41`). Conserva su idea central (una sola política de capacidades; la UI no calcula alcance) y la lleva a una matriz **módulo por módulo, acción por acción**, con los nueve roles y el contrato `tracer.46`. El spec v2 no se borra: sus tareas 1 a 4 quedan absorbidas aquí.

**Fuentes y su estado:**

| Fuente                                   | Lo que se leyó                                                                                                                                                  | Estado                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contexto `repos/ai27-platform-context`   | `origin/main` `5629dac` (`argos-context/decision-log.md`, DEC-148 #1 a #79, DEC-152, DEC-149 #1 a #24; `DEUDA-TECNICA.md` DT-24; `.scratch/brief-roles-panel/`) | El checkout local está en `df42d43`, 40 commits atrás y con cambios locales ajenos en `scripts/`. **No se hizo pull**; se leyó con `git show origin/main:...`.                                                                                                                                      |
| Contrato `repos/pf-pkg-contracts`        | Tag `v0.1.0-tracer.47` (`bff.yaml`, `operacion.yaml`, `estados/viaje.estados.yaml`, `CHANGELOG.md`)                                                             | Último tag publicado (`.47` solo cambia descripciones; la ola `tracer.48`, roles por operación de DEC-152, está en espera hasta que el backend coincida). El checkout local está en la rama `feat/ficha-tecnica-e-historico-tracer21` (`d2a3de2`, tag `tracer.37`): no representa lo que se libera. |
| Pin del panel                            | `@ai27-tech/contracts@0.1.0-tracer.46` (`package.json`)                                                                                                         | Un tracer atrás de `.47`. **Decidido por el Lead: subir a `.47`**, mismo salto que DT-24 (tarea 0.3, reabierta).                                                                                                                                                                                    |
| Decisiones del Lead sobre el brief       | Respuesta a `BRIEF-LEAD.md` (11 puntos)                                                                                                                         | Vigentes; ver "Decisiones del Lead". Los puntos de backend son tareas del Lead y **el panel sigue la tabla de este documento sin esperar el `403`**.                                                                                                                                                |
| Notas del Lead (2026-11-18 y 2026-11-19) | `RESPUESTA-SEGUIMIENTO-2026-11-17.md`, `NOTA-ANGEL-2026-11-19.md` y las tres notas pegadas en la sesión                                                         | Vigente lo de `NOTA-ANGEL-2026-11-19.md`: gana sobre `NOTA-ANGEL-MIS-CLIENTES.md` y sobre P-5.                                                                                                                                                                                                      |

## Qué cambió desde el spec v2

| #   | Cambio                                                                                                                                                                                                                                                                                                                                              | Efecto en el panel                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Nueve roles.** `tracer.45` agrega `cotizacion` (DEC-148 #1).                                                                                                                                                                                                                                                                                      | El modelo actual de navegación `ocultarPara` **mostraría por omisión** Viajes, Conversaciones, Emergencias, Catálogos y Reportes a un usuario `cotizacion`. Hace falta lista blanca. |
| 2   | **La solicitud sale del viaje (`tracer.45`, incompatible).** `EstadoViaje` pierde `SOLICITADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE`; `CANCELADO` pasa a `CANCELADO_POR_CLIENTE`. Aprobar y rechazar son ahora `aprobarSolicitud` y `rechazarSolicitud`.                                                                                  | La acción "aprobar/rechazar" del detalle (E8-T9) deja de existir en el viaje. El filtro "desde `APROBADO`" del Monitorista es automático. Ver módulo M14.                            |
| 3   | **`obtenerMiAlcance`** (`GET /api/v1/sesion/alcance`, `tracer.43`, DEC-149 #24). Lo leen `monitorista`, `supervisor` y `coordinador`; otro rol recibe `403`.                                                                                                                                                                                        | Resuelve B-04 del v2. **Reemplaza** la lectura de `obtenerAlcanceSujeto` por el propio Monitorista (P-5).                                                                            |
| 4   | **`obtenerAsignacion` responde `403` a `ejecutivo` y `reaccion`** (DEC-149 #23).                                                                                                                                                                                                                                                                    | La ruta `/viajes/$id/ficha` debe mostrar "sin permiso" y no pedir la asignación.                                                                                                     |
| 5   | **`fijarClientesSujeto` rechaza clientes desactivados, también los ya asignados** (DEC-149 #21).                                                                                                                                                                                                                                                    | Mostrarlos como desactivados y quitarlos del payload. El selector solo ofrece activos.                                                                                               |
| 6   | **Respuestas del Lead (2026-11-18):** Supervisor y Coordinador heredan del Monitorista (no aprueban, no asignan, no cierran viajes; sí marcan apto y cierran el caso de emergencia); herencia completa de otras facultades con PM-008 abierto; Catálogos y Reportes (después fijados, ver "Decisiones del Lead"); Ejecutivo y Reacción confirmados. | Cierra P-1 a P-4 del v2.                                                                                                                                                             |
| 7   | **El Jefe Operativo no ve nada comercial** de la solicitud (DEC-148 #67 y #73).                                                                                                                                                                                                                                                                     | Los campos `cotizacion` y `pago` pueden faltar en la respuesta; la UI no los pide ni los pinta para ese rol.                                                                         |

## Decisiones del Lead sobre el brief

Respuesta a `BRIEF-LEAD.md`, registrada como **DEC-152** (DECIDIDA). Regla general: el panel sigue esta tabla y **no espera el `403`**; si el backend aún no devuelve la negativa o la acción, la UI la trata con Requirement T2.

| #   | Decisión                                                                                                                                                                                                                                                                                          | Efecto en el panel                                                                | Backend pendiente                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | El backend ya devuelve `403` en `guardarFicha`, `abrirIncidencia`, adjuntos, reportes, `completarFechaHora` y cerrar el viaje. **No** lo devuelve al Jefe Operativo en avanzar (salvo cerrar), `fijarEta`, estadías y escribir bitácora. Los roles por operación se documentan en la próxima ola. | Ocultar esas acciones al JO según DEC-149 #8.                                     | Cerrar los cuatro huecos en `operacion`.                      |
| 2   | Cliente desactivado: el JO ve el id con la marca "desactivado" (DEC-149 #21).                                                                                                                                                                                                                     | No se abre `listarOrganizaciones` ni se agrega campo.                             | Ninguno.                                                      |
| 3   | El Administrador puede leer `listarClientes` al crear viaje.                                                                                                                                                                                                                                      | M3: ADM carga clientes con `listarClientes`.                                      | Corregir la descripción del contrato.                         |
| 4   | `obtenerAsignacion`: `cotizacion` no entra (fue omisión del texto).                                                                                                                                                                                                                               | M5: COT ✘.                                                                        | Contrato dirá "salvo `ejecutivo`, `reaccion` y `cotizacion`". |
| 5   | **El Administrador sí activa emergencia** (DEC-149 #8 y herencia completa).                                                                                                                                                                                                                       | M4 y M9: el botón se muestra a ADM; puede recibir `403`.                          | Corregir `mensajeria` y el contrato (hoy `403`, DEC-045 #9).  |
| 6   | Resolver incidencia: Supervisor, Coordinador **y Administrador**.                                                                                                                                                                                                                                 | M6: ADM ✔.                                                                        | Ninguno (el backend ya lo permite).                           |
| 7   | **El Administrador ve Conversaciones y escribe igual que el Ejecutivo.**                                                                                                                                                                                                                          | M1 y M10: ADM ✔; la bandeja puede responder `404` hasta el cambio.                | Cambio en `mensajeria` y contrato (hoy `404`).                |
| 8   | Histórico del JO: ficha, bitácora, estadías e incidencias en solo lectura.                                                                                                                                                                                                                        | M5 y M6: JO 👁.                                                                    | Ninguno.                                                      |
| 9   | Corregir fecha y hora (`completarFechaHora`): JO y ADM; el Monitorista no.                                                                                                                                                                                                                        | M4: SUP y COO siguen al Monitorista (✘).                                          | Ninguno (ya devuelve `403`).                                  |
| 10  | Catálogos: ADM y COO leen y escriben; JO solo lee; el resto no entra. Reportes sin cambio (MON, SUP, COO, ADM). `cotizacion` no ve Catálogos ni Reportes.                                                                                                                                         | M13 y M1: nuevo conjunto de roles para Catálogos.                                 | Cambio en `catalogos`.                                        |
| 11  | `cotizacion` aterriza en la bandeja de solicitudes.                                                                                                                                                                                                                                               | M0 y M14.                                                                         | Ninguno.                                                      |
| 12  | Seguimiento: el Coordinador escribe todo Catálogos, vehículos y custodios incluidos (enmienda DEC-142 #6). `completarFechaHora` es solo de JO y ADM (SUP y COO no). Subir adjunto: MON, SUP, COO y ADM.                                                                                           | M13 y M11: el COO ve las acciones de escritura de Catálogos; puede recibir `403`. | `catalogos` solo deja escribir a ADM; el Lead lo cambia.      |

## Introduction

Hoy cada módulo del panel decide el rol por su cuenta (`ROLES_ROSTER`, `ROLES_CON_MONITOREO`, `puedeCerrar`, `ROLES_CON_CARRIL`, `rol === 'monitorista'`, y otros). No hay `lib/permisos`. DT-24 registra que el panel no aplica la tabla rol × acción de DEC-149 #8.

El objetivo es que **ningún rol vea ni dispare en la UI algo que su fila de la matriz no le da**, y que la UI muestre bien lo que el BFF responde. La UI no es la frontera de seguridad: alcance y autorización los aplica el backend (`403` por acción sin facultad, `404` por viaje o solicitud fuera de alcance).

El trabajo se hace **por ciclos de módulo** (Requirement 0). Cada ciclo cierra con una matriz confirmada antes de tocar código.

## Glosario

- **Capacidad:** acción o área de la UI con un conjunto de roles permitidos.
- **Monitoreo (roles):** `monitorista`, `supervisor`, `coordinador`. Supervisor y Coordinador heredan las facultades del Monitorista con alcance igual a la unión de los clientes de sus subordinados (DEC-149 #6, #18).
- **"Mis clientes":** lista de clientes que define el alcance de un Monitorista (DEC-149 #18).
- **Fuera de alcance:** viaje o solicitud que el rol no ve. No aparece en la lista y toda operación responde `404`.
- **Solicitud:** entidad previa al viaje, con su propia máquina de estados (ADR 38). El viaje nace en `APROBADO` con el mismo id.
- **Lista blanca:** una capacidad solo existe para los roles que la fuente nombra. Un rol no nombrado la niega.

## Cómo leer las matrices

Roles en columnas: `JO` jefe_operativo, `MON` monitorista, `SUP` supervisor, `COO` coordinador, `ADM` administrador, `EJE` ejecutivo, `REA` reaccion, `COT` cotizacion. `cliente` no pertenece a este panel.

| Símbolo | Significado                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------- |
| ✔       | Permitido                                                                                           |
| ✘       | No permitido (la fuente lo niega o responde `403`/`404`)                                            |
| ✘*      | No permitido **por omisión**: la fuente no nombra al rol. Se niega en la UI y se pregunta (BRECHAS) |
| 👁       | Solo lectura                                                                                        |
| ?       | La fuente no decide. **Bloquea esa fila** hasta tener respuesta                                     |

Columna **Est**: `C` confirmada por fuente; `D` discrepancia entre dos fuentes (se sigue la más específica, el contrato, y se pregunta); `P` pendiente de decisión. Una fila `D` o `P` no se implementa hasta resolverla.

**Regla del administrador.** `administrador` hace todo (DEC-022 #1, DEC-148 #20; decisión del Lead 2026-11-18 de herencia completa) **salvo** las excepciones que una fuente niega de forma explícita y no están en corrección. Hoy son: la bandeja de emergencias, reclamar, devolver, transferir y resolver emergencia (las operan REA, SUP y COO), y `obtenerMiAlcance`. Cada excepción lleva su fuente en la matriz. Activar emergencia y el chat del viaje **ya no son excepciones**: el Lead los corrige en backend y contrato.

Las filas con la marca "backend pendiente" se muestran al rol decidido aunque el servidor todavía responda `403` o `404`.

---

## Requirements

### Requirement 0: Ciclo de trabajo por módulo

**User Story:** Como Angel, quiero afinar un módulo a la vez, acción por acción, para cerrar cada uno con evidencia antes de pasar al siguiente.

#### Acceptance Criteria

1. THE trabajo SHALL avanzar en el orden M0 a M14 de este documento; un módulo no empieza hasta que el anterior esté cerrado o el usuario lo salte de forma explícita.
2. FOR cada módulo, THE ciclo SHALL constar de cinco pasos: (1) línea base del código actual por rol; (2) comparación contra la matriz objetivo de este documento; (3) resolución de las filas `D` y `P` con el usuario; (4) implementación con pruebas y mocks; (5) cierre, con la matriz marcada y las pruebas en verde.
3. THE paso 1 SHALL listar, por cada acción del módulo, qué rol la ve hoy y desde qué archivo; SHALL usar búsqueda dirigida, no lectura de archivos completos.
4. IF una fila de la matriz está en `?`, `D` o `P`, THEN THE implementación SHALL NOT fijar un comportamiento por suposición; SHALL preguntar (regla de oro del discovery).
5. WHEN un módulo cierra, THE `tasks.md` SHALL marcarse y SHALL registrarse en este documento cualquier fila que cambió de estado.
6. THE ciclo SHALL NOT agregar operaciones, campos ni enums que el contrato no ofrezca; SHALL reportarlos como brecha (BRECHAS).

### Requirement T1: Una sola política de capacidades, con nueve roles y lista blanca

**User Story:** Como equipo de frontend, quiero una única tabla de capacidades, para que ninguna pantalla compare roles por su cuenta.

#### Acceptance Criteria

1. THE frontend SHALL definir las capacidades en un módulo puro único (`lib/permisos`), con el rol como única entrada.
2. THE navegación, las guardas de ruta y las acciones SHALL consultar ese módulo; SHALL NOT comparar `usuario.rol` con literales fuera de `lib/permisos`.
3. THE política SHALL ser de lista blanca: un rol que la matriz no nombra para una capacidad la niega, incluido `cotizacion` y cualquier rol futuro.
4. THE política SHALL aplicar la regla del administrador (herencia salvo excepciones) y las excepciones SHALL estar declaradas en un solo lugar con su fuente.
5. THE política SHALL NOT calcular alcance por cliente ni por unidad; solo decide por rol.
6. THE funciones actuales (`puedeArmarRoster`, `puedeUsarMonitoreo`, `puedeCerrar`, `puedeAdministrar`, `puedeCorregirIncidencia`, afordancias de emergencias) SHALL quedar como adaptadores delgados sobre la política y retirarse cuando nadie las importe.

### Requirement T2: `401`, `403` y `404` significan cosas distintas

**User Story:** Como usuario, quiero saber si me falta permiso, si la sesión caducó o si el recurso no existe para mí.

#### Acceptance Criteria

1. WHEN una lectura de pantalla responde `403`, THE UI SHALL mostrar el estado "sin permiso" con el menú y la sesión intactos, sin reintentar.
2. WHEN responde `404`, THE UI SHALL mostrar "no encontrado" sin sugerir un permiso faltante.
3. WHEN una acción responde `403`, THE UI SHALL avisar con `Toast` y dejar la pantalla intacta.
4. WHEN una operación responde `404` tras entrar a un recurso que el usuario veía, THE UI SHALL tratarlo como "ya no disponible" y volver a la lista.
5. THE `401` SHALL seguir delegando en la recuperación de sesión existente.
6. THE copy "el rol o el alcance no llega a este viaje" SHALL corregirse: el alcance responde `404`, no `403`.
7. THE UI SHALL NOT llamar una operación que su contrato niega al rol (p. ej. `obtenerMiAlcance` con JO, ADM, EJE, REA, COT; `obtenerAsignacion` con EJE, REA).

### Requirement T3: Los mocks reproducen la guarda del contrato

**User Story:** Como equipo de producto, quiero probar cada rol contra mocks que respondan lo mismo que el BFF.

#### Acceptance Criteria

1. EACH operación mock SHALL responder `403` a los roles que la matriz niega y `404` fuera de alcance, para las operaciones donde el contrato lo declara.
2. THE mock de `listarViajes` SHALL filtrar por "mis clientes" del Monitorista y emitir `cliente` y `unidades` en cada fila.
3. THE mock SHALL implementar `obtenerMiAlcance` con la forma `{ "clientes_efectivos_ids": [...] }` (solo `monitorista`, `supervisor`, `coordinador`; otro rol `403`).
4. THE mock SHALL implementar `fijarClientesSujeto` con `400` (cliente inexistente o desactivado, también uno ya asignado) y `409 rol_sin_alcance`.
5. THE pruebas SHALL usar un rol que tenga la capacidad para el camino feliz y uno que no la tenga para la negativa; nunca un rol sin la capacidad como evidencia de éxito.
6. THE mock SHALL declarar los ocho roles internos como cuentas demo.

### Requirement T4: Las pruebas cubren la matriz completa

**User Story:** Como equipo, quiero que una arista nueva del contrato no quede abierta a todos los roles sin que nadie lo note.

#### Acceptance Criteria

1. THE suite SHALL incluir una prueba de tabla: cada capacidad × los ocho roles internos contra la matriz de este documento.
2. THE suite SHALL recorrer las transiciones generadas del viaje y fallar si alguna que la UI ofrece no tiene capacidad asignada.
3. THE suite SHALL cubrir menú y acceso directo por rol.
4. THE suite SHALL cubrir `403` y `404` por separado en lista, detalle y una mutación.
5. THE pruebas SHALL afirmar comportamiento visible y de frontera API, no detalles internos.

---

## Módulos

### M0. Sesión y rol

Alimenta a todos los módulos. No tiene vista propia.

#### Requirement 1

**User Story:** Como panel, quiero conocer el rol de la sesión con los nueve valores del contrato.

##### Acceptance Criteria

1. THE tipo `Rol` SHALL salir del paquete generado (`@ai27-tech/contracts/roles`); SHALL NOT redefinirse.
2. THE página de inicio por rol (DEC-060) SHALL conservarse para los ocho roles actuales; `cotizacion` SHALL aterrizar en la bandeja de solicitudes (decisión del Lead 11); `administrador` SHALL aterrizar en una página que su rol puede usar (pendiente P-A).
3. WHEN la sesión trae un rol no reconocido, THE política SHALL negar toda capacidad.
4. THE cierre de sesión por `401` SHALL permanecer; el `403` SHALL NOT cerrar sesión.

### M1. Navegación y acceso directo por URL

#### Matriz: entrada de menú visible

| Entrada (ruta)                                     | JO                | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                                               | Est                                    |
| -------------------------------------------------- | ----------------- | --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------------- | -------------------------------------- |
| Dashboard (`/monitoreo/dashboard`)                 | ✘                 | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘*  | DEC-149 #8                                           | C                                      |
| Viajes (`/viajes`)                                 | ✔                 | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘*  | `listarViajes`; DEC-149 #16                          | C                                      |
| Roster (`/roster`)                                 | ✔                 | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | DEC-149 #8; DEC-142 #3                               | C                                      |
| Panel del Jefe Operativo (`/jefe-operativo/panel`) | ✔                 | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | DEC-149 #8                                           | C                                      |
| Solicitudes (nueva)                                | ✔ (solo `PAGADO`) | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✔   | `listarSolicitudes`; DEC-148 #22                     | C                                      |
| Conversaciones (chat del viaje)                    | ✘                 | ✘   | 👁   | 👁   | ✔   | ✔   | ✘   | ✘   | `listarTrabajoBandeja`; DEC-131; decisión del Lead 7 | C (backend pendiente: hoy `404` a ADM) |
| Conversaciones de solicitud                        | ✘                 | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✔   | `listarTrabajoBandejaSolicitudes`; DEC-148 #12, #31  | C                                      |
| Emergencias (bandeja)                              | ✘                 | ✘   | ✔   | ✔   | ✘   | ✘   | ✔   | ✘   | `listarBandejaEmergencias`; DEC-132                  | C                                      |
| Catálogos                                          | 👁                 | ✘   | ✘   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 10                                 | C (backend pendiente en `catalogos`)   |
| Reportes                                           | ✘                 | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 10                                 | C                                      |
| Administración                                     | ✘                 | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `altaSujeto` y afines: solo ADM                      | C                                      |

Nota: MON y ADM operan emergencias desde el detalle del viaje (M9), no desde la bandeja, que el contrato les niega (`403`).

#### Requirement 2

**User Story:** Como usuario interno, quiero ver solo las áreas de mi rol y no abrir otra escribiendo la URL.

##### Acceptance Criteria

1. THE navegación SHALL usar un único modelo "visible solo para estos roles"; SHALL retirar `ocultarPara`.
2. THE entradas SHALL mostrarse según la matriz anterior; las filas en `P` SHALL conservar el comportamiento actual hasta resolverse.
3. WHEN un rol sin la capacidad abre por URL `/roster`, `/administracion`, `/jefe-operativo/panel`, `/monitoreo/dashboard`, `/viajes/crear`, `/viajes/{id}/{ficha|expediente|historico}`, `/viajes` o `/viajes/{id}` (EJE, REA), THE UI SHALL mostrar "sin permiso" con sesión y menú intactos, sin esperar el `403`.
4. THE guarda SHALL NOT afirmar que valida alcance; solo rol.
5. THE guarda SHALL NOT disparar la petición de datos del recurso cuando el rol ya está negado.

### M2. Bandeja de viajes (`/viajes`)

#### Matriz de acciones

| Acción (operación)                   | JO        | MON       | SUP       | COO       | ADM       | EJE       | REA       | COT       | Fuente                                 | Est |
| ------------------------------------ | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | -------------------------------------- | --- |
| Ver lista (`listarViajes`)           | ✔ todos   | ✔ alcance | ✔ alcance | ✔ alcance | ✔ todos   | ✘ `403`   | ✘ `403`   | ✘*        | `bff.yaml` `listarViajes`; DEC-149 #16 | C   |
| Ver columnas `cliente` y `unidades`  | ✔         | ✔         | ✔         | ✔         | ✔         | n/a       | n/a       | n/a       | DEC-149 #11, #14                       | C   |
| Botón "Crear viaje"                  | ✔         | ✘         | ✘         | ✘         | ✔         | ✘         | ✘         | ✘         | `crearViaje`; DEC-149 #8               | C   |
| Leer mi alcance (`obtenerMiAlcance`) | no llamar | ✔         | ✔         | ✔         | no llamar | no llamar | no llamar | no llamar | DEC-149 #24                            | C   |

#### Requirement 3

**User Story:** Como Monitorista, quiero ver los viajes de mis clientes y saber a qué cliente y escolta pertenecen.

##### Acceptance Criteria

1. THE lista SHALL mostrar `cliente` y `unidades` de `ViajeResumen` (solo interno); SHALL mostrar el `id` si falta `nombre` o `economico`.
2. WHEN `unidades` viene vacío o ausente, THE lista SHALL mostrarlo como "sin escolta".
3. THE filtro de estado SHALL salir del enum generado de `EstadoViaje`; con `tracer.45` o posterior, SHALL NOT existir un estado previo a `APROBADO` ni lógica local por rol.
4. THE frontend SHALL NOT filtrar viajes por cliente ni por unidad en el navegador.
5. IF la lista llega vacía para MON, SUP o COO, THEN THE UI SHALL llamar `obtenerMiAlcance` y mostrar `EmptyState`: "sin clientes asignados" si `clientes_efectivos_ids` viene vacío con `200`, o "sin viajes" si no.
6. IF la lista llega vacía para JO o ADM, THEN THE UI SHALL mostrar "sin viajes" sin llamar `obtenerMiAlcance`.
7. THE Monitorista SHALL NOT tener vista de unidades; las ve solo dentro de sus viajes (DEC-149 #19).
8. THE botón "Crear viaje" SHALL mostrarse solo con la capacidad `viaje.crear` (incluye ADM).

### M3. Crear viaje (`/viajes/crear`)

#### Matriz de acciones

| Acción (operación)                    | JO  | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                                                              | Est                                    |
| ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | ------------------------------------------------------------------- | -------------------------------------- |
| Abrir la pantalla                     | ✔   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `crearViaje`: "Solo Operación (`jefe_operativo` y `administrador`)" | C                                      |
| Elegir cliente (`listarClientes`)     | ✔   | n/a | n/a | n/a | ✔   | n/a | n/a | n/a | Decisión del Lead 3                                                 | C (el contrato corrige su descripción) |
| Asignar la escolta al crear (atómico) | ✔   | n/a | n/a | n/a | ✔   | n/a | n/a | n/a | `crearViaje`; DEC-026                                               | C                                      |

#### Requirement 4

**User Story:** Como Jefe Operativo o Administrador, quiero crear un viaje a nombre de un cliente.

##### Acceptance Criteria

1. THE pantalla SHALL abrirse solo con `viaje.crear`; ADM SHALL poder crear (C4 del brief).
2. THE viaje creado SHALL nacer en `APROBADO` (o `ASIGNADO` si se asigna en el mismo acto); la UI SHALL NOT ofrecer "solicitado".
3. THE ADM SHALL cargar los clientes con `listarClientes`; IF responde `403` mientras la descripción del contrato no se corrija, THEN THE UI SHALL aplicar Requirement T2.
4. IF el servicio responde `403` o `404` al crear, THEN THE UI SHALL aplicar Requirement T2.

### M4. Detalle del viaje: cabecera y acciones (`/viajes/$id`)

#### Matriz de acciones

| Acción (operación o arista)                                                                                         | JO             | MON | SUP | COO | ADM | EJE     | REA     | COT | Fuente                                                                              | Est                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------- | --- | --- | --- | --- | ------- | ------- | --- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Ver detalle (`obtenerViajeInterno`)                                                                                 | ✔              | ✔   | ✔   | ✔   | ✔   | ✘ `403` | ✘ `403` | ✘*  | `bff.yaml`; DEC-149 #16                                                             | C                                              |
| Asignar escolta `APROBADO→ASIGNADO`, con préstamo (`asignarRecursos`)                                               | ✔              | ✘   | ✘   | ✘   | ✔   | ✘       | ✘       | ✘   | DEC-149 #8                                                                          | C                                              |
| Marcar apto `ASIGNADO→APTO_PARA_SALIDA`                                                                             | ✔              | ✔   | ✔   | ✔   | ✔   | ✘       | ✘       | ✘   | DEC-149 #7                                                                          | C                                              |
| Avance: `→EN_EMBARQUE`, `→EN_TRANSITO`, `→EN_DESTINO`, `→EN_DESCARGA`, regreso a tránsito, directo desde `ASIGNADO` | ✘              | ✔   | ✔   | ✔   | ✔   | ✘       | ✘       | ✘   | DEC-149 #8; DEC-060 #2                                                              | C                                              |
| Cerrar `→CERRADO`, normal y anticipado por incidencia                                                               | ✔              | ✘   | ✘   | ✘   | ✔   | ✘       | ✘       | ✘   | DEC-149 #8; RESPUESTA #1                                                            | C                                              |
| Cancelar el viaje                                                                                                   | ✘              | ✘   | ✘   | ✘   | ✘   | ✘       | ✘       | ✘   | Solo el cliente (`transicionarViajeCliente`); arista con `disparador: cliente`      | C                                              |
| Fijar ETA (`fijarEta`)                                                                                              | ✘              | ✔   | ✔   | ✔   | ✔   | ✘       | ✘       | ✘   | DEC-149 #8; decisión del Lead 1                                                     | C (backend pendiente: no devuelve `403` al JO) |
| Corregir fecha y hora del servicio (`completarFechaHora`)                                                           | ✔              | ✘   | ✘   | ✘   | ✔   | ✘       | ✘       | ✘   | Decisión del Lead 9 (SUP y COO siguen al Monitorista); el backend ya devuelve `403` | C                                              |
| Activar emergencia (botón de cabecera)                                                                              | ✘              | ✔   | ✔   | ✔   | ✔   | ✘       | ✘       | ✘   | DEC-149 #8; decisión del Lead 5                                                     | C (backend pendiente: hoy `403` a ADM)         |
| Pestañas: Ficha técnica / Expediente / Histórico                                                                    | ver M5, M6, M7 |     |     |     |     |         |         |     |                                                                                     |                                                |

#### Requirement 5

**User Story:** Como usuario operativo, quiero ver solo las acciones que mi rol puede hacer y que el estado permite.

##### Acceptance Criteria

1. THE UI SHALL seguir derivando las transiciones de la máquina de estados generada, sin tabla local de aristas.
2. THE UI SHALL mostrar una transición solo si el estado la permite **y** el rol tiene la capacidad que le corresponde.
3. THE mapeo de arista a capacidad SHALL vivir en un solo lugar y cubrir todo destino que la UI ofrece; una arista sin capacidad SHALL NOT ofrecerse.
4. THE aristas con `disparador: cliente` SHALL NOT ofrecerse en el panel interno.
5. JO SHALL NOT ver acciones de avance, ETA, estadías, notas, incidencias ni emergencia.
6. MON, SUP y COO SHALL NOT ver crear viaje, asignar escolta ni cerrar.
7. THE avance directo desde `ASIGNADO` SHALL tratarse como `viaje.avanzar`.
8. THE UI SHALL NOT ofrecer aprobar ni rechazar en el detalle del viaje con `tracer.45` o posterior (pasa a M14).
9. THE detalle SHALL aplicar Requirement T2 a `403` y `404`.

### M5. Ficha técnica (`/viajes/$id/ficha`)

#### Matriz de acciones

| Acción (operación)                                         | JO  | MON | SUP | COO | ADM | EJE             | REA             | COT     | Fuente                                                                                | Est                                            |
| ---------------------------------------------------------- | --- | --- | --- | --- | --- | --------------- | --------------- | ------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Abrir la ruta                                              | 👁   | ✔   | ✔   | ✔   | ✔   | ✘ "sin permiso" | ✘ "sin permiso" | ✘*      | DEC-149 #23; DEC-148 #21                                                              | C                                              |
| Leer la escolta (`obtenerAsignacion`)                      | ✔   | ✔   | ✔   | ✔   | ✔   | ✘ `403`         | ✘ `403`         | ✘ `403` | Decisión del Lead 4 (el contrato dirá "salvo `ejecutivo`, `reaccion` y `cotizacion`") | C                                              |
| Leer la ficha (`obtenerFicha`)                             | 👁   | ✔   | ✔   | ✔   | ✔   | ✘               | ✘               | ✘       | DEC-149 #8; DEC-148 #21                                                               | C                                              |
| Capturar y editar (`guardarFicha`)                         | ✘   | ✔   | ✔   | ✔   | ✔   | ✘               | ✘               | ✘       | DEC-149 #8; el backend ya devuelve `403`                                              | C                                              |
| Registrar entrada de bitácora (`registrarEntradaBitacora`) | ✘   | ✔   | ✔   | ✔   | ✔   | ✘               | ✘               | ✘       | DEC-149 #8; decisión del Lead 1                                                       | C (backend pendiente: no devuelve `403` al JO) |

El detalle de emergencia de Reacción no cambia: ve la escolta de su caso por `obtenerEmergencia`.

#### Requirement 6

**User Story:** Como Monitorista o Administrador, quiero capturar la ficha técnica; como Jefe Operativo, quiero verla.

##### Acceptance Criteria

1. WHEN EJE o REA abren `/viajes/$id/ficha`, THE UI SHALL mostrar "sin permiso" sin cerrar sesión y SHALL NOT llamar `obtenerAsignacion` ni `obtenerFicha`.
2. THE ficha y la bitácora SHALL ser editables solo con `viaje.ficha.editar`; JO SHALL verlas en solo lectura, sin botones de guardar ni campos editables.
3. THE pestaña "Ficha técnica" SHALL mostrarse a quien tenga `viaje.ficha.ver`.
4. ADM SHALL poder abrir y editar la ficha (C4).
5. THE UI SHALL tratar `unidades` vacío con `200` como "sin asignación vigente", no como error.

### M6. Histórico: notas, estadías e incidencias (`/viajes/$id/historico`)

#### Matriz de acciones

| Acción (operación)                                       | JO  | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                                                            | Est                                            |
| -------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------------------------- | ---------------------------------------------- |
| Ver bitácora (`listarBitacora`)                          | 👁   | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | DEC-149 #8                                                        | C                                              |
| Ver estadías e incidencias                               | 👁   | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 8                                               | C                                              |
| Abrir y cerrar estadía (`abrirEstadia`, `cerrarEstadia`) | ✘   | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | DEC-149 #8; decisión del Lead 1                                   | C (backend pendiente: no devuelve `403` al JO) |
| Abrir incidencia (`abrirIncidencia`)                     | ✘   | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | DEC-149 #8; el backend ya devuelve `403`                          | C                                              |
| Resolver o corregir incidencia (`resolverIncidencia`)    | ✘   | ✘   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 6 (herencia completa); el backend ya lo permite | C                                              |

#### Requirement 7

**User Story:** Como Monitorista, quiero registrar el recorrido; como Supervisor o Coordinador, quiero corregir incidencias.

##### Acceptance Criteria

1. THE acciones de escritura SHALL mostrarse según la matriz; las filas en `D` o `P` SHALL resolverse antes de cambiar el comportamiento actual.
2. THE corrección de incidencias SHALL mostrarse a SUP, COO y ADM.
3. THE UI SHALL NOT crear botones de override conversacional ni de otras facultades heredadas hasta resolver PM-008.

### M7. Expediente, evidencia y descarga (`/viajes/$id/expediente`)

#### Matriz de acciones

| Acción (operación)                            | JO  | MON       | SUP       | COO       | ADM | EJE | REA | COT | Fuente                                               | Est |
| --------------------------------------------- | --- | --------- | --------- | --------- | --- | --- | --- | --- | ---------------------------------------------------- | --- |
| Ver expediente y adjuntos (`listarAdjuntos`)  | ✘   | ✔ alcance | ✔ alcance | ✔ alcance | ✔   | ✘   | ✘   | ✘*  | DEC-149 #8                                           | C   |
| Descargar expediente (`descargarViaje`)       | ✘   | ✔         | ✔         | ✔         | ✔   | ✘   | ✘   | ✘*  | DEC-149 #8; el servidor audita                       | C   |
| Descargar adjunto (`descargarAdjunto`)        | ✘   | ✔         | ✔         | ✔         | ✔   | ✘   | ✘   | ✘*  | DEC-149 #8                                           | C   |
| Subir adjunto (`crearIntencionSubidaAdjunto`) | ✘   | ✔         | ✔         | ✔         | ✔   | ✘   | ✘   | ✘   | DEC-149 #8 (evidencia); el backend ya devuelve `403` | C   |

#### Requirement 8

**User Story:** Como usuario de monitoreo, quiero consultar y descargar el expediente de mis viajes.

##### Acceptance Criteria

1. THE pestaña "Expediente y evidencia" SHALL mostrarse solo con `monitoreo.consultar`.
2. WHEN `listarAdjuntos` o `descargarViaje` responden `404`, THE UI SHALL tratarlo como "no encontrado" (fuera de alcance), no como falta de permiso.
3. THE UI SHALL seguir refrescando `estado_escaneo` por sondeo de la lista (ADR 27).
4. THE acción "subir adjunto" SHALL mostrarse solo con `monitoreo.consultar`.

### M8. Dashboard de monitoreo (`/monitoreo/dashboard`)

#### Matriz

| Acción        | JO  | MON          | SUP | COO | ADM | EJE | REA | COT | Fuente     | Est |
| ------------- | --- | ------------ | --- | --- | --- | --- | --- | --- | ---------- | --- |
| Ver dashboard | ✘   | ✔ su alcance | ✔   | ✔   | ✔   | ✘   | ✘   | ✘*  | DEC-149 #8 | C   |

#### Requirement 9

##### Acceptance Criteria

1. THE dashboard SHALL abrirse solo con `monitoreo.dashboard`.
2. THE dashboard SHALL NOT filtrar por cliente en el navegador; muestra lo que el BFF devuelve.
3. THE vista SHALL conservar el filtro de viajes en curso vigente (DT-10).

### M9. Emergencias

#### Matriz de acciones

| Acción (operación)                                                   | JO  | MON       | SUP          | COO          | ADM      | EJE | REA                      | COT | Fuente                          | Est                                                                |
| -------------------------------------------------------------------- | --- | --------- | ------------ | ------------ | -------- | --- | ------------------------ | --- | ------------------------------- | ------------------------------------------------------------------ |
| Ver casos del viaje (`listarEmergenciasViaje`)                       | ✘   | ✔         | ✔            | ✔            | ✔        | ✘   | ✘                        | ✘   | `bff.yaml`; DEC-132             | C                                                                  |
| Activar (`activarEmergenciaInterno`)                                 | ✘   | ✔         | ✔            | ✔            | ✔        | ✘   | ✘                        | ✘   | DEC-149 #8; decisión del Lead 5 | C (backend pendiente en `mensajeria`: hoy `403` a ADM, DEC-045 #9) |
| Anotar (`agregarNotaEmergenciaInterno`)                              | ✘   | ✔         | ✔            | ✔            | ✔        | ✘   | ✘                        | ✘   | DEC-135 #3                      | C                                                                  |
| Cerrar `resuelta→cerrada` (`cerrarEmergenciaPorId`)                  | ✘   | ✔ alcance | ✔ alcance    | ✔ alcance    | ✔ global | ✘   | ✘                        | ✘   | ADR 21 §5; RESPUESTA #1         | C                                                                  |
| Ver bandeja (`listarBandejaEmergencias`)                             | ✘   | ✘ `403`   | ✔ todos      | ✔ todos      | ✘ `403`  | ✘   | ✔                        | ✘   | DEC-130, DEC-131, DEC-132       | C                                                                  |
| Ver caso y notas (`obtenerEmergencia`, `listarNotasEmergenciaPorId`) | ✘   | ✘         | ✔            | ✔            | ✘        | ✘   | ✔                        | ✘   | idem                            | C                                                                  |
| Reclamar (`reclamarEmergenciaPorId`)                                 | ✘   | ✘         | ✘            | ✘            | ✘        | ✘   | ✔ (caso sin responsable) | ✘   | DEC-130, DEC-028 #2             | C                                                                  |
| Devolver al pool (`liberarReclamoEmergenciaPorId`)                   | ✘   | ✘         | ✔ cualquiera | ✔ cualquiera | ✘        | ✘   | ✔ solo el responsable    | ✘   | DEC-126, DEC-131                | C                                                                  |
| Transferir (`transferirEmergenciaPorId`)                             | ✘   | ✘         | ✔ cualquiera | ✔ cualquiera | ✘        | ✘   | ✔ solo el responsable    | ✘   | DEC-126, DEC-131                | C                                                                  |
| Resolver con nota (`resolverEmergenciaPorId`)                        | ✘   | ✘         | ✘            | ✘            | ✘        | ✘   | ✔ solo el responsable    | ✘   | ADR 21 §5, DEC-028 #3           | C                                                                  |

#### Requirement 10

**User Story:** Como usuario de monitoreo o de Reacción, quiero ver y operar solo los gestos de mi rol sobre los casos que me tocan.

##### Acceptance Criteria

1. THE afordancias de `features/emergencias` SHALL salir de la política; SHALL conservar la regla de estado del caso y del responsable vigente (no es política de rol).
2. THE entrada "Emergencias" del menú SHALL mostrarse solo a REA, SUP y COO.
3. THE carril de emergencias del detalle del viaje SHALL mostrarse a MON, SUP, COO y ADM, y el botón "activar" a los mismos cuatro; IF el servidor responde `403` a ADM mientras el cambio no llegue, THEN THE UI SHALL avisar con `Toast` según Requirement T2.
4. THE botón "activar" SHALL ocultarse si el viaje está en `CERRADO` o `CANCELADO_POR_CLIENTE`.
5. WHEN `cerrarEmergenciaPorId` responde `404` por viaje fuera de alcance, THE UI SHALL tratarlo como "no encontrado".
6. THE UI SHALL NOT permitir a REA cerrar ni anotar, ni a SUP o COO reclamar o resolver.
7. THE UI SHALL NOT ofrecer "transferir" un caso de emergencia (criterio 5 de Requirement 11).

### M10. Conversaciones

#### Matriz de acciones

| Acción (operación)                                                     | JO  | MON | SUP     | COO     | ADM                   | EJE                   | REA | COT | Fuente                                                                                                             | Est                                    |
| ---------------------------------------------------------------------- | --- | --- | ------- | ------- | --------------------- | --------------------- | --- | --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Ver bandeja y leer mensajes (`listarTrabajoBandeja`, `listarMensajes`) | ✘   | ✘   | 👁       | 👁       | ✔                     | ✔                     | ✘   | ✘   | DEC-127, DEC-131; decisión del Lead 7                                                                              | C (backend pendiente: hoy `404` a ADM) |
| Reclamar (`reclamarConversacion`)                                      | ✘   | ✘   | ✘ `403` | ✘ `403` | ✔                     | ✔                     | ✘   | ✘   | DEC-127, DEC-131; decisión del Lead 7                                                                              | C (backend pendiente)                  |
| Responder (`enviarMensaje`)                                            | ✘   | ✘   | ✘ `403` | ✘ `403` | ✔ con reclamo activo  | ✔ con reclamo activo  | ✘   | ✘   | Addendum §7; decisión del Lead 7                                                                                   | C (backend pendiente)                  |
| Liberar, transferir, marcar atendida                                   | ✘   | ✘   | ✘ `403` | ✘ `403` | ✔ solo el responsable | ✔ solo el responsable | ✘   | ✘   | DEC-117, DEC-118; decisión del Lead 7. El panel no ofrece transferir: sin selector de destino (DEC-148 #76, DT-28) | C (backend pendiente)                  |
| Registrar recibos                                                      | ✘   | ✘   | ✘ `403` | ✘ `403` | ✔                     | ✔                     | ✘   | ✘   | DEC-131; decisión del Lead 7                                                                                       | C (backend pendiente)                  |
| Override auditado y recuperar conversaciones abandonadas               | ✘   | ✘   | ?       | ?       | ?                     | ✘                     | ✘   | ✘   | RESPUESTA #2 (herencia completa; alcance abierto como PM-008)                                                      | P                                      |

La conversación de solicitud tiene su matriz propia en M14.

#### Requirement 11

##### Acceptance Criteria

1. THE bandeja de chat del viaje SHALL mostrarse a EJE y ADM, y a SUP y COO en solo lectura.
2. WHEN SUP o COO abren una conversación, THE UI SHALL NOT mostrar reclamar, responder, liberar, transferir ni marcar atendida.
3. WHEN una acción de mensajería falla por `409 conflicto_version_reclamo`, `409 conversacion_solo_lectura` o `403`, THE UI SHALL NOT pasar `onRetry`; SHALL explicar el motivo con `deliveryError`.
4. THE orden de los mensajes SHALL ser por `secuencia`.
5. THE UI SHALL NOT crear botones de override hasta que PM-008 defina su alcance, ni ofrecer transferir en conversaciones del viaje ni en emergencias: el panel no conoce el `sub` del destino y un id de sujeto responde `409 destino_invalido_en_viaje` (DEC-148 #76 y #77, DT-28). Tampoco SHALL mostrar el nombre del responsable a partir de `reclamo_activo.responsable_id`, que es un `sub`.
6. WHEN `listarTrabajoBandeja` responde `404` a ADM (backend pendiente), THE UI SHALL mostrar un estado "bandeja no disponible" con sesión y menú intactos, sin `Toast` de error.

### M11. Roster (`/roster`)

#### Matriz de acciones

| Acción (operación)                                                                               | JO                 | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                                                                                               | Est                                  |
| ------------------------------------------------------------------------------------------------ | ------------------ | --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Ver unidades (`listarUnidades`, `obtenerUnidad`)                                                 | ✔                  | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | DEC-142 #3                                                                                           | C                                    |
| Crear y editar unidad, activar o desactivar, con `cliente_id` (`crearUnidad`, `modificarUnidad`) | ✔                  | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | DEC-142 #3; DEC-149 #2                                                                               | C                                    |
| Ver vehículos y custodios                                                                        | ✔                  | ✘   | ✘   | ✔   | ✔   | ✘   | ✘   | ✘   | `listarVehiculos`, `listarCustodios`; el COO los ve en Catálogos (respuesta de seguimiento del Lead) | C (backend pendiente en `catalogos`) |
| Crear o modificar vehículo o custodio (desde Catálogos)                                          | ✘                  | ✘   | ✘   | ✔   | ✔   | ✘   | ✘   | ✘   | Respuesta de seguimiento del Lead: el COO escribe todo Catálogos; enmienda DEC-142 #6                | C (backend pendiente en `catalogos`) |
| Listar Monitoristas (`listarSujetos` con `rol=monitorista`)                                      | ✔ solo ese filtro  | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml` `listarSujetos`                                                                           | C                                    |
| Leer alcance de un Monitorista (`obtenerAlcanceSujeto`)                                          | ✔ solo Monitorista | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`                                                                                           | C                                    |
| Fijar "mis clientes" (`fijarClientesSujeto`)                                                     | ✔                  | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | DEC-149 #18                                                                                          | C                                    |
| Fijar subordinados (`fijarSubordinadosSujeto`)                                                   | ✘                  | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`                                                                                           | C                                    |

#### Requirement 12

**User Story:** Como Jefe Operativo o Administrador, quiero asignar clientes a cada Monitorista y armar las unidades.

##### Acceptance Criteria

1. THE tarjeta "mis unidades" SHALL reemplazarse por "mis clientes" con `fijarClientesSujeto` (`PUT /api/v1/sujetos/{id}/alcance/clientes`, cuerpo `{ clientes_ids }`, `204`).
2. THE UI SHALL leer `clientes_ids` y `clientes_efectivos_ids` de `AlcanceSujeto` y SHALL dejar de usar `fijarUnidadesSujeto`, `unidades_ids` y `unidades_efectivas_ids`.
3. THE selector para agregar SHALL ofrecer solo clientes activos; un cliente puede estar en varios Monitoristas.
4. THE lista actual SHALL mostrar a todo cliente asignado que no esté entre los activos como su id con la marca "desactivado" (decisión del Lead 2); THE UI SHALL NOT pedir `listarOrganizaciones` para el JO ni inventar el nombre.
5. WHEN el usuario guarda, THE UI SHALL quitar del payload a los clientes desactivados y SHALL NOT reenviarlos.
6. WHEN el BFF responde `400`, THE UI SHALL indicar que un cliente no existe o está desactivado y refrescar la lista de activos.
7. WHEN responde `409 rol_sin_alcance`, THE UI SHALL indicar que el usuario ya no es Monitorista.
8. THE alta y edición de unidad SHALL incluir "cliente al que sirve" (opcional; quitarlo envía `cliente_id: null`) con un texto que aclare que no define el alcance.
9. THE `modificarUnidad` de una unidad con reserva en un viaje no terminal SHALL explicar el rechazo del servidor sin ofrecer reasignar escolta.
10. THE JO SHALL NOT ver controles de subordinados ni de alta de vehículos o custodios.

### M12. Administración (`/administracion`)

#### Matriz de acciones

| Acción (operación)                                              | JO  | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                 | Est |
| --------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | ---------------------- | --- |
| Ver, buscar y abrir usuario (`listarSujetos`, `obtenerSujeto`)  | ✘   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`             | C   |
| Alta, editar nombre, desactivar, reactivar, revocar sesiones    | ✘   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`             | C   |
| Asignar o cambiar rol (`fijarRolSujeto`), incluido `cotizacion` | ✘   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`; DEC-148 #1 | C   |
| Editar alcance de un usuario: "mis clientes" y subordinados     | ✘   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`             | C   |
| Organizaciones: listar, crear, editar, desactivar               | ✘   | ✘   | ✘   | ✘   | ✔   | ✘   | ✘   | ✘   | `bff.yaml`             | C   |

#### Requirement 13

##### Acceptance Criteria

1. THE módulo SHALL abrirse solo para ADM.
2. THE selector de rol SHALL ofrecer los nueve valores del contrato, con `cotizacion` incluido.
3. THE editor de alcance SHALL aplicar los criterios 3 a 7 de Requirement 12 y SHALL NOT usar unidades.
4. THE editor SHALL mostrar un cliente desactivado con su nombre, porque ADM lee `listarOrganizaciones`.
5. THE UI SHALL respetar las reglas ya fijadas (DEC-139, DEC-141): no cruzar `cliente` con un rol interno, motivo obligatorio al revocar, y no desactivar al último administrador.

### M13. Catálogos y Reportes

#### Matriz de acciones

| Acción                                              | JO  | MON | SUP | COO | ADM | EJE | REA | COT | Fuente                                             | Est                                                |
| --------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | -------------------------------------------------- | -------------------------------------------------- |
| Ver Catálogos                                       | 👁   | ✘   | ✘   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 10                               | C (backend pendiente en `catalogos`)               |
| Escribir Catálogos (valores, vehículos y custodios) | ✘   | ✘   | ✘   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 10 y respuesta de seguimiento    | C (backend pendiente en `catalogos`: hoy solo ADM) |
| Ver Reportes (`reporteViajes`, `reporteEstados`)    | ✘   | ✔   | ✔   | ✔   | ✔   | ✘   | ✘   | ✘   | Decisión del Lead 10; el backend ya devuelve `403` | C                                                  |

#### Requirement 14

##### Acceptance Criteria

1. THE Catálogos SHALL abrirse a JO (solo lectura), COO y ADM (lectura y escritura, vehículos y custodios incluidos); `cotizacion` y los demás roles SHALL NOT verlos.
2. THE UI SHALL ocultar la escritura de Catálogos al JO.
3. THE UI SHALL mostrar `403` por sección como "sin permiso"; hasta que `catalogos` aplique el cambio, el servidor solo deja escribir a ADM: la UI muestra la escritura al COO y puede recibir `403`, que se trata con Requirement T2. Reportes SHALL conservar sus roles (MON, SUP, COO, ADM).

### M14. Solicitudes y Panel del Jefe Operativo (V2, condicionado)

**Condición.** Se implementa en este spec después de subir el pin a `tracer.47` (tarea 0.3). El alcance sale de E10-HU-035 a 038, E1-HU-003 v2 y las operaciones del BFF; no hay tarea E8 de origen y no se espera una.

#### Matriz de acciones

| Acción (operación)                                                  | JO                                | MON | SUP | COO | ADM     | EJE           | REA | COT     | Fuente                          | Est                                                          |
| ------------------------------------------------------------------- | --------------------------------- | --- | --- | --- | ------- | ------------- | --- | ------- | ------------------------------- | ------------------------------------------------------------ |
| Listar (`listarSolicitudes`)                                        | ✔ solo `PAGADO`                   | ✘   | ✘   | ✘   | ✔ todas | ✘             | ✘   | ✔ todas | `bff.yaml`; DEC-148 #22         | C                                                            |
| Ver una solicitud (`obtenerSolicitud`)                              | ✔ `PAGADO`                        | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | idem                            | C                                                            |
| Ver datos comerciales (monto, moneda, notas, versiones, pago)       | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | DEC-148 #67                     | C                                                            |
| Ver histórico (`listarHistoricoSolicitud`)                          | ✔ `PAGADO`, sin datos comerciales | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | DEC-148 #67, #73                | C                                                            |
| Cotizar o recotizar (`cotizarSolicitud`)                            | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | `bff.yaml`                      | C                                                            |
| Reprogramar en `PAGADO` (`reprogramarSolicitud`)                    | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | `bff.yaml`                      | C                                                            |
| Confirmar pago (`confirmarPago`)                                    | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | `bff.yaml`                      | C                                                            |
| Revertir pago (`revertirPago`)                                      | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✘       | DEC-148 #37                     | C                                                            |
| Aprobar (`aprobarSolicitud`)                                        | ✔                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✘       | `bff.yaml`; DEC-148 #4          | C                                                            |
| Rechazar con motivo (`rechazarSolicitud`)                           | ✔                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✘       | `bff.yaml`; DEC-020 #2          | C                                                            |
| Bandeja y conversación de la solicitud                              | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘ `404`/`403` | ✘   | ✔       | DEC-148 #12, #28, #31           | C                                                            |
| Transferir una conversación de solicitud (`transferirConversacion`) | ✘                                 | ✘   | ✘   | ✘   | ✔       | ✘             | ✘   | ✔       | DEC-148 #74; DT-28; `tracer.47` | P (Q-D: COT no puede listar usuarios para elegir el destino) |

#### Requirement 15

**User Story:** Como Jefe Operativo, quiero aprobar o rechazar solo las solicitudes pagadas; como `cotizacion`, quiero cotizar y confirmar el pago.

##### Acceptance Criteria

1. THE bandeja de solicitudes del JO SHALL mostrar solo `PAGADO`; SHALL NOT mostrar ni pedir solicitudes en otro estado.
2. THE vista del JO SHALL NOT pintar ni pedir `cotizacion` ni `pago`; SHALL tratar `null` o ausencia como "oculto", no como "sin cotizar" (DEC-148 #67; la ola `tracer.47` lo documenta).
3. THE aprobación SHALL exigir la fecha y hora del servicio y SHALL tratar `409` por fecha pasada como error de validación visible.
4. WHEN `aprobarSolicitud` o `rechazarSolicitud` terminan, THE UI SHALL tratar el `404` posterior de `obtenerSolicitud` para el JO como resolución normal, no como error (la solicitud sale de su bandeja).
5. WHEN `aprobarSolicitud` termina, THE UI SHALL consultar el viaje con `obtenerViajeInterno` usando el mismo id.
6. THE rechazo SHALL pedir el motivo obligatorio y SHALL NOT mencionar reembolso (se maneja fuera de Argos).
7. THE `ejecutivo`, `supervisor`, `coordinador`, `monitorista` y `reaccion` SHALL NOT ver la conversación ni la bandeja de solicitudes.
8. THE panel del Jefe Operativo (E8-T20) SHALL sustituir "Solicitudes por aprobar" por la bandeja de solicitudes `PAGADO` cuando este módulo se implemente.
9. THE transferencia de una conversación de solicitud SHALL enviar como `responsable_destino_id` el `UsuarioAdmin.id` de un usuario con rol `cotizacion` y SHALL mostrar un texto propio ante `409 destino_no_es_cotizacion`; SHALL quedar condicionada a Q-D (cómo elige el destino un usuario `cotizacion`).
10. THE UI SHALL tratar como errores de validación visibles el `409 fecha_hora_servicio_pasada` al aprobar, el `400` por fecha pasada al crear, cotizar o reprogramar, y el `409 transicion_no_permitida` del segundo pago tardío; la moneda SHALL fijarse en `MXN` sin selector y el monto SHALL aceptar cero.

---

## Escenarios

| #   | Tipo     | Escenario                                                 | Resultado                                                                                                 |
| --- | -------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| E1  | Positivo | JO abre un viaje `APROBADO`                               | Ve "Asignar escolta"; no ve avance, ETA ni emergencia                                                     |
| E2  | Negativo | MON abre un viaje `APROBADO`                              | No ve "Asignar escolta"                                                                                   |
| E3  | Positivo | ADM abre `/viajes/crear` y la ficha                       | Entra y edita                                                                                             |
| E4  | Positivo | JO abre la ficha                                          | La ve sin controles de edición                                                                            |
| E5  | Borde    | MON abre por URL un viaje de otro cliente                 | `404`: "viaje no encontrado"                                                                              |
| E6  | Borde    | Viaje `ASIGNADO`: MON usa avance directo                  | Permitido                                                                                                 |
| E7  | Negativo | EJE abre `/viajes` o `/viajes/$id/ficha`                  | "Sin permiso"; no se pide `obtenerAsignacion`; sesión intacta                                             |
| E8  | Borde    | `403` al enviar una transición                            | `Toast` de sin permiso; detalle intacto                                                                   |
| E9  | Positivo | JO asigna dos clientes a un MON y uno ya está en otro MON | `204`; ambos MON lo conservan                                                                             |
| E10 | Borde    | Cliente ya asignado se desactivó                          | Se muestra "desactivado"; al guardar se quita del payload; no llega `400`                                 |
| E11 | Borde    | MON sin clientes asignados abre `/viajes`                 | `obtenerMiAlcance` con lista vacía: "sin clientes asignados"                                              |
| E12 | Borde    | MON con clientes pero sin viajes                          | "Sin viajes"                                                                                              |
| E13 | Borde    | ADM activa una emergencia                                 | Ve el botón; si el servidor responde `403` (backend pendiente), `Toast` de sin permiso y pantalla intacta |
| E14 | Negativo | `cotizacion` inicia sesión                                | No ve Viajes, Dashboard, Roster, Emergencias ni Conversaciones del viaje; aterriza en Solicitudes         |
| E15 | Borde    | JO aprueba una solicitud `PAGADO`                         | El viaje nace con el mismo id; la solicitud sale de su bandeja y el `404` posterior no es error           |
| E16 | Negativo | SUP abre un caso en la bandeja de emergencias             | Puede devolver; no reclama ni resuelve, y el panel no ofrece transferir (sin selector de destino)         |

## Dependencias

- Pin `tracer.47` (tarea 0.3): lo necesitan M2, M3 (enum del viaje), M11, M12 y M14. La política (M0), la navegación (M1) y los módulos de detalle (M4 a M10, M13) se pueden trabajar antes con los tipos actuales.
- Extremo a extremo del alcance: backend en `-m` con la ola publicada. Sin fecha comprometida; solo por hito (Lead, 2026-11-18).

## Fuera de alcance

- Backend, contrato y DT-07 (Lead).
- Calcular alcance, jerarquía o préstamo en el navegador.
- Override conversacional y otras facultades heredadas sin definir (PM-008).
- Reasignación de escolta; cambios a la máquina de estados.
- Portal del cliente y la app de custodio.
- Avisos externos (correo, SMS, push; DEC-023).

## Preguntas abiertas

Viven en `BRECHAS.md`. Las 11 preguntas del brief quedaron respondidas; restan las tareas de backend del Lead, las preguntas Q-3 y Q-4 y P-A.

## Trazabilidad

DEC-152; DEC-149 #1 a #24; DT-28; DEC-148 #1, #3, #62 a #79, #4, #12, #20 a #22, #28, #31, #37, #67, #73; DEC-045 #9; DEC-022 #1, #9; DEC-060; DEC-126 a DEC-135; DEC-139 a DEC-142; ADR 21, 27, 38, 39; E4-HU-018 v2; E1-HU-003 v2; E10-HU-035 a 038; DT-24; `bff.yaml` `tracer.46` (`obtenerMiAlcance`, `listarViajes`, `obtenerViajeInterno`, `obtenerAsignacion`, `fijarClientesSujeto`, `listarSolicitudes`, `aprobarSolicitud`, `listarBandejaEmergencias`, entre otras).
