# Tareas — E8-T3 Consumo del contrato generado

> Tarea compartida entre `pf-web-frontend-internal` y `pf-web-frontend-client`. Cada checkbox indica a qué repo(s) aplica.

- [ ] 0. Confirmar con el equipo las dos desviaciones señaladas en `requirements.md`/`design.md` antes de ejecutar
  - R2: retirar `scripts/gen-contracts.mjs` en vez de completarlo (la historia original lo pedía construir/desbloquear)
  - Alcance reducido: no se tocan los tipos de dominio de `viaje` en `client` (se defiere a E8-T7/E9-T3)
  - _Requisitos: R2; "Alcance de este spec"_

- [ ] 1. [client] Corregir la dependencia mal escrita de la sesión anterior
  - `package.json` tiene sin commit `"@ai27-tech/pf-pkg-contracts": "0.1.0-tracer.11"` — nombre de paquete incorrecto
  - Reemplazar por `"@ai27-tech/contracts": "0.1.0-tracer.11"`
  - _Requisitos: R1_

- [ ] 2. [internal] Agregar la dependencia correcta
  - `package.json`: agregar `"@ai27-tech/contracts": "0.1.0-tracer.11"` en `dependencies`
  - _Requisitos: R1_

- [ ] 3. [internal, client] Instalar y verificar resolución
  - `pnpm install` en los dos repos
  - Confirmar que `@ai27-tech/contracts` resuelve (local: `~/.npmrc` del desarrollador; mismo mecanismo que `@ai27-tech/ui`)
  - _Requisitos: R1_

- [ ] 4. [internal, client] Retirar el mecanismo de generación local
  - Eliminar `client/scripts/gen-contracts.mjs`
  - Eliminar el script `gen:contracts` de `package.json` en los dos repos
  - Eliminar `openapi-typescript` de `devDependencies` en los dos repos
  - Eliminar la variable `CONTRACTS_DIR` de `.env.example` en los dos repos
  - _Requisitos: R2_

- [ ] 5. [internal] Crear la decodificación de claims del JWT
  - Nuevo archivo `src/lib/contracts/jwt.ts`: `ClaimsAi27`, `decodificarClaims`, `rolValido`, `audienciaDeRol`
  - Usa `esRol` de `@ai27-tech/contracts/roles` para validar; sin librería externa nueva salvo que el decode base64url resulte más frágil de lo esperado (si se agrega una, versión exacta y justificación)
  - `TODO(contracts)` citando la brecha: nombres de claim no confirmados contra el IdP real
  - _Requisitos: R5_

- [ ] 6. [internal] Reescribir `src/lib/contracts/sesion.ts`
  - Retirar `SesionWire`, `CredentialsWire`, `UsuarioWire`, `RolInterno` escritos a mano
  - Tipar `Sesion`/`CredencialesEntrada`/`RefrescoEntrada` desde `components['schemas']` de `@ai27-tech/contracts/openapi/bff`
  - El modelo de sesión de la app (`Sesion` de la app, distinto del tipo generado) incluye `sesionId` (de `wire.sesion_id`) y deriva `usuario`/`rol` de `decodificarClaims(wire.access_token)` en vez de `wire.usuario`
  - Si los claims no traen un rol válido (`rolValido` devuelve `null`), tratar como sesión inválida — documentar la decisión en el código
  - _Requisitos: R3, R4, R5_

- [ ] 7. [internal] Actualizar el barrel `src/lib/contracts/index.ts`
  - Reexportar lo nuevo de `sesion.ts` y `jwt.ts`
  - Confirmar que sigue siendo el único punto de entrada para el resto de la app
  - _Requisitos: R3, R7_

- [ ] 8. [internal] Actualizar `src/lib/api/sesion.ts` si referencia los tipos retirados
  - Revisar que `iniciarSesion`/`refrescarSesion`/`cerrarSesion` sigan compilando con los tipos nuevos
  - El body de login pasa a `{usuario, contrasena}` (ya era así en `CredentialsWire` local — confirmar que el campo se llama igual en el generado, o ajustar el nombre en la llamada)
  - _Requisitos: R3_

- [ ] 9. [client] Reescribir `src/lib/api/sesion.ts`
  - Retirar `SesionWire`/`SesionEmitida` locales con `requiere_segundo_factor`
  - Tipar desde `components['schemas']['Sesion']` de `@ai27-tech/contracts/openapi/bff`
  - `SesionEmitida` (modelo de la app) agrega `sesionId`; quita `requiereSegundoFactor`
  - Ajustar `login`/`refresh` para el body/response reales (`{usuario, contrasena}` en vez de lo que haya hoy)
  - _Requisitos: R3, R7_

- [ ] 10. [internal] Actualizar mocks
  - `src/mocks/data.ts`: `createSessionWire` devuelve la forma real (`sesion_id`, sin `usuario` anidado); el `access_token` mock lleva un payload JSON codificado en base64url con claims decodificables (rol, sesion_id, y lo que `jwt.ts` espere)
  - _Requisitos: R6_

- [ ] 11. [client] Actualizar mocks
  - `src/mocks/handlers.ts`: respuestas de `/sesion` y `/sesion/refresh` agregan `sesion_id`, quitan `requiere_segundo_factor`
  - _Requisitos: R6_

- [ ] 12. [internal, client] Buscar y limpiar consumidores residuales
  - `grep` por `.usuario.rol`, `wire.usuario`, `requiereSegundoFactor`, `requiere_segundo_factor` en `src/` de los dos repos
  - Ajustar cualquier sitio (componentes, `SessionContext.tsx`, pruebas) que siga leyendo la forma vieja
  - _Requisitos: R3, R5, R7_

- [ ] 13. [internal, client] Verificación de build y pruebas
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:mock` en los dos repos
  - `pnpm test:e2e` sobre el bundle mock en los dos repos
  - _Requisitos: todos_

- [ ] 14. [internal, client] Búsquedas de verificación final (criterios de aceptación literales)
  - Sin `CONTRACTS_DIR` en ningún archivo de ninguno de los dos repos
  - Sin `interface SesionWire`, `interface CredentialsWire`, `type RolInterno` en `src/` de ninguno de los dos
  - Sin `'operador'` ni `'auditor'` como literal de rol en `src/` de `internal`
  - _Requisitos: R1, R4, R7_

- [ ] 15. Abrir PR en cada repo hacia su rama `-d`
  - **Pendiente: requiere push, que no se hace sin autorización del usuario**
  - Describir en la PR las dos desviaciones de la tarea 0 y la brecha de claims de la tarea 5
  - _Requisitos: —_
