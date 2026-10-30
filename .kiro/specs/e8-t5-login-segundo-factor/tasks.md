# Implementation Plan: E8-T5 — Login y segundo factor (interno)

## Overview

El plan convierte el diseño de E8-T5 en pasos de código incrementales sobre la capa de sesión ya existente de `pf-web-frontend-internal`. La mayor parte del comportamiento ya vive en el repo; este plan introduce tres cambios localizados (validación local de campos vacíos, afinado del mapeo de errores, y clasificación del fallo de refresco por `kind`), fija con pruebas lo que ya cumple requisitos, y traduce las 7 Correctness Properties del diseño a pruebas con `fast-check`.

Toda la interfaz se compone con `@ai27-tech/ui`; no se crean componentes nuevos. Las pruebas de propiedad usan `fast-check` sobre Vitest, con mínimo 100 iteraciones por propiedad.

El transporte del segundo factor está **desbloqueado por contrato** desde `v0.1.0-tracer.20`: `CredencialesEntrada` expone `segundo_factor?: string | null`. B1 y B2 se implementan en el frontend. La distinción de un TOTP inválido permanece como **brecha externa de Identidad** porque el runtime actual colapsa ese caso con credenciales inválidas.

## Tasks

- [x] 1. Validación local de campos vacíos en `LoginForm.tsx`
  - [x] 1.1 Impedir el envío cuando usuario o contraseña están vacíos
    - En `src/features/sesion/LoginForm.tsx`, antes de llamar a `login` en `handleSubmit`, comprobar que `email` y `password` no estén vacíos tras `trim`
    - Si alguno está vacío, marcar el campo requerido con el prop `error`/`required` del `FormField` de `@ai27-tech/ui` y no emitir la petición `POST /sesion`
    - Reutilizar `FormField`/`Input` existentes; no crear componentes nuevos
    - _Requirements: 1.2_
  - [ ]* 1.2 Escribir prueba de propiedad para la no emisión con campos vacíos
    - **Feature: e8-t5-login-segundo-factor, Property 2: No se emite petición de login con campos vacíos**
    - Generar con `fast-check` pares (usuario, contraseña) con al menos un campo vacío o solo-espacios; verificar que `iniciarSesion` no se invoca y que el campo requerido queda marcado como inválido (mínimo 100 iteraciones)
    - **Validates: Requirements 1.2**

- [x] 2. Afinar el mapeo de errores en `useLogin.ts`
  - [x] 2.1 Distinguir indisponibilidad del IdP del fallo de credenciales
    - En `src/features/sesion/useLogin.ts`, mapear `invalidCredentials` al mensaje genérico de credenciales (único e indistinto)
    - Mapear `degradado` y `red` a un mensaje de indisponibilidad del servicio de identidad, distinguible del de credenciales y sin atribuir el error al usuario; asegurar que `red` no caiga en el genérico de login
    - Mantener `default` como genérico de fallo de login
    - No introducir `kind` nuevos ni clasificación en capas bajas
    - _Requirements: 1.4, 1.5, 4.1, 4.2_
  - [ ]* 2.2 Escribir prueba de propiedad para el mensaje de credenciales único
    - **Feature: e8-t5-login-segundo-factor, Property 1: Mensaje de credenciales único e indistinto de la existencia de la cuenta**
    - Generar valores de `usuario` arbitrarios con `fast-check`; para toda respuesta `401` el mensaje es exactamente el genérico de credenciales y no varía con `usuario` (mínimo 100 iteraciones)
    - **Validates: Requirements 1.4, 1.5**
  - [ ]* 2.3 Escribir prueba de propiedad para el mensaje de indisponibilidad
    - **Feature: e8-t5-login-segundo-factor, Property 3: La indisponibilidad del IdP produce un mensaje distinto del de credenciales**
    - Generar `ApiError` de `kind` `degradado`/`red` con `fast-check`; verificar que `useLogin` produce el mensaje de indisponibilidad y que nunca coincide con el genérico de credenciales (mínimo 100 iteraciones)
    - **Validates: Requirements 4.1, 4.2**
  - [x]* 2.4 Escribir pruebas unitarias del mapeo por `kind` en `useLogin`
    - Cubrir cada `kind` (`invalidCredentials`, `degradado`, `red`, default) y su mensaje, incluido el nuevo mensaje de indisponibilidad
    - _Requirements: 1.4, 1.5, 4.1, 4.2_

