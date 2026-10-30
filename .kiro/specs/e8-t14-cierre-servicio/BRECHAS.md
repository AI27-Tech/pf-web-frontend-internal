# Brechas — E8-T14 (Cierre del servicio)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación o campo ausente se solicita al repo de contratos; una regla sin definir se pregunta a Product Management; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-10-30, tras las decisiones de Producto y del Lead)

El brief y las preguntas de seguimiento (.scratch/brecha-contrato-cierre-servicio/) fueron respondidos por Contratos, Backend, Producto y el Lead (Fabricio Fuentes, 2026-10-30). **Las ocho brechas están cerradas.** La brecha 5 queda cerrada **con una limitación**: el BFF aún no monta la ruta interna `/transiciones`, por lo que la matriz de errores se prueba con mocks y no de punta a punta. DEC-115 y DT-02/DT-03 constan en el mensaje del Lead pero todavía no aparecen en `origin/main` de `ai27-platform-context` (`c21d21d`).

| #   | Brecha                                                         | Estado                                                                                                                                                      | Efecto en el spec                                                    |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Motivo de cierre sin campo ni catálogo en el contrato          | **Cerrada:** `motivo_cierre` tipado en `tracer.24`, enum `[normal, por_incidencia]`                                                                         | El spec consume el enum generado; se elimina el puente por `causa`   |
| 2   | "Observaciones de cierre" sin campo                            | **Cerrada por decisión:** se omiten en V1 (Producto)                                                                                                        | Fuera de alcance; sin condicionamiento                               |
| 3   | Motivo `bitacora`                                              | **Cerrada:** DEC-113 lo retira; solo `normal` y `por_incidencia`                                                                                            | Sin motivo "por definir"; ventanas 3 días y 6 meses                  |
| 4   | Ventana de escritura no expuesta por el bff                    | **Cerrada por decisión (2026-10-30):** Opción A, se comunica la regla; fecha exacta = deuda técnica DT-02                                                   | Sin condicionamiento                                                 |
| 5   | Códigos de 409 en runtime; 401 en lugar de 403                 | **Cerrada con limitación (2026-10-30):** Ola C entregó 403 y códigos (ramas `-d`); riesgo del 401 aceptado por el Lead; el BFF aún no monta la ruta interna | Matriz probada con mocks; punta a punta pendiente de la ruta del BFF |
| 6   | "Listo para cerrar" y rol facultado                            | **Cerrada:** criterio por estado de origen vigente (B2/C3); cierran solo `jefe_operativo` y `administrador` (C4, DEC-060)                                   | Sin condicionamiento; la UI no usa `arribo`                          |
| 7   | Componentes de `@ai27-tech/ui`                                 | **Verificada:** sin aviso en línea dedicado; se compone                                                                                                     | Sin bloqueo                                                          |
| 8   | Pin del frontend en `tracer.22`, contrato nuevo en `tracer.24` | **Cerrada (2026-10-29):** pin en `tracer.24`, instalado y verificado; falta commitear                                                                       | Tarea 1 del plan, hecha                                              |

---

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `2e80dd2` (`pull --ff-only` desde `07f906d`). Historia técnica `docs/historias-tecnicas/E8-panel-admin.md` §E8-T14 y `E1-prestacion-del-servicio.md` §E1-T8. HU `E1-HU-010` (corregida: sin "bitácora", sin pendiente de quién cierra). Decisiones DEC-020 #6, DEC-030, DEC-041, DEC-060, **DEC-113** (motivos de cierre solo `normal` y `por_incidencia`), DEC-111 (nota ampliada con A3/B1 de E8-T14, diferido).
- **Contrato:** último tag publicado `v0.1.0-tracer.24` ... El `package.json` del frontend fija `@ai27-tech/contracts@0.1.0-tracer.24`; la superficie se lee con `git show v0.1.0-tracer.24:…` porque el checkout local de contratos no está en ese tag.
- **Backend (referencia):** `operacion` en `origin/pf-op-d`/`pf-op-m` (merge de `feat/motivo-cierre-e8-t14`): `validarCierre` lee `motivo_cierre` y ya no acepta `bitacora`.
- **Librería:** `@ai27-tech/ui@0.2.0-beta.6`.

### Superficie contractual que la tarea consume (verificada en `tracer.24`)

