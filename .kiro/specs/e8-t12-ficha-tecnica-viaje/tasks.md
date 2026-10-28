# Implementation Plan: Ficha técnica del viaje (E8-T12)

## Overview

Las tareas implementan el flujo funcional de E8-T12. Las decisiones de negocio están cerradas (DEC-100..104 / ADR 36) y la forma contractual ya fue publicada en `@ai27-tech/contracts@0.1.0-tracer.21`. El primer corte ejecuta la navegación y la lectura de la ficha; la escritura, los grupos repetibles, GPS y escolta quedan como tareas siguientes, consumiendo únicamente las operaciones publicadas.

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

La tarea 1 (contrato y UI) ya está verificada. Las tareas 2 a 5 construyen la lectura y la representación; las tareas 6 a 10 implementan captura/edición sobre el contrato ya publicado; las tareas 12 a 14 verifican comportamiento, ausencia de campos excluidos, accesibilidad y contrato.

## Tasks

## Prerrequisito breve

- [x] 1. Verificar el contrato y la librería compartida instalados. **Resultado (contra `@ai27-tech/contracts@0.1.0-tracer.21`, tag `v0.1.0-tracer.21`, y `@ai27-tech/ui@0.2.0-beta.6`):** disponible la lectura `obtenerViajeInterno` (`GET /api/v1/viajes/{id}/detalle` → `ViajeDetalle`/`ViajeInterno`: `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`) y la escolta (`asignarRecursos`/`listarUnidades`). **El contrato vigente ya publica** escritura/edición de ficha, contenedores, catálogo de GPS, `tipo_servicio` en lectura, `arribo` en destino y el schema `Tracto`; la implementación frontend se ejecuta sobre esa superficie publicada. UI: sin grupo repetible ni multiselección dedicados; se componen con primitivas.

- [x] 1b. **Re-verificar al retomar:** confirmado el tracer `v0.1.0-tracer.21` publicado y consumido por `package.json`/`pnpm-lock.yaml` el 2026-10-28. Las tareas de escritura ya no están bloqueadas por publicación; permanecen pendientes de implementación frontend y de datos reales del catálogo GPS.

## Implementación

- [x] 2. Integrar la entrada de navegación a la ficha técnica desde el detalle del viaje y aplicar la experiencia de acceso para `monitorista`, reutilizando sesión y navegación existentes. Tratar ficha e histórico como superficies distintas.
- [x] 3. Implementar la lectura del detalle (`obtenerViajeInterno`) y su representación con estados diferenciados de carga, vacío, error y datos presentes, consumiendo únicamente la operación contractual verificada.
- [ ] 4. Implementar la sección de escolta en **solo lectura**, derivada de la asignación (`asignarRecursos`/`listarUnidades`), sin recaptura de custodios ni patrulla. Representar las `unidades` con los atributos de `Unidad`/`UnidadAsignada` (económico/placas vía vehículo, `tipo` `patrulla`|`moto` readOnly, custodios por referencia). El antiguo P-1 quedó resuelto: se reutilizan esos schemas, sin uno nuevo de escolta.
- [ ] 5. Implementar la representación de los destinos de la lectura conservando orden, y asegurar por construcción y por prueba que **no** existe campo, control ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, ni campos de posición o señal.
- [ ] 6. Implementar el formulario de captura/edición (datos generales) tras la frontera de adaptador, precargado con los datos conocidos, con validación de reglas confirmadas y preservación de datos ante error.
- [ ] 7. Implementar el grupo repetible de **destinos** (agregar/quitar, 1..N) conservando orden y cardinalidad, compuesto con primitivas de `@ai27-tech/ui` (`FormRow` + `Input` + `Button`), sin componente local.
- [ ] 8. Implementar el grupo repetible de **contenedores** (`0..N`, cero válido) con los campos decididos `{economico, placas, sello, color}` (texto libre opcional; elemento `{}` vacío se descarta), compuesto con primitivas, sin componente local.
- [ ] 9. Implementar la captura del **tracto del cliente** como objeto `{placas, economico, marca, modelo, color}` (texto libre opcional por campo), no como una sola cadena. Coordinar con E8-T11 porque también afecta `CrearViajeEntrada`. Implementar el selector de **lista de GPS** del catálogo registrado por composición (`Table`/`Card` + `Checkbox`), mostrando **solo dispositivos activos**, como referencia `gps_ids[]`.
- [ ] 10. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales y orqueste el guardado de la ficha mediante **`PATCH`** (no `PUT`), con semántica de colecciones por reemplazo (arreglo sin un elemento lo elimina; `[]` vacía la lista; propiedad omitida no se toca; `tracto: null` borra el tracto), control de estado pendiente y bloqueo de doble guardado, clasificando éxito, rechazo, sesión expirada y respuesta insuficiente.
- [ ] 11. Incorporar etiquetas, asociación de errores, foco y estados accesibles conforme a los componentes compartidos disponibles, incluyendo las acciones de agregar/quitar de los grupos repetibles y la selección de GPS por teclado.

