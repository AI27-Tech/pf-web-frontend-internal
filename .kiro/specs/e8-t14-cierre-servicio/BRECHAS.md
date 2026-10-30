# Brechas — E8-T14 (Cierre del servicio)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación o campo ausente se solicita al repo de contratos; una regla sin definir se pregunta a Product Management; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (2026-10-29)

El spec (`requirements.md`, `design.md`, `tasks.md`) **está redactado con las brechas abiertas**: el comportamiento que depende de una brecha está marcado como **condicionado** en los requisitos y tiene una tarea de cierre en la última ola de `tasks.md`. Se decidió cerrar las brechas durante la ejecución, no antes. Las brechas 1 a 4 y 6 requieren respuesta externa; la 5 es una inconsistencia conocida de plataforma; la 7 está verificada y no bloquea. Las propuestas del frontend que usa el spec mientras tanto están marcadas **no vigentes hasta confirmarse**.

| #   | Brecha                                                         | Dueño de la respuesta | Estado     | Bloquea                                     |
| --- | -------------------------------------------------------------- | --------------------- | ---------- | ------------------------------------------- |
| 1   | Motivo de cierre sin campo ni catálogo en el contrato          | Contratos             | Abierta    | Captura del motivo (condiciona, no bloquea) |
| 2   | "Observaciones de cierre" sin campo en el contrato             | PM + Contratos        | Abierta    | Campo opcional de la HU                     |
| 3   | Motivo `bitacora` sin definición ni ventana de escritura       | PM                    | Abierta    | Texto de la ventana para ese motivo         |
| 4   | Ventana de escritura (3 días / 6 meses) no expuesta por el bff | Contratos + PM        | Abierta    | Solo la fecha concreta de vencimiento       |
| 5   | Códigos de error del cierre sin publicar; 401 en vez de 403    | Contratos + Backend   | Abierta    | Mensajes diferenciados por causa            |
| 6   | Criterio de "listo para cerrar" y rol facultado                | PM                    | Abierta    | Cuándo ofrecer la acción y a quién          |
| 7   | Componentes de `@ai27-tech/ui`                                 | —                     | Verificada | Nada                                        |

---

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `07f906d` (`pull --ff-only` desde `1dd8256`). Historia técnica `docs/historias-tecnicas/E8-panel-admin.md` §E8-T14 y `E1-prestacion-del-servicio.md` §E1-T8. HU `docs/hu/E1-HU-010-cerrar-el-servicio.md` (estado: **Borrador, pendiente de validación**). Decisiones DEC-013, DEC-020 #6, DEC-030, DEC-041, DEC-060, DEC-111 (nota sobre 401/403).
- **Contrato:** el frontend fija `@ai27-tech/contracts@0.1.0-tracer.22`. El último tag publicado es `v0.1.0-tracer.23`, que solo agrega `transicionarViajeCliente` (E9-T7) y no afecta a T14; no se subió el pin. El checkout local de `pf-pkg-contracts` está en la rama `feat/ficha-tecnica-e-historico-tracer21` (cfefcec, adelantada 8 commits), **no** en el tag del `package.json`: la superficie se leyó con `git show v0.1.0-tracer.22:contracts/openapi/bff.yaml` y `…/estados/viaje.estados.yaml`.
- **Backend (referencia, no autoridad):** `repos/pf-svc-operacion/internal/viajes/transicion.go` (`validarCierre`), presente en `origin/pf-op-m` vía "Cierre del servicio (#45)". Se leyó el checkout local de `pf-svc-operacion` (rama `pf-op-d`); sirve para entender el comportamiento real, pero el contrato publicado es la fuente.
- **Librería:** `@ai27-tech/ui@0.2.0-beta.6`.

### Superficie contractual que la tarea consume (verificada en `tracer.22`)

| Elemento            | Hecho verificado                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operación           | `POST /api/v1/viajes/{id}/transiciones` (`transicionarViaje`) → `200 ViajeDetalle`; `400`, `401`, `403`, `409`                                                                        |
| Entrada             | `TransicionEntrada { a_estado: string, causa?: string }`, `additionalProperties: false`. `causa`: "obligatoria cuando el destino la requiere; la validación fina vive en `operacion`" |
| Aristas a `CERRADO` | `EN_DESTINO→CERRADO` y `EN_DESCARGA→CERRADO` (guarda `ultima_parada`); `EN_TRANSITO→CERRADO` (guarda `cierre_anticipado_por_incidencia`) — `viaje.estados.yaml`                       |
| Detalle             | `ViajeDetalle { viaje: ViajeInterno, condiciones_activas: CondicionAbierta[] }`; `CondicionAbierta.tipo ∈ {INCIDENCIA, SIN_SENAL}`; `destinos[].arribo?: boolean`                     |
| 409 documentado     | Solo `transicion_no_permitida` ("la UI distingue el rechazo por carrera a partir de él")                                                                                              |

