# Requirements Document

## Introduction

La **bandeja operativa de viajes** (E8-T7) es la pantalla del panel administrativo interno que lista los viajes dentro del alcance del usuario autenticado, mostrando el estado de progreso de cada viaje y sus condiciones activas (`INCIDENCIA`, `SIN_SENAL`) por separado del estado. La bandeja vive dentro del outlet del AppShell (E8-T4), en la ruta `/_private/viajes` (archivo `src/routes/_private/viajes.tsx`, hoy un stub). Satisface la HU de listado `E6-HU-025` y la de alcance `E4-HU-018`.

El principio rector es **P10**: el listado no filtra ni reordena en el navegador; pide al `bff` y muestra exactamente lo que el `bff` autoriza y devuelve. El alcance (qué viajes ve cada rol) lo deriva el `bff` del token según DEC-045; el frontend no lo calcula. El principio **P15** exige que el estado de progreso y las condiciones ortogonales se representen como dos cosas distintas, nunca una como la otra (p. ej. `EN_TRANSITO` con `INCIDENCIA` abierta son dos señales simultáneas y separadas).

El consumo de la API y los tipos se hacen contra el paquete generado `@ai27-tech/contracts` instalado; los componentes de interfaz provienen de `@ai27-tech/ui` (fuente de verdad). Esta tarea no crea componentes de interfaz nuevos.

> **Nota de contrato (hecho verificado, no supuesto):** la operación `listarViajes` del `bff` (`GET /api/v1/viajes`, esquema `bff.yaml`) responde `PaginaViajesResumen`, cuyos ítems son `ViajeResumen = { id, estado, origen }`. El `ViajeResumen` del `bff` **NO** incluye `cliente_id`, `destinos`, `fecha_hora_servicio`, `eta_estimado`, `creado_en` ni condiciones activas. La forma rica `Viaje = { id, estado, cliente_id, origen, destinos[], ... }` pertenece al servicio `operacion` (`operacion.yaml`), que el frontend interno no consume directamente. Las columnas de la bandeja y las condiciones activas se diseñan contra `ViajeResumen` real; los campos ausentes se registran como brechas en la sección correspondiente.

## Glossary

- **Bandeja**: pantalla de listado de viajes del alcance del usuario interno, ubicada en `/_private/viajes`.
- **Bandeja_UI**: el sistema de interfaz que renderiza la bandeja en el navegador (el componente de ruta y sus elementos de interfaz). Es el "sistema" al que refieren los criterios de aceptación.
- **BFF**: backend-for-frontend de AI27. Fuente autoritativa del listado; deriva el alcance del token y devuelve solo los viajes autorizados.
- **ViajeResumen**: ítem del listado tal como lo entrega hoy el `bff`: `{ id, estado, origen }` (contrato `bff.yaml` / `bff.gen.ts`).
- **PaginaViajesResumen**: respuesta de `listarViajes`: `{ items: ViajeResumen[], cursor_siguiente: string | null }`.
- **Estado**: token de progreso del viaje tal como lo publica `operacion` (enum `EstadoViaje`, ADR 19). Es una sola dimensión por viaje.
- **Condicion**: condición ortogonal al progreso (enum `CondicionViaje` = `INCIDENCIA`, `SIN_SENAL`), definida en `@ai27-tech/contracts`. Nunca es un estado (P15). Un viaje puede tener cero, una o ambas condiciones activas de forma simultánea a su estado.
- **Filtro_Estado**: control de interfaz que fija el parámetro de query `estado` enviado al `bff`.
- **Cursor**: token de paginación opaco (`cursor_siguiente`) devuelto por el `bff` para solicitar la siguiente página.
- **Alcance**: conjunto de viajes que el usuario puede ver, derivado por el `bff` del token según el rol (DEC-045). El frontend no lo calcula.

## Requirements

### Requirement 1: Listado de viajes del alcance

**User Story:** Como usuario interno, quiero ver el listado de los viajes de mi alcance con su estado, para saber sobre qué trabajar sin abrir cada viaje por separado.

#### Acceptance Criteria

1. WHEN la Bandeja_UI se monta, THE Bandeja_UI SHALL solicitar la operación `listarViajes` del `bff` (`GET /api/v1/viajes`) usando el cliente de contrato de `@ai27-tech/contracts`.
2. WHEN el `bff` responde `PaginaViajesResumen` con uno o más ítems, THE Bandeja_UI SHALL renderizar una fila por cada `ViajeResumen` recibido, mostrando el identificador del viaje, su estado y su origen.
3. THE Bandeja_UI SHALL renderizar las filas usando el componente `Table` de `@ai27-tech/ui`.
4. THE Bandeja_UI SHALL mostrar los viajes en el mismo orden en que el `bff` los entrega en `items`.
5. THE Bandeja_UI SHALL mostrar el estado de cada viaje usando el token tal como lo entrega el `bff`, sin derivar ni inventar estados ausentes del enum `EstadoViaje`.