- [x] 3. Clasificar el fallo de refresco por `kind` en `SessionContext.tsx`
  - [x] 3.1 Preservar la sesión vigente ante fallo de refresco por indisponibilidad
    - En `src/context/SessionContext.tsx`, en la rama `catch` del callback del timer del `useEffect` de refresco, clasificar el error por `ApiError.kind`
    - `noAutorizado` → `applySession(null)` (cierra); `degradado`/`red` → conservar la sesión vigente y dejar que el ciclo reprograme; cualquier otro `kind` o error no-`ApiError` → conservador, mantener la sesión
    - **Contradice el comportamiento actual**: hoy el `catch` cierra la sesión ante cualquier fallo de refresco; este cambio solo cierra ante `noAutorizado`
    - No modificar el cálculo del `delay`, la reprogramación, la limpieza del timer, ni `login`/`logout`/`applySession`/hidratación
    - _Requirements: 4.3, 4.4_
  - [ ]* 3.2 Escribir prueba de propiedad para el fallo de refresco
    - **Feature: e8-t5-login-segundo-factor, Property 4: Un fallo de refresco por indisponibilidad nunca cierra una sesión vigente**
    - Generar sesiones vigentes y `kind` de fallo de refresco con `fast-check`; verificar que `degradado`/`red` conserva la sesión sin cambios y solo `noAutorizado` la cierra (mínimo 100 iteraciones)
    - **Validates: Requirements 4.4**
  - [ ]* 3.3 Escribir prueba de propiedad para la no concesión ante fallo de login
    - **Feature: e8-t5-login-segundo-factor, Property 5: Ningún fallo de login concede una nueva sesión**
    - Generar fallos de `iniciarSesion` de cualquier `kind` con `fast-check`; verificar que el estado de sesión no pasa a una nueva `Sesion` (mínimo 100 iteraciones)
    - **Validates: Requirements 4.3**
  - [ ]* 3.4 Escribir pruebas unitarias del comportamiento de refresco y cierre
    - Con timers falsos, el refresco se dispara con margen según `expira_en` (Req 3.3); `degradado`/`red` conserva la sesión y `noAutorizado` cierra; `logout` limpia el store y llama `cerrarSesion` best-effort (Req 3.5)
    - _Requirements: 3.3, 3.5, 4.4_

- [x] 4. Checkpoint — Asegurar que las pruebas pasan
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Fijar con pruebas el comportamiento ya existente que cumple requisitos
  - [ ]* 5.1 Escribir prueba de propiedad para la derivación de rol/audiencia desde claims
    - **Feature: e8-t5-login-segundo-factor, Property 6: El rol y la audiencia se derivan de los claims del token**
    - Generar con `fast-check` claims con rol válido/ inválido y tokens no decodificables; verificar que `parseSesion` deriva `Usuario` (rol/audiencia) de los claims cuando el rol es válido y lanza `SesionInvalidaError` en token inválido o rol no reconocido (mínimo 100 iteraciones)
    - **Validates: Requirements 3.2, 3.4**
  - [ ]* 5.2 Escribir pruebas unitarias de `parseSesion`
    - Casos de token válido, rol inválido y token no decodificable; complementa la Property 6
    - _Requirements: 3.2, 3.4_
  - [ ]* 5.3 Escribir prueba de propiedad para el round-trip de persistencia del token
    - **Feature: e8-t5-login-segundo-factor, Property 7: Round-trip de persistencia de la sesión**
    - Generar `Sesion` arbitrarias con `fast-check`; verificar que `guardar`→`cargar` del `TokenStore` reproduce `accessToken`, `refreshToken` y los campos persistidos de forma equivalente (mínimo 100 iteraciones)
    - **Validates: Requirements 3.1**
  - [ ]* 5.4 Escribir pruebas unitarias de `iniciarSesion`
    - Verificar que construye `POST /sesion` con el cuerpo `{ usuario, contrasena }` (Req 1.1) y reclasifica `401` (`noAutorizado`) a `invalidCredentials` (Req 1.4, 1.5)
    - _Requirements: 1.1, 1.4, 1.5_
  - [ ]* 5.5 Escribir pruebas unitarias de redirección en `login.tsx`
    - Verificar la redirección al destino de `?redirect=` y a home cuando el parámetro está ausente (Req 1.6)
    - _Requirements: 1.6_
  - [ ]* 5.6 Escribir pruebas del indicador de progreso y deshabilitado del envío
    - Verificar que el envío se deshabilita y se muestra progreso con los estados `authenticating`/`submitting` durante el login
    - _Requirements: 1.4_