---

## Brecha 1 — Motivo de cierre sin campo ni catálogo en el contrato

**Qué pide la tarea.** E8-T14 / `E1-HU-010`: el cierre exige un **motivo** del catálogo _normal / por incidencia / bitácora_ (DEC-013). `E1-T8` pide que `viaje.cerrado` lleve el motivo. Contrato declarado por la historia técnica: `POST /api/v1/viajes/{id}/transiciones` "con motivo".

**Qué existe hoy.** `TransicionEntrada` solo tiene `a_estado` y `causa` (texto libre). No hay campo `motivo_cierre` ni enum del catálogo en `bff.yaml` ni en `operacion.yaml` (`tracer.22`). `operacion` resuelve el motivo leyendo `causa` y validándolo contra los literales `normal`, `por_incidencia` y `bitacora`; su propio código lo documenta como atajo ("brecha de contrato… cuando el contrato gane ese campo, esta lectura cambia"). El documento de brecha que cita ese comentario (`.scratch/e1-t8-cierre-viaje/brecha-motivo-de-cierre.md`) **no está en este workspace**.

**Qué falta exactamente.** Un campo tipado para el motivo (p. ej. `motivo_cierre` con enum `normal | por_incidencia | bitacora`) en `TransicionEntrada` del `bff` y de `operacion`, o la confirmación explícita de que `causa` con esos literales es el contrato definitivo.

**Impacto en el spec.** Los tres literales no están en el contrato generado, así que la UI no puede importarlos como enum. La captura del motivo queda **condicionada**: sin decisión, el spec no puede fijar si el selector se alimenta de un enum generado o de una constante local.

**Propuesta de resolución.**

- _Solicitud a Contratos:_ publicar el campo tipado (ver brief). Mientras no exista, la UI aísla el puente en **una sola capa** (`lib/contracts/cierreViaje.ts`), igual que la Opción A de E8-T9, con los tres literales declarados una vez y un comentario que apunta a esta brecha. El resto del código no asume más que esa capa.
- _Decisión pendiente (no tomada):_ si el puente por `causa` es aceptable para V1 o se espera al campo tipado.

---

## Brecha 2 — "Observaciones de cierre" sin campo en el contrato

**Qué pide la tarea.** `E1-HU-010`, tabla de campos: _Observaciones de cierre_ (texto, **opcional**, "detalle libre"). El criterio de aceptación pide que el cierre quede registrado con actor y marca de tiempo; no menciona observaciones en los criterios, solo en la tabla de campos.

**Qué existe hoy.** `TransicionEntrada` no tiene dónde llevarlas. `causa` ya está ocupada por el motivo en el puente de la brecha 1. `operacion` no las lee. La historia técnica E8-T14 no las menciona.

**Qué falta exactamente.** Un campo opcional (p. ej. `observaciones`) en `TransicionEntrada`, y su persistencia y exposición en el histórico, si Producto las quiere en V1.

**Impacto en el spec.** Campo opcional de la HU, no bloqueante. Sin definición, no se captura: meterlas dentro de `causa` mezclaría dos datos en un campo que `operacion` valida como catálogo cerrado y lo rechazaría con `400`.

**Propuesta de resolución.** Pregunta a PM: ¿las observaciones entran en V1? Si sí, solicitud a Contratos. Si no, la HU se ajusta y el spec no las modela. Recomendación del frontend: omitirlas en V1.

---

## Brecha 3 — Motivo `bitacora`: sin definición ni ventana de escritura

**Qué pide la tarea.** La HU lista el motivo _de bitácora_ "(DEC-013)" y la Definición de terminado de E8-T14 exige que la UI comunique la ventana de escritura resultante "según el motivo".

**Qué existe hoy.** DEC-013 trata el modelo multi-parada y **no** define un motivo de cierre "bitácora". Ninguna fuente de contexto dice qué significa ni qué ventana le corresponde. Las fuentes solo fijan: sin incidencia → 3 días; con incidencia → 6 meses (DEC-030, DEC-041). `E1-T8` dice que `mensajeria` decide la ventana a partir del motivo en `viaje.cerrado`, pero no cómo se mapea `bitacora`. `operacion` solo valida el literal; tampoco lo interpreta.

