# Implementation Plan: Modo mock con inicio de sesión por rol interno

## Overview

Plan de implementación derivado de `requirements.md` y `design.md`. Ejecutar en el orden del grafo de dependencias al final del documento. Ninguna tarea está ejecutada.

### Hallazgos de la planeación que el diseño no recoge

- **Miembros de `Rol`.** El diseño dice que hoy `src/` solo usa `Rol.JefeOperativo` y `Rol.Ejecutivo`. No es así: `src/features/monitoreo/puedeUsarMonitoreo.ts` usa `Monitorista`, `Supervisor`, `Coordinador` y `Administrador`, y `src/features/viajes/historico/visibilidadCorreccion.ts` usa `Supervisor` y `Coordinador`. Los siete roles internos existen en `node_modules/@ai27-tech/contracts/src/roles/roles.gen.ts`. El plan no cambia, pero el diseño debe corregirse.
- **Llamadas que el diseño no lista.** `tests/contracts/sesion.test.ts` importa `DEMO_CREDENTIALS`, y `tests/sesion/SessionContext.test.tsx` llama `createSessionWire()` sin argumento en las líneas 42 y 62. Ambos rompen con la nueva firma. Se corrigen en la tarea 5.1.
- **Codificación de `src/mocks/handlers.ts`.** El archivo es UTF-8 válido, pero su texto está doblemente codificado: `sesión` aparece como `sesi├│n` y el guion largo como `ÔÇö`. Ninguna prueba depende del texto dañado, porque `src/lib/api/sesion.ts` clasifica cualquier 401 de login como credenciales inválidas.
- **Cuerpo del refresh.** `POST /sesion/refresh` hoy no lee el cuerpo. La tarea 3.1 tiene que leer `refresh_token`.

### Decisiones pendientes del usuario

- **Barrido de codificación.** El resto de `handlers.ts` (viajes, asignación, clientes) tiene el mismo daño. Esta feature repara solo las líneas de sesión. ¿Se hace el barrido completo en otra tarea?
- **`ONBOARDING.md` del workspace.** Está fuera de este repo y también menciona solo `operador@demo.ai27`. Este plan no lo modifica.

## Tasks

- [x] 1. Catálogo de cuentas y helpers en `src/mocks/data.ts`
  - [x] 1.1 Registrar la línea base de verificación
    - Antes de editar, correr `pnpm typecheck`, `pnpm lint` y `pnpm test`, y anotar los fallos que ya existían. Así se distingue un fallo previo de uno causado por esta feature.
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2_

  - [x] 1.2 Confirmar los miembros de `Rol` con grep
    - Buscar en `node_modules/@ai27-tech/contracts/src/roles/roles.gen.ts` los siete roles internos: `JefeOperativo`, `Monitorista`, `Supervisor`, `Coordinador`, `Ejecutivo`, `Reaccion` y `Administrador`. Repetir la comprobación antes de editar, porque la versión de la librería puede cambiar.
    - _Requisitos: 1.1_

  - [x] 1.3 Reemplazar `DEMO_CREDENTIALS` y `DEMO_CLAIMS` por el catálogo
    - Definir `CONTRASENA_DEMO = 'demo1234'` y `CUENTAS_DEMO`, con siete filas `{ cuenta, rol }`, una por rol interno, usando `as const`.
    - Agregar `sujetoDeCuenta(cuenta)` (`usr-demo-<cuenta>`), `sesionDeCuenta(cuenta)` (`ses-demo-<cuenta>`), `cuentaPorCredenciales(usuario, contrasena)`, `cuentaPorRol(rol)` y `cuentaPorRefreshToken(token)`.
    - `cuentaPorRefreshToken` aplica la expresión `^mock\.refresh\.([a-z]+)\.[0-9a-f-]{36}$`.
    - Exportar `CUENTAS_DEMO` para las pruebas. Eliminar `DEMO_CREDENTIALS` y `DEMO_CLAIMS`.
    - _Requisitos: 1.1, 1.2, 2.1, 2.2, 2.3_

  - [x] 1.4 Ajustar `createSessionWire(cuenta)` y `mockAccessToken(rol)`
    - `createSessionWire(cuenta)` emite el `sesion_id` y el `access_token` de esa cuenta. El `refresh_token` es `mock.refresh.<cuenta>.<uuid>`, con `crypto.randomUUID()`.
    - `mockAccessToken(rol)` conserva su firma y toma `sub` y `sesion_id` de la cuenta del rol, con `cuentaPorRol`.
    - Las llamadas sin argumento dejan de compilar. Se corrigen en la tarea 5.1.
    - _Requisitos: 1.1, 2.1, 2.2, 3.1_

