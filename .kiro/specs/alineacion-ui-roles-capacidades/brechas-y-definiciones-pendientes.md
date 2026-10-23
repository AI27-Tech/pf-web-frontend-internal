# Brechas y definiciones pendientes

## Propósito

Este documento exterioriza las brechas que deben resolverse para alinear la UI interna con los roles, capacidades, alcances y contratos de AI27.

**Este documento no define reglas de producto.** Registra hechos, contradicciones, información faltante y acciones necesarias. Ninguna entrada pendiente debe convertirse en código como si fuera una decisión.

## Cómo leer los estados

| Estado               | Significado                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `CONFIRMADO`         | La regla está respaldada por una fuente vigente y puede implementarse, si el contrato lo permite.                     |
| `PENDIENTE_PRODUCTO` | Falta una decisión de Product Management.                                                                             |
| `BRECHA_CONTRACTUAL` | La capacidad existe en el dominio o contexto, pero falta publicarla en el BFF o en el tracer que consume el frontend. |
| `BRECHA_FRONTEND`    | La regla o contrato existe, pero la UI actual no lo representa correctamente.                                         |
| `BLOQUEADA`          | No debe implementarse hasta resolver otra entrada.                                                                    |
| `POR_VERIFICAR`      | La información existe en una fuente potencial, pero debe confirmarse contra la versión vigente.                       |

## Fuentes consultadas

- `repos/ai27-platform-context/docs/hu/E4-HU-018-usuarios-roles-y-alcances.md`
- `repos/ai27-platform-context/.kiro/steering/decision-log.md`, DEC-045 y DEC-060
- `repos/pf-pkg-contracts/contracts/openapi/bff.yaml`
- `repos/pf-pkg-contracts/contracts/openapi/_comunes.yaml`
- `repos/pf-pkg-contracts/contracts/openapi/operacion.yaml`
- `repos/pf-web-frontend-internal/src/routes/_private.tsx`
- `repos/pf-web-frontend-internal/src/components/layout/navigationConfig.ts`
- `repos/pf-web-frontend-internal/src/features/viajes/detalle/DetalleViaje.tsx`
- `repos/pf-web-frontend-internal/src/lib/api/errors.ts`
- `repos/pf-web-frontend-internal/src/mocks/data.ts`
- `repos/pf-web-frontend-internal/src/mocks/handlers.ts`

---

## A. Brechas de definición de Producto

### PM-001 — Facultades de Supervisor y Coordinador sobre aprobación, rechazo y cierre

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿`supervisor` y `coordinador` pueden aprobar solicitudes, rechazarlas o cerrar viajes, o esas acciones son exclusivas de `jefe_operativo` y `administrador`?
- **Hecho relacionado:** DEC-060 describe a `jefe_operativo` como responsable de aceptar/rechazar, asignar y cerrar. E4-HU-018 conserva explícitamente esta pregunta como pendiente.
- **Impacto UI:** determina qué botones aparecen en `DetalleViaje` y qué rutas/acciones deben probarse por rol.
- **Información requerida:** matriz definitiva por acción y rol, incluyendo si existe diferencia entre facultad funcional y alcance.
- **Acción necesaria:** Product Management debe decidir y registrar la decisión en el `decision-log`.
- **No hacer aún:** no agregar permisos para Supervisor/Coordinador por inferencia.

### PM-002 — Transiciones permitidas para Monitorista

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿Qué transiciones de la máquina puede ejecutar `monitorista` dentro de los viajes de sus unidades?
- **Hecho relacionado:** el contexto permite operar avance, ETA, estadías y notas, pero no entrega una matriz completa de destinos de estado.
- **Impacto UI:** la máquina de estados determina transiciones posibles, pero no determina por sí sola qué rol puede ejecutarlas.
- **Información requerida:** tabla `rol × transición`, incluyendo causas obligatorias y acciones terminales.
- **Acción necesaria:** Product Management debe cerrar la matriz con Operación.
- **Dependencia:** bloquea el filtrado completo de acciones en el detalle.

### PM-003 — Facultades exactas del Administrador

- **Estado:** `POR_VERIFICAR`
- **Pregunta:** cuando el contexto dice que `administrador` hereda las facultades funcionales con alcance global, ¿puede ejecutar todas las acciones operativas o existen excepciones?
- **Hecho relacionado:** E4-HU-018 y DEC-060 describen herencia funcional y alcance global.
- **Impacto UI:** afecta la visibilidad de acciones de viajes, asignación, conversaciones, emergencias, reportes y administración.
- **Información requerida:** lista de excepciones, si existen.
- **Acción necesaria:** confirmar que la herencia de facultades aplica también a las acciones que el BFF publique.