| Elemento                  | Hecho verificado                                                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operación                 | `POST /api/v1/viajes/{id}/transiciones` (`transicionarViaje`) → `200 ViajeDetalle`; `400`, `401`, `403`, `409`                                                                                                                                  |
| Entrada                   | `TransicionEntrada { a_estado: string, causa?: string, motivo_cierre?: MotivoCierre }`, `additionalProperties: false`. `motivo_cierre`: "obligatorio al transicionar a `CERRADO`; ignorado en otras aristas"; la validación vive en `operacion` |
| Enum                      | `MotivoCierre = "normal" \| "por_incidencia"` (`bff.gen.ts` de `tracer.24`)                                                                                                                                                                     |
| Códigos de 409 declarados | `transicion_no_permitida`, `cierre_anticipado_solo_por_incidencia`, `cierre_anticipado_requiere_incidencia`. **Solo declarados:** hoy el runtime envía `codigo: conflicto`                                                                      |
| Aristas a `CERRADO`       | `EN_DESTINO→CERRADO` y `EN_DESCARGA→CERRADO` (guarda `ultima_parada`); `EN_TRANSITO→CERRADO` (guarda `cierre_anticipado_por_incidencia`)                                                                                                        |
| Detalle                   | `ViajeDetalle { viaje: ViajeInterno, condiciones_activas: CondicionAbierta[] }`; `CondicionAbierta.tipo ∈ {INCIDENCIA, SIN_SENAL}`                                                                                                              |

---

## Brecha 1 — Motivo de cierre (CERRADA: `motivo_cierre` tipado en `tracer.24`)

**Qué pedía la tarea.** `E1-HU-010`: el cierre exige un motivo del catálogo cerrado. La historia técnica declara `POST /api/v1/viajes/{id}/transiciones` "con motivo".

**Estado.** `tracer.24` agrega `TransicionEntrada.motivo_cierre` con el enum `MotivoCierre = [normal, por_incidencia]` en `bff` y `operacion`, y `operacion` lo lee de ahí en lugar de `causa`. Verificado en el `bff.gen.ts` de `tracer.24`.

**Qué queda.** Subir el pin del frontend (brecha 8). La capa `lib/contracts/cierreViaje.ts` reexporta el enum generado y arma `{ a_estado: CERRADO, motivo_cierre }`; ya no envía el motivo en `causa`.

---

## Brecha 2 — Observaciones de cierre (CERRADA por decisión: se omiten en V1)

**Qué pedía la tarea.** `E1-HU-010`, tabla de campos: observaciones de cierre (opcional).

**Estado.** Producto y Contratos coinciden en omitirlas en V1: no están en los criterios de aceptación ni en el contrato. Si Producto las quiere después, es un campo nuevo aparte. El spec no las modela.

---

## Brecha 3 — Motivo `bitacora` (CERRADA: retirado por DEC-113)

**Estado.** DEC-113 establece que los motivos de cierre de V1 son exactamente `normal` y `por_incidencia`. El motivo `bitacora` era una cita circular a DEC-013 (modelo multi-parada) sin respaldo. Ventanas: `normal` → 3 días; `por_incidencia` → 6 meses (DEC-030, DEC-041). `operacion` ya rechaza `bitacora` con `400`; la HU quedó corregida. El selector ofrece dos motivos y no existe ventana "por definir".

---

## Brecha 4 — Ventana de escritura no expuesta por el `bff` (CERRADA por decisión de Producto, 2026-10-30)

**Resolución (2026-10-30).** Producto (Fabricio Fuentes, Lead/Producto) eligió la **Opción A**: la pantalla comunica la regla (3 días más con motivo `normal`, 6 meses con `por_incidencia`), no la fecha. La fecha exacta queda como deuda técnica **DT-02**, a retomar si Producto la eleva a requisito. Sin código. Nota: DT-02 aún no aparece en `docs/DEUDA-TECNICA.md` de `ai27-platform-context` (`origin/main` `c21d21d`); la fuente es el mensaje del Lead.

**Qué pide la tarea.** DoD de E8-T14: "la interfaz comunica la ventana de escritura resultante (3 días o 6 meses) según el motivo y anticipa el paso posterior a sólo lectura".

**Qué existe hoy.** `ViajeDetalle` no trae datos de la conversación. `escritura_hasta` existe en `mensajeria`, pero el `bff` no lee la conversación del viaje; exponerlo exige contrato más una lectura nueva. Contratos lo difiere salvo que Producto diga que la fecha exacta es imprescindible (C5).

**Impacto en el spec.** No bloquea. La UI comunica la **regla** (3 días / 6 meses) derivada del motivo, y tras el cierre repite esa regla. **No** calcula `cerrado_en + ventana` (es regla de `mensajeria`). Al reabrir un viaje ya `CERRADO` solo dice que está cerrado: el detalle no trae el motivo ni el vencimiento.

