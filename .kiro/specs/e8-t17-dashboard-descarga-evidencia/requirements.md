# Requirements Document

## Introduction

El **dashboard, la descarga del expediente y la evidencia** (E8-T17) son las tres capacidades del panel interno que cubren la operación diaria y la respuesta a una disputa: un **tablero de monitoreo** acotado al alcance del usuario, la **descarga del expediente de un viaje** (ficha técnica + histórico + auditoría) y la **gestión de evidencia** asociada a un viaje. Satisface `E6-HU-025` (dashboard), `E6-HU-026` (descarga de la información de un viaje) y `E6-HU-027` (evidencia y documentos). Las tres son para los roles internos `monitorista`, `supervisor`, `coordinador` (en su alcance por unidad) y `administrador` (global). Las pantallas viven en el panel interno (E8-T4 provee el AppShell, la sesión y la navegación; E8-T8 provee el detalle del viaje desde donde se descarga y se gestiona la evidencia).

**Estado de las tres capacidades frente al contrato.** Este spec se redacta completo, con **bloques condicionados**:

- **Descarga del expediente: DISPONIBLE.** La operación `descargarViaje` ya está publicada en el `bff`.
- **Dashboard: CONDICIONADO a la Brecha 1.** `reporteViajes` y `reporteEstados` existen solo en `reportes.yaml`, no en `bff.yaml`.
- **Evidencia: CONDICIONADA a la Brecha 2.** `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto` existen solo en `operacion.yaml`, no en `bff.yaml`.

Los criterios de los bloques condicionados se redactan para que el comportamiento esté definido, pero cada criterio relevante empieza con la condición "una vez publicada la operación en el `bff`". Mientras esa condición no se cumpla, **no se construye una alternativa**: no se deriva el tablero de `listarViajes`/`listarIncidencias`, no se calculan alertas en el cliente y no se llama a `operacion` ni a `reportes` directamente.

Principios rectores de la historia técnica E8-T17:

- **El frontend solo habla con el `bff`.** No hay clientes escritos a mano como autoridad paralela; los tipos y operaciones salen de `@ai27-tech/contracts`.
- **La descarga es de UN viaje.** No se exportan listados ni se descarga en lote (DEC-023; la exportación de varios viajes queda para V2). El cliente no descarga en V1 (DEC-022 #7).
- **La descarga contiene exactamente lo contratado.** El archivo entregado es el payload `DescargaViaje` tal como lo devolvió el `bff`: la interfaz no agrega, quita, renombra ni deriva campos. El contrato (`additionalProperties: false`) no representa cuenta espejo ni `clave_amago`, y la interfaz no los reintroduce (DEC-009, DEC-039).
- **La auditoría no es de la interfaz.** Cada descarga exitosa la audita `operacion`; la interfaz no escribe auditoría. Por eso una pulsación equivale a una sola solicitud.
- **La proyección atrasada se muestra como atrasada.** `reportes` se alimenta por eventos y puede ir detrás (DEC-033). Una proyección `stale` se marca como tal con su `proyeccion_al` visible; nunca se oculta ni se presenta como fresca, y la interfaz no calcula `stale` ni decide su umbral.
- **La evidencia es opcional y genérica** (DEC-040): sin tipos funcionales obligatorios, sin cantidad mínima y sin guarda de cierre. La evidencia **nunca** bloquea ni modifica el cierre del viaje (E8-T14 no la consulta).
- **La autoridad es el `bff`.** La interfaz esconde lo que el rol no puede hacer (afordancia), pero la negación real (`403`/`404`) es del `bff` y se clasifica sin romper la vista. El alcance por unidad lo aplica el backend, no la interfaz.

> **Nota de contrato (verificada contra el tag publicado):**
>
> - **Contexto:** `ai27-platform-context` en el commit `3e46bcb` (`main` al día, 2026-11-03). Decisiones citadas: DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060 y DEC-129 (los usuarios internos no se acotan por tenant; su límite es el rol y el alcance por unidad).
> - **Contrato:** `@ai27-tech/contracts@0.1.0-tracer.33` (el pin de `package.json` del frontend, que es también el último tag publicado). `@ai27-tech/ui@0.2.0-beta.6`. El checkout local de `pf-pkg-contracts` está en la rama `feat/ficha-tecnica-e-historico-tracer21` (`a8fcfb7`), que contiene `tracer.33` sin cambios en `bff.yaml`. Existe `origin/feat/bandeja-reaccion-tracer-34` sin publicar, que no aplica a este spec.
> - **Descarga (DISPONIBLE en el `bff`):** `GET /api/v1/viajes/{id}/descarga`, `operationId` `descargarViaje`, tag `descarga`. Responde `200` con `DescargaViaje { viaje_id, ficha: FichaTecnicaDescarga { estado, cliente_id?, origen, destinos[{ nombre, numero_envio? }], fecha_hora_servicio?, tipo_servicio? }, bitacora: EntradaBitacoraDescarga[{ texto, autor, ts }], auditoria: RegistroAuditoriaDescarga[{ entidad, actor, ts }], generado_en }`, con `additionalProperties: false` en todos los objetos. Errores `401`, `403` (fuera de alcance, antes de componer nada) y `404`. Devuelve JSON; el formato de exportación final (PDF u otro) sigue "por confirmar" en `E6-HU-026`. Los tipos `descargarViaje` y `DescargaViaje` ya están en el paquete instalado en `node_modules`.
> - **Dashboard (BRECHA 1):** `reporteViajes` (`GET /api/v1/reportes/viajes`, query `desde`/`hasta` obligatorios de tipo `MarcaTiempo`) y `reporteEstados` (`GET /api/v1/reportes/estados`) están **solo** en `reportes.yaml`. `ReporteViajes { filas: FilaViaje[{ viaje_id, cliente_id?, estado, creado_en?, cerrado_en? }], total, proyeccion_al? (nullable), stale? (boolean) }`; `ReporteEstados { conteos[{ estado, conteo, permanencia_promedio_seg? }], proyeccion_al?, stale? }`. `FilaViaje` no trae incidencias, alertas ni unidad, y el contrato no declara filtro por alcance de unidad (lo aplica el backend). Ninguna rama del repo de contratos los proyecta al `bff`.
> - **Evidencia (BRECHA 2):** `listarAdjuntos` (`GET /api/v1/viajes/{id}/adjuntos` → `PaginaAdjuntos { items: Adjunto[{ id, viaje_id, tipo_medio, tamano_bytes, checksum_sha256?, estado_escaneo (pendiente|limpio|infectado), creado_en }] }`), `crearIntencionSubidaAdjunto` (`POST /api/v1/viajes/{id}/adjuntos/intenciones-subida`, cuerpo `{ tipo_medio, tamano_bytes, checksum_sha256 }` con los tres campos obligatorios y el checksum en SHA-256 hexadecimal de 64 caracteres → `201 { adjunto_id, url_subida, expira_en }`) y `descargarAdjunto` (`GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga` → `{ url_descarga, expira_en }`; un adjunto no `limpio` no autoriza descarga) están **solo** en `operacion.yaml`. Los bytes no pasan por el servicio: la subida y la descarga usan una URL de vida corta del object storage (propuesta ADR 32). `Adjunto` no trae nombre de archivo ni autor.
> - **Estado actual del frontend:** `/monitoreo/dashboard` es un stub (`useInitialRoute` ya envía ahí a `monitorista`, `supervisor` y `coordinador`); `/reportes` es un stub de E6 y `NAV_ITEMS` solo oculta "Reportes" a `reaccion`. `@ai27-tech/ui` tiene `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`, `Form`/`FormField`/`Input` y `Visor` (solo IMAGE/AUDIO); **no** tiene indicador `stale`, componente de métricas, selector/subida de archivos ni vista previa de documentos.
>
> Las tres brechas de componentes y las dos de contrato se registran en `BRECHAS.md` (a cargo de otro paso) y en **Notas de brechas**.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos, umbrales ni componentes compartidos; resuelve el dominio (autorización, alcance, auditoría, escaneo, frescura de la proyección) el `bff`/backend, y la interfaz consume resultados y clasifica respuestas.

## Glossary

- **Panel_UI**: el sistema de interfaz de E8-T17 (rutas, componentes y elementos de dashboard, descarga y evidencia). Es el "sistema" al que refieren los criterios cuando no aplica uno más específico.
- **Dashboard_UI**: la parte de Panel_UI que muestra el tablero de monitoreo (`/monitoreo/dashboard`).
- **Descarga_UI**: la parte de Panel_UI que ofrece y ejecuta la descarga del expediente de un viaje desde su detalle.
- **Evidencia_UI**: la parte de Panel_UI que lista, adjunta y consulta la evidencia de un viaje desde su detalle.
- **Dashboard**: tablero de monitoreo (`E6-HU-025`) con al menos viajes, incidencias, alertas y estatus, acotado por rol y alcance.
- **Expediente**: información descargable de un viaje: ficha técnica, histórico (bitácora) y registros de auditoría, tal como los compone el `bff` en `DescargaViaje` (`E6-HU-026`).
- **Evidencia**: archivo genérico asociado a un viaje (`Adjunto`), opcional y sin tipo funcional obligatorio (DEC-040).
- **Proyección**: vista de lectura de `reportes`, alimentada por eventos, que puede ir detrás de la operación (DEC-033).
- **Stale**: indicador booleano `stale` que entrega el `bff` cuando la proyección está atrasada. La interfaz lo muestra; no lo calcula.
- **Proyección_al**: marca de tiempo `proyeccion_al` hasta la cual la proyección tiene datos aplicados.
- **Intención de subida**: solicitud previa a la subida de un archivo (`crearIntencionSubidaAdjunto`) que devuelve `adjunto_id`, `url_subida` y `expira_en`.
- **URL de vida corta**: URL temporal del object storage para subir o descargar bytes; caduca en `expira_en` y no se persiste.
- **Estado de escaneo**: `estado_escaneo` del adjunto (`pendiente`, `limpio` o `infectado`).
- **Alcance**: conjunto de unidades visibles para el usuario: Monitorista, sus unidades; Supervisor y Coordinador, la unión de su alcance; Administrador, global (DEC-045, DEC-060). Lo aplica el `bff`/backend.
- **Rol efectivo**: rol de la sesión del panel interno (`monitorista`, `supervisor`, `coordinador`, `administrador`, y los que no acceden: `jefe_operativo`, `ejecutivo`, `reaccion`; el `cliente` no usa este panel).
- **Afordancia**: elemento de interfaz que ofrece o esconde un gesto según el rol. Esconder una entrada no es seguridad; la negación real es del `bff`.
- **Brecha 1 / Brecha 2**: ausencia en `bff.yaml` de las operaciones de reportes (dashboard) y de adjuntos (evidencia), respectivamente. Ver Nota de contrato.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance y rol y reenvía a los servicios.
- **AppShell**: estructura de navegación y sesión del panel interno (E8-T4).

## Requirements

### Requirement 1: Acceso por rol y alcance

**User Story:** Como usuario interno de monitoreo, quiero ver las entradas de dashboard, descarga y evidencia solo cuando mi rol las permite, para no encontrar gestos que el sistema me va a negar.

#### Acceptance Criteria

1. WHERE el rol efectivo de la sesión es `monitorista`, `supervisor`, `coordinador` o `administrador`, THE Panel_UI SHALL ofrecer la entrada al Dashboard, el gesto de descarga del expediente y la sección de evidencia del viaje.
2. WHERE el rol efectivo de la sesión es `jefe_operativo`, `ejecutivo` o `reaccion`, THE Panel_UI SHALL NOT ofrecer ninguna de las tres capacidades.
3. THE Panel_UI SHALL derivar la visibilidad de cada afordancia del rol efectivo de la sesión del panel interno y SHALL tratar la decisión del `bff` como autoridad final, aunque la interfaz haya mostrado u ocultado el gesto.
4. THE Panel_UI SHALL NOT filtrar, recortar ni ampliar por su cuenta el conjunto de viajes o de unidades que el `bff` entrega según el alcance del usuario.
5. WHEN el `bff` responde `403` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL mostrar un mensaje de autorización insuficiente, sin romper la vista ni mostrar datos parciales de la respuesta.
6. WHEN el `bff` responde `404` a una solicitud sobre un viaje, THE Panel_UI SHALL mostrar un mensaje de viaje inexistente o fuera de alcance, sin distinguir entre ambos casos.
7. THE Panel_UI SHALL NOT ofrecer ninguna de las tres capacidades al rol `cliente` (el portal del cliente es otra aplicación; el cliente no descarga en V1, DEC-022 #7).

### Requirement 2: Dashboard de monitoreo [CONDICIONADO a la Brecha 1]

**User Story:** Como Monitorista, quiero un tablero con viajes, incidencias, alertas y estatus de mis unidades, para monitorear los servicios en curso y tomar decisiones.

#### Acceptance Criteria

1. WHERE la operación `reporteViajes` esté publicada en el `bff`, WHEN Dashboard_UI se monta, THE Dashboard_UI SHALL solicitar al `bff` la proyección de viajes con el periodo `desde`/`hasta` obligatorio, usando el cliente de `@ai27-tech/contracts`.
2. WHERE la operación `reporteEstados` esté publicada en el `bff`, WHEN Dashboard_UI se monta, THE Dashboard_UI SHALL solicitar al `bff` los conteos por estado del mismo periodo.
3. WHERE las operaciones del dashboard estén publicadas en el `bff`, THE Dashboard_UI SHALL mostrar al menos viajes, incidencias, alertas y estatus, con el detalle de cada indicador que defina Producto (ver Preguntas abiertas 1 y 2).
4. WHERE las operaciones del dashboard estén publicadas en el `bff`, THE Dashboard_UI SHALL mostrar únicamente los datos que el `bff` entrega, acotados por el alcance que el `bff` aplica al usuario.
5. THE Dashboard_UI SHALL NOT calcular en el cliente alertas, incidencias ni cifras que el `bff` no entregue, y SHALL NOT derivar el tablero de `listarViajes` ni de `listarIncidencias`.
6. THE Dashboard_UI SHALL NOT mostrar un mapa en vivo (V1 no tiene telemetría; ADR 20).
7. THE Dashboard_UI SHALL NOT ofrecer exportar, descargar ni imprimir listados de varios viajes (DEC-023).
8. WHILE el `bff` no ha respondido a la solicitud del dashboard, THE Dashboard_UI SHALL mostrar un estado de carga diferenciado del estado vacío y del estado de error.
9. WHERE las operaciones del dashboard estén publicadas en el `bff`, IF la respuesta no contiene viajes dentro del alcance y el periodo, THEN THE Dashboard_UI SHALL mostrar un estado "sin viajes" diferenciado del estado de carga y del estado de error.
10. IF la solicitud del dashboard falla por un error que no es de sesión ni de autorización, THEN THE Dashboard_UI SHALL mostrar un error con una acción de reintento.
11. WHERE las operaciones del dashboard NO estén publicadas en el `bff`, THE Dashboard_UI SHALL conservar el estado actual del stub de `/monitoreo/dashboard` sin presentar cifras inventadas ni servidas por mocks como si fueran datos reales.

### Requirement 3: Frescura de la proyección del dashboard [CONDICIONADO a la Brecha 1]

**User Story:** Como Monitorista, quiero saber cuándo la información del tablero va atrasada, para no tomar decisiones con datos viejos creyendo que son actuales.

#### Acceptance Criteria

1. WHERE las operaciones del dashboard estén publicadas en el `bff`, WHEN la respuesta trae `stale` igual a `true`, THE Dashboard_UI SHALL marcar la proyección como atrasada (stale) de forma visible y SHALL mostrar el valor de `proyeccion_al`.
2. WHERE las operaciones del dashboard estén publicadas en el `bff`, WHEN la respuesta trae `stale` igual a `false`, THE Dashboard_UI SHALL mostrar la proyección sin marca de atraso.
3. WHERE las operaciones del dashboard estén publicadas en el `bff`, WHEN la respuesta trae `proyeccion_al` igual a `null`, THE Dashboard_UI SHALL mostrar el mensaje "sin datos aplicados aún" en lugar de una fecha.
4. THE Dashboard_UI SHALL NOT calcular `stale` ni decidir el umbral de atraso; el valor lo entrega el `bff`.
5. THE Dashboard_UI SHALL NOT ocultar una proyección `stale` ni presentarla con el mismo aspecto que una fresca.
6. WHERE las operaciones del dashboard estén publicadas en el `bff`, WHEN la respuesta no trae el campo `stale`, THE Dashboard_UI SHALL tratar la frescura como no informada y SHALL NOT presentar la proyección como fresca (ver Pregunta abierta 8).

### Requirement 4: Descarga del expediente de un viaje [DISPONIBLE]

**User Story:** Como Monitorista, quiero descargar el expediente de un viaje de mis unidades, para contar con la ficha y el histórico fuera de la plataforma y responder a una disputa.

#### Acceptance Criteria

1. WHERE el rol efectivo permite la descarga (Requirement 1), THE Descarga_UI SHALL ofrecer la acción "Descargar expediente" en el detalle del viaje.
2. WHEN el usuario activa la acción de descarga, THE Descarga_UI SHALL enviar una sola solicitud `descargarViaje` al `bff` para el viaje mostrado.
3. WHILE la solicitud de descarga está en curso, THE Descarga_UI SHALL mostrar el estado "en preparación" y SHALL deshabilitar la acción para impedir una segunda solicitud.
4. WHEN el `bff` responde `200`, THE Descarga_UI SHALL entregar al usuario un archivo cuyo contenido es exactamente el payload `DescargaViaje` recibido, serializado como JSON (entrega provisional; ver Pregunta abierta 3).
5. THE Descarga_UI SHALL NOT agregar, quitar, renombrar ni derivar campos del payload al construir el archivo, y SHALL NOT incluir cuenta espejo ni `clave_amago` (DEC-009, DEC-039).
6. WHEN el `bff` responde `200`, THE Descarga_UI SHALL mostrar un aviso de éxito y rehabilitar la acción.
7. IF el `bff` responde `403`, THEN THE Descarga_UI SHALL informar autorización insuficiente o viaje fuera de alcance, SHALL NOT generar archivo y SHALL NOT mostrar datos del expediente.
8. IF el `bff` responde `404`, THEN THE Descarga_UI SHALL informar que el viaje no existe o está fuera de alcance y SHALL NOT generar archivo.
9. IF el `bff` responde `401`, THEN THE Descarga_UI SHALL delegar el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.
10. IF la solicitud falla por un error de red o un error no clasificado, THEN THE Descarga_UI SHALL mostrar un error accionable con reintento, SHALL NOT generar archivo y SHALL rehabilitar la acción.
11. THE Descarga_UI SHALL NOT escribir ni simular registros de auditoría; la auditoría de cada descarga exitosa la escribe `operacion`.
12. THE Descarga_UI SHALL limitar la descarga a un solo viaje por solicitud, SHALL NOT ofrecer descarga de listados ni en lote y SHALL NOT ofrecerla al cliente.
13. THE Descarga_UI SHALL NOT fijar un formato final (PDF u otro) ni un nombre de archivo definitivo hasta que Producto los confirme; el nombre provisional del archivo es una decisión pendiente (Pregunta abierta 3).

### Requirement 5: Evidencia del viaje [CONDICIONADO a la Brecha 2]

**User Story:** Como Monitorista, quiero adjuntar y consultar evidencia de un viaje, para respaldar lo ocurrido durante el servicio.

#### Acceptance Criteria

1. WHERE la operación `listarAdjuntos` esté publicada en el `bff`, WHEN Evidencia_UI se monta con un identificador de viaje, THE Evidencia_UI SHALL solicitar al `bff` los adjuntos del viaje y SHALL mostrar de cada uno su tipo de medio, tamaño, estado de escaneo y fecha de creación, tal como los entrega el `bff`.
2. WHERE la operación `listarAdjuntos` esté publicada en el `bff`, IF el viaje no tiene adjuntos, THEN THE Evidencia_UI SHALL mostrar un estado "sin evidencia" diferenciado del estado de carga y del estado de error.
3. WHERE la operación `crearIntencionSubidaAdjunto` esté publicada en el `bff`, WHEN el usuario elige un archivo para adjuntar, THE Evidencia_UI SHALL calcular en el navegador el SHA-256 del archivo y SHALL enviar al `bff` la intención de subida con `tipo_medio`, `tamano_bytes` y `checksum_sha256`, los tres obligatorios.
4. WHERE la operación `crearIntencionSubidaAdjunto` esté publicada en el `bff`, WHEN el `bff` responde `201` con `url_subida` y `expira_en`, THE Evidencia_UI SHALL subir el archivo directamente a la URL de vida corta, sin pasar los bytes por el `bff`.
5. WHEN la subida termina correctamente, THE Evidencia_UI SHALL refrescar la lista de adjuntos y SHALL mostrar el adjunto nuevo con el estado de escaneo que el `bff` entregue.
6. IF la subida falla o la URL de subida expira antes de completarse, THEN THE Evidencia_UI SHALL informar el fallo, SHALL NOT presentar el adjunto como registrado y SHALL permitir reintentar solicitando una nueva intención de subida.
7. WHERE la operación `descargarAdjunto` esté publicada en el `bff`, WHEN el usuario pide consultar o descargar un adjunto con `estado_escaneo` igual a `limpio`, THE Evidencia_UI SHALL solicitar la autorización de descarga al `bff` y SHALL abrir la `url_descarga` recibida antes de su `expira_en`.
8. WHILE un adjunto tiene `estado_escaneo` igual a `pendiente` o `infectado`, THE Evidencia_UI SHALL mostrar su estado de escaneo y SHALL NOT ofrecer la acción de descarga o consulta de ese adjunto.
9. THE Evidencia_UI SHALL NOT persistir `url_subida` ni `url_descarga` (ni en almacenamiento local, ni en caché, ni en el estado de la aplicación más allá del uso inmediato) y SHALL pedir una nueva autorización cuando la anterior haya expirado.
10. IF el `bff` rechaza la intención de subida por formato, tamaño o cantidad, THEN THE Evidencia_UI SHALL comunicar el rechazo con el mensaje aprobado y SHALL NOT definir ni aplicar por su cuenta formatos permitidos ni límites (los define Seguridad/Legal; Pregunta abierta 4).
11. THE Evidencia_UI SHALL tratar la evidencia como opcional y genérica: SHALL NOT exigir un tipo funcional de evidencia, SHALL NOT exigir una cantidad mínima de archivos y SHALL NOT mostrar la ausencia de evidencia como una falta o una advertencia.
12. THE Evidencia_UI SHALL NOT condicionar, bloquear ni modificar el cierre del viaje con base en la presencia o ausencia de evidencia.
13. THE Evidencia_UI SHALL NOT escribir ni simular registros de auditoría de acceso a la evidencia; la auditoría la escribe el backend.
14. WHERE las operaciones de adjuntos NO estén publicadas en el `bff`, THE Evidencia_UI SHALL NOT llamar a `operacion` directamente ni presentar una lista o una subida simuladas como si fueran reales.

### Requirement 6: Estados y errores transversales

**User Story:** Como operador interno, quiero señales claras de carga, vacío y error con reintento y que mi sesión se maneje de forma uniforme, para saber qué ocurre en cada una de estas pantallas.

#### Acceptance Criteria

1. WHEN el `bff` responde `401` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL delegar el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.
2. WHEN el `bff` responde `403` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL mostrar el mensaje de autorización insuficiente definido en el Requirement 1.
3. WHEN el `bff` responde `404` a una solicitud sobre un viaje, THE Panel_UI SHALL mostrar el mensaje de viaje inexistente o fuera de alcance definido en el Requirement 1.
4. IF una solicitud falla por un error de red o un error no clasificado, THEN THE Panel_UI SHALL mostrar un error accionable con reintento y SHALL conservar el resto de la vista operativa.
5. THE Panel_UI SHALL diferenciar visualmente los estados de carga, vacío y error de cada bloque.
6. THE Panel_UI SHALL construir sus elementos con los componentes de `@ai27-tech/ui` y SHALL cumplir los criterios de accesibilidad de esos componentes (foco visible, nombre accesible en los controles, estados anunciables).
7. WHEN una descarga o una subida termina correctamente, THE Panel_UI SHALL mostrar un aviso de éxito mediante el componente de avisos de `@ai27-tech/ui`.

## Escenarios

### Escenarios positivos

**Escenario 1. Descarga dentro del alcance** _(Disponible)_  
Dado que el usuario es Monitorista con la unidad U1 asignada y abre el detalle de un viaje de U1, cuando pulsa "Descargar expediente", entonces la interfaz envía una sola solicitud `descargarViaje`, muestra "en preparación" mientras espera y, al recibir `200`, entrega un archivo con exactamente el payload recibido (ficha, bitácora, auditoría y `generado_en`), sin cuenta espejo ni `clave_amago`, y muestra un aviso de éxito. La auditoría la registra `operacion`.

**Escenario 2. Dashboard acotado a U1 y U2** _(Condicionado a la Brecha 1)_  
Dado que el usuario es Monitorista con las unidades U1 y U2 y las operaciones de reportes están publicadas en el `bff`, cuando abre `/monitoreo/dashboard`, entonces la interfaz muestra viajes, incidencias, alertas y estatus únicamente con los datos que el `bff` entrega para U1 y U2, sin filtrar ni ampliar en el cliente y sin mapa.

**Escenario 3. Adjuntar y consultar evidencia** _(Condicionado a la Brecha 2)_  
Dado que las operaciones de adjuntos están publicadas en el `bff` y el usuario autorizado abre un viaje de su alcance, cuando elige un archivo, entonces la interfaz calcula su SHA-256, solicita la intención de subida, sube el archivo a la URL de vida corta, refresca la lista y muestra el adjunto con su estado de escaneo; cuando el adjunto está `limpio` y el usuario pide consultarlo, la interfaz solicita la autorización de descarga y abre la URL recibida antes de que expire.

### Escenarios negativos

**Escenario 4. Monitorista descarga viaje de unidad ajena** _(Disponible)_  
Dado que el usuario es Monitorista y abre (por enlace directo) un viaje de una unidad que no tiene asignada, cuando pulsa "Descargar expediente", entonces el `bff` responde `403` antes de componer datos, y la interfaz informa autorización insuficiente o viaje fuera de alcance, sin generar archivo y sin mostrar datos del expediente.

**Escenario 5. Roles sin acceso** _(Disponible / Condicionado)_  
Dado que el usuario es Jefe Operativo, Ejecutivo o Reacción, cuando navega el panel, entonces la interfaz no ofrece el dashboard, la descarga del expediente ni la evidencia; si de algún modo emitiera la solicitud, el `bff` responde `403` y la interfaz lo clasifica sin romper la vista.

**Escenario 6. Intento de descarga de listado** _(Disponible)_  
Dado que el usuario observa un listado de viajes, cuando busca una acción para exportar o descargar varios viajes, entonces la interfaz no ofrece ninguna: la descarga existe solo por viaje desde su detalle (DEC-023).

**Escenario 7. Viaje inexistente** _(Disponible)_  
Dado que el usuario solicita la descarga de un viaje que no existe o que ya no está en su alcance, cuando el `bff` responde `404`, entonces la interfaz informa viaje inexistente o fuera de alcance y no genera archivo.

### Escenarios de borde

**Escenario 8. Proyección atrasada** _(Condicionado a la Brecha 1)_  
Dado que el `bff` entrega el dashboard con `stale` igual a `true` y un `proyeccion_al` anterior, cuando la interfaz lo muestra, entonces lo marca como atrasada con `proyeccion_al` visible; no lo oculta ni lo presenta como fresco.

**Escenario 9. Sin datos aplicados** _(Condicionado a la Brecha 1)_  
Dado que el `bff` entrega `proyeccion_al` igual a `null`, cuando la interfaz muestra el dashboard, entonces indica "sin datos aplicados aún" en lugar de una fecha.

**Escenario 10. Doble clic en Descargar** _(Disponible)_  
Dado que el usuario pulsa dos veces seguidas "Descargar expediente", cuando la primera solicitud sigue en curso, entonces la interfaz deshabilita la acción y envía una sola solicitud, de modo que `operacion` registra una sola auditoría.

**Escenario 11. Sesión expirada durante la descarga** _(Disponible)_  
Dado que la sesión expira durante la solicitud, cuando el `bff` responde `401`, entonces la interfaz delega el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.

**Escenario 12. Falla de red durante la descarga** _(Disponible)_  
Dado que la red falla durante la solicitud, cuando ocurre el error, entonces la interfaz muestra un error con reintento, no genera archivo y rehabilita la acción.

**Escenario 13. Viaje sin evidencia cierra normalmente** _(Condicionado a la Brecha 2)_  
Dado que un viaje no tiene adjuntos, cuando el usuario autorizado lo cierra conforme a E8-T14, entonces la interfaz de evidencia muestra "sin evidencia" sin advertencia y el cierre procede sin consultar la evidencia.

**Escenario 14. Adjunto pendiente o infectado** _(Condicionado a la Brecha 2)_  
Dado que un adjunto tiene `estado_escaneo` igual a `pendiente` o `infectado`, cuando el usuario observa la lista, entonces la interfaz muestra ese estado y no ofrece descarga ni consulta de ese adjunto.

**Escenario 15. URL de vida corta expirada** _(Condicionado a la Brecha 2)_  
Dado que el usuario obtuvo una autorización de descarga y no la usó antes de `expira_en`, cuando intenta abrirla de nuevo, entonces la interfaz no reutiliza la URL anterior y solicita una nueva autorización.

**Escenario 16. Subida rechazada por formato o tamaño** _(Condicionado a la Brecha 2)_  
Dado que el `bff` rechaza la intención de subida por formato o tamaño, cuando la interfaz recibe el rechazo, entonces lo comunica con el mensaje aprobado, no presenta el adjunto como registrado y no aplica límites propios.

**Escenario 17. El cierre del viaje no consulta evidencia** _(Condicionado a la Brecha 2)_  
Dado que existen o no adjuntos en un viaje, cuando se ejecuta o se evalúa el cierre del viaje, entonces ni el resultado ni la disponibilidad del gesto de cierre dependen de la evidencia.

## Dependencias

- `E6-HU-025`, `E6-HU-026`, `E6-HU-027`: comportamiento funcional (estado: borrador, pendiente de validación) del dashboard, la descarga y la evidencia.
- E8-T4 (AppShell, sesión y navegación): provee la entrada de navegación, el rol efectivo y el flujo de sesión ante `401`. La historia técnica E8-T17 declara dependencia de E8-T4, `E6-T2`, `E6-T3` y `E6-T4`.
- E8-T8 (detalle del viaje): desde ahí se descarga el expediente y se gestiona la evidencia.
- E8-T13 (histórico): su bitácora es parte del contenido del expediente descargado (`E1-HU-009`).
- E8-T14 (cierre del viaje): no consulta la evidencia (DEC-040).
- `E4-HU-017/018` (acceso, roles y alcance) y el vínculo del Monitorista con sus unidades (pendiente heredado de DEC-045): condicionan lo que el dashboard y la descarga muestran; lo resuelve el backend (Pregunta abierta 7).
- DEC-009 y DEC-039 (sin cuenta espejo ni `clave_amago`), DEC-022 #7 y #9 (cliente no descarga; Reacción sin dashboard, expedientes ni evidencia), DEC-023 (sin exportar listados), DEC-033 (reportes por eventos, puede ir atrasado), DEC-040 (evidencia opcional y genérica), DEC-045 y DEC-060 (roles y reparto de facultades).
- Contrato generado y componentes de `@ai27-tech`: se verifican antes de implementar, conforme a la Nota de brechas y a `BRECHAS.md`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`, `reportes` u `operacion`; en particular, proyectar al `bff` las operaciones de reportes y de adjuntos (Brechas 1 y 2).
- Exportar o descargar listados de varios viajes, en Excel/CSV o cualquier formato (DEC-023, V2).
- Descarga del expediente por el cliente (DEC-022 #7).
- Mapa en vivo en el dashboard (ADR 20, V1 sin telemetría).
- Derivar el tablero de `listarViajes` o `listarIncidencias`, y calcular alertas, incidencias o frescura en el cliente.
- El dashboard propio del Jefe Operativo (E8-T20, `E6-HU-033`).
- Fijar el formato final de la descarga (PDF u otro) y su nombre definitivo.
- Definir formatos permitidos, tamaño o cantidad máxima de evidencia, retención, versionado o legal hold.
- Tipos funcionales de evidencia, cantidad mínima o guarda de cierre basada en evidencia (DEC-040).
- Escribir auditoría desde la interfaz.
- Escaneo de archivos, almacenamiento de bytes y emisión de URL de vida corta: lo hacen el backend y el object storage.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no preguntas que redefinan el comportamiento funcional de E8-T17. Si una verificación no está disponible, se documenta la brecha en `BRECHAS.md` y no se inventa una alternativa.

- **Descarga (DISPONIBLE):** `descargarViaje` y `DescargaViaje` están publicados en el `bff` en `@ai27-tech/contracts@0.1.0-tracer.33` (el pin del frontend) y presentes en el paquete instalado. No hay brecha de contrato para el Requirement 4. El formato final de la descarga sigue pendiente de Producto (Pregunta abierta 3).
- **Brecha 1 (dashboard):** `reporteViajes` y `reporteEstados` existen solo en `reportes.yaml`, no en `bff.yaml`, y ninguna rama del repo de contratos los proyecta al `bff`. Además, `FilaViaje` no trae incidencias, alertas ni unidad, y el contrato no declara filtro por alcance de unidad. Mientras no se publique la proyección en el `bff` (y se defina qué entrega para incidencias y alertas), el Requirement 2 y el Requirement 3 quedan **bloqueados**; no se construye alternativa. Debe solicitarse al encargado de contratos que proyecte las operaciones al `bff` con los indicadores que Producto defina.
- **Brecha 2 (evidencia):** `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto` existen solo en `operacion.yaml`, no en `bff.yaml`. Mientras no se publiquen en el `bff`, el Requirement 5 queda **bloqueado**. Además, `Adjunto` no trae nombre de archivo ni autor (Pregunta abierta 5). La subida y la descarga usan una URL de vida corta del object storage (MinIO, propuesta ADR 32); verificar el origen permitido por CORS y la política de contenido (CSP) del panel antes de implementar.
- **Checksum en el cliente:** la intención de subida exige `checksum_sha256` (64 caracteres hexadecimales). Verificar la estrategia de cálculo en navegador para archivos grandes (sin cargar el archivo completo en memoria) antes de implementar; la decisión es técnica y se registra en el diseño.
- **Alcance y rol efectivo:** la visibilidad de las afordancias depende del rol de la sesión del panel interno. Verificar cómo expone E8-T4 el rol efectivo; la decisión final de autorización y alcance es del `bff` (`403`/`404`).
- **Navegación:** `NAV_ITEMS` solo oculta "Reportes" a `reaccion`; `jefe_operativo` y `ejecutivo` la ven, aunque la historia técnica indica que no acceden. La interfaz esconde solo lo que la fuente especifica; la negación real es del `bff` (Pregunta abierta 6).
- **Librerías compartidas:** `@ai27-tech/ui@0.2.0-beta.6` tiene `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`, `Form`/`FormField`/`Input` y `Visor` (solo IMAGE/AUDIO). **Faltan** un indicador `stale`, un componente de métricas, un selector/subida de archivos y una vista previa de documentos. Toda afordancia faltante se compone con primitivas de la librería y se registra como solicitud a la librería, nunca como componente local nuevo (ver `BRECHAS.md`).
- **Mensajes:** verificar los textos aprobados para autorización insuficiente, viaje inexistente o fuera de alcance, "en preparación", "sin evidencia", "sin datos aplicados aún", proyección atrasada y rechazo de subida.
- **Pruebas de la definición de terminado:** una prueba de que una proyección atrasada (`stale` igual a `true`) se muestra marcada como stale, y una prueba de que la descarga solo contiene campos contratados y no incluye cuenta espejo ni `clave_amago`. La primera depende de la Brecha 1.

## Preguntas abiertas

No se supone ninguna respuesta; cada una se resuelve antes de cerrar el comportamiento que toca.

1. **Detalle de cada indicador del dashboard** (viajes, incidencias, alertas, estatus): qué es una "alerta" y cuál es el desglose de cada indicador. `E6-HU-025` lo deja pendiente. _Dueño sugerido: Product Management._
2. **Periodo `desde`/`hasta` por omisión del dashboard**, ya que `reporteViajes` lo exige. _Dueño sugerido: Product Management._
3. **Formato final de la descarga** (PDF u otro) y **nombre de archivo**: `E6-HU-026` lo marca "por confirmar". Entrega provisional: archivo JSON del payload. _Dueño sugerido: Product Management._
4. **Formatos permitidos, tamaño y cantidad máximos de evidencia, retención y legal hold.** _Dueño sugerido: Seguridad y Legal._
5. **`Adjunto` sin nombre de archivo ni autor:** ¿se requieren para la lista de evidencia? _Dueño sugerido: Product Management y encargado de Contratos._
6. **Navegación:** ¿la entrada "Reportes" del AppShell se oculta también a `jefe_operativo` y `ejecutivo` (la historia técnica dice que no acceden)? ¿A dónde lleva para los roles de monitoreo: al dashboard? _Dueño sugerido: Product Management y el spec de E8-T4._
7. **Vínculo Monitorista–unidades:** cómo y cuándo se vincula un Monitorista con sus unidades (pendiente heredado de DEC-045). Afecta lo que el dashboard y la descarga muestran; lo resuelve el backend y aquí solo se registra como dependencia. _Dueño sugerido: Product Management y backend de identidad._
8. **Frescura sin `stale`:** `stale` es opcional en el contrato. Si el `bff` no lo entrega, ¿qué debe mostrar el dashboard? El Requirement 3.6 propone tratarlo como "frescura no informada"; falta confirmación. _Dueño sugerido: Product Management y encargado de Contratos._

## Trazabilidad

| Requisito                                          | HU / Decisión                                                                                    | Operación de contrato                                                                          | Estado                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Requirement 1: Acceso por rol y alcance            | `E6-HU-025`, `E6-HU-026`, `E6-HU-027`; DEC-022 #7 y #9, DEC-045, DEC-060                         | Respuestas `401`/`403`/`404` del `bff`                                                         | Disponible (afordancia en UI); la negación real es del `bff` |
| Requirement 2: Dashboard de monitoreo              | `E6-HU-025`; DEC-023, ADR 20                                                                     | `reporteViajes`, `reporteEstados` (solo en `reportes.yaml`)                                    | Condicionado a la Brecha 1                                   |
| Requirement 3: Frescura de la proyección           | `E6-HU-025`; DEC-033; DoD de E8-T17 (prueba de stale)                                            | `ReporteViajes.stale`, `proyeccion_al`                                                         | Condicionado a la Brecha 1                                   |
| Requirement 4: Descarga del expediente de UN viaje | `E6-HU-026`; DEC-009, DEC-022 #7, DEC-023, DEC-039; DoD de E8-T17 (prueba de campos contratados) | `descargarViaje` (`GET /api/v1/viajes/{id}/descarga`)                                          | Disponible                                                   |
| Requirement 5: Evidencia del viaje                 | `E6-HU-027`; DEC-022 #9, DEC-040, DEC-060                                                        | `listarAdjuntos`, `crearIntencionSubidaAdjunto`, `descargarAdjunto` (solo en `operacion.yaml`) | Condicionado a la Brecha 2                                   |
| Requirement 6: Estados y errores transversales     | `E6-HU-025`, `E6-HU-026`, `E6-HU-027`                                                            | Respuestas `401`/`403`/`404` y errores de red                                                  | Disponible                                                   |

Trazabilidad de escenarios: 1, 4, 6, 7, 10, 11 y 12 → Requirement 4; 2, 8 y 9 → Requirements 2 y 3; 3, 13, 14, 15, 16 y 17 → Requirement 5; 5 → Requirement 1.
