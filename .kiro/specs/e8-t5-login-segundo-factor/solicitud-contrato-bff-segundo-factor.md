# Registro de brecha — código de error del Segundo_Factor

**Para:** `pf-pkg-contracts`
**De:** `pf-web-frontend-internal`
**Tarea:** E8-T5 — Login y segundo factor (`E4-HU-017`)
**Fecha:** 2026-10-26
**Estado:** brecha externa pendiente de Identidad/Seguridad

---

## 1. Resultado de la revisión contractual

El campo ya está resuelto en `@ai27-tech/contracts@0.1.0-tracer.20`:

```text
bff.CredencialesEntrada.segundo_factor?: string | null
```

El campo es opcional y se transporta en el mismo `POST /api/v1/sesion`. No se requiere otro cambio para la forma de entrada.

Contratos no debe publicar todavía un código como `segundo_factor_invalido`, porque el servidor no puede emitirlo de forma fiable.

## 2. Brecha real

Según la verificación de `pf-svc-identidad` comunicada por el dueño del BFF:

- Keycloak responde `invalid_grant` tanto para credenciales inválidas como para OTP inválido cuando se usa el grant directo ROPC.
- Identidad clasifica todos esos casos como `ErrCredencialInvalida`.
- No existe actualmente un error centinela que distinga el rechazo del Segundo_Factor.
- El código de Identidad ya deja anotado este pendiente como A-14/A-3.

Por lo tanto, fijar ahora un valor contractual para TOTP inválido prometería un código que el runtime no produce.

## 3. Decisión temporal para E8-T5

Mientras Identidad no pueda distinguir el motivo del `invalid_grant`:

- el frontend conserva el mensaje genérico de credenciales para cualquier `401` de login;
- no se inventa ni se simula un `Error.codigo` de TOTP inválido;
- el requisito de un mensaje específico para Segundo_Factor queda documentado como diferido;
- el campo `segundo_factor` sí se captura y se envía cuando el usuario proporciona un código.

## 4. Desbloqueo futuro

La brecha se cierra cuando Identidad/Seguridad:

1. distingue el rechazo de OTP del rechazo de credenciales;
2. emite un código estable para el rechazo de OTP;
3. publica ese comportamiento en el contrato del login del `bff`.

En ese momento, contratos deberá documentar el código real en `Error.codigo` y publicar un nuevo tracer. El frontend podrá entonces conservarlo al clasificar el `401` y mostrar un mensaje específico.

## 5. Fuera de alcance de este documento

- No se solicita crear un endpoint adicional.
- No se solicita modificar la política de TOTP, reintentos o bloqueo.
- No se solicita implementar código en `pf-svc-bff`.
- La propagación de `SegundoFactor` desde el BFF hacia Identidad es una responsabilidad separada del repositorio `pf-svc-bff`.

## 6. Estado del frontend

El frontend implementa lo que el contrato actual permite:

- captura opcional de Segundo_Factor con `@ai27-tech/ui`;
- omisión del campo cuando está vacío;
- envío en el mismo `POST /sesion` cuando tiene valor;
- pruebas unitarias y e2e de captura y transporte;
- mensaje genérico ante `401`, sin inventar una causa específica.

## 7. Trazabilidad

- Spec: `pf-web-frontend-internal/.kiro/specs/e8-t5-login-segundo-factor/`
- Contrato del campo: `bff.yaml` en `v0.1.0-tracer.20`
- Brecha pendiente: A-14/A-3 en Identidad/Seguridad
- Decisiones: DEC-031 y DEC-071
