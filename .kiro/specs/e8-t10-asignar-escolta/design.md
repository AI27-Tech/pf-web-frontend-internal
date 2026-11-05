# Design Document

## Overview

Diseño de **asignar la escolta (unidades) al viaje** (E8-T10): la acción del Jefe Operativo que reserva una o más `unidades` del roster sobre un viaje `APROBADO` y lo lleva a `ASIGNADO`, montada sobre la pantalla de detalle de E8-T8 sin introducir patrones nuevos. Reutiliza las capas ya establecidas (`lib/contracts` → `lib/api` → `features/viajes/detalle`, TanStack Query, `@ai27-tech/ui`) y su derivación de acciones desde la máquina de estados.

E8-T10 añade cuatro piezas acotadas:

1. **Capa de contrato de asignación (brecha aislada)**: tipos `AsignacionEntrada`, `Asignacion`, `Unidad`/`PaginaUnidades` para las operaciones esperadas del `bff` (Opción A).
2. **Wrappers de dominio**: `listarUnidades(token)` (roster) y `asignarEscolta(id, { unidades_ids }, token)` contra la única puerta HTTP del `bff`.
3. **Selección del roster**: un formulario que lista unidades, permite selección múltiple y muestra la **disponibilidad** (`Unidad.activa`, único dato de estado que el roster expone en V1), sin gatear. La aptitud detallada **no** está en la lista del roster.
4. **Cableado en la presentación**: la acción `ASIGNADO` abre la selección del roster en `Modal`; al confirmar refleja `ASIGNADO` sin recarga manual.

La derivación de acciones desde la máquina de estados y la clasificación de 409/401, `Toast` y delegación de sesión ya existen en E8-T8 y E8-T10 **no los reescribe**.

### Hecho de contrato verificado (fundamento del diseño)

Desde `APROBADO`, la máquina de estados generada (`@ai27-tech/contracts/estados`) publica la arista hacia `ASIGNADO` (entre otras). La asignación es esa transición, realizada por una escritura atómica que reserva la escolta.

La superficie de asignación existe en **`operacion`** (`@ai27-tech/contracts@0.1.0-tracer.15`, `operacion.gen.ts`):

```
POST  /api/v1/viajes/{id}/asignacion   (asignarRecursos)    body AsignacionEntrada { unidades_ids: Id[] } → Asignacion { viaje_id, unidades: UnidadAsignada[] }
PATCH /api/v1/viajes/{id}/asignacion   (reasignarRecursos)  body ReasignacionEntrada { unidades_ids, motivo }   (FUERA DE ALCANCE: reasignación)
GET   /api/v1/unidades                 (listarUnidades)     → PaginaUnidades { items: Unidad[], cursor_siguiente }
```

**Forma de `Unidad` en V1 (verificado en `operacion.gen.ts`):** `{ id, vehiculo_id, custodios_ids, tipo (solo lectura: patrulla/moto), activa }`. La **lista del roster NO expone aptitud** (apto/no apto/desconocido). La aptitud informativa por átomo solo aparece en el **resultado** de la asignación, en `Asignacion.unidades[] → UnidadAsignada.aptitud[] (AptitudRecurso)`. Consecuencia de diseño: en la lista de selección se muestra `activa`; la aptitud, si acaso, en el resultado tras reservar. No se inventa aptitud en la lista.

**Brecha CERRADA (`v0.1.0-tracer.18`):** el `bff` ya proyecta `asignarRecursos` y `listarUnidades` con nombres y esquemas **espejo de `operacion`**. El frontend subió a tracer.18 y reemplazó los tipos esperados locales por los generados (`@ai27-tech/contracts/openapi/bff`); los wrappers apuntan a la superficie real. Los mocks (MSW) se conservan porque emulan fielmente el contrato del `bff` para las pruebas.

**Decisiones de contrato acordadas el 2026-10-22 (dueño de `pf-pkg-contracts`), aplicadas en tracer.18:**

