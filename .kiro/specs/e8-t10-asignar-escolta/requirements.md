# Requirements Document

## Introduction

**Asignar la escolta (unidades) al viaje** (E8-T10) es la acción del Jefe Operativo que reserva una o más `unidades` del roster sobre un viaje ya `APROBADO`, para dejarlo listo para salir sin sobrevender una unidad. Satisface `E1-HU-004`: asignar **una o más `unidades`** (paquetes vehículo + custodios); una unidad ya reservada en la ventana no aparece disponible; la asignación es **atómica**; al asignar el viaje pasa a `ASIGNADO`. La **aptitud no gatea** en V1 (DEC-043/DEC-055): no hay guarda "No apto" hacia `APTO_PARA_SALIDA` (paso opcional); la aptitud es solo informativa.

Se monta sobre la pantalla de detalle del panel interno (E8-T8) y reutiliza sus capas (`lib/contracts` → `lib/api` → `features/viajes/detalle`, TanStack Query, `@ai27-tech/ui`) y su patrón de acciones derivadas de la máquina de estados. La asignación es la acción disponible cuando el viaje está en `APROBADO`; no se escribe el estado a mano.

Principios rectores: las acciones ofrecidas se **derivan de la máquina de estados generada** (`@ai27-tech/contracts/estados`), no de una lista escrita en el portal. Los componentes de interfaz provienen de `@ai27-tech/ui`; esta tarea **no crea componentes nuevos**. El formulario pide **una o más unidades completas** (el paquete incluye su tripulación): **no existe un selector de custodios separado** ni de `patrulla` como recurso distinto de la unidad (DEC-044 / ADR 31).

> **Nota de contrato (brecha CERRADA — `v0.1.0-tracer.18`):** el `bff` ya proyecta la superficie de asignación: `asignarRecursos` (`POST /api/v1/viajes/{id}/asignacion`, 200 → `Asignacion`, 409 `recurso_no_disponible`) y `listarUnidades` (`GET /api/v1/unidades` → `PaginaUnidades`), con esquemas espejo de `operacion` (`AsignacionEntrada`, `Asignacion`, `UnidadAsignada`, `AptitudRecurso`, `Unidad`, `PaginaUnidades`). El frontend consume **tracer.18**; los tipos esperados locales se reemplazaron por los generados (`@ai27-tech/contracts/openapi/bff`). Decisiones aplicadas: (a) el 409 usa **un único código `recurso_no_disponible`** (la carrera no se distingue; escalada a Operación aparte); (b) la respuesta de asignar es **`Asignacion`** (con aptitud informativa por átomo), no `ViajeDetalle`; el detalle se refresca invalidando su query. `reasignarRecursos` (`PATCH`) queda fuera de alcance.

## Glossary

- **Detalle_UI**: el sistema de interfaz que renderiza el detalle del viaje (`DetalleViaje`, E8-T8). Es el "sistema" al que refieren los criterios.
- **Escolta**: una o más `unidades` del roster reservadas para un viaje.
- **Unidad**: paquete pre-armado del roster = un vehículo + sus custodios (ADR 31). No se recapturan sus custodios: la unidad se elige completa.
- **Roster**: catálogo de `unidades` disponibles, administrado por `operacion`. Se lista con la operación esperada `listarUnidades`.
- **Asignar**: reservar la escolta sobre un viaje en `APROBADO`; transición `APROBADO → ASIGNADO` en la misma escritura atómica.
- **Disponibilidad (`activa`)**: dato booleano por unidad que el **roster** sí expone en V1 (`Unidad.activa`). Indica si la unidad está activa para asignarse. Se muestra en la lista de selección.
- **Aptitud informativa**: dato detallado por átomo (vehículo/custodios: apto / no apto / desconocido). **El contrato NO la expone en la lista del roster en V1** (`listarUnidades` solo da `activa`); solo aparece en el **resultado** de la asignación (`Asignacion`/`UnidadAsignada`). En V1 **no bloquea** la asignación (DEC-043/DEC-055): es solo dato, nunca guarda.
- **Rechazo de la reserva (409 `recurso_no_disponible`)**: el servidor no pudo reservar la escolta porque alguna unidad dejó de estar disponible. El contrato usa **un solo código** para esto; incluye tanto la carrera (otro jefe reservó antes) como la falta de recursos. El frontend no los distingue (el dominio los colapsa).
- **Sin disponibles (previo al envío)**: el roster no devuelve ninguna unidad asignable. Lo detecta el frontend con la lista, antes de enviar; es distinto del 409 porque no viene del servidor al asignar.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance/rol y reenvía a `operacion`.

## Requirements

### Requirement 1: Asignar visible solo en viajes aprobados

