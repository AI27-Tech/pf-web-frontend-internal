# Brechas de contrato y UI — E8-T12 Ficha técnica del viaje

## Estado vigente — 2026-10-28

La verificación posterior del contrato supersede el análisis histórico de este documento: `pf-pkg-contracts` publicó `v0.1.0-tracer.21` con `obtenerFicha`, `guardarFicha` (PATCH), `Tracto`, `Contenedor`, `gps_ids`, `GET /api/v1/gps`, `tipo_servicio` y `arribo`; el frontend ya consume `@ai27-tech/contracts@0.1.0-tracer.21`. Las brechas de publicación descritas abajo quedan cerradas. Permanecen como trabajo frontend la implementación de escritura y como dependencia operativa la entrega de datos reales del catálogo GPS.

## Registro histórico de brechas (verificación anterior a tracer.21)

Las decisiones de negocio que estaban abiertas ya se cerraron con Producto y se registraron como **DEC-100..104** y **ADR 36**, con la forma contractual decidida en `repos/ai27-platform-context/.scratch/e8-t12-ficha-tecnica/BORRADOR-FORMA.md`. Ya **no hay pendientes de producto**: los antiguos P-1 (campos de la `unidad`) y P-2 (obligatoriedad) quedaron resueltos (ver "Decisiones de cierre").

**Estado histórico contra tracer.20:** la forma de ficha aún no estaba publicada en esa versión. Este registro queda superseded por el estado vigente de tracer.21 al inicio del documento.

## Decisiones de cierre (DEC-100..104 / ADR 36)

Forma decidida en el borrador de Contratos; todo salió de sesión con Producto. Varias **superan** DEC previas y se registran en la DEC de cierre de E8-T12:

- **C-1 Tracto:** objeto `{placas, economico, marca, modelo, color}`, todo texto libre opcional. **Supera DEC-011 #2** (era texto libre de una línea). Lo captura el cliente en la solicitud y lo completa el operador en la ficha, por lo que **también toca `CrearViajeEntrada`** (E8-T11), no solo la ficha.
- **C-2 Contenedor:** `{economico, placas, sello, color}`, texto libre opcional, `0..N`. Un elemento totalmente vacío `{}` se descarta al guardar. No son `numero`/`tipo`.
- **C-3 Obligatoriedad:** la ficha es **100% opcional**; **no hay guardas de ficha en V1**. La máquina de estados queda intacta. Coherente con DEC-043.
- **C-4 `tipo_servicio`:** **solo lectura**; se agrega a la lectura del viaje (`Viaje`/`ViajeInterno`), **no** a la entrada de ficha. Editarlo queda fuera de alcance de E8-T12.
- **C-5 GPS:** catálogo nuevo en `catalogos` (`id`, `identificador`, `activo`); la ficha guarda `gps_ids[]` como referencia; el selector ofrece **solo activos**; **no** se gatea exclusividad. Los valores reales (~100 dispositivos) los entrega Operación (DEC-047) y **no bloquean** la publicación de la forma.
- **Método y semántica:** la operación de escritura es **`PATCH`** (no `PUT`), por consistencia con el contrato. Colecciones por reemplazo: enviar el arreglo sin un elemento lo elimina; `[]` vacía la lista; propiedad omitida no se toca; `tracto: null` borra el tracto.
- **Escolta:** se reutilizan `Asignacion`, `UnidadAsignada` y `Unidad` sin schema nuevo; la ficha no serializa la escolta, la lee de la asignación. El antiguo P-1 queda resuelto: los atributos visibles salen de `Unidad`/`UnidadAsignada`.
- **Destino:** se agrega `arribo: boolean` al `Destino` existente (DEC-012); es dato capturado, no derivado del estado.

## Versiones verificadas

