# Design Document

## Overview

Diseño del **dashboard de monitoreo, la descarga del expediente y la evidencia del viaje** (E8-T17) en el panel interno. Se construye con las convenciones ya establecidas en `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que el histórico (E8-T13), la ficha (E8-T12) y el detalle (E8-T8), sin introducir patrones nuevos.

El diseño se divide en tres bloques con estados de implementación distintos. Ese reparto es la decisión central del documento:

| Bloque | Capacidad               | Requisitos | Estado frente al contrato                                                                                                                                     | Estado de implementación       |
| ------ | ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **A**  | Descarga del expediente | 1, 4, 6    | `descargarViaje` publicada y en el pin (`tracer.33`)                                                                                                          | **Se implementa ya**           |
| **B**  | Dashboard de monitoreo  | 2, 3       | **Brecha 1**: contrato cerrado en `tracer.35` (`reporteViajes`/`reporteEstados`); pendiente de adoptar el pin y de backend                                    | **Diseñado, NO se implementa** |
| **C**  | Evidencia del viaje     | 5          | **Brecha 2**: contrato cerrado en `tracer.35` (`listarAdjuntos`, `crearIntencionSubidaAdjunto`, `descargarAdjunto`); pendiente de adoptar el pin y de backend | **Diseñado, NO se implementa** |

Los bloques B y C se diseñan completos para que el comportamiento esté definido, pero no se escribe código ni mocks de operaciones que el pin instalado no trae ni el `bff` real sirve. No se construye ninguna alternativa (no se deriva el tablero de `listarViajes`/`listarIncidencias`, no se llama a `operacion` ni a `reportes` directamente, no se simula una subida).

### Hecho de contrato verificado (fundamento del diseño)

Contexto y contrato heredados de `requirements.md`: `ai27-platform-context` en el commit `ad3290c` (antes `3e46bcb`; verificado 2026-11-03); `@ai27-tech/contracts@0.1.0-tracer.35` **publicado** y último tag, mientras el **pin** de `package.json` **sigue en `0.1.0-tracer.33`**; `@ai27-tech/ui@0.2.0-beta.6`. `descargarViaje` y `DescargaViaje` son idénticos en `tracer.33` y `tracer.35`. El bloque A se comprobó contra el paquete instalado (`node_modules/@ai27-tech/contracts/src/openapi/bff.gen.ts`); los bloques B y C, contra `bff.yaml` de `tracer.35`:

```
# Bloque A — PUBLICADA en el bff y en el pin (tracer.33)
GET /api/v1/viajes/{id}/descarga   descargarViaje   → 200 DescargaViaje | 401 | 403 | 404
#   DescargaViaje { viaje_id, ficha: FichaTecnicaDescarga, bitacora: EntradaBitacoraDescarga[],
#                   auditoria: RegistroAuditoriaDescarga[], generado_en }
#   FichaTecnicaDescarga { estado, cliente_id?, origen, destinos[{ nombre, numero_envio? }],
#                          fecha_hora_servicio?, tipo_servicio? }
#   EntradaBitacoraDescarga { texto, autor, ts }    RegistroAuditoriaDescarga { entidad, actor, ts }
#   El esquema documenta que NO contiene cuenta espejo ni clave_amago (DEC-009 / DEC-039).

# Bloque B — en bff.yaml de tracer.35; NO en el paquete instalado (tracer.33) ni servida por el bff real
GET /api/v1/reportes/viajes    reporteViajes    (query desde/hasta obligatorios)
GET /api/v1/reportes/estados   reporteEstados
#   ReporteViajes { filas: FilaViaje[{ viaje_id, cliente_id?, estado, creado_en?, cerrado_en? }],
#                   total, proyeccion_al? (nullable), stale? }
#   ReporteEstados { conteos[{ estado, conteo, permanencia_promedio_seg? }], proyeccion_al?, stale? }
#   Sin incidencias, alertas ni unidad en ningún schema. Si `stale` falta = frescura no informada,
#   nunca fresca (documentado por el contrato tracer.35).

