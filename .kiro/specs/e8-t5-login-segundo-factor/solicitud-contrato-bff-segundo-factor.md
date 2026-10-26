# Solicitud de contrato — proyectar `segundo_factor` al login del `bff`

**Para:** encargado de `pf-pkg-contracts`
**De:** frontend interno (`pf-web-frontend-internal`)
**Tarea que lo necesita:** E8-T5 "Login y segundo factor (interno)" (`E4-HU-017`)
**Fecha:** 2026-10-26
**Tipo:** solicitud de cambio de contrato (no es cambio de código de servidor)

---

## 1. Qué pido, en una línea

Agregar el campo **`segundo_factor`** al esquema `CredencialesEntrada` del contrato del **`bff`**, proyectándolo tal como ya existe en el contrato de **`identidad`**, para que el portal pueda transportar el código TOTP en el login.

## 2. Dónde se cierra (archivo exacto)

Todo el cambio es **un solo archivo**, en el repo de contratos:

```
pf-pkg-contracts/contracts/openapi/bff.yaml
```

La forma a copiar ya está escrita y validada en el mismo repo, en:

```
pf-pkg-contracts/contracts/openapi/identidad.yaml   →  components.schemas.CredencialesEntrada.segundo_factor
```

Es una **proyección**: mismo campo, mismo tipo, misma semántica que `identidad`, expuesto ahora por la puerta del `bff`. No pido inventar nada nuevo.

## 3. Por qué (contexto en dos frases)

El frontend consume **solo** el contrato del `bff` (regla de puerta única); no puede llamar a `identidad` directamente. El canal del segundo factor ya está decidido (TOTP nativo de Keycloak, DEC-031 enmendada por DEC-071) y el campo ya existe en `identidad`, pero no está proyectado al `bff`, así que el portal no tiene por dónde enviar el código.

## 4. Estado verificado (para que no haya duda)

Contrastado el 2026-10-26 contra el tag publicado `v0.1.0-tracer.18` (el que instala el frontend: `@ai27-tech/contracts@0.1.0-tracer.18`):

- **En `identidad.yaml`: SÍ existe** → `CredencialesEntrada.segundo_factor` (`type: string`, `nullable: true`, descrito como TOTP opcional en V1 / requerido en V2+, validado por Keycloak).
- **En `bff.yaml`: NO existe** → `CredencialesEntrada` tiene `additionalProperties: false` y solo `usuario` (requerido) y `contrasena` (requerido). El `additionalProperties: false` impide, además, colar el campo por tolerancia del esquema: sin cambio de contrato el campo ni siquiera se puede enviar.

Comando con que lo comprobé:

```
git show v0.1.0-tracer.18:contracts/openapi/bff.yaml | Select-String "segundo_factor|CredencialesEntrada"
```

## 5. Campo a agregar en `bff.yaml`

En `components.schemas.CredencialesEntrada`, agregar la propiedad (espejo de `identidad`):

```yaml
CredencialesEntrada:
  type: object
  additionalProperties: false
  required: [usuario, contrasena]
  properties:
    usuario: { type: string }
    contrasena:
      type: string
      format: password
    segundo_factor: # <-- lo que falta
      type: string
      nullable: true
      description: >-
        Codigo del segundo factor (TOTP). Opcional en V1; requerido en V2+.
        El IdP (Keycloak) lo valida; el bff/identidad solo lo transporta.
        Ver DEC-031 (ADR 13) y DEC-071.
```

Semántica a respetar (ya definida en `identidad` / DEC-031 / DEC-071):

- El campo es **opcional en V1**: el portal lo envía solo cuando el usuario captura un codigo.
- El IdP genera, despacha y valida el TOTP; el `bff` **solo lo transporta**. No se pide logica nueva de servidor, solo exponer el campo en la superficie publica.

## 6. Una cosa más que necesito que el contrato fije (para el Requisito 2.5)

Hoy el login devuelve `401` tanto para credenciales inválidas como para un segundo factor inválido, y el portal colapsa todo `401` al mismo mensaje genérico de credenciales. Para poder mostrar un mensaje **distinto** de "código de segundo factor inválido" (Req 2.5 de E8-T5), necesito un valor estable en `Error.codigo` que diferencie el fallo de TOTP del fallo de credenciales.

Díganme el `codigo` que usarán (p. ej. algo como `segundo_factor_invalido`), para clasificarlo en el frontend. **Esto es secundario**: con solo el campo del punto 5 ya puedo capturar y enviar el TOTP; el `codigo` diferenciado solo desbloquea el mensaje específico de error.

## 7. Fuera de alcance de esta solicitud

- Cualquier endpoint de verificación de segundo factor en dos pasos: **no** se pide. El contrato de `identidad` ya resuelve el segundo factor como un campo del mismo login (una sola llamada), y así lo quiero en el `bff`.
- Cambios en `refresh` o `logout`: no se tocan.

## 8. Cómo compruebo que quedó cerrada

Cuando publiquen el tracer con el cambio, lo valido así:

```
git show <nuevo-tag>:contracts/openapi/bff.yaml | Select-String "segundo_factor"
```

Debe aparecer `segundo_factor` dentro de `CredencialesEntrada` del `bff`. Entonces subo la versión de `@ai27-tech/contracts` en el frontend, el tipo `CredencialesEntrada` se regenera con el campo, y desbloqueo las tareas B1-B4 del spec (captura, envío y mensaje de error del segundo factor). Es un reemplazo mecánico.

## 9. Trazabilidad

- Spec: `pf-web-frontend-internal/.kiro/specs/e8-t5-login-segundo-factor/` (ver seccion "Brechas de contrato y trabajo bloqueado" del `design.md` y tareas B1-B4 del `tasks.md`).
- Historia técnica: `E8-T5` en `docs/historias-tecnicas/E8-panel-admin.md`. HU: `E4-HU-017`.
- Decisiones: DEC-031 (cierre de ADR 13, entrega de OTP delegada al IdP), DEC-071 (segundo factor por TOTP nativo de Keycloak en V1).
- Contrato de referencia ya correcto: `identidad.yaml` en `v0.1.0-tracer.18`.
