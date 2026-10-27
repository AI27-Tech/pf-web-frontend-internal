# Brechas de contrato y UI — E8-T12 Ficha técnica del viaje

## Resumen

E8-T12 (`E1-HU-006`) pide que el `monitorista` **capture y edite** la ficha técnica del viaje desde el panel interno: datos generales, escolta derivada, tracto del cliente (texto libre), destinos (1..N), contenedores (0..N) y lista de GPS del catálogo registrado, con edición incremental (DEC-043).

**Distinción clave — decisión de negocio vs. superficie de contrato.** Todo el comportamiento funcional de E8-T12 **ya está decidido** en el repo de contexto (verificado en el commit `ba1abc3`): la ficha editable e incremental (DEC-011, DEC-043), los destinos 1..N y contenedores 0..N (DEC-012, DEC-013), la lista de GPS del catálogo registrado (DEC-012 #3 + DEC-047 #2, que **cierra** el antiguo punto abierto de GPS), el tracto texto libre (DEC-011 #2, DEC-044 #6) y las exclusiones de `cuenta espejo`/`clave_amago`/`kit de seguridad` (DEC-009, DEC-039, DEC-047 #3). **Ninguna de estas brechas es una decisión de producto pendiente.**

Lo que falta es **únicamente la superficie contractual**: el `bff` todavía no expone las operaciones y schemas que materializan esas decisiones. Es una brecha de contrato, no de discovery. Las brechas se reportan para que Contratos las publique; no se rellenan con endpoints, payloads ni campos locales (regla 6 del scaffold y `ai27-tech-library-first`).

Quedan **dos pendientes de producto reales** (ver sección final), ambos con dueño Operación y ninguno inventable en el frontend: los campos exactos de la `unidad` en la ficha (P-1) y la obligatoriedad por campo (P-2).

## Versiones verificadas

- **Contexto:** `repos/ai27-platform-context` en `main`, commit `ba1abc3`, árbol limpio, al día con `origin/main`.
- **Contrato:** `@ai27-tech/contracts@0.1.0-tracer.20`, fijado en `repos/pf-web-frontend-internal/package.json`. Último tracer publicado en `pf-pkg-contracts` = `v0.1.0-tracer.20` (coincide). El checkout local del repo de contratos está en la rama `pf-contracts-m`, por lo que la superficie se leyó **contra el tag `v0.1.0-tracer.20`** (`git show v0.1.0-tracer.20:contracts/openapi/bff.yaml`), no contra el working tree.
- **UI:** `@ai27-tech/ui@0.2.0-beta.6`, fijado en `package.json`.

## Superficie disponible hoy (para no reinventarla)

El frontend interno habla solo con el `bff`. En `bff.yaml` del tag `v0.1.0-tracer.20`:

- `GET /api/v1/viajes/{id}/detalle` → `obtenerViajeInterno` → `ViajeDetalle` { `viaje: ViajeInterno`, `condiciones_activas[]` }. `ViajeInterno` = `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`, `creado_en`. **Lectura.**
- `GET /api/v1/viajes/{id}/asignacion` / `asignarRecursos` y `GET /api/v1/unidades` / `listarUnidades` → escolta y roster. **Escolta derivada.**
- `FichaTecnicaDescarga` (dentro de `descargarViaje`, E6-T3) = `estado`, `origen`, `destinos`, `cliente_id?`, `fecha_hora_servicio?`, `tipo_servicio`. **Solo lectura, para la descarga del expediente; no es superficie de captura.**
- En `operacion.yaml`: `crearViaje` (alta mínima), `listarBitacora`/`registrarEntradaBitacora` (eso es el **histórico**, E8-T13), `abrirIncidencia`/`estadias`. **Ninguna operación de escritura de ficha técnica.**

---

> **Todas las brechas de esta sección son de contrato, no de decisión.** Cada una cita la DEC que ya fijó el comportamiento. Lo pendiente es que `pf-pkg-contracts` publique la superficie que materialice la decisión.

## Brecha 1 — Escritura/edición de la ficha técnica (BLOQUEANTE a nivel de contrato)

- **Decisión de negocio (tomada):** la ficha es editable y admite captura incremental — guardar incompleto y completar después (DEC-011 #1, DEC-043 #3/#4). La captura es del operador interno (DEC-008). **No es un pendiente de producto.**
- **Qué pide la tarea:** capturar y editar la ficha técnica con esa semántica incremental (`E1-HU-006`). Definición de terminado de E8-T12: prueba de agregar/quitar destinos y contenedores.
- **Qué existe hoy en el contrato:** solo lectura (`obtenerViajeInterno`) y la proyección de descarga (`FichaTecnicaDescarga`). No hay `PUT`/`PATCH`/`POST` de ficha en `bff` ni en `operacion` (verificado en `v0.1.0-tracer.20`). El alta `crearViaje` solo acepta `{origen, destinos, cliente_id?, fecha_hora_servicio?, tipo_servicio?}` y no edita después.
- **Qué falta exactamente:** una operación del `bff` que escriba y edite la ficha del viaje (datos generales + grupos de destinos y contenedores + referencias de GPS), con edición parcial.
- **Impacto en el spec:** condiciona Requirements 3 (completo), 4.1, 5.2, 5.3 y 6.1 a la publicación del contrato. La UI opera en solo lectura y representa el estado de brecha hasta que exista la operación.
- **Propuesta de resolución:** solicitud a `pf-pkg-contracts` para publicar la superficie de escritura de ficha en el `bff` (espejo de `operacion`, E1-T5), con edición parcial. No se rellena en el frontend.

## Brecha 2 — Contenedores (0..N)

- **Decisión de negocio (tomada):** un viaje tiene 0, 1 o varios contenedores; `Contenedores` es grupo repetible 0..N (DEC-012 #2). **No es un pendiente de producto.**
- **Qué pide la tarea:** grupo repetible de 0..N contenedores en la ficha (`E1-HU-006`).
- **Qué existe hoy en el contrato:** ningún schema del viaje modela contenedores (`ViajeInterno`, `FichaTecnicaDescarga` ni entradas de escritura). Verificado en `v0.1.0-tracer.20`.
- **Qué falta exactamente:** representación de contenedores en el contrato de ficha (lectura y escritura).
- **Impacto en el spec:** condiciona Requirement 5.3. La UI compone el grupo repetible con primitivas, pero no puede persistirlo sin contrato.
- **Propuesta de resolución:** incluir contenedores en la solicitud de contrato de ficha (Brecha 1). No se inventa el campo.

## Brecha 3 — Lista de GPS del catálogo registrado

- **Decisión de negocio (tomada):** la lista de GPS se elige de un **catálogo registrado** (~100 dispositivos), no se teclea; operación la asigna; es referencia sin ingestión en vivo (DEC-012 #3, **DEC-047 #2**). DEC-047 #2 **cerró** el antiguo punto abierto "catálogo vs. tecleo". **No es un pendiente de producto.**
- **Qué pide la tarea:** elegir la lista de GPS del catálogo registrado (`E1-HU-006`).
- **Qué existe hoy en el contrato:** el `bff` no expone ni la lectura del catálogo de GPS ni la asociación de GPS a la ficha. Verificado en `v0.1.0-tracer.20`.
- **Qué falta exactamente:** operación del `bff` para listar el catálogo de GPS (espejo de `catalogos`) y superficie para referenciar los GPS elegidos en la ficha.
- **Impacto en el spec:** condiciona Requirement 6. La UI compone el selector con primitivas, pero no tiene de dónde leer ni dónde persistir.
- **Propuesta de resolución:** solicitud de contrato para la lectura del catálogo de GPS y su referencia desde la ficha (parte de Brecha 1). Los **valores reales** del catálogo los aporta Operación (DEC-017/DEC-047); eso es dato de carga, no decisión pendiente.

## Brecha 4 — Tracto del cliente (texto libre)

- **Decisión de negocio (tomada):** el tracto es del cliente y se captura como **texto libre** (DEC-011 #2, DEC-044 #6, DEC-017 para marca). **No es un pendiente de producto.**
- **Qué pide la tarea:** capturar el tracto del cliente como texto libre (`E1-HU-006`).
- **Qué existe hoy en el contrato:** no hay campo de tracto en la lectura ni en ninguna entrada de escritura del contrato verificado.
- **Qué falta exactamente:** campo de tracto (texto libre) en el contrato de escritura de ficha.
- **Impacto en el spec:** condiciona Requirement 4. La UI compone el `Input`/`Textarea`, pero no puede persistir sin contrato.
- **Propuesta de resolución:** incluir el campo de tracto en la solicitud de contrato de ficha (Brecha 1).

---

## Pendientes de producto (los únicos reales; dueño Operación)

Estos **sí** están genuinamente abiertos en el repo de contexto. No son brechas de contrato: son decisiones que Operación aún debe dar. No se inventan en el frontend.

### P-1 — Campos exactos de la `unidad` en la ficha

- **Qué pide la tarea:** mostrar la `unidad` de la escolta (vehículo + custodios) derivada de la asignación, sin recaptura.
- **Qué está abierto:** el **conjunto exacto de campos** que la ficha muestra para la `unidad` (económico, placas, tipo, ¿otros?) es el punto abierto `propuesta-modelo-bitacora-v1.md §4 #8`, con **dueño Operación**. La sección "Unidad" de esa propuesta está marcada "**Propuesta, pendiente de validación**". Citado en la historia técnica E8-T12.
- **Impacto en el spec:** Requirement 2.2 y tarea 4. La escolta se muestra con los campos disponibles en `Unidad` del contrato; el conjunto definitivo se fija cuando Operación lo defina.
- **Propuesta de resolución:** pregunta abierta a Operación antes de fijar la vista de detalle de la unidad en la ficha.

### P-2 — Obligatoriedad por campo

- **Qué está abierto:** la **obligatoriedad de cada campo** incluido en V1 —incluidos los de cada destino y contenedor— es el punto abierto `propuesta-modelo-bitacora-v1.md §4 #7` y la Nota de DEC-012 ("Sigue abierto: obligatoriedad de los campos dentro de cada destino/contenedor"). Casi todos los campos de la ficha están marcados "Por confirmar" en §2 de la propuesta.
- **Impacto en el spec:** la validación local de la captura (Requirement 3, 5) aplica solo las obligatoriedades confirmadas. Mientras no se definan, la UI no fuerza obligatorios no decididos (coherente con DEC-043: la ficha admite datos faltantes).
- **Propuesta de resolución:** pregunta abierta a Operación/Producto sobre obligatoriedad por campo.

---

## Brechas de UI (no bloqueantes; se resuelven por composición)

`@ai27-tech/ui@0.2.0-beta.6` ofrece `Form`/`FormSection`/`FormRow`/`FormActions`, `Input`/`Textarea`/`Select`/`Checkbox`/`Radio`/`Switch`/`FormField`, `Button`, `Table`, `Modal`, `Toast`, `Badge`, `Card`, `Pagination`, `FilterTable`, `Navbar`, `Sidebar`, `Tooltip`.

- **Sin componente de grupo repetible dedicado:** los grupos de destinos (1..N) y contenedores (0..N) se componen con `FormRow` + primitivas + `Button` para agregar/quitar. Mismo criterio que E8-T11.
- **Sin multiselección de catálogo dedicada:** la selección de GPS se compone con `Table`/`Card` + `Checkbox`.

En ambos casos, un control dedicado sería una **solicitud a la librería**, no un componente local nuevo.

---

## Preguntas abiertas

**A Contratos (brecha de superficie, decisión ya tomada):**

1. ¿Cuándo publicará `pf-pkg-contracts` la superficie de **escritura/edición de ficha técnica** en el `bff` (Brechas 1–4: ficha editable incremental, contenedores, GPS de catálogo, tracto texto libre)? El comportamiento ya está decidido (DEC-011, DEC-012, DEC-043, DEC-044, DEC-047); solo falta materializarlo en el contrato. Sin ella, E8-T12 no puede implementar su capacidad central.

**A Producto / Operación (decisión genuinamente pendiente):** 2. ¿Cuáles son los **campos exactos** de la `unidad` que la ficha debe mostrar (P-1)? 3. ¿Qué **obligatoriedad por campo** aplica en V1 (P-2), incluidos destinos y contenedores?
