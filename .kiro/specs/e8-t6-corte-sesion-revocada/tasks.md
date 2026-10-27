# Implementation Plan — E8-T6: Corte de sesión revocada en el cliente

> Alcance: los dos portales (`pf-web-frontend-internal` y `pf-web-frontend-client`). La decisión técnica cerrada para V1 es mantener el `refreshToken` únicamente en memoria y conservar el access token/metadatos sin incluir el refresh token en la persistencia provisional existente. La recarga elimina la capacidad de refresco; el siguiente `401` ejecuta el corte.

- [x] 1. Punto único de corte de sesión (`sessionCut`)
  - Creado `src/lib/api/sessionCut.ts` en ambos portales.
  - `cortarSesion(motivo)` limpia el almacenamiento en memoria, notifica suscriptores y es idempotente.
  - `onCut(listener)` devuelve un desuscriptor y permite conectar formularios y futuras suscripciones.
  - `restablecerCorte()` habilita el siguiente corte después de un login exitoso.
  - _Requisitos: R2.1, R2.4, R3.1, R3.2, R5.2_

- [x] 2. Nuevo `kind` de error `'sesionFinalizada'`
  - Añadido a `ApiErrorKind` en ambos portales.
  - Se mantiene `kindFromStatus`: el status crudo no decide el corte.
  - _Requisitos: R4, R7.2_

- [x] 3. Máquina de recuperabilidad del `401` en la Puerta_HTTP
  - [x] 3.1 `request<T>` delega los `401` protegidos a `manejar401`.
  - [x] 3.2 Se implementa un solo refresco y un solo reintento; un segundo `401`, un refresh `401` o la ausencia de `refreshToken` ejecutan el corte. Red y `5xx` se propagan sin cortar.
  - [x] 3.3 `refreshCoordinator` comparte una sola promesa de refresh entre peticiones concurrentes.
  - Los endpoints de login, refresh y logout quedan fuera del interceptor reactivo para conservar sus políticas propias.
  - _Requisitos: R1.1–R1.5, R2.2, R2.3, R2.4_

- [x] 4. Persistencia de refresh/sesión en el cliente
  - `pf-web-frontend-client`: `SesionEmitida`, `toSesion`, `login` y `refresh` propagan `refresh_token` y `sesion_id`.
  - Ambos `tokenStore` mantienen `refreshToken` solo en memoria y conservan access/metadatos sin ese campo en la persistencia provisional existente.
  - `refresh()` envía el cuerpo contractual `{ refresh_token }`; después de una recarga, la ausencia del refresh token hace no recuperable el siguiente `401`.
  - _Requisitos: R1.4_

- [x] 5. Enganche del corte con el enrutamiento y el mensaje
  - [x] 5.1 Ambos `SessionContext` se suscriben a `onCut`, reflejan la ausencia de sesión y navegan a `/login` con `redirect` y `motivo=sesion_finalizada`.
  - [x] 5.2 Las rutas `/login` validan `motivo?: 'sesion_finalizada'`.
  - [x] 5.3 El mensaje neutral se compone con `Toast`/`ToastContainer` de `@ai27-tech/ui`.
  - _Requisitos: R4.1, R4.2, R4.3, R4.4, R4.5, R6.1, R6.2_

- [x] 6. No perder lo capturado sin avisar
  - Los formularios activos (`CrearViaje` y `NuevaSolicitudForm`) se suscriben a `onCut`.
  - V1 solo advierte que la información capturada no se envió; no persiste ni reofrece borradores.
  - _Requisitos: R5.1, R5.2_

- [x] 7. Pruebas (Vitest)
  - [x] 7.1 `401` + refresco OK → no corta, reintenta una vez.
  - [x] 7.2 `401` + refresco `401` → corta, no reintenta.
  - [x] 7.3 `401` sin `refresh_token` → corta sin refrescar.
  - [x] 7.4 refresco red/5xx → no corta, conserva sesión.
  - [x] 7.5 peticiones concurrentes → un solo refresh coordinado.
  - [x] 7.6 `onCut` recibe un único evento y permite desuscribirse.
  - [x] 7.7 La ruta al login conserva `redirect` y muestra el mensaje; la cobertura e2e verifica el flujo completo.
  - _Requisitos: R1, R2, R3, R4, R5_

- [x] 8. e2e del corte (Playwright)
  - Agregado `e2e/session-cut.spec.ts` en ambos portales.
  - El mock simula una petición protegida `401` y un refresh `401`; se verifica el corte único, el login y el mensaje.
  - El máximo contractual de 30 s sigue siendo una verificación contra el backend real, fuera del mock y del alcance del frontend V1.
  - _Requisitos: R1, R2, R4_

- [x] 9. Reporte de brecha de contrato y CHANGELOG
  - Registrada la brecha de `401` sin causa distinguible en `docs/decisiones/e8-t6-brecha-contrato-401.md`.
  - Agregada entrada de CHANGELOG en cada portal.
  - _Requisitos: R4.3, R7.2_

## Nota de verificación

Validación ejecutada después de la implementación:

- `typecheck` en ambos portales: verde.
- Pruebas unitarias dirigidas de E8-T6: verdes.
- Suite Vitest completa del portal cliente: verde.
- Suite Vitest completa del portal interno: verde después de actualizar la expectativa existente de `401` a `sesionFinalizada`.
- E2E completo del Portal_Interno: 4/4 pruebas activas en verde.
- E2E completo del Portal_Cliente: 15/15 pruebas activas en verde; 15 omitidas por features desconectadas o preexistentes.
- `format:check` global sigue reportando archivos históricos fuera de este cambio; los archivos tocados por E8-T6 se formatearon de forma dirigida.