- **Contexto:** `repos/ai27-platform-context` en `main`, commit `b4ce19c`, árbol limpio, al día con `origin/main`. Incluye DEC-100..104, ADR 36 y el borrador de forma de E8-T12.
- **Contrato histórico:** `@ai27-tech/contracts@0.1.0-tracer.20` era la versión fijada al levantar estas brechas. La superficie publicada vigente ahora es `v0.1.0-tracer.21`; ver el estado vigente al inicio del documento.
- **UI:** `@ai27-tech/ui@0.2.0-beta.6`, fijado en `package.json`.

## Superficie disponible hoy (para no reinventarla)

El frontend interno habla solo con el `bff`. En `bff.yaml` del tag `v0.1.0-tracer.20`:

- `GET /api/v1/viajes/{id}/detalle` → `obtenerViajeInterno` → `ViajeDetalle` { `viaje: ViajeInterno`, `condiciones_activas[]` }. `ViajeInterno` = `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`, `creado_en`. **Lectura.**
- `GET /api/v1/viajes/{id}/asignacion` / `asignarRecursos` y `GET /api/v1/unidades` / `listarUnidades` → escolta y roster. **Escolta derivada.**
- `FichaTecnicaDescarga` (dentro de `descargarViaje`, E6-T3) = `estado`, `origen`, `destinos`, `cliente_id?`, `fecha_hora_servicio?`, `tipo_servicio`. **Solo lectura, para la descarga del expediente; no es superficie de captura.**
- En `operacion.yaml`: `crearViaje` (alta mínima), `listarBitacora`/`registrarEntradaBitacora` (eso es el **histórico**, E8-T13), `abrirIncidencia`/`estadias`. **Ninguna operación de escritura de ficha técnica.**

---

> **Todas estas brechas son de contrato y su forma ya está decidida.** Cada una está resuelta funcionalmente por DEC-100..104 / ADR 36. Lo único pendiente es que `pf-pkg-contracts` publique el tracer que las materialice.

## Brecha 1 — Escritura/edición de la ficha técnica (RESUELTA en forma; pendiente de publicar)

- **Forma decidida:** `PATCH /api/v1/viajes/{id}/ficha` (`guardarFicha`) + `GET /api/v1/viajes/{id}/ficha` (`obtenerFicha`) en `operacion`, con espejo en `bff`. Edición incremental: ningún campo `required` salvo `viaje_id`. Método `PATCH` por consistencia con el contrato; colecciones por reemplazo.
- **Qué existe hoy en el contrato publicado (`tracer.20`):** solo lectura del detalle (`obtenerViajeInterno`) y la proyección de descarga dentro de `DescargaViaje`. No existe `obtenerFicha`/`guardarFicha` en ninguna rama ni tag (verificado por `git log --all -S`).
- **Qué falta para cerrarla:** publicar la ola en `pf-pkg-contracts` y subir la dependencia del frontend.
- **Impacto en el spec:** Requirements 3, 4.1, 5.2, 5.3 y 6.1 quedan **desbloqueables** en cuanto se publique el tracer. Hasta entonces la UI opera en solo lectura sobre lo publicado.

## Brecha 2 — Contenedores (0..N) (RESUELTA en forma; pendiente de publicar)

- **Forma decidida (C-2):** schema `Contenedor` con `{economico, placas, sello, color}`, texto libre opcional, `0..N`. Un elemento `{}` vacío se descarta al guardar. No son `numero`/`tipo`.
- **Qué falta para cerrarla:** incluir `Contenedor` en la ola publicada (va dentro de `FichaTecnica`/`FichaTecnicaEntrada`).

## Brecha 3 — Lista de GPS del catálogo registrado (RESUELTA en forma; pendiente de publicar + datos)

