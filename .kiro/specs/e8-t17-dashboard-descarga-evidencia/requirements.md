# Requirements Document

## Introduction

El **dashboard, la descarga del expediente y la evidencia** (E8-T17) son las tres capacidades del panel interno que cubren la operación diaria y la respuesta a una disputa: un **tablero de monitoreo** acotado al alcance del usuario, la **descarga del expediente de un viaje** (ficha técnica + histórico + auditoría) y la **gestión de evidencia** asociada a un viaje. Satisface `E6-HU-025` (dashboard), `E6-HU-026` (descarga de la información de un viaje) y `E6-HU-027` (evidencia y documentos). Las tres son para los roles internos `monitorista`, `supervisor`, `coordinador` (en su alcance por unidad) y `administrador` (global). Las pantallas viven en el panel interno (E8-T4 provee el AppShell, la sesión y la navegación; E8-T8 provee el detalle del viaje desde donde se descarga y se gestiona la evidencia).

**Estado de las tres capacidades frente al contrato.** Este spec se redacta completo, con **bloques condicionados**:

- **Descarga del expediente: DISPONIBLE.** La operación `descargarViaje` ya está publicada en el `bff` y está en el paquete instalado (pin `tracer.33`).
- **Dashboard: contrato CERRADO en `tracer.36` (publicado); backend terminado y taggeado; pendiente de adoptar el pin y del despliegue de `core v0.1.2` (Brecha 1).** `reporteViajes` (con el filtro `en_curso`) y `reporteEstados` están en `bff.yaml` de `tracer.36`, pero no en el paquete instalado (`tracer.33`). `pf-svc-reportes` implementa `en_curso` y `pf-svc-core` `v0.1.2` cablea reportes en el `bff`; las rutas responden solo cuando `core v0.1.2` esté desplegado en el entorno, y hasta entonces el dashboard no tiene datos (esperado, no es un error de la interfaz). El dashboard se puede cerrar completo contra el contrato publicado.
- **Evidencia: contrato CERRADO en `tracer.35` (cubierto por `tracer.36`); servicio implementado con almacén de marcador; construible contra el contrato, NO funcional de punta a punta (Brecha 2).** `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto` están en `bff.yaml`, pero no en el paquete instalado (`tracer.33`). `operacion` ya los implementa, pero con un almacén de marcador (`AlmacenStub`): no mueve bytes reales. El almacén real (MinIO, ADR 32) y el escaneo antivirus son deuda fuera de V1. Faltan las definiciones de Plataforma (CORS/CSP del object storage) y de Seguridad/Legal (formatos y tamaño máximo), que bloquean la evidencia real, no su construcción.
- **Pin objetivo: `tracer.36`**, que cubre dashboard y evidencia. El pin actual sigue en `tracer.33`; lo sube el usuario cuando lo pida (el backend ya lo solicitó en su mensaje).
- **«Backend terminado y taggeado» no equivale a «desplegado».** Se verificó que el código llegó a las ramas remotas y a los tags, no que esté corriendo en el entorno del usuario. Fabricio Fuentes confirma cuándo `core v0.1.2` queda desplegado.

Los criterios de los bloques con contrato disponible se redactan para que el comportamiento esté definido, pero cada criterio relevante empieza con la condición "la operación está disponible en el contrato adoptado por el frontend": pin ≥ `tracer.36` para el dashboard (necesario para `en_curso`) y pin ≥ `tracer.35` para la evidencia. Mientras esa condición no se cumpla, **no se construye una alternativa ni se simulan las operaciones**: no se deriva el tablero de `listarViajes`/`listarIncidencias`, no se calculan alertas en el cliente y no se llama a `operacion` ni a `reportes` directamente. Subir el pin de `@ai27-tech/contracts` no es parte de este spec y no se hace hasta que el usuario lo pida.

Principios rectores de la historia técnica E8-T17:

- **El frontend solo habla con el `bff`.** No hay clientes escritos a mano como autoridad paralela; los tipos y operaciones salen de `@ai27-tech/contracts`.
- **La descarga es de UN viaje.** No se exportan listados ni se descarga en lote (DEC-023; la exportación de varios viajes queda para V2). El cliente no descarga en V1 (DEC-022 #7).
- **La descarga contiene exactamente lo contratado.** El archivo entregado es el payload `DescargaViaje` tal como lo devolvió el `bff`: la interfaz no agrega, quita, renombra ni deriva campos. El contrato (`additionalProperties: false`) no representa cuenta espejo ni `clave_amago`, y la interfaz no los reintroduce (DEC-009, DEC-039).
- **La auditoría no es de la interfaz.** Cada descarga exitosa la audita `operacion`; la interfaz no escribe auditoría. Por eso una pulsación equivale a una sola solicitud.
- **La proyección atrasada se muestra como atrasada.** `reportes` se alimenta por eventos y puede ir detrás (DEC-033). Una proyección `stale` se marca como tal con su `proyeccion_al` visible; nunca se oculta ni se presenta como fresca, y la interfaz no calcula `stale` ni decide su umbral.
- **La evidencia es opcional y genérica** (DEC-040): sin tipos funcionales obligatorios, sin cantidad mínima y sin guarda de cierre. La evidencia **nunca** bloquea ni modifica el cierre del viaje (E8-T14 no la consulta).
- **La autoridad es el `bff`.** La interfaz esconde lo que el rol no puede hacer (afordancia), pero la negación real (`403` por permiso o alcance; `404` por viaje inexistente, DEC-132) es del `bff` y se clasifica sin romper la vista. El alcance por unidad lo aplica el backend, no la interfaz.

> **Nota de contrato (verificada contra el tag publicado):**
>
> - **Estado del backend (verificado 2026-11-03, después del mensaje de backend a Angel Arredondo; verificado en ramas remotas y tags, NO que esté corriendo):** contexto sigue en `ad3290c` (sin commits nuevos) y el último tag del contrato es `v0.1.0-tracer.36` (sin tag nuevo). `pf-svc-reportes` implementa `en_curso` y ya no acota por tenant a internos (DEC-129). `pf-svc-operacion` (`origin/pf-op-d`, `3d38c9e`, PR #78, pin `tracer.36`) implementa adjuntos (`listarAdjuntos`, `crearIntencionSubidaAdjunto`, `descargarAdjunto`; metadata, auditoría y contrato completos) con un almacén de marcador (`AlmacenStub`, URL de marcador p. ej. `https://almacen.local/viajes/{id}/adjuntos/{aid}?op=subida`). `pf-svc-core` tag `v0.1.2` (PR #50 «cablear adjuntos y reportes en el bff») cablea reportes y adjuntos. Las rutas del `bff` responden SOLO cuando `core v0.1.2` esté DESPLEGADO en el entorno del usuario; lo confirma Fabricio Fuentes. Hasta el despliegue las llamadas reales fallan y el dashboard no tiene datos: esperado, no es un error de la interfaz. Con DEC-129, un usuario interno ve los viajes de TODOS los clientes en el dashboard; es correcto y la interfaz no filtra por tenant.
> - **Contexto:** `ai27-platform-context` en el commit `ad3290c` (antes `3e46bcb`; verificado 2026-11-03). Decisiones citadas: DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060, DEC-129 (los usuarios internos no se acotan por tenant; su límite es el rol y el alcance por unidad) y DEC-132 (un usuario Interno sin permiso sobre un recurso que existe recibe `403`; un Cliente de otra empresa recibe `404`; un recurso inexistente recibe `404` para todos). DT-07: el alcance por unidad del monitoreo no lo aplica todavía ningún servicio; está bloqueada por el vínculo Monitorista–unidades.
> - **Contrato:** `@ai27-tech/contracts@0.1.0-tracer.36` está **publicado** y es el último tag (verificado 2026-11-03). El **pin** del frontend en `package.json` **sigue en `0.1.0-tracer.33`** y no se sube sin que el usuario lo pida; el contrato instalado aún no trae lo nuevo de `tracer.35` ni de `tracer.36`. `descargarViaje` y el schema `DescargaViaje` son idénticos en `tracer.33` y `tracer.35`. **Cambio de `tracer.36` respecto de `tracer.35`:** `reporteViajes` gana el parámetro opcional `en_curso` (boolean) y `desde`/`hasta` pasan de obligatorios a **opcionales**. Sin `en_curso`, `desde` y `hasta` siguen obligatorios (`400` si falta alguno). Con `en_curso=true`, devuelve los viajes en estado **no terminal** sin importar cuándo se crearon; `desde`/`hasta` son opcionales y, si se mandan, se intersecan con la fecha de creación. Los estados terminales (ADR 19: `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27`, `RECHAZADO_POR_CLIENTE`) los deriva el servicio; la interfaz no los copia. `reporteEstados` **no cambia**: `desde` y `hasta` siguen obligatorios. El cambio es compatible en el cable para TypeScript (solo rompe consumidores Go). El resto de `tracer.35` (adjuntos con `nombre`, etc.) no cambia. `@ai27-tech/ui@0.2.0-beta.6`. El checkout local de `pf-pkg-contracts` estaba en la rama `feat/ficha-tecnica-e-historico-tracer21` (`a8fcfb7`) en la verificación anterior.
> - **Descarga (DISPONIBLE en el `bff`):** `GET /api/v1/viajes/{id}/descarga`, `operationId` `descargarViaje`, tag `descarga`. Responde `200` con `DescargaViaje { viaje_id, ficha: FichaTecnicaDescarga { estado, cliente_id?, origen, destinos[{ nombre, numero_envio? }], fecha_hora_servicio?, tipo_servicio? }, bitacora: EntradaBitacoraDescarga[{ texto, autor, ts }], auditoria: RegistroAuditoriaDescarga[{ entidad, actor, ts }], generado_en }`, con `additionalProperties: false` en todos los objetos. Errores `401`, `403` (fuera de alcance, antes de componer nada) y `404`. Devuelve JSON. Formato de V1 confirmado (comunicado por el backend/Producto, 2026-11-03, pendiente de registro como DEC): JSON con nombre de archivo `expediente-<viaje_id>.json`; CSV/XLSX quedan para V2 (Pregunta abierta 3, resuelta). Los tipos `descargarViaje` y `DescargaViaje` ya están en el paquete instalado en `node_modules`.
> - **Dashboard (BRECHA 1: CERRADA EN CONTRATO por `tracer.35`, ampliada en `tracer.36`):** `reporteViajes` (`GET /api/v1/reportes/viajes`, query `en_curso` opcional y `desde`/`hasta` obligatorios solo cuando no se manda `en_curso`; respuestas `200`/`400`/`401`/`403`) y `reporteEstados` (`GET /api/v1/reportes/estados`; `200`/`401`/`403`) están en `bff.yaml`, con los schemas `FilaViaje`, `ReporteViajes`, `ConteoEstado` y `ReporteEstados` idénticos a los de `reportes.yaml`. `ReporteViajes { filas: FilaViaje[{ viaje_id, cliente_id?, estado, creado_en?, cerrado_en? }], total, proyeccion_al? (nullable), stale? (boolean) }`; `ReporteEstados { conteos[{ estado, conteo, permanencia_promedio_seg? }], proyeccion_al?, stale? }`. Responden `200` a `monitorista`, `supervisor`, `coordinador` y `administrador`, y `403` a `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente`. El contrato documenta que, si `stale` falta, el consumidor lo trata como frescura no informada, nunca como fresca; el servicio `reportes` además envía `stale` siempre. **RESIDUOS (actualizados 2026-11-03):** (a) incidencias y alertas **no existen** en el schema (`FilaViaje` y `ConteoEstado` no cambiaron); sigue abierto (Pregunta abierta 1); (b) `FilaViaje` no trae unidad: el alcance por unidad solo está declarado en las descripciones y no se aplica de extremo a extremo (DT-07); sigue abierto; (c) el `bff` (`pf-svc-bff`, rutas mergeadas en PR #62 y #63) y `reportes` están **terminados y taggeados**: `pf-svc-core` `v0.1.2` (PR #50) cablea reportes y adjuntos; **falta el despliegue de `core v0.1.2`** en el entorno del usuario (lo confirma Fabricio Fuentes), y hasta entonces las rutas no responden con datos y el dashboard no tiene datos (esperado, no es un error de la interfaz); (d) `pf-svc-reportes` ya implementa DEC-129 (PR #22; los internos ven datos de todos los clientes y la interfaz no filtra por tenant), rechaza al cliente con `403` (PR #23) e implementa el filtro `en_curso` (PR #25), y ya no acota por tenant a internos; (e) el residuo del filtro «viajes en curso» (DT-10) queda **CERRADO** en contrato (`tracer.36`) y en `reportes`; (f) siguen abiertos incidencias/alertas (Pregunta abierta 1, probablemente resuelta como V1 = viajes y estatus, falta confirmación explícita), la unidad (DT-07) y qué mostrar de conteos por estado en la vista por defecto, porque `reporteEstados` exige `desde`/`hasta` y `en_curso` no los necesita (Pregunta abierta 9).
> - **Evidencia (BRECHA 2: CERRADA EN CONTRATO por `tracer.35`):** `listarAdjuntos` (`GET /api/v1/viajes/{id}/adjuntos` → `PaginaAdjuntos { items: Adjunto[{ id, viaje_id, nombre, tipo_medio, tamano_bytes, checksum_sha256?, estado_escaneo (pendiente|limpio|infectado), creado_en }] }`), `crearIntencionSubidaAdjunto` (`POST /api/v1/viajes/{id}/adjuntos/intenciones-subida`, cuerpo `IntencionSubidaAdjuntoEntrada { nombre, tipo_medio, tamano_bytes, checksum_sha256 }` con los cuatro campos obligatorios y el checksum en SHA-256 hexadecimal de 64 caracteres → `201 { adjunto_id, url_subida, expira_en }`) y `descargarAdjunto` (`GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga` → `{ url_descarga, expira_en }`; un adjunto no `limpio` no autoriza descarga) están en `bff.yaml` con respuestas `200`/`201`, `400`, `401`, `403` y `404`. `Adjunto.nombre` es obligatorio (`minLength` 1). El autor del adjunto queda **fuera de V1** (DT-11 según el contrato). `PaginaAdjuntos` **no pagina** en V1 (DT-08 según el contrato). El `estado_escaneo` se refresca releyendo `listarAdjuntos` (sondeo HTTP); no hay evento de empuje. Los bytes no pasan por el servicio: la subida y la descarga usan una URL de vida corta del object storage (propuesta ADR 32). **RESIDUOS (actualizados 2026-11-03):** `pf-svc-operacion` (`origin/pf-op-d`, `3d38c9e`, PR #78, pin `tracer.36`) **ya implementa adjuntos** (metadata, auditoría y contrato completos) con un **almacén de marcador** (`AlmacenStub`): no mueve bytes reales. El almacén real (MinIO, ADR 32) y el escaneo antivirus son **deuda fuera de V1**. `pf-svc-core` `v0.1.2` (PR #50) cablea adjuntos en el `bff`; falta su despliegue. Por eso la evidencia se construye **contra el contrato (probada con MSW) y no es funcional de punta a punta**: una subida o descarga real no llega a un archivo, y el backend avisará cuándo se desbloquee. Faltan las definiciones de Plataforma (CORS/CSP del object storage) y de Seguridad/Legal (formatos y tamaño máximo), que bloquean la evidencia real, no la construcción. Hallazgo de conflicto: todo adjunto nace `pendiente` en `operacion`, nada lo mueve (no hay escáner) y `Descargar` no bloquea por estado de escaneo, mientras el contrato dice que un adjunto no `limpio` no autoriza descarga (Pregunta abierta 10). El contrato no documenta códigos de rechazo por formato, tamaño o cantidad (solo un `400` genérico) ni las cabeceras exigidas del `PUT` firmado; los límites los define Seguridad/Legal y CORS/CSP se coordinan con Plataforma.
> - **Observación de gobierno:** el changelog de `tracer.35` cita DT-08, DT-10 (filtro "viajes en curso", urgente, en `reportes`), DT-11 y una "Decisión de Producto P5 (E8-T17)". Ninguna de ellas está registrada en `ai27-platform-context` (sigue en `ad3290c`, sin commits nuevos al 2026-11-03): son **citadas por el contrato, pendientes de registro en el repo de contexto**, y no se tratan como decididas. DT-10 está **realizada** en el contrato `tracer.36` y en `pf-svc-reportes`, pero sigue sin registro en el contexto.
> - **Decisiones de Producto comunicadas por Fabricio Fuentes (mensaje del 2026-11-03; comunicadas por Fabricio Fuentes, pendientes de registro como DEC; no registradas aún en `ai27-platform-context`):**
>   - (a) El dashboard se abre con `en_curso=true` como vista por defecto («viajes en curso» primero) y no manda `desde`/`hasta`; para la vista por rango se usa «últimos 7 días».
>   - (b) Se conservan y muestran `proyeccion_al` y `stale`; si no llega `stale`, se muestra «frescura no informada», nunca fresco (confirmado).
>   - (c) La entrada «Reportes» del menú se oculta a `reaccion`, `jefe_operativo` y `ejecutivo` (se coordina con E8-T4).
>   - (d) Acceso solo para `monitorista`, `supervisor`, `coordinador` y `administrador`; el resto recibe `403`.
>   - (e) El adjunto trae `nombre` obligatorio al subir y el autor queda fuera de V1 (confirmado).
>   - (f) La evidencia se deja PREPARADA contra el contrato, sin darla por funcional de punta a punta. Instrucción del backend (2026-11-03): empezar por el dashboard, que se puede cerrar completo; la evidencia se deja preparada contra el contrato. Operacion ya implementa adjuntos con almacén de marcador; siguen pendientes las definiciones de Plataforma (CORS/CSP del object storage) y de Seguridad/Legal (formatos y tamaño máximo).
>   - (g) Descarga del expediente en V1: JSON con nombre `expediente-<viaje_id>.json`; CSV/XLSX para V2 (comunicada por el backend/Producto, 2026-11-03, pendiente de registro como DEC).
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
- **Brecha 1 / Brecha 2**: ausencia en `bff.yaml` de las operaciones de reportes (dashboard) y de adjuntos (evidencia), respectivamente. Ambas quedaron cerradas en contrato (`tracer.35`; el dashboard se amplía en `tracer.36`); subsisten residuos y la adopción del pin. Ver Nota de contrato.
- **Pin**: versión de `@ai27-tech/contracts` que fija el frontend en `package.json` (hoy `0.1.0-tracer.33`; objetivo `0.1.0-tracer.36`, que cubre dashboard y evidencia).
- **En curso**: viaje en un estado no terminal según la máquina de estados (ADR 19). Lo decide el servicio al recibir `en_curso=true`; la interfaz no copia ni deriva la lista de estados terminales.
- **Almacén de marcador**: `AlmacenStub` de `operacion` en V1. Emite URL de marcador (p. ej. `https://almacen.local/viajes/{id}/adjuntos/{aid}?op=subida`) y no mueve bytes reales; el almacén real (MinIO, ADR 32) y el escaneo antivirus son deuda fuera de V1.
- **Sondeo**: relectura periódica de `listarAdjuntos` para refrescar el estado de escaneo de los adjuntos, porque no hay evento de empuje.
- **403 / 404 (DEC-132)**: `403` es el rechazo por falta de permiso o alcance de un usuario Interno sobre un recurso que existe; `404` significa recurso inexistente (viaje inexistente).
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance y rol y reenvía a los servicios.
- **AppShell**: estructura de navegación y sesión del panel interno (E8-T4).

## Requirements

### Requirement 1: Acceso por rol y alcance

**User Story:** Como usuario interno de monitoreo, quiero ver las entradas de dashboard, descarga y evidencia solo cuando mi rol las permite, para no encontrar gestos que el sistema me va a negar.

#### Acceptance Criteria

1. WHERE el rol efectivo de la sesión es `monitorista`, `supervisor`, `coordinador` o `administrador`, THE Panel_UI SHALL ofrecer la entrada al Dashboard, el gesto de descarga del expediente y la sección de evidencia del viaje.
2. WHERE el rol efectivo de la sesión es `jefe_operativo`, `ejecutivo` o `reaccion`, THE Panel_UI SHALL NOT ofrecer ninguna de las tres capacidades.
3. THE Panel_UI SHALL derivar la visibilidad de cada afordancia del rol efectivo de la sesión del panel interno y SHALL tratar la decisión del `bff` como autoridad final, aunque la interfaz haya mostrado u ocultado el gesto.
4. THE Panel_UI SHALL NOT filtrar, recortar ni ampliar por su cuenta el conjunto de viajes o de unidades que el `bff` entrega según el alcance del usuario. _(Nota: por DEC-129, `reportes` ya no acota por tenant a los usuarios internos; el dashboard muestra viajes de todos los clientes. Es correcto, no es un error de alcance, y la interfaz no filtra por tenant.)_
5. WHEN el `bff` responde `403` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL mostrar un mensaje de autorización insuficiente (sin permiso o fuera de alcance), sin romper la vista ni mostrar datos parciales de la respuesta.
6. WHEN el `bff` responde `404` a una solicitud sobre un viaje, THE Panel_UI SHALL mostrar un mensaje de viaje inexistente (DEC-132: el rechazo por permiso o alcance de un usuario Interno es `403`, no `404`).
7. THE Panel_UI SHALL NOT ofrecer ninguna de las tres capacidades al rol `cliente` (el portal del cliente es otra aplicación; el cliente no descarga en V1, DEC-022 #7).
8. WHERE el rol efectivo es `reaccion`, `jefe_operativo` o `ejecutivo`, THE AppShell SHALL NOT mostrar la entrada «Reportes» en la navegación (afordancia coordinada con E8-T4; la negación real sigue siendo el `403` del `bff`). Decisión comunicada por Fabricio Fuentes, pendiente de registro como DEC. El destino de la entrada para `monitorista`, `supervisor`, `coordinador` y `administrador` sigue abierto, sin definir (Pregunta abierta 6, parte pendiente); este criterio solo fija quién no ve la entrada, no a dónde lleva.

### Requirement 2: Dashboard de monitoreo [Contrato `tracer.36` adoptado; V1 = viajes y estatus (DEC-136); pendiente de verificación E2E con el despliegue de core]

**User Story:** Como Monitorista, quiero un tablero con viajes, incidencias, alertas y estatus de mis unidades, para monitorear los servicios en curso y tomar decisiones.

#### Acceptance Criteria

1. WHERE la operación `reporteViajes` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN Dashboard_UI se monta, THE Dashboard_UI SHALL solicitar al `bff` la proyección de viajes con `en_curso=true` y SIN `desde`/`hasta`, usando el cliente de `@ai27-tech/contracts`.
2. WHERE la operación `reporteEstados` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.36`), THE Dashboard_UI SHALL enviar siempre `desde` y `hasta` en esa solicitud, porque `reporteEstados` los exige y no admite `en_curso`; su uso en la vista por defecto queda sujeto a la Pregunta abierta 9 y la interfaz no inventa ese comportamiento.
3. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), THE Dashboard_UI SHALL mostrar al menos viajes, incidencias, alertas y estatus, con el detalle de cada indicador que defina Producto (ver Preguntas abiertas 1 y 2); los indicadores que el schema publicado no entregue (incidencias y alertas) quedan sujetos a la decisión de Producto de la Pregunta abierta 1.
4. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), THE Dashboard_UI SHALL mostrar únicamente los datos que el `bff` entrega, acotados por el alcance que el `bff` aplica al usuario.
5. THE Dashboard_UI SHALL NOT calcular en el cliente alertas, incidencias ni cifras que el `bff` no entregue, y SHALL NOT derivar el tablero de `listarViajes` ni de `listarIncidencias`.
6. THE Dashboard_UI SHALL NOT mostrar un mapa en vivo (V1 no tiene telemetría; ADR 20).
7. THE Dashboard_UI SHALL NOT ofrecer exportar, descargar ni imprimir listados de varios viajes (DEC-023).
8. WHILE el `bff` no ha respondido a la solicitud del dashboard, THE Dashboard_UI SHALL mostrar un estado de carga diferenciado del estado vacío y del estado de error.
9. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), IF la respuesta no contiene viajes dentro del alcance y el periodo, THEN THE Dashboard_UI SHALL mostrar un estado "sin viajes" diferenciado del estado de carga y del estado de error.
10. IF la solicitud del dashboard falla por un error que no es de sesión ni de autorización, THEN THE Dashboard_UI SHALL mostrar un error con una acción de reintento.
11. WHERE las operaciones del dashboard NO estén disponibles en el contrato adoptado por el frontend (pin < `tracer.36`), THE Dashboard_UI SHALL conservar el estado actual del stub de `/monitoreo/dashboard` sin presentar cifras inventadas ni servidas por mocks como si fueran datos reales.
12. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), THE Dashboard_UI SHALL tener como vista por defecto «viajes en curso» (`reporteViajes` con `en_curso=true`, sin `desde`/`hasta`). Decisión comunicada por Fabricio Fuentes, pendiente de registro como DEC.
13. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN el usuario elige la vista por rango («últimos 7 días»), THE Dashboard_UI SHALL enviar `desde` y `hasta` (ambos) y SHALL NOT enviar `en_curso`.
14. THE Dashboard_UI SHALL NOT enviar `reporteViajes` sin `en_curso` y sin `desde`/`hasta`, porque el `bff` responde `400`.
15. THE Dashboard_UI SHALL NOT copiar ni derivar la lista de estados terminales; qué viaje está «en curso» lo decide el servicio.
16. IF el `bff` aún no sirve la ruta del dashboard o responde vacío por no estar desplegado, THEN THE Dashboard_UI SHALL mostrar el estado «sin viajes» como ante cualquier respuesta vacía, sin presentarlo como falla (el vacío esperado antes del despliegue no es un error de la interfaz).

### Requirement 3: Frescura de la proyección del dashboard [Contrato `tracer.36` adoptado; pendiente de verificación E2E con el despliegue de core]

**User Story:** Como Monitorista, quiero saber cuándo la información del tablero va atrasada, para no tomar decisiones con datos viejos creyendo que son actuales.

#### Acceptance Criteria

1. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN la respuesta trae `stale` igual a `true`, THE Dashboard_UI SHALL marcar la proyección como atrasada (stale) de forma visible y SHALL mostrar el valor de `proyeccion_al`.
2. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN la respuesta trae `stale` igual a `false`, THE Dashboard_UI SHALL mostrar la proyección sin marca de atraso.
3. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN la respuesta trae `proyeccion_al` igual a `null`, THE Dashboard_UI SHALL mostrar el mensaje "sin datos aplicados aún" en lugar de una fecha.
4. THE Dashboard_UI SHALL NOT calcular `stale` ni decidir el umbral de atraso; el valor lo entrega el `bff`.
5. THE Dashboard_UI SHALL NOT ocultar una proyección `stale` ni presentarla con el mismo aspecto que una fresca.
6. WHERE las operaciones del dashboard estén disponibles en el contrato adoptado por el frontend (pin ≥ `tracer.36`), WHEN la respuesta no trae el campo `stale`, THE Dashboard_UI SHALL tratar la frescura como no informada y SHALL NOT presentar la proyección como fresca (el contrato `tracer.35` documenta que, si `stale` falta, el consumidor lo trata como frescura no informada, nunca como fresca).

### Requirement 4: Descarga del expediente de un viaje [DISPONIBLE; formato JSON confirmado]

**User Story:** Como Monitorista, quiero descargar el expediente de un viaje de mis unidades, para contar con la ficha y el histórico fuera de la plataforma y responder a una disputa.

#### Acceptance Criteria

1. WHERE el rol efectivo permite la descarga (Requirement 1), THE Descarga_UI SHALL ofrecer la acción "Descargar expediente" en el detalle del viaje.
2. WHEN el usuario activa la acción de descarga, THE Descarga_UI SHALL enviar una sola solicitud `descargarViaje` al `bff` para el viaje mostrado.
3. WHILE la solicitud de descarga está en curso, THE Descarga_UI SHALL mostrar el estado "en preparación" y SHALL deshabilitar la acción para impedir una segunda solicitud.
4. WHEN el `bff` responde `200`, THE Descarga_UI SHALL entregar al usuario un archivo cuyo contenido es exactamente el payload `DescargaViaje` recibido, serializado como JSON (formato de V1 confirmado; Pregunta abierta 3, resuelta).
5. THE Descarga_UI SHALL NOT agregar, quitar, renombrar ni derivar campos del payload al construir el archivo, y SHALL NOT incluir cuenta espejo ni `clave_amago` (DEC-009, DEC-039).
6. WHEN el `bff` responde `200`, THE Descarga_UI SHALL mostrar un aviso de éxito y rehabilitar la acción.
7. IF el `bff` responde `403`, THEN THE Descarga_UI SHALL informar autorización insuficiente (sin permiso o fuera de alcance), SHALL NOT generar archivo y SHALL NOT mostrar datos del expediente.
8. IF el `bff` responde `404`, THEN THE Descarga_UI SHALL informar que el viaje no existe (DEC-132) y SHALL NOT generar archivo.
9. IF el `bff` responde `401`, THEN THE Descarga_UI SHALL delegar el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.
10. IF la solicitud falla por un error de red o un error no clasificado, THEN THE Descarga_UI SHALL mostrar un error accionable con reintento, SHALL NOT generar archivo y SHALL rehabilitar la acción.
11. THE Descarga_UI SHALL NOT escribir ni simular registros de auditoría; la auditoría de cada descarga exitosa la escribe `operacion`.
12. THE Descarga_UI SHALL limitar la descarga a un solo viaje por solicitud, SHALL NOT ofrecer descarga de listados ni en lote y SHALL NOT ofrecerla al cliente.
13. THE Descarga_UI SHALL entregar el archivo en JSON con el nombre `expediente-<viaje_id>.json` y SHALL NOT ofrecer otros formatos (CSV/XLSX quedan para V2). Decisión comunicada por el backend/Producto, pendiente de registro como DEC.

### Requirement 5: Evidencia del viaje [Contrato disponible; construible contra el contrato, no funcional de punta a punta]

**User Story:** Como Monitorista, quiero adjuntar y consultar evidencia de un viaje, para respaldar lo ocurrido durante el servicio.

#### Acceptance Criteria

1. WHERE la operación `listarAdjuntos` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.35`), WHEN Evidencia_UI se monta con un identificador de viaje, THE Evidencia_UI SHALL solicitar al `bff` los adjuntos del viaje y SHALL mostrar de cada uno su `nombre` (identificador del archivo; el autor queda fuera de V1), tipo de medio, tamaño, estado de escaneo y fecha de creación, tal como los entrega el `bff`.
2. WHERE la operación `listarAdjuntos` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.35`), IF el viaje no tiene adjuntos, THEN THE Evidencia_UI SHALL mostrar un estado "sin evidencia" diferenciado del estado de carga y del estado de error.
3. WHERE la operación `crearIntencionSubidaAdjunto` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.35`), WHEN el usuario elige un archivo para adjuntar, THE Evidencia_UI SHALL calcular en el navegador el SHA-256 del archivo y SHALL enviar al `bff` la intención de subida con `nombre` (nombre del archivo elegido), `tipo_medio`, `tamano_bytes` y `checksum_sha256`, los cuatro obligatorios.
4. WHERE la operación `crearIntencionSubidaAdjunto` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.35`), WHEN el `bff` responde `201` con `url_subida` y `expira_en`, THE Evidencia_UI SHALL subir el archivo directamente a la URL de vida corta, sin pasar los bytes por el `bff`.
5. WHEN la subida termina correctamente, THE Evidencia_UI SHALL refrescar la lista de adjuntos y SHALL mostrar el adjunto nuevo con el estado de escaneo que el `bff` entregue.
6. IF la subida falla o la URL de subida expira antes de completarse, THEN THE Evidencia_UI SHALL informar el fallo, SHALL NOT presentar el adjunto como registrado y SHALL permitir reintentar solicitando una nueva intención de subida.
7. WHERE la operación `descargarAdjunto` esté disponible en el contrato adoptado por el frontend (pin ≥ `tracer.35`), WHEN el usuario pide consultar o descargar un adjunto con `estado_escaneo` igual a `limpio`, THE Evidencia_UI SHALL solicitar la autorización de descarga al `bff` y SHALL abrir la `url_descarga` recibida antes de su `expira_en`.
8. WHILE un adjunto tiene `estado_escaneo` igual a `pendiente` o `infectado`, THE Evidencia_UI SHALL mostrar su estado de escaneo y SHALL NOT ofrecer la acción de descarga o consulta de ese adjunto. _(Sujeto a la Pregunta abierta 10; pendiente de confirmar.)_
9. THE Evidencia_UI SHALL NOT persistir `url_subida` ni `url_descarga` (ni en almacenamiento local, ni en caché, ni en el estado de la aplicación más allá del uso inmediato) y SHALL pedir una nueva autorización cuando la anterior haya expirado.
10. IF el `bff` rechaza la intención de subida por formato, tamaño o cantidad, THEN THE Evidencia_UI SHALL comunicar el rechazo con el mensaje aprobado y SHALL NOT definir ni aplicar por su cuenta formatos permitidos ni límites (los define Seguridad/Legal; Pregunta abierta 4).
11. THE Evidencia_UI SHALL tratar la evidencia como opcional y genérica: SHALL NOT exigir un tipo funcional de evidencia, SHALL NOT exigir una cantidad mínima de archivos y SHALL NOT mostrar la ausencia de evidencia como una falta o una advertencia.
12. THE Evidencia_UI SHALL NOT condicionar, bloquear ni modificar el cierre del viaje con base en la presencia o ausencia de evidencia.
13. THE Evidencia_UI SHALL NOT escribir ni simular registros de auditoría de acceso a la evidencia; la auditoría la escribe el backend.
14. WHERE las operaciones de adjuntos NO estén disponibles en el contrato adoptado por el frontend (pin < `tracer.35`), THE Evidencia_UI SHALL NOT llamar a `operacion` directamente ni presentar una lista o una subida simuladas como si fueran reales.
15. WHILE exista al menos un adjunto con `estado_escaneo` igual a `pendiente`, THE Evidencia_UI SHALL releer `listarAdjuntos` por sondeo para refrescar el estado de escaneo, porque no hay evento de empuje; el intervalo no lo define el contrato (valor de trabajo configurable, pendiente de confirmar) y el sondeo se detiene cuando ningún adjunto está pendiente. _(Sujeto a la Pregunta abierta 10; pendiente de confirmar: sin escáner ningún adjunto sale de `pendiente`.)_
16. WHILE el almacén de objetos sea el de marcador de V1 (sin MinIO ni escaneo), THE Evidencia_UI SHALL NOT presentarse como funcional de punta a punta: la subida y la descarga reales no llegan a un archivo; la interfaz solo consume el contrato y comunica los rechazos del backend sin inventar límites.

### Requirement 6: Estados y errores transversales

**User Story:** Como operador interno, quiero señales claras de carga, vacío y error con reintento y que mi sesión se maneje de forma uniforme, para saber qué ocurre en cada una de estas pantallas.

#### Acceptance Criteria

1. WHEN el `bff` responde `401` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL delegar el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.
2. WHEN el `bff` responde `403` a cualquier solicitud de Panel_UI, THE Panel_UI SHALL mostrar el mensaje de autorización insuficiente (sin permiso o fuera de alcance) definido en el Requirement 1.
3. WHEN el `bff` responde `404` a una solicitud sobre un viaje, THE Panel_UI SHALL mostrar el mensaje de viaje inexistente definido en el Requirement 1 (DEC-132).
4. IF una solicitud falla por un error de red o un error no clasificado, THEN THE Panel_UI SHALL mostrar un error accionable con reintento y SHALL conservar el resto de la vista operativa.
5. THE Panel_UI SHALL diferenciar visualmente los estados de carga, vacío y error de cada bloque.
6. THE Panel_UI SHALL construir sus elementos con los componentes de `@ai27-tech/ui` y SHALL cumplir los criterios de accesibilidad de esos componentes (foco visible, nombre accesible en los controles, estados anunciables).
7. WHEN una descarga o una subida termina correctamente, THE Panel_UI SHALL mostrar un aviso de éxito mediante el componente de avisos de `@ai27-tech/ui`.

## Escenarios

### Escenarios positivos

**Escenario 1. Descarga dentro del alcance** _(Disponible)_  
Dado que el usuario es Monitorista con la unidad U1 asignada y abre el detalle de un viaje de U1, cuando pulsa "Descargar expediente", entonces la interfaz envía una sola solicitud `descargarViaje`, muestra "en preparación" mientras espera y, al recibir `200`, entrega un archivo JSON llamado `expediente-<viaje_id>.json` con exactamente el payload recibido (ficha, bitácora, auditoría y `generado_en`), sin cuenta espejo ni `clave_amago`, y muestra un aviso de éxito. La auditoría la registra `operacion`.

**Escenario 2. Dashboard acotado a U1 y U2** _(Contrato disponible; pendiente de pin y backend)_  
Dado que el usuario es Monitorista con las unidades U1 y U2 y las operaciones de reportes están disponibles en el contrato adoptado (pin ≥ `tracer.36`) y servidas por el `bff`, cuando abre `/monitoreo/dashboard`, entonces la interfaz muestra viajes, incidencias, alertas y estatus únicamente con los datos que el `bff` entrega para U1 y U2, sin filtrar ni ampliar en el cliente y sin mapa.

**Escenario 3. Adjuntar y consultar evidencia** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta; la consulta de un adjunto depende de la Pregunta abierta 10)_  
Dado que las operaciones de adjuntos están disponibles en el contrato adoptado (pin ≥ `tracer.35`) y servidas por el `bff`, y el usuario autorizado abre un viaje de su alcance, cuando elige un archivo, entonces la interfaz calcula su SHA-256, solicita la intención de subida, sube el archivo a la URL de vida corta, refresca la lista y muestra el adjunto con su estado de escaneo; cuando el adjunto está `limpio` y el usuario pide consultarlo, la interfaz solicita la autorización de descarga y abre la URL recibida antes de que expire.

### Escenarios negativos

**Escenario 4. Monitorista descarga viaje de unidad ajena** _(Disponible)_  
Dado que el usuario es Monitorista y abre (por enlace directo) un viaje de una unidad que no tiene asignada, cuando pulsa "Descargar expediente", entonces el `bff` responde `403` antes de componer datos (el viaje existe, pero el usuario no tiene permiso o está fuera de su alcance; DEC-132), y la interfaz informa autorización insuficiente, sin generar archivo y sin mostrar datos del expediente.

**Escenario 5. Roles sin acceso** _(Disponible / Contrato disponible)_  
Dado que el usuario es Jefe Operativo, Ejecutivo o Reacción, cuando navega el panel, entonces la interfaz no ofrece el dashboard, la descarga del expediente ni la evidencia; si de algún modo emitiera la solicitud, el `bff` responde `403` y la interfaz lo clasifica sin romper la vista.

**Escenario 6. Intento de descarga de listado** _(Disponible)_  
Dado que el usuario observa un listado de viajes, cuando busca una acción para exportar o descargar varios viajes, entonces la interfaz no ofrece ninguna: la descarga existe solo por viaje desde su detalle (DEC-023).

**Escenario 7. Viaje inexistente** _(Disponible)_  
Dado que el usuario solicita la descarga de un viaje que no existe, cuando el `bff` responde `404`, entonces la interfaz informa viaje inexistente y no genera archivo (DEC-132: un viaje que existe pero está fuera del alcance del usuario Interno responde `403`, como en el Escenario 4).

### Escenarios de borde

**Escenario 8. Proyección atrasada** _(Contrato disponible; pendiente de pin `tracer.36` y backend)_  
Dado que el `bff` entrega el dashboard con `stale` igual a `true` y un `proyeccion_al` anterior, cuando la interfaz lo muestra, entonces lo marca como atrasada con `proyeccion_al` visible; no lo oculta ni lo presenta como fresco.

**Escenario 9. Sin datos aplicados** _(Contrato disponible; pendiente de pin `tracer.36` y backend)_  
Dado que el `bff` entrega `proyeccion_al` igual a `null`, cuando la interfaz muestra el dashboard, entonces indica "sin datos aplicados aún" en lugar de una fecha.

**Escenario 10. Doble clic en Descargar** _(Disponible)_  
Dado que el usuario pulsa dos veces seguidas "Descargar expediente", cuando la primera solicitud sigue en curso, entonces la interfaz deshabilita la acción y envía una sola solicitud, de modo que `operacion` registra una sola auditoría.

**Escenario 11. Sesión expirada durante la descarga** _(Disponible)_  
Dado que la sesión expira durante la solicitud, cuando el `bff` responde `401`, entonces la interfaz delega el manejo al flujo de sesión del AppShell en lugar de mostrar un error genérico.

**Escenario 12. Falla de red durante la descarga** _(Disponible)_  
Dado que la red falla durante la solicitud, cuando ocurre el error, entonces la interfaz muestra un error con reintento, no genera archivo y rehabilita la acción.

**Escenario 13. Viaje sin evidencia cierra normalmente** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta)_  
Dado que un viaje no tiene adjuntos, cuando el usuario autorizado lo cierra conforme a E8-T14, entonces la interfaz de evidencia muestra "sin evidencia" sin advertencia y el cierre procede sin consultar la evidencia.

**Escenario 14. Adjunto pendiente o infectado** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta)_  
Dado que un adjunto tiene `estado_escaneo` igual a `pendiente` o `infectado`, cuando el usuario observa la lista, entonces la interfaz muestra ese estado y no ofrece descarga ni consulta de ese adjunto; un adjunto `pendiente` se refresca por sondeo de `listarAdjuntos` hasta que su estado cambia a `limpio` o `infectado` _(sujeto a la Pregunta abierta 10: sin escáner ningún adjunto sale de `pendiente`)_.

**Escenario 15. URL de vida corta expirada** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta)_  
Dado que el usuario obtuvo una autorización de descarga y no la usó antes de `expira_en`, cuando intenta abrirla de nuevo, entonces la interfaz no reutiliza la URL anterior y solicita una nueva autorización.

**Escenario 16. Subida rechazada por formato o tamaño** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta)_  
Dado que el `bff` rechaza la intención de subida por formato o tamaño, cuando la interfaz recibe el rechazo, entonces lo comunica con el mensaje aprobado, no presenta el adjunto como registrado y no aplica límites propios.

**Escenario 17. El cierre del viaje no consulta evidencia** _(Contrato disponible; construible contra el contrato, no funcional de punta a punta)_  
Dado que existen o no adjuntos en un viaje, cuando se ejecuta o se evalúa el cierre del viaje, entonces ni el resultado ni la disponibilidad del gesto de cierre dependen de la evidencia.

**Escenario 18. Vista por defecto: viajes en curso** _(Contrato disponible; pendiente de pin `tracer.36` y backend)_ — positivo  
Dado que el usuario es Monitorista y `reporteViajes` está disponible en el contrato adoptado (pin ≥ `tracer.36`) y servido por el `bff`, cuando abre `/monitoreo/dashboard`, entonces la interfaz solicita `reporteViajes` con `en_curso=true` y sin `desde`/`hasta`, y muestra los viajes en curso que el `bff` entrega, con `proyeccion_al` y `stale` (o «frescura no informada» si `stale` no llega), sin decidir en el cliente qué estados son terminales (Decisión comunicada por Fabricio Fuentes, pendiente de registro como DEC).

**Escenario 19. Vista por rango: últimos 7 días** _(Contrato disponible; pendiente de pin `tracer.36` y backend)_ — positivo  
Dado que el usuario está en el dashboard con `reporteViajes` disponible (pin ≥ `tracer.36`), cuando elige la vista por rango «últimos 7 días», entonces la interfaz solicita `reporteViajes` con `desde` y `hasta` (ambos) y sin `en_curso`, y muestra la respuesta del `bff` sin filtrar ni ampliar en el cliente.

**Escenario 20. Dashboard vacío antes del despliegue del bff** _(Borde)_  
Dado que las rutas del dashboard están mergeadas en el `bff` pero aún no desplegadas, cuando el dashboard recibe una respuesta vacía, entonces la interfaz muestra el estado «sin viajes» como ante cualquier respuesta vacía, sin presentarlo como falla de la interfaz.

## Dependencias

- `E6-HU-025`, `E6-HU-026`, `E6-HU-027`: comportamiento funcional (estado: borrador, pendiente de validación) del dashboard, la descarga y la evidencia.
- E8-T4 (AppShell, sesión y navegación): provee la entrada de navegación, el rol efectivo y el flujo de sesión ante `401`. La historia técnica E8-T17 declara dependencia de E8-T4, `E6-T2`, `E6-T3` y `E6-T4`.
- E8-T8 (detalle del viaje): desde ahí se descarga el expediente y se gestiona la evidencia.
- E8-T13 (histórico): su bitácora es parte del contenido del expediente descargado (`E1-HU-009`).
- E8-T14 (cierre del viaje): no consulta la evidencia (DEC-040).
- `E4-HU-017/018` (acceso, roles y alcance) y el vínculo del Monitorista con sus unidades (pendiente heredado de DEC-045): condicionan lo que el dashboard y la descarga muestran; lo resuelve el backend (Pregunta abierta 7). DT-07: el alcance por unidad del monitoreo no lo aplica todavía ningún servicio y está bloqueada por ese vínculo.
- DEC-009 y DEC-039 (sin cuenta espejo ni `clave_amago`), DEC-022 #7 y #9 (cliente no descarga; Reacción sin dashboard, expedientes ni evidencia), DEC-023 (sin exportar listados), DEC-033 (reportes por eventos, puede ir atrasado), DEC-040 (evidencia opcional y genérica), DEC-045 y DEC-060 (roles y reparto de facultades), DEC-129 (lecturas internas sin acotar por tenant; implementada en `pf-svc-reportes`) y DEC-132 (`403` por permiso o alcance de un usuario Interno; `404` por recurso inexistente).
- Contrato generado y componentes de `@ai27-tech`: se verifican antes de implementar, conforme a la Nota de brechas y a `BRECHAS.md`. El pin objetivo es `@ai27-tech/contracts@0.1.0-tracer.36` (cubre dashboard y evidencia); subirlo lo hace el usuario cuando lo pida.
- **Despliegue de `pf-svc-core v0.1.2` (dependencia externa):** cablea reportes y adjuntos en el `bff` (PR #50). Las rutas responden solo cuando esté desplegado en el entorno del usuario; lo confirma Fabricio Fuentes. Hasta entonces el dashboard no tiene datos (esperado). «Taggeado» no equivale a «desplegado».
- **Pin objetivo `tracer.36`:** lo sube el usuario cuando lo pida (el backend ya lo solicitó en su mensaje).
- **Evidencia, construible contra el contrato y no funcional de punta a punta:** `pf-svc-operacion` ya implementa adjuntos con almacén de marcador (`AlmacenStub`). El almacén real (MinIO, ADR 32) y el escaneo antivirus son deuda fuera de V1; el backend avisará cuándo se desbloquee. Las definiciones de Plataforma (CORS/CSP del object storage) y de Seguridad/Legal (formatos y tamaño máximo) bloquean la evidencia real, no la construcción. El tratamiento de adjuntos `pendiente` depende de la Pregunta abierta 10 (Producto, Seguridad/Legal, Contratos y `operacion`).
- **DT-10 («viajes en curso»):** realizada en el contrato `tracer.36` y en `pf-svc-reportes` (PR #25), pero sin registro en `ai27-platform-context` (sigue en `ad3290c`). Las decisiones (a) a (f) comunicadas por Fabricio Fuentes siguen pendientes de registro como DEC.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`, `reportes` u `operacion`; en particular, proyectar al `bff` las operaciones de reportes y de adjuntos (Brechas 1 y 2). Subir el pin de `@ai27-tech/contracts` tampoco es parte de este spec hasta que el usuario lo pida.
- Exportar o descargar listados de varios viajes, en Excel/CSV o cualquier formato (DEC-023, V2).
- Descarga del expediente por el cliente (DEC-022 #7).
- Mapa en vivo en el dashboard (ADR 20, V1 sin telemetría).
- Derivar el tablero de `listarViajes` o `listarIncidencias`, y calcular alertas, incidencias o frescura en el cliente.
- El dashboard propio del Jefe Operativo (E8-T20, `E6-HU-033`).
- Formatos de descarga distintos de JSON (CSV/XLSX y otros): quedan para V2. El formato JSON y el nombre `expediente-<viaje_id>.json` sí están en alcance (Requirement 4.13).
- Mover bytes reales de evidencia de punta a punta: el almacén real (MinIO, ADR 32) y el escaneo antivirus son deuda fuera de V1.
- Definir formatos permitidos, tamaño o cantidad máxima de evidencia, retención, versionado o legal hold.
- Tipos funcionales de evidencia, cantidad mínima o guarda de cierre basada en evidencia (DEC-040).
- Escribir auditoría desde la interfaz.
- Escaneo de archivos, almacenamiento de bytes y emisión de URL de vida corta: lo hacen el backend y el object storage.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no preguntas que redefinan el comportamiento funcional de E8-T17. Si una verificación no está disponible, se documenta la brecha en `BRECHAS.md` y no se inventa una alternativa.

- **Descarga (DISPONIBLE):** `descargarViaje` y `DescargaViaje` están publicados en el `bff` en `@ai27-tech/contracts@0.1.0-tracer.33` (el pin del frontend) y presentes en el paquete instalado. No hay brecha de contrato para el Requirement 4. El formato de V1 está confirmado: JSON con nombre `expediente-<viaje_id>.json` (Pregunta abierta 3, resuelta; pendiente de registro como DEC).
- **Brecha 1 (dashboard): CERRADA EN CONTRATO (`tracer.35`, ampliada en `tracer.36`).** `reporteViajes` (con `en_curso`) y `reporteEstados` están en `bff.yaml` de `tracer.36`; el pin objetivo es `tracer.36` (necesario para `en_curso`). El Requirement 2 y el Requirement 3 pasan de "bloqueados" a **contrato disponible y backend terminado, pendientes de adopción del pin (hoy `tracer.33`; lo sube el usuario cuando lo pida) y del despliegue de `core v0.1.2`**; no se construye alternativa ni se simula antes de adoptar el pin y de que el usuario lo pida. **RESIDUOS:** (a) incidencias y alertas no existen en el schema publicado (Pregunta abierta 1); (b) `FilaViaje` no trae unidad y el alcance por unidad no se aplica de extremo a extremo (DT-07); (c) `pf-svc-bff` (`origin/pf-bff-d`, `9fd7e3a`, pin `tracer.36`) ya tiene mergeadas las rutas de dashboard y evidencia (PR #62 y #63), pero falta el despliegue: el dashboard cargará vacío hasta entonces (esperado, no es un error de la interfaz); (d) `pf-svc-reportes` (`origin/pf-rep-d`, `b73456c`, pin `tracer.36`) ya implementa DEC-129 (PR #22), rechaza al cliente con `403` (PR #23) y el filtro `en_curso` (PR #25); el residuo del filtro «viajes en curso» (DT-10) queda CERRADO en contrato y en `reportes`, aunque sin registro en el contexto; (e) siguen abiertos incidencias/alertas, la unidad (DT-07) y los conteos por estado en la vista por defecto (Pregunta abierta 9).
- **Brecha 2 (evidencia): CERRADA EN CONTRATO (`tracer.35`, cubierta por `tracer.36`).** `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto` están en `bff.yaml` de `tracer.35`. El Requirement 5 pasa de "bloqueado" a **contrato disponible; construible contra el contrato, no funcional de punta a punta**: `operacion` ya implementa adjuntos con almacén de marcador; faltan el despliegue de `core v0.1.2`, el almacén real y el antivirus (deuda fuera de V1) y las definiciones de Plataforma y de Seguridad/Legal solo para la evidencia real. **RESIDUOS:** `pf-svc-operacion` (`origin/pf-op-d`, `3d38c9e`, PR #78) ya implementa adjuntos con almacén de marcador (`AlmacenStub`); MinIO y antivirus son deuda fuera de V1; el `bff` los cablea en `core v0.1.2`, pendiente de despliegue; el contrato no documenta códigos de rechazo por formato, tamaño o cantidad (solo un `400` genérico) ni las cabeceras exigidas del `PUT` firmado (Pregunta abierta 4). `Adjunto.nombre` ya está publicado; el autor queda fuera de V1 (Pregunta abierta 5). La subida y la descarga usan una URL de vida corta del object storage (MinIO, propuesta ADR 32); verificar el origen permitido por CORS y la política de contenido (CSP) del panel antes de implementar.
- **Gobierno de decisiones:** el changelog de `tracer.35` cita DT-08 (sin paginación de adjuntos en V1), DT-10 (filtro "viajes en curso", urgente, en `reportes`), DT-11 (autor fuera de V1) y una "Decisión de Producto P5 (E8-T17)". Ninguna está registrada en `ai27-platform-context`; son **citadas por el contrato, pendientes de registro en el repo de contexto**, y no se presentan como decididas. DEC-129 está implementada en `pf-svc-reportes`.
- **Checksum en el cliente:** la intención de subida exige `checksum_sha256` (64 caracteres hexadecimales). Verificar la estrategia de cálculo en navegador para archivos grandes (sin cargar el archivo completo en memoria) antes de implementar; la decisión es técnica y se registra en el diseño.
- **Alcance y rol efectivo:** la visibilidad de las afordancias depende del rol de la sesión del panel interno. Verificar cómo expone E8-T4 el rol efectivo; la decisión final de autorización y alcance es del `bff` (`403` por permiso o alcance; `404` por viaje inexistente, DEC-132).
- **Navegación:** `NAV_ITEMS` hoy solo oculta "Reportes" a `reaccion`; `jefe_operativo` y `ejecutivo` la ven. Producto comunicó (Fabricio Fuentes, pendiente de registro como DEC) que se oculta a `reaccion`, `jefe_operativo` y `ejecutivo` (Requirement 1.8, coordinado con E8-T4). La negación real es del `bff`. Sigue abierto el destino de la entrada para los roles de monitoreo (Pregunta abierta 6, parte pendiente).
- **Librerías compartidas:** `@ai27-tech/ui@0.2.0-beta.6` tiene `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`, `Form`/`FormField`/`Input` y `Visor` (solo IMAGE/AUDIO). **Faltan** un indicador `stale`, un componente de métricas, un selector/subida de archivos y una vista previa de documentos. Toda afordancia faltante se compone con primitivas de la librería y se registra como solicitud a la librería, nunca como componente local nuevo (ver `BRECHAS.md`).
- **Mensajes:** verificar los textos aprobados para autorización insuficiente (sin permiso o fuera de alcance), viaje inexistente, "en preparación", "sin evidencia", "sin datos aplicados aún", proyección atrasada y rechazo de subida.
- **Pruebas de la definición de terminado:** una prueba de que una proyección atrasada (`stale` igual a `true`) se muestra marcada como stale, y una prueba de que la descarga solo contiene campos contratados y no incluye cuenta espejo ni `clave_amago`. La primera depende de adoptar el pin ≥ `tracer.36` y del despliegue del `bff` (Brecha 1).

## Preguntas abiertas

No se supone ninguna respuesta; cada una se resuelve antes de cerrar el comportamiento que toca.

**Abiertas hoy: 4, 6 (destino), 7, 10.** Resueltas: 1, 2, 3, 5, 8 y 9 (1 y 9 por DEC-136).

1. **(RESUELTA; DEC-136)** **Detalle de cada indicador del dashboard.** Producto confirmó que el dashboard de V1 se limita a viajes y estatus. Incidencias y alertas quedan fuera de V1 (DT-09); no hace falta pedir una ola a Contratos. _Dueño: Product Management._
2. **(RESUELTA; comunicada por Fabricio Fuentes, 2026-11-03; falta registrar como DEC)** **Periodo `desde`/`hasta` por omisión del dashboard.** Por defecto el dashboard usa `en_curso=true` sin `desde`/`hasta` (`tracer.36`); la vista por rango usa «últimos 7 días» (Requirement 2.12 y 2.13). _Dueño sugerido: Product Management (registro como DEC)._
3. **(RESUELTA; comunicada por el backend/Producto, 2026-11-03; falta registrar como DEC)** **Formato de la descarga y nombre de archivo.** V1 en JSON; CSV/XLSX quedan para V2; nombre de archivo `expediente-<viaje_id>.json` (Requirement 4.13). El nombre ya no es provisional. _Dueño sugerido: Product Management (registro como DEC)._
4. **(ABIERTA; ya no bloquea construir, solo la evidencia real)** **Formatos permitidos, tamaño y cantidad máximos de evidencia, retención y legal hold.** Hasta que Seguridad/Legal respondan, la interfaz comunica el rechazo del backend sin inventar límites. El contrato `tracer.35` no documenta códigos de rechazo por formato, tamaño o cantidad (solo un `400` genérico) ni las cabeceras exigidas del `PUT` firmado. _Dueño sugerido: Seguridad y Legal._
5. **(RESUELTA; confirmada por Fabricio Fuentes, 2026-11-03; falta registro como DEC)** **`Adjunto` sin nombre de archivo ni autor:** ¿se requieren para la lista de evidencia? **Resuelta para el contrato (`tracer.35`):** `Adjunto.nombre` está publicado y es obligatorio al subir; el autor queda fuera de V1 (DT-11 según el contrato). Falta registrar la decisión: el changelog cita una "Decisión de Producto P5" que no está registrada en `ai27-platform-context`. _Dueño sugerido: Product Management y encargado de Contratos._
6. **(PARCIALMENTE RESUELTA)** **Navegación:** ¿la entrada "Reportes" del AppShell se oculta también a `jefe_operativo` y `ejecutivo`? **Resuelta (comunicada por Fabricio Fuentes, 2026-11-03; falta registro como DEC):** se oculta a `reaccion`, `jefe_operativo` y `ejecutivo` (Requirement 1.8, coordinado con E8-T4). **Sigue abierto:** a dónde lleva la entrada para `monitorista`, `supervisor`, `coordinador` y `administrador` (¿al dashboard?). _Dueño sugerido: Product Management y el spec de E8-T4._
7. **Vínculo Monitorista–unidades:** cómo y cuándo se vincula un Monitorista con sus unidades (pendiente heredado de DEC-045). Sigue abierta y se liga a DT-07 (el alcance por unidad no lo aplica todavía ningún servicio). Afecta lo que el dashboard y la descarga muestran; lo resuelve el backend y aquí solo se registra como dependencia. _Dueño sugerido: Product Management y backend de identidad._
8. **(RESUELTA; confirmada por Fabricio Fuentes, 2026-11-03; falta registro como DEC)** **Frescura sin `stale`:** `stale` es opcional en el contrato. Si el `bff` no lo entrega, el dashboard muestra «frescura no informada» y nunca fresco. Resuelta por contrato (`tracer.35`, Requirement 3.6) y confirmada por Producto. _Dueño sugerido: Product Management (registro como DEC)._
9. **(RESUELTA; DEC-136)** **Conteos por estado en la vista por defecto.** En «En curso», los conteos salen de agrupar las filas de `reporteViajes?en_curso=true`. En «Últimos 7 días», `reporteEstados` se presenta como «cambios de estado en el periodo», no como viajes por estado, y no se muestra `permanencia_promedio_seg` (llega null en V1). Los rótulos finales siguen pendientes de aprobación. _Dueño: Product Management._
10. **(ABIERTA; NO se decide aquí)** **Adjuntos `pendiente` mientras no exista escáner.** En `operacion` (`internal/adjuntos/servicio.go`) todo adjunto nace con `estado_escaneo = 'pendiente'`, nada lo mueve (no hay escáner) y `Descargar` no bloquea por estado de escaneo (shortcut declarado: una guarda sin escáner bloquearía todo). El contrato, en cambio, dice que un adjunto no `limpio` no autoriza descarga. Aplicados tal cual, el Requirement 5.8 (no ofrecer descarga si no es `limpio`) implicaría que la interfaz nunca ofrece descarga, y el 5.15 (sondeo mientras haya `pendiente`) que el sondeo nunca se detiene; ambos quedan **PENDIENTES DE CONFIRMAR** frente a esta pregunta, sin cambiar su texto. Pregunta: mientras no exista escáner, ¿qué debe hacer la interfaz con los adjuntos `pendiente`: ofrecer la descarga (como permite el backend), no ofrecerla (como dice el contrato), y cuándo detener el sondeo? _Dueños sugeridos: Product Management y Seguridad/Legal, con Contratos y `operacion`._

## Trazabilidad

| Requisito                                          | HU / Decisión                                                                                                                                                          | Operación de contrato                                                                         | Estado                                                                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement 1: Acceso por rol y alcance            | `E6-HU-025`, `E6-HU-026`, `E6-HU-027`; DEC-022 #7 y #9, DEC-045, DEC-060, DEC-132, DT-07; criterio 1.8 (decisión (c) comunicada)                                       | Respuestas `401`/`403`/`404` del `bff`                                                        | Disponible (afordancia en UI); la negación real es del `bff`                                                                                                    |
| Requirement 2: Dashboard de monitoreo              | `E6-HU-025`; DEC-023, DEC-129, ADR 20; DT-07; DT-10 (realizada en `tracer.36` y `reportes`, sin registro en el contexto); decisión (a) comunicada por Fabricio Fuentes | `reporteViajes` (con `en_curso`), `reporteEstados` (`bff.yaml`, `tracer.36`)                  | Contrato cerrado en tracer.36; backend terminado; pendiente de pin y del despliegue de core v0.1.2                                                              |
| Requirement 3: Frescura de la proyección           | `E6-HU-025`; DEC-033; DoD de E8-T17 (prueba de stale); decisión (b) comunicada                                                                                         | `ReporteViajes.stale`, `proyeccion_al`                                                        | Contrato cerrado en tracer.36; backend terminado; pendiente de pin y del despliegue de core v0.1.2                                                              |
| Requirement 4: Descarga del expediente de UN viaje | `E6-HU-026`; DEC-009, DEC-022 #7, DEC-023, DEC-039; DoD de E8-T17 (prueba de campos contratados)                                                                       | `descargarViaje` (`GET /api/v1/viajes/{id}/descarga`)                                         | Disponible; formato JSON confirmado (`expediente-<viaje_id>.json`; Pregunta abierta 3 resuelta)                                                                 |
| Requirement 5: Evidencia del viaje                 | `E6-HU-027`; DEC-022 #9, DEC-040, DEC-060                                                                                                                              | `listarAdjuntos`, `crearIntencionSubidaAdjunto`, `descargarAdjunto` (`bff.yaml`, `tracer.35`) | Contrato cerrado en tracer.35 (cubierto por tracer.36); servicio implementado con almacén de marcador; no funcional de punta a punta; Preguntas abiertas 4 y 10 |
| Requirement 6: Estados y errores transversales     | `E6-HU-025`, `E6-HU-026`, `E6-HU-027`                                                                                                                                  | Respuestas `401`/`403`/`404` (DEC-132) y errores de red                                       | Disponible                                                                                                                                                      |

Trazabilidad de escenarios: 1, 4, 6, 7, 10, 11 y 12 → Requirement 4; 2, 8, 9, 18, 19 y 20 → Requirements 2 y 3 (18, 19 y 20 → Requirement 2); 3, 13, 14, 15, 16 y 17 → Requirement 5; 5 → Requirement 1.
