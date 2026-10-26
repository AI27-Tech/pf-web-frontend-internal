# Design Document — E8-T6: Corte de sesión revocada en el cliente

## Alcance y ubicación

E8-T6 es una tarea de **los dos portales**. El spec vive en `pf-web-frontend-internal` por convención del tracker, pero el diseño se aplica a ambos repos con la misma forma y dos adaptaciones por las diferencias de código que ya existen entre ellos. El trabajo de cada repo vive en su rama `feature/e8-t6-corte-sesion-revocada`.

El principio rector viene del requirements: **el portal no ramifica sobre la causa del `401` (no puede: el contrato no la distingue), sino sobre la recuperabilidad.** Todo el diseño gira alrededor de un único interceptor de `401` en la Puerta_HTTP y de un único punto de Corte_De_Sesion observable.

## Estado de partida (lo que ya existe)

Confirmado por lectura del código en ambos repos:

| Pieza                          | Interno (`pf-web-frontend-internal`)                                                                              | Cliente (`pf-web-frontend-client`)                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Puerta HTTP                    | `src/lib/api/client.ts` → `request<T>`                                                                            | `src/lib/api/client.ts` → `request<T>` + `api.get/post/delete`                                                      |
| Taxonomía de error             | `src/lib/api/errors.ts` → `ApiError` con `kind`, `status`, `codigo` (lee `codigo` del cuerpo)                     | `src/lib/api/errors.ts` → `ApiError` con `kind`, `status`, `detail` (no lee `codigo`)                               |
| 401 hoy                        | `kindFromStatus` → `'noAutorizado'` (401 y 403)                                                                   | `kindFromStatus` → `'noAutorizado'` (401 y 403)                                                                     |
| tokenStore                     | `src/lib/api/tokenStore.ts`: guarda el objeto `Sesion` completo (incluye `sesionId`, `refreshToken?`)             | `src/lib/api/tokenStore.ts`: guarda solo `{ accessToken, expiraEn }` — **no persiste `sesionId` ni `refreshToken`** |
| Modelo parseado                | `src/lib/contracts/sesion.ts` → `Sesion` (`expiraEn` epoch ms, `usuario`)                                         | `src/lib/api/sesion.ts` → `SesionEmitida` (`expiraEn` ISO)                                                          |
| Sesión / refresco              | `SessionContext.tsx`: refresco proactivo por temporizador; `logout()` limpia local + `DELETE /sesion` best-effort | `SessionContext.tsx`: igual, refresco proactivo por temporizador observando `tokenStore`                            |
| Guarda privada                 | `src/routes/_private.tsx`: `beforeLoad` redirige a `/login?redirect=` si no hay token                             | `src/routes/_private.tsx`: igual                                                                                    |
| Navegación a login             | TanStack Router, `/login` con `search.redirect`                                                                   | TanStack Router, `/login` con `search.redirect`                                                                     |
| SSE / EventSource              | **No existe** código vivo                                                                                         | **No existe** (solo mocks V2 retirados)                                                                             |
| Mensaje de "sesión finalizada" | **No existe** canal                                                                                               | **No existe** canal                                                                                                 |
| Tests                          | Vitest, co-localizados (`*.test.ts`)                                                                              | Vitest, en `__tests__/`                                                                                             |

**Hecho clave:** hoy el refresco vive solo en un temporizador proactivo del `SessionContext`; **ningún** portal reacciona al `401` de una petición. E8-T6 introduce ese manejo reactivo. El refresco proactivo existente se conserva: E8-T6 añade la ruta reactiva, no la reemplaza.

## Diseño

### 1. Un único interceptor de `401` en la Puerta_HTTP

Toda la lógica de recuperabilidad se concentra en `request<T>` de `client.ts`, que ya es el único punto por el que pasa cada respuesta. Al recibir `401`:

```
request(path):
  response = fetch(...)
  if response.status == 401:
    return manejar401(path, options, response)   // nueva rama
  ... (resto igual)
```

`manejar401` implementa la máquina de recuperabilidad (R1/R2):

