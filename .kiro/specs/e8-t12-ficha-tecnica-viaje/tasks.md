# Implementation Plan: Ficha técnica del viaje (E8-T12)

## Overview

Las tareas implementan el flujo funcional de E8-T12. Las decisiones de negocio ya están cerradas (DEC-100..104 / ADR 36) y la forma contractual está decidida en el borrador de Contratos. Lo único que falta es **ejecución**: que `pf-pkg-contracts` publique la ola (`obtenerFicha`, `guardarFicha` PATCH, `Tracto`, `Contenedor`, `gps_ids`, catálogo `GET /api/v1/gps`, `tipo_servicio` en lectura, `arribo` en destino) y que el frontend suba su dependencia. Mientras el tracer no se publique, la escritura permanece condicionada y la UI opera en solo lectura; no se inventa superficie local.

## Task Dependency Graph

`1 → 2–11 → 12–14`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "dependsOn": [1] },
    { "id": 3, "tasks": [12, 13, 14], "dependsOn": [2] }
  ]
}
```

La tarea 1 (contrato y UI) ya está verificada. Las tareas 2 a 5 construyen la lectura y los campos que no dependen de escritura. Las tareas 6 a 10 preparan la captura/edición y el guardado tras la frontera de adaptador, quedando **parcialmente bloqueadas** por las brechas hasta que el contrato las publique. Las tareas 12 a 14 verifican comportamiento, ausencia de campos excluidos, accesibilidad y contrato.

## Tasks

## Prerrequisito breve

- [x] 1. Verificar el contrato y la librería compartida instalados. **Resultado (contra `@ai27-tech/contracts@0.1.0-tracer.20`, tag `v0.1.0-tracer.20`, y `@ai27-tech/ui@0.2.0-beta.6`):** disponible la lectura `obtenerViajeInterno` (`GET /api/v1/viajes/{id}/detalle` → `ViajeDetalle`/`ViajeInterno`: `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`) y la escolta (`asignarRecursos`/`listarUnidades`). **Aún no publicado en el contrato:** escritura/edición de ficha, contenedores, catálogo de GPS, `tipo_servicio` en lectura, `arribo` en destino y el schema `Tracto`. La **forma** de todo eso ya está decidida (DEC-100..104 / ADR 36; borrador en `ai27-platform-context/.scratch/e8-t12-ficha-tecnica/BORRADOR-FORMA.md`), pero el tracer que la materializa todavía no existe en `pf-pkg-contracts`. UI: sin grupo repetible ni multiselección dedicados; se componen con primitivas.

- [ ] 1b. **Re-verificar al retomar:** confirmar si `pf-pkg-contracts` ya publicó la ola de ficha (buscar `obtenerFicha`/`guardarFicha` en el último tracer) y si `package.json` subió de `tracer.20` a ese tracer. Mientras no exista, las tareas de escritura (6–10) y sus pruebas (13–14) permanecen bloqueadas por publicación, no por decisión.

## Implementación

- [ ] 2. Integrar la entrada de navegación a la ficha técnica desde el detalle del viaje y aplicar la experiencia de acceso para `monitorista`, reutilizando sesión y navegación existentes. Tratar ficha e histórico como superficies distintas.
- [ ] 3. Implementar la lectura del detalle (`obtenerViajeInterno`) y su representación con estados diferenciados de carga, vacío, error y datos presentes, consumiendo únicamente la operación contractual verificada.
- [ ] 4. Implementar la sección de escolta en **solo lectura**, derivada de la asignación (`asignarRecursos`/`listarUnidades`), sin recaptura de custodios ni patrulla. Representar las `unidades` con los atributos de `Unidad`/`UnidadAsignada` (económico/placas vía vehículo, `tipo` `patrulla`|`moto` readOnly, custodios por referencia). El antiguo P-1 quedó resuelto: se reutilizan esos schemas, sin uno nuevo de escolta.
- [ ] 5. Implementar la representación de los destinos de la lectura conservando orden, y asegurar por construcción y por prueba que **no** existe campo, control ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, ni campos de posición o señal.
- [ ] 6. Implementar el formulario de captura/edición (datos generales) tras la frontera de adaptador, precargado con los datos conocidos, con validación de reglas confirmadas y preservación de datos ante error. El punto de escritura queda **deshabilitado** hasta resolver la Brecha 1.
- [ ] 7. Implementar el grupo repetible de **destinos** (agregar/quitar, 1..N) conservando orden y cardinalidad, compuesto con primitivas de `@ai27-tech/ui` (`FormRow` + `Input` + `Button`), sin componente local. **Condicionado a Brecha 1 para persistir.**
- [ ] 8. Implementar el grupo repetible de **contenedores** (`0..N`, cero válido) con los campos decididos `{economico, placas, sello, color}` (texto libre opcional; elemento `{}` vacío se descarta), compuesto con primitivas, sin componente local. **Condicionado a que se publique el schema `Contenedor` en la ola.**
- [ ] 9. Implementar la captura del **tracto del cliente** como objeto `{placas, economico, marca, modelo, color}` (texto libre opcional por campo), no como una sola cadena. **Condicionado a que se publique el schema `Tracto`; coordinar con E8-T11 porque también afecta `CrearViajeEntrada`.** Implementar el selector de **lista de GPS** del catálogo registrado por composición (`Table`/`Card` + `Checkbox`), mostrando **solo dispositivos activos**, como referencia `gps_ids[]`. **Condicionado a que se publique el catálogo `GET /api/v1/gps`.**
- [ ] 10. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales y orqueste el guardado de la ficha mediante **`PATCH`** (no `PUT`), con semántica de colecciones por reemplazo (arreglo sin un elemento lo elimina; `[]` vacía la lista; propiedad omitida no se toca; `tracto: null` borra el tracto), control de estado pendiente y bloqueo de doble guardado, clasificando éxito, rechazo, sesión expirada y respuesta insuficiente. El punto de escritura **permanece condicionado** hasta que el contrato publique `guardarFicha`; mientras tanto, la pantalla opera en solo lectura, sin inventar endpoint ni payload.
- [ ] 11. Incorporar etiquetas, asociación de errores, foco y estados accesibles conforme a los componentes compartidos disponibles, incluyendo las acciones de agregar/quitar de los grupos repetibles y la selección de GPS por teclado.

## Verificación

- [ ] 12. Crear pruebas unitarias de: lectura y estados, escolta derivada sin recaptura, grupos repetibles de destinos y contenedores (orden, cardinalidad, cero contenedores), selección de GPS sin texto libre, adaptador y clasificación de errores, y bloqueo de doble guardado.
- [ ] 13. Crear pruebas que demuestren la **definición de terminado de E8-T12**: que `cuenta espejo` y `clave_amago` no existen en formularios, DOM, payloads ni contratos V1; y que se pueden agregar y quitar destinos y contenedores. Para el guardado, cubrir el camino condicionado a Brecha 1 con dobles del contrato cuando exista, y el modo solo lectura cuando no exista.
- [ ] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas, y marcar como brecha toda superficie que no exista o no permita demostrar el resultado requerido (escritura de ficha, contenedores, GPS, tracto). No resolver una brecha inventando comportamiento.

## Notes

### Notas de brechas

- **Decisiones cerradas (DEC-100..104 / ADR 36):** tracto como objeto `{placas, economico, marca, modelo, color}` (C-1, supera DEC-011 #2); contenedor `{economico, placas, sello, color}` `0..N` (C-2); ficha 100% opcional sin guardas de ficha en V1 (C-3); `tipo_servicio` solo lectura (C-4); catálogo de GPS con selector solo activos, sin gatear exclusividad (C-5); escritura por `PATCH`. Ya no hay pendientes de producto: P-1 y P-2 quedaron resueltos.
- **Bloqueo restante (solo publicación):** el contrato publicado (`tracer.20`) aún no expone `obtenerFicha`/`guardarFicha`, `Tracto`, `Contenedor`, `gps_ids`, el catálogo `GET /api/v1/gps`, `tipo_servicio` en lectura ni `arribo` en destino. La capacidad de escritura queda condicionada a que Contratos publique la ola y a que el frontend suba la dependencia. La UI construye lectura y prepara la captura tras un adaptador aislado; no inventa endpoints ni campos. Detalle en `BRECHAS.md`.
- **Coordinación con E8-T11:** el schema `Tracto` también afecta `CrearViajeEntrada`. Alinear la forma del tracto entre creación y ficha.
- **Datos de Operación:** los valores reales del catálogo de GPS (DEC-047) siguen pendientes de entrega; no bloquean la forma, sí la operación real del selector.
- **Brechas de `@ai27-tech/ui`:** sin grupo repetible ni multiselección dedicados; se componen con primitivas. Un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución

Decisiones de negocio cerradas; falta ejecución de contrato. Antes de implementar las tareas de escritura (6–10) y sus pruebas (13–14), ejecutar la tarea 1b: verificar si la ola de ficha ya se publicó en el último tracer de `pf-pkg-contracts` y si `package.json` subió a ese tracer. Mientras no se publique, la ejecución se limita a la lectura, la representación de la escolta y la ausencia verificable de campos excluidos; la escritura permanece condicionada por publicación, no por decisión.
