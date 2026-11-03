# Brechas — E8-T17 (Dashboard, descarga del expediente y evidencia)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación ausente se solicita al repo de contratos; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (2026-11-03)

- **Descarga del expediente: sin brecha de contrato.** `descargarViaje` está publicada en el `bff` y presente en el paquete instalado. Se implementa ya (Bloque A de `tasks.md`).
- **Dashboard: BLOQUEADO por la Brecha 1.** Tareas 15 a 21.
- **Evidencia: BLOQUEADA por la Brecha 2.** Tareas 22 a 29.

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `3e46bcb` (se hizo `git pull --ff-only` desde `bad7067` en dos pasos; los commits nuevos registran DEC-124 a DEC-131 y DT-06. DEC-129 sí toca a E8-T17, ver abajo; DEC-124 a DEC-128, DEC-130 y DEC-131 no). Historia técnica en `docs/historias-tecnicas/E8-panel-admin.md` §E8-T17 y en `E6-reportes-y-evidencia.md` §E6-T2, §E6-T3, §E6-T4. HU `E6-HU-025`, `E6-HU-026`, `E6-HU-027`. Decisiones DEC-009, DEC-022 #7 y #9, DEC-023, DEC-033, DEC-039, DEC-040, DEC-045, DEC-060.
- **Contrato:** fijado por `repos/pf-web-frontend-internal/package.json`: `@ai27-tech/contracts@0.1.0-tracer.33`, `@ai27-tech/ui@0.2.0-beta.6`. `tracer.33` es también el último tag publicado de `pf-pkg-contracts`. Superficie leída con `git show v0.1.0-tracer.33:contracts/openapi/{bff,reportes,operacion}.yaml` y comprobada en `node_modules/@ai27-tech/contracts/src/openapi/bff.gen.ts`.
- **Checkout local de contratos:** está en la rama `feat/ficha-tecnica-e-historico-tracer21` (`a8fcfb7`, 40 commits por delante de su remoto). Contiene `tracer.33` y `bff.yaml` no difiere del tag, así que lo que se lee en desarrollo coincide con lo que se libera. Existe `origin/feat/bandeja-reaccion-tracer-34`, sin tag publicado; no aplica.
- **Búsqueda en ramas:** `reporteViajes`, `reportes/viajes` y `/adjuntos` no aparecen en el `bff.yaml` de ninguna rama remota de `pf-pkg-contracts`. No hay trabajo en curso que cierre las brechas 1 y 2.

---

## Brecha 1 — Operaciones del dashboard en el `bff` (ABIERTA)

**Qué pide la tarea.** E8-T17 declara `GET /api/v1/reportes/viajes` y el dashboard de `E6-HU-025`: panel con **viajes, incidencias, alertas y estatus**, acotado por rol y alcance. La DoD exige probar que una proyección atrasada se muestra como stale. El frontend interno solo habla con el `bff`.

**Qué existe hoy.**

- `contracts/openapi/reportes.yaml` (tag `v0.1.0-tracer.33`) define `reporteViajes` (`GET /api/v1/reportes/viajes`, query `desde` y `hasta` obligatorios) y `reporteEstados` (`GET /api/v1/reportes/estados`, mismos parámetros).
- `ReporteViajes { filas: FilaViaje[], total, proyeccion_al? (nullable), stale? }` con `FilaViaje { viaje_id, cliente_id?, estado, creado_en?, cerrado_en? }`.
- `ReporteEstados { conteos: [{ estado, conteo, permanencia_promedio_seg? }], proyeccion_al?, stale? }`.
- `bff.yaml` (mismo tag) **no** contiene ninguna operación de reportes; `bff.gen.ts` instalado tampoco.

**Qué falta exactamente.**

1. Proyectar `reporteViajes` y `reporteEstados` al `bff` (rutas espejo, mismos `operationId` y schemas, con las guardas de rol y alcance del `bff`), como se hizo con la bandeja en DEC-116.
2. Los datos para incidencias y alertas: `FilaViaje` y `ConteoEstado` no los traen.
3. La unidad del viaje o una declaración explícita de que el `bff` filtra por alcance de unidad: el contrato no la expresa, y el criterio de aceptación de `E6-HU-025` es "acotado por unidad".
4. Qué entrega el servicio cuando `stale` falta (hoy es opcional).