```
manejar401(path, options, response):
  if yaSeReintento(options):         // ya venimos de un reintento post-refresco
      cortarSesion()                 // segundo 401: no recuperable (R1.5, R2.3)
      lanzar ApiError('sesionFinalizada', ...)
  if not hayRefreshTokenUtilizable():
      cortarSesion()                 // sin refresh posible (R1.4)
      lanzar ApiError('sesionFinalizada', ...)
  try:
      nuevaSesion = await refrescar()        // R1.1
  catch e:
      if e es 401:  cortarSesion(); lanzar ApiError('sesionFinalizada', ...)  // R1.3
      else:         lanzar e   // degradación: no es corte, se preserva la sesión (R, borde)
  persistir(nuevaSesion)
  return request(path, { ...options, _reintentoPostRefresco: true })  // R1.2, un solo reintento
```

- El flag `_reintentoPostRefresco` (interno a `RequestOptions`, no expuesto a quien llama) garantiza **a lo sumo un** refresco y **un** reintento por petición (R1.5, R2.2).
- Un fallo de refresco que **no** sea `401` (red, 5xx) es degradación, no corte: se propaga el error y se conserva la sesión, igual que hoy hace el refresco proactivo. Solo el `401` del refresco es corte.

### 2. Coalescencia del refresco y del corte (concurrencia)

Para R1.5 y R2.4, dos peticiones concurrentes que reciben `401` no deben disparar dos refrescos ni dos cortes:

- **Refresco en vuelo compartido:** un módulo `refreshCoordinator` mantiene una única promesa de refresco en curso; las peticiones que llegan con `401` mientras hay un refresco en vuelo esperan esa misma promesa en lugar de lanzar otra.
- **Corte idempotente:** `cortarSesion()` es idempotente. La primera invocación descarta tokens, cierra suscripciones, emite el evento y navega; las siguientes no hacen nada (guard con una bandera de "ya cortada"). Así, N peticiones con `401` producen **un** corte (R2.4).

### 3. El punto único de Corte_De_Sesion (`sessionCut`)

Se añade un módulo pequeño, p. ej. `src/lib/api/sessionCut.ts`, con una sola responsabilidad: ejecutar y difundir el corte. No es UI; es el punto de coordinación entre la Puerta_HTTP, el `SessionContext` y las pantallas.

```
cortarSesion(motivo = 'sesion_finalizada'):
  if yaCortada: return
  yaCortada = true
  tokenStore.limpiar()            // R2.1: descarta access/refresh/sesionId
  cerrarSuscripciones()           // R3.1: itera suscriptores registrados
  emitir('session-cut', motivo)   // R3.2 / R5.2: observable para formularios y SSE futuro
```

- **Suscriptores (R3):** `sessionCut` expone `onCut(listener)` que devuelve un desuscriptor. Hoy no hay ningún SSE que registrar (R3.2), pero el punto existe para que una Suscripcion_Activa futura (realtime V2) se cierre aquí sin tocar la Puerta_HTTP. Esto satisface R3 sin crear superficie SSE que V1 no tiene.
- **Observabilidad para formularios (R5):** el mismo `onCut` lo consume una pantalla con formulario a medio llenar para advertir antes de que la navegación limpie el estado.

### 4. Navegación al login y mensaje (R4)

La navegación no la hace `client.ts` (no tiene router). El `SessionContext` se suscribe a `onCut` y, al dispararse:

1. refleja el estado "sin sesión" (ya lo hace al ver `tokenStore` vacío en el cliente; en el interno `applySession(null)`);
2. navega a `/login` con `search: { redirect: <ruta actual>, motivo: 'sesion_finalizada' }`.

La ruta `/login` de cada portal amplía su `validateSearch` para aceptar `motivo?: 'sesion_finalizada'` además del `redirect?` que ya maneja. Cuando `motivo === 'sesion_finalizada'`, el login muestra el **Mensaje_Sesion_Finalizada** con un componente de la Libreria_UI (p. ej. `Toast`/`Alert` de `@ai27-tech/ui`).

- **Mensaje único (R4.3):** texto propuesto, pendiente de validación: _"Tu sesión finalizó. Inicia sesión de nuevo para continuar."_ No afirma revocación ni expiración.
- **Preservación del destino (R4.4):** se reusa el mismo `redirect` de la guarda `_private.tsx`.

### 5. Taxonomía de error: nuevo `kind` 'sesionFinalizada'

Ambos `errors.ts` ganan un `ApiErrorKind` nuevo, `'sesionFinalizada'`, distinto de `'noAutorizado'`. Motivo: `'noAutorizado'` hoy abarca el `401` de login (credenciales) y el `403` (fuera de alcance), que **no** son corte de sesión. El corte es específicamente "estaba autenticado y la sesión dejó de valer sin recuperación". Separarlo evita que una pantalla trate un `403` de permisos como un cierre de sesión.

