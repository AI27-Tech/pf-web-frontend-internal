# Requirements Document

## Introduction

E8-T5 cubre el inicio de sesión del **Portal Interno** de AI27 (`pf-web-frontend-internal`) para los usuarios internos de operación, incluyendo el soporte del **segundo factor** de autenticación. Satisface la HU **E4-HU-017** y tiene alcance exclusivamente interno.

El alcance de esta tarea está acotado. El portal **no** implementa la política de autenticación: la emisión de credenciales, la validación del segundo factor, la política de reintentos y la política de bloqueo residen en el **Proveedor_De_Identidad** (Keycloak). El portal captura las credenciales, transporta lo que el IdP exige, concede la sesión que el backend emite y comunica los estados de error de forma clara y sin filtrar información sensible.

El segundo factor en V1 es **TOTP nativo de Keycloak** (DEC-031 enmendada por DEC-071): el IdP genera, despacha y valida el código TOTP. El portal **no** construye un tramo propio de OTP ni un endpoint de verificación. El canal del segundo factor está decidido, pero su transporte desde el portal depende de que el contrato del bff exponga el campo correspondiente (ver "Brecha de contrato").

No hay desfase de contrato: el frontend consume `@ai27-tech/contracts 0.1.0-tracer.20`, que contiene `CredencialesEntrada.segundo_factor` y coincide con el tracer adoptado por el frontend.

### Contrato de referencia

El Portal_Interno consume la superficie **pública** del **bff**, importando los tipos desde `@ai27-tech/contracts/openapi/bff`. Las operaciones de sesión del bff están en **singular**. Operaciones consumidas del contrato `bff.yaml` @ `v0.1.0-tracer.20`:

- **Inicio de sesión:** `POST /api/v1/sesion`. Cuerpo `CredencialesEntrada` = { `usuario` (string, requerido), `contrasena` (string password, requerido), `segundo_factor` (string nullable, opcional) }. Éxito `201` con `Sesion` = { `sesion_id`, `access_token`, `refresh_token` (cuando aplica), `expira_en` }. Credenciales inválidas `401`. Solicitud inválida `400`.
- **Refresco:** `POST /api/v1/sesion/refresh` con `{ refresh_token }`; reevalúa claims desde el modelo de autorización vigente (ADR 16 / DEC-031 #2).
- **Revocación / cierre de sesión:** `DELETE /api/v1/sesion`.

La superficie interna **plural** de `identidad` (`/api/v1/sesiones`) es otra cosa: una colección administrable de sesiones que el Portal_Interno **no** consume. El frontend interno únicamente consume la superficie pública singular del bff.

### Brecha externa

El contrato público del bff ya expone `CredencialesEntrada.segundo_factor` desde `v0.1.0-tracer.20`. El frontend puede capturarlo y enviarlo de forma opcional en el mismo login.

Permanece una brecha externa para el mensaje específico de TOTP inválido: Keycloak e Identidad actualmente colapsan el rechazo de OTP y el rechazo de credenciales en el mismo `invalid_grant`/`401`. Hasta que Identidad publique una distinción estable, el portal conserva el Mensaje_Generico_Credenciales y no inventa un `Error.codigo`.

## Glossary

- **Portal_Interno**: Aplicación web `pf-web-frontend-internal` que usan los usuarios internos de operación de AI27.
- **Usuario_Interno**: Persona con rol interno (p. ej. jefe operativo, monitorista, supervisor, coordinador, ejecutivo, reacción, administrador) que inicia sesión en el Portal_Interno.
- **Proveedor_De_Identidad**: Servicio de identidad externo (Keycloak), también referido como **IdP**, responsable de validar credenciales y segundo factor, y de la política de autenticación.
- **Segundo_Factor**: Código TOTP generado, despachado y validado por el Proveedor_De_Identidad (DEC-031 / DEC-071). El contrato público del bff ya permite transportarlo en `CredencialesEntrada`; la distinción de un código inválido frente a credenciales inválidas permanece pendiente de Identidad.
- **Sesion**: Resultado de un inicio de sesión exitoso devuelto por el bff, correspondiente al schema `Sesion` de `bff.yaml`, compuesto por `sesion_id`, `access_token`, `refresh_token` (cuando aplica) y `expira_en`.
- **Mensaje_Generico_Credenciales**: Mensaje único e indistinto mostrado ante un fallo de credenciales, idéntico para un usuario existente y uno inexistente, que no revela la existencia de la cuenta.
- **Libreria_UI**: Paquete `@ai27-tech/ui` (instalado en `0.2.0-beta.6`), fuente única de componentes de interfaz (Button, Input, Checkbox, FormField, Form, Card, Toast, entre otros).

## Requirements

### Requirement 1: Inicio de sesión con credenciales

**User Story:** Como Usuario_Interno, quiero iniciar sesión con mi usuario y contraseña, para acceder a las funciones del Portal_Interno.

#### Acceptance Criteria

1. WHEN el Usuario_Interno envía el formulario de inicio de sesión con usuario y contraseña, THE Portal_Interno SHALL enviar una petición `POST /api/v1/sesion` con los campos `usuario` y `contrasena`.
2. IF el campo de usuario o el campo de contraseña está vacío al enviar, THEN THE Portal_Interno SHALL impedir el envío de la petición y mostrar un mensaje de validación local que indique el campo requerido.
3. WHEN el Proveedor_De_Identidad acepta las credenciales y responde `201`, THE Portal_Interno SHALL conceder la Sesion al Usuario_Interno.
4. IF el Proveedor_De_Identidad rechaza las credenciales con respuesta `401`, THEN THE Portal_Interno SHALL mostrar el Mensaje_Generico_Credenciales.
5. THE Portal_Interno SHALL mostrar el Mensaje_Generico_Credenciales de forma idéntica para un usuario existente y para un usuario inexistente.
6. WHEN el inicio de sesión es exitoso, THE Portal_Interno SHALL redirigir al destino indicado en el parámetro `redirect` de la URL, o a la página principal cuando el parámetro `redirect` está ausente.

### Requirement 2: Segundo factor de autenticación (TOTP vía IdP) — mensaje específico condicionado por brecha externa

**User Story:** Como Usuario_Interno cuya cuenta exige segundo factor, quiero proporcionar mi código de Segundo_Factor durante el inicio de sesión, para completar la autenticación cuando el Proveedor_De_Identidad lo requiere.

El contrato público del bff ya expone `segundo_factor` en `CredencialesEntrada`. El Portal_Interno puede capturar y transportar el código en el mismo login. La distinción de un Segundo_Factor inválido frente a credenciales inválidas queda condicionada a una capacidad externa de Identidad, porque hoy ambos casos llegan como el mismo `401`.

#### Acceptance Criteria

1. WHILE Identidad no expone un código estable que distinga un Segundo_Factor inválido, THE Portal_Interno SHALL conservar el Mensaje_Generico_Credenciales ante cualquier `401` y no inventar una causa específica.
2. WHERE el contrato del bff expone el campo `segundo_factor` en `CredencialesEntrada`, THE Portal_Interno SHALL permitir al Usuario_Interno capturar el código de Segundo_Factor mediante un componente de la Libreria_UI y transportarlo en el campo `segundo_factor` de la petición `POST /api/v1/sesion`.
3. WHERE el contrato del bff expone el campo `segundo_factor` en `CredencialesEntrada`, THE Portal_Interno SHALL tratar el campo `segundo_factor` como opcional, enviándolo solo cuando el Usuario_Interno proporciona un código.
4. THE Portal_Interno SHALL delegar en el Proveedor_De_Identidad la generación, el despacho y la validación del código de Segundo_Factor.
5. THE Portal_Interno SHALL delegar en el Proveedor_De_Identidad la política de reintentos del Segundo_Factor.
6. WHERE Identidad y el contrato del bff publiquen un código estable para el Segundo_Factor inválido, IF el Proveedor_De_Identidad rechaza el inicio de sesión por ese motivo con respuesta `401`, THEN THE Portal_Interno SHALL mostrar un mensaje que indique que el código de Segundo_Factor es inválido.
7. WHERE el contrato del bff expone el campo `segundo_factor` en `CredencialesEntrada`, IF el Proveedor_De_Identidad no está disponible durante un inicio de sesión que requiere Segundo_Factor, THEN THE Portal_Interno SHALL aplicar el comportamiento de indisponibilidad del Proveedor_De_Identidad definido en el Requirement 4.

### Requirement 3: Concesión de sesión y persistencia del token

**User Story:** Como Usuario_Interno, quiero que mi sesión se conserve tras iniciar sesión, para mantener mi acceso y mi contexto de rol y organización mientras uso el Portal_Interno.

#### Acceptance Criteria

1. WHEN el Proveedor_De_Identidad emite una Sesion, THE Portal_Interno SHALL persistir el `access_token` y el `refresh_token` recibidos.
2. THE Portal_Interno SHALL determinar el rol y la organización del Usuario_Interno a partir de los claims de la Sesion emitida.
3. WHEN el `access_token` vigente está por expirar según `expira_en`, THE Portal_Interno SHALL solicitar un refresco mediante `POST /api/v1/sesion/refresh` con el `refresh_token`.
4. WHEN el Proveedor_De_Identidad responde a un refresco con una Sesion, THE Portal_Interno SHALL reevaluar el rol y la organización a partir de los claims de la Sesion refrescada.
5. WHEN el Usuario_Interno cierra sesión, THE Portal_Interno SHALL solicitar la revocación mediante `DELETE /api/v1/sesion` y descartar los tokens persistidos.

### Requirement 4: Indisponibilidad del Proveedor de Identidad

**User Story:** Como Usuario_Interno, quiero una respuesta clara cuando el servicio de identidad no está disponible, para entender que el problema no proviene de mis credenciales.

#### Acceptance Criteria

1. IF el Proveedor_De_Identidad no está disponible al intentar un inicio de sesión, THEN THE Portal_Interno SHALL mostrar un mensaje que indique que el servicio de identidad no está disponible.
2. IF el Proveedor_De_Identidad no está disponible, THEN THE Portal_Interno SHALL comunicar la indisponibilidad sin atribuir el error a las credenciales del Usuario_Interno.
3. IF el Proveedor_De_Identidad no está disponible, THEN THE Portal_Interno SHALL abstenerse de conceder nuevas Sesiones.
4. IF un refresco falla por indisponibilidad del Proveedor_De_Identidad, THEN THE Portal_Interno SHALL preservar la Sesion vigente del Usuario_Interno.

### Requirement 5: Composición de la interfaz con la librería de componentes

**User Story:** Como equipo de producto, quiero que la interfaz de inicio de sesión se construya con la Libreria_UI, para mantener consistencia visual y evitar componentes duplicados.

#### Acceptance Criteria

1. THE Portal_Interno SHALL componer la interfaz de inicio de sesión y de Segundo_Factor con los componentes de la Libreria_UI.
2. IF la Libreria_UI no provee un componente necesario para el inicio de sesión o el Segundo_Factor, THEN THE Portal_Interno SHALL documentar la brecha de la Libreria_UI en lugar de duplicar el componente localmente.

### Requirement 6: Límites de alcance de V1

**User Story:** Como equipo de producto, quiero que el Portal_Interno se mantenga dentro del alcance acotado de V1, para no asumir responsabilidades de autenticación que corresponden al Proveedor_De_Identidad.

#### Acceptance Criteria

1. THE Portal_Interno SHALL delegar la política de autenticación del Segundo_Factor en el Proveedor_De_Identidad, sin decidir por cuenta propia cuándo se exige el Segundo_Factor.
2. THE Portal_Interno SHALL delegar la política de reintentos y de bloqueo en el Proveedor_De_Identidad.
3. THE Portal_Interno SHALL omitir cualquier flujo propio de recuperación de contraseña en V1.