**Qué falta para cerrarla.** Respuesta de Producto a C5 (¿la fecha exacta entra en V1?). Si sí: contrato para `escritura_hasta` y lectura en el `bff`; el frontend la muestra sin calcularla (tarea 10 del plan).

---

## Brecha 5 — Códigos de 409 en runtime y 403 real (CERRADA con limitación, 2026-10-30)

**Resolución (2026-10-30).** (1) La Ola C ya entregó el `403` (`CategoryProhibido`/`NewProhibido`) y el código de máquina (`PlatformError.Codigo`/`NewConflictoCodigo`), propagados de `operacion` al `bff`: `bd0d3b9` (`pf-pkg-platform-go`), `46fea3c` (`pf-svc-operacion`), `5aa0f01` (`pf-svc-bff`); PR #38, #66 y #43 según el Lead; verificado por mí en las ramas `-d`. `validarCierre` responde `403` a un rol sin facultad y `409` con `cierre_anticipado_solo_por_incidencia` o `cierre_anticipado_requiere_incidencia`. Por eso se retiran las advertencias sobre el `401` y sobre el `conflicto` genérico como único camino: el genérico es ahora solo la red de seguridad para la carrera. (2) El Lead aceptó el riesgo residual del `401` de sesión (Opción A) sin tocar `client.ts`; la alternativa transversal queda como deuda técnica **DT-03**. (3) **Limitación vigente:** `bff.go` no monta la ruta interna `POST /api/v1/viajes/{id}/transiciones` (`bff.go:18`, `ports.go:41`: la fase (a) la dejó fuera a propósito). La matriz de casos (`400`, `403`, `409` específico, `409` genérico, carrera, `401` de sesión) se cubre con mocks; la verificación de punta a punta queda pendiente de que el BFF monte la ruta (el Lead lo coordina con el dueño del BFF). La DEC-115 que cierra el pendiente de DEC-111 aún no aparece en `origin/main` del contexto (`c21d21d`); la fuente es el mensaje del Lead.

**Qué pide la tarea.** Estados obligatorios: cierre sin motivo (bloqueado), cierre anticipado sin incidencia abierta (bloqueado, con la razón visible), viaje ya cerrado.

**Qué existe hoy.**

- `tracer.24` **declara** los códigos de 409 del cierre (`cierre_anticipado_solo_por_incidencia`, `cierre_anticipado_requiere_incidencia`, `transicion_no_permitida`), pero **no los emite**: `operacion` no produce código de máquina (su error solo lleva categoría) y el `bff` aplana los 409 por status. Hoy todo 409 llega con `codigo: conflicto`. Arreglarlo es un cambio transversal de plataforma (código propio en `PlatformError`), diferido por decisión del Lead (DEC-111, nota ampliada).
- `validarCierre` responde **401** a un rol sin facultad porque la plataforma no tiene categoría 403. Mismo cambio de plataforma, diferido junto con lo anterior.
- **Riesgo (verificado en `lib/api/client.ts`):** ante un 401 en un endpoint que no es de sesión, `manejar401` refresca el token y reintenta una vez; si vuelve a dar 401, ejecuta `cortarSesion()`. Un 401 por falta de facultad cierra la sesión del usuario.
- `lib/api/viajeDetalle.ts` (`clasificarConflicto`) hoy reconoce solo `transicion_no_permitida` y `viaje_en_estado_terminal`; cualquier otro 409 cae al respaldo `transicion_no_permitida`.

**Impacto en el spec.**

- La UI **previene** con datos propios: oculta "Cerrar" por rol, bloquea el cierre anticipado cuando `condiciones_activas` no trae `INCIDENCIA`, y no ofrece acciones en `CERRADO`. Eso cubre los estados obligatorios sin depender de códigos.
- Ante una carrera, hoy solo puede mostrar un conflicto genérico y recargar. El spec ya contempla los códigos nuevos: el tipo `ConflictoCodigoTransicion` y los mensajes se amplían ahora para que, cuando el runtime los emita, no haya cambios en la UI (hasta entonces el respaldo aplica).
- El riesgo del 401 se mitiga con la prevención por rol. Backend propone además que `transicionarViaje` no corte la sesión ante un 401 sin intentar refresco; `client.ts` ya intenta refresco y corta si el reintento falla, así que la propuesta no es evidente. **Decisión abierta con el senior del frontend**; T14 no modifica `client.ts`.