# Bloque C — en bff.yaml de tracer.35; NO en el paquete instalado (tracer.33) ni servida por el bff real
GET  /api/v1/viajes/{id}/adjuntos                        listarAdjuntos
POST /api/v1/viajes/{id}/adjuntos/intenciones-subida     crearIntencionSubidaAdjunto
GET  /api/v1/viajes/{id}/adjuntos/{aid}/descarga         descargarAdjunto
#   Adjunto { id, viaje_id, nombre, tipo_medio (MIME), tamano_bytes, checksum_sha256?, estado_escaneo, creado_en }
#   PaginaAdjuntos { items: Adjunto[] }  — sin paginación en V1 (DT-08, citada por el contrato)
#   Entrada de subida { nombre, tipo_medio (MIME), tamano_bytes, checksum_sha256 (SHA-256 hex, 64 caracteres) }
#                     — los cuatro obligatorios
#   Autor del adjunto: fuera de V1 (DT-11, citada por el contrato). estado_escaneo se refresca releyendo
#   listarAdjuntos (sondeo HTTP); no hay evento de empuje.
#   El contrato no documenta códigos de rechazo de la intención (solo 400 genérico) ni cabeceras del PUT firmado.
```

Estado de backend (verificado 2026-11-03): `pf-svc-bff` (`origin/pf-bff-d`) fija `tracer.31` y no tiene rutas de reportes ni de adjuntos; `pf-svc-operacion` (`origin/pf-op-d`) no implementa adjuntos; `pf-svc-reportes` (`origin/pf-rep-d`) ya implementa DEC-129 y rechaza al cliente con `403`, y envía `stale` siempre. DT-10 (filtro "viajes en curso" en reportes) y DT-11 las cita el contrato pero no están registradas en el repo de contexto: no se diseñan ni se tratan como decididas.

Consecuencias de diseño:

- Los alias de `lib/contracts/expediente.ts` salen de `components['schemas']` de `@ai27-tech/contracts/openapi/bff`, como `lib/contracts/fichaTecnica.ts`. No se reafirman tipos a mano.
- `lib/contracts/reportes.ts` y `lib/contracts/adjuntos.ts` **no se crean** mientras el paquete instalado (`tracer.33`) no traiga las operaciones. Si no existen en el paquete, un alias no compila; y escribir los tipos a mano violaría la regla de fuente única de contrato.
- `tipo_medio` es el tipo MIME. El diseño envía `file.type`; no inventa un MIME de respaldo (ver Decisiones).
- La subida y la descarga de bytes de evidencia van contra una URL de vida corta del object storage, no contra el `bff`. Esos bytes no pasan por `request` de `client.ts`.

Tres propiedades del dominio son del `bff`/backend, no de la interfaz, y la interfaz no las reimplementa: el **alcance por unidad** (`403` antes de componer nada), la **auditoría** de cada descarga exitosa (la escribe `operacion`) y el **cálculo de `stale`** (lo entrega el `bff`). La interfaz solo oculta afordancias según el rol y clasifica las respuestas.

### Criterio de desbloqueo de los bloques B y C

Un bloque condicionado se implementa solo cuando se cumplan las tres primeras condiciones; la cuarta condiciona la verificación de extremo a extremo, no la escritura del código:

1. La operación está en `bff.yaml` de un tag publicado. **Cumplida en el contrato** para `tracer.35`; debe comprobarse además en `bff.gen.ts` tras subir el pin (comprobación: `grep` del `operationId` en `node_modules/@ai27-tech/contracts/src/openapi/bff.gen.ts`).
2. El usuario pide subir el pin de `@ai27-tech/contracts` (no se sube por iniciativa propia). El cambio `tracer.33` → `tracer.35` incluye `tracer.34`, aditivo de emergencias, y una ruptura declarada solo en `operacion.yaml`, que el frontend no consume. Tras subir el pin se corren `typecheck` y `test`.
3. Las preguntas abiertas que tocan al bloque tienen respuesta de su dueño: B depende de las Preguntas 1 y 2; C, de la Pregunta 4. Las Preguntas 5 y 8 quedaron resueltas por el contrato `tracer.35` (`nombre` en el adjunto y semántica de `stale` ausente).
4. **Verificación de extremo a extremo:** el `bff` real sirve las operaciones y `operacion` implementa adjuntos. Mientras no ocurra, B y C solo se prueban con MSW basado en el contrato publicado, y no se afirma que funcionen contra el backend.

Sigue vigente: no se escriben mocks de operaciones no adoptadas (ni siquiera con el contrato cerrado, mientras el pin no las traiga).

## Architecture

### Rutas

| Ruta                                                             | Archivo                                         | Estado                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `/viajes/$id/expediente` (nueva: descarga y, después, evidencia) | `src/routes/_private/viajes/$id/expediente.tsx` | Bloque A, se crea                                                         |
| `/monitoreo/dashboard`                                           | `src/routes/_private/monitoreo/dashboard.tsx`   | Hoy es un stub; conserva el stub hasta que se desbloquee B                |
| `/monitoreo` (layout)                                            | `src/routes/_private/monitoreo.tsx`             | Stub "será reemplazado por E8-T17": solo `<Outlet />`; no necesita cambio |
| `/reportes` y entrada "Reportes" del AppShell                    | `reportes.tsx`, `navigationConfig.ts`           | **No se tocan** (Pregunta abierta 6, dueño Producto y E8-T4)              |

`useInitialRoute` ya envía a `monitorista`, `supervisor` y `coordinador` a `/monitoreo/dashboard`; no cambia. El árbol `routeTree.gen.ts` lo regenera el plugin del router al agregar el archivo de ruta nuevo.

El enlace a `/viajes/$id/expediente` se agrega en `DetalleViaje.tsx`, junto al botón existente "Ver histórico del viaje", con el mismo patrón (`navigate({ to: '/viajes/$id/expediente', params: { id } })`). Solo se muestra si `puedeUsarMonitoreo(usuario.rol)`.

### Vista de capas

```
routes/_private/viajes/$id/expediente.tsx        (Bloque A)
routes/_private/monitoreo/dashboard.tsx          (Bloque B; stub hasta desbloqueo)
        │  usan
        ▼
features/monitoreo/
  └─ puedeUsarMonitoreo.ts            (función pura: Rol → boolean; compartida por A, B y C)
features/viajes/expediente/           (Bloque A)
  ├─ useDescargaExpediente.ts         (useMutation; una pulsación = una solicitud)
  ├─ entregarArchivo.ts               (serializar + entrega por Blob/anchor temporal)
  ├─ ExpedienteViaje.tsx              (composición de la pantalla; bloqueo por rol)
  └─ BotonDescargarExpediente.tsx     (acción, estado "en preparación")
features/monitoreo/dashboard/         (Bloque B — NO se implementa)
  ├─ estadoFrescura.ts                (función pura: reporte → atrasada|fresca|sin_datos|no_informada)
  ├─ useDashboardMonitoreo.ts         (useQuery, retry:false)
  ├─ DashboardMonitoreo.tsx
  └─ IndicadorFrescura.tsx            (Badge + texto de stale/proyeccion_al)
features/viajes/evidencia/            (Bloque C — NO se implementa)
  ├─ calcularSha256.ts                (Web Crypto)
  ├─ vigenciaUrl.ts                   (función pura: expira_en vs ahora)
  ├─ adjuntoDescargable.ts            (función pura: estado_escaneo → boolean)
  ├─ sondeoEscaneo.ts                 (función pura: items → ¿hay algún pendiente?; constante del intervalo)
  ├─ useEvidenciaViaje.ts             (query de lista + subida en 3 pasos + autorización de descarga)
  ├─ EvidenciaViaje.tsx
  ├─ ListaAdjuntos.tsx
  └─ SubirEvidencia.tsx
        │  usan
        ▼
lib/api/expediente.ts                 (A) descargarViaje; clasifica 403/404
lib/api/reportes.ts                   (B) reporteViajes, reporteEstados
lib/api/adjuntos.ts                   (C) listarAdjuntos, crearIntencionSubidaAdjunto, descargarAdjunto
        │  usan
        ▼
lib/api/client.ts                     (única puerta HTTP contra el bff — ya existe)
        │  tipos
        ▼