**Qué falta exactamente.** Definición funcional del motivo `bitacora` (cuándo se usa, quién lo elige) y su ventana (3 días o 6 meses).

**Impacto en el spec.** El texto de la ventana para ese motivo no puede escribirse. También queda abierto si el motivo se ofrece en el selector o se oculta hasta tener definición.

**Propuesta de resolución.** Pregunta a PM. Propuesta del frontend, **no vigente hasta que PM la confirme**: la UI comunica 3 días para `normal`, 6 meses para `por_incidencia` y, para `bitacora`, "ventana por definir" sin inventar un valor.

---

## Brecha 4 — Ventana de escritura no expuesta por el `bff`

**Qué pide la tarea.** DoD de E8-T14: "la interfaz comunica la ventana de escritura resultante (3 días o 6 meses) según el motivo y anticipa el paso posterior a sólo lectura".

**Qué existe hoy.** `ViajeDetalle` y `ViajeInterno` no traen ningún dato de la conversación. `mensajeria.yaml` menciona `escritura_hasta` y el código `conversacion_solo_lectura` (DEC-030/DEC-041), pero solo en prosa del envío de mensajes; no hay un schema ni una operación del `bff` que devuelva el vencimiento de la ventana de un viaje cerrado.

**Qué falta exactamente.** Para mostrar **la fecha concreta** de paso a sólo lectura: un campo `escritura_hasta` (o equivalente) en el detalle del viaje o en una lectura de conversación expuesta por el `bff`. Para mostrar **la regla** (3 días / 6 meses) no falta nada: es texto derivado del motivo elegido.

**Impacto en el spec.** No bloquea. El spec puede cumplir el DoD con texto fijo por motivo antes de confirmar y, tras cerrar, con el aviso derivado del motivo enviado. La fecha exacta queda **condicionada** a esta brecha. La UI no calcula `cerrado_en + 3 días` por su cuenta: esa cuenta es regla de `mensajeria`.

**Propuesta de resolución.** Solicitud a Contratos (ver brief), de prioridad baja: exponer `escritura_hasta` tras el cierre. Mientras tanto, la UI solo comunica la regla.

---

## Brecha 5 — Códigos de error del cierre sin publicar; 401 en lugar de 403

**Qué pide la tarea.** Estados obligatorios de E8-T14: cierre sin motivo (bloqueado), cierre anticipado sin incidencia abierta (bloqueado "con la razón visible"), viaje ya cerrado.

**Qué existe hoy.**

- El `bff` documenta para `transicionarViaje` un único `codigo` de 409: `transicion_no_permitida`. `operacion` rechaza el cierre con 409 por al menos tres causas distintas (anticipado con motivo ≠ `por_incidencia`; anticipado sin condición `INCIDENCIA` abierta; arista no permitida, p. ej. viaje ya `CERRADO`), todas con mensaje libre y sin `codigo` propio publicado.
- `operacion` responde **401** cuando un rol sin facultad intenta cerrar (`rolesQuePuedenCerrar`, solo `jefe_operativo` y `administrador`) porque `pf-pkg-platform-go/errors` no tiene categoría 403. DEC-111 lo reconoce como inconsistencia diferida y pide revisar `validarCierre` cuando se agregue el 403. El contrato del `bff` sí declara `403` para la operación.
- Motivo faltante o fuera de catálogo → `400` (declarado en el contrato).
- No se verificó qué `codigo` serializa el `bff` en cada 409 reenviado desde `operacion` (`pf-svc-bff/internal/errores` traduce el estado HTTP a una categoría genérica).

**Qué falta exactamente.** `codigo` diferenciado por causa de 409 (p. ej. `cierre_anticipado_requiere_incidencia`, `cierre_anticipado_solo_por_incidencia`) y 403 real para "sin facultad de cerrar".

**Impacto en el spec.**