- [x] 2. `POST /sesion` en `src/mocks/handlers.ts`
  - [x] 2.1 Reparar la codificación de las líneas de sesión
    - Reparar el texto doblemente codificado de la cabecera del archivo y de los comentarios y mensajes de `POST /sesion`, `POST /sesion/refresh` y `DELETE /sesion`. Incluye `Credenciales inválidas` y `Sesión revocada`.
    - No tocar el resto del archivo. Ver decisiones pendientes.
    - _Requisitos: 1.3_

  - [x] 2.2 Validar credenciales y reiniciar conversaciones al iniciar sesión
    - Leer `usuario` y `contrasena` del cuerpo. Si el cuerpo no es JSON, falta un campo, está vacío o no es cadena, tratarlo como credencial inválida.
    - Buscar la cuenta con `cuentaPorCredenciales`. Sin coincidencia, responder 401 con `{ mensaje: 'Credenciales inválidas' }` y sin `access_token`.
    - Con coincidencia, llamar `reiniciarConversacionesMock({ sujetoId: sujetoDeCuenta(cuenta) })` y responder 200 con `createSessionWire(cuenta)`. El reinicio también borra los fallos forzados y las solicitudes registradas, como indica el diseño.
    - _Requisitos: 1.1, 1.3, 2.1, 2.2_

- [x] 3. `POST /sesion/refresh` en `src/mocks/handlers.ts`
  - [x] 3.1 Conservar la cuenta al renovar
    - Evaluar primero el corte de sesión (`x-mock-session-cut` y la cookie), como hoy.
    - Leer `refresh_token` del cuerpo. Extraer la cuenta con `cuentaPorRefreshToken`. Sin cuenta, responder 401 con `{ mensaje: 'Refresh token inválido' }`.
    - Con cuenta, responder 200 con `createSessionWire(cuenta)`. El refresh no reinicia conversaciones.
    - _Requisitos: 3.1_

- [x] 4. Sujeto de conversaciones
  - [x] 4.1 Cambiar `SUJETO_CONVERSACIONES_DEMO`
    - Asignar `sujetoDeCuenta('operador')`, es decir, `usr-demo-operador`. Mantener el nombre de la constante. `OTRO_RESPONSABLE_DEMO = 'usr-demo-2'` no cambia.
    - _Requisitos: 2.1, 2.2_

  - [x] 4.2 Revisar las pruebas de conversaciones y de viajes que usan `usr-demo-1`
    - Revisar `tests/conversaciones/BandejaConversaciones.test.tsx` (línea 64, `usr-demo-1` dentro del mock de sesión, y el `beforeEach` de la línea 142) y `tests/viajes/CrearViaje.test.tsx` (línea 27, `usr-demo-1` como dato local).
    - Ajustar solo lo que falle al correr las pruebas.
    - _Requisitos: 2.1_

- [x] 5. Pruebas
  - [x] 5.1 Ajustar las pruebas existentes que usan la firma anterior
    - `tests/contracts/sesion.test.ts`: reemplazar `DEMO_CREDENTIALS` por el usuario y la contraseña de una cuenta de `CUENTAS_DEMO`, y pasar la cuenta a `createSessionWire` en cada llamada.
    - `tests/sesion/SessionContext.test.tsx` (líneas 42 y 62): pasar `'operador'` a `createSessionWire`.
    - _Requisitos: 1.1, 2.2, 3.1_

  - [x] 5.2 Crear `tests/sesion/cuentasDemo.test.ts`
    - Por cada una de las siete cuentas, en login: el `access_token` decodificado con `decodificarClaims` trae el `rol`, el `sub` y el `sesion_id` del catálogo.
    - Por cada cuenta, en refresh: el mismo `rol`, `sub` y `sesion_id`.
    - Ningún `sub` ni `sesion_id` se repite entre cuentas.
    - 401 con contraseña incorrecta, usuario desconocido, campos vacíos o ausentes, y cuerpo que no es JSON. Incluir un caso con el usuario en mayúsculas, que fija el supuesto de sensibilidad a mayúsculas del Requisito 1. Si ese supuesto cambia, se ajusta el caso.
    - Refresh con un token que no corresponde a ninguna cuenta: 401.
    - Usar el servidor MSW de las pruebas. Revisar `tests/setup.ts` y `tests/viajes/mswServer.ts` para seguir el patrón existente.
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1_

  - [x] 5.3 Probar el sujeto de conversaciones tras iniciar sesión
    - Crear `tests/conversaciones/sujetoSesion.test.ts`. Iniciar sesión como `monitorista` por el handler de `POST /sesion`. `sujetoConversacionesMock()` debe devolver `usr-demo-monitorista`.
    - _Requisitos: 2.1_

- [x] 6. Documentación
  - [x] 6.1 Actualizar `README.md`
    - En la línea 44, reemplazar la única credencial por una tabla con las siete cuentas (rol y usuario) y la contraseña común `demo1234`.
    - _Requisitos: 1.2_

  - [x] 6.2 Actualizar `.env.example`
    - En el comentario de la línea 30, listar las mismas siete cuentas que en 6.1.
    - _Requisitos: 1.2_