### PM-004 — Tratamiento de pantallas sin contrato BFF

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** para una capacidad funcional sin operación BFF publicada, ¿la UI debe ocultarla, mostrar “no disponible” o mantenerla solo en modo mock?
- **Áreas afectadas:** conversaciones, emergencias, catálogos, reportes, administración, dashboards y algunas operaciones de bitácora.
- **Impacto UI:** determina la navegación, las rutas y el comportamiento de los stubs existentes.
- **Información requerida:** política común para capacidades sin contrato.
- **Acción necesaria:** definir una política por fase: desarrollo mock, integración BFF y producción.

### PM-005 — Audiencia Cliente en el frontend interno

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿una sesión con `Audiencia Cliente` debe ser rechazada por completo en este frontend o debe redirigirse al portal cliente?
- **Hecho relacionado:** el cliente usa el portal self-service y no el panel interno.
- **Impacto UI:** guardas de ruta, destino de redirección y pruebas de audiencia.
- **Información requerida:** URL/canal del portal cliente o comportamiento esperado si no está disponible.
- **Acción necesaria:** definir la frontera entre ambos frontends.

### PM-006 — Canal de trabajo de Ejecutivo y Reacción

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿`ejecutivo` y `reaccion` usarán este mismo frontend interno o tendrán una aplicación/carril separado?
- **Hecho relacionado:** Ejecutivo es solo conversación; Reacción es solo emergencias.
- **Impacto UI:** determina si se implementan guardas y navegación dentro de este repo o si solo se bloquea el acceso.
- **Información requerida:** aplicación objetivo y navegación esperada para cada audiencia/rol.
- **Acción necesaria:** Producto y Arquitectura deben definir el canal.

### PM-007 — Vínculo Monitorista–unidad

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿Quién asigna unidades a un Monitorista y cuándo se hace efectivo el vínculo?
- **Alternativas todavía abiertas:** alta/edición de usuario, roster de unidades, asignación operativa u otro mecanismo.
- **Impacto UI:** bandeja de viajes, dashboard, filtros de alcance, fixtures de pruebas y actualización de sesión.
- **Información requerida:** dueño del vínculo, momento de vigencia, auditoría y comportamiento ante cambios.
- **Acción necesaria:** cerrar la definición antes de construir UI de administración de alcance.

### PM-008 — Override conversacional de Supervisor y Coordinador

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿Qué conversaciones puede recuperar, liberar, transferir o atender un Supervisor/Coordinador?
- **Hecho relacionado:** el monitoreo se acota por `unidad`, pero las conversaciones con cliente se acotan por `cliente`.
- **Impacto UI:** navegación, bandejas, acciones de conversación y pruebas de alcance.
- **Información requerida:** relación entre unidades supervisadas, clientes y conversaciones sujetas a override.
- **Acción necesaria:** definir la regla de override y registrarla antes de implementarla.

### PM-009 — Aplicación de cambios de rol y alcance durante una sesión

- **Estado:** `PENDIENTE_PRODUCTO`
- **Pregunta:** ¿Cuándo debe reflejarse un cambio de rol, alcance o estado de usuario en una sesión ya iniciada?
- **Hecho relacionado:** E4-HU-020 contempla aplicación efectiva de cambios, pero el frontend necesita el comportamiento observable.
- **Impacto UI:** refresco de sesión, navegación, invalidación de queries y pérdida de capacidades ya abiertas.
- **Información requerida:** máximo de tiempo, evento/acción de refresco y comportamiento de una pantalla abierta.
- **Acción necesaria:** confirmar la interacción con el flujo de refresco/revocación de sesión.

---

## B. Brechas de contrato y BFF

### CT-001 — Versión vigente del tracer

- **Estado:** `POR_VERIFICAR`
- **Problema:** el frontend declara `@ai27-tech/contracts@0.1.0-tracer.15`; el checkout local auditado está en tracer.16 y existe referencia remota a tracer.17.
- **Impacto:** no se puede afirmar que los endpoints, schemas o errores leídos localmente sean los que se liberarán.
- **Información requerida:** último tracer publicado y cambios relevantes para BFF/roles.
- **Acción necesaria:** Contratos debe confirmar el tag vigente; después se actualiza el inventario sin cambiar dependencias automáticamente.

### CT-002 — Roster y asignación de escolta en BFF

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** `operacion` define roster/asignación, pero el BFF auditado no expone `listarUnidades` ni `asignarEscolta`.
- **Impacto:** E8-T10 solo puede probarse con wrappers esperados y MSW; no es integración real.
- **Información requerida:** ruta, verbo, request, response, autorización, alcance y errores del BFF.
- **Acción necesaria:** publicar la superficie BFF o confirmar formalmente que la capacidad permanecerá mock durante esta etapa.

### CT-003 — Operaciones de viajes y permisos por rol

