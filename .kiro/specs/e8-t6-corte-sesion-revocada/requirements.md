# Requirements Document

## Introduction

E8-T6 cubre el **corte de sesión revocada en el cliente** para los dos portales de AI27 (`pf-web-frontend-internal` y `pf-web-frontend-client`). Satisface la HU **E4-HU-020** (Gestión de sesión y revocación) en su parte de cara al usuario, y hace efectivo el corte contractual de **30 segundos** del ADR 26 también en la interfaz.

El alcance es de los **dos portales** y se resuelve una sola vez con el mismo diseño. Este spec vive en el repo interno por convención del tracker, pero describe el comportamiento de ambos portales; las diferencias de código entre uno y otro se detallan en `design.md`.

**El problema que resuelve:** como el JWT se verifica localmente por firma y expiración en cada servicio, una sesión revocada en `identidad` sigue teniendo un token con firma válida hasta su vencimiento natural. El backend materializa la revocación (ADR 26) y, del lado del portal, eso se manifiesta como **un `401` en la siguiente petición**. Si el portal no reacciona, se queda mostrando datos con un token muerto. E8-T6 hace que el portal reaccione cerrando la interfaz y llevando al login.

### Brecha de contrato (afecta solo el texto del mensaje — NO bloquea esta tarea)

Antes de leer los requisitos, conviene entender una limitación del contrato actual, porque explica por qué el mensaje que ve el usuario es genérico. **Esta limitación no impide implementar ni cerrar E8-T6.**

**En qué consiste.** Cuando una sesión deja de valer, el portal se entera porque su siguiente petición al `bff` recibe un `401`. El problema es que ese `401` es **idéntico** en dos situaciones distintas que, de cara al usuario, significan cosas diferentes:

1. **Sesión revocada** — alguien cerró la sesión (el propio usuario con logout, o un administrador que la cortó).
2. **Token expirado** — el token simplemente venció por tiempo.

El contrato **no le dice al portal cuál de las dos fue**, y esto es **por diseño, no un olvido**:

- `_comunes.yaml#/components/responses/NoAutorizado` define el `401` como "Token ausente, inválido, expirado o con sesión revocada": las cuatro causas comparten una misma respuesta, sin un campo que las separe.
- El cuerpo del `401` tiene un campo `codigo`, pero el contrato **no define ningún valor** de `codigo` para distinguir revocación de expiración (los `codigo` que existen son solo para conflictos `409`).
- El ADR 26 §7 es explícito: el `motivo` de la revocación y los datos del sujeto **no se envían a los consumidores**; el portal solo ve el `401` pelón.

**Por qué NO bloquea.** El comportamiento que pide E8-T6 (si la sesión ya no vale, cerrar la interfaz y llevar al login sin reusar un token muerto) **se cumple sin necesidad de saber el motivo**. En vez de ramificar sobre la causa (que el portal no puede conocer), el diseño ramifica sobre la **recuperabilidad**:

- Llega un `401` → el portal intenta refrescar el token.
- Si el refresco **tiene éxito** → era un token expirado normal; se recupera de forma transparente y el usuario ni se entera.
- Si el refresco **también da `401`** (o no hay con qué refrescar) → la sesión ya no es recuperable (revocada o muerta); se descarta el token, se cierra lo abierto y se lleva al login, sin reintentar.

Lo único que la brecha limita es el **texto del mensaje**: mientras el contrato no distinga las causas, el portal muestra un mensaje único ("Tu sesión finalizó") en lugar del mensaje exacto ("Tu sesión fue revocada" vs. "expiró"). Nada más.

**Qué pasaría si algún día se cierra la brecha (mejora opcional, a futuro).** Si el `bff` llegara a serializar un `codigo` estable en el `401` (p. ej. `sesion_revocada`), el portal podría afinar el mensaje al caso exacto. Hasta entonces, no se inventa la causa. Esto queda registrado como `BRECHA-CONTRATO-1` en "Brechas abiertas"; es una nota para el equipo de contratos, **no un prerrequisito de E8-T6**.

### Contrato de referencia

Los portales consumen la superficie **pública** del `bff` desde `@ai27-tech/contracts` (interno: `0.1.0-tracer.20`; cliente: `0.1.0-tracer.11`). Operaciones relevantes:

- **Refresco:** `POST /api/v1/sesion/refresh` con `{ refresh_token }`. Un `401` aquí significa que la sesión no es recuperable.
- **Revocación / cierre:** `DELETE /api/v1/sesion`. Best-effort desde el portal.
- **Cualquier petición protegida:** un `401` en una petición de datos es la señal de corte que esta tarea maneja.

La superficie interna de `identidad` (`/api/v1/sesiones`, `/api/v1/sesiones/revocadas`) **no** la consume el portal: es el canal por el que los servicios materializan la revocación (ADR 26 §3), no el frontend.

## Glossary

