# Requirements Document

Modo mock: datos coherentes entre listado, detalle, roster, emergencias y reportes.

|                 |                                                                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tipo**        | Feature                                                                                                                                                                                                                                                                                    |
| **Flujo**       | Requirements-First. Fase 1 de 3 (requisitos). Diseño y tareas quedan pendientes de aprobar estos requisitos                                                                                                                                                                                |
| **Repositorio** | `pf-web-frontend-internal`                                                                                                                                                                                                                                                                 |
| **Fuente**      | Tarjeta de Trello «Modo mock: datos coherentes entre listado, detalle, roster, emergencias y reportes» (Argos V1 - Sprint 5, lista En Progreso, https://trello.com/c/FmFagybS). Fuente única de esta feature                                                                               |
| **Referencias** | ADR 19 (enum de estados del viaje, `docs/adr/0019-enum-de-estados-del-viaje.md` en `ai27-platform-context`); E8-T14 (cierre del servicio, agregó `VJ-1010`); E8-T18 (emergencia y Reacción); `modo-mock-roles-internos`; `src/mocks/data.ts`, `emergencias.ts`, `roster.ts`, `handlers.ts` |
| **Estado**      | Pendiente de aprobación de requisitos. Preguntas abiertas en la sección final                                                                                                                                                                                                              |

## Introduction

El modo mock (`VITE_ENABLE_MOCKS=true`) simula el `bff` con MSW. Hoy cada pantalla lee un almacén distinto, así que un cambio hecho en una vista no aparece en las demás, y varias vistas referencian viajes o estados que el mock no tiene. Product y QA no pueden recorrer un flujo completo (aprobar, asignar, monitorear, activar emergencia, cerrar) sin encontrar datos contradictorios.

Esta feature unifica los datos del mock en un único almacén de viajes del que derivan todas las vistas. No cambia el comportamiento del frontend real, los tipos del contrato ni la lógica de permisos.

## Glossary

- **Almacén de viajes**: fuente única de datos del mock para viajes. Contiene el resumen, el detalle, la ficha técnica, el expediente, la reserva de escolta, las condiciones activas, las incidencias y las emergencias de cada viaje.
- **Vista derivada**: pantalla o respuesta del mock (listado, filtro, detalle, roster, bandeja de emergencias, reportes, dashboard) que se calcula a partir del almacén y no guarda copia propia.
- **Ficha técnica**: datos de captura de la bitácora de un viaje. Puede estar vacía (aún no capturada) o capturada.
- **Expediente (`descarga`)**: documento de descarga del viaje, con origen y destino propios.
- **Reserva de escolta**: asignación de unidades a un viaje. Una unidad reservada en un viaje activo no puede reservarse en otro.
- **Estado terminal**: estado del enum de ADR 19 después del cual no hay transiciones. La reserva de escolta se libera al alcanzarlo. Son `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE` (ADR 19; DEC-135 #5).
- **Condición `INCIDENCIA`**: condición activa del viaje mientras exista una incidencia abierta.

## Requirements

### Requisito 1: Un solo almacén de viajes para todas las vistas

**Historia de usuario:** Como equipo de Producto y QA, quiero que un mismo viaje tenga los mismos datos en todas las pantallas del modo mock, para no encontrar contradicciones al recorrer el flujo.

#### Criterios de aceptación

1. THE modo mock SHALL leer los datos de viajes de un único almacén de viajes.
2. THE listado de viajes, el detalle, el roster, la bandeja de emergencias, los reportes y el dashboard SHALL derivar sus datos de viajes del almacén de viajes.
3. THE modo mock SHALL NOT mantener catálogos de viajes separados por vista (hoy `VIAJES_DEMO`, `DETALLES_VIAJES` y `FILAS_REPORTE_DEMO`).
4. WHEN un viaje existe en el listado, THE modo mock SHALL responder su detalle, su ficha técnica, su expediente y su historial sin 404 por ausencia de datos.

### Requisito 2: Los cambios de un viaje se reflejan en todas las vistas

**Historia de usuario:** Como equipo de QA, quiero que una acción hecha en el detalle se vea en el listado y en el filtro, para validar el flujo de punta a punta.

#### Criterios de aceptación

1. WHEN se realiza una transición de estado de un viaje, THE modo mock SHALL reflejar el nuevo estado en el listado y en el filtro por estado.
2. WHEN se asigna una escolta a un viaje, THE modo mock SHALL reflejar la asignación en el detalle, en el roster y en la reserva de unidades.
3. WHEN se fija un ETA o una fecha y hora de servicio en el detalle, THE modo mock SHALL reflejar el valor en el detalle y en el listado.
4. WHEN una acción sobre un viaje se rechaza (por ejemplo, una transición inválida), THE modo mock SHALL dejar el almacén sin cambios.

### Requisito 3: Reportes y dashboard usan viajes reales del mock

**Historia de usuario:** Como equipo de QA, quiero que los reportes y el dashboard apunten a viajes existentes, para que sus enlaces no den 404 y sus conteos coincidan con el listado.

#### Criterios de aceptación

1. THE reportes SHALL usar identificadores de viaje existentes en el almacén (`VJ-10xx`), no `VJ-R1` a `VJ-R4`.
2. THE reportes SHALL usar solo estados del enum de ADR 19. El estado `COMPLETADO`, que no está en el enum, SHALL NOT aparecer.
3. WHEN el dashboard enlaza a un viaje, THE enlace SHALL resolver a un viaje existente en el almacén.
4. WHEN se cuentan viajes por estado en reportes o dashboard, THE conteo SHALL coincidir con los viajes del almacén en ese estado.

### Requisito 4: Emergencias coherentes con los viajes

**Historia de usuario:** Como personal de Reacción, quiero que una emergencia activada desde un viaje llegue a mi bandeja y se pueda abrir, para atender el caso.

#### Criterios de aceptación

1. WHEN se activa una emergencia desde un viaje, THE bandeja de Reacción SHALL mostrar el caso. La fila de la bandeja SHALL NOT incluir el id del viaje de origen (DEC-121 #2).
2. THE bandeja de Reacción SHALL tener detalle para todo caso que liste. Un caso listado SHALL NOT responder 404 en su detalle (hoy `em-004`).
3. THE emergencias de cada viaje SHALL usar identificadores de viajes del almacén (`VJ-10xx`), no `viaje-001` ni `viaje-terminal`.
4. WHEN se intenta activar una emergencia en un viaje en estado terminal, THE modo mock SHALL responder `409 viaje_en_estado_terminal`, tanto en la activación del cliente como en la interna (contrato tracer.40, DEC-135 #5).

### Requisito 5: Ficha técnica y expediente para todos los viajes

**Historia de usuario:** Como equipo de QA, quiero que todo viaje tenga ficha y expediente, para distinguir un dato vacío de un error de la pantalla.

#### Criterios de aceptación

1. THE modo mock SHALL asociar a cada viaje del almacén una ficha técnica, vacía o capturada.
2. WHEN se consulta la ficha de un viaje sin captura, THE modo mock SHALL responder `200` con `{ viaje_id, tracto: null, contenedores: [], gps_ids: [] }`, no 404. El 404 es solo para un viaje que no existe (contrato tracer.40).
3. THE expediente de cada viaje SHALL tener su propio origen y destino, derivados del viaje.

### Requisito 6: Incidencias alteran la condición del viaje

**Historia de usuario:** Como monitorista, quiero que abrir o resolver una incidencia cambie la condición del viaje, para poder cerrar el servicio por incidencia desde la interfaz.

#### Criterios de aceptación

1. WHEN se abre una incidencia en un viaje, THE modo mock SHALL agregar la condición `INCIDENCIA` activa al viaje.
2. WHEN se resuelve la última incidencia abierta de un viaje, THE modo mock SHALL quitar la condición `INCIDENCIA` del viaje.
3. THE condición `INCIDENCIA` de un viaje SHALL derivarse de sus incidencias abiertas. Una condición `INCIDENCIA` sin incidencia en el histórico SHALL NOT existir, y un viaje SHALL tener como máximo una incidencia abierta (`operacion`, índice único `una_condicion_abierta_por_tipo`).

### Requisito 7: Reserva de escolta sin conflictos

**Historia de usuario:** Como jefe operativo, quiero que una unidad no quede reservada en dos viajes a la vez, para no comprometer dos servicios con la misma unidad.

#### Criterios de aceptación

1. THE modo mock SHALL NOT permitir que una unidad esté reservada en dos viajes activos al mismo tiempo.
2. WHEN un viaje alcanza un estado terminal, THE modo mock SHALL liberar las unidades reservadas en ese viaje.
3. Los viajes del almacén en `ASIGNADO` o en un estado posterior SHALL tener al menos una unidad reservada. Esta regla la fija la máquina de estados (`viaje.estados.yaml`, ADR 31): entrar a `ASIGNADO` exige escolta reservada, y no hay operación que la quite sin reemplazarla.

### Requisito 8: Cobertura de estados

**Historia de usuario:** Como equipo de QA, quiero que el mock tenga al menos un viaje por cada estado del enum, para probar cada estado sin crear datos a mano.

#### Criterios de aceptación

1. THE almacén de viajes SHALL contener al menos un viaje en cada estado del enum de ADR 19.
2. THE almacén de viajes SHALL NOT contener estados fuera del enum de ADR 19.

### Requisito 9: Persistencia local de los cambios del mock

**Historia de usuario:** Como equipo de QA, quiero que los cambios que hago en el mock sigan después de recargar la página, para retomar una prueba sin volver a empezar.

#### Criterios de aceptación

1. WHILE el modo mock está activo, THE almacén de viajes SHALL guardar sus cambios en `localStorage` bajo una clave versionada.
2. THE almacén de viajes SHALL NOT guardar en `localStorage` tokens ni credenciales. Solo guarda datos de viajes del mock.
3. WHEN la versión de la clave guardada no coincide con la versión del mock, THE modo mock SHALL descartar los datos guardados y cargar el almacén inicial.
4. THE modo mock SHALL ofrecer una forma de restablecer el almacén a sus datos iniciales.
5. WHILE el build no es de modo mock, THE almacén de viajes SHALL NOT leer ni escribir en `localStorage`.

## Escenarios de recorrido

Los escenarios siguientes sirven para validar la feature de punta a punta. No amplían los requisitos.

1. Jefe operativo aprueba un viaje en `SOLICITADO`. El listado y el filtro lo muestran en el nuevo estado.
2. Jefe operativo asigna escolta. La unidad aparece reservada en el roster y no puede usarse en otro viaje activo.
3. Monitorista fija el ETA y la fecha y hora de servicio. Ambos aparecen en el detalle y en el listado.
4. Monitorista activa una emergencia. El caso aparece en la bandeja de Reacción y su detalle abre.
5. Monitorista abre una incidencia. La condición `INCIDENCIA` aparece en el viaje. Al resolverla, desaparece.
6. Cierre del viaje al llegar a un estado terminal. Las unidades quedan libres.
7. Reportes y dashboard enlazan a viajes existentes y sus conteos coinciden con el listado.

## Fuera de alcance

- Cambios en el flujo de login real, en tipos del contrato (`pf-pkg-contracts`) o en la lógica de permisos.
- Persistencia de datos en el `bff` o en cualquier backend real.
- Cambios en el comportamiento del frontend cuando el build no es de modo mock.
- Nuevos estados, transiciones o reglas de negocio. Solo se alinea el mock con ADR 19 y con el contrato vigente.

## Notas de brechas

Estas notas son prerrequisitos de verificación, no reglas nuevas:

- **Contrato:** el mock debe responder con las formas del contrato vigente. Antes de diseñar, verificar en `pf-pkg-contracts` (tag de `package.json`) las respuestas de emergencias, ficha, expediente e incidencias. Si el contrato no declara alguna respuesta que el mock necesita, se reporta como brecha y no se inventa.
- **Dependencia E8-T14:** `VJ-1010` ya existe en `src/mocks/data.ts` y `DETALLES_VIAJES`. El diseño debe partir de ese estado.

## Preguntas abiertas

Resueltas con el contrato tracer.40, el código de `-m` y la respuesta del equipo de contratos. La pregunta 4 sigue pendiente de verificación técnica:

1. **Escolta (Requisito 7.3): resuelta.** Sí. La máquina de estados exige escolta reservada para entrar a `ASIGNADO`, y los estados posteriores solo se alcanzan desde ahí. Un viaje sin escolta en `ASIGNADO` o después no puede existir en el backend. Si el mock lo muestra, el error está en el mock.
2. **Estados terminales (Requisitos 4.4 y 7.2): resuelta.** `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE` (ADR 19; DEC-135 #5).
3. **Incidencias (Requisito 6.3): resuelta.** La condición `INCIDENCIA` y la incidencia son una sola fila de `viajes.condicion_viaje` en el backend. No puede existir una sin la otra. El mock de `VJ-1010` está inconsistente y debe traer la incidencia abierta.
4. **Persistencia (Requisito 9): pendiente de verificación técnica.** Falta confirmar que el build sin modo mock no incluya el almacén. No es una decisión de negocio.

Respuestas del equipo, para la fila de Reacción y la ficha: `EmergenciaReaccion` no tiene `viaje_id` (DEC-121 #2), y `GET /viajes/{id}/ficha` responde `200` con ficha vacía (`TestConsultasFicha`, pf-svc-operacion).

## Trazabilidad

| Requisito | Origen                                                       |
| --------- | ------------------------------------------------------------ |
| 1         | Tarjeta de Trello, descripción (primer párrafo y criterio 1) |
| 2         | Tarjeta, criterio 1 de aceptación                            |
| 3         | Tarjeta, criterio 2 de aceptación                            |
| 4         | Tarjeta, criterio 3 de aceptación                            |
| 5         | Tarjeta, descripción (ficha y expediente) y criterio 4       |
| 6         | Tarjeta, criterio 5 de aceptación                            |
| 7         | Tarjeta, criterio 6 de aceptación                            |
| 8         | Tarjeta, criterio 7 de aceptación; ADR 19                    |
| 9         | Confirmación del usuario en esta conversación                |
