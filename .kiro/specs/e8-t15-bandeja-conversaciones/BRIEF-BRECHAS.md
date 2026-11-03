# Brief de brechas de E8-T15 — CERRADO

**Estado (2026-11-03):** respondido y resuelto por Plataforma. La respuesta está en el repo de contexto: `.scratch/e8-t15-bandeja-conversaciones/RESPUESTA-BRIEF-E8-T15.md`. Las decisiones quedaron en DEC-116 a DEC-122 y DT-01, DT-04, DT-05. El estado por brecha está en `BRECHAS.md`.

Este archivo conserva solo lo que **todavía hay que preguntar o confirmar**. Todo lo demás del brief original (rutas, bandeja sin `{id}`, nombres, fila, stream, alerta, override, recibos) ya tiene respuesta.

## Para el dueño del `bff` / Mensajería

1. **¿Cómo se "transfiere al pool" en V1?** DEC-119 dice que la transferencia devuelve la conversación al pool. Pero `transferirConversacion` (`tracer.33`) exige `responsable_destino_id` y devuelve el reclamo del destino. _Propuesta del frontend:_ el gesto de la UI es solo "devolver al pool" con `liberarReclamo` y no se invoca `transferirConversacion`. ¿Es correcto, o existe/habrá una transferencia sin destino?
2. **PR #41 de `mensajeria`:** ¿cuándo se mergea? El frontend asume la `version_reclamo` monótona y el `403` para quien no es el responsable. Si cambia la forma de la versión o del error antes del merge, avisar.
3. **`listarClientes` para `ejecutivo`:** ¿el rol `ejecutivo` puede llamarlo hoy? DEC-118 lo da por hecho; el contrato lo describe con las guardas del `jefe_operativo`. Además, ¿qué debe mostrar la bandeja para una conversación de un cliente inactivo (que `listarClientes` no devuelve)?

## Para Producto

4. **Textos aprobados** para: conflicto al reclamar, reclamo perdido con la conversación abierta, conversación en solo lectura, autorización insuficiente, y confirmación al devolver con borrador. Mientras no existan, el frontend usa textos provisionales marcados como tales.
5. **Cadencia del polling** de la bandeja y de la conversación abierta (valor de configuración del cliente).

## Para Arquitectura / Contexto

6. **Corregir en el repo de contexto** la historia técnica de E8-T15 (título con "override", ruta con `{id}`, transporte SSE, "Cubre" con alerta y override), E3-HU-016 y E3-T2/T3, que siguen contradiciendo a DEC-107, DEC-108 y DEC-116 a DEC-119.
7. **Enmienda explícita** de DEC-097 #1/#3 y DEC-098 frente a DEC-103 (qué sigue vigente de la membresía administrada y de E3-HU-034).

## Del lado del frontend (sin dependencia externa)

- Subir `@ai27-tech/contracts` a `0.1.0-tracer.33` y agregar la excepción en `minimumReleaseAgeExclude`. **Pendiente de aprobación explícita.**
- Construir la bandeja según `tasks.md`.
