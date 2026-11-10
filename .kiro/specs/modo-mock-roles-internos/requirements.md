# Requirements Document

Modo mock con inicio de sesión por rol interno.

|                 |                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tipo**        | Feature                                                                                                                                                                                                  |
| **Flujo**       | Requirements-First. Fase 1 de 3 (requisitos). Diseño y tareas quedan pendientes de aprobar estos requisitos                                                                                              |
| **Repositorio** | `pf-web-frontend-internal`                                                                                                                                                                               |
| **Fuente**      | Tarjeta de Trello «Modo mock: iniciar sesión con cada rol interno» (Argos V1 - Sprint 5, lista En Progreso)                                                                                              |
| **Referencias** | DEC-045 y DEC-053 (roles V1); DEC-072 y DEC-083 (sujeto y `sesion_id`); DEC-031 #2 y DEC-091 (refresco); ADR 26 (repo de contexto `ai27-platform-context`); `src/mocks/data.ts`, `src/mocks/handlers.ts` |
| **Estado**      | Aprobado por el usuario en lo que respecta a preguntas abiertas. Pendiente de aprobación del diseño                                                                                                      |

## Introduction

El backend simulado (`src/mocks/`) solo acepta una credencial, la del Jefe Operativo, y todas las sesiones simuladas comparten el mismo `sub` y el mismo `sesion_id`. Para validar lo que ve y puede hacer cada rol interno sin depender del BFF real, el modo mock debe emitir una sesión distinta por cada rol.

Esta feature cubre solo el inicio de sesión simulado. No cambia el flujo de login real, los tipos de contrato ni la lógica de permisos de la app.

## Glossary

- **Rol interno**: uno de los siete roles de la audiencia interna: `jefe_operativo`, `monitorista`, `supervisor`, `coordinador`, `ejecutivo`, `reaccion` y `administrador`. Se usan los identificadores canónicos en snake_case.
- **Credencial demo**: par de usuario y contraseña que el mock acepta en `POST /sesion` para iniciar sesión como un rol interno. El usuario tiene la forma `<cuenta>@demo.ai27`.
- **Cuenta**: parte local del usuario de una credencial demo, es decir, lo que va antes de `@demo.ai27`. Por ejemplo, `operador` en `operador@demo.ai27`.
- **Sujeto (`sub`)**: claim del `access_token` que identifica a la persona de la sesión.
- **Identificador de sesión (`sesion_id`)**: claim del `access_token` que identifica la sesión. Es propio de AI27 y no cambia al renovar la sesión.
- **Modo mock**: ejecución con `VITE_ENABLE_MOCKS=true` (`pnpm dev:mock` o `pnpm build:mock`).

## Requirements

### Requisito 1: Una credencial demo por rol interno

**Historia de usuario:** Como equipo de Producto y QA, quiero iniciar sesión en el modo mock con cada uno de los siete roles internos, para validar lo que ve y puede hacer cada rol sin depender del BFF real.

#### Criterios de aceptación

1. CUANDO se envía a `POST /sesion` la credencial demo de uno de los siete roles internos, EL mock DEBERÁ responder 200 con un `access_token` cuyo claim `rol` es igual al identificador de ese rol.
2. EL mock DEBERÁ tener, para cada uno de los siete roles internos, la credencial demo `<cuenta>@demo.ai27` que se indica en la tabla de mapeo, y esa credencial DEBERÁ cumplir el criterio 1.
3. SI el usuario o la contraseña enviados a `POST /sesion` no coinciden con ninguna credencial demo, o si alguno de los dos está vacío o ausente, ENTONCES EL mock DEBERÁ responder 401 sin emitir `access_token`.

**Mapeo de roles a cuentas** (decisión 1):

| Rol              | Usuario de la credencial demo | Estado en el código    |
| ---------------- | ----------------------------- | ---------------------- |
| `jefe_operativo` | `operador@demo.ai27`          | Existe                 |
| `monitorista`    | `monitorista@demo.ai27`       | Por crear              |
| `supervisor`     | `supervisor@demo.ai27`        | Por crear              |
| `coordinador`    | `coordinador@demo.ai27`       | Por crear              |
| `ejecutivo`      | `ejecutivo@demo.ai27`         | Por crear              |
| `reaccion`       | `reaccion@demo.ai27`          | Por crear              |
| `administrador`  | `administrador@demo.ai27`     | Por crear (decisión 2) |

