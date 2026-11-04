# Brechas — E8-T17 (Dashboard, descarga del expediente y evidencia)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-11-03, tras el mensaje de backend sobre `tracer.36`)

- **Descarga del expediente: sin brecha.** `descargarViaje` está en el `bff` y en el pin (`tracer.33`). Formato de V1 confirmado: JSON, nombre `expediente-<viaje_id>.json` (CSV/XLSX en V2).
- **Dashboard: contrato cerrado en `tracer.36`; backend terminado y taggeado; falta el despliegue de `core v0.1.2`.** Se puede cerrar completo contra el contrato (Brecha 1).
- **Evidencia: contrato cerrado en `tracer.35` (cubierto por `tracer.36`); servicio implementado con almacén de marcador.** Se construye contra el contrato y **no** se da por funcional de punta a punta (Brecha 2).
- **El pin del frontend sigue en `tracer.33`.** El backend pidió subirlo a `tracer.36`; no se hace sin que el usuario lo pida.
- **Taggeado no es desplegado.** Se verificó que el código llegó a ramas y tags, no que corra en el entorno del usuario. Fabricio Fuentes confirma cuándo `core v0.1.2` queda desplegado.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `ad3290c` (sin commits nuevos desde la verificación anterior). Decisiones DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060, DEC-129 y DEC-132. Deuda DT-07 (alcance por unidad no aplicado).
- **Contrato:** `pf-pkg-contracts` `v0.1.0-tracer.36` (último tag). `tracer.36` solo cambia `reporteViajes`: parámetro `en_curso` y `desde`/`hasta` opcionales. Compatible en el cable para TypeScript; rompe la compilación de consumidores Go, no del frontend.
- **Pin adoptado:** `@ai27-tech/contracts@0.1.0-tracer.33` y `@ai27-tech/ui@0.2.0-beta.6`. Subir de `33` a `36` incluye `34` (aditivo, emergencias), `35` (ruptura declarada solo en `operacion.yaml`, que el frontend no consume) y `36`. Tras subirlo hay que correr `typecheck` y `test`.
- **Backend (remoto, sin comprobar que corra):**
  - `pf-svc-reportes` `origin/pf-rep-d` (`b73456c`, pin `tracer.36`): filtro `en_curso` (PR #25), sin tenant para internos (DEC-129, PR #22), 403 al cliente (PR #23).
  - `pf-svc-operacion` `origin/pf-op-d` (`3d38c9e`, PR #78, pin `tracer.36`): adjuntos implementados con `AlmacenStub`.
  - `pf-svc-bff` `origin/pf-bff-d` (`9fd7e3a`, pin `tracer.36`): rutas de dashboard y evidencia mergeadas (PR #62 y #63).
  - `pf-svc-core` tag `v0.1.2` (PR #50): cablea reportes y adjuntos en el `bff`.
- **Gobierno:** el changelog de `tracer.35` cita **DT-08**, **DT-10**, **DT-11** y una "Decisión de Producto P5". Ninguna está registrada en `ai27-platform-context`. Las decisiones que comunicó el backend (vista por defecto "en curso", entrada "Reportes" oculta, JSON y nombre del expediente, `nombre` del adjunto) tampoco. Se tratan como "comunicadas por Fabricio Fuentes, pendientes de registro como DEC".

---

## Brecha 1 — Operaciones del dashboard en el `bff` (CERRADA EN CONTRATO; backend terminado; residuos abiertos)

**Qué pedía la tarea.** `GET /api/v1/reportes/viajes` y el dashboard de `E6-HU-025`: viajes, incidencias, alertas y estatus, acotado por rol y alcance. La DoD exige probar que una proyección atrasada se muestra como stale.

**Qué existe hoy.**

- `bff.yaml` (`tracer.36`): `reporteViajes` con `en_curso` opcional y `desde`/`hasta` requeridos salvo con `en_curso=true` (sin ninguno: 400), y `reporteEstados` con rango obligatorio. 200 para monitorista, supervisor, coordinador y administrador; 403 para jefe_operativo, ejecutivo, reaccion y cliente.
- `proyeccion_al` y `stale` se conservan. Si `stale` falta: frescura no informada, nunca fresca.
- Los estados terminales los deriva el servicio; la interfaz no los copia.

**Cerrado desde la versión anterior.**

| Residuo anterior                 | Resultado                                                     |
| -------------------------------- | ------------------------------------------------------------- |
| Filtro "viajes en curso" (DT-10) | Cerrado en contrato (`tracer.36`) y en `reportes`             |
| DEC-129 en `reportes`            | Implementado (PR #22)                                         |
| Periodo por omisión              | Resuelto: `en_curso=true` por defecto; rango "últimos 7 días" |
| `bff` sin rutas                  | Rutas mergeadas y cableadas en `core v0.1.2` (taggeado)       |

**Qué sigue abierto.**

| Residuo                     | Detalle                                                                                                                                                                                            | Dueño            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Despliegue de `core v0.1.2` | Hasta entonces las rutas no responden con datos y el dashboard queda vacío (esperado, no es un error de la interfaz)                                                                               | Fabricio Fuentes |
| Incidencias y alertas       | No existen en el schema. El mensaje de backend dice que el dashboard se puede cerrar completo con el contrato; eso implica "V1 = viajes y estatus", pero falta confirmación explícita (Pregunta 1) | Producto         |
| Conteos por estado          | `reporteEstados` exige `desde`/`hasta` y `en_curso` no los necesita (Pregunta 9)                                                                                                                   | Producto         |
| Unidad / alcance            | `FilaViaje` no trae unidad; el filtro por unidad no se aplica (DT-07)                                                                                                                              | Backend          |

**Efecto de DEC-129.** Con datos reales, un usuario interno ve los viajes de todos los clientes. Es correcto; la interfaz no filtra por tenant.

**Impacto en el spec.** Requirements 2 y 3: "contrato disponible; backend terminado; pendiente de pin y del despliegue". Tareas 15 a 21 con `*` hasta que el usuario pida adoptar el pin. `/monitoreo/dashboard` conserva el stub sin cifras mientras tanto.

---

## Brecha 2 — Operaciones de evidencia en el `bff` (CERRADA EN CONTRATO; servicio con almacén de marcador; NO funcional de punta a punta)

**Qué pedía la tarea.** Adjuntar evidencia asociada al viaje y consultarla según el alcance, con acceso auditado (`E6-HU-027`).

**Qué existe hoy.**

| Operación                     | Método y ruta                                          | Entrada                                                 | Salida                                              |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| `listarAdjuntos`              | `GET /api/v1/viajes/{id}/adjuntos`                     | —                                                       | `PaginaAdjuntos { items: Adjunto[] }` (sin paginar) |
| `crearIntencionSubidaAdjunto` | `POST /api/v1/viajes/{id}/adjuntos/intenciones-subida` | `{ nombre, tipo_medio, tamano_bytes, checksum_sha256 }` | `201 { adjunto_id, url_subida, expira_en }`         |
| `descargarAdjunto`            | `GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga`      | —                                                       | `{ url_descarga, expira_en }`                       |

`Adjunto` trae `nombre` (obligatorio); el autor queda fuera de V1. Respuestas 200 o 201, 400, 401, 403 y 404. `pf-svc-operacion` ya implementa las tres, con metadata, auditoría y contrato completos.

**Lo que NO es real todavía.**

- `operacion` usa `AlmacenStub`: la URL de subida y de descarga es de marcador (`https://almacen.local/viajes/{id}/adjuntos/{aid}?op=...`). **No llega a un archivo.**
- MinIO (ADR 32) y el escaneo antivirus son deuda fuera de V1.
- El backend avisará cuándo se desbloquee. Hasta entonces la evidencia no se da por funcional de punta a punta.

**Alcance de "preparada": RESUELTO.** Se construye la UI de evidencia contra el contrato (probada con MSW), sin afirmar que funciona contra el backend.

**Qué sigue abierto.**

| Residuo                                           | Detalle                                                                                                                                                                                                                                                                                                                                                                       | Dueño                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Pregunta 10: adjuntos `pendiente` sin escáner** | En `operacion` todo adjunto nace `pendiente` y nada lo mueve. `Descargar` no bloquea por escaneo (shortcut declarado). El contrato dice que un adjunto no `limpio` no autoriza descarga, y los Requirements 5.8 y 5.15 piden no ofrecer descarga y sondear mientras haya `pendiente`. Aplicados tal cual, la interfaz nunca ofrecería descarga y el sondeo nunca se detendría | Producto y Seguridad/Legal, con Contratos y `operacion` |
| Límites de evidencia                              | Formatos, tamaño, cantidad, retención (Pregunta 4). Ya no bloquea construir; la interfaz comunica el rechazo del backend sin inventar límites                                                                                                                                                                                                                                 | Seguridad y Legal                                       |
| CORS y CSP del almacén                            | Origen del panel en `connect-src` y permiso `PUT`/`GET`                                                                                                                                                                                                                                                                                                                       | Plataforma                                              |
| Códigos de rechazo de la subida                   | Solo hay un 400 genérico                                                                                                                                                                                                                                                                                                                                                      | Contratos                                               |
| Cabeceras del `PUT` firmado                       | No documentadas                                                                                                                                                                                                                                                                                                                                                               | Contratos / Plataforma                                  |
| Despliegue de `core v0.1.2`                       | Sin él las rutas no responden                                                                                                                                                                                                                                                                                                                                                 | Fabricio Fuentes                                        |

**Impacto en el spec.** Requirement 5: "contrato disponible; servicio con almacén de marcador; no funcional de punta a punta" (criterio nuevo 5.16). `adjuntoDescargable` y `sondeoEscaneo` quedan aisladas como funciones puras sujetas a la Pregunta 10. Tareas 22 a 29 con `*` hasta adoptar el pin.

---

## Brecha 3 — Formato final de la descarga (CERRADA)

**Antes.** `E6-HU-026` dejaba el formato "por confirmar" y la entrega era provisional.

**Ahora.** El backend confirmó: V1 en JSON, CSV/XLSX para V2, nombre `expediente-<viaje_id>.json`. Decisión comunicada por Fabricio Fuentes, pendiente de registro como DEC.

**Impacto en el spec.** Requirements 4.4 y 4.13. El código del Bloque A (ya implementado) todavía usa `nombreProvisionalExpediente` en `entregarArchivo.ts` y `useDescargaExpediente.ts`: hay que renombrarlo a `nombreExpediente` y verificar el nombre entregado en la prueba de la tarea 10.

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (VERIFICADA: se compone, sin componente de librería local)

`@ai27-tech/ui@0.2.0-beta.6` (última publicada). Sin cambios.

| Necesidad                                            | Resolución en el spec                                       | Solicitud a la librería                                 |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Indicador de proyección atrasada (`stale`) con fecha | Componente de feature `IndicadorFrescura` (`Badge` + texto) | Indicador de frescura                                   |
| Tarjeta de métrica                                   | `Card`                                                      | Componente de métrica                                   |
| Selector y subida de archivos con progreso           | `Input type="file"` en `FormField`                          | Componente de subida                                    |
| Vista previa de documentos                           | Apertura o descarga por `url_descarga`, sin vista previa    | Visor de documentos (`Visor` solo cubre imagen y audio) |
| Alternar "En curso" / "Últimos 7 días"               | `Button` o `Select`                                         | Ninguna                                                 |

No bloquea el Bloque A.

---

## Brecha 5 — Entrada "Reportes" del AppShell (PARCIALMENTE CERRADA)

**Resuelto.** La entrada "Reportes" se oculta a `reaccion`, `jefe_operativo` y `ejecutivo` (coordinado con E8-T4). Cambio en `navigationConfig.ts`: tarea 30, no depende del pin.

**Abierto.** A dónde lleva la entrada para monitorista, supervisor, coordinador y administrador. Hoy apunta al stub `/reportes`, y el dashboard vive en `/monitoreo/dashboard` (Pregunta 6, parte pendiente; Producto y E8-T4).

---

## Preguntas abiertas que condicionan el spec

Detalle y dueños en `requirements.md` §Preguntas abiertas.

| #   | Tema                                            | Estado                                                                                       |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Incidencias y alertas del dashboard             | **Probablemente resuelta** (V1 = viajes y estatus); falta confirmación explícita de Producto |
| 2   | Periodo por omisión                             | **Resuelta**: `en_curso=true` por defecto; rango "últimos 7 días"                            |
| 3   | Formato de la descarga                          | **Resuelta**: JSON, `expediente-<viaje_id>.json`                                             |
| 4   | Formatos y límites de evidencia, retención      | **Abierta**, Seguridad y Legal. Ya no bloquea construir                                      |
| 5   | Nombre y autor del adjunto                      | **Resuelta**: `nombre` obligatorio; autor fuera de V1                                        |
| 6   | Entrada "Reportes"                              | **Parcial**: se oculta a tres roles; destino abierto                                         |
| 7   | Vínculo Monitorista–unidades (DT-07)            | **Abierta**                                                                                  |
| 8   | Frescura sin `stale`                            | **Resuelta**                                                                                 |
| 9   | Conteos por estado en la vista por defecto      | **Abierta**, Producto                                                                        |
| 10  | Adjuntos `pendiente` mientras no exista escáner | **Abierta**, Producto y Seguridad/Legal                                                      |

## Verificación de desbloqueo y ejecución (2026-11-04)

**Pin.** `@ai27-tech/contracts` pasa de `0.1.0-tracer.33` a `0.1.0-tracer.36` (instalado y verificado en `bff.gen.ts`: `reporteViajes`, `reporteEstados`, `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto`). Al subirlo, pnpm agregó `tracer.36` a `minimumReleaseAgeExclude` en `pnpm-workspace.yaml`. Se revirtió ese cambio: la excepción salta la política de edad mínima de paquetes y debe aprobarla quien mantiene la política. La instalación con el lockfile pasa sin la excepción.

**Bloque B (dashboard): NO desbloqueado.** Condiciones de la tarea 15:

1. Operaciones en `bff.gen.ts`: cumplida.
2. Pin subido a `tracer.36`: cumplida en esta ejecución.
3. Pregunta 9 respondida y Pregunta 1 confirmada explícitamente: NO cumplida. Según este documento, la 9 sigue abierta y la 1 sin confirmación explícita de Producto.
4. Despliegue de `core v0.1.2` verificado en el entorno: NO cumplido. No se verificó desde esta sesión.

Por la regla de la tarea 15, las tareas 16 a 21 siguen con `*` y no se implementaron. `/monitoreo/dashboard` conserva el stub sin cifras.

**Bloque C (evidencia): desbloqueado y construido contra el contrato.** Tareas 22 a 29 hechas y verificadas con MSW. Las pruebas de la tarea 29 están en `tests/viajes/evidenciaFunciones.property.test.ts`, `tests/viajes/EvidenciaViaje.test.tsx` y `tests/viajes/evidenciaNoBloqueaCierre.render.test.tsx`. La última es un archivo `.tsx` aparte porque la prueba de render necesita JSX; la verificación estática sigue en `evidenciaNoBloqueaCierre.test.ts`.

**Lo que solo la verificación real puede confirmar** (no se da por funcional de punta a punta, Requirement 5.16):

- **Pregunta 10 sin resolver.** Con el backend de V1 todo adjunto queda `pendiente` porque el almacén es un marcador y no hay escáner. Con `pendiente` permanente, el sondeo nunca se detiene y la descarga nunca se habilita. `esDescargable` y `hayEscaneoPendiente` están aisladas para cambiarse cuando Producto decida.
- **Adjuntos huérfanos.** Si el `PUT` falla después de la intención, el adjunto queda `pendiente` en el servidor y el sondeo sigue. La UI invalida la lista también en error para mostrarlo.
- **CORS y CSP (Plataforma).** El `PUT` y la descarga van a otro origen. Hay que confirmar CORS del almacén para el origen del panel y `connect-src` de la CSP.
- **Cabeceras del `PUT` firmado.** El contrato no las documenta. El cliente no fija `Content-Type` y el navegador toma el `type` del `File`, que coincide con `tipo_medio`. Si el almacén firma otra cabecera, el `PUT` fallará con `403` del almacén.
- **Apertura de la descarga.** La URL se abre con un ancla temporal con `target="_blank"` después de un `await`. Un bloqueador de ventanas emergentes puede impedirlo. Verificar en navegador real.
- **Límites de tamaño.** `calcularSha256` carga el archivo completo en memoria. No hay límite de tamaño en el cliente; el de formato y tamaño depende de Seguridad y Legal (Pregunta 4).
- **Rechazos.** El contrato solo define `400` genérico. La UI muestra un mensaje genérico y no aplica límites propios.
- **Mock de escaneo.** En `src/mocks/data.ts`, un adjunto pasa a `limpio` tras dos lecturas de la lista. Es comportamiento simulado, no del backend.

**Intervalo de sondeo.** `INTERVALO_SONDEO_ESCANEO_MS` vale 5 000 ms. Es un valor de trabajo, pendiente de confirmar.

## Bloque B desbloqueado (2026-11-04)

**Condiciones de la tarea 15:**

1. Operaciones en `bff.gen.ts` de `tracer.36`: cumplida.
2. Pin subido a `tracer.36`: cumplida.
3. Preguntas 1 y 9 respondidas por Producto (DEC-136): cumplida. Pregunta 1: el dashboard de V1 se limita a viajes y estatus (DT-09). Pregunta 9: en la vista «En curso» los conteos por estado salen de agrupar las filas de `reporteViajes?en_curso=true`; en «Últimos 7 días» `reporteEstados` se presenta como «Cambios de estado en el periodo» y no se muestra `permanencia_promedio_seg`.
4. Despliegue de `core v0.1.2`: **pendiente de verificación**. Producto indicó que no bloquea. Sin ese despliegue, el dashboard real cargará vacío, lo que el spec ya trata como esperado.

**Lo construido:** `reportes` (contrato, API y consulta exclusiva por vista), `estadoFrescura` e `IndicadorFrescura`, `rangoUltimosSiete`, `conteosEnCurso`, `useDashboardMonitoreo`, `DashboardMonitoreo` (reemplaza el stub de `/monitoreo/dashboard`), mocks de reportes con las variantes de frescura y los `400`/`403`, y pruebas de las propiedades 3 y 9.

**Riesgos y pendientes para la verificación real:**

- Los rótulos («Viajes en curso por estado», «Cambios de estado en el periodo», «Datos atrasados», «Sin viajes para mostrar.») son de trabajo, pendientes de aprobación de Producto.
- La vista «En curso» depende de que `reporteViajes` devuelva la lista completa. Con paginación en el servidor, la suma por estado no cuadraría con el total.
- Sin `core v0.1.2` desplegado, el dashboard vacío es el estado esperado y no un error.
- Las cifras de los mocks son ficticias y solo se usan en modo mock.

## Revisión de `core` (2026-11-04)

**Código y tags (verificado en `repos/pf-svc-core`, `pf-svc-bff`, `pf-svc-operacion` y `pf-svc-reportes`):**

- `pf-svc-core` tag `v0.1.2` (2026-11-04) cablea adjuntos y el dashboard del `bff`. Fija `pf-pkg-contracts` `tracer.36`, `pf-svc-bff` `v0.1.14`, `pf-svc-operacion` `v0.1.15` y `pf-svc-reportes` `v0.1.4`.
- `bff v0.1.14` ya lee `en_curso` y lo reenvía a `reportes`. Las rutas de adjuntos de `operacion v0.1.15` están montadas.
- Existe un tag posterior, `pf-svc-core` `v0.1.3` (2026-11-04 16:09). Repite ese cableado y suma las emergencias de E8-T18. Sube `bff` a `v0.1.16`, `operacion` a `v0.1.16` y `contracts` a `tracer.37`. El frontend sigue en `tracer.36`; no verifiqué la compatibilidad de `tracer.37` con el frontend.
- La clonación local de `pf-svc-core` va 7 commits atrás de `origin/pf-core-m`.

**Despliegue: no verificado.** No pude comprobarlo desde los repos:

- `repos/deploy` no tiene manifiestos de `core` (el único contenido es una carpeta `keycloak`).
- `VITE_API_BASE_URL` no está configurada en el frontend (`.env` no existe y `.env.example` la deja vacía), así que no hay URL para probar el servicio.

**Cómo verificarlo** (lo debe confirmar quien opera el entorno, como indica la tarea 15): con la URL del entorno, una `GET /api/v1/reportes/viajes?en_curso=true` sin token debe responder `401`. Un `404` indica que el `bff` desplegado no monta la ruta. Falta decidir si se confirma `v0.1.2` o `v0.1.3`.

## Cierre de lo que el repo puede cerrar (2026-11-04)

**Cerrado en esta ejecución:**

- Tarea 12: el enlace «Expediente y evidencia» se oculta a los roles sin acceso (`tests/viajes/DetalleViajeExpediente.test.tsx`), y la bandeja no ofrece descarga ni exportación (`tests/viajes/bandejaSinDescarga.test.tsx`). Estos dos residuos de la sección anterior quedan cerrados.
- Tarea 11 (opcional): Property 1, una pulsación equivale a una solicitud (`tests/viajes/descargaExpediente.property.test.tsx`); Property 2, fidelidad del archivo (`tests/viajes/expedienteFidelidad.property.test.ts`); Property 4, afordancia y clasificación 403/404 (`tests/layout/puedeUsarMonitoreo.property.test.ts`). Los tres corren con 100 iteraciones.
- `requirements.md`: preguntas 1 y 9 marcadas como resueltas por DEC-136; encabezados de los Requirements 2 y 3 actualizados; lista de abiertas corregida.
- `tasks.md`: estado de avance actualizado y tarea 11 marcada como hecha.
- Validaciones: typecheck, lint, 387 pruebas y build de mock pasan.

**Pendiente, y no se puede cerrar desde el repo:**

| Pendiente                                                                                                                                                                             | Quién                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Preguntas 4 (límites de evidencia), 6 (destino de «Reportes» para monitorista, supervisor, coordinador y administrador), 7 (vínculo monitorista–unidades) y 10 (adjuntos `pendiente`) | Producto, Seguridad, Legal, identidad                                                 |
| Despliegue de `core` y verificación E2E (`v0.1.2` o `v0.1.3`)                                                                                                                         | Fabricio Fuentes / quien opera el entorno                                             |
| CORS y CSP del almacén, cabeceras del `PUT` firmado, almacén real y escáner                                                                                                           | Plataforma y backend                                                                  |
| Registro como DEC en `ai27-platform-context` de las respuestas que aún no lo tienen: 2, 3, 5, 6 y 8, y la decisión de evidencia «preparada»                                           | Product Management (el repo de contexto es compartido; no se escribió en él)          |
| Aprobación de los textos de la interfaz (rótulos, mensajes de error, «en preparación», «sin evidencia»)                                                                               | Producto                                                                              |
| Decisión sobre `minimumReleaseAgeExclude` para `tracer.36`                                                                                                                            | Quien mantiene la política de supply-chain (la instalación funciona sin la excepción) |

**Riesgos conocidos, sin cambio en esta ejecución:** con el backend de V1 todos los adjuntos quedan `pendiente`, así que la descarga de evidencia nunca se habilita y el sondeo no se detiene hasta resolver la Pregunta 10. Los adjuntos de un `PUT` fallido quedan en `pendiente`.
