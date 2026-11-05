# Brechas — E8-T17 (Dashboard, descarga del expediente y evidencia)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (consolidado 2026-11-04)

- **Pin del contrato: `@ai27-tech/contracts@0.1.0-tracer.36`** (instalado en `package.json` y verificado en `bff.gen.ts`). Es el pin objetivo del spec. Este es el estado único y vigente; cualquier mención previa a `tracer.33` como pin actual quedó superada.
- **Bloque A (descarga del expediente): implementado y verificado.** Sin brecha de contrato: `descargarViaje` está en el `bff` y en el pin. Formato de V1 confirmado: JSON, nombre `expediente-<viaje_id>.json` (CSV/XLSX en V2).
- **Bloque B (dashboard): desbloqueado el 2026-11-04 e implementado.** Contrato cerrado en `tracer.36`; preguntas 1 y 9 resueltas (DEC-136). La verificación E2E con `core v0.1.2` desplegado queda pendiente y **no bloquea**, según Producto.
- **Bloque C (evidencia): desbloqueado el 2026-11-04 e implementado contra el contrato.** Contrato cerrado en `tracer.35` (cubierto por `tracer.36`); el servicio usa almacén de marcador. Construido y probado con MSW; **no** se da por funcional de punta a punta (Requirement 5.16).
- **Validaciones (ejecutadas):** `typecheck`, `lint`, **387 pruebas** y `build:mock` pasan.
- **Taggeado no es desplegado.** Se verificó que el backend llegó a ramas y tags, no que corra en el entorno. El despliegue de `core` (`v0.1.2` o `v0.1.3`) lo confirma quien opera el entorno.

