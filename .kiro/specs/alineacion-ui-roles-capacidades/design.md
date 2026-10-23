# Design Document: Alineación de la UI interna con roles y capacidades

## Overview

La UI interna ya tiene varias capacidades construidas, pero su composición actual parte principalmente de “sesión válida + estado del viaje”. Este diseño agrega una capa explícita de capacidades de UI basada en reglas de rol confirmadas, sin mover la autoridad de rol y alcance fuera del BFF.

La frontera principal será una sola: **sesión → capacidades de presentación → navegación/rutas/acciones**. La frontera HTTP existente seguirá siendo `lib/api/client.ts` y sus wrappers de dominio. El frontend no tendrá acceso directo a servicios internos.

## Sources and invariants

- El rol y `Audiencia` se derivan de la sesión/token existente.
- El alcance por `unidad` y por `cliente` no se calcula localmente.
- La máquina de estados generada continúa siendo la fuente de las transiciones posibles.
- El BFF continúa siendo la autoridad de autorización real.
- `401` y `403` son clases distintas y no deben compartir la política de sesión.
- Las operaciones ausentes del BFF permanecen como brechas contractuales.

## Proposed seams

### 1. Política pura de capacidades

Crear un módulo puro de frontend que exponga una función equivalente a:

```text
puedeUsarCapacidad(rol, capacidad) -> boolean
```

La forma exacta del tipo se definirá contra el contrato de roles existente. La política solo contendrá reglas confirmadas:

- asignar escolta: `jefe_operativo`, `administrador`;
- administrar roster: `jefe_operativo`, `administrador`;
- conversación: `ejecutivo` y las facultades de override que estén confirmadas;
- emergencias: roles operativos de monitoreo y `reaccion` en el caso autorizado;
- administración global: `administrador`.

No contendrá reglas inventadas para las decisiones pendientes.

### 2. Navegación

Cambiar el catálogo de navegación de un modelo basado principalmente en `ocultarPara` a un modelo con roles/capacidades permitidas. La función de filtrado será pura y se probará sin montar React.

La navegación es una ayuda de experiencia, no la seguridad. Una ruta directa seguirá pasando por una guarda.

### 3. Guardas de ruta

Extender la guarda privada existente con:

- sesión válida;
- audiencia interna cuando la ruta sea interna;
- capacidad de entrada cuando la regla esté confirmada;
- estado de prohibición que conserve la sesión.

La guarda no resolverá si un viaje pertenece a U1 o U2. Esa decisión es del BFF al responder la lectura o mutación.

### 4. Acciones del detalle

Mantener `accionesDesde` como fuente de acciones de estado. Agregar una segunda función pura que descarte acciones no permitidas por la capacidad confirmada del rol.

Para E8-T10, `ASIGNADO` será la primera acción filtrada por capacidad. La asignación seguirá utilizando el wrapper aislado de E8-T10 mientras el BFF no publique la operación.

Las acciones cuyo permiso está pendiente no se bloquearán mediante una regla nueva en este spec. Se documentará la decisión necesaria y se conservará el control final del BFF.

### 5. Errores HTTP

Ajustar la taxonomía de `ApiError` para que `403` tenga una clase distinguible de `401`.

Política de presentación:

- `401`: delegación al flujo de sesión;
- `403`: componente/estado de prohibición sin logout;
- `404`: recurso no encontrado o fuera de alcance según contrato;
- `409`: conflicto contextual de la operación;
- otros: error operativo con reintento cuando corresponda.

No se crearán códigos de negocio nuevos.

### 6. Mocks y sesión

Crear fixtures de sesión por rol con un helper común, sin duplicar la codificación del token. Los handlers MSW validarán las capacidades que el BFF debe validar para la superficie actualmente mockeada.

La asignación mockeada usará:

- éxito para `jefe_operativo` y `administrador`;
- `403` para `monitorista` y cualquier rol no autorizado;
- `409` para la carrera de unidades;
- `401` para sesión inválida cuando un test lo fuerce.

El mock no calculará alcances de unidades ni clientes.

## Alineación con capacidades existentes

| Área                              | Tratamiento en este spec                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Login/sesión                      | Reutilizar y corregir la distinción `401`/`403`.                                                         |
| Bandeja de viajes                 | Mantener datos entregados por BFF; agregar guardas y estado de prohibición. No filtrar alcance en React. |
| Detalle de viaje                  | Filtrar acciones confirmadas por capacidad; mantener máquina de estados.                                 |
| Asignación de escolta             | Alinear exclusivamente a `jefe_operativo`/`administrador`; conservar brecha BFF explícita.               |
| Conversaciones                    | No implementar operación ausente; preparar visibilidad solo con reglas y contrato confirmados.           |
| Emergencias                       | No implementar operación ausente; no convertir visibilidad de caso en acceso general a viajes.           |
| Catálogos/reportes/administración | No activar capacidades inexistentes; definir comportamiento de stub con Product Management.              |
| Dashboard                         | No implementar indicadores ni APIs nuevas en este spec.                                                  |

## Componentes de UI

No se crearán componentes base nuevos. Se reutilizarán componentes de `@ai27-tech/ui` y las composiciones existentes de `Card`, `Button`, `Toast`, `Modal` y estados de carga/error.

Si falta una afordancia en la librería, se registrará como brecha; no se duplicará localmente sin decisión.

## Testing strategy

Se probarán seams altos:

1. política pura de capacidades;
2. navegación filtrada;
3. guarda de ruta y URL directa;
4. error boundary/presentación de `401` y `403`;
5. comportamiento de `DetalleViaje` con fixtures de rol;
6. handlers MSW de autorización;
7. regresión de la suite existente.

Los tests verificarán lo visible para la persona y la frontera BFF mockeada. No verificarán detalles privados de hooks o implementaciones internas cuando exista una seam de UI/API más alta.

## Contract and dependency gate

Antes de sustituir mocks o modificar tipos esperados:

1. confirmar el tracer publicado vigente;
2. comparar la versión usada por el frontend con el checkout local;
3. inspeccionar `bff.yaml` del tracer confirmado;
4. actualizar solo wrappers y contratos en el seam correspondiente;
5. no conectar servicios internos directamente.

## Risks

- El BFF puede rechazar una capacidad que el frontend muestra mientras la matriz contractual no esté publicada; por eso el BFF sigue siendo autoridad.
- Las decisiones pendientes sobre aprobación, rechazo, cierre y override pueden impedir una matriz completa de acciones.
- Las pantallas stub pueden generar una expectativa falsa si se dejan visibles sin estado “no disponible”.
- El tracer local y el paquete instalado no están alineados; cualquier implementación contractual debe detenerse hasta reconciliar versiones.