lib/contracts/expediente.ts           (A) alias de schemas generados
lib/contracts/reportes.ts             (B) alias de schemas generados — no se crea hasta el desbloqueo
lib/contracts/adjuntos.ts             (C) alias de schemas generados — no se crea hasta el desbloqueo
```

Excepción deliberada a "todo pasa por `client.ts`": la subida PUT de bytes a `url_subida` (Bloque C) usa `fetch` directo contra el object storage, porque `request` antepone `API_BASE_URL`/`API_PREFIX` y adjunta `Authorization: Bearer`, y esa URL ya viene firmada. Está acotada a una función (`subirBytes` en `lib/api/adjuntos.ts`).

Los wrappers de `lib/api` reciben `accessToken` como parámetro, igual que `historicoViaje.ts`; los hooks lo obtienen de `useSession()`.

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo de librería)

Verificado en `node_modules/@ai27-tech/ui/dist/components`: existen `Card`, `Table`, `Badge`, `Button`, `Modal`, `Toast`/`ToastContainer`, `Form`/`FormField`, `Input`, `Visor` (solo IMAGE/AUDIO). `Input` extiende `InputHTMLAttributes<HTMLInputElement>` y por tanto acepta `type="file"`.

| Necesidad                                                  | Componente                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Contenedor y secciones de la pantalla de expediente        | `Card`, `CardHeader`, `CardBody`                                                                  |
| Acción "Descargar expediente" y su estado "en preparación" | `Button` (`disabled` mientras `preparando`)                                                       |
| Aviso de éxito y errores recuperables                      | `Toast` + `ToastContainer` (mismo uso que `DetalleViaje`)                                         |
| Acceso no autorizado de la pantalla                        | Composición local de `Card` + `Button`, como el `AccesoNoAutorizado` local de `FichaTecnicaViaje` |
| Tarjetas de indicadores del dashboard (B)                  | `Card` (no hay componente de métricas)                                                            |
| Tabla de viajes y de adjuntos (B, C)                       | `Table`                                                                                           |
| Marca de atraso y estado de escaneo (B, C)                 | `Badge`                                                                                           |
| Selector de archivo (C)                                    | `Input type="file"` dentro de `FormField`                                                         |
| Confirmaciones (C)                                         | `Modal`                                                                                           |
| Consulta de adjuntos tipo imagen o audio (C)               | `Visor`, solo si el adjunto es IMAGE/AUDIO; ver Decisiones                                        |

Brechas de componentes (a registrar como solicitud a la librería en `BRECHAS.md`, tarea de otro paso, sin crear componentes de librería locales):

- No hay indicador `stale`. `IndicadorFrescura` es un componente de **feature** que solo compone `Badge` + texto; es válido porque no duplica ninguna pieza de la librería.
- No hay componente de métricas. Se compone con `Card`.
- No hay selector/subida de archivos dedicado. Se compone con `Input type="file"`. Si al implementar C se comprueba que la librería no lo estiliza correctamente, se registra brecha de UI.
- No hay vista previa de documentos. PDF y otros documentos se abren o descargan mediante `url_descarga`, sin vista previa.

## Components and Interfaces

### Compartido

- **`features/monitoreo/puedeUsarMonitoreo.ts`** — función pura `puedeUsarMonitoreo(rol: Rol): boolean`. Es verdadera exactamente para `monitorista`, `supervisor`, `coordinador` y `administrador`; falsa para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente`. El tipo `Rol` y los valores salen de `@ai27-tech/contracts/roles` (patrón de `visibilidadCorreccion.ts`: lista cerrada `readonly Rol[]` + `includes`). Es una ayuda de interfaz; la autoridad es el `bff`.

### Bloque A — Descarga del expediente (se implementa)

- **`lib/contracts/expediente.ts`** — alias `DescargaViaje`, `FichaTecnicaDescarga`, `EntradaBitacoraDescarga` y `RegistroAuditoriaDescarga` de `components['schemas']` importados de `@ai27-tech/contracts/openapi/bff`.
- **`lib/api/expediente.ts`** — wrapper `descargarViaje(id, accessToken): Promise<DescargaViaje>` sobre `request` (`GET /viajes/${id}/descarga`). Devuelve el JSON **sin transformarlo**: es la fuente exacta del archivo. Clasifica por `status` en clases propias, como `historicoViaje.ts`:
  - `403` → `ErrorDescargaProhibida` (`kind: 'noAutorizado'`, `status: 403`): autorización insuficiente, sea por falta de permiso o por estar fuera de alcance de un usuario Interno (DEC-132; Requirement 1.5).
  - `404` → `ErrorViajeInexistente` (`kind: 'noEncontrado'`, `status: 404`): el viaje no existe (DEC-132; Requirement 1.6).
  - `401` no se clasifica aquí: `client.ts` ya intenta el refresco y, si falla, corta la sesión y lanza `ApiError('sesionFinalizada')`, que el wrapper deja pasar.
  - Red y `5xx` pasan sin cambio (`red`, `degradado`).

  `kindFromStatus` mapea `401` y `403` al mismo `kind: 'noAutorizado'`; por eso la distinción se hace por `status`, no por `kind`. `ErrorAutorizacionInsuficiente` ya existe en `historicoViaje.ts`; no se reutiliza para no acoplar expediente con histórico, y extraer una clase común a `errors.ts` sería un refactor no solicitado (se anota como oportunidad).

- **`features/viajes/expediente/entregarArchivo.ts`** — dos piezas:
  - `serializarExpediente(payload: DescargaViaje): string`, pura: `JSON.stringify(payload, null, 2)`. No filtra, renombra ni agrega claves. La indentación es solo formato; el contenido parseado es idéntico al payload.
  - `nombreProvisionalExpediente(viajeId: string): string` → `expediente-<viaje_id>.json`. **Es provisional** (Pregunta abierta 3). El nombre y el formato no forman parte del contrato y no se prueban como contrato.
  - `entregarArchivo(contenido: string, nombre: string): void`, el único efecto: crea un `Blob` (`application/json`), un `URL.createObjectURL`, un `<a download>` temporal, hace `click()` y **revoca** el `objectURL` y retira el ancla.
- **`features/viajes/expediente/useDescargaExpediente.ts`** — `useMutation`, no `useQuery`: una pulsación equivale a una solicitud y cada descarga exitosa genera una auditoría en `operacion`. Reglas:
  - `retry: false` explícito. Sin reintento automático, porque reintentar duplicaría la auditoría. Cualquier reintento es una nueva pulsación del usuario.
  - Bloqueo de doble envío con `useRef<boolean>` (`enCurso`) puesto **síncronamente** antes de llamar a `mutate`, más el estado `preparando` derivado de `mutation.isPending`. La ref cubre el intervalo entre dos clics antes de que React vuelva a renderizar.
  - Contrato plano: `{ descargar, preparando, error, esProhibido, esNoEncontrado, esSesionFinalizada, esErrorRecuperable }`.
  - `esSesionFinalizada` se deriva de `kind === 'sesionFinalizada'`: la vista no muestra error genérico (Requirement 4.9, 6.1); la sesión ya la cortó el AppShell.
  - `esProhibido` se deriva de `instanceof ErrorDescargaProhibida` y muestra el mensaje de autorización insuficiente (no se confunde con la sesión finalizada, a diferencia de `useHistoricoViaje`, donde `noAutorizado` delega al AppShell).
  - En `onSuccess`: `serializarExpediente` → `entregarArchivo` → aviso de éxito. En `onSettled` libera la ref.