Decisión 6: la contraseña es `demo1234` en las siete cuentas.

Supuesto por confirmar: la coincidencia de usuario y contraseña distingue mayúsculas y minúsculas.

### Requisito 2: Sujeto y sesión propios por cuenta

**Historia de usuario:** Como equipo de QA, quiero que cada rol tenga su propio sujeto y su propia sesión, para distinguir quién actúa y quién reclama un caso.

#### Criterios de aceptación

1. CUANDO se inicia sesión con la credencial demo de un rol, EL mock DEBERÁ emitir el claim `sub` con el valor `usr-demo-<cuenta>`, donde `<cuenta>` es la parte local del usuario de esa credencial. Por ejemplo, `usr-demo-operador` para `jefe_operativo` y `usr-demo-monitorista` para `monitorista`.
2. CUANDO se inicia sesión con la credencial demo de un rol, EL mock DEBERÁ emitir el `sesion_id` con el valor `ses-demo-<cuenta>`. Por ejemplo, `ses-demo-operador` para `jefe_operativo`.
3. EL mock DEBERÁ emitir un `sub` y un `sesion_id` que no coincidan con los de ningún otro rol interno.

Alcance: los criterios aplican a los siete roles internos. `cliente` no tiene credencial demo en este spec (ver Fuera de alcance).

Impacto (decisión 4): `usr-demo-1` deja de emitirse. Los mocks que leen `DEMO_CLAIMS.sub`, como `SUJETO_CONVERSACIONES_DEMO`, deben seguir el `sub` de la cuenta activa y no un valor fijo. Si no lo hacen, los escenarios de conversaciones quedan atribuidos a un responsable que no inició sesión.

### Requisito 3: La renovación conserva el rol, el sujeto y la sesión

**Historia de usuario:** Como equipo de QA, quiero que al renovar la sesión siga el mismo rol, sujeto y sesión, para probar un flujo largo sin volver a iniciar sesión.

#### Criterios de aceptación

1. CUANDO se renueva una sesión demo mediante `POST /sesion/refresh`, EL mock DEBERÁ devolver un `access_token` con el mismo `rol`, el mismo `sub` y el mismo `sesion_id` que la sesión original, para cualquiera de los siete roles internos.

Fuentes del `sesion_id` estable (decisión 3): DEC-083 #1 y #3 (DECIDIDA en el repo de contexto), ADR 26 §1 y el criterio de prueba de integración de E4-T1 ("el `sesion_id` no cambia tras refrescar").

El rol se conserva porque la credencial no cambia. DEC-031 #2 y DEC-091 regulan el cambio de rol en el siguiente refresco; no aplican a este mock.

### Requisito 4: Las credenciales demo solo existen en modo mock

**Historia de usuario:** Como responsable de seguridad del build, quiero que las credenciales demo no salgan en producción, para que ningún usuario real pueda entrar con ellas.

#### Criterios de aceptación

1. MIENTRAS la variable `VITE_ENABLE_MOCKS` sea distinta de la cadena exacta `true` (incluido cuando no está definida), CUANDO se ejecuta `pnpm build`, EL build DEBERÁ excluir del bundle todas las credenciales demo y todos los handlers del backend simulado.
2. CUANDO se ejecuta `pnpm build` con `VITE_ENABLE_MOCKS` distinta de `true`, EL contenido completo de `dist/` NO DEBERÁ contener ninguna de las credenciales demo definidas en el módulo de mocks (contraseña y correos demo), verificado por una búsqueda de cada cadena, sin distinguir mayúsculas, en todos los archivos de `dist/` con cero coincidencias.

Nota: hoy `dist/assets/browser-*.js` contiene `demo1234` y `operador@demo.ai27`, y no se sabe qué comando generó ese `dist`. El criterio 2 queda como no verificado hasta confirmarlo.

## Decisiones tomadas