**Efecto de DEC-129 (2026-11-03).** Los servicios dejan de acotar por tenant las lecturas de la audiencia Interno; `reportes` incluido (antes el dashboard interno habría salido vacío). No cierra la brecha: la operación sigue sin estar en el `bff`. Sí confirma que el límite del dashboard es el rol y el alcance por unidad (DEC-045), no el tenant, y que el frontend no debe filtrar por tenant. **Verificado 2026-11-03:** `pf-svc-reportes` (`origin/pf-rep-d`, `02234e9`) todavía acota por `tenantDe(ctx)` en `reportes.go`; DEC-129 está decidida pero sin implementar. Es un prerrequisito backend del dashboard, aparte de la proyección al `bff`.

**Impacto en el spec.** Bloquea los Requirements 2 y 3 y las tareas 15 a 21. `/monitoreo/dashboard` conserva el stub sin cifras. La prueba de la DoD «proyección atrasada se muestra como stale» queda diferida a la publicación. No se deriva el tablero de `listarViajes`/`listarIncidencias` ni se calculan alertas en el cliente.

**Condicionada además a decisiones de Producto** (no son brechas de contrato): detalle de cada indicador y qué es una "alerta" (Pregunta abierta 1), periodo por omisión (2), frescura sin `stale` (8).

**Propuesta de resolución.** Solicitud al encargado de contratos:

> Proyectar al `bff` (`bff.yaml`) las operaciones `reporteViajes` y `reporteEstados` de `reportes.yaml`, reenviando a `reportes` con las guardas de alcance por unidad (monitorista: sus unidades; supervisor y coordinador: la unión de su alcance; administrador: global) y 403 para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente` (DEC-022 #9, DEC-060). Conservar `proyeccion_al` y `stale` en la respuesta. Definir con Producto el contenido de incidencias y alertas (E6-HU-025, pendientes de definición) y, si aplica, incorporarlo al schema. Publicar en un tracer nuevo.

---

## Brecha 2 — Operaciones de evidencia (adjuntos) en el `bff` (ABIERTA)

**Qué pide la tarea.** E8-T17 declara la "superficie de adjuntos" y `E6-HU-027`: adjuntar evidencia asociada al viaje y consultarla según el alcance, con acceso auditado.

**Qué existe hoy.** `contracts/openapi/operacion.yaml` (tag `v0.1.0-tracer.33`) define, con tag `adjuntos`:

| Operación                     | Método y ruta                                          | Request                                                                                                        | Response                                    |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `listarAdjuntos`              | `GET /api/v1/viajes/{id}/adjuntos`                     | —                                                                                                              | `PaginaAdjuntos { items: Adjunto[] }`       |
| `crearIntencionSubidaAdjunto` | `POST /api/v1/viajes/{id}/adjuntos/intenciones-subida` | `{ tipo_medio, tamano_bytes, checksum_sha256 }` (los tres obligatorios; checksum SHA-256 hex de 64 caracteres) | `201 { adjunto_id, url_subida, expira_en }` |
| `descargarAdjunto`            | `GET /api/v1/viajes/{id}/adjuntos/{aid}/descarga`      | —                                                                                                              | `{ url_descarga, expira_en }`               |

`Adjunto { id, viaje_id, tipo_medio, tamano_bytes, checksum_sha256?, estado_escaneo (pendiente|limpio|infectado), creado_en }`. Un adjunto no `limpio` no autoriza descarga. `bff.yaml` y `bff.gen.ts` **no** contienen ninguna de las tres operaciones.

**Qué falta exactamente.**

1. Proyectar las tres operaciones al `bff` con las guardas de alcance y rol.
2. Un identificador visible del adjunto: `Adjunto` no trae **nombre de archivo ni autor**. Sin ellos la lista de evidencia solo puede mostrar tipo, tamaño, estado de escaneo y fecha (Pregunta abierta 5).
3. Los códigos de error de la intención de subida cuando el backend rechaza formato, tamaño o cantidad (los límites están pendientes de Seguridad y Legal; Pregunta abierta 4).

**Impacto en el spec.** Bloquea el Requirement 5 y las tareas 22 a 29. No se llama a `operacion` directamente ni se simulan lista o subida.

**Prerrequisito de infraestructura (no es brecha de contrato).** La subida y la descarga de bytes van al object storage on-premise (MinIO, propuesta ADR 32) con una URL firmada. Hay que verificar con plataforma que el origen del panel está permitido por CORS (`PUT` y `GET`) y por la CSP (`connect-src`).

**Propuesta de resolución.** Solicitud al encargado de contratos:

> Proyectar al `bff` (`bff.yaml`) `listarAdjuntos`, `crearIntencionSubidaAdjunto` y `descargarAdjunto` de `operacion.yaml`, con las guardas de alcance por unidad y 403 para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente` (DEC-022 #9, DEC-060). Evaluar con Producto añadir `nombre` (y opcionalmente el actor) a `Adjunto`. Documentar los códigos de rechazo de formato, tamaño y cantidad cuando Seguridad y Legal los definan. Publicar en un tracer nuevo.

---

## Brecha 3 — Formato final de la descarga (DECISIÓN DE PRODUCTO, no de contrato)

**Qué pedía la tarea.** `E6-HU-026` deja el formato de la descarga (PDF u otro) "por confirmar", y la historia técnica habla de "un formato de exportación".

**Qué existe hoy.** `descargarViaje` devuelve JSON (`DescargaViaje`). No hay generación de PDF en el `bff`.

**Resolución en el spec.** Entrega **provisional** como archivo JSON con el payload exacto, sin fijar formato final ni nombre definitivo (nombre de trabajo `expediente-<viaje_id>.json`). Producto decide el formato final (Pregunta abierta 3). Si el formato final es PDF, probablemente exige que el `bff` lo genere y se vuelve una solicitud de contrato.

**Impacto en el spec.** Requirement 4.4 y 4.13. No bloquea el Bloque A.

---

## Brecha 4 — Componentes de `@ai27-tech/ui` (VERIFICADA: se compone, sin componente de librería local)

**Qué pide la tarea.** Tarjetas de indicadores, tabla de viajes y de adjuntos, marca de proyección atrasada, selector de archivo y consulta de documentos.

**Qué existe hoy (`@ai27-tech/ui@0.2.0-beta.6`).** `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`/`ToastContainer`, `Form`/`FormField`, `Input` (acepta `type="file"`), `Visor` (solo IMAGE y AUDIO).

**Qué falta.**

| Necesidad                                            | Resolución en el spec                                                     | Solicitud a la librería                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Indicador de proyección atrasada (`stale`) con fecha | Componente de **feature** `IndicadorFrescura` que compone `Badge` + texto | Sí: indicador de frescura                                  |
| Tarjeta de métrica                                   | `Card`                                                                    | Sí: componente de métrica                                  |
| Selector y subida de archivos con progreso           | `Input type="file"` en `FormField`                                        | Sí: componente de subida (verificar al desbloquear C)      |
| Vista previa de documentos (PDF, etc.)               | Apertura o descarga por `url_descarga`, sin vista previa                  | Sí: visor de documentos (`Visor` solo cubre IMAGE y AUDIO) |

**Impacto en el spec.** No bloquea el Bloque A (solo usa `Card`, `Button`, `Toast`). Las filas de dashboard y evidencia se confirman al desbloquear B y C.

---

## Brecha 5 — Entrada "Reportes" del AppShell frente al acceso por rol (DECISIÓN DE PRODUCTO / E8-T4)

**Qué pide la tarea.** Jefe Operativo, Ejecutivo y Reacción no acceden al dashboard, la descarga ni la evidencia (DEC-022 #9, DEC-060).

**Qué existe hoy.** `navigationConfig.ts` solo oculta "Reportes" a `reaccion`; `jefe_operativo` y `ejecutivo` la ven. La regla de E8-T4 es esconder solo lo que la fuente especifica explícitamente; la negación real es del `bff`.

**Resolución en el spec.** E8-T17 no toca `reportes.tsx` ni `navigationConfig.ts`. Las tres capacidades se ocultan con `puedeUsarMonitoreo(rol)` en sus propios puntos de entrada (el enlace del detalle del viaje y la pantalla de expediente). La entrada de navegación "Reportes" y su destino se deciden con Producto y el spec de E8-T4 (Pregunta abierta 6).

---

## Preguntas abiertas que condicionan el spec

Detalle y dueños en `requirements.md` §Preguntas abiertas: 1 (indicadores del dashboard, Producto), 2 (periodo por omisión, Producto), 3 (formato de descarga, Producto), 4 (formatos y límites de evidencia, Seguridad y Legal), 5 (nombre y autor del adjunto, Producto y Contratos), 6 (entrada "Reportes", Producto y E8-T4), 7 (vínculo Monitorista–unidades, Producto e identidad), 8 (frescura sin `stale`, Producto y Contratos).
