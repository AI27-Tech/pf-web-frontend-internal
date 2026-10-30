# Implementation Plan: Cierre del servicio (E8-T14)

## Overview

Las tareas implementan el cierre del servicio en el detalle del viaje: acción dedicada "Cerrar servicio", motivo obligatorio, cierre anticipado solo por incidencia, comunicación de la ventana de escritura y manejo de resultados. No hay operación nueva del `bff`: se reutiliza `transicionarViaje` (`tracer.22`). No se inventan superficies del `bff` ni componentes locales.

El plan se ejecuta **con las brechas abiertas** (ver `BRECHAS.md`). Las tareas de implementación (2 a 9) se construyen con el contrato actual y las propuestas provisionales; la última ola (10 a 15) **cierra las brechas** a medida que Contratos, Backend y Producto responden, y ajusta únicamente los módulos aislados para ello. Una tarea de cierre se marca hecha cuando la respuesta se obtuvo y el código y los documentos quedaron alineados, o cuando se registró explícitamente que la propuesta provisional se confirma.

## Estado de avance

**Pendiente de iniciar (2026-10-29).** Spec redactado con las brechas 1 a 6 abiertas y la 7 verificada. Rama de trabajo: `feature/e8-t14-cierre-servicio` (limpia, sobre `pf-wfi-d`).

## Task Dependency Graph

`1 → {2, 3, 6} → 4 → 5 → {7, 8} → 9 → {10–15}`

```json
{
  "waves": [
    { "id": 1, "tasks": [1] },
    { "id": 2, "tasks": [2, 3, 6], "dependsOn": [1] },
    { "id": 3, "tasks": [4], "dependsOn": [2, 3] },
    { "id": 4, "tasks": [5], "dependsOn": [4] },
    { "id": 5, "tasks": [7, 8], "dependsOn": [5, 6] },
    { "id": 6, "tasks": [9], "dependsOn": [7, 8] },
    { "id": 7, "tasks": [10, 11, 12, 13, 14, 15], "dependsOn": [9] }
  ]
}
```

La tarea 1 verifica el contrato y la librería. Las tareas 2, 3 y 6 son independientes (capa de contrato, funciones puras y mocks). La 4 construye el formulario, la 5 lo cablea en el detalle, las 7 y 8 verifican, la 9 corre las validaciones y las 10 a 15 cierran las brechas.

## Tasks

## Prerrequisito

- [ ] 1. Verificar el contrato y la librería instalados antes de implementar. Confirmar en `node_modules/@ai27-tech/contracts` (`tracer.22`) que `TransicionEntrada` es `{ a_estado, causa? }`, que `EstadoViaje.Cerrado` y las aristas `EN_DESTINO/EN_DESCARGA/EN_TRANSITO → CERRADO` están en `@ai27-tech/contracts/estados`, y que `CondicionAbierta.tipo` incluye `INCIDENCIA`. Confirmar en `@ai27-tech/ui@0.2.0-beta.6` que existen `Modal`, `Select`, `Form`, `FormField`, `Button`, `Toast`, `ToastContainer`. Si el `package.json` ya apunta a un tracer más nuevo, releer `bff.yaml` en ese tag y avisar si cambió el cierre. Registrar en `BRECHAS.md` cualquier diferencia. _Requisitos: Fuente de contrato, Brecha 7._

## Implementación

- [ ] 2. Crear `lib/contracts/cierreViaje.ts`: `MotivoCierre` (const-as-data con `normal`, `por_incidencia`, `bitacora`), `MOTIVOS_CIERRE` y `entradaDeCierre(motivo): TransicionEntrada` que devuelve `{ a_estado: EstadoViaje.Cerrado, causa: motivo }`. Documentar en comentario que el motivo viaja en `causa` por la brecha 1 y que este es el único archivo a cambiar cuando el contrato publique el campo tipado. No duplicar ningún tipo generado. **[Condicionado a brecha 1]** _Requisitos: 2.1, 2.3, 2.5._

