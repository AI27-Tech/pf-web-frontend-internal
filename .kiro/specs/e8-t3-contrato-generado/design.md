# Diseño — E8-T3 Consumo del contrato generado

## Problema

Los dos portales inventaron el contrato de sesión por su cuenta, y lo hicieron de forma mutuamente incompatible. El contrato real (`pf-pkg-contracts` tracer.11) ya resuelve la forma exacta, y además publica un paquete TS (`@ai27-tech/contracts`) con los tipos y el enum de roles generados. La tarea es de sustitución: cablear el consumo real y retirar lo escrito a mano, no inventar nada nuevo salvo donde el contrato tiene una brecha genuina (claims del JWT, R5).

## Decisiones de diseño

### 1. Dependencia y resolución del paquete

Se agrega `@ai27-tech/contracts` (no `pf-pkg-contracts`, que no es un paquete publicado) en `0.1.0-tracer.11` exacta, en `dependencies` de los dos portales. Mismo mecanismo de autenticación que `@ai27-tech/ui` ya usa hoy en ambos repos: `~/.npmrc` del desarrollador en local, `setup-node` con `registry-url`/`scope` + `NODE_AUTH_TOKEN` en CI (ya configurado en `ci.yml` de los dos repos — no hace falta tocar los workflows).

Dado que el paquete usa subrutas (`./roles`, `./openapi/bff`, `./estados`), los imports relevantes para esta tarea son:

```ts
import { Rol, ROLES, esRol, esInterno } from '@ai27-tech/contracts/roles';
import type { components } from '@ai27-tech/contracts/openapi/bff';

type Sesion = components['schemas']['Sesion'];
type CredencialesEntrada = components['schemas']['CredencialesEntrada'];
type RefrescoEntrada = components['schemas']['RefrescoEntrada'];
```

(Los tipos generados por `openapi-typescript` quedan bajo `components['schemas'][...]`, verificado leyendo `packages/api-client-ts/src/openapi/bff.gen.ts`.)

### 2. Retiro de la generación local (R2) — alternativa a la historia original

La historia técnica (`E8-panel-admin.md`) pide crear/desbloquear `gen-contracts.mjs` con `CONTRACTS_DIR`. Eso tenía sentido cuando `pf-pkg-contracts` no publicaba artefactos y la única forma de obtener tipos era generar localmente desde un checkout del backend. Ahora que el paquete TS ya viene compilado y versionado, mantener ese script sería generar una segunda copia de los mismos tipos — exactamente la "autoridad paralela" que ADR 25 prohíbe.

**Se opta por retirar** `scripts/gen-contracts.mjs`, el script `gen:contracts` y `openapi-typescript` de devDependencies, en los dos portales. Esta es una desviación del texto literal de la historia; se señala en `requirements.md` R2 para que el equipo la confirme antes de ejecutar. Si el equipo prefiere conservarlo (p. ej. como herramienta de verificación de que el paquete instalado coincide con una fuente OpenAPI de referencia), es un cambio de una tarea, no de este diseño completo.

### 3. Barrel de cada portal: puente, no reescritura de la app

Los dos portales ya fuerzan un único punto de entrada (`lib/contracts/index.ts`, con `no-restricted-imports` en `client` y la misma convención en `internal`). Se conserva ese patrón: el barrel pasa a reexportar los tipos generados en vez de los locales, así el cambio es local a `lib/` y no toca `features/`, `routes/` ni los componentes.

```
internal/src/lib/contracts/
├── sesion.ts      # dejó de declarar tipos de wire; ahora re-tipa Sesion/Usuario de la app
│                    a partir de los tipos generados + claims del JWT (ver §4)
├── jwt.ts          # NUEVO — decodificación de claims, aislado (R5)
└── index.ts        # barrel: reexporta desde @ai27-tech/contracts + lo de sesion.ts/jwt.ts

client/src/lib/contracts/
├── index.ts         # sin cambios de forma (sigue reexportando dominio.ts, etc. — fuera de alcance)
# el tipo de sesión vive en lib/api/sesion.ts, no en lib/contracts/ (ver más abajo)
```

`client` no tiene su tipo de sesión en el barrel de `contracts/` hoy — vive junto al wrapper HTTP en `lib/api/sesion.ts`. Se mantiene esa ubicación (no se le agrega al barrel de `contracts/` sin que lo pida otra tarea): el cambio ahí es sustituir los tipos locales `SesionWire`/`SesionEmitida` por el tipo generado, dentro del mismo archivo.

### 4. Rol y Audiencia desde los claims del JWT (R5) — la pieza nueva real

Esto es lo único de esta tarea que no es sustitución mecánica, porque el contrato HTTP no modela el JWT. Diseño:

```ts
// internal/src/lib/contracts/jwt.ts
import { esRol, type Rol } from '@ai27-tech/contracts/roles';

/**
 * Claims que el IdP on-premise firma, según la prosa de
 * docs/arquitectura/services/identidad.md (h), (secciones de autorización).
 * NO hay esquema generado para el JWT: es una brecha contractual.
 * TODO(contracts): confirmar nombres exactos contra un token real emitido
 * por el mapper del IdP (ADR 32 §4) cuando E4-T1 lo tenga implementado.
 */
interface ClaimsAi27 {
  readonly sub: string; // sujeto, estándar JWT
  readonly tenant_id?: string; // supuesto: no confirmado contra el IdP real
  readonly rol: string; // se valida con esRol() antes de confiar
  readonly sesion_id: string; // coincide con Sesion.sesion_id del body
}

export function decodificarClaims(accessToken: string): ClaimsAi27 | null {
  /* base64url + JSON.parse, try/catch */
}

export function rolValido(claims: ClaimsAi27): Rol | null {
  return esRol(claims.rol) ? claims.rol : null;
}

/** DEC-054: mapeo fijo, no viaja como claim propio. */
export function audienciaDeRol(rol: Rol): 'Cliente' | 'Interno' {
  return rol === 'cliente' ? 'Cliente' : 'Interno';
}
```

Sin librería nueva: decodificar la parte `payload` de un JWT es `JSON.parse(atob(token.split('.')[1]))` con el ajuste base64url→base64 estándar. Si al implementar resulta más frágil de lo esperado (padding, caracteres `-`/`_`), se evalúa una dependencia mínima (p. ej. `jwt-decode`, fijada a versión exacta) — decisión de implementación, no de este diseño.

`SessionContext.tsx` cambia su derivación de `usuario`: en vez de `sesion?.usuario`, decodifica claims del `accessToken` vigente. Si los claims no traen un rol válido, la sesión se trata como inválida (se cierra) — no se renderiza con un rol a medias. Esto se implementa en el mismo punto donde hoy se parsea la respuesta de login/refresh.

### 5. `sesion_id` se preserva de punta a punta

El modelo de sesión de la app (en ambos portales, donde exista) agrega el campo `sesionId` (camelCase) poblado desde `wire.sesion_id`. No se consume en esta tarea (eso es `E8-T6`/`E0-T4`), solo se conserva para no perderlo dos veces.

### 6. Mocks (R6)

`internal/src/mocks/data.ts`: `createSessionWire` pasa de devolver `{access_token, refresh_token, expires_in, usuario}` a `{sesion_id, access_token, refresh_token, expira_en}`, con el `access_token` mock codificando un payload JSON válido en base64url (header + payload + firma falsa) para que `decodificarClaims` tenga algo real que decodificar en modo mock.

`client/src/mocks/handlers.ts`: las respuestas de `/sesion` y `/sesion/refresh` agregan `sesion_id` (UUID de mentira) y quitan `requiere_segundo_factor`.

### 7. Orden de implementación

1. **`client`**: corregir el nombre de paquete mal escrito que quedó pendiente de la sesión anterior (`@ai27-tech/pf-pkg-contracts` → `@ai27-tech/contracts`), antes de que ese error se propague a un commit.
2. Agregar la dependencia correcta en los dos portales; `pnpm install` en los dos; confirmar que resuelve.
3. Retirar `gen-contracts.mjs`, el script `gen:contracts`, `openapi-typescript` de devDependencies, y `CONTRACTS_DIR` de `.env.example`, en los dos portales (R2).
4. `internal`: crear `jwt.ts`; reescribir `sesion.ts` para consumir `Sesion`/`CredencialesEntrada`/`RefrescoEntrada` generados y derivar `Usuario`/`rol` de los claims; actualizar barrel.
5. `client`: reescribir `lib/api/sesion.ts` para consumir los tipos generados, quitando `SesionWire`/`SesionEmitida` locales y `requiere_segundo_factor`.
6. Actualizar mocks en los dos portales (R6).
7. Buscar y limpiar cualquier otro sitio que leyera `sesion.usuario.rol` (internal) o `requiereSegundoFactor` (client) fuera de los archivos ya tocados.
8. `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` (modo mock) en los dos portales.
9. Búsquedas de verificación de R1/R4/R7 (sin `CONTRACTS_DIR`, sin `RolInterno`, sin `interface SesionWire`).

## Riesgos

- **Los claims del JWT son una suposición de nombre, no un contrato verificado.** Si el IdP real (Keycloak, ADR 32) usa otros nombres de claim, `jwt.ts` es el único archivo a corregir — diseño aislado a propósito. Se deja el `TODO(contracts)` citado en el código.
- **El checkout local de `pf-pkg-contracts` no está en el tag `v0.1.0-tracer.11`** (está en una rama feature de otra ola de trabajo). Se verificó que para los archivos que esta tarea toca (sesión, roles, `_comunes.yaml`) no hay diferencia entre `HEAD` y el tag, pero si alguien re-ejecuta la verificación más adelante y encuentra diferencia, debe usar `git show v0.1.0-tracer.11:<ruta>` para leer el contrato que realmente aplica, no el checkout de trabajo.
- **Retirar `gen-contracts.mjs` es una decisión que se desvía del texto de la historia técnica.** Si el equipo la rechaza, la tarea 3 del plan de ejecución (abajo) se reemplaza por "apuntar `gen-contracts.mjs` a un modo de verificación contra el paquete instalado" en vez de eliminarlo — cambio acotado.
- **`internal` pierde el objeto `usuario.name`/`email` del cuerpo de sesión.** El contrato no los devuelve en ningún lado (ni body ni, previsiblemente, claims — un correo en un claim de autorización sería inusual). Si una pantalla futura necesita mostrar el nombre del operador, esa búsqueda queda pendiente para quien la construya (probablemente `catalogos` o un endpoint de perfil que hoy no existe) — se anota como hallazgo, no se resuelve aquí.