**User Story:** Como Jefe Operativo, quiero ver la acción de asignar escolta solo cuando el viaje está en `APROBADO`, para no intentar reservar unidades sobre un viaje que no lo admite.

#### Acceptance Criteria

1. WHEN el viaje está en `APROBADO`, THE Detalle_UI SHALL ofrecer Asignar escolta (`ASIGNADO`) como acción, derivada de `TRANSICIONES_VIAJE` / `puedeTransicionar`.
2. WHEN el viaje NO está en `APROBADO`, THE Detalle_UI SHALL NOT ofrecer la acción de asignar escolta (las acciones se derivan del estado actual, sin tratamiento especial).
3. THE Detalle_UI SHALL derivar esta acción de la máquina de estados generada, sin una lista de estados escrita a mano.

### Requirement 2: Selección de una o más unidades del roster

**User Story:** Como Jefe Operativo, quiero elegir una o más unidades completas del roster, para armar la escolta sin teclear custodios ni patrullas por separado.

#### Acceptance Criteria

1. WHEN el Jefe Operativo abre la asignación, THE Detalle_UI SHALL listar las `unidades` disponibles del roster a través de la operación esperada `listarUnidades` (aislada en la capa de contrato; servida por mock mientras el `bff` no la publique).
2. THE Detalle_UI SHALL permitir seleccionar **una o más** unidades completas (paquete vehículo + custodios), sin un selector de custodios ni de patrulla separado.
3. THE Detalle_UI SHALL mostrar en la lista la **disponibilidad** de cada unidad (`Unidad.activa`, único dato de estado que el roster expone en V1), sin usarla como guarda que bloquee la selección o el envío (DEC-043/DEC-055).
4. THE Detalle_UI SHALL NOT mostrar en la lista del roster la aptitud detallada (apto/no apto/desconocido): el contrato de `listarUnidades` no la expone en V1 y no se inventa un dato que el contrato no entrega.
5. THE Detalle_UI SHALL mantener la confirmación de la asignación **deshabilitada** mientras no haya al menos una unidad seleccionada (no se envían asignaciones vacías ni parciales).

### Requirement 3: Asignación atómica y transición a Asignado

**User Story:** Como Jefe Operativo, quiero que la asignación se confirme de una sola vez y deje el viaje en `ASIGNADO`, para dejarlo listo para salir.

#### Acceptance Criteria

1. WHEN el Jefe Operativo confirma la escolta seleccionada, THE Detalle_UI SHALL enviar `asignarRecursos` al `bff` (`POST /viajes/{id}/asignacion`) con el cuerpo `{ unidades_ids }` (forma de `AsignacionEntrada`).
2. WHEN el `bff` confirma la asignación con `Asignacion`, THE Detalle_UI SHALL reflejar el viaje en estado `ASIGNADO` y recalcular las acciones ofrecidas sin recarga manual, invalidando la query del detalle (segundo GET), ya que `Asignacion` no trae el `ViajeDetalle` completo.
3. WHERE la respuesta `Asignacion` trae la aptitud informativa por átomo (`UnidadAsignada.aptitud`), THE Detalle_UI SHALL poder mostrarla en el resultado como dato, sin usarla como guarda (es el único momento en que el contrato expone aptitud).
4. THE Detalle_UI SHALL aislar la forma de wire y la ruta de esta operación en un único punto de cambio, de modo que publicar el endpoint real del `bff` sea un reemplazo mecánico.

### Requirement 4: Rechazos de la asignación

**User Story:** Como Jefe Operativo, quiero entender por qué no pude asignar, distinguiendo lo que el frontend puede detectar antes de enviar de lo que el servidor rechaza.

> **Decisión de contrato (DEC-043/DEC-055, acordada con el dueño de `pf-pkg-contracts` el 2026-10-22):** `asignarRecursos` define en el 409 **un único código**, `recurso_no_disponible`; el conflicto por carrera cae en ese mismo código. No existe `recurso_no_apto` (la aptitud no gatea). Por lo tanto el frontend **no puede** distinguir "carrera" de "falta de recursos" a partir del 409: el dominio los colapsa. La distinción fina queda escalada a Operación como propuesta aparte (candidata a DEC) y **no bloquea** E8-T10.

#### Acceptance Criteria

1. WHEN el roster no devuelve unidades asignables (lista vacía o todas inactivas), THE Detalle_UI SHALL mostrar un estado **"sin unidades disponibles" previo al envío** y mantener la confirmación deshabilitada. (Lo detecta el frontend con la lista, no el 409.)
2. IF el `bff` responde `409` con código `recurso_no_disponible`, THEN THE Detalle_UI SHALL mostrar **un único mensaje de rechazo de la reserva** (p. ej. "alguna unidad dejó de estar disponible; recarga e intenta"), sin romper la vista, y recargar el roster y el estado del viaje.
3. THE Detalle_UI SHALL NOT intentar distinguir "carrera" de "falta de recursos" a partir del 409: el contrato expone un solo código y el frontend no inventa una distinción que el dominio no da.
4. IF el `bff` responde `401`, THEN THE Detalle_UI SHALL delegar el manejo de sesión al flujo del AppShell en lugar de mostrar un error genérico.