- **`features/viajes/expediente/BotonDescargarExpediente.tsx`** — `Button` con texto "Descargar expediente"; durante `preparando` está deshabilitado y muestra "En preparación".
- **`features/viajes/expediente/ExpedienteViaje.tsx`** — composición de la pantalla de la ruta. Si `!puedeUsarMonitoreo(usuario.rol)` renderiza el acceso no autorizado (no el botón). Si no, `Card` con el botón y los avisos. Muestra los errores clasificados: `403` autorización insuficiente (sin permiso o fuera de alcance); `404` viaje inexistente; error de red/no clasificado con reintento (nueva pulsación). Mientras la Brecha 2 esté abierta **no monta** `EvidenciaViaje` y no deja marcador falso; montarla es parte del desbloqueo de C.
- **`routes/_private/viajes/$id/expediente.tsx`** — `createFileRoute('/_private/viajes/$id/expediente')`, lee `id` de `Route.useParams()` y renderiza `ExpedienteViaje`. Igual que `historico.tsx`.
- **Cambio en `DetalleViaje.tsx`** — un botón secundario "Expediente y evidencia" visible si `usuario !== null && puedeUsarMonitoreo(usuario.rol)`. Es el único cambio a código existente de este bloque.

### Bloque B — Dashboard (diseñado; NO se implementa hasta desbloquear)

- **`lib/contracts/reportes.ts`** — solo alias de los esquemas generados (`ReporteViajes`, `ReporteEstados`, `FilaViaje`, `ConteoEstado`). Si el paquete instalado no los trae (hoy `tracer.33`), el archivo no se crea ni se tipa a mano; existen en `bff.yaml` de `tracer.35`.
- **`lib/api/reportes.ts`** — `reporteViajes(periodo, accessToken)` y `reporteEstados(periodo, accessToken)` sobre `request`. `desde` y `hasta` son obligatorios y se envían como `MarcaTiempo`. Clasifica `403` como `ErrorReportesProhibido` (mismo tratamiento que A); `401` lo resuelve `client.ts`.
- **`features/monitoreo/dashboard/estadoFrescura.ts`** — función pura `estadoFrescura(r: { stale?: boolean; proyeccion_al?: string | null }): 'atrasada' | 'fresca' | 'sin_datos' | 'no_informada'`. **No calcula ningún umbral**: solo lee `stale` y `proyeccion_al`. El caso `stale` ausente → `no_informada` lo respalda el contrato publicado (`tracer.35`: si `stale` falta, el consumidor lo trata como frescura no informada, nunca como fresca). La precedencia entre los casos es decisión de diseño (ver Decisiones):

  | Orden | Condición                           | Resultado                                     |
  | ----- | ----------------------------------- | --------------------------------------------- |
  | 1     | `stale === true`                    | `atrasada` (nunca se oculta; Requirement 3.5) |
  | 2     | `proyeccion_al` es `null` o ausente | `sin_datos` ("sin datos aplicados aún")       |
  | 3     | `stale === undefined`               | `no_informada` (Requirement 3.6)              |
  | 4     | `stale === false`                   | `fresca`                                      |

  Consecuencia: `fresca` si y solo si `stale === false` y hay `proyeccion_al`.

- **`features/monitoreo/dashboard/IndicadorFrescura.tsx`** — compone `Badge` y texto. `atrasada` muestra la marca visible **y** el valor de `proyeccion_al`; `sin_datos` muestra "sin datos aplicados aún" en lugar de fecha; `no_informada` muestra "frescura no informada"; `fresca` no lleva marca de atraso. El estado nunca se comunica solo por color (texto visible).
- **`features/monitoreo/dashboard/useDashboardMonitoreo.ts`** — `useQuery` para `reporteViajes` y para `reporteEstados` (claves `['monitoreo', 'dashboard', 'viajes' | 'estados', periodo]`, `retry: false`). Recibe el `periodo` como parámetro: **no fija un periodo por omisión** (Pregunta abierta 2). Sin sondeo automático: la cadencia de refresco no está especificada; solo carga al montar y reintento manual. Contrato plano `{ viajes, estados, cargando, vacio, error, esProhibido, reintentar }`.
- **`features/monitoreo/dashboard/DashboardMonitoreo.tsx`** — bloquea por `puedeUsarMonitoreo`; muestra `total`/`filas` de viajes y `conteos` por estado, y el `IndicadorFrescura` por cada proyección. El schema publicado solo entrega viajes (`filas` con `viaje_id`, `estado`, `creado_en`, `cerrado_en`, más `total`) y conteos por estado. **Incidencias y alertas NO existen en el contrato**: la vista no las muestra ni las calcula hasta que Producto decida si el dashboard de V1 se limita a viajes y estatus, o si se pide una ola adicional a Contratos (Pregunta abierta 1). **Unidad**: el schema no trae unidad; el alcance por unidad lo aplica el backend y hoy no lo aplica ningún servicio (DT-07), por lo que la UI no promete filtrado por unidad ni filtra en el cliente. El filtro «viajes en curso» (DT-10) lo cita el changelog del contrato pero no está en el contexto: no se diseña. Estados de carga, "sin viajes" y error con reintento diferenciados. No hay mapa, ni exportar, ni imprimir, ni cálculo de cifras en el cliente.
- **Stub vigente** — mientras B esté bloqueado, `/monitoreo/dashboard` conserva el stub tal como está, sin cifras (Requirement 2.11). Nota: el texto actual del stub dice "E8-T17 — Contenido pendiente" y "Aquí irán…"; sigue siendo honesto con la brecha y no se cambia.

### Bloque C — Evidencia (diseñado; NO se implementa hasta desbloquear)