**Qué falta para cerrarla.** La tarea de plataforma (A3 + B1): código de máquina en los errores, 403 real, y su propagación en el `bff`. Sin fecha. Tarea 11 del plan.

---

## Brecha 6 — "Listo para cerrar" y rol facultado (CERRADA)

**Estado.** Backend confirma (B2) que aproximar la última parada por el estado de origen (`EN_DESTINO` o `EN_DESCARGA`) es el criterio vigente de V1 (atajo documentado; no hay puntero de parada; mismo pendiente que `E6-HU-033`). Producto confirma (C3) que la UI deriva de la máquina de estados y `condiciones_activas`, no de `destinos[].arribo`, hasta que se defina otro criterio. Producto confirma (C4, DEC-060) que solo `jefe_operativo` y `administrador` cierran; Supervisor y Coordinador no cierran en V1 (pendiente de la HU cerrado). El spec no tiene condicionamientos por esta brecha.

---

## Brecha 7 — Componentes de `@ai27-tech/ui` (VERIFICADA)

**Qué existe.** En `@ai27-tech/ui@0.2.0-beta.6` están `Modal`, `Select`, `Radio`, `Textarea`, `Badge`, `Toast`, `ToastContainer` y `Tooltip`; el detalle del viaje ya usa `Modal`, `Form`, `FormField`, `Button`, `Card` y `Toast`. No se encontró un aviso en línea (`Alert`/`Callout`).

**Impacto y resolución.** No bloquea. La razón de bloqueo y la ventana se componen con texto semántico y tokens `--ui-*`, igual que el error de `CausaForm`. Solicitud opcional a la librería de un aviso en línea; no se crea componente local.

---

## Brecha 8 — Pin del frontend desfasado respecto del contrato (CERRADA, 2026-10-29)

**Estado.** El pin se subió a `@ai27-tech/contracts@0.1.0-tracer.24` (`package.json`, `pnpm-lock.yaml`; pnpm agregó `tracer.24` a `minimumReleaseAgeExclude` en `pnpm-workspace.yaml`). Verificado en `node_modules`: `MotivoCierre`, `TransicionEntrada.motivo_cierre`, los códigos de 409 y las aristas a `CERRADO`. Línea base: `typecheck` ✓, `lint` ✓, `test` 170/170 ✓. Queda commitear el cambio.

**Historial.** El frontend partía de `tracer.22`; la tarea 1 subió el pin a `0.1.0-tracer.24`, donde están `motivo_cierre` y `MotivoCierre`.

**Propuesta de resolución.** Tarea 1 del plan: subir el pin a `0.1.0-tracer.24` (cambio aditivo respecto de `tracer.22`: `tracer.23` agrega la operación de cliente de E9-T7 y `tracer.24` el motivo y los códigos), reinstalar, confirmar en `node_modules` que `MotivoCierre` y `motivo_cierre` están presentes y correr `typecheck`, `lint` y `test` para descartar regresiones antes de seguir. Si el paquete `0.1.0-tracer.24` no está disponible en el registro del equipo, detener y avisar; no se escribe el tipo a mano.

---

## Resultado de implementación (2026-10-30)

Las tareas 2 a 14 están cerradas. La UI usa el motivo generado por `tracer.24`, deriva las aristas desde la máquina contractual, bloquea el cierre anticipado sin `INCIDENCIA`, conserva el motivo ante 400/409/red, recarga el detalle tras 409 y cubre los códigos de cierre junto con el `conflicto` genérico. Textos aprobados por Producto aplicados (`3 días más`, `Se actualizó el detalle; puedes reintentar.`). Se agregaron pruebas de que un `403` no corta la sesión y de que un `401` de sesión se delega al corte de sesión del cliente. No se calculan fechas de `escritura_hasta` (DT-02).

## Pendientes que siguen abiertos (2026-10-30)

1. **Ruta interna del BFF:** montar `POST /api/v1/viajes/{id}/transiciones` (y definir si se monta toda la superficie interna). Coordina el Lead con el dueño del BFF; sin fecha. Al existir, repetir la matriz contra el runtime.
2. **Registro formal:** publicar DEC-115 (cierre del pendiente de DEC-111) y DT-02/DT-03 en `ai27-platform-context`; hoy solo constan en el mensaje del Lead.
3. **Fuera de T14:** el contrato publicado es ya `tracer.29` (`.26` retirada, DEC-114); T14 usa `tracer.24` y no necesita subirlo.