- **Portal**: cualquiera de los dos frontends, `pf-web-frontend-internal` (Portal_Interno) o `pf-web-frontend-client` (Portal_Cliente). Cuando un requisito aplica solo a uno, se indica.
- **Puerta_HTTP**: el cliente HTTP único de cada portal (`src/lib/api/client.ts`), por donde salen todas las peticiones hacia el `bff`. Es el único punto donde se observa el `401`.
- **Sesion_No_Recuperable**: situación en la que un `401` no puede resolverse con un refresco: no hay `refresh_token`, o el refresco también responde `401`. Abarca tanto la sesión revocada como el token definitivamente expirado, que el contrato actual no permite distinguir.
- **Token_Expirado_Recuperable**: un `401` cuyo refresco tiene éxito y produce una nueva `Sesion`. La petición original puede reintentarse una vez con el token nuevo.
- **Corte_De_Sesion**: la reacción del portal ante una Sesion_No_Recuperable: descartar los tokens persistidos, cerrar cualquier suscripción abierta y navegar al login con el Mensaje_Sesion_Finalizada, sin reintentar la petición.
- **Mensaje_Sesion_Finalizada**: mensaje único que el portal muestra al llevar al login tras un Corte_De_Sesion, sin atribuir la causa a revocación o expiración mientras el contrato no las distinga.
- **Suscripcion_Activa**: cualquier conexión de larga duración abierta por el portal (SSE / `EventSource`) que deba cerrarse ante un Corte_De_Sesion. En V1 **no existe** ninguna viva en los portales (el realtime es V2); el requisito se expresa de forma que no cree una superficie que hoy no está.
- **Libreria_UI**: paquete `@ai27-tech/ui` (interno `0.2.0-beta.6`, cliente `0.2.0-beta.1`), fuente única de componentes de interfaz. Cualquier mensaje al usuario se compone con ella.

## Requirements

### Requirement 1: Distinción entre token recuperable y sesión no recuperable

**User Story:** Como plataforma, quiero que el portal distinga un token que puede refrescarse de una sesión que ya no vale, para no cerrar la interfaz ante una expiración normal ni mantenerla abierta ante una revocación.

#### Acceptance Criteria

1. WHEN una petición a través de la Puerta_HTTP responde `401` Y existe un `refresh_token` utilizable, THE Portal SHALL intentar un refresco mediante `POST /api/v1/sesion/refresh` antes de decidir el corte.
2. WHEN el refresco responde con una `Sesion` válida, THE Portal SHALL tratar el `401` original como Token_Expirado_Recuperable y reintentar la petición original **una sola vez** con el nuevo `access_token`.
3. IF el refresco responde `401`, THEN THE Portal SHALL tratar la situación como Sesion_No_Recuperable y ejecutar el Corte_De_Sesion.
4. IF un `401` ocurre y no existe un `refresh_token` utilizable, THEN THE Portal SHALL tratar la situación como Sesion_No_Recuperable y ejecutar el Corte_De_Sesion, sin intentar refrescar.
5. THE Portal SHALL ejecutar a lo sumo **un** intento de refresco por cada petición que haya recibido `401`; un segundo `401` tras refrescar nunca dispara otro ciclo de refresco.

### Requirement 2: El corte de sesión no se reintenta

**User Story:** Como plataforma, quiero que un `401` por sesión no recuperable no entre en el ciclo de refresco ni de reintento, para que el corte sea inmediato y no quede un token muerto en uso.

#### Acceptance Criteria

1. WHEN el Portal determina una Sesion_No_Recuperable, THE Portal SHALL descartar de inmediato los tokens persistidos (`access_token`, `refresh_token` cuando exista y `sesion_id`).
2. THE Portal SHALL abstenerse de reintentar la petición que recibió el `401` no recuperable.
3. THE Portal SHALL abstenerse de disparar un nuevo refresco una vez determinada la Sesion_No_Recuperable.
4. WHEN varias peticiones concurrentes reciben `401` de la misma sesión, THE Portal SHALL ejecutar el Corte_De_Sesion una sola vez y no una vez por petición.

### Requirement 3: Cierre de suscripciones activas

**User Story:** Como plataforma, quiero que cualquier conexión de larga duración se cierre al cortar la sesión, para que no quede un canal vivo con un token revocado.

#### Acceptance Criteria

1. WHEN el Portal ejecuta un Corte_De_Sesion, THE Portal SHALL cerrar toda Suscripcion_Activa abierta en el portal.
2. WHERE no existe ninguna Suscripcion_Activa en V1, THE Portal SHALL exponer el Corte_De_Sesion como un punto único al que una Suscripcion_Activa futura pueda suscribirse para cerrarse, sin crear una superficie SSE que V1 no tiene.

### Requirement 4: Navegación al login con mensaje explícito

**User Story:** Como usuario, quiero que, cuando mi sesión termine, el portal me lleve al login diciéndome que la sesión finalizó, para no quedarme frente a una interfaz que ya no responde sin saber por qué.

#### Acceptance Criteria