## Verificación

- [ ] 12. Crear pruebas unitarias de: lectura y estados, escolta derivada sin recaptura, grupos repetibles de destinos y contenedores (orden, cardinalidad, cero contenedores), selección de GPS sin texto libre, adaptador y clasificación de errores, y bloqueo de doble guardado.
- [ ] 13. Crear pruebas que demuestren la **definición de terminado de E8-T12**: que `cuenta espejo` y `clave_amago` no existen en formularios, DOM, payloads ni contratos V1; y que se pueden agregar y quitar destinos y contenedores. Para el guardado, cubrir el camino condicionado a Brecha 1 con dobles del contrato cuando exista, y el modo solo lectura cuando no exista.
- [ ] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas, y marcar como brecha toda superficie que no exista o no permita demostrar el resultado requerido (escritura de ficha, contenedores, GPS, tracto). No resolver una brecha inventando comportamiento.

## Notes

### Notas de brechas

- **Decisiones cerradas (DEC-100..104 / ADR 36):** tracto como objeto `{placas, economico, marca, modelo, color}` (C-1, supera DEC-011 #2); contenedor `{economico, placas, sello, color}` `0..N` (C-2); ficha 100% opcional sin guardas de ficha en V1 (C-3); `tipo_servicio` solo lectura (C-4); catálogo de GPS con selector solo activos, sin gatear exclusividad (C-5); escritura por `PATCH`. Ya no hay pendientes de producto: P-1 y P-2 quedaron resueltos.
- **Estado histórico de publicación:** el contrato publicado (`tracer.21`) el baseline histórico no exponía `obtenerFicha`/`guardarFicha`, `Tracto`, `Contenedor`, `gps_ids`, el catálogo `GET /api/v1/gps`, `tipo_servicio` en lectura ni `arribo` en destino. La capacidad de escritura queda pendiente de implementación frontend. La UI construye lectura y prepara la captura tras un adaptador aislado; no inventa endpoints ni campos. Detalle en `BRECHAS.md`.
- **Coordinación con E8-T11:** el schema `Tracto` también afecta `CrearViajeEntrada`. Alinear la forma del tracto entre creación y ficha.
- **Datos de Operación:** los valores reales del catálogo de GPS (DEC-047) siguen pendientes de entrega; no bloquean la forma, sí la operación real del selector.
- **Brechas de `@ai27-tech/ui`:** sin grupo repetible ni multiselección dedicados; se componen con primitivas. Un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución

Decisiones de negocio y contrato cerrados. Primer corte implementado y validado: navegación para `monitorista`, ruta privada `/viajes/:id/ficha`, lectura combinada de detalle/ficha, estados carga/vacío/error y handler MSW. Pendiente: escolta derivada, formulario/adaptador PATCH, grupos repetibles, GPS, accesibilidad y pruebas específicas.