1. **Credenciales por cuenta.** Cada rol interno usa una credencial `<cuenta>@demo.ai27`, según el mapeo del Requisito 1. La sintaxis sigue la cuenta existente `operador@demo.ai27`. La contraseña es `demo1234` en las siete cuentas (decisión 6). Fuente: confirmación del usuario.
2. **`administrador@demo.ai27` debe existir.** La tarjeta lo indica como existente y el código no lo tiene, así que se crea en el mock. La discrepancia de la tabla de verificación queda resuelta en ese sentido. Fuente: decisión del usuario.
3. **El `sesion_id` no cambia al renovar la sesión.** Se conserva en `POST /sesion/refresh`, y el rol también se conserva. Fuentes: DEC-083 #1 y #3 (DECIDIDA en el repo de contexto), ADR 26 §1 y el criterio de E4-T1 sobre el `sesion_id`. Estas fuentes ya están registradas; no es un documento de trabajo sin DEC.
4. **Cada cuenta tiene su propio `sub`.** Se elimina `usr-demo-1`. El `sub` es `usr-demo-<cuenta>`. DEC-072 declara el `sub` como identificador opaco resuelto en servidor, así que el mock puede usar cualquier valor único por cuenta. Impacto: `SUJETO_CONVERSACIONES_DEMO` y los demás mocks que leen `DEMO_CLAIMS.sub` siguen el `sub` de la cuenta activa.
5. **Cada cuenta tiene su propio `sesion_id`.** El `sesion_id` es `ses-demo-<cuenta>`. Es único por rol y no cambia al renovar. Ver decisión 3.
6. **Contraseña demo única.** La contraseña de las siete cuentas demo es `demo1234`. Fuente: confirmación del usuario.
7. **Formatos de `sub` y `sesion_id` aceptados.** Se aceptan `usr-demo-<cuenta>` para el `sub` y `ses-demo-<cuenta>` para el `sesion_id`, como fijan las decisiones 4 y 5. Fuente: confirmación del usuario.

## Verificación de la tarjeta contra el código

| Afirmación de la tarjeta                               | Resultado                                                                                 | Evidencia                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existe la credencial `administrador@demo.ai27`         | **Discrepancia resuelta por decisión.** La credencial debe existir y se crea (decisión 2) | `src/` no la contiene. `POST /sesion` solo acepta `operador@demo.ai27` (`src/mocks/handlers.ts`). El README y `.env.example` tampoco la mencionan                             |
| Existe `rolDeCredenciales` en `src/mocks/data.ts`      | **No existe**                                                                             | Existe `DEMO_CREDENTIALS`, que tiene un solo operador. `createSessionWire()` no recibe rol. `mockAccessToken(rol)` sí recibe rol, y lo usan las pruebas de roster y catálogos |
| Todos los roles comparten `sub` y `sesion_id`          | Confirmado en el código actual. **Se corrige con el Requisito 2** (decisiones 4 y 5)      | `DEMO_CLAIMS` fija `usr-demo-1` y `ses-demo-1`                                                                                                                                |
| Renovar la sesión conserva el rol                      | **No se cumple hoy.** El Requisito 3 fija el criterio                                     | `POST /sesion/refresh` devuelve siempre `createSessionWire()`, es decir, rol `jefe_operativo`                                                                                 |
| Las credenciales no aparecen en el build de producción | **No verificado**                                                                         | La condición está en `main.tsx`, pero `dist/assets/browser-*.js` contiene `demo1234` y `operador@demo.ai27`. No se sabe qué comando generó ese `dist`                         |
| Los siete identificadores de rol son los canónicos     | Confirmado                                                                                | Aparecen en `navigationConfig.ts`, `useInitialRoute.ts` y `SessionTopbar.tsx`, y coinciden con el steering de producto                                                        |

## Preguntas abiertas

Sin preguntas abiertas.

## Fuera de alcance

- **Pendiente:** si Monitorista, Supervisor y Coordinador ven datos distintos en el mock. Hoy los viajes y el roster no dependen del rol. Este spec no lo define.
- Etiquetas visibles de cada rol (por ejemplo, «Jefe Operativo»). No se definen aquí.
- `.github/pull_request_template.md` menciona `cliente@demo.ai27`, que no existe en `src/mocks/`. Corresponde al rol cliente, así que queda fuera. Se anota para una revisión aparte.