- **`lib/api/adjuntos.ts`** — `listarAdjuntos(id, accessToken)`, `crearIntencionSubidaAdjunto(id, entrada, accessToken)`, `descargarAdjunto(id, adjuntoId, accessToken)` sobre `request`, más `subirBytes(url, archivo)`: `fetch` con `PUT`, cuerpo el `File`, **sin** `Authorization` del `bff`. Clasifica `403` como `ErrorAdjuntosProhibido` (autorización insuficiente), `404` como `ErrorViajeInexistente` y el rechazo de la intención de subida como `ErrorSubidaRechazada` por `status` `400` genérico: el contrato no define códigos de máquina para formato, tamaño o cantidad ni cabeceras del `PUT`. La UI muestra el mensaje aprobado y usa solo cabeceras que vengan en la respuesta si el contrato las documenta después; no las supone.
- **`features/viajes/evidencia/calcularSha256.ts`** — `calcularSha256(archivo: Blob): Promise<string>`: `await archivo.arrayBuffer()` → `crypto.subtle.digest('SHA-256', buffer)` → hexadecimal en minúsculas de 64 caracteres. **Limitación conocida**: `crypto.subtle.digest` exige el buffer completo, de modo que carga todo el archivo en memoria. Para archivos grandes hay dos salidas: hash incremental por trozos con una dependencia aprobada, o un límite de tamaño. El límite lo define Seguridad (Pregunta abierta 4) y este diseño **no inventa uno**; queda como decisión técnica abierta (ver Decisiones).
- **`features/viajes/evidencia/vigenciaUrl.ts`** — `urlVigente(expiraEn: string, ahora: number): boolean`, pura: verdadera si `Date.parse(expiraEn) > ahora`. Una URL no vigente nunca se usa.
- **`features/viajes/evidencia/adjuntoDescargable.ts`** — `esDescargable(estadoEscaneo): boolean`, pura: `estadoEscaneo === 'limpio'`.
- **`features/viajes/evidencia/useEvidenciaViaje.ts`**:
  - Lista: `useQuery(['viaje', id, 'evidencia'], listarAdjuntos, { retry: false, refetchInterval })`. El `estado_escaneo` se refresca releyendo la lista (sondeo HTTP; no hay evento de empuje). `refetchInterval` es una función que recibe la query y devuelve `INTERVALO_SONDEO_ESCANEO_MS` solo mientras algún adjunto de `data.items` tenga `estado_escaneo === 'pendiente'`, y `false` en cualquier otro caso (sin datos, sin adjuntos, ninguno pendiente), de modo que el sondeo se detiene solo. `INTERVALO_SONDEO_ESCANEO_MS` es una constante nombrada y configurable; su valor no lo define el contrato y queda pendiente de confirmar (valor de trabajo). Sin paginación en V1 (DT-08): no se diseña cursor. La lógica de decisión se extrae como función pura `hayEscaneoPendiente(items): boolean` en `sondeoEscaneo.ts`, junto con `INTERVALO_SONDEO_ESCANEO_MS`, para probarla (Property 8).
  - Subida: `useMutation` en tres pasos dentro de `mutationFn`: (1) `calcularSha256(file)` y `crearIntencionSubidaAdjunto(id, { nombre: file.name, tipo_medio: file.type, tamano_bytes: file.size, checksum_sha256 })`; los cuatro campos son obligatorios en el contrato, por lo que si `file.name` es vacío no se envía la intención (ver `SubirEvidencia`); (2) verificar `urlVigente(expira_en)` y `subirBytes(url_subida, file)`; (3) `onSuccess` invalida la clave de la lista. Si el paso 2 falla o la URL expiró, no se presenta el adjunto como registrado; reintentar vuelve a pedir una intención nueva (Requirement 5.6). `mutationFn` devuelve `void`: **no retorna `url_subida`**.
  - Autorización de descarga: `useMutation` con `gcTime: 0` cuyo `mutationFn` pide `descargarAdjunto`, verifica `urlVigente`, abre la URL con un ancla temporal (`rel="noopener noreferrer"`) y devuelve `void`. La URL vive solo dentro de esa función.
  - Nunca guarda `url_subida` ni `url_descarga` en `localStorage`, `sessionStorage`, caché de TanStack Query ni estado de React.
- **`features/viajes/evidencia/ListaAdjuntos.tsx`** — `Table` con `nombre`, tipo de medio, tamaño, `Badge` de `estado_escaneo` y fecha de creación. **Sin autor**: el contrato lo deja fuera de V1 (DT-11, citada por el contrato). La acción de descarga se renderiza solo si `esDescargable(estado_escaneo)`. Estado vacío "sin evidencia" neutro (sin advertencia, Requirement 5.11).
- **`features/viajes/evidencia/SubirEvidencia.tsx`** — `Input type="file"` en `FormField`. Envía `nombre: file.name` junto con `tipo_medio` (`file.type`), `tamano_bytes` (`file.size`) y `checksum_sha256`. Si `file.name` es cadena vacía no se envía la intención. Si `file.type` es cadena vacía no se envía y se informa que el tipo no se pudo determinar (no se inventa un MIME).
- **`features/viajes/evidencia/EvidenciaViaje.tsx`** — composición; bloquea por `puedeUsarMonitoreo`. Se monta dentro de `ExpedienteViaje` al desbloquear.
- **Prerrequisito de infraestructura**: el object storage on-premise debe permitir el origen del panel por CORS (`PUT` y `GET`) y la CSP del panel debe incluir su origen en `connect-src`. Se verifica con el equipo de plataforma antes de implementar. Si el `PUT` firmado exige un `Content-Type` concreto, el valor sale de la respuesta de la intención; no se supone.
- **Garantía de no-bloqueo del cierre**: ningún módulo de cierre (`features/viajes/detalle/cierre*.ts(x)` ni `DetalleViaje.tsx`) importa nada de `features/viajes/expediente/`, `features/viajes/evidencia/`, `lib/api/expediente` ni `lib/api/adjuntos`. Es una propiedad verificable por análisis estático (Property 5).

## Data Models

Tipos del contrato (alias de lo generado, no redefinidos):

```ts
// lib/contracts/expediente.ts (Bloque A)
import type { components } from '@ai27-tech/contracts/openapi/bff';
type Schemas = components['schemas'];
export type DescargaViaje = Schemas['DescargaViaje'];
export type FichaTecnicaDescarga = Schemas['FichaTecnicaDescarga'];
export type EntradaBitacoraDescarga = Schemas['EntradaBitacoraDescarga'];
export type RegistroAuditoriaDescarga = Schemas['RegistroAuditoriaDescarga'];
```

Tipos propios de la interfaz (no son wire):

```ts
// features/monitoreo/dashboard/estadoFrescura.ts (Bloque B)
export type EstadoFrescura = 'atrasada' | 'fresca' | 'sin_datos' | 'no_informada';

// features/viajes/expediente/useDescargaExpediente.ts (Bloque A)
export interface DescargaExpedienteHook {
  readonly descargar: () => void;
  readonly preparando: boolean;
  readonly error: Error | null;
  readonly esProhibido: boolean;
  readonly esNoEncontrado: boolean;
  readonly esSesionFinalizada: boolean;
}
```

## Mocks (MSW)

Solo se simula lo que el `bff` publica.

