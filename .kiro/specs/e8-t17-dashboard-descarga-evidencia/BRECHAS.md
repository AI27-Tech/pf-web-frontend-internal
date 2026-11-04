# Brechas — E8-T17 (Dashboard, descarga del expediente y evidencia)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-11-03, tras la publicación de `tracer.35`)

- **Descarga del expediente: sin brecha.** `descargarViaje` está en el `bff` y en el pin (`tracer.33`); es idéntica en `tracer.35`. Se implementa ya (Bloque A de `tasks.md`).
- **Dashboard: brecha de contrato CERRADA en `tracer.35`; quedan residuos** (Brecha 1). Tareas 15 a 21.
- **Evidencia: brecha de contrato CERRADA en `tracer.35`; quedan residuos** (Brecha 2). Tareas 22 a 29.
- **El pin del frontend sigue en `tracer.33`** y no se sube sin que el usuario lo pida. Mientras tanto el paquete instalado no trae las operaciones nuevas.
- **El backend real no sirve todavía lo nuevo:** `pf-svc-bff` no tiene las rutas y `pf-svc-operacion` no implementa adjuntos.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `ad3290c` (2026-11-03). Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T17 y en `E6-reportes-y-evidencia.md` §E6-T2, §E6-T3, §E6-T4. HU `E6-HU-025`, `E6-HU-026`, `E6-HU-027`. Decisiones DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060, DEC-129 y **DEC-132** (Interno sin permiso: 403; Cliente de otra empresa: 404; inexistente: 404). Deuda **DT-07** (el alcance por unidad no lo aplica ningún servicio).
- **Contrato publicado:** `pf-pkg-contracts` `v0.1.0-tracer.35` (último tag; incluye `tracer.34`, aditivo de emergencias). Superficie leída con `git show v0.1.0-tracer.35:contracts/openapi/bff.yaml` y su `CHANGELOG.md`.
- **Contrato adoptado:** `repos/pf-web-frontend-internal/package.json` fija `@ai27-tech/contracts@0.1.0-tracer.33` y `@ai27-tech/ui@0.2.0-beta.6`. Lo de `tracer.35` **no** está en `node_modules`.
- **Subir el pin (cuando el usuario lo pida):** `tracer.34` es aditivo (en Go renombra constantes de `EstadoEmergencia`; no afecta a TypeScript). `tracer.35` es aditivo en `bff.yaml` y trae una ruptura declarada solo en `operacion.yaml` (`nombre` obligatorio en la intención de subida), que el frontend no consume. Tras subirlo hay que correr `typecheck` y `test`.
- **Estado del backend (remoto):** `pf-svc-bff` `origin/pf-bff-d` (`d10fc83`) fija `tracer.31` y no tiene rutas de reportes ni de adjuntos. `pf-svc-operacion` `origin/pf-op-d` (`19377f1`) no implementa adjuntos. `pf-svc-reportes` `origin/pf-rep-d` (`b4bfc73`) **ya implementa DEC-129** (PR #22) y rechaza al cliente con 403 (PR #23); envía `stale` siempre.
- **Gobierno:** el changelog de `tracer.35` cita **DT-08**, **DT-10**, **DT-11** y una **"Decisión de Producto P5 (E8-T17)"**. Ninguna está registrada en `ai27-platform-context`. Son citas del contrato pendientes de registro; no se tratan como decididas.

---

## Brecha 1 — Operaciones del dashboard en el `bff` (CERRADA EN CONTRATO; residuos abiertos)

**Qué pedía la tarea.** `GET /api/v1/reportes/viajes` y el dashboard de `E6-HU-025`: panel con **viajes, incidencias, alertas y estatus**, acotado por rol y alcance. La DoD exige probar que una proyección atrasada se muestra como stale.

**Qué cambió en `tracer.35`.** `bff.yaml` incluye:

- `reporteViajes` (`GET /api/v1/reportes/viajes`, `desde` y `hasta` obligatorios; 200, 400, 401, 403) y `reporteEstados` (`GET /api/v1/reportes/estados`; 200, 401, 403).
- Schemas `FilaViaje`, `ReporteViajes`, `ConteoEstado` y `ReporteEstados`, idénticos a `reportes.yaml`.
- Autorización: 200 para `monitorista`, `supervisor`, `coordinador` y `administrador`; 403 para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente`.
- `proyeccion_al` y `stale` conservados. Si `stale` falta, el consumidor lo trata como frescura no informada, nunca como fresca (coincide con el Requirement 3.6).

**Qué sigue abierto (residuos).**

| Residuo                                | Detalle                                                                                                                    | Dueño                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Incidencias y alertas                  | `FilaViaje` y `ConteoEstado` no cambiaron: no existen en el contrato. `E6-HU-025` las exige y deja pendiente su definición | Producto decide; Contratos publica |
| Unidad en la fila / alcance por unidad | `FilaViaje` no trae unidad. El alcance está solo declarado en las descripciones y ningún servicio lo aplica (DT-07)        | Backend (identidad, reportes)      |
| `bff` real                             | `pf-svc-bff` fija `tracer.31` y no tiene las rutas                                                                         | Dueño de `pf-svc-bff`              |
| Periodo por omisión                    | `desde` y `hasta` son obligatorios; la interfaz no inventa un periodo (Pregunta abierta 2)                                 | Producto                           |
| Filtro "viajes en curso" (DT-10)       | Lo cita el changelog como urgente en `reportes`; no está en el contexto                                                    | Producto / `reportes`              |

**Efecto de DEC-129.** `pf-svc-reportes` ya no acota por tenant a la audiencia Interno (PR #22 mergeado). Antes el dashboard interno habría salido vacío. La interfaz no filtra por tenant.

**Impacto en el spec.** Los Requirements 2 y 3 pasan de "bloqueados por contrato" a "contrato disponible; pendientes de adoptar el pin y de backend". Las tareas 15 a 21 conservan el marcador `*` hasta cumplir las cuatro condiciones de desbloqueo. `/monitoreo/dashboard` conserva el stub sin cifras. La prueba de la DoD "proyección atrasada se muestra como stale" queda en la tarea 21.

**Propuesta de resolución.** Contratos ya cerró lo suyo. Quedan: (a) decisión de Producto sobre el alcance del dashboard de V1 (¿solo viajes y estatus, o incidencias y alertas con una ola adicional?); (b) `pf-svc-bff` sube pin a `tracer.35` y cablea `reporteViajes` y `reporteEstados`; (c) Producto responde las preguntas 1 y 2.

---

## Brecha 2 — Operaciones de evidencia (adjuntos) en el `bff` (CERRADA EN CONTRATO; residuos abiertos)

**Qué pedía la tarea.** La "superficie de adjuntos" de E8-T17 y `E6-HU-027`: adjuntar evidencia asociada al viaje y consultarla según el alcance, con acceso auditado.

**Qué cambió en `tracer.35`.**

| Operación                     | Método y ruta                                          | Entrada                                                                           | Salida                                                    |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `listarAdjuntos`              | `GET /api/v1/viajes/{id}/adjuntos`                     | —                                                                                 | `PaginaAdjuntos { items: Adjunto[] }` (sin paginar en V1) |
| `crearIntencionSubidaAdjunto` | `POST /api/v1/viajes/{id}/adjuntos/intenciones-subida` | `{ nombre, tipo_medio, tamano_bytes, checksum_sha256 }` (los cuatro obligatorios) | `201 { adjunto_id, url_subida, expira_en }`               |
| `descargarAdjunto`            | `GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga`      | —                                                                                 | `{ url_descarga, expira_en }`                             |

Respuestas 200 o 201, 400, 401, 403 y 404. `Adjunto { id, viaje_id, nombre, tipo_medio, tamano_bytes, checksum_sha256?, estado_escaneo, creado_en }`: **`nombre` ahora es obligatorio**; el autor queda fuera de V1. El `estado_escaneo` se refresca releyendo `listarAdjuntos` (sondeo; sin evento de empuje). 403 para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente`, y para un usuario fuera de alcance antes de emitir ninguna URL.

**Qué sigue abierto (residuos).**

| Residuo                                       | Detalle                                                                             | Dueño                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| `operacion` no implementa adjuntos            | El changelog lo dice; `origin/pf-op-d` no tiene la implementación                   | Dueño de `pf-svc-operacion`   |
| `bff` real                                    | `pf-svc-bff` no tiene las rutas                                                     | Dueño de `pf-svc-bff`         |
| Códigos de rechazo de la subida               | Solo hay un 400 genérico; no hay códigos de máquina para formato, tamaño o cantidad | Contratos / Seguridad y Legal |
| Cabeceras del `PUT` firmado                   | No documentadas (por ejemplo `Content-Type`)                                        | Contratos / Plataforma        |
| Límites de evidencia                          | Formatos, tamaño, cantidad, retención y legal hold (Pregunta abierta 4)             | Seguridad y Legal             |
| CORS y CSP del object storage                 | Origen del panel en `connect-src` y permiso `PUT`/`GET`                             | Plataforma                    |
| Registro de la decisión del nombre y el autor | El changelog cita "P5" y DT-11, no registradas en contexto                          | Producto                      |

**Impacto en el spec.** El Requirement 5 pasa de "bloqueado por contrato" a "contrato disponible; pendiente de adoptar el pin y de backend". Se añadieron `nombre` (lista e intención) y el sondeo de escaneo (Requirement 5.15). Las tareas 22 a 29 conservan el marcador `*`.

**Prerrequisito de infraestructura (no es brecha de contrato).** La subida y la descarga de bytes van al object storage on-premise (MinIO, propuesta ADR 32) con URL firmada. Hay que verificar con Plataforma el CORS y la CSP.

---

## Brecha 3 — Formato final de la descarga (DECISIÓN DE PRODUCTO, no de contrato)

**Qué pedía la tarea.** `E6-HU-026` deja el formato (PDF u otro) "por confirmar".

**Qué existe hoy.** `descargarViaje` devuelve JSON (`DescargaViaje`), sin cambios en `tracer.35`. No hay generación de PDF en el `bff`.

**Resolución en el spec.** Entrega **provisional** como archivo JSON con el payload exacto y nombre de trabajo `expediente-<viaje_id>.json`. Producto decide el formato final (Pregunta abierta 3). Si el formato final es PDF, probablemente el `bff` debe generarlo y se vuelve solicitud de contrato.

**Impacto en el spec.** Requirements 4.4 y 4.13. No bloquea el Bloque A.

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (VERIFICADA: se compone, sin componente de librería local)

**Qué pide la tarea.** Tarjetas de indicadores, tabla de viajes y de adjuntos, marca de proyección atrasada, selector de archivo y consulta de documentos.

**Qué existe hoy (`@ai27-tech/ui@0.2.0-beta.6`, última publicada).** `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`/`ToastContainer`, `Form`/`FormField`, `Input` (acepta `type="file"`), `Visor` (solo IMAGE y AUDIO).

| Necesidad                                            | Resolución en el spec                                                     | Solicitud a la librería                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Indicador de proyección atrasada (`stale`) con fecha | Componente de **feature** `IndicadorFrescura` que compone `Badge` + texto | Indicador de frescura                             |
| Tarjeta de métrica                                   | `Card`                                                                    | Componente de métrica                             |
| Selector y subida de archivos con progreso           | `Input type="file"` en `FormField`                                        | Componente de subida (verificar al desbloquear C) |
| Vista previa de documentos (PDF, etc.)               | Apertura o descarga por `url_descarga`, sin vista previa                  | Visor de documentos                               |

**Impacto en el spec.** No bloquea el Bloque A.

---

## Brecha 5 — Entrada "Reportes" del AppShell frente al acceso por rol (DECISIÓN DE PRODUCTO / E8-T4)

**Qué pide la tarea.** Jefe Operativo, Ejecutivo y Reacción no acceden al dashboard, la descarga ni la evidencia (DEC-022 #9, DEC-060).

**Qué existe hoy.** `navigationConfig.ts` solo oculta "Reportes" a `reaccion`.

**Resolución en el spec.** E8-T17 no toca `reportes.tsx` ni `navigationConfig.ts`. Oculta sus tres capacidades con `puedeUsarMonitoreo(rol)` en sus propios puntos de entrada. La entrada de navegación y su destino se deciden con Producto y E8-T4 (Pregunta abierta 6).

---

## Cambios de semántica que ya están aplicados en el spec

- **DEC-132:** `403` = sin permiso o fuera de alcance (usuario Interno); `404` = viaje inexistente. La clase de error es `ErrorViajeInexistente`.
- **`nombre` del adjunto:** obligatorio en la intención y visible en la lista.
- **`stale` ausente:** frescura no informada, ya respaldado por el contrato.
- **Sondeo del escaneo:** solo mientras haya un adjunto `pendiente`.

## Preguntas abiertas que condicionan el spec

Detalle y dueños en `requirements.md` §Preguntas abiertas.

| #   | Tema                                                                        | Estado                                                                                |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Indicadores del dashboard (incidencias y alertas no existen en el contrato) | **Abierta**, Producto                                                                 |
| 2   | Periodo por omisión                                                         | **Abierta**, Producto                                                                 |
| 3   | Formato final de la descarga                                                | **Abierta**, Producto                                                                 |
| 4   | Formatos y límites de evidencia, retención                                  | **Abierta**, Seguridad y Legal                                                        |
| 5   | Nombre y autor del adjunto                                                  | **Resuelta por contrato** (nombre sí, autor fuera de V1); falta registrar la decisión |
| 6   | Entrada "Reportes" del menú                                                 | **Abierta**, Producto y E8-T4                                                         |
| 7   | Vínculo Monitorista–unidades                                                | **Abierta**, ligada a DT-07                                                           |
| 8   | Frescura sin `stale`                                                        | **Resuelta por contrato**; falta confirmar el texto con Producto                      |

## Residuos de la ejecución del Bloque A (2026-11-04)

Superficies que el Bloque A no puede demostrar, o que quedan fuera de la prueba automatizada:

- **Tarea 11 (pruebas de propiedades, opcional `*`): no implementada.** Las Properties 1, 2 y 4 quedan cubiertas solo por pruebas de ejemplo (`tests/viajes/ExpedienteViaje.test.tsx`, `tests/viajes/expedienteEntrega.unit.test.ts`, `tests/layout/puedeUsarMonitoreo.unit.test.ts`).
- **Tarea 12: el enlace de `DetalleViaje` para roles sin acceso no tiene prueba de render.** La regla está aplicada en código (`usuario && puedeUsarMonitoreo(usuario.rol)`), pero no se probó renderizando `DetalleViaje`.
- **Tarea 12: el Escenario 6 (la bandeja no ofrece descarga en lote) no tiene prueba.** Tampoco se verificó por inspección de la bandeja.
- **Tarea 12: el `401` se delega al flujo de sesión.** La pantalla no renderiza nada en ese caso. La prueba confirma que no aparece error genérico, pero no que el `AppShell` redirija a login.
- **Mensajes de la pantalla y nombre `expediente-<viaje_id>.json`:** de trabajo, pendientes de aprobación de Producto (Brecha 3 y Pregunta abierta 3).
- **Desviación menor del contrato de la tarea 6:** `useDescargaExpediente` también devuelve `exito`, necesario para el aviso de éxito.
- **Formato:** `DetalleViaje.tsx`, `src/mocks/handlers.ts` y `src/mocks/data.ts` ya incumplían Prettier en `HEAD`. No se reformatearon completos.
- **Pin del contrato:** sigue en `@ai27-tech/contracts@0.1.0-tracer.33`, sin cambios.