- [ ] 3. Implementar `features/viajes/detalle/cierreViaje.ts` (funciones puras): `puedeCerrar(rol)`, `tipoDeCierre(estado)` apoyado en `accionesDesde` (sin tabla propia de aristas), `bloqueoDeCierre(estado, condiciones)`, `motivosPermitidos(tipo)` y `ventanaDeEscritura(motivo)` (tabla total sobre `MotivoCierre`; `bitacora → definida: false`; nunca devuelve fechas). Cada regla cita su fuente (DEC-020 #6, DEC-030, DEC-041, DEC-060) y marca las provisionales. **[Condicionado a brechas 3, 4 y 6]** _Requisitos: 1.1, 1.2, 1.4, 3.1, 3.2, 3.4, 3.5, 4.1, 4.2, 4.4._

- [ ] 4. Implementar `features/viajes/detalle/cierreForm.tsx` con `Form`, `FormField` (`required`, `error`), `Select` de motivo (`motivosPermitidos(tipo)`, preseleccionado y fijo si solo hay uno) y el texto de ventana derivado de `ventanaDeEscritura`. Confirmar deshabilitado sin motivo o mientras envía; cancelar también deshabilitado durante el envío; el error del envío se muestra en el campo y conserva el motivo. Solo componentes de `@ai27-tech/ui`. _Requisitos: 2.1, 2.2, 2.3, 4.1, 4.2, 5.3, 5.7, 5.8._

- [ ] 5. Cablear el cierre en `DetalleViaje.tsx`: estado `cierreAbierto`; en la lista de acciones, ocultar `CERRADO` si `!puedeCerrar(usuario.rol)`, mostrarlo deshabilitado con la razón visible si `bloqueoDeCierre(...)` devuelve texto, y si no mostrar el botón "Cerrar servicio" (se elimina "Transicionar a: CERRADO"); interceptar `CERRADO` en `handleAccion` para abrir el diálogo; `handleCierreConfirm` llama `d.transicionar(EstadoViaje.Cerrado, motivo)`, cierra el diálogo, lanza el `Toast` de éxito con la ventana del motivo y clasifica los errores (409 conflicto con recarga, 400 en el formulario, 403 con mensaje de facultad); mostrar "Este viaje está cerrado" cuando el estado es `CERRADO`. Si hace falta, invalidar `['viaje', id]` también tras un 409 de la mutación de transición en `useDetalleViaje.ts`. No modificar `client.ts`. _Requisitos: 1.2 a 1.5, 3.2, 3.3, 3.6, 4.3, 4.6, 5.1, 5.2, 5.4, 5.5, 5.6._

- [ ] 6. Ampliar los mocks MSW: agregar `VJ-1010` (`EN_TRANSITO` con `INCIDENCIA` abierta); hacer que el manejo de `a_estado === 'CERRADO'` en `POST /viajes/:id/transiciones` imite `validarCierre` (sin `causa` o fuera de catálogo → `400`; anticipado con motivo distinto de `por_incidencia` o sin `INCIDENCIA` → `409`; arista inválida → `409 transicion_no_permitida`); encabezado `x-mock-rol-sin-facultad` que fuerza `403`; caso de carrera forzable (incidencia resuelta antes del cierre). Sin cambiar el contrato. _Requisitos: 3.6, 5.2 a 5.4._

## Verificación

- [ ] 7. Crear pruebas unitarias y de propiedades de `cierreViaje.ts` y `cierreViaje` (contrato): `puedeCerrar` por rol (propiedad 5); anticipado solo `por_incidencia` y bloqueo sin `INCIDENCIA` (propiedad 2); sin bloqueo en `EN_DESTINO`/`EN_DESCARGA` (propiedad 3); terminal sin cierre (propiedad 4); `ventanaDeEscritura` total y sin fechas (propiedad 6); `tipoDeCierre` coherente con `accionesDesde` (propiedad 7); `entradaDeCierre` siempre `CERRADO` con motivo del catálogo (propiedad 1). Ubicación: `tests/viajes/cierreViaje.property.test.ts` y `tests/viajes/cierreViaje.unit.test.ts`. _Requisitos: 1 a 4._

- [ ] 8. Crear pruebas de integración con MSW (`tests/viajes/CierreViaje.test.tsx`): cierre normal con ventana de 3 días (escenario 1); cierre por incidencia con 6 meses (2); cierre anticipado con incidencia solo ofrece "por incidencia" (3); Administrador cierra (4); confirmar sin motivo no envía (5); anticipado sin incidencia queda deshabilitado con razón visible (6); viaje cerrado sin acciones (7); rol sin facultad no ve la acción (8); carrera `409` informa y recarga sin mostrar cerrado (9, 10); `bitacora` muestra "por definir" (11); fallo de red conserva el motivo (12); `403` informa el mensaje de facultad. Comprobar que no existe el botón "Transicionar a: CERRADO". _Requisitos: 1 a 5._

- [ ] 9. Ejecutar `typecheck`, `lint`, `test` y `build:mock` contra las versiones instaladas; verificar accesibilidad básica del diálogo (etiquetas, foco, estado deshabilitado anunciado) con los componentes compartidos; marcar en `BRECHAS.md` cualquier superficie que no permita demostrar el resultado requerido. Dejar constancia en este archivo del resultado y de qué tareas de cierre siguen pendientes. _Requisitos: todos._

## Cierre de brechas (se ejecutan conforme llegan las respuestas)

Cada tarea de esta ola pide la respuesta a su dueño (brief: `.scratch/brecha-contrato-cierre-servicio/brief-cierre-servicio.md`), aplica el cambio mínimo en el módulo aislado indicado y actualiza `BRECHAS.md` y los requisitos marcados **[Condicionado]**. Si la respuesta confirma la propuesta provisional, la tarea solo retira la marca "provisional" y registra la fuente.

- [ ] 10. **Brecha 1, motivo de cierre (Contratos).** Si el contrato publica `motivo_cierre` tipado: reexportar el enum generado en `lib/contracts/cierreViaje.ts`, cambiar `entradaDeCierre` para enviar el campo nuevo, ajustar el mock y las pruebas, y retirar el puente por `causa`. Si Contratos confirma `causa` como definitivo: documentarlo y retirar la condición. Cambio acotado a `lib/contracts/cierreViaje.ts`, mocks y pruebas. _Cierra: Requisito 2.3._

- [ ] 11. **Brecha 2, observaciones de cierre (PM + Contratos).** Si Producto las excluye de V1: ajustar la HU/nota y retirar la condición. Si las incluye y Contratos publica el campo: agregar un `Textarea` opcional a `cierreForm.tsx`, enviarlo en `entradaDeCierre` y cubrirlo con pruebas. _Cierra: Requisito 2.4._

- [ ] 12. **Brecha 3, motivo `bitacora` (PM).** Con la definición de Producto: fijar su ventana en `ventanaDeEscritura` (3 días o 6 meses) y retirar "por definir", o retirarlo de `MOTIVOS_CIERRE` si se descarta. Actualizar el escenario 11, la propiedad 6 y las pruebas. _Cierra: Requisitos 2.6, 4.2._

- [ ] 13. **Brecha 4, vencimiento de la ventana (Contratos + PM).** Si PM la requiere y el contrato publica `escritura_hasta` (o equivalente): mostrar la fecha de paso a sólo lectura en el aviso de éxito y en el detalle de un viaje `CERRADO`, leyéndola del contrato y sin calcularla. Si PM confirma que basta con la regla, registrar y retirar la condición. _Cierra: Requisitos 4.4, 4.6._

- [ ] 14. **Brecha 5, códigos de error y 403 (Contratos + Backend).** Si se publican `codigo` diferenciados de `409`: ampliar `ConflictoCodigoTransicion` y los mensajes del cierre (cierre anticipado sin incidencia, anticipado solo por incidencia) y actualizar mocks y pruebas. Si `operacion` migra el rechazo de facultad a `403`: confirmar que el mensaje de Requirement 5.4 se muestra y retirar la advertencia sobre `401`. Si el senior decide tratar el `401` de esta operación de otra forma, registrar la decisión y, en su caso, abrir una tarea transversal sobre `client.ts` (fuera de T14). _Cierra: Requisitos 3.6, 5.2, 5.4, 5.6._

- [ ] 15. **Brecha 6, "listo para cerrar" y rol facultado (PM).** Con la respuesta de Producto: si se define un criterio de última parada distinto del estado de origen, actualizar `tipoDeCierre`/`bloqueoDeCierre` y la propiedad 3; si se amplían los roles facultados (Supervisor/Coordinador), actualizar `puedeCerrar` y la propiedad 5; si se confirma lo provisional, retirar las marcas. _Cierra: Requisitos 1.2, 1.4, 3.1, 3.5._

## Notes

### Notas de brechas

- **Brecha 1, motivo de cierre:** sin campo tipado; el motivo viaja en `causa` con `normal`, `por_incidencia`, `bitacora` (lo que `operacion` valida). Aislado en `lib/contracts/cierreViaje.ts`. Tarea 10.
- **Brecha 2, observaciones:** sin campo en el contrato; no se capturan. Tarea 11.
- **Brecha 3, motivo `bitacora`:** sin definición ni ventana; se muestra "por definir". Tarea 12.
- **Brecha 4, ventana de escritura:** el `bff` no expone el vencimiento; se comunica la regla, no la fecha. Tarea 13.
- **Brecha 5, códigos de error:** un solo `codigo` de `409` documentado; `operacion` responde `401` (no `403`) a un rol sin facultad y `client.ts` cortaría la sesión. Mitigación: prevención por rol. Tarea 14.
- **Brecha 6, "listo para cerrar" y rol facultado:** `operacion` aproxima la última parada por el estado de origen; la UI hace lo mismo y ofrece el cierre solo a `jefe_operativo` y `administrador`. Tarea 15.
- **Brecha 7, librería:** sin aviso en línea dedicado; se compone con texto semántico y tokens. Sin acción; solicitud registrada en `BRECHAS.md`.
- **Contrato:** pin `tracer.22`; `tracer.23` publicado sin cambios para el cierre. El checkout local de `pf-pkg-contracts` no está en el tag del `package.json`; verificar siempre con `git show` sobre el tag.
- **Vinculación con otras tareas:** la incidencia abierta que habilita el cierre anticipado se marca en E8-T13 (histórico); el panel del Jefe Operativo con viajes listos para cerrar (`E6-HU-033`) es una tarea aparte que enlazará a esta acción.