Lo único pendiente son decisiones de negocio externas (preguntas abiertas) y la verificación de extremo a extremo. Ninguna es código del frontend sin escribir.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `ad3290c`. Decisiones DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060, DEC-129, DEC-132 y DEC-136. Deuda DT-07 (alcance por unidad no aplicado).
- **Contrato:** `pf-pkg-contracts` `v0.1.0-tracer.36`. Respecto de `tracer.33`, subir a `tracer.36` incluye `tracer.34` (aditivo, emergencias), `tracer.35` (ruptura declarada solo en `operacion.yaml`, que el frontend no consume) y `tracer.36` (en `reporteViajes`: parámetro `en_curso` y `desde`/`hasta` opcionales; aditivo en el cable para TypeScript). Existe un tag posterior `tracer.37` (de `core v0.1.3`) cuya compatibilidad con el frontend no se verificó; el frontend permanece en `tracer.36`.
- **Pin adoptado:** `@ai27-tech/contracts@0.1.0-tracer.36` y `@ai27-tech/ui@0.2.0-beta.6`. Operaciones verificadas en `bff.gen.ts`: `descargarViaje`, `reporteViajes`, `reporteEstados`, `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto`.
- **Backend (remoto, sin comprobar que corra):**
  - `pf-svc-reportes` `origin/pf-rep-d` (`b73456c`, pin `tracer.36`): filtro `en_curso` (PR #25), sin tenant para internos (DEC-129, PR #22), 403 al cliente (PR #23).
  - `pf-svc-operacion` `origin/pf-op-d` (`3d38c9e`, PR #78, pin `tracer.36`): adjuntos implementados con `AlmacenStub`.
  - `pf-svc-bff` `origin/pf-bff-d` (`9fd7e3a`, pin `tracer.36`): rutas de dashboard y evidencia mergeadas (PR #62 y #63).
  - `pf-svc-core` tag `v0.1.2` (PR #50): cablea reportes y adjuntos en el `bff`. Existe un `v0.1.3` posterior que repite ese cableado y suma emergencias de E8-T18 (sube `bff`, `operacion` y `contracts` a `tracer.37`).
- **Gobierno:** el changelog de `tracer.35` cita **DT-08**, **DT-10**, **DT-11** y una "Decisión de Producto P5", ninguna registrada en `ai27-platform-context`. Las respuestas comunicadas por Producto (vista por defecto "en curso", entrada "Reportes" oculta, JSON y nombre del expediente, `nombre` del adjunto) siguen pendientes de registro como DEC, salvo las preguntas 1 y 9 ya cubiertas por DEC-136.

---

## Brecha 1 — Operaciones del dashboard en el `bff` (CERRADA; Bloque B implementado)

**Qué pedía la tarea.** `GET /api/v1/reportes/viajes` y el dashboard de `E6-HU-025`: viajes, incidencias, alertas y estatus, acotado por rol y alcance. La DoD exige probar que una proyección atrasada se muestra como stale.

**Qué existe hoy.**

- `bff.yaml` (`tracer.36`): `reporteViajes` con `en_curso` opcional y `desde`/`hasta` requeridos salvo con `en_curso=true` (sin ninguno: 400), y `reporteEstados` con rango obligatorio. 200 para monitorista, supervisor, coordinador y administrador; 403 para jefe_operativo, ejecutivo, reaccion y cliente.
- `proyeccion_al` y `stale` se conservan. Si `stale` falta: frescura no informada, nunca fresca.
- Los estados terminales los deriva el servicio; la interfaz no los copia.
- **Frontend construido:** `lib/contracts/reportes.ts`, `lib/api/reportes.ts`, y en `features/monitoreo/dashboard/`: `estadoFrescura`, `IndicadorFrescura`, `rangoUltimosSiete`, `conteos`, `useDashboardMonitoreo` y `DashboardMonitoreo` (reemplaza el stub de `/monitoreo/dashboard`). Mocks de reportes con variantes de frescura y `400`/`403`. Pruebas de las propiedades 3 y 9, incluida la DoD de "proyección atrasada marcada como stale".

**Criterio de desbloqueo (tarea 15): cumplido.**

1. Operaciones en `bff.gen.ts` de `tracer.36`: cumplida.
2. Pin subido a `tracer.36`: cumplida.
3. Preguntas 1 y 9 respondidas por Producto (DEC-136): cumplida. Pregunta 1: el dashboard de V1 se limita a viajes y estatus (DT-09). Pregunta 9: en la vista «En curso» los conteos por estado salen de agrupar las filas de `reporteViajes?en_curso=true`; en «Últimos 7 días» `reporteEstados` se presenta como «Cambios de estado en el periodo» y no se muestra `permanencia_promedio_seg`.
4. Despliegue de `core v0.1.2`: **pendiente de verificación**; Producto indicó que no bloquea. Sin ese despliegue, el dashboard real carga vacío, lo que el spec trata como estado esperado, no error.

**Efecto de DEC-129.** Con datos reales, un usuario interno ve los viajes de todos los clientes. Es correcto; la interfaz no filtra por tenant.

**Residuos abiertos (no bloquean el cierre del repo).**

| Residuo                     | Detalle                                                                                                                       | Dueño            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Despliegue de `core v0.1.2` | Hasta entonces las rutas no responden con datos y el dashboard queda vacío (esperado, no es un error de la interfaz)          | Fabricio Fuentes |
| Unidad / alcance            | `FilaViaje` no trae unidad; el filtro por unidad no se aplica (DT-07)                                                         | Backend          |
| Rótulos de la UI            | «Viajes en curso por estado», «Cambios de estado en el periodo», «Datos atrasados», «Sin viajes para mostrar.» son de trabajo | Producto         |

**Riesgo conocido.** La vista «En curso» depende de que `reporteViajes` devuelva la lista completa. Con paginación en el servidor, la suma por estado no cuadraría con el total.

---

## Brecha 2 — Operaciones de evidencia en el `bff` (CERRADA EN CONTRATO; Bloque C implementado; NO funcional de punta a punta)

**Qué pedía la tarea.** Adjuntar evidencia asociada al viaje y consultarla según el alcance, con acceso auditado (`E6-HU-027`).

**Qué existe hoy.**

| Operación                     | Método y ruta                                          | Entrada                                                 | Salida                                              |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| `listarAdjuntos`              | `GET /api/v1/viajes/{id}/adjuntos`                     | —                                                       | `PaginaAdjuntos { items: Adjunto[] }` (sin paginar) |
| `crearIntencionSubidaAdjunto` | `POST /api/v1/viajes/{id}/adjuntos/intenciones-subida` | `{ nombre, tipo_medio, tamano_bytes, checksum_sha256 }` | `201 { adjunto_id, url_subida, expira_en }`         |
| `descargarAdjunto`            | `GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga`      | —                                                       | `{ url_descarga, expira_en }`                       |

`Adjunto` trae `nombre` (obligatorio); el autor queda fuera de V1. Respuestas 200 o 201, 400, 401, 403 y 404. `pf-svc-operacion` implementa las tres, con metadata, auditoría y contrato completos.

**Frontend construido.** `lib/contracts/adjuntos.ts`, `lib/api/adjuntos.ts` y en `features/viajes/evidencia/`: `calcularSha256`, `vigenciaUrl`, `adjuntoDescargable`, `sondeoEscaneo`, `useEvidenciaViaje`, `ListaAdjuntos`, `SubirEvidencia` y `EvidenciaViaje` (montado dentro de `ExpedienteViaje.tsx`). Pruebas de la tarea 29 en `tests/viajes/evidenciaFunciones.property.test.ts`, `tests/viajes/EvidenciaViaje.test.tsx`, `tests/viajes/evidenciaNoBloqueaCierre.render.test.tsx` y la verificación estática en `tests/viajes/evidenciaNoBloqueaCierre.test.ts`.

**Lo que NO es real todavía.**

- `operacion` usa `AlmacenStub`: la URL de subida y de descarga es de marcador (`https://almacen.local/viajes/{id}/adjuntos/{aid}?op=...`). **No llega a un archivo.**
- MinIO (ADR 32) y el escaneo antivirus son deuda fuera de V1.

**Alcance de "preparada": RESUELTO.** Se construye la UI de evidencia contra el contrato (probada con MSW), sin afirmar que funciona contra el backend.

**Lo que solo la verificación real puede confirmar** (Requirement 5.16):

| Pendiente                                | Detalle                                                                                                                                                                                                                                                            | Dueño                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Pregunta 10: `pendiente` sin escáner** | En V1 todo adjunto nace `pendiente` y nada lo mueve. Aplicados tal cual, los Requirements 5.8 y 5.15 harían que la descarga nunca se habilite y el sondeo nunca pare. `esDescargable` y `hayEscaneoPendiente` están aisladas para ajustarse cuando Producto decida | Producto, Seguridad/Legal, Contratos, `operacion` |
| Límites de evidencia                     | Formatos, tamaño, cantidad, retención (Pregunta 4). No bloquea construir; la UI comunica el rechazo del backend sin inventar límites                                                                                                                               | Seguridad y Legal                                 |
| CORS y CSP del almacén                   | Origen del panel en `connect-src` y permiso `PUT`/`GET` a otro origen                                                                                                                                                                                              | Plataforma                                        |
| Cabeceras del `PUT` firmado              | No documentadas. El cliente no fija `Content-Type`; el navegador toma el `type` del `File`. Si el almacén firma otra cabecera, el `PUT` falla con `403`                                                                                                            | Contratos / Plataforma                            |
| Códigos de rechazo de la subida          | Solo hay un `400` genérico; la UI muestra un mensaje genérico                                                                                                                                                                                                      | Contratos                                         |
| Apertura de la descarga                  | Se abre con ancla temporal (`target="_blank"`) tras un `await`; un bloqueador de ventanas emergentes puede impedirlo                                                                                                                                               | Verificación en navegador real                    |
| Límites de tamaño                        | `calcularSha256` carga el archivo completo en memoria; sin límite en el cliente                                                                                                                                                                                    | Seguridad y Legal (Pregunta 4)                    |
| Despliegue de `core v0.1.2`              | Sin él las rutas no responden                                                                                                                                                                                                                                      | Fabricio Fuentes                                  |

**Nota de mocks.** En `src/mocks/data.ts`, un adjunto pasa a `limpio` tras dos lecturas de la lista: comportamiento simulado, no del backend. `INTERVALO_SONDEO_ESCANEO_MS` vale 5 000 ms, valor de trabajo pendiente de confirmar.

**Riesgo conocido.** Si el `PUT` falla después de la intención, el adjunto queda `pendiente` en el servidor y el sondeo sigue; la UI invalida la lista también en error para mostrarlo.

---

## Brecha 3 — Formato final de la descarga (CERRADA)

**Antes.** `E6-HU-026` dejaba el formato "por confirmar" y la entrega era provisional.

**Ahora.** Confirmado: V1 en JSON, CSV/XLSX para V2, nombre `expediente-<viaje_id>.json`. Decisión comunicada por Fabricio Fuentes, pendiente de registro como DEC. El Bloque A usa `nombreExpediente` y la prueba de la tarea 10 verifica el nombre entregado. _Requirements 4.4, 4.13._

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (VERIFICADA: se compone, sin componente de librería local)

`@ai27-tech/ui@0.2.0-beta.6` (última publicada).

| Necesidad                                            | Resolución en el spec                                       | Solicitud a la librería                                 |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Indicador de proyección atrasada (`stale`) con fecha | Componente de feature `IndicadorFrescura` (`Badge` + texto) | Indicador de frescura                                   |
| Tarjeta de métrica                                   | `Card`                                                      | Componente de métrica                                   |
| Selector y subida de archivos con progreso           | `Input type="file"` en `FormField`                          | Componente de subida                                    |
| Vista previa de documentos                           | Apertura o descarga por `url_descarga`, sin vista previa    | Visor de documentos (`Visor` solo cubre imagen y audio) |
| Alternar "En curso" / "Últimos 7 días"               | `Button` o `Select`                                         | Ninguna                                                 |

Las necesidades se componen con primitivas de la librería; no se crean componentes de librería locales.

---

## Brecha 5 — Entrada "Reportes" del AppShell (PARCIALMENTE CERRADA)

**Resuelto.** La entrada "Reportes" se oculta a `reaccion`, `jefe_operativo` y `ejecutivo` (coordinado con E8-T4). Cambio aplicado en `navigationConfig.ts` (tarea 30), sin tocar `reportes.tsx`.

**Abierto.** A dónde lleva la entrada para monitorista, supervisor, coordinador y administrador. Hoy apunta al stub `/reportes`, y el dashboard vive en `/monitoreo/dashboard` (Pregunta 6, parte pendiente; Producto y E8-T4).

---

## Preguntas abiertas que condicionan el spec

Lo único pendiente del spec. **Ninguna es código del frontend sin escribir**: son decisiones de negocio o de plataforma externas al repo. Detalle y dueños en `requirements.md` §Preguntas abiertas.

| #   | Tema                                            | Estado                                                                           | Dueño                      |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| 1   | Incidencias y alertas del dashboard             | **Resuelta** (DEC-136): V1 = viajes y estatus (DT-09)                            | —                          |
| 2   | Periodo por omisión                             | **Resuelta**: `en_curso=true` por defecto; rango "últimos 7 días"                | —                          |
| 3   | Formato de la descarga                          | **Resuelta**: JSON, `expediente-<viaje_id>.json`                                 | —                          |
| 4   | Formatos y límites de evidencia, retención      | **Abierta**. No bloquea construir; la UI comunica el rechazo del backend         | Seguridad y Legal          |
| 5   | Nombre y autor del adjunto                      | **Resuelta**: `nombre` obligatorio; autor fuera de V1                            | —                          |
| 6   | Destino de la entrada "Reportes"                | **Parcial**: ocultada a tres roles (hecho); destino abierto                      | Producto / E8-T4           |
| 7   | Vínculo Monitorista–unidades (DT-07)            | **Abierta**: ningún servicio aplica el alcance por unidad                        | Backend / plataforma       |
| 8   | Frescura sin `stale`                            | **Resuelta** (por contrato)                                                      | —                          |
| 9   | Conteos por estado en la vista por defecto      | **Resuelta** (DEC-136)                                                           | —                          |
| 10  | Adjuntos `pendiente` mientras no exista escáner | **Abierta**: delimita `esDescargable` y `sondeoEscaneo`; no se decide en el repo | Producto y Seguridad/Legal |

---

## Pendientes que no se pueden cerrar desde el repo

| Pendiente                                                                                                                                  | Quién                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Preguntas abiertas 4, 6 (destino de «Reportes»), 7 y 10                                                                                    | Producto, Seguridad, Legal, plataforma                                                |
| Despliegue de `core` y verificación E2E (`v0.1.2` o `v0.1.3`)                                                                              | Fabricio Fuentes / quien opera el entorno                                             |
| CORS y CSP del almacén, cabeceras del `PUT` firmado, almacén real y escáner                                                                | Plataforma y backend                                                                  |
| Registro como DEC en `ai27-platform-context` de las respuestas que aún no lo tienen (2, 3, 5, 6, 8 y la decisión de evidencia «preparada») | Product Management (el repo de contexto es compartido; no se escribió en él)          |
| Aprobación de los textos de la interfaz (rótulos, mensajes de error, «en preparación», «sin evidencia»)                                    | Producto                                                                              |
| Decisión sobre `minimumReleaseAgeExclude` para `tracer.36`                                                                                 | Quien mantiene la política de supply-chain (la instalación funciona sin la excepción) |

**Nota de supply-chain.** Al subir el pin, pnpm agregó `tracer.36` a `minimumReleaseAgeExclude` en `pnpm-workspace.yaml`; ese cambio se revirtió porque la excepción salta la política de edad mínima de paquetes y debe aprobarla quien la mantiene. La instalación con el lockfile pasa sin la excepción.

## Verificación de despliegue de `core` (pendiente, no verificable desde el repo)

- `repos/deploy` no tiene manifiestos de `core` (solo una carpeta `keycloak`).
- `VITE_API_BASE_URL` no está configurada (`.env` no existe y `.env.example` la deja vacía): no hay URL para probar el servicio.
- **Cómo verificarlo** (lo confirma quien opera el entorno, tarea 15): con la URL del entorno, una `GET /api/v1/reportes/viajes?en_curso=true` sin token debe responder `401`. Un `404` indica que el `bff` desplegado no monta la ruta. Falta decidir si se confirma `v0.1.2` o `v0.1.3`.