- **Forma decidida (C-5):** catálogo nuevo en `catalogos` (`GET /api/v1/gps` → `DispositivoGps {id, identificador, activo}`), espejo en `bff`; la ficha guarda `gps_ids[]` como referencia. El selector ofrece **solo activos**; la referencia histórica se conserva; **no** se gatea exclusividad por viaje.
- **Qué falta para cerrarla:** (1) publicar el catálogo y la referencia en la ola; (2) **entrega de datos** — los ~100 dispositivos reales los aporta Operación (DEC-047); esto **no bloquea** la forma del contrato, pero sí la operación real del selector.

## Brecha 4 — Tracto del cliente (RESUELTA en forma; cambió de texto libre a objeto)

- **Forma decidida (C-1):** objeto `Tracto {placas, economico, marca, modelo, color}`, todo texto libre opcional. **Supera DEC-011 #2.** Lo captura el cliente en la solicitud y lo completa el operador en la ficha.
- **Alerta de alcance:** como el tracto también se captura al crear el viaje, este cambio **toca `CrearViajeEntrada`** (E8-T11), no solo la ficha. Debe coordinarse con esa tarea.
- **Qué falta para cerrarla:** publicar el schema `Tracto` en la ola.

---

## Pendientes de producto — RESUELTOS

Los antiguos P-1 y P-2 ya no están abiertos. Se dejan registrados para trazabilidad.

### P-1 — Campos de la `unidad` en la ficha → RESUELTO

La escolta se representa reutilizando `Asignacion`, `UnidadAsignada` y `Unidad` (con `Unidad.tipo` `patrulla`|`moto` readOnly), sin schema nuevo. La ficha no serializa la escolta: la lee de la asignación. Los atributos visibles salen de esos schemas ya existentes. Decidido en el borrador de forma (A-2) junto con DEC-044/ADR-0031.

### P-2 — Obligatoriedad por campo → RESUELTO

Decisión C-3: la ficha es **100% opcional** y **no hay guardas de ficha en V1**; ningún campo de ficha es precondición de una transición. La UI no fuerza obligatorios. Coherente con DEC-043. Si una fase posterior introduce gating, será otra decisión.

---

## Brechas de UI (no bloqueantes; se resuelven por composición)

`@ai27-tech/ui@0.2.0-beta.6` ofrece `Form`/`FormSection`/`FormRow`/`FormActions`, `Input`/`Textarea`/`Select`/`Checkbox`/`Radio`/`Switch`/`FormField`, `Button`, `Table`, `Modal`, `Toast`, `Badge`, `Card`, `Pagination`, `FilterTable`, `Navbar`, `Sidebar`, `Tooltip`.

- **Sin componente de grupo repetible dedicado:** los grupos de destinos (1..N) y contenedores (0..N) se componen con `FormRow` + primitivas + `Button` para agregar/quitar. Mismo criterio que E8-T11.
- **Sin multiselección de catálogo dedicada:** la selección de GPS se compone con `Table`/`Card` + `Checkbox`.

En ambos casos, un control dedicado sería una **solicitud a la librería**, no un componente local nuevo.

---

## Lo único pendiente (ejecución, no decisión)

No quedan preguntas de negocio abiertas. Lo que falta es:

1. **Contratos:** publicar la ola en `pf-pkg-contracts` (siguiente tracer libre tras `.20`) con `obtenerFicha`, `guardarFicha` (PATCH), `Tracto`, `Contenedor`, `gps_ids`, el catálogo `GET /api/v1/gps`, `tipo_servicio` en la lectura del viaje y `arribo` en `Destino`; con su espejo en `bff`, CHANGELOG y regeneración de la foto de repos.
2. **Frontend interno:** una vez publicado, subir `@ai27-tech/contracts` del `tracer.20` al nuevo tracer e implementar las tareas de escritura (hoy condicionadas).
3. **Operación:** entregar los valores reales del catálogo de GPS (DEC-047). No bloquea la publicación de la forma, sí la operación real del selector.
4. **Coordinación con E8-T11:** el nuevo schema `Tracto` también afecta `CrearViajeEntrada`; alinear el cambio con esa tarea para no partir la forma del tracto entre creación y ficha.