- [x] 6. Confirmar composición de la interfaz solo con `@ai27-tech/ui`
  - [x] 6.1 Verificar por inspección que `LoginForm` no define componentes propios
    - Confirmar que `LoginForm.tsx` compone únicamente componentes de `@ai27-tech/ui` (`Card`, `CardBody`, `Form`, `FormField`, `Input`, `Checkbox`, `Button`) y no introduce ninguno nuevo; si faltara un componente, documentar la brecha de la Libreria_UI en lugar de duplicarlo
    - _Requirements: 5.1, 5.2_

- [x] 7. Prueba e2e de login
  - [x]* 7.1 Escribir e2e login → panel
    - Credenciales válidas conceden sesión y navegan al destino (redirect o home)
    - _Requirements: 1.3, 1.6, 3.1_

- [x] 8. Checkpoint final — Asegurar que las pruebas pasan
  - Ensure all tests pass, ask the user if questions arise.

## Tareas del Segundo_Factor

> `segundo_factor` está disponible en `@ai27-tech/contracts@0.1.0-tracer.20`. B1 y B2 forman parte del alcance implementable del frontend. B3 queda diferida por una brecha externa de Identidad. B4 está parcial: el transporte está probado, pero no se prueba un error específico hasta que exista un código contractual y runtime estable.

- [x] B1. Captura del segundo factor en `LoginForm`
  - Agregar un `Input` opcional dentro de un `FormField` de `@ai27-tech/ui`.
  - No marcarlo como requerido.
  - _Requirements: 2.2, 2.3_

- [x] B2. Envío del segundo factor en el cuerpo de `POST /api/v1/sesion`
  - Enviar `segundo_factor` en el mismo request solo cuando el usuario captura un código.
  - Omitir la propiedad cuando el campo está vacío.
  - _Requirements: 2.2_

- [ ] B3. Mensaje de segundo factor inválido distinguible del de credenciales
  - **Diferida por brecha externa A-14 de Identidad.** El runtime actual no distingue OTP inválido de credenciales inválidas y no existe un `codigo` contractual publicado.
  - Mientras tanto, el frontend conserva el mensaje genérico para cualquier `401`.
  - _Requirements: 2.5_

- [-] B4. Prueba e2e del segundo factor
  - Implementada la prueba de captura y envío en el mismo request.
  - Pendiente la prueba del mensaje específico hasta que Identidad publique un código estable.
  - _Requirements: 2.2, 2.5_

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos que satisface para trazabilidad.
- Los checkpoints aseguran validación incremental.
- Las pruebas de propiedad (`fast-check`, mínimo 100 iteraciones) validan las 7 Correctness Properties del diseño; las unitarias y el e2e cubren ejemplos y caminos concretos.
- El cambio de la tarea 3.1 contradice el comportamiento actual del `useEffect` de refresco (hoy cierra ante cualquier fallo); es un cambio intencional del diseño.
- B1 y B2 quedan implementadas contra tracer.20; B3 queda diferida por la brecha externa de Identidad; B4 queda parcial con transporte verificado.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "6.1"] },
    {
      "id": 1,
      "tasks": [
        "1.2",
        "2.2",
        "2.3",
        "2.4",
        "3.2",
        "3.3",
        "3.4",
        "5.1",
        "5.2",
        "5.3",
        "5.4",
        "5.5",
        "5.6"
      ]
    },
    { "id": 2, "tasks": ["7.1", "B1", "B2", "B4"] }
  ]
}
```
