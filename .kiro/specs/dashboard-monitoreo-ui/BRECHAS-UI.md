# Brechas del spec dashboard-monitoreo-ui

Versiones verificadas: `@ai27-tech/ui@0.3.0-beta.1`, `@ai27-tech/contracts@0.1.0-tracer.40`.

## 1. Barras de progreso (dominio, no se usan)

- **Qué pidió el spec anterior:** `ProgressBar` para la distribución por estado y la recarga.
- **Por qué se retiró:** una proporción no es un avance y no hay meta, umbral ni SLA definido (DEC-025 #3: SLA informativo en V1).
- **Qué falta:** una meta medible definida por Producto (p. ej. tiempo máximo en un estado).
- **Impacto:** ningún requirement usa `ProgressBar`. Si se define una meta, se agrega en la tarjeta KPI correspondiente.

## 2. Tendencia en los KPIs (contractual)

- **Qué existe:** `Stat` admite `trend`. `reporteViajes` y `reporteEstados` solo entregan el periodo consultado.
- **Qué falta:** un periodo previo para comparar; requeriría otra consulta u operación del `bff` que no existe.
- **Impacto:** Requirement 1.7. KPIs sin `trend`.
- **Propuesta:** si Producto quiere comparativos, definir la regla y solicitarla al repo de contratos. No se rellena en el frontend.

## 3. Visualización gráfica de la distribución (UI)

- **Qué existe:** la librería no tiene gráficas de barras, dona ni apiladas.
- **Impacto:** Requirement 2.4. La distribución es lista con texto.
- **Propuesta:** si Producto pide gráfica, solicitar el componente a la librería. No se agrega librería externa.

## 4. Condiciones por fila (contractual, por verificar)

- **Qué pide:** mostrar condiciones (`INCIDENCIA`, `SIN_SENAL`) junto al estado.
- **Qué existe:** `FilaViaje` expone `viaje_id`, `estado`, `creado_en`, `cerrado_en`. No se confirmó que traiga condiciones; incidencias y alertas están fuera de V1 del dashboard (DT-09).
- **Qué falta:** verificar contra tracer 40 (tarea 5.1).
- **Impacto:** Requirement 3.5 condicionado.
- **Propuesta:** si no existen, omitir la columna y reportar al repo de contratos.

## 5. Animación de entrada (UI)

- **Qué existe:** la librería anima `Skeleton`, `Badge pulse` y estados `hover`, pero no la entrada escalonada de bloques.
- **Impacto:** Requirement 7.2. CSS local con tokens, marcado `// BRECHA-UI`.
- **Propuesta:** solicitar a la librería un `Reveal` o clase utilitaria que respete `prefers-reduced-motion`.

## 6. Tarjeta KPI con insignia y pie (UI)

- **Qué existe:** `Stat` ofrece `icon`, `helpText`, `trend` y `loading`, pero no insignia de estado ni pie de dos textos.
- **Impacto:** Requirement 1.2. `TarjetaKpi` local, marcado `// BRECHA-UI`.
- **Propuesta:** solicitar a la librería un `StatCard` con `badge` y `footer`.

## 7. Paginación integrada en `Table` (UI)

- **Qué existe:** `Table` no pagina; `Pagination` es independiente.
- **Impacto:** se compone en el portal (D5). No bloquea.
- **Propuesta:** valorar `Table` con `pagination` integrada.

## 8. Contador animado (UI, opcional)

- **Qué existe:** `Stat` muestra el valor sin animar.
- **Impacto:** fuera de este spec. Se sugiere a la librería como mejora de `Stat`.
