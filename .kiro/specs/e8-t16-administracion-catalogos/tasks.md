# Implementation Plan: Administración de catálogos (E8-T16)

## Overview

Las tareas implementan el comportamiento funcional de E8-T16 (administración de los cuatro catálogos: vehículos, custodios, catálogos de tipo y contratos/SLA) sobre las capas ya establecidas en `pf-web-frontend-internal` (`lib/contracts` → `lib/api` → `features`, TanStack Router y Query, `@ai27-tech/ui`), reemplazando el `StubPage` de E5 sobre la misma ruta `/_private/catalogos`. La brecha de contrato queda aislada en una sola capa y servida con mocks, sin inventar superficies del `bff` ni llamar a `catalogos` directo. La desactivación se modela como `PATCH` de estado, nunca como `DELETE`, y la aptitud se presenta como estatus informativo que nunca compuerta. La tarea 1 es un prerrequisito de verificación, no una invitación a rellenar contrato.

## Task Dependency Graph

`1 → 2–13 → 14–17`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "dependsOn": [1] },
    { "id": 3, "tasks": [14, 15, 16, 17], "dependsOn": [2] }
  ]
}
```

La tarea 1 verifica el contrato y la librería y aísla la brecha. Las tareas 2 a 13 implementan la ruta, los wrappers, el hook, las funciones puras, la lista, los formularios por catálogo, el diálogo de desactivación, los estados de interfaz y los mocks. Las tareas 14 a 17 verifican comportamiento, propiedades, integración con mocks y contrato.

## Tasks

## Prerrequisito

- [ ] 1. Verificar el contrato y la librería instalados y aislar la brecha. **Hecho verificado (contra `@ai27-tech/contracts@0.1.0-tracer.20` y `@ai27-tech/ui@0.2.0-beta.6`, contexto `ai27-platform-context@ba1abc3`):** el `bff` **no expone** la administración de catálogos —solo `GET/POST /api/v1/clientes` y `GET /api/v1/unidades`—; la superficie CRUD completa (`vehiculos`, `custodios`, `catalogos-tipo/{tipo}`, `contratos`, `sla`, `.../aptitud`) vive solo en `catalogos.yaml`, que el frontend no consume directo. Crear `src/lib/contracts/catalogos.ts` con los tipos de wire esperados (ver `design.md`: `Vehiculo`/`VehiculoEntrada`/`VehiculoCambios`/`PaginaVehiculos`; `Custodio`/`CustodioEntrada`/`CustodioCambios`/`PaginaCustodios`; `ValorCatalogo`/`ValorCatalogoEntrada`/`ValorCatalogoCambios`; `Contrato`/`ContratoEntrada`/`ContratoCambios`; `Sla`/`SlaEntrada`/`SlaCambios`; enum cerrado `coche`/`moto` y enum `activo`/`inactivo`; SLA al mínimo verificado `id`/`contrato_id` sin inventar campos), como punto único de reemplazo cuando el `bff` publique el contrato de administración. No escribir clientes a mano como autoridad paralela ni llamar a `catalogos` directo. Registrar en `BRECHAS.md` la brecha central (administración no expuesta por el `bff`) y las condicionantes (valores reales de Operación, contenido del SLA, modelado de líneas de transporte y lista de GPS). _Requisitos: 3.5, 4.4, 5.3; Propiedad: 10_

## Implementación

- [ ] 2. Reemplazar el `StubPage` existente `src/routes/_private/catalogos.tsx` (E5) por la pantalla real de administración sobre la **misma ruta** `/_private/catalogos`, con `createFileRoute`, reutilizando la sesión y la navegación del shell del panel interno (E8-T4) y mostrando los cuatro catálogos administrables. _Requisitos: 1.1, 1.3_
- [ ] 3. Implementar `src/lib/api/catalogos.ts`: wrappers de las operaciones esperadas (listar/crear/actualizar de vehículos, custodios, valores de catálogo de tipo y contratos/SLA, más `aptitud` en GET), delegando en `request` de `src/lib/api/client.ts`, con clasificación de `403` (autorización insuficiente), `404` (referencia inexistente) y `409` (conflicto) vía `src/lib/api/errors.ts`, sin reglas de dominio ni llamada directa a `catalogos`. _Requisitos: 3.5, 4.4, 5.3; Propiedades: 8, 10_
- [ ] 4. Implementar `src/features/catalogos/useCatalogos.ts`: `useQuery` por catálogo (`retry: false`; estados de carga, vacío y error diferenciados) y `useMutation` de alta, edición y desactivación que invalidan la lista del catálogo correspondiente al confirmar; la desactivación se envía como `PATCH` de estado (`activo → inactivo`), nunca como `DELETE`. _Requisitos: 2.2, 2.3, 5.2; Propiedades: 1, 9_
- [ ] 5. Implementar la función pura `src/features/catalogos/estadoAptitud.ts`: traduce un valor a su presentación de estado (`activo`/`inactivo`) y aptitud (`apto`/`no apto`) como estatus informativo, sin derivar habilitación de acciones a partir de la aptitud (la aptitud nunca compuerta). _Requisitos: 2.5; Propiedad: 3_
- [ ] 6. Implementar la función pura `src/features/catalogos/valoresSeleccionables.ts`: `seleccionables(valores)` devuelve exactamente los valores `activos` para alimentar los selectores donde el catálogo se ofrece, sin decidir disponibilidad. _Requisitos: 2.1; Propiedad: 2_
- [ ] 7. Implementar `src/features/catalogos/CatalogoList.tsx`: lista filtrable y paginada con `FilterTable` y `Pagination`, estado y aptitud de cada valor con `Badge`, estados de carga y de catálogo vacío diferenciados, y los gestos de crear/editar/desactivar; ramifica `esNoAutorizado` (delegar al AppShell/flujo de sesión) antes del error genérico. _Requisitos: 2.1, 2.4, 2.5, 10.2_
- [ ] 8. Implementar `src/features/catalogos/VehiculoForm.tsx` (`E5-HU-021`): Económico obligatorio, Tipo de vehículo `coche`/`moto` del enum cerrado del contrato (sin texto libre), Placas sujeto a confirmación, Marca como texto libre (no catálogo) y aptitud informativa; sin administrar la unidad (vive en el roster de `operacion`). _Requisitos: 6.1, 6.2, 6.3, 6.4; Propiedades: 4, 5_
- [ ] 9. Implementar `src/features/catalogos/CustodioForm.tsx` (`E5-HU-022`): Nombre obligatorio, referencia **opcional** al usuario de `identidad` por identificador (no exigida para crear), sin clasificar por nivel ni tipo, y aptitud informativa. _Requisitos: 7.1, 7.2, 7.3; Propiedad: 5_
- [ ] 10. Implementar `src/features/catalogos/ValorCatalogoForm.tsx` (`E5-HU-023`): alta y edición de un valor por `{tipo}` capturando catálogo, valor/nombre y estado; líneas de transporte asociadas a un cliente existente; zonas de riesgo como lista simple sin geometría; sin ofrecer "tipos de custodia" ni "kit de seguridad". _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
- [ ] 11. Implementar `src/features/catalogos/ContratoForm.tsx` (`E5-HU-024`): `cliente_id` existente obligatorio (cargado por `GET /api/v1/clientes`), Identificador de contrato y Vigencia sujetos a confirmación, SLA al mínimo verificado sin inventar campos, contrato tratado como solo informativo en V1. _Requisitos: 9.1, 9.2, 9.3, 9.4; Propiedad: 6_
- [ ] 12. Implementar `src/features/catalogos/DesactivarDialog.tsx`: `Modal` de confirmación que advierte "valor en uso" sin bloquear; al confirmar envía el `PATCH` de estado; no presenta la desactivación como eliminación ni como alteración de los registros históricos. _Requisitos: 5.1, 5.4, 5.5, 5.6; Propiedad: 1_
- [ ] 13. Incorporar estados de carga, vacío y error con reintento, bloqueo de doble envío por operación, avisos de éxito y de rechazo (`403`, valor en uso, cliente inexistente) con `Toast`, delegación de `401`/sesión expirada al flujo del AppShell, y etiquetas/foco/estados accesibles de los componentes compartidos. _Requisitos: 10.1, 10.2, 10.3, 10.4; Propiedades: 7, 9_
- [ ] 14. Ampliar los mocks MSW en `src/mocks/data.ts` y `src/mocks/handlers.ts` para los cuatro catálogos: listado, alta, edición y desactivación; caso de valor en uso (desactiva sin bloquear y sigue presente marcado `inactivo`); caso `403` por rol no `administrador`; alta de contrato con `cliente_id` inexistente (rechazo); catálogo vacío y estado de carga diferenciados. _Requisitos: 5.4, 9.2, 2.2, 2.3; Propiedades: 1, 6, 8_

## Verificación

- [ ] 15. Crear pruebas unitarias de las funciones puras (`estadoAptitud`, `valoresSeleccionables`, validación de obligatoriedad y de referencia) y de la clasificación de errores del wrapper (`403`/`404`/`409`); verificar que la desactivación construye un `PATCH` de estado y nunca un `DELETE`, y que la presentación no ofrece afordancias fuera de alcance (Marca como catálogo, nivel/tipo de custodio, geometría de zonas, "tipos de custodia"/"kit de seguridad", campos de SLA no verificados). _Requisitos: 2.5, 5.5, 5.6, 6.2; Propiedades: 1, 2, 3, 5_
- [ ] 16. Crear pruebas basadas en propiedades (PBT) con una librería del ecosistema (p. ej. `fast-check`), **sin** implementar PBT desde cero: una por cada una de las 10 Correctness Properties del `design.md`, con mínimo 100 iteraciones cada una y etiqueta "Feature: e8-t16-administracion-catalogos, Property {n}: {texto}". _Propiedades: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_
- [ ] 17. Crear pruebas de integración con mocks (MSW): listar/crear/editar/desactivar por catálogo; desactivar un valor en uso que sigue presente marcado `inactivo`; `403` por rol no `administrador` delegado al AppShell; alta de contrato con `cliente_id` inexistente rechazada; catálogo vacío frente a estado de carga. Luego ejecutar `typecheck`, `lint`, build mock y la suite completa contra las versiones instaladas, y marcar en `BRECHAS.md` cualquier superficie que no exista o no permita demostrar el resultado requerido. _Requisitos: 1.2, 2.2, 2.3, 5.4, 9.2; Propiedades: 1, 6, 8, 10_

## Notes

### Notas de brechas

- **Brecha central (BLOQUEANTE):** la administración (crear/editar/desactivar) de los cuatro catálogos **no está expuesta por el `bff`** en `v0.1.0-tracer.20` (solo `GET/POST /api/v1/clientes` y `GET /api/v1/unidades`); la superficie CRUD completa vive en `catalogos.yaml`, que el frontend no consume directo. Se construye contra el contrato esperado, aislado en `src/lib/contracts/catalogos.ts` y servido con mocks; reemplazo mecánico (cambio de importación a los tipos generados de `@ai27-tech/contracts/openapi/bff`) cuando el `bff` publique. **Desactivar = `PATCH` de estado, no se inventa `DELETE`.** Ver `BRECHAS.md` (Brecha 1).
- **Valores reales pendientes de Operación (DEC-017):** se construye la administración; los datos de prueba son ilustrativos, no autoritativos, y no se inventan valores. Ver `BRECHAS.md` (Brecha 2).
- **Contenido del SLA pendiente:** el modelo funcional del SLA no está definido; la UI representa el SLA al mínimo verificado (`id`, `contrato_id`) sin inventar campos. Ver `BRECHAS.md` (Brecha 3).
- **Modelado de líneas de transporte y lista de GPS pendiente (DEC-047):** se especifican como catálogos de tipo administrables sin asumir el modelado final; el scope por cliente de las líneas y la regla de creación por Coordinador las aplica el `bff`/backend, no el frontend. Ver `BRECHAS.md` (Brecha 4).
- **Brechas de `@ai27-tech/ui`:** verificar las primitivas contra `@ai27-tech/ui@0.2.0-beta.6`; toda afordancia faltante se compone con primitivas y se registra como solicitud a la librería, nunca como componente local. Ver `BRECHAS.md` (Brecha 5).
- **Mensajes:** verificar textos y códigos aprobados para autorización insuficiente (`403`), valor en uso, organización cliente inexistente y operación de administración no disponible.