- `iniciarSesion`/`login` siguen mapeando su `401` a `invalidCredentials` (interno) y su equivalente en cliente: el `401` del **login** no pasa por `manejar401` (no hay sesión que cortar); se intercepta antes, como hoy.

### 6. Diferencias por portal

**Cliente (`pf-web-frontend-client`) — dos gaps a cerrar:**

1. **`tokenStore` no persiste `sesionId` ni `refreshToken`.** Hoy guarda solo `{ accessToken, expiraEn }`, y `refresh()` envía un cuerpo vacío en modo mock. Para E8-T6 el corte no necesita `sesionId` (la correlación la hace el backend), pero **sí** necesita saber si hay `refresh_token` utilizable (R1.4). Decisión: el `tokenStore` del cliente pasa a persistir también `refreshToken` y `sesionId` cuando el wire los trae, alineándose con el interno. `hayRefreshTokenUtilizable()` consulta esa presencia. _(Si se prefiere no tocar el almacenamiento del cliente en V1, la alternativa es tratar siempre el `401` del cliente como no recuperable; se deja como decisión abierta DEC-DISEÑO-1 abajo.)_
2. **`ApiError` del cliente no lee `codigo`.** No es necesario para E8-T6 (no ramificamos por `codigo`), así que no se cambia salvo que la brecha de contrato se cierre.

**Interno (`pf-web-frontend-internal`):**

- El `tokenStore` ya guarda la `Sesion` completa, así que `hayRefreshTokenUtilizable()` consulta `sesion.refreshToken`.
- El `ApiError` ya lee `codigo`: si la BRECHA-CONTRATO-1 se cierra con un `sesion_revocada`, el interno podría afinar el mensaje sin más cambios de plomería.

### 7. Qué NO se construye (R7)

- Ninguna proyección de revocación en el portal, ninguna consulta a `identidad` (`/api/v1/sesiones/revocadas` es de los servicios).
- Ningún código de `EventSource`/SSE: solo el punto de cierre observable.
- Ningún `codigo`/`motivo` inventado: el mensaje es único mientras el contrato no distinga.

## Diagrama de la máquina de `401`

```
petición → 401
   │
   ├─ ¿es reintento post-refresco?  ── sí ─▶ CORTE (segundo 401)
   │                                 no
   ├─ ¿hay refresh_token utilizable? ── no ─▶ CORTE (sin refresco)
   │                                 sí
   ├─ refrescar()
   │     ├─ 401            ─────────────────▶ CORTE (refresco rechazado)
   │     ├─ red/5xx        ─────────────────▶ propaga error, conserva sesión
   │     └─ Sesión nueva ─▶ reintentar petición una vez (post-refresco)
   │
CORTE = tokenStore.limpiar() + cerrarSuscripciones() + emitir('session-cut')
        + SessionContext navega a /login?motivo=sesion_finalizada&redirect=…
```

## Verificación (resumen; el detalle en tasks.md)

- Un `401` con refresco exitoso **no** corta sesión y reintenta una vez (R1.2).
- Un `401` con refresco `401` corta y **no** reintenta (R1.3, R2.2).
- Un `401` sin `refresh_token` corta sin intentar refrescar (R1.4).
- Un refresco que falla por red/5xx **no** corta (borde de degradación).
- N peticiones concurrentes con `401` producen **un** corte y **un** refresco (R1.5, R2.4).
- Tras el corte, el portal queda en `/login` con `motivo=sesion_finalizada` y el mensaje visible (R4).
- El punto `onCut` recibe el evento (R3.2 / R5.2), verificado con un suscriptor de prueba.

## Decisiones de diseño abiertas (a confirmar con Product/Tech)

- **DEC-DISEÑO-1 (cliente):** ¿se amplía el `tokenStore` del cliente para persistir `refreshToken`/`sesionId`, o en V1 el cliente trata todo `401` como no recuperable (sin refresco reactivo)? La decisión de `localStorage` vs cookie httpOnly sigue abierta en ese repo y puede condicionar esto.
- **DEC-DISEÑO-2 (R5):** alcance de la preservación del borrador: ¿solo advertir, o persistir y reofrecer? El requirements solo exige "no perder sin avisar"; el grado mayor depende de cuánto formulario exista hoy en cada portal.
- **Texto del Mensaje_Sesion_Finalizada:** propuesto arriba, **pendiente de validación** de Producto.