- **Estado:** `POR_VERIFICAR`
- **Problema:** el BFF expone listar/detalle/transición/ETA/fecha-hora, pero el wire no expresa qué roles pueden ejecutar cada acción.
- **Hecho relacionado:** el BFF debe autorizar por rol y alcance, y responder `403` cuando corresponda.
- **Impacto:** el frontend puede mostrar una acción por estado, pero no tiene contrato suficiente para construir una matriz completa.
- **Información requerida:** matriz contractual `operación × rol × alcance` y códigos de error.
- **Acción necesaria:** documentar autorización en el contrato BFF o en una fuente normativa enlazada.

### CT-004 — Semántica de `401`, `403` y `404`

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** el contrato distingue respuestas, pero el frontend actual convierte `401` y `403` en la misma clase de error.
- **Impacto:** la UI puede desloguear a un usuario que solo carece de permiso.
- **Información requerida:** política definitiva para `403` y para recursos fuera de alcance: `403` o `404`.
- **Acción necesaria:** alinear `bff.yaml`, `_comunes.yaml`, wrappers y taxonomía de errores.

### CT-005 — Conversaciones y membresía efectiva

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** mensajería contiene conceptos de bandeja, conversación, membresía, reclamo y override, pero no existe una superficie BFF verificada para este frontend.
- **Impacto:** no se puede construir una UI de Ejecutivo/Supervisor/Coordinador con autorización real.
- **Información requerida:** operaciones BFF, alcance por cliente, membresía efectiva, reclamo activo y override.
- **Acción necesaria:** publicar contrato BFF y sus errores antes de activar la capacidad.

### CT-006 — Emergencias y visibilidad contextual

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** Reacción debe ver solo el caso alertado, pero no existe una superficie BFF de emergencia congelada en el contrato auditado.
- **Impacto:** no se puede implementar ni probar visibilidad contextual real.
- **Información requerida:** bandeja, reclamar, transferir, resolver, notas y payload autorizado del caso.
- **Acción necesaria:** congelar contrato BFF de emergencias y definir la relación con Realtime.

### CT-007 — Bitácora, estadías, incidencias y evidencia

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** existen operaciones en servicios internos, pero no todas están publicadas para el navegador a través del BFF.
- **Impacto:** Monitorista/Supervisor/Coordinador no tienen una UI contractual completa para sus facultades.
- **Información requerida:** operaciones, permisos, alcance y comportamiento de adjuntos/descargas.
- **Acción necesaria:** inventariar y publicar las operaciones BFF necesarias, sin llamadas directas a servicios internos.

### CT-008 — Dashboards, reportes y catálogos

- **Estado:** `BRECHA_CONTRACTUAL`
- **Problema:** hay áreas de navegación y stubs, pero las superficies BFF no están completas o no están verificadas.
- **Impacto:** la UI no puede distinguir entre una pantalla real y una placeholder.
- **Información requerida:** indicadores, filtros, alcance, operaciones y autorización por rol.
- **Acción necesaria:** crear specs funcionales separadas cuando los contratos existan.

---

## C. Brechas actuales del frontend

### UI-001 — Guarda de rutas basada solo en sesión

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** la guarda privada comprueba autenticación, pero no audiencia ni capacidad de rol.
- **Impacto:** una persona puede intentar entrar por URL a áreas que no corresponden a su rol.
- **Información requerida:** matriz de rutas confirmada y comportamiento para audiencia Cliente.
- **Acción necesaria:** agregar guardas por audiencia/rol solo para reglas confirmadas.

### UI-002 — Navegación basada en ocultamientos parciales

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** el catálogo actual deja visibles casi todas las áreas y solo oculta algunas para Reacción.
- **Impacto:** Ejecutivo, Reacción y otros roles pueden recibir afordancias ajenas a su capacidad.
- **Información requerida:** decisión PM-004 y matriz de navegación.
- **Acción necesaria:** cambiar a capacidades permitidas, sin usar la navegación como seguridad.

### UI-003 — Acciones del detalle no filtradas por rol

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** las acciones se derivan del estado, pero no se intersectan con una capacidad de rol.
- **Impacto:** Monitorista puede ver acciones de Jefe Operativo, como asignar escolta.
- **Información requerida:** matriz completa de transiciones por rol; para asignación ya existe una regla confirmada.
- **Acción necesaria:** filtrar primero `Asignar escolta`; esperar PM-001/PM-002 para las acciones ambiguas.

### UI-004 — `403` tratado como sesión inválida

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** `kindFromStatus` agrupa `401` y `403` como `noAutorizado`.
- **Impacto:** un usuario válido puede ser deslogueado por una prohibición.
- **Información requerida:** mensaje y estado visual aprobado para prohibición.
- **Acción necesaria:** separar la taxonomía y agregar estado de acceso denegado.

