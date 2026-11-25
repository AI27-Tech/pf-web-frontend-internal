# Brechas y pendientes: alineación de roles y capacidades

Fuentes consultadas: contexto `df42d43` (al día), contrato `v0.1.0-tracer.41`. `package.json` fija `tracer.40`. El checkout local de `pf-pkg-contracts` está en una rama feature, no en un tag.

## B-01. DEC-149 no está registrada

- **Qué pide el spec:** aplicar la tabla rol × acción y el alcance por cliente (DEC-149 #2 a #8, #18 a #21).
- **Qué existe:** la respuesta del Lead y la nota "mis clientes" en `repos/ai27-platform-context/.scratch/brief-roles-panel/`. `git grep DEC-149` no la encuentra en `decision-log.md`.
- **Falta:** el registro formal de DEC-149.
- **Impacto:** el spec la trata como "decidida, pendiente de registro como DEC". No bloquea.
- **Propuesta:** pedir al Lead el registro. No se escribe en el repo de contexto sin que el usuario lo pida.

## B-02. Pin del frontend atrás del último tracer

- **Existe:** `package.json` fija `0.1.0-tracer.40`; el último publicado es `tracer.41`.
- **Falta:** `ViajeResumen.cliente` y `unidades`, `fijarClientesSujeto`, `ClientesSujetoEntrada`, `clientes_*` en `AlcanceSujeto`, `cliente_id` en la unidad.
- **Impacto:** condiciona las tareas 5 y 6 (requisitos 6 y 7). Las fases 1 a 4 no dependen.
- **Propuesta:** tarea 0.2, solo con confirmación del usuario.

## B-03. El backend aún no aplica el alcance

- **Existe:** el contrato documenta alcance por cliente, `404` y `403`.
- **Falta:** la aplicación en `identidad`, `operacion` y `bff` (DT-07; Lead, `tracer.41`).
- **Impacto:** el alcance solo se verifica con mocks. La verificación de punta a punta queda condicionada.
- **Propuesta:** esperar los PR del Lead; no emular alcance en el frontend.

## B-04. Cómo sabe un Monitorista que no tiene clientes asignados

- **Existe:** `obtenerAlcanceSujeto` (`GET /api/v1/sujetos/{id}/alcance`); el contrato dice que lo leen `administrador` y `jefe_operativo`.
- **Falta:** una forma de que el propio Monitorista distinga "sin clientes" de "sin viajes".
- **Impacto:** el requisito 6.5 queda con mensaje genérico.
- **Propuesta:** preguntar al Lead si el sujeto puede leer su propio alcance. No se inventa.

## B-05. Reglas de Catálogos, Reportes, Supervisor y Coordinador

- **Existe:** la tabla de DEC-149 cubre `jefe_operativo`, `monitorista` y `administrador`.
- **Falta:** filas de `supervisor` y `coordinador`, y de Catálogos y Reportes.
- **Impacto:** preguntas P-1 a P-4 de `requirements.md`. Se asume lo que ya hay y la herencia de E4-HU-018 v2.
- **Propuesta:** confirmación del Lead o de Producto.

## Sin brechas de UI

Todo se compone con `@ai27-tech/ui@0.3.0-beta.1`.