- **409 con un único código `recurso_no_disponible`.** `asignarRecursos` no distingue carrera de falta de recursos; no existe `recurso_no_apto`. El frontend muestra un solo mensaje de rechazo y NO inventa la distinción (escalada a Operación como propuesta aparte, no bloquea).
- **Respuesta `Asignacion`, no `ViajeDetalle`.** La asignación devuelve `Asignacion { viaje_id, unidades: UnidadAsignada[] }` con aptitud informativa por átomo. El refresco a `ASIGNADO` se logra invalidando la query del detalle (segundo GET), no recomponiendo `ViajeDetalle` en el `bff`.

Consecuencia de diseño: NO se escribe tabla de transiciones ni lista de "acciones de aprobado"; Asignar sale de `accionesDesde('APROBADO')`. El único añadido de lógica es la **selección del roster** y las **operaciones esperadas** aisladas.

## Architecture

### Vista de capas (añadidos de E8-T10 marcados con +)

```
routes/_private/viajes/$id.tsx        (ruta TanStack ya existente de E8-T8; sin cambios)
        │  usa
        ▼
features/viajes/detalle/
  ├─ accionesTransicion.ts            (E8-T8; sin cambios: APROBADO ya deriva ASIGNADO)
  ├─ useDetalleViaje.ts               (+ query listarUnidades + mutación asignarEscolta; invalida la lectura)
  ├─ asignacionForm.tsx               (+ selección múltiple del roster: Table/Checkbox + Badge disponibilidad (activa) + Button)
  └─ DetalleViaje.tsx                 (+ acción ASIGNADO abre AsignacionForm en Modal; estados sin-disponibles/carrera)
        │  usa
        ▼
lib/api/
  ├─ unidades.ts                      (+ listarUnidades(token) → Unidad[])
  └─ viajeDetalle.ts                  (+ asignarEscolta(id, { unidades_ids }, token) → ViajeDetalle/Asignacion)
        │  usa
        ▼
lib/api/client.ts                     (única puerta HTTP contra el bff — sin cambios)
        │  tipos
        ▼
lib/contracts/
  ├─ unidades.ts                      (+ tipo Unidad, PaginaUnidades: brecha de contrato aislada)
  └─ viajeDetalle.ts                  (+ AsignacionEntrada, Asignacion: brecha de contrato aislada)
```

### Capa de contrato (brecha aislada, Opción A)

Mientras el `bff` no publique las operaciones, los tipos viven como **contrato esperado** en `lib/contracts`, documentados como brecha abierta y con un único punto de acoplamiento al `components['schemas']` del `bff` cuando exista. Se reutiliza, cuando aplique, la forma ya definida en `operacion.gen.ts` (misma semántica: `unidades_ids`, `Asignacion`, `PaginaUnidades`) para que el reemplazo sea mecánico.

- `AsignacionEntrada = { unidades_ids: string[] }` (ISO de `Id`).
- `Unidad`: la ficha mínima del roster que el contrato ya expone (id, etiqueta del vehículo/tripulación, aptitud informativa). Los campos exactos se toman de `PaginaUnidades`/`Unidad` del contrato; los faltantes se reportan (punto abierto Operación).

### Wrappers de dominio

- `listarUnidades(accessToken)`: `GET` del roster esperado; devuelve `Unidad[]` (desempaqueta `PaginaUnidades`). Propaga `ApiError`; reutiliza el `client` y el manejo de 401.
- `asignarEscolta(id, { unidades_ids }, accessToken)` (wrapper; mapea a `asignarRecursos` del contrato): `POST /viajes/{id}/asignacion`; devuelve **`Asignacion`**. Tras resolver, el hook invalida `['viaje', id]` para traer el viaje en `ASIGNADO`. Reutiliza `clasificarConflicto` de E8-T8 para el 409 `recurso_no_disponible` (código único; sin distinguir carrera).

### Presentación