### Requirement 2: Condiciones ortogonales separadas del estado (P15)

**User Story:** Como usuario interno, quiero ver las condiciones activas (incidencia, sin señal) de un viaje junto a su estado pero diferenciadas de él, para distinguir el progreso del viaje de una condición abierta.

#### Acceptance Criteria

1. WHERE el `bff` entrega condiciones activas por ítem del listado, THE Bandeja_UI SHALL mostrar cada condición activa (`INCIDENCIA`, `SIN_SENAL`) como un indicador visual distinto del indicador de estado, usando el componente `Badge` de `@ai27-tech/ui`.
2. THE Bandeja_UI SHALL representar el estado de progreso y las condiciones activas como elementos de interfaz separados dentro de la fila, de modo que una condición nunca ocupe el lugar del estado ni el estado el de una condición.
3. WHEN un viaje tiene un estado de progreso y al menos una condición activa de forma simultánea, THE Bandeja_UI SHALL mostrar ambos a la vez en la fila, cada uno en su indicador.
4. WHEN un viaje no tiene condiciones activas, THE Bandeja_UI SHALL mostrar su estado sin indicadores de condición.
5. THE Bandeja_UI SHALL tomar los valores admitidos de condición del enum `CondicionViaje` de `@ai27-tech/contracts`, sin definir valores de condición en el frontend.

### Requirement 3: Filtro por estado delegado al BFF

**User Story:** Como usuario interno, quiero filtrar el listado por estado de viaje, para enfocarme en los viajes en una etapa concreta.

#### Acceptance Criteria

1. THE Bandeja_UI SHALL ofrecer un control `Filtro_Estado` cuyas opciones provienen del enum `EstadoViaje` de `@ai27-tech/contracts`.
2. WHEN el usuario selecciona un valor en `Filtro_Estado`, THE Bandeja_UI SHALL solicitar nuevamente `listarViajes` al `bff` enviando el parámetro de query `estado` con el valor seleccionado.
3. WHEN el usuario limpia la selección de `Filtro_Estado`, THE Bandeja_UI SHALL solicitar nuevamente `listarViajes` al `bff` sin el parámetro de query `estado`.
4. THE Bandeja_UI SHALL mostrar únicamente los ítems que el `bff` devuelve en la respuesta filtrada, sin filtrar el resultado en el navegador (P10).
5. THE Bandeja_UI SHALL construir el control de filtro con `FilterTable` (`FilterDefinition`, `FilterValues`) de `@ai27-tech/ui`.

### Requirement 4: Paginación por cursor

**User Story:** Como usuario interno, quiero avanzar por páginas del listado, para revisar un alcance que no cabe en una sola página.

#### Acceptance Criteria

1. WHEN el `bff` responde con `cursor_siguiente` no nulo, THE Bandeja_UI SHALL habilitar el control para solicitar la siguiente página.
2. WHEN el usuario solicita la siguiente página, THE Bandeja_UI SHALL solicitar `listarViajes` al `bff` enviando el parámetro de query `cursor` con el valor de `cursor_siguiente` recibido.
3. WHEN el `bff` responde con `cursor_siguiente` nulo, THE Bandeja_UI SHALL indicar que no hay más páginas disponibles.
4. THE Bandeja_UI SHALL construir el control de paginación con el componente `Pagination` de `@ai27-tech/ui`.
5. WHEN el usuario cambia el valor de `Filtro_Estado`, THE Bandeja_UI SHALL reiniciar la paginación solicitando la primera página del listado filtrado sin reenviar un `cursor` previo.

### Requirement 5: Estado de carga

**User Story:** Como usuario interno, quiero una señal clara mientras el listado se carga, para saber que la bandeja está trabajando.

#### Acceptance Criteria

1. WHILE la solicitud `listarViajes` está en curso y aún no hay respuesta, THE Bandeja_UI SHALL mostrar un indicador de carga.
2. WHEN el `bff` responde, THE Bandeja_UI SHALL reemplazar el indicador de carga por el contenido correspondiente (listado, vacío o error).

### Requirement 6: Estado vacío

**User Story:** Como usuario interno, quiero un mensaje claro cuando no tengo viajes en mi alcance, para distinguir "sin viajes" de un error.

#### Acceptance Criteria

