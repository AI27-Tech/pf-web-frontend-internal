# Brechas del spec e8-t17-dashboard-monitoreo-ui

Versiones verificadas: `@ai27-tech/ui@0.3.0-beta.1`, `@ai27-tech/contracts@0.1.0-tracer.40`.

## 1. Tendencia en los KPIs (contractual)

- **Qué pide:** KPIs «vivos» con comparativo.
- **Qué existe:** `Stat` admite `trend`. `reporteViajes` y `reporteEstados` solo entregan el periodo consultado.
- **Qué falta:** un periodo previo para comparar. Requeriría una segunda consulta o una operación de `bff` que no existe.
- **Impacto:** Requirement 1.4. KPIs sin `trend`.
- **Propuesta:** si Producto quiere comparativos, definir regla y solicitarla al repo de contratos. No se rellena en el frontend.

## 2. Condiciones por fila (contractual, por verificar)

- **Qué pide:** mostrar condiciones (`INCIDENCIA`, `SIN_SENAL`) con `Badge` junto al estado.
- **Qué existe:** `FilaViaje` expone `viaje_id`, `estado`, `creado_en`, `cerrado_en`. No se confirmó que traiga condiciones. Incidencias y alertas están fuera de V1 del dashboard (DT-09).
- **Qué falta:** verificar contra tracer 40 en la tarea 5.1.
- **Impacto:** Requirement 3.6 condicionado.
- **Propuesta:** si no existen, omitir la columna y reportar al repo de contratos.

## 3. Animación de entrada (UI)

- **Qué pide:** bloques que entran con movimiento escalonado.
- **Qué existe:** la librería anima `Skeleton`, `Badge pulse` y `ProgressBar`, pero no ofrece entrada escalonada de bloques.
- **Qué falta:** un contenedor o utilidad de entrada con respeto a `prefers-reduced-motion`.
- **Impacto:** Requirement 7.2. Se resuelve con CSS local de tokens, marcado `// BRECHA-UI`.
- **Propuesta:** solicitar a la librería un `Reveal` o clase utilitaria; al publicarse, reemplazar y borrar el CSS local.

## 4. Contador animado (UI, opcional)

- **Qué pide:** números que «corren» al cambiar.
- **Qué existe:** `Stat` muestra el valor sin animar.
- **Impacto:** no incluido en este spec. Se solicita a la librería como mejora de `Stat`.

## 5. Paginación integrada en `Table` (UI)

- **Qué existe:** `Table` no pagina; `Pagination` es independiente.
- **Impacto:** se compone en el portal (D5). No es bloqueo.
- **Propuesta:** valorar `Table` con `pagination` integrada en la librería.
