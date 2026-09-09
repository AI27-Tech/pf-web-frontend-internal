# pf-web-frontend-internal

`panel-admin` — la consola **interna** de la plataforma AI27. SPA en React + TypeScript.

Es la superficie que usa la _operación de AI27_ para gobernar la flota: seguir y transicionar `viajes`, asignar unidad/patrulla/custodios, llevar la `bitacora`, abrir y cerrar incidencias, atender la conversación de negocio desde una bandeja compartida y consultar reportes. Corre enteramente bajo `Audiencia: Interno`.

> La autoridad arquitectónica vive en [`docs/arquitectura/`](../../docs/arquitectura/_index.md) del workspace padre. Este README no la reexplica y no reabre las decisiones cerradas. Empieza por [`services/bff.md`](../../docs/arquitectura/services/bff.md), [`services/operacion.md`](../../docs/arquitectura/services/operacion.md), [`services/mensajeria.md`](../../docs/arquitectura/services/mensajeria.md) y [`services/realtime.md`](../../docs/arquitectura/services/realtime.md).

**Estado: scaffold en arranque.** El objetivo es paridad de stack con `pf-web-frontend-client` (`portal-cliente`): mismas versiones, mismas invariantes de tracking y las mismas reglas de degradación, sobre una **superficie distinta** — la de audiencia interna. Igual que el portal de cliente, las pantallas corren contra tipos provisionales; **no hay lógica de negocio implementada** y el contrato del backend todavía no existe (ver [Decisiones abiertas](#decisiones-abiertas)).

---

## Relación con `pf-web-frontend-client`

Los dos portales comparten stack, disciplina y las dos rutas de datos, y se separan en la **audiencia**. La frontera de audiencia es del servidor, no del navegador (**P10**): `bff` deriva la `Audiencia` del claim de rol del token, nunca de un parámetro de la petición.

| | `portal-cliente` (client) | `panel-admin` (internal, este repo) |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Audiencia             | `Cliente`                                        | `Interno`                                                                                 |
| Alcance de datos      | Un tenant: sus propios viajes                    | La **flota**: viajes por alcance interno (**P9**, **P10**)                                |
| Sobre el viaje        | Solicita, sigue, conversa                        | **Transiciona con causa**, asigna recursos, lleva bitácora, abre/cierra incidencias       |
| Conversación          | Una conversación con AI27 por viaje              | **Bandeja compartida**: cola, reclamo, liberación, transferencia, override de supervisor  |
| Reportes / auditoría  | No los ve                                        | Consulta reportes y exportaciones probatorias                                             |

Todo lo que este repo hace de más lo hace **porque su audiencia es interna**, no porque el stack sea distinto. El stack es el mismo a propósito.

---

## Cómo empezar

Hay dos formas de arrancar. Mientras no exista el backend, **usa la segunda**.

```bash
pnpm install

# a) contra un bff real — todavía no existe, ver Decisiones abiertas
cp .env.example .env.local
pnpm run dev

# b) contra el bff y el realtime simulados  <- lo que funciona hoy
pnpm run dev:mock                          # http://localhost:5173
```

En modo mock se entra con **`operador@demo.ai27`** / **`demo1234`**.

| Script                    | Qué hace                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| `dev`                     | Dev server de Vite, sin mocks                                                    |
| `dev:mock`                | Dev server con `bff` y `realtime` simulados                                      |
| `build`                   | `tsc --build` y luego el bundle de producción                                    |
| `build:mock`              | Igual, pero con los mocks embarcados. Solo para pruebas                          |
| `preview`                 | Sirve el bundle ya construido                                                    |
| `typecheck`               | TypeScript en modo estricto, sin emitir                                          |
| `lint` · `lint:fix`       | ESLint                                                                           |
| `format` · `format:check` | Prettier                                                                         |
| `test` · `test:watch`     | Vitest + Testing Library                                                         |
| `test:e2e`                | Playwright. Construye en modo mock y corre contra el bundle                      |
| `gen:contracts`           | Tipos desde el contrato del backend — **hoy falla a propósito**: no hay contrato |

El repo fija `pnpm@12.3.4` en `packageManager`. Si no tienes pnpm: `corepack enable pnpm`.

`test:e2e` necesita el navegador una primera vez: `pnpm exec playwright install chromium`.

### Pre-commit

Husky + lint-staged: formato y lint sobre lo _staged_, más `typecheck` del proyecto completo. El typecheck va completo a propósito — un cambio de tipo en `lib/` rompe consumidores que no están en el commit, y lint-staged no los vería.

---

## Lo que no es

| No es esto                                        | Dónde vive                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `portal-cliente` — la app de cara al cliente      | repo aparte, `Audiencia: Cliente`                                            |
| Nada que hable con nueve servicios                | es exactamente lo que `bff` existe para evitar                               |
| Un lugar donde se decida el ejecutivo de chat     | el pool y el reclamo son estado de `mensajeria`; `operacion` **no** asigna al ejecutivo |
| Un punto de decisión de autorización              | los claims del token son toda la historia; el navegador nunca amplía alcance |
| Un motor que calcule ETA o geometría              | eso es de `procesamiento`; el panel compone y presenta, no calcula           |

---

## Stack

Idéntico al de `portal-cliente`, versión por versión. La paridad es deliberada: dos portales que comparten las mismas invariantes de tracking deben compartir el mismo parser, el mismo cliente SSE y la misma cadena de herramientas, o divergen.

| Preocupación       | Elección                                              | Nota                                                                                          |
| ------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Framework          | **React 19.2.8**                                      | —                                                                                             |
| Lenguaje           | **TypeScript 6.0.3**, `strict`                        | Más `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`            |
| Build / dev server | **Vite 8.2.2** (Rolldown)                             | —                                                                                             |
| Router             | **TanStack Router 1.170**                             | File-based; `src/routeTree.gen.ts` es generado                                                |
| Estado de servidor | **TanStack Query 5.102**                              | Dueño de la ruta pull, la caché y el respaldo por polling                                     |
| Estado de cliente  | **React Context**                                     | Sin Zustand/Redux/Jotai. Contextos contados: sesión, degradación, modal (y bandeja, ver abajo) |
| Estilos            | **Tailwind 4.3.3**                                    | Config en CSS (`@theme` en `src/styles/globals.css`). **Por eso no hay `tailwind.config.ts`** |
| Componentes UI     | ninguno                                               | Sin shadcn/Radix/MUI/Chakra/Framer. Primitivas propias en `src/components/ui/`                |
| Mapa               | **MapLibre GL 6.7**                                   | Instalado, **no montado todavía** — ver `TrackingMap.tsx`                                     |
| Pruebas            | **Vitest 5** + Testing Library + **Playwright 1.63**  | —                                                                                             |
| Lint / formato     | **ESLint 10** + typescript-eslint 8.70 + Prettier 3.9 | —                                                                                             |

Todas las versiones están fijadas exactas en `package.json`, sin rangos.

Dos desviaciones respecto de lo que pedía el prompt de scaffolding, ambas deliberadas y heredadas del portal de cliente:

- **TypeScript 6, no 5 ni 7.** TS 7.0.2 es la última, pero `typescript-eslint@8.70` declara `typescript >=4.8.4 <6.1.0`: con TS 7 no hay lint con tipos. TS 6 es la más nueva que la cadena de herramientas soporta.
- **No hay `tailwind.config.ts`.** Tailwind 4 configura por CSS. Crear un `tailwind.config.ts` vacío para cumplir el árbol del prompt sería ceremonia.

Un aviso de peer conocido: `openapi-typescript@7.13.0` quiere `typescript@^5.x`. Es la herramienta de codegen, que hoy está bloqueada de todas formas.

---

## Las dos rutas de datos, y la regla que las gobierna

Igual que en `portal-cliente`: **hay una sola forma de payload de tracking y un solo parser**, llegue el dato por pull o por push. Es la propiedad **P4**, y `bff` la garantiza a nivel de bytes con el parámetro `Audiencia` — el panel interno recibe la misma forma que el portal de cliente, resuelta para audiencia interna.

```
                 ┌──────────────────────────────────────┐
                 │       pf-web-frontend-internal        │
                 │  lib/tracking/parseTrackingPayload    │
                 │        ← un solo parser →             │
                 └───────┬───────────────────┬──────────┘
                         │                   │
   PULL · HTTP           │                   │   PUSH · SSE
   GET /api/v1/viajes/   │                   │   GET /api/v1/stream
        {id}/tracking    ▼                   ▼
                    ┌─────────┐         ┌──────────┐
                    │   bff   │         │ realtime │
                    └─────────┘         └──────────┘
                         └── mismo ALB, servicio distinto ──┘
```

`bff` **no proxea el stream**: la conexión SSE va directo a `realtime`. De ahí que haya dos base URLs en el entorno, no una.

Dónde está cada pieza:

| Pieza                                       | Archivo                                       |
| ------------------------------------------- | --------------------------------------------- |
| El parser único                             | `src/lib/tracking/parseTrackingPayload.ts`    |
| Cliente SSE (reanudación, latido, liveness) | `src/lib/stream/streamClient.ts`              |
| Conmutación push → polling                  | `src/lib/degradation/mode.ts`                 |
| Las dos rutas convergiendo                  | `src/features/tracking/useTracking.ts`        |
| La prueba de que no divergen                | `tests/tracking/parseTrackingPayload.test.ts` |

### Reglas del cliente, y cómo están hechas cumplir

No son comentarios: cada una tiene un mecanismo. Las de tracking son idénticas a las del portal de cliente; las últimas dos son propias de la audiencia interna.

| Regla                                                                                       | Mecanismo en el código                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordenar y deduplicar por la secuencia **de dominio**, nunca por el `seq` del sobre (**P5**) | `TransportSeq` y `DomainSeq` son tipos marcados **sin conversión entre ellos** en `lib/contracts/sequences.ts`. Confundirlos no compila     |
| El navegador no selecciona canales arbitrarios (**P10**)                                    | `Canal` es un tipo marcado sin constructor libre. La audiencia interna existe del lado servidor; el navegador no amplía su alcance          |
| Ausente por degradación no es ausente                                                       | `Fresco<T>` tiene **tres** estados, no dos: `presente`, `ausente-por-degradacion`, `sin-dato`. `FreshnessMark` renderiza los tres distinto  |
| Un aguas-abajo caído no es un "no encontrado"                                               | `ApiErrorKind` separa `degradado` de `noEncontrado`; `ErrorState` los presenta distinto                                                     |
| Latido 4 s / liveness 7 s                                                                   | `STREAM_TIMINGS` en `lib/constants.ts`, aplicado en `streamClient.ts`                                                                       |
| Stream vivo pero silencioso degrada a polling                                               | El estado `vivo-sin-datos` existe y `deriveDegradation` lo manda a polling                                                                  |
| La degradación se muestra                                                                   | `DegradationBanner` en el shell, con `role="status"`                                                                                        |
| La bandeja se ordena por secuencia **de dominio** (**P5**)                                  | La cola y la conversación ordenan por la secuencia de dominio de `mensajeria`, no por orden de llegada del sobre SSE                        |
| Una vista de cola cacheada **no autoriza** responder ni reclamar                            | El reclamo y su versión esperada viven en `mensajeria`; el comando confirma allí y un `409` no se reintenta desde el navegador (**P20**)   |
| Sin librerías prohibidas                                                                    | `no-restricted-imports` en `eslint.config.js` bloquea zustand, redux, jotai, swr, framer-motion, next-auth, aws-amplify, Radix, MUI, Chakra |
| Los artefactos generados no se filtran                                                      | `no-restricted-imports` prohíbe importar `lib/api/generated/*` fuera de `src/lib/`                                                          |

---

## El backend simulado

`src/mocks/` contiene un `bff` y un `realtime` de mentira sobre MSW. Se activan solo con
`VITE_ENABLE_MOCKS=true`, que vive en `.env.mock` y se carga con `--mode mock`; el import
es dinámico, así que con la bandera apagada ni MSW ni los handlers entran en el bundle.

**La decisión que hace que estos mocks valgan algo: devuelven la forma de contrato
(`snake_case`, envoltorios de frescura), no modelos de la app.** Así la app corre su
parser de verdad. Si devolvieran `TrackingPayload` ya construido, saltarían la única pieza
que hay que ejercitar y solo se comprobaría que React pinta objetos.

El dataset cubre a propósito los tres estados de `Fresco<T>`, más lo que es propio de la
audiencia interna: viajes de **varios tenants** (alcance de flota, **P9**/**P10**), una
**cola de bandeja** con conversaciones reclamables y estados de transición de viaje que el
panel puede accionar.

| Viaje     | Qué demuestra                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `viaje-1` | Camino feliz. **Recibe posiciones por SSE cada 2 s**, con snapshot de apertura, latido cada 4 s y `Last-Event-ID`. Transicionable desde el panel                        |
| `viaje-2` | `procesamiento` caído: payload **parcial y marcado**. El estado sigue visible; posición y ETA llegan como `ausente-por-degradacion`, con motivo y último dato etiquetado |
| `viaje-3` | Recién solicitado: `sin-dato`. Nunca hubo posición, y eso **no** es lo mismo que no poder alcanzarla. Pendiente de asignación                                            |

En el sobre SSE el `seq` de transporte arranca en 1000 y la secuencia de dominio en 1 —
números deliberadamente distintos, para que cualquier confusión entre ambos se vea en
pantalla en lugar de esconderse tras una coincidencia numérica.

Lo que los mocks **no** hacen: máquina de estados de viaje real, autorización real,
multi-tenancy real, ni la lógica de reclamo/transferencia de `mensajeria`. Sirven para
trabajar en la UI y para que los e2e cubran el recorrido autenticado; no para validar
reglas de negocio.

Cuando exista `contracts/openapi/bff.yaml`, `src/mocks/data.ts` es lo primero que hay que
validar contra él: si el contrato usa otros nombres de campo, los mocks fallan y el parser
también — que es exactamente la señal que se busca.

---

## Dónde vive el fetch

No hay Server Components: es una SPA. La disciplina equivalente es **cargar en la frontera de la ruta**:

- El archivo de ruta declara su carga con el `loader` de TanStack Router, o con `useQuery` en el hook del dominio cuando el dato se actualiza después (tracking, conversación, cola de bandeja).
- Las `*Section` reciben datos **por props** y no llaman a la API. Son presentacionales.
- Carga y error se resuelven con `pendingComponent` y `errorComponent` de cada ruta — el equivalente de `loading.tsx` / `error.tsx`.
- El estado de interacción vive en los subcomponentes hoja: `MensajeComposer` y `TransicionForm`, no la `*Section` que los contiene.

Cero `useEffect` + `useState` para traer datos. El único `useEffect` con E/S es el que abre el stream, y eso no es un fetch.

---

## Estructura

```
src/
├── main.tsx
├── app/
│   ├── router.tsx              # instancia del router, tipos registrados
│   ├── queryClient.ts          # política de reintento = taxonomía de errores
│   ├── providers.tsx           # QueryClient + los Context
│   └── shell/                  # AppShell, nav, DegradationBanner
├── routes/                     # TanStack Router, file-based
│   ├── __root.tsx
│   ├── (auth)/                 # públicas: login, two-factor
│   ├── _private.tsx            # guarda: beforeLoad exige sesión interna
│   └── _private/               # todo lo autenticado
│       ├── index.tsx           # home: tablero de flota
│       ├── viajes/{index,$viajeId/{index,tracking,bitacora,asignacion}}
│       ├── bandejas/{index,$bandejaId,conversaciones/$conversacionId}
│       └── reportes/{index,...}
├── features/                   # *Section y hooks por dominio
│   ├── sesion/ viajes/ tracking/ asignacion/ bitacora/ bandejas/ conversacion/ reportes/ catalogos/
├── components/ui/              # Button, Input, Table, Modal, FreshnessMark, Feedback
├── context/                    # SessionContext, DegradationContext, ModalContext, (BandejaContext)
├── lib/
│   ├── api/                    # client + wrappers por dominio + tokenStore + errors
│   ├── contracts/              # tipos de contrato (PROVISIONALES) — barrel en index.ts
│   ├── tracking/               # EL parser único
│   ├── stream/                 # cliente SSE
│   ├── degradation/            # push ⇄ polling
│   ├── constants.ts  utils.ts
├── mocks/                      # bff y realtime simulados (MSW), solo en modo mock
└── styles/globals.css          # Tailwind + @theme
```

`src/routeTree.gen.ts` y `src/lib/api/generated/` son generados y están en `.gitignore`.

### Convención de nombres

Identificadores en inglés, **salvo los sustantivos de dominio**, que conservan su forma canónica en español: `viaje`, `bitacora`, `asignacion`, `bandeja`, `conversacion`, `catalogos`, `reportes`, `Audiencia`, `Fresco`, `Sobre`. Son el lenguaje ubicuo de `docs/arquitectura/` y de `contracts/`; traducirlos rompería la correspondencia con los tipos generados que van a sustituir a `lib/contracts/`. Comentarios y docstrings en español.

---

## Superficie que consume

Todo el HTTP por `bff` (`/api/v1/...`); el stream, por `realtime`. Toda esta superficie es de **audiencia interna** — es exactamente lo que el portal de cliente **no** consume.

| Área          | Endpoints                                                                                                          | Wrapper                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Sesión        | `POST /sesion` · `POST /sesion/refresh` · `DELETE /sesion`                                                         | `lib/api/sesion.ts`          |
| Viajes        | `GET /viajes` (alcance flota) · `GET /viajes/{id}` · `POST /viajes/{id}/transiciones` · `GET /viajes/{id}/bitacora` · `POST /viajes/{id}/bitacora` | `lib/api/viajes.ts`          |
| Asignación    | `POST /viajes/{id}/asignacion` · `PATCH /viajes/{id}/asignacion`                                                   | `lib/api/asignacion.ts`      |
| Incidencias   | `POST /viajes/{id}/incidencias` · `PATCH /viajes/{id}/incidencias/{iid}`                                           | `lib/api/viajes.ts`          |
| Tracking      | `GET /viajes/{id}/tracking` — pull y degradación                                                                   | `lib/api/viajes.ts`          |
| Catálogos     | `GET /catalogos/...`                                                                                               | `lib/api/catalogos.ts`       |
| Bandejas      | `GET /bandejas` · `GET /bandejas/{id}/conversaciones`                                                              | `lib/api/bandejas.ts`        |
| Conversación  | `GET /conversaciones/{id}` · `/{id}/mensajes` · `POST /{id}/mensajes` · `POST /{id}/claim`·`/release`·`/transfer` · `/{id}/receipts/...`·`/handled` | `lib/api/conversaciones.ts` |
| Auditoría     | `GET /conversaciones/{id}/audit` · `GET /viajes/{id}/auditoria`                                                    | `lib/api/auditoria.ts`       |
| Reportes      | `GET /reportes/...`                                                                                                | `lib/api/reportes.ts`        |
| Stream        | `GET /api/v1/stream?canales=...`                                                                                   | `lib/stream/streamClient.ts` |

Solo audiencia interna. La solicitud de servicio (`POST /viajes`) es del cliente; aquí no se crea el viaje, se **gobierna**.

Sobre la sesión: la identidad es Cognito detrás de `identidad`, y el login va contra **`bff`**, no contra Cognito — por eso no hay `next-auth` ni `aws-amplify` (y ESLint los bloquea). El refresco es el punto donde los claims se reevalúan, así que `SessionContext` refresca con margen en vez de esperar el `401`. Un `401` a media conexión significa "reconecta tras refrescar", no "error de datos".

Sobre la bandeja: `mensajeria` es dueño del pool, del reclamo y del orden canónico. El panel **muestra** la cola y **emite comandos** de reclamo/liberación/transferencia con versión esperada; no decide membresía ni reordena por su cuenta. Un conflicto de carrera vuelve como `409` y se resuelve recargando la versión, nunca reintentando a ciegas (**P20**).

---

## Pruebas

Cubren **invariantes**, no funcionalidad. Las de tracking son las mismas que en `portal-cliente`; las de bandeja son propias de la audiencia interna.

| Archivo                                       | Qué prueba                                                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/tracking/parseTrackingPayload.test.ts` | **La prueba de contrato de P4**: la misma entrada por pull y por sobre de push produce el mismo resultado. Y que la degradación se preserva en vez de colapsarse a `null`                                                                          |
| `tests/contracts/sequences.test.ts`           | Que el orden sale de la secuencia de dominio y no del orden de llegada; detección de huecos                                                                                                                                                        |
| `tests/degradation/mode.test.ts`              | Que `vivo-sin-datos` degrada a polling **y avisa**                                                                                                                                                                                                |
| `tests/ui/FreshnessMark.test.tsx`             | Que la ausencia por degradación se renderiza, con motivo y último dato etiquetado                                                                                                                                                                 |
| `tests/bandejas/claim.test.ts`                | Que un `409` en el reclamo se presenta como conflicto de versión y **no** se reintenta desde el navegador (**P20**); que una cola cacheada no autoriza responder                                                                                  |
| `e2e/login.spec.ts`                           | Que la app arranca, que login renderiza y que la guarda de rutas privadas redirige                                                                                                                                                                |
| `e2e/journey.spec.ts`                         | El recorrido interno contra los mocks: que la flota lista viajes de varios tenants, que **la posición se actualiza por push sin recargar**, que un payload degradado marca la ausencia y conserva el estado, y que la cola ordena por secuencia de dominio |

Los e2e corren contra el bundle de producción construido en modo mock. Los de `login.spec.ts` no dependen de la API; los de `journey.spec.ts` van contra el backend simulado.

---

## Decisiones abiertas

Ninguna está resuelta en el código. Cada una tiene un `TODO` en su sitio. Las que comparten origen con `portal-cliente` se marcan como tales; las de bandeja/reportes son propias de la audiencia interna.

| #   | Decisión                                                                                                                        | Dónde está marcada                                                        | Qué bloquea                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **`contracts/` no existe.** No hay repo backend ni remoto: `openapi/bff.yaml`, `events/` y `estados/` no están en ninguna parte | `scripts/gen-contracts.mjs`, cabecera de cada archivo de `lib/contracts/` | **El bloqueo grande** (compartido con `portal-cliente`). Los tipos de `lib/contracts/` son provisionales, escritos a mano desde `docs/arquitectura/`. Los nombres del wire son suposiciones en `snake_case`. Los mocks desbloquean la UI pero **no reducen este riesgo**. `gen:contracts` falla con instrucciones                                                                                                    |
| 2   | **Custodia del token en el navegador** (compartida)                                                                             | `lib/api/tokenStore.ts`                                                   | ADR 8 cierra el proveedor, no el almacenamiento. Hoy hay una implementación con `localStorage` **solo para que el scaffold arranque**, aislada tras una interfaz. `localStorage` es lo peor ante XSS; memoria + refresh en cookie `httpOnly` es mejor pero exige que `bff` ponga esa cookie, y el contrato no lo dice                                                                                                 |
| 3   | **ADR 16** — ¿el trigger de Cognito reevalúa claims en el refresco? (compartida)                                                | `context/SessionContext.tsx`                                              | Si no lo hace, un cambio de rol interno no se refleja hasta relogin y hace falta una ruta de relogin forzado. Pesa más aquí: los roles internos (ejecutivo, supervisor, auditor) gobiernan qué comandos de bandeja y qué exportaciones se autorizan                                                                                                                                                                  |
| 4   | **ADR 10** — ¿existe `realtime` en V1? (compartida)                                                                             | `lib/constants.ts` (`STREAM_ENABLED`)                                     | Sin `VITE_STREAM_BASE_URL` la app corre pull-only y `lib/stream/` queda sin cablear                                                                                                                                                                                                                                                                                                                                 |
| 5   | **ADR 4** — política de colchón del ETA (compartida)                                                                            | `lib/contracts/tracking.ts`                                               | Cuál de los dos números de ETA cruza la frontera. `Eta` modela solo uno                                                                                                                                                                                                                                                                                                                                            |
| 6   | **Forma del sobre restringido de chat y su `audience_version`**                                                                 | `lib/contracts/envelope.ts`, `features/bandejas/`                         | El Addendum de mensajería fija que el sobre de chat lleva su propia audiencia (explícita o snapshot inmutable con `audience_version`); la **forma** de ese campo no está serializada en ningún contrato. El panel tiene el hueco preparado y un `TODO`                                                                                                                                                                |
| 7   | **Modelo de datos de `reportes` (ADR de fuente de lectura)**                                                                    | `features/reportes/`, `lib/contracts/reportes.ts`                         | `reportes.md` deja abierto si la fuente es proyección por eventos o réplica de solo lectura. La **forma** de las consultas y agregados que el panel pide depende de esa resolución. Las pantallas de reportes quedan como placeholders                                                                                                                                                                               |
| 8   | **ADR 13** — ¿entrega Cognito el OTP? (compartida)                                                                              | `routes/(auth)/two-factor.tsx`                                            | Si lo entrega, esta ruta puede no existir. Está como placeholder sin lógica                                                                                                                                                                                                                                                                                                                                        |
| 9   | **Señal de "ingesta degradada"** (compartida)                                                                                   | `lib/contracts/envelope.ts`, `lib/stream/streamClient.ts`                 | El diseño exige que el servidor pueda decir "estoy vivo pero no recibo"; la **forma** de esa señal no está especificada. El cliente tiene el hueco preparado y un `TODO`                                                                                                                                                                                                                                             |
| 10  | **Cómo dibuja el mapa la incertidumbre** (compartida)                                                                           | `features/tracking/TrackingMap.tsx`                                       | MapLibre está instalado y **sin montar**, a propósito. Antes de montarlo hay que decidir cómo se pinta una posición vieja, qué se pinta cuando falta por degradación, y si la traza es polilínea o puntos discretos                                                                                                                                                                                                  |
| 11  | **Accesibilidad contra "sin librerías de componentes"** (compartida)                                                            | `components/ui/Modal.tsx`                                                 | El modal usa `<dialog>` nativo, que da foco atrapado, Escape y restauración de foco gratis. Si más adelante hacen falta combobox, menús o popovers posicionados —probables en un panel denso—, conviene revisar la restricción antes de reimplementar un focus manager                                                                                                                                               |
