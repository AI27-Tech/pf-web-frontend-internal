# Implementation Plan: Ficha técnica del viaje (E8-T12)

## Overview

Las tareas implementan el flujo funcional de E8-T12 sobre lo que el contrato verificado sí expone (lectura del detalle y escolta), dejan la captura/edición de la ficha como un punto de escritura aislado **condicionado a las brechas** de `BRECHAS.md`, y no inventan superficie contractual. La verificación de contrato y librería (tarea 1) ya está hecha: existe lectura, no existe escritura de ficha ni contenedores/GPS/tracto.

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

- [x] 1. Verificar el contrato y la librería compartida instalados. **Resultado (contra `@ai27-tech/contracts@0.1.0-tracer.20`, tag `v0.1.0-tracer.20`, y `@ai27-tech/ui@0.2.0-beta.6`):** disponible la lectura `obtenerViajeInterno` (`GET /api/v1/viajes/{id}/detalle` → `ViajeDetalle`/`ViajeInterno`: `id`, `estado`, `origen`, `destinos[{nombre, numero_envio}]`, `cliente_id?`, `fecha_hora_servicio?`, `eta_estimado?`) y la escolta (`asignarRecursos`/`listarUnidades`). **No disponible:** escritura/edición de ficha (Brecha 1), contenedores (Brecha 2), lista de GPS de catálogo (Brecha 3) y campo de tracto (Brecha 4). UI: sin grupo repetible ni multiselección dedicados; se componen con primitivas. Pendiente de producto P-1: campos exactos de la `unidad`.

## Implementación

- [ ] 2. Integrar la entrada de navegación a la ficha técnica desde el detalle del viaje y aplicar la experiencia de acceso para `monitorista`, reutilizando sesión y navegación existentes. Tratar ficha e histórico como superficies distintas.
- [ ] 3. Implementar la lectura del detalle (`obtenerViajeInterno`) y su representación con estados diferenciados de carga, vacío, error y datos presentes, consumiendo únicamente la operación contractual verificada.
- [ ] 4. Implementar la sección de escolta en **solo lectura**, derivada de la asignación (`asignarRecursos`/`listarUnidades`), sin recaptura de custodios ni patrulla. Representar las `unidades` con los campos disponibles y dejar marcado como P-1 el conjunto exacto de campos pendiente de Operación.
- [ ] 5. Implementar la representación de los destinos de la lectura conservando orden, y asegurar por construcción y por prueba que **no** existe campo, control ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, ni campos de posición o señal.
- [ ] 6. Implementar el formulario de captura/edición (datos generales) tras la frontera de adaptador, precargado con los datos conocidos, con validación de reglas confirmadas y preservación de datos ante error. El punto de escritura queda **deshabilitado** hasta resolver la Brecha 1.
- [ ] 7. Implementar el grupo repetible de **destinos** (agregar/quitar, 1..N) conservando orden y cardinalidad, compuesto con primitivas de `@ai27-tech/ui` (`FormRow` + `Input` + `Button`), sin componente local. **Condicionado a Brecha 1 para persistir.**
- [ ] 8. Implementar el grupo repetible de **contenedores** (0..N, cero válido) compuesto con primitivas, sin componente local. **Condicionado a Brecha 2 (el contrato no modela contenedores) y Brecha 1.**
- [ ] 9. Implementar la captura del **tracto del cliente** como texto libre (`Input`/`Textarea`), sin catálogo. **Condicionado a Brecha 4 y Brecha 1.** Implementar el selector de **lista de GPS** del catálogo registrado por composición (`Table`/`Card` + `Checkbox`), sin texto libre y como referencia. **Condicionado a Brecha 3.**
- [ ] 10. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales verificados y orqueste el guardado de la ficha, con control de estado pendiente y bloqueo de doble guardado, clasificando éxito, rechazo, sesión expirada y respuesta insuficiente. El punto de escritura **permanece como brecha** hasta que el contrato publique la operación; mientras tanto, la pantalla opera en solo lectura y representa el estado de brecha, sin inventar endpoint ni payload.
- [ ] 11. Incorporar etiquetas, asociación de errores, foco y estados accesibles conforme a los componentes compartidos disponibles, incluyendo las acciones de agregar/quitar de los grupos repetibles y la selección de GPS por teclado.

## Verificación

- [ ] 12. Crear pruebas unitarias de: lectura y estados, escolta derivada sin recaptura, grupos repetibles de destinos y contenedores (orden, cardinalidad, cero contenedores), selección de GPS sin texto libre, adaptador y clasificación de errores, y bloqueo de doble guardado.
- [ ] 13. Crear pruebas que demuestren la **definición de terminado de E8-T12**: que `cuenta espejo` y `clave_amago` no existen en formularios, DOM, payloads ni contratos V1; y que se pueden agregar y quitar destinos y contenedores. Para el guardado, cubrir el camino condicionado a Brecha 1 con dobles del contrato cuando exista, y el modo solo lectura cuando no exista.
- [ ] 14. Ejecutar validaciones de accesibilidad y contrato contra las versiones instaladas, y marcar como brecha toda superficie que no exista o no permita demostrar el resultado requerido (escritura de ficha, contenedores, GPS, tracto). No resolver una brecha inventando comportamiento.

## Notes

### Notas de brechas

- **Bloqueo principal (contrato, no decisión):** el comportamiento está decidido (DEC-011, DEC-012, DEC-013, DEC-043, DEC-044, DEC-047), pero el contrato verificado (`tracer.20`) **no** expone todavía escritura/edición de la ficha (Brecha 1), contenedores (Brecha 2), lista de GPS de catálogo (Brecha 3) ni campo de tracto (Brecha 4). La capacidad central de E8-T12 queda condicionada a que Contratos publique esa superficie. La UI construye lectura y representación, prepara la captura/edición tras un adaptador aislado y no inventa endpoints ni campos. Detalle completo en `BRECHAS.md`.
- **Pendiente de producto P-1 (realmente abierto):** los campos exactos de la `unidad` en la ficha están abiertos (`propuesta-modelo-bitacora-v1.md §4 #8`, dueño Operación). La escolta se muestra derivada de la asignación; el conjunto de campos se fija cuando Operación lo defina.
- **Pendiente de producto P-2 (realmente abierto):** la obligatoriedad por campo (incluidos destinos y contenedores) está abierta (`propuesta-modelo-bitacora-v1.md §4 #7`, Nota de DEC-012). La UI solo fuerza obligatorios confirmados; admite datos faltantes mientras tanto (DEC-043).
- **Brechas de `@ai27-tech/ui`:** sin grupo repetible ni multiselección dedicados; se componen con primitivas. Un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución

Pendiente de inicio. El comportamiento ya está decidido en el contexto; lo que falta es la superficie de contrato. Antes de implementar las tareas de escritura (6–10) y sus pruebas (13–14), verificar si las Brechas 1–4 ya se publicaron en el último tracer de `pf-pkg-contracts`; mientras sigan sin publicar, la ejecución se limita a la lectura, la representación y la ausencia verificable de campos excluidos, dejando el punto de escritura como brecha de contrato. Los pendientes P-1 y P-2 son decisiones de Operación y no se resuelven en el frontend.