### UI-005 — Mocks no representan autorización por rol

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** el mock emite `monitorista` y permite asignar escolta.
- **Impacto:** las pruebas actuales pueden aparentar que una capacidad está autorizada para el rol equivocado.
- **Información requerida:** fixtures y datos de prueba por rol.
- **Acción necesaria:** usar `jefe_operativo` para el happy path de asignación y responder `403` para Monitorista.

### UI-006 — Falta cobertura de acceso directo y roles

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** las pruebas existentes cubren flujos funcionales, pero no una matriz completa de roles y URLs directas.
- **Impacto:** una acción puede estar oculta en menú y seguir disponible por navegación directa.
- **Información requerida:** matriz de rutas aprobada.
- **Acción necesaria:** agregar pruebas de navegación, guards, acciones y `401/403`.

### UI-007 — Stubs presentados sin política uniforme

- **Estado:** `BRECHA_FRONTEND`
- **Problema:** varias áreas aparecen en navegación aunque su operación BFF no existe.
- **Impacto:** se confunde una pantalla de estructura con una capacidad integrada.
- **Información requerida:** decisión PM-004.
- **Acción necesaria:** ocultar, marcar como no disponible o mantener explícitamente en modo mock.

---

## D. Brechas de datos y pruebas

### QA-001 — Fixtures por rol

- **Estado:** `BRECHA_FRONTEND`
- **Falta:** sesiones de prueba para los ocho roles V1.
- **Acción necesaria:** crear fixtures reutilizables con el rol correcto y sin duplicar la lógica JWT.

### QA-002 — Datos de alcance por unidad

- **Estado:** `BRECHA_CONTRACTUAL`
- **Falta:** casos U1/U2 visibles para Monitorista y U3 fuera de alcance; unión de unidades para Supervisor/Coordinador.
- **Acción necesaria:** acordar datos de prueba con BFF/Operación y verificar que el BFF entregue el conjunto autorizado.

### QA-003 — Datos de alcance por cliente

- **Estado:** `BRECHA_CONTRACTUAL`
- **Falta:** Ejecutivo con clientes A/B y conversación de C fuera de alcance.
- **Acción necesaria:** definir fixtures de membresía efectiva cuando mensajería/BFF publique la operación.

### QA-004 — Caso contextual de Reacción

- **Estado:** `BRECHA_CONTRACTUAL`
- **Falta:** caso de emergencia reclamado/asignado a Reacción y visibilidad limitada a ese caso.
- **Acción necesaria:** congelar contrato y datos de emergencia antes de probar la UI.

### QA-005 — Integración contra BFF real

- **Estado:** `BLOQUEADA`
- **Falta:** ambiente o handlers de integración que validen rol, alcance y errores reales.
- **Acción necesaria:** después de publicar contratos, ejecutar pruebas de integración con al menos Jefe Operativo, Monitorista, Supervisor, Ejecutivo, Reacción y Administrador.

---

## Resumen de información requerida

| Información                            | Responsable requerido           | Bloquea                     |
| -------------------------------------- | ------------------------------- | --------------------------- |
| Tracer vigente                         | Contratos                       | Cambios contractuales       |
| Matriz de acciones por rol             | Product Management              | Filtro completo de acciones |
| Transiciones exactas de Monitorista    | Product Management/Operación    | Detalle de viaje            |
| Tratamiento de stubs sin BFF           | Product Management              | Navegación                  |
| Canal de Cliente, Ejecutivo y Reacción | Product Management/Arquitectura | Guardas y navegación        |
| Vínculo Monitorista–unidad             | Product Management/Operación    | Alcance y administración    |
| Override conversacional                | Product Management/Mensajería   | Conversaciones              |
| Operaciones BFF faltantes              | Contratos/BFF                   | Integración real            |
| Fixtures de alcance                    | BFF/Operación/Mensajería        | Pruebas de autorización     |

Los responsables anteriores son áreas que deben participar; no representan owners asignados. Cada decisión deberá registrar owner, estado y fecha antes de convertirse en regla.

## Orden recomendado para cerrar brechas

1. Confirmar tracer vigente.
2. Confirmar matriz de acciones por rol.
3. Resolver `401`/`403` y `404` fuera de alcance.
4. Corregir asignación de escolta en UI y mocks.
5. Definir política de pantallas sin BFF.
6. Publicar superficies BFF faltantes.
7. Crear fixtures de alcance.
8. Implementar guards, navegación y acciones restantes.
9. Ejecutar pruebas contra BFF real.

## Criterio de cierre de este documento

Una brecha se puede retirar de este documento solo cuando exista:

- una decisión registrada, si era una definición de Producto;
- un contrato publicado y versionado, si era una brecha BFF;
- una implementación probada, si era una brecha frontend;
- datos de prueba reproducibles, si era una brecha de QA.

No se debe eliminar una brecha porque una pantalla tenga un mock funcional.