- La UI **previene** lo que puede con datos que ya tiene: oculta o deshabilita "Cerrar" según el rol de la sesión, bloquea el cierre anticipado cuando `condiciones_activas` no trae `INCIDENCIA`, y no ofrece acciones en `CERRADO` (terminal). Eso cubre los estados obligatorios sin depender de códigos.
- Ante una carrera (la incidencia se cerró entre la lectura y el envío), la UI solo puede mostrar un mensaje de conflicto genérico y recargar el detalle; no puede nombrar la causa.
- **Riesgo (verificado en `lib/api/client.ts`):** ante cualquier 401 en un endpoint que no es de sesión, `manejar401` refresca el token y reintenta una vez; si el reintento vuelve a dar 401, ejecuta `cortarSesion()` y lanza `sesionFinalizada`. Un 401 por falta de facultad (que el refresco no corrige) **cierra la sesión del usuario**. El frontend lo mitiga ocultando "Cerrar" a los roles sin facultad; no modifica `client.ts` (es transversal y fuera del alcance de T14). El riesgo residual es un rol sin facultad que fuerce la petición, o un cambio de rol entre la lectura y el envío.
- **Hallazgo del código actual:** `DetalleViaje.tsx` ofrece hoy `CERRADO` como un botón genérico "Transicionar a: CERRADO" para cualquier rol y **sin motivo** (`requiereCausa` no lo incluye). Contra `operacion` eso produce un `400`. E8-T14 reemplaza ese botón por la acción dedicada de cierre.

**Propuesta de resolución.** Solicitud a Contratos/Backend (ver brief): publicar los `codigo` de 409 del cierre y migrar el rechazo de facultad a 403 (ya diferido en DEC-111). Hasta entonces, prevención en la UI y mensaje genérico de conflicto, sin inventar códigos.

---

## Brecha 6 — Criterio de "listo para cerrar" y rol facultado (pendientes de la HU)

**Qué pide la tarea.** Cierre "desde un estado válido tras la última parada" y solo por el Jefe Operativo (o Administrador).

**Qué existe hoy.**

- La guarda `ultima_parada` del YAML es nominal. `operacion` la **aproxima por el estado de origen** (`EN_DESTINO` o `EN_DESCARGA`) y no verifica que sea literalmente la última parada: su código declara que no existe puntero de parada actual y que la condición de "listo para cerrar" no está fijada en las fuentes. `E6-HU-033` (panel del Jefe Operativo) tiene el mismo pendiente.
- `ViajeInterno.destinos[].arribo` existe, pero ninguna fuente dice que deba gatear el cierre.
- `E1-HU-010`, Pendientes: "si Supervisor/Coordinador también pueden cerrar viajes (DEC-060 se lo asigna al Jefe Operativo)". `operacion` hoy solo acepta `jefe_operativo` y `administrador`.

**Qué falta exactamente.** (a) Definición de "última parada" / "listo para cerrar". (b) Confirmación de que solo `jefe_operativo` y `administrador` cierran.

**Impacto en el spec.** Sin (a), la UI no puede decidir si advierte o bloquea cuando hay destinos sin `arribo`; hacerlo sería inventar una regla. Sin (b), la visibilidad de la acción se fija con DEC-060 tal como está.

**Propuesta de resolución.** Preguntas a PM. Propuesta del frontend, **no vigente hasta confirmarse**: la UI deriva las acciones de la máquina de estados generada y de `condiciones_activas`, no de `arribo`, y ofrece "Cerrar" solo a `jefe_operativo` y `administrador` (DEC-060). La autoridad final es el `bff`.

---

## Brecha 7 — Componentes de `@ai27-tech/ui` (VERIFICADA)

**Qué pide la tarea.** Un diálogo de cierre con selector de motivo, aviso de la ventana de escritura, bloqueos con razón visible y avisos de resultado.

**Qué existe.** En `@ai27-tech/ui@0.2.0-beta.6` están `Modal`, `Select`, `Radio`, `Textarea`, `Badge`, `Toast`, `ToastContainer` y `Tooltip`; el detalle del viaje ya usa `Modal`, `Form`, `FormField`, `Button`, `Card` y `Toast` (E8-T8 a E8-T10). No se encontró un componente de aviso en línea (tipo `Alert`/`Callout`).

**Qué falta.** Un aviso en línea dedicado para la razón de bloqueo y para la ventana de escritura.

**Impacto y resolución.** No bloquea. Se compone con texto semántico y los tokens `--ui-*` de la librería, igual que el mensaje de error de `CausaForm`, y se registra como solicitud a la librería si el equipo de diseño quiere un componente. No se crea componente local.

---

## Resumen de decisiones que el spec necesita

1. ¿Puente por `causa` con `normal | por_incidencia | bitacora` o esperar el campo tipado? (brecha 1)
2. ¿Observaciones de cierre en V1? (brecha 2)
3. ¿Qué es el motivo `bitacora` y qué ventana tiene? (brecha 3)
4. ¿Se necesita la fecha exacta de vencimiento de la ventana en V1? (brecha 4)
5. ¿Cómo se distingue el 401 por falta de facultad de una sesión expirada? (brecha 5)
6. ¿Qué define "listo para cerrar", y cierran solo `jefe_operativo` y `administrador`? (brecha 6)
