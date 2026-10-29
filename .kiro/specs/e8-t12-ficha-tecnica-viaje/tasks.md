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
- [x] 4. Implementar la sección de escolta en **solo lectura**, derivada del roster (`listarUnidades`), sin recaptura de custodios ni patrulla. Se muestran los atributos de `Unidad` (`id`, `tipo` `patrulla`/`moto`, `vehiculo_id`, número de custodios) con estados de carga, vacío y error+reintento. **Nota:** el contrato publica `POST /viajes/{id}/asignacion` (reserva), no un `GET` de asignación; para una vista derivada de solo lectura se usa `listarUnidades`, que es lo que el spec siempre indicó. No hace falta un `GET` de asignación nuevo.
- [x] 5. Implementar la representación de los destinos de la lectura conservando orden (sección "Datos conocidos del viaje", con `arribo`), y asegurar por construcción y por prueba que **no** existe campo, control ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, ni campos de posición o señal.
- [x] 6. Implementar el formulario de captura/edición de los datos de ficha publicados, precargado con los datos conocidos, con validación de reglas confirmadas y preservación de datos ante error.
- [x] 7. Destinos en la ficha: **solo lectura (FUERA DE ALCANCE la edición, DEC-109).** Producto resolvió la brecha por la opción C: en V1 los destinos solo se capturan al crear el viaje (`CrearViajeEntrada`) y la ficha los **conserva y muestra** como colección de solo lectura (tarea 5), no se agregan/editan desde la ficha. El Escenario 2 de `E1-HU-006` se ajustó en consecuencia. No hay cambio de contrato: `FichaTecnicaEntrada` (verificado en `tracer.22`) sigue sin `destinos`, por diseño. La edición de destinos post-creación queda diferida a una fase posterior por el camino B (PATCH de viaje), fuera de E8-T12.
- [x] 8. Implementar el grupo repetible de **contenedores** (`0..N`, cero válido) con los campos decididos `{economico, placas, sello, color}` (texto libre opcional; elemento `{}` vacío se descarta), compuesto con primitivas, sin componente local.
- [x] 9. Implementar la captura del **tracto del cliente** como objeto `{placas, economico, marca, modelo, color}` (texto libre opcional por campo), no como una sola cadena. Coordinar con E8-T11 porque también afecta `CrearViajeEntrada`. Implementar el selector de **lista de GPS** del catálogo registrado por composición (`Table`/`Card` + selección por teclado), mostrando **solo dispositivos activos**, como referencia `gps_ids[]`.
- [x] 10. Implementar el adaptador que transforme el modelo del formulario a los tipos contractuales y orqueste el guardado de la ficha mediante **`PATCH`** (no `PUT`), con semántica de colecciones por reemplazo (arreglo sin un elemento lo elimina; `[]` vacía la lista; propiedad omitida no se toca; `tracto: null` borra el tracto), control de estado pendiente y bloqueo de doble guardado, clasificando éxito, rechazo, sesión expirada y respuesta insuficiente.
- [x] 11. Incorporar etiquetas, asociación de errores y estados accesibles conforme a los componentes compartidos disponibles, incluyendo las acciones de agregar/quitar contenedores y la selección de GPS por teclado.

## Verificación

- [x] 12. Pruebas unitarias de: lectura y estados, escolta derivada sin recaptura (`FichaTecnicaViaje.test.tsx`), grupo repetible de contenedores con cero contenedores (`FichaEditor.test.tsx`), selección de GPS sin texto libre, adaptador y clasificación de errores, y bloqueo de doble guardado (`fichaTecnica.test.ts`/`FichaEditor.test.tsx`). La lectura de destinos (orden + `arribo`) se verifica en `FichaTecnicaViaje.test.tsx`; la edición de destinos no aplica (DEC-109, solo lectura).
- [x] 13. Pruebas de la **definición de terminado de E8-T12**: `cuenta espejo`, `clave_amago`, `kit de seguridad`, posición y señal no existen en DOM ni payloads; agregar/quitar contenedores y cero contenedores. Destinos se demuestran en solo lectura (DEC-109); no se prueba agregar/quitar porque está fuera de alcance V1.
- [x] 14. Validación ejecutada contra `@ai27-tech/contracts@0.1.0-tracer.21`: `tsc --build` en verde y 155 pruebas pasando. Sin brechas abiertas: la de destinos se cerró por decisión de producto (DEC-109, solo lectura), no por contrato.

## Notes

### Notas de brechas

- **Decisiones cerradas (DEC-100..104 / ADR 36):** tracto como objeto `{placas, economico, marca, modelo, color}` (C-1, supera DEC-011 #2); contenedor `{economico, placas, sello, color}` `0..N` (C-2); ficha 100% opcional sin guardas de ficha en V1 (C-3); `tipo_servicio` solo lectura (C-4); catálogo de GPS con selector solo activos, sin gatear exclusividad (C-5); escritura por `PATCH`. Ya no hay pendientes de producto: P-1 y P-2 quedaron resueltos.
- **Contrato publicado:** `tracer.21` expone `obtenerFicha`/`guardarFicha`, `Tracto`, `Contenedor`, `gps_ids`, el catálogo `GET /api/v1/gps`, `tipo_servicio` en lectura y `arribo` en destino. La capacidad de escritura de ficha ya está implementada en el frontend; no se inventan endpoints ni campos. El análisis histórico de la brecha queda en `BRECHAS.md`.
- **Coordinación con E8-T11:** el schema `Tracto` también afecta `CrearViajeEntrada`. Alinear la forma del tracto entre creación y ficha.
- **Datos de Operación:** los valores reales del catálogo de GPS (DEC-047) siguen pendientes de entrega; no bloquean la forma, sí la operación real del selector.
- **Brechas de `@ai27-tech/ui`:** sin grupo repetible ni multiselección dedicados; se componen con primitivas. Un control dedicado sería una solicitud a la librería, no un componente local.

### Estado de ejecución

**Implementado y verificado** contra `tracer.21` (155 pruebas en verde, `tsc --build` limpio): navegación y acceso del monitorista (2), lectura del detalle (3), **escolta derivada en solo lectura vía `listarUnidades`** (4), lectura de destinos con `arribo` y ausencia verificable de campos excluidos (5), formulario de datos generales (6), contenedores `0..N` (8), tracto objeto + selector de GPS activos (9), adaptador PATCH con colecciones por reemplazo y bloqueo de doble guardado (10), accesibilidad de lo compuesto (11), y pruebas (12-14).

**E8-T12 cerrado.** La última pregunta abierta (edición de destinos) la resolvió Producto en **DEC-109**: en V1 los destinos son de **solo lectura** en la ficha. Eso ratifica el estado ya implementado (tarea 5 los lee con `arribo`; tarea 7 ya no requiere escritura). No hay cambio de contrato; `FichaTecnicaEntrada` sigue sin `destinos` por diseño (verificado en `tracer.22`). La edición post-creación queda diferida a una fase posterior por el camino B (PATCH de viaje), fuera de esta tarea.

**Nota sobre `tracer.22`:** esa ola (lectura de incidencias, `listarIncidencias`) pertenece a **E8-T13**, no a T12. T12 permanece en `tracer.21`; no necesita subir de versión.

**Corrección a una nota previa:** una sesión de ejecución anterior citó `obtenerAsignacion`, `actualizarDestinos` y `PATCH /viajes/{id}/destinos` como bloqueos. Esos nombres no existen en el spec ni en el contrato; eran una lectura equivocada. La lectura de escolta nunca estuvo bloqueada: usa `listarUnidades`.