1. WHEN el `bff` responde `PaginaViajesResumen` con `items` vacío, THE Bandeja_UI SHALL mostrar un mensaje de estado vacío indicando que no hay viajes en el alcance del usuario.
2. WHILE el estado vacío se muestra, THE Bandeja_UI SHALL mantener visible el control `Filtro_Estado` para permitir cambiar el filtro.

### Requirement 7: Estado de error

**User Story:** Como usuario interno, quiero un mensaje de error con opción de reintento cuando el listado no se puede cargar, para recuperarme sin recargar la página.

#### Acceptance Criteria

1. IF la solicitud `listarViajes` falla, THEN THE Bandeja_UI SHALL mostrar un mensaje de error en lugar del listado.
2. WHEN se muestra el estado de error, THE Bandeja_UI SHALL ofrecer una acción para reintentar la solicitud `listarViajes` con el filtro vigente.
3. IF el `bff` responde `401` (no autorizado), THEN THE Bandeja_UI SHALL delegar el manejo de sesión al flujo de autenticación del AppShell en lugar de mostrar el error genérico de listado.

## Brechas y supuestos a verificar

Esta sección registra puntos que dependen de fuentes externas (contrato del `bff` y librería) y que deben confirmarse antes o durante el diseño. No son reglas de negocio nuevas; son incertidumbres declaradas.

1. **Condiciones activas por ítem del listado (brecha de contrato abierta).** El Requirement 2 asume que el `bff` entrega las condiciones activas (`INCIDENCIA`, `SIN_SENAL`) por cada ítem. **Verificado como brecha:** el esquema actual `ViajeResumen` del `bff` (`bff.yaml` y `bff.gen.ts`) es `{ id, estado, origen }` y **no** incluye condiciones activas ni una lista de condiciones por ítem. La UI se diseña esperando esa información, pero mientras el contrato no la publique, las condiciones por fila no pueden poblarse. Acción: reportar la brecha al equipo de contrato; no inventar el campo ni derivar condiciones en el frontend.
2. **Campos de viaje más allá de `{ id, estado, origen }`.** El brief describe `Viaje = { id, estado, cliente_id, origen, destinos[], fecha_hora_servicio?, eta_estimado?, creado_en }`. Esa forma pertenece a `operacion`, no al `ViajeResumen` del `bff`. Las columnas de la bandeja se limitan a los campos que el `bff` entrega hoy. Si se requieren más columnas (p. ej. destinos o fecha de servicio), es una brecha de contrato del `bff` a reportar.
3. **Filtro por cliente omitido en V1 (brecha de contrato, decisión del usuario).** El contrato `listarViajes` del `bff` solo expone el parámetro de query `estado` (más `cursor`); no expone `cliente`. El filtro por cliente queda **fuera de V1** y se registra como brecha de contrato. Coherente con el alcance por unidad, no por cliente (DEC-045).
4. **Versión de `@ai27-tech/contracts` instalada vs. publicada.** `package.json` fija `@ai27-tech/contracts` en `0.1.0-tracer.11`, mientras que el último tag publicado observado es `tracer.9`. El trabajo se hace contra el paquete instalado; debe verificarse que la versión instalada corresponda a un tag real del repo de contratos y que los tipos de `ViajeResumen`, `EstadoViaje` y `CondicionViaje` usados existan en esa versión. Punto a verificar, no a asumir resuelto.
5. **Alcance derivado del token.** Se asume que el `bff` filtra por alcance (DEC-045) y que el frontend solo muestra lo recibido. La corrección del alcance por rol no es responsabilidad de esta bandeja; no se prueba aquí el cálculo de alcance, solo que la UI no reordena ni filtra lo que el `bff` devuelve.

## Fuera de alcance (V1)

- **Exportación a Excel/CSV del listado** (DEC-023): no se incluye. La descarga de expediente es por viaje individual, en otra tarea.
- **Mapa de flota y marcador vivo**: no se incluye.
- **ETA automático / telemetría**: no se incluye (ADR 20); la bandeja no muestra ETA en V1.
- **Estado `PATRULLA_EN_CAMINO`**: inalcanzable en V1; no se diseña interacción específica para él.
- **Filtro por cliente**: omitido en V1 por brecha de contrato (ver Brechas #3).
- **Filtrado u ordenamiento en el navegador**: prohibido por P10; toda selección de estado y toda paginación se resuelven pidiendo al `bff`.
- **Creación o edición de viajes desde la bandeja**: fuera de alcance de esta tarea (listado de lectura).
- **Creación de componentes de interfaz nuevos**: prohibido; se usan los componentes de `@ai27-tech/ui`. Cualquier necesidad no cubierta por la librería se reporta como brecha.