- `AsignacionForm` (nuevo archivo de feature, **no** componente de librería): compone `Table`/`FilterTable` + `Checkbox` para selección múltiple, `Badge` para la **disponibilidad** (`activa`, único dato de estado del roster en V1), y `Button` para confirmar. **No** pinta aptitud en la lista (el contrato no la da ahí). Confirmar deshabilitado sin selección (Req 2.5) y durante el envío (Req 5.2). Estados: cargando roster (Req 5.1), sin disponibles (Req 4.1), carrera (Req 4.2/4.3).
- `DetalleViaje` (ampliado): la acción `ASIGNADO` abre `AsignacionForm` en `Modal`. Al confirmar con éxito, invalida `['viaje', id]` y refleja `ASIGNADO` (Req 3.2). Defensa en profundidad: no envía asignación vacía. **Un solo mensaje** para el 409 `recurso_no_disponible` (Req 4.2, recarga roster y estado); 401 al AppShell; éxito/error con `Toast` reutilizados de E8-T8. El estado **"sin disponibles"** se detecta antes de enviar con la lista (Req 4.1), distinto del 409.

### Componentes de `@ai27-tech/ui` (verificado, sin crear nada nuevo)

`Table` / `FilterTable` (roster + selección), `Checkbox` (selección múltiple), `Badge` (disponibilidad `activa`), `Modal` (contenedor), `Button`, `Toast` / `ToastContainer`, `Card`, `FormField`, `Pagination`. Todos existen en `@ai27-tech/ui@0.2.0-beta.6`. No se crea ningún componente; cualquier afordancia faltante se reporta como brecha.

## Testing Strategy

- **Wrappers** (`tests/viajes/asignarEscolta.test.ts`, `tests/viajes/listarUnidades.test.ts`): ruta/verbo/cuerpo correctos; `asignarEscolta` devuelve `Asignacion`; clasificación del 409 `recurso_no_disponible`; propagación de 404/otros como `ApiError`.
- **Selección** (`tests/viajes/AsignacionForm.test.tsx`): confirmar deshabilitado sin selección y durante envío; se muestra `activa` y **no** se muestra aptitud en la lista (no está en el contrato); `activa` no bloquea la selección; selección múltiple.
- **UI de decisión** (`tests/viajes/Asignacion.test.tsx`): Asignar visible solo en `APROBADO`; e2e feliz (`APROBADO → ASIGNADO`); **un solo mensaje** para el 409 `recurso_no_disponible`; estado **"sin disponibles" previo al envío** (roster vacío, distinto del 409); no se puede enviar asignación parcial/vacía; la disponibilidad no bloquea.
- **Mocks (MSW)**: handler del roster (`listarUnidades`) con un caso "sin disponibles" (lista vacía o todas `activa: false`) y otro con unidades (mezcla de `activa`); handler de `asignarEscolta` que valida cuerpo (400 si vacío), 404 si no existe, **409 `recurso_no_disponible` forzable**, y devuelve **`Asignacion`** (con `unidades[].aptitud` informativa).

Pruebas con Vitest + Testing Library + MSW bajo `tests/`, reflejando `src/`.

## Definición de terminado (de la historia técnica)

- Prueba del **rechazo de la reserva**: el 409 `recurso_no_disponible` muestra un mensaje de rechazo, y el estado **"sin disponibles" previo al envío** (roster vacío) se ve distinto porque lo detecta el frontend antes de enviar. Nota: la historia pedía "dos mensajes distintos para los dos motivos del 409", pero el contrato colapsa carrera y falta-de-recursos en un solo código (decisión 2026-10-22); la distinción fina queda escalada a Operación.
- Prueba de que **no se puede enviar una asignación parcial/vacía**.
- Prueba de que la asignación **no se bloquea por aptitud**. Nota: en V1 el roster no expone aptitud en la lista (solo `activa`), así que esta prueba se cubre verificando que ni `activa` ni la aptitud del resultado impiden seleccionar/enviar.