- [x] 7. Verificación de build (Requisito 4)
  - [x] 7.1 Confirmar qué comando generó el `dist/` actual
    - Evidencia disponible: `dist/assets/browser-eHn3TrBO.js` contiene `demo1234` y `operador@demo.ai27`, no hay archivos `.map` y no existe `.env.local` en el repo. Con eso no se sabe si el `dist` salió de `pnpm build` o de `pnpm build:mock`.
    - Antes de reconstruir, copiar `dist/` a una carpeta temporal fuera del repo. Si el comando no se puede determinar, el `dist` anterior no sirve como evidencia y el build nuevo decide.
    - _Requisitos: 4.2_

  - [x] 7.2 Confirmar que ningún archivo de entorno ni la shell activan los mocks
    - Revisar `.env`, `.env.local`, `.env.production` y `.env.production.local`. Hoy solo existen `.env.example` y `.env.mock`.
    - Confirmar que `VITE_ENABLE_MOCKS` no está definida en la sesión de PowerShell (`$env:VITE_ENABLE_MOCKS`).
    - _Requisitos: 4.1_

  - [x] 7.3 Control positivo de la búsqueda con `pnpm build:mock`
    - Correr `pnpm build:mock` y buscar en `dist/`, sin distinguir mayúsculas, `demo1234` y `@demo.ai27`. Ambas cadenas deben aparecer. Sin este control, la búsqueda negativa de 7.4 no demuestra nada.
    - Comando de referencia: `Get-ChildItem dist -Recurse -File | Select-String -SimpleMatch -Pattern 'demo1234','@demo.ai27'`.
    - _Requisitos: 4.2_

  - [x] 7.4 Build de producción sin credenciales demo
    - Correr `pnpm build` sin `VITE_ENABLE_MOCKS` y repetir la búsqueda de 7.3 sobre todo `dist/`, incluidos `.html`, `.css` y `.map` si existieran. Resultado esperado: cero coincidencias.
    - Si hay coincidencias, detenerse y reportarlas. La causa puede estar en el guard de `src/main.tsx`, que es una comparación en tiempo de ejecución, o en la falta de un `define` en `vite.config.ts`. No está verificado si Rollup elimina el import dinámico de `./mocks/browser` cuando la variable no está definida. Esta tarea no elige la solución; esa decisión se toma aparte.
    - Dejar `dist/` con el resultado de `pnpm build`.
    - _Requisitos: 4.1, 4.2_

- [x] 8. Verificación final
  - [x] 8.1 Correr `pnpm typecheck`
    - Debe terminar sin errores.
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2_

  - [x] 8.2 Correr `pnpm lint`
    - Debe terminar sin errores nuevos frente a la línea base de 1.1.
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2_

  - [x] 8.3 Correr `pnpm test`
    - Todas las pruebas de `tests/` deben pasar, incluidas las nuevas. Comparar con la línea base de 1.1.
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2_

  - [x] 8.4 Correr los e2e de login, roster y session-cut
    - Ejecutar `pnpm test:e2e` sobre `e2e/login.spec.ts`, `e2e/roster.spec.ts` y `e2e/session-cut.spec.ts`. Estos specs siguen usando `operador@demo.ai27` y no se modifican, salvo que fallen por algo de esta feature.
    - `playwright.config.ts` no se revisó en la planeación. Confirmar si arranca `pnpm dev:mock` por sí mismo. Si no, el usuario levanta ese servidor a mano antes de correr los e2e.
    - _Requisitos: 1.1, 1.2, 1.3_

- [x] 9. Checkpoint - Ensure all tests pass, ask the user if questions arise.
  - Confirmar que typecheck, lint, pruebas de `tests/` y e2e pasan. Preguntar al usuario si hay dudas antes de cerrar la feature.

## Notes

### Orden

- Las tareas 1 a 5 cambian código y pruebas. Las tareas 7 y 8 solo verifican el resultado.
- `src/mocks/data.ts` y `src/mocks/handlers.ts` se editan en pasos separados. Cada paso va en su propia ola del grafo para no escribir el mismo archivo en paralelo.
- No se usa PBT. El dominio son siete cuentas enumerables y el diseño no define propiedades de corrección.
- Ninguna tarea es opcional. Las pruebas de la tarea 5 son la evidencia de los Requisitos 1 a 3, y los ajustes de la tarea 5.1 son necesarios para que compile el tipado.

## Task Dependency Graph

Las olas agrupan solo las subtareas hoja. Una ola se ejecuta después de que terminen todas las anteriores. Dentro de una ola, las tareas escriben archivos distintos o solo leen.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "7.1", "7.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "6.1", "6.2"] },
    { "id": 3, "tasks": ["2.2", "4.1", "5.1"] },
    { "id": 4, "tasks": ["3.1", "4.2"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["7.3"] },
    { "id": 7, "tasks": ["7.4"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4"] }
  ]
}
```