- **Bloque A — SÍ.** Se amplía `src/mocks/data.ts` con `descargarViajeMock(id)` y `src/mocks/handlers.ts` con `http.get(path('/viajes/:id/descarga'), …)` siguiendo el patrón de los handlers del histórico:
  - `200` con un fixture que respeta `DescargaViaje` y su `additionalProperties: false`: solo las claves `viaje_id`, `ficha`, `bitacora`, `auditoria`, `generado_en` (y las de los subobjetos), sin `cuenta_espejo` ni `clave_amago`.
  - `403` («sin permiso o fuera de alcance») cuando llega el header `x-mock-expediente: prohibido` (patrón de `x-mock-rol-sin-correccion`).
  - `404` («viaje inexistente») cuando el `id` es de un viaje desconocido o llega `x-mock-expediente: inexistente`.
  - El caso `401` se ejerce en las pruebas con `server.use(...)` sobre el servidor de `tests/viajes/mswServer.ts` (comodín `*/api/v1/viajes/:id/descarga`), no en el mock de desarrollo, porque dispara el flujo de refresco de `client.ts`.
- **Bloque B — NO.** No hay handlers de `reporteViajes`/`reporteEstados`. Mocks con cifras inventadas violarían el Requirement 2.11.
- **Bloque C — NO.** No hay handlers de adjuntos ni del object storage.
- En las pruebas, `onUnhandledRequest: 'error'` garantiza que ninguna capa llame a `operacion` o `reportes` directamente (Requirements 2.5, 5.14).

## Error Handling

