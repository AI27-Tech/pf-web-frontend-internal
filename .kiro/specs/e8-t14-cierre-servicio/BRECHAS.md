# Brechas — E8-T14 (Cierre del servicio)

Documento de brechas del spec. Cada brecha indica qué pide la tarea, qué existe hoy, qué falta, el impacto en el spec y la propuesta de resolución. **No** se rellena nada con una alternativa local: una operación o campo ausente se solicita al repo de contratos; una regla sin definir se pregunta a Product Management; un componente ausente se compone con primitivas de la librería o se solicita a la librería.

## Estado (actualizado 2026-10-29, tras la respuesta al brief y la publicación de `tracer.24`)

El brief (`.scratch/brecha-contrato-cierre-servicio/brief-cierre-servicio.md`) fue respondido por Contratos, Backend y Producto. **`v0.1.0-tracer.24` está publicado** y trae el motivo tipado y los códigos de 409 declarados. DEC-113 retiró el motivo `bitacora`. Quedan abiertas solo las dependencias de plataforma (códigos de 409 en runtime y 403 real) y la decisión de Producto sobre la fecha exacta de la ventana.

| #   | Brecha                                                         | Estado                                                                                                                    | Efecto en el spec                                                       |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Motivo de cierre sin campo ni catálogo en el contrato          | **Cerrada:** `motivo_cierre` tipado en `tracer.24`, enum `[normal, por_incidencia]`                                       | El spec consume el enum generado; se elimina el puente por `causa`      |
| 2   | "Observaciones de cierre" sin campo                            | **Cerrada por decisión:** se omiten en V1 (Producto)                                                                      | Fuera de alcance; sin condicionamiento                                  |
| 3   | Motivo `bitacora`                                              | **Cerrada:** DEC-113 lo retira; solo `normal` y `por_incidencia`                                                          | Sin motivo "por definir"; ventanas 3 días y 6 meses                     |
| 4   | Ventana de escritura no expuesta por el bff                    | **Diferida:** `escritura_hasta` solo si Producto lo exige (C5)                                                            | La UI comunica la regla, no la fecha. Condicionado a C5                 |
| 5   | Códigos de 409 en runtime; 401 en lugar de 403                 | **Parcial:** códigos declarados en `tracer.24`; el runtime sigue enviando `conflicto`; 403 diferido                       | La UI previene con datos propios; condicionado a la tarea de plataforma |
| 6   | "Listo para cerrar" y rol facultado                            | **Cerrada:** criterio por estado de origen vigente (B2/C3); cierran solo `jefe_operativo` y `administrador` (C4, DEC-060) | Sin condicionamiento; la UI no usa `arribo`                             |
| 7   | Componentes de `@ai27-tech/ui`                                 | **Verificada:** sin aviso en línea dedicado; se compone                                                                   | Sin bloqueo                                                             |
| 8   | Pin del frontend en `tracer.22`, contrato nuevo en `tracer.24` | **Cerrada (2026-10-29):** pin en `tracer.24`, instalado y verificado; falta commitear                                     | Tarea 1 del plan, hecha                                                 |

---

## Fuentes y versiones verificadas

- **Contexto:** `repos/ai27-platform-context` al día con `origin/main`, commit `2e80dd2` (`pull --ff-only` desde `07f906d`). Historia técnica `docs/historias-tecnicas/E8-panel-admin.md` §E8-T14 y `E1-prestacion-del-servicio.md` §E1-T8. HU `E1-HU-010` (corregida: sin "bitácora", sin pendiente de quién cierra). Decisiones DEC-020 #6, DEC-030, DEC-041, DEC-060, **DEC-113** (motivos de cierre solo `normal` y `por_incidencia`), DEC-111 (nota ampliada con A3/B1 de E8-T14, diferido).
- **Contrato:** último tag publicado `v0.1.0-tracer.24` (ola A1/A2 de E8-T14: contratos PR #85, `operacion` PR #62, `bff` PR #37). El `package.json` del frontend fija todavía `@ai27-tech/contracts@0.1.0-tracer.22` (brecha 8). `tracer.23` agrega `transicionarViajeCliente` (E9-T7) y no afecta al cierre. El checkout local de `pf-pkg-contracts` no estaba en el tag del `package.json`; la superficie se lee con `git show v0.1.0-tracer.24:…`.
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

## Brecha 4 — Ventana de escritura no expuesta por el `bff` (DIFERIDA, condicionada a C5)

**Qué pide la tarea.** DoD de E8-T14: "la interfaz comunica la ventana de escritura resultante (3 días o 6 meses) según el motivo y anticipa el paso posterior a sólo lectura".

**Qué existe hoy.** `ViajeDetalle` no trae datos de la conversación. `escritura_hasta` existe en `mensajeria`, pero el `bff` no lee la conversación del viaje; exponerlo exige contrato más una lectura nueva. Contratos lo difiere salvo que Producto diga que la fecha exacta es imprescindible (C5).

**Impacto en el spec.** No bloquea. La UI comunica la **regla** (3 días / 6 meses) derivada del motivo, y tras el cierre repite esa regla. **No** calcula `cerrado_en + ventana` (es regla de `mensajeria`). Al reabrir un viaje ya `CERRADO` solo dice que está cerrado: el detalle no trae el motivo ni el vencimiento.

**Qué falta para cerrarla.** Respuesta de Producto a C5 (¿la fecha exacta entra en V1?). Si sí: contrato para `escritura_hasta` y lectura en el `bff`; el frontend la muestra sin calcularla (tarea 10 del plan).

---

## Brecha 5 — Códigos de 409 en runtime y 403 real (PARCIAL; diferida a plataforma)

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

**Historial.** `package.json` fijaba `0.1.0-tracer.22`; sin subir el pin, `motivo_cierre` y `MotivoCierre` no existían en los tipos generados.

**Propuesta de resolución.** Tarea 1 del plan: subir el pin a `0.1.0-tracer.24` (cambio aditivo respecto de `tracer.22`: `tracer.23` agrega la operación de cliente de E9-T7 y `tracer.24` el motivo y los códigos), reinstalar, confirmar en `node_modules` que `MotivoCierre` y `motivo_cierre` están presentes y correr `typecheck`, `lint` y `test` para descartar regresiones antes de seguir. Si el paquete `0.1.0-tracer.24` no está disponible en el registro del equipo, detener y avisar; no se escribe el tipo a mano.

---

## Pendientes que siguen abiertos

1. **C5 (Producto):** ¿la fecha exacta de paso a sólo lectura entra en V1? Decide si la brecha 4 se activa.
2. **C6 (Producto):** validación de los textos de bloqueo y de la ventana (copy). Los textos del spec son propuestos.
3. **Plataforma (A3 + B1):** códigos de 409 en runtime y 403 real. Sin fecha.
4. **Senior del frontend:** si se acepta el riesgo del 401 con la prevención por rol o se abre una tarea transversal sobre `client.ts`.