1. WHEN el Portal ejecuta un Corte_De_Sesion, THE Portal SHALL navegar a la ruta de login.
2. WHEN el Portal navega al login por un Corte_De_Sesion, THE Portal SHALL mostrar el Mensaje_Sesion_Finalizada.
3. WHILE el contrato no exponga un `codigo` que distinga revocación de expiración, THE Portal SHALL usar un Mensaje_Sesion_Finalizada único y no afirmar que la sesión fue revocada ni que expiró.
4. WHEN el Portal navega al login por un Corte_De_Sesion, THE Portal SHALL preservar el destino de origen de modo que un inicio de sesión posterior pueda regresar a él, con el mismo mecanismo `redirect` que ya usa la guarda de rutas privadas.
5. THE Portal SHALL componer el Mensaje_Sesion_Finalizada con un componente de la Libreria_UI.

### Requirement 5: No perder lo capturado sin avisar

**User Story:** Como usuario que está llenando un formulario, quiero que el portal no descarte en silencio lo que escribí cuando mi sesión termina, para no perder mi trabajo sin enterarme.

#### Acceptance Criteria

1. IF ocurre un Corte_De_Sesion mientras el usuario tiene un formulario con datos sin enviar, THEN THE Portal SHALL advertir que la sesión finalizó antes de descartar lo capturado, en lugar de limpiar la interfaz silenciosamente.
2. THE Portal SHALL hacer observable el evento de Corte_De_Sesion de modo que una pantalla con un formulario a medio llenar pueda reaccionar a él.

> Nota: el mecanismo concreto de preservación del borrador (persistir, reofrecer o solo advertir) se decide en `design.md` según lo que exista hoy en cada portal; este requisito fija el comportamiento mínimo observable: no perder lo capturado **sin avisar**.

### Requirement 6: Composición con la librería de componentes

**User Story:** Como equipo de producto, quiero que cualquier interfaz de este flujo se construya con la Libreria_UI, para mantener consistencia y no duplicar componentes.

#### Acceptance Criteria

1. THE Portal SHALL componer el Mensaje_Sesion_Finalizada y cualquier aviso asociado con componentes de la Libreria_UI.
2. IF la Libreria_UI no provee un componente necesario para este flujo, THEN THE Portal SHALL documentar la brecha de la Libreria_UI y notificarla, en lugar de crear el componente localmente.

### Requirement 7: Límites de alcance de V1

**User Story:** Como equipo de producto, quiero que E8-T6 se mantenga dentro de su alcance, para no asumir responsabilidades que son de los servicios.

#### Acceptance Criteria

1. THE Portal SHALL abstenerse de mantener una proyección propia de revocación o de consultar a `identidad` el estado de una sesión; eso es de los servicios (E0-T4).
2. THE Portal SHALL abstenerse de inventar un `codigo` o `motivo` de revocación que el contrato no provea.
3. THE Portal SHALL tratar la detección del corte únicamente a partir del `401` observado en la Puerta_HTTP, sin asumir un canal de notificación de revocación que V1 no tiene.

## Trazabilidad

| Requisito | Origen                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1, R2    | ADR 26 §6 (máximo 30 s, fallo cerrado); E4-HU-020 (el acceso HTTP se corta); definición de E8-T6 ("el expirado se refresca, el revocado no se reintenta") |
| R3        | ADR 26 §6 (cierre de la última conexión SSE); definición de E8-T6 ("cierre de cualquier suscripción abierta")                                             |
| R4        | Definición de E8-T6 ("lleva a login con un mensaje explícito")                                                                                            |
| R5        | Definición de E8-T6 ("revocada con un formulario a medio llenar: no perder silenciosamente lo capturado sin avisar")                                      |
| R6        | Nota del usuario y guía de integración de `@ai27-tech/ui`                                                                                                 |
| R7        | ADR 26 §3/§7; definición de E8-T6 ("fuera de alcance V1: el portal no mantiene proyección ni consulta a identidad")                                       |

## Brechas abiertas

- **BRECHA-CONTRATO-1 (externa — NO bloquea E8-T6; afecta solo el texto del mensaje).**
  - **Qué falta:** el `401` del `bff` no trae un `codigo` que distinga una sesión revocada de un token expirado (ADR 26 §7 no distribuye el `motivo` a los consumidores).
  - **Impacto real:** ninguno sobre el comportamiento. El corte funciona igual ramificando sobre la recuperabilidad del token (ver "Brecha de contrato"). Lo único limitado es que R4.3 obliga a un mensaje único ("Tu sesión finalizó") en lugar del mensaje exacto por causa.
  - **Qué se pediría si se quisiera cerrar (opcional, a futuro):** que el `bff` serialice un `codigo` estable en el `401`, p. ej. `sesion_revocada`. Con eso, el portal interno —que ya lee `codigo` del cuerpo— podría afinar el mensaje sin más cambios de plomería.
  - **Dónde queda registrada:** aquí en el spec. La tarea 9 de `tasks.md` contempla elevarla como reporte real a `pf-pkg-contracts` si se decide avanzarla; mientras tanto, es solo esta nota.
- **SSE inexistente en V1 (NO bloquea):** no hay ninguna Suscripcion_Activa viva en los portales (realtime es V2). R3 se satisface con un punto de cierre observable, listo para cuando exista una suscripción que cerrar; no requiere escribir código SSE ahora.