| Respuesta                                    | Clase                                                                                          | Tratamiento en la interfaz                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`                                        | `ApiError('sesionFinalizada')` (tras el refresco fallido de `client.ts`)                       | Se delega al AppShell; no se muestra error genérico ni se genera archivo                                                                     |
| `403`                                        | `ErrorDescargaProhibida` / `ErrorReportesProhibido` / `ErrorAdjuntosProhibido` según operación | Mensaje de autorización insuficiente (sin permiso o fuera de alcance, DEC-132); sin archivo y sin datos parciales                            |
| `404`                                        | `ErrorViajeInexistente`                                                                        | Mensaje "viaje inexistente" (DEC-132: el rechazo por permiso o alcance de un usuario Interno es `403`, no `404`)                             |
| Red / `5xx` / no clasificado                 | `ApiError('red' \| 'degradado')`                                                               | Error accionable; la acción vuelve a quedar habilitada; el reintento es una nueva pulsación; el resto de la vista se conserva                |
| URL de vida corta vencida (C)                | `urlVigente` falso                                                                             | No se reutiliza; se pide una autorización nueva                                                                                              |
| Rechazo de la intención de subida (C): `400` | `ErrorSubidaRechazada`                                                                         | Mensaje aprobado; no se presenta el adjunto como registrado; la interfaz no aplica límites propios; el contrato no define códigos de máquina |

Los mensajes exactos (autorización insuficiente, viaje inexistente, "en preparación", "sin evidencia", "sin datos aplicados aún", proyección atrasada, rechazo de subida) están pendientes de aprobación de Producto; los textos de esta sección son los de trabajo.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Las propiedades 3, 5, 6, 7 y 8 pertenecen a los bloques B y C: se escriben ahora y se ejecutan al desbloquearlos. Las propiedades 1, 2 y 4 se ejecutan con el Bloque A.

### Property 1: Una pulsación equivale a una solicitud

Para toda secuencia de N pulsaciones (N ≥ 1) de "Descargar expediente" emitidas mientras la descarga está en estado `preparando`, `descargarViaje` se invoca exactamente una vez. Al terminar la solicitud (éxito o error) la acción vuelve a quedar habilitada y una nueva pulsación genera una nueva solicitud.

**Validates: Requirements 4.2, 4.3**

### Property 2: Fidelidad del archivo del expediente

Para todo payload `DescargaViaje` válido, `JSON.parse(serializarExpediente(payload))` es profundamente igual a `payload`: el archivo no añade, quita, renombra ni deriva claves en ningún nivel. El conjunto de claves del archivo es un subconjunto de las claves contratadas de `DescargaViaje`, y en el texto del archivo nunca aparece la clave `cuenta_espejo` ni `clave_amago`.

**Validates: Requirements 4.4, 4.5**

### Property 3: Frescura de la proyección (Bloque B)

Para todo reporte con `stale` en `{true, false, ausente}` y `proyeccion_al` en `{null, ausente, cadena de fecha}`: `estadoFrescura` es `atrasada` si `stale === true`; si no, `sin_datos` cuando `proyeccion_al` es `null` o ausente; si no, `no_informada` cuando `stale` está ausente; si no, `fresca`. El resultado es `fresca` si y solo si `stale === false` y hay `proyeccion_al`. Para todo reporte `atrasada` con `proyeccion_al` presente, la vista muestra la marca de atraso y el valor de `proyeccion_al`. La función no depende de ningún umbral ni del reloj. El caso `stale` ausente → `no_informada` lo respalda el contrato `tracer.35`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 4: Afordancia por rol y clasificación de la negación

Para todo valor de `Rol`, `puedeUsarMonitoreo(rol)` es verdadero exactamente cuando `rol` es `monitorista`, `supervisor`, `coordinador` o `administrador`, y falso para `jefe_operativo`, `ejecutivo`, `reaccion` y `cliente`. Para todo `403` que devuelve `descargarViaje`, el wrapper lanza `ErrorDescargaProhibida` (autorización insuficiente: sin permiso o fuera de alcance de un usuario Interno, DEC-132) y no un error genérico; para todo `404`, lanza `ErrorViajeInexistente` (viaje inexistente). En ambos casos no se genera archivo ni se muestran datos del expediente.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 4.7, 4.8** (clasificación 403/404 según DEC-132)

### Property 5: La evidencia no bloquea el cierre (Bloque C)

Para todo viaje con 0..N adjuntos, la disponibilidad y el resultado del gesto de cierre del viaje son idénticos: ningún módulo de cierre consulta la evidencia. Para todo archivo de `features/viajes/detalle/cierre*.ts(x)` y para `DetalleViaje.tsx`, el grafo de imports no contiene `features/viajes/expediente/`, `features/viajes/evidencia/`, `lib/api/expediente` ni `lib/api/adjuntos`, y al renderizar el detalle no se emite ninguna solicitud a `/adjuntos`.

**Validates: Requirements 5.11, 5.12**

### Property 6: Las URL de vida corta son efímeras (Bloque C)

Para toda subida o autorización de descarga completada, ningún `url_subida` ni `url_descarga` aparece en `localStorage`, `sessionStorage`, ni en la caché de consultas ni de mutaciones de TanStack Query. Para todo `expira_en` menor o igual al instante actual, `urlVigente` es falso y la URL no se usa: se solicita una autorización nueva.

**Validates: Requirements 5.9**

### Property 7: Un adjunto no limpio no ofrece descarga (Bloque C)

Para todo adjunto cuyo `estado_escaneo` sea distinto de `limpio` (`pendiente` o `infectado`), `ListaAdjuntos` muestra el estado de escaneo y no renderiza la acción de descarga o consulta de ese adjunto. `esDescargable` es verdadero solo para `limpio`.

**Validates: Requirements 5.7, 5.8**

### Property 8: Sondeo acotado de adjuntos pendientes (Bloque C)

Para todo conjunto de adjuntos (0..N, con cualquier combinación de `estado_escaneo` en `pendiente`, `limpio` e `infectado`), el `refetchInterval` de la lista de adjuntos está activo si y solo si existe al menos un adjunto con `estado_escaneo` igual a `pendiente`; con cero pendientes (incluida la lista vacía) devuelve `false` y el sondeo se detiene.

**Validates: Requirements 5.15**

## Testing Strategy

Las pruebas viven en `tests/viajes/` y `tests/layout/`, con la nomenclatura de los hermanos (`*.property.test.ts`, `*.unit.test.ts`, `*.test.tsx`). Los tests de propiedades usan `fast-check` (ya en `package.json`) con mínimo 100 iteraciones y la etiqueta **Feature: e8-t17-dashboard-descarga-evidencia, Property N: …**. La integración usa MSW 2 con el servidor de `tests/viajes/mswServer.ts`.

**Pruebas de propiedades**

| Propiedad | Archivo                                                                                                    | Bloque       | Generadores                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| P1        | `tests/viajes/descargaExpediente.property.test.tsx`                                                        | A            | N de 1 a 20 pulsaciones síncronas; wrapper con retraso controlado           |
| P2        | `tests/viajes/expedienteFidelidad.property.test.ts`                                                        | A            | `arbDescargaViaje` que respeta el esquema (`additionalProperties: false`)   |
| P3        | `tests/viajes/estadoFrescura.property.test.ts`                                                             | B (diferida) | producto de `stale` × `proyeccion_al`                                       |
| P4        | `tests/layout/puedeUsarMonitoreo.property.test.ts` y clasificación en `tests/viajes/expedienteApi.test.ts` | A            | todos los valores de `Rol`; status 403/404                                  |
| P5        | `tests/viajes/evidenciaNoBloqueaCierre.test.ts`                                                            | C (diferida) | análisis estático de imports + espía de solicitudes                         |
| P6        | `tests/viajes/urlEfimera.property.test.tsx`                                                                | C (diferida) | `expira_en` pasados y futuros                                               |
| P7        | `tests/viajes/ListaAdjuntos.property.test.tsx`                                                             | C (diferida) | los tres valores de `estado_escaneo`                                        |
| P8        | `tests/viajes/sondeoEscaneo.property.test.ts`                                                              | C (diferida) | listas de adjuntos con combinaciones de `estado_escaneo`, incluida la vacía |

No se escriben pruebas de propiedades para la composición visual ni para el disparo de la descarga del navegador (infraestructura/UI): se cubren con ejemplos.

**Pruebas unitarias**

- `entregarArchivo` / `serializarExpediente`: crea y revoca el `objectURL`, retira el ancla, usa el nombre provisional; el contenido es el JSON del payload.
- `estadoFrescura` (B): cuatro tablas de casos, incluidos los cruces `stale: true` con `proyeccion_al: null`.
- `puedeUsarMonitoreo`: tabla explícita de ocho roles.
- Clasificación de errores de `lib/api/expediente.ts`: `403`, `404`, `401` pasa como `sesionFinalizada`, red.
- `calcularSha256` (C): vector conocido (cadena vacía → `e3b0c442…b855`, `"abc"` → `ba7816bf…15ad`) y salida de 64 caracteres hexadecimales en minúsculas.
- `urlVigente` (C): frontera exacta (`expira_en` igual a `ahora` no es vigente).

**Pruebas de integración con MSW** (Bloque A)

- Descarga correcta: una solicitud, estado "en preparación", archivo con el payload exacto y aviso de éxito.
- Doble clic: una sola solicitud al `bff`.
- `403` (mensaje de autorización insuficiente: sin permiso o fuera de alcance, sin archivo), `404` (viaje inexistente, sin archivo).
- `401` con refresco fallido: se delega al flujo de sesión; sin error genérico.
- Falla de red: error con reintento, acción rehabilitada, sin archivo.
- Roles sin acceso (`jefe_operativo`, `ejecutivo`, `reaccion`): `DetalleViaje` no muestra el enlace y `ExpedienteViaje` muestra acceso no autorizado.
- No hay acción de descarga de listados (Escenario 6): la bandeja no contiene ninguna.

**Pruebas de la definición de terminado de E8-T17**

1. «**La descarga solo contiene campos contratados y no incluye cuenta espejo ni `clave_amago`**» — Bloque A, **se ejecuta ahora**: sobre el fixture del handler `descargarViaje` y sobre payloads generados, el archivo entregado tiene un conjunto de claves contenido en el conjunto contratado y no contiene `cuenta_espejo` ni `clave_amago` (Property 2).
2. «**Una proyección atrasada (`stale: true`) se muestra marcada como stale**» — Bloque B, **diferida** a la publicación de `reporteViajes`: con `stale: true` el `IndicadorFrescura` muestra la marca de atraso y `proyeccion_al`, y no se parece al estado `fresca` (Property 3).

**Pruebas diferidas (B y C)**: estados de carga, "sin viajes", error con reintento; subida de tres pasos con fallo del `PUT`; rechazo de la intención por formato o tamaño; autorización vencida; adjunto `pendiente`/`infectado`. Se escriben al desbloquear con handlers de MSW basados en el contrato publicado de ese momento.

## Decisiones

- **Tres bloques con estado propio.** Solo A se implementa; B y C quedan diseñados y gobernados por el criterio de desbloqueo. La alternativa (derivar el tablero de `listarViajes`/`listarIncidencias` o simular adjuntos) se descarta: calcularía alertas en el cliente y violaría los Requirements 2.5 y 5.14.
- **La descarga es `useMutation`.** Una pulsación debe equivaler a una solicitud y a una sola auditoría en `operacion`. `useQuery` reintentaría, revalidaría al enfocar la ventana y duplicaría la auditoría.
- **El archivo es el payload exacto.** Se serializa lo que devolvió el `bff` sin mapear. La ausencia de cuenta espejo y `clave_amago` la garantiza el contrato (`additionalProperties: false`), no un filtro en la interfaz; un filtro silencioso ocultaría una violación de contrato.
- **Formato y nombre de archivo provisionales.** JSON y `expediente-<viaje_id>.json` hasta que Producto confirme el formato final (Pregunta abierta 3). Ninguna prueba trata el nombre como contrato.
- **Error de `403` frente a sesión finalizada.** A diferencia del histórico, donde `noAutorizado` delega al AppShell, aquí un `403` es un mensaje de autorización insuficiente (Requirement 1.5) y solo `sesionFinalizada` se delega.
- **`puedeUsarMonitoreo` en `features/monitoreo/`.** Lo usan A, B y C, y `DetalleViaje.tsx` necesita importarlo; ubicarlo en `features/viajes/expediente/` haría que el detalle (y su cierre) importara del módulo de expediente, contra la garantía de no-bloqueo.
- **Precedencia de `estadoFrescura`.** `atrasada` gana siempre (Requirement 3.5); luego `sin_datos` (no hay fecha que mostrar); luego `no_informada`; solo entonces `fresca`. La precedencia es decisión de diseño. El caso `stale` ausente → `no_informada` lo respalda el contrato `tracer.35` (la Pregunta abierta 8 quedó resuelta por contrato). Tratar un `proyeccion_al` ausente igual que `null` sigue siendo un supuesto de diseño.
- **Navegación sin cambios.** `/reportes` y la entrada "Reportes" del AppShell no se tocan. El dashboard sigue accesible por `useInitialRoute` y por URL; añadir entrada de menú o decidir su destino depende de la Pregunta abierta 6.
- **`tipo_medio` es `file.type`.** Es el MIME declarado por el navegador. Si es vacío no se envía; no se inventa un MIME de respaldo. El destino de ese caso se cierra con la Pregunta abierta 4.
- **Hash de archivos grandes: decisión técnica abierta.** `crypto.subtle.digest` carga el archivo completo en memoria. Las salidas son hash incremental por trozos con una dependencia aprobada, o un límite de tamaño de Seguridad. No se fija ni un límite ni una dependencia (Pregunta abierta 4).
- **Consulta de adjuntos.** `Visor` de la librería solo cubre IMAGE/AUDIO. Los documentos (PDF y otros) se abren o descargan por `url_descarga`, sin vista previa. Si se usa `Visor` para IMAGE/AUDIO, lo alimenta una URL recién autorizada y no se guarda.
- **Subida directa con `fetch` fuera de `client.ts`.** Es la única salida HTTP que no pasa por `client.ts`; `client.ts` agregaría `Authorization` y prefijo de API a una URL ya firmada. Queda acotada a `subirBytes`.
- **Evidencia opcional y genérica (DEC-040).** Sin tipos funcionales, sin mínimo de archivos, sin advertencia por ausencia y sin guarda de cierre. Se verifica con la Property 5.
- **`403` y `404` según DEC-132.** `403` es autorización insuficiente (sin permiso o fuera de alcance de un usuario Interno); `404` es viaje inexistente. La interfaz ya no trata el `404` como «inexistente o fuera de alcance».
- **No se sube el pin sin pedido del usuario.** El pin de `@ai27-tech/contracts` sigue en `tracer.33` aunque `tracer.35` esté publicado. Subirlo (incluye `tracer.34` y una ruptura declarada solo en `operacion.yaml`) lo decide el usuario; después se corren `typecheck` y `test`.
- **`ErrorViajeInexistente`.** Reemplaza a `ErrorViajeFueraDeAlcance` (`kind: 'noEncontrado'`, `status: 404`).
- **Sondeo condicionado de adjuntos.** `refetchInterval` de la lista solo está activo mientras algún adjunto tenga `estado_escaneo === 'pendiente'`; no hay sondeo en otros casos. El intervalo es una constante nombrada, valor de trabajo pendiente de confirmar (el contrato no lo define).
- **Rechazo de la intención de subida.** Se clasifica como `ErrorSubidaRechazada` por `400` genérico; el contrato no define códigos de máquina ni cabeceras del `PUT`, y la UI no los supone.
- **Nada de UI nueva de librería.** Todo se compone con `@ai27-tech/ui`; lo que falta (indicador `stale`, métricas, selector de archivos, vista previa de documentos) se registra como solicitud a la librería en `BRECHAS.md`.

## Trazabilidad requisito → componente

| Requisito                          | Módulos del diseño                                                                                                                                                                                | Bloque               | Estado                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Acceso por rol y alcance        | `puedeUsarMonitoreo.ts`, `ExpedienteViaje.tsx`, `DetalleViaje.tsx` (enlace), clasificación en `lib/api/expediente.ts`                                                                             | A (extiende a B y C) | Se implementa con A                                                                                    |
| 2. Dashboard de monitoreo          | `lib/api/reportes.ts`, `useDashboardMonitoreo.ts`, `DashboardMonitoreo.tsx`; stub actual de `dashboard.tsx`                                                                                       | B                    | Diseñado; contrato cerrado en `tracer.35`, pendiente de pin y backend (2.11 se cumple hoy con el stub) |
| 3. Frescura de la proyección       | `estadoFrescura.ts`, `IndicadorFrescura.tsx`                                                                                                                                                      | B                    | Diseñado; contrato cerrado en `tracer.35`, pendiente de pin y backend                                  |
| 4. Descarga del expediente         | `lib/contracts/expediente.ts`, `lib/api/expediente.ts`, `entregarArchivo.ts`, `useDescargaExpediente.ts`, `BotonDescargarExpediente.tsx`, `ExpedienteViaje.tsx`, ruta `expediente.tsx`, mocks MSW | A                    | Se implementa ya                                                                                       |
| 5. Evidencia del viaje             | `lib/api/adjuntos.ts`, `calcularSha256.ts`, `vigenciaUrl.ts`, `adjuntoDescargable.ts`, `useEvidenciaViaje.ts`, `EvidenciaViaje.tsx`, `ListaAdjuntos.tsx`, `SubirEvidencia.tsx`                    | C                    | Diseñado; contrato cerrado en `tracer.35`, pendiente de pin y backend                                  |
| 6. Estados y errores transversales | `useDescargaExpediente.ts`, `ExpedienteViaje.tsx` (carga/vacío/error, 401, Toast); equivalentes en B y C                                                                                          | A (extiende a B y C) | Se implementa con A                                                                                    |

Propiedades por bloque: A → Properties 1, 2 y 4; B → Property 3; C → Properties 5, 6, 7 y 8.
