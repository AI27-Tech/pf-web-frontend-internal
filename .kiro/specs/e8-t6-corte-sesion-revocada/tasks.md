# Implementation Plan — E8-T6: Corte de sesión revocada en el cliente

> Alcance: los **dos portales** (`pf-web-frontend-internal` y `pf-web-frontend-client`), rama `feature/e8-t6-corte-sesion-revocada` en cada repo. Las tareas con sufijo (interno) o (cliente) aplican a un solo repo; el resto a ambos con la adaptación descrita en `design.md`.
>
> Antes de empezar: confirmar las decisiones de diseño abiertas (DEC-DISEÑO-1 y DEC-DISEÑO-2) y el texto del Mensaje_Sesion_Finalizada con Producto/Tech. Mientras no se confirme DEC-DISEÑO-1, no tocar el `tokenStore` del cliente.

- [ ] 1. Punto único de corte de sesión (`sessionCut`)
  - Crear `src/lib/api/sessionCut.ts` en ambos portales: `cortarSesion(motivo)` idempotente que limpia el `tokenStore`, invoca a los suscriptores registrados y emite un evento observable; `onCut(listener)` que devuelve un desuscriptor.
  - Garantizar idempotencia con una bandera "ya cortada" (R2.4).
  - _Requisitos: R2.1, R2.4, R3.1, R3.2, R5.2_

- [ ] 2. Nuevo `kind` de error `'sesionFinalizada'`
  - Añadir `'sesionFinalizada'` a `ApiErrorKind` en `src/lib/api/errors.ts` de ambos portales, distinto de `'noAutorizado'`.
  - No tocar el mapeo de `kindFromStatus` (el corte lo decide `manejar401`, no el status crudo).
  - _Requisitos: R4 (soporte), R7.2_

- [ ] 3. Máquina de recuperabilidad del `401` en la Puerta_HTTP
  - [ ] 3.1 Añadir la rama de `401` en `request<T>` (`client.ts`) de ambos portales, delegando en `manejar401`.
    - _Requisitos: R1.1, R7.3_
  - [ ] 3.2 Implementar `manejar401`: flag interno `_reintentoPostRefresco` para un solo reintento; sin `refresh_token` utilizable → corte; refresco `401` → corte; refresco OK → reintento único; refresco red/5xx → propaga sin cortar.
    - _Requisitos: R1.2, R1.3, R1.4, R1.5, R2.2, R2.3_
  - [ ] 3.3 Coordinador de refresco compartido (`refreshCoordinator`): una sola promesa de refresco en vuelo para peticiones concurrentes.
    - _Requisitos: R1.5, R2.4_

- [ ] 4. Persistencia de refresh/sesión en el cliente (cliente) — condicionada a DEC-DISEÑO-1
  - Si se aprueba ampliar el almacenamiento: `tokenStore` del cliente persiste `refreshToken` y `sesionId` cuando el wire los trae; `toSesion`/`login`/`refresh` los propagan; `hayRefreshTokenUtilizable()` consulta su presencia.
  - Si se aprueba la alternativa: `manejar401` del cliente trata todo `401` como no recuperable (sin refresco reactivo) y esta tarea se cierra sin tocar el almacenamiento.
  - _Requisitos: R1.4_

- [ ] 5. Enganche del corte con el enrutamiento y el mensaje
  - [ ] 5.1 Suscribir el `SessionContext` de cada portal a `onCut`: refleja "sin sesión" y navega a `/login` con `search: { redirect, motivo: 'sesion_finalizada' }`.
    - _Requisitos: R4.1, R4.4_
  - [ ] 5.2 Ampliar `validateSearch` de la ruta `/login` de cada portal para aceptar `motivo?: 'sesion_finalizada'`.
    - _Requisitos: R4.1_
  - [ ] 5.3 Mostrar el Mensaje_Sesion_Finalizada con un componente de la Libreria_UI (`@ai27-tech/ui`) cuando `motivo === 'sesion_finalizada'`. Texto único, sin afirmar revocación ni expiración.
    - _Requisitos: R4.2, R4.3, R4.5, R6.1_
  - Verificación de librería: antes de usar el componente de aviso, confirmar que `@ai27-tech/ui` lo exporta (Toast/Alert). Si no existe, documentar la brecha y notificar — no crear el componente localmente.
    - _Requisitos: R6.1, R6.2_

- [ ] 6. No perder lo capturado sin avisar
  - Conectar la pantalla con formulario a medio llenar al `onCut` para advertir antes de que la navegación limpie el estado. Grado (solo advertir vs. preservar) según DEC-DISEÑO-2.
  - _Requisitos: R5.1, R5.2_

- [ ] 7. Pruebas (Vitest)
  - Interno: co-localizadas en `src/lib/api/*.test.ts`. Cliente: en `src/lib/api/__tests__/*.test.ts`.
  - [ ] 7.1 `401` + refresco OK → no corta, reintenta una vez (R1.2).
  - [ ] 7.2 `401` + refresco `401` → corta, no reintenta (R1.3, R2.2).
  - [ ] 7.3 `401` sin `refresh_token` → corta sin refrescar (R1.4).
  - [ ] 7.4 refresco red/5xx → no corta, conserva sesión (borde de degradación).
  - [ ] 7.5 N peticiones concurrentes con `401` → un solo corte y un solo refresco (R1.5, R2.4).
  - [ ] 7.6 `onCut` recibe el evento con un suscriptor de prueba (R3.2 / R5.2).
  - [ ] 7.7 Tras el corte, estado en `/login` con `motivo=sesion_finalizada` y mensaje visible (R4).
  - _Requisitos: R1, R2, R3, R4, R5_

- [ ] 8. e2e del corte (Playwright) — definición de terminado de E8-T6
  - Prueba de que un `401` por revocación **no** dispara el ciclo de refresco y lleva a login con el mensaje.
  - e2e que simula la revocación desde administración (mock) y confirma que la otra sesión queda fuera dentro de la ventana contractual. En V1, contra mock, se valida el comportamiento del corte; el máximo de 30 s se prueba contra el backend real cuando exista.
  - _Requisitos: R1, R2, R4_

- [ ] 9. Reporte de brecha de contrato y CHANGELOG
  - Registrar BRECHA-CONTRATO-1 (el `401` no distingue revocación de expiración; ADR 26 §7 no distribuye `motivo`) como brecha a `pf-pkg-contracts`, con la propuesta de un `codigo` estable `sesion_revocada` en el `401` del `bff`.
  - Entrada de CHANGELOG en cada repo describiendo el corte reactivo de sesión.
  - _Requisitos: R4.3, R7.2_

## Nota de verificación

Al cerrar: correr `typecheck` + `vitest run` en ambos repos, y el e2e. Un `vitest run` verde es evidencia del comportamiento del corte; el máximo de 30 s del ADR 26 solo se verifica de punta a punta contra el backend real (fuera del alcance de los portales en V1), y así debe declararse.