### Requirement 5: Señales de carga, confirmación y error

**User Story:** Como Jefe Operativo, quiero señales claras del resultado de la asignación, para saber qué ocurrió.

#### Acceptance Criteria

1. WHILE el roster se está cargando, THE Detalle_UI SHALL mostrar un estado de **carga** del roster (no una lista vacía ambigua).
2. WHILE una asignación está en curso, THE Detalle_UI SHALL deshabilitar la confirmación para evitar envíos dobles.
3. WHEN la asignación se confirma con éxito, THE Detalle_UI SHALL mostrar un aviso de éxito con `Toast`.
4. IF la asignación falla por un error distinto de 401/409, THEN THE Detalle_UI SHALL informar el fallo con `Toast` sin romper la vista.

## Brechas y supuestos a verificar

1. **Operaciones del `bff` (brecha CERRADA en tracer.18).** El `bff` ya expone `asignarRecursos` y `listarUnidades` como proyección espejo de `operacion`. El frontend consume tracer.18 y usa los tipos generados; ya no hay tipos esperados locales ni cliente a mano.
2. **Forma de wire (real, tracer.18).** `POST /viajes/{id}/asignacion` (`asignarRecursos`) con cuerpo `AsignacionEntrada { unidades_ids: string[] }`; respuesta **`Asignacion { viaje_id, unidades: UnidadAsignada[] }`** (NO `ViajeDetalle`). Roster vía `GET /unidades` (`listarUnidades`) → `PaginaUnidades { items: Unidad[], cursor_siguiente }`. El refresco del viaje a `ASIGNADO` se resuelve invalidando la query del detalle (segundo GET).
3. **Código de 409 (real, tracer.18).** `asignarRecursos` expone **un único código**: `recurso_no_disponible` (la carrera cae en el mismo). No existe `recurso_no_apto`. El frontend muestra un solo mensaje de rechazo y no inventa la distinción carrera vs falta-de-recursos (escalada a Operación como propuesta aparte).
4. **Campos exactos de la ficha de `unidad`.** El contrato de `Unidad` (V1) expone `id`, `vehiculo_id`, `custodios_ids`, `tipo` (solo lectura: `patrulla`/`moto`) y `activa`. **La lista del roster NO expone aptitud** (apto/no apto/desconocido): eso solo está en `Asignacion`/`UnidadAsignada` tras reservar. Las etiquetas legibles del vehículo y los custodios dependen de resolver sus `id` contra `catalogos`; qué columnas exactas se muestran es un punto abierto con dueño Operación (`propuesta-modelo-bitacora-v1.md` §4 #8). Se muestra lo que el contrato ya expone; cualquier campo faltante se reporta, no se inventa.
5. **Componentes.** `@ai27-tech/ui@0.2.0-beta.6` publica `Table`/`FilterTable`, `Checkbox`, `Modal`, `Button`, `Badge`, `Toast`/`ToastContainer`, `Card`, `FormField`, `Pagination` — suficiente para el roster con selección múltiple, estados y confirmación. **Ningún componente nuevo.** Afordancia faltante se reporta como brecha.
6. **Aptitud informativa.** No gatea (DEC-043/DEC-055). Además, en V1 **no está disponible en la lista del roster** (el contrato solo da `activa`); cuando aparece (en el resultado de la asignación) se muestra como dato, nunca como guarda. Si el `bff` publicara aptitud en el listado, se incorpora sin cambiar la regla de que no bloquea.

## Fuera de alcance (V1)

- **Reasignar** la escolta (`reasignarRecursos` / `PATCH .../asignacion`, con motivo auditado): esta tarea cubre la **primera** asignación (`APROBADO → ASIGNADO`). La reasignación es una tarea aparte.
- **Selector de custodios o de patrulla** separado de la unidad (DEC-044 / ADR 31): la unidad se elige completa.
- **Guarda de aptitud** que bloquee `APTO_PARA_SALIDA` (no gatea en V1, DEC-043/DEC-055).
- **Crear viaje con asignación** en el mismo acto (eso es E8-T11, creación por Operación).
- **Edición del roster** (altas/bajas de unidades): la administra `operacion`; aquí solo se **lista** para elegir.
- Creación de componentes de interfaz nuevos: se usan los de `@ai27-tech/ui`; toda necesidad no cubierta se reporta como brecha.
