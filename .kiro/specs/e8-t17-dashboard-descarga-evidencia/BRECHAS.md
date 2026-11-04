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
