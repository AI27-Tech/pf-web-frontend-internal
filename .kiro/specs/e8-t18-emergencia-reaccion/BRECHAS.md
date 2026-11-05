# Brechas de E8-T18 — Emergencia: activación por usuario de monitoreo y bandeja de Reacción

**Verificado el 2026-11-04 (segunda pasada, tras la respuesta del equipo de backend).** Contexto: `ai27-platform-context` en `86e20c5` (al día con `origin/main`; registra DEC-134, DEC-135 y DT-15/DT-16). Contrato: último tag publicado `v0.1.0-tracer.37`, leído con `git show v0.1.0-tracer.37:contracts/openapi/bff.yaml` (el checkout local de `pf-pkg-contracts` sigue en la rama `feat/ficha-tecnica-e-historico-tracer21`). `package.json` del frontend fija `@ai27-tech/contracts@0.1.0-tracer.37` (el pin de la tarea 1 ya se aplicó; `pnpm-workspace.yaml` lo incluye en `minimumReleaseAgeExclude`). Librería: `@ai27-tech/ui@0.2.0-beta.6`.

**Superficie contratada en `tracer.37` (BFF, audiencia Interno):**

- Bandeja de Reacción (`tracer.34`/`.35`): `listarBandejaEmergencias`, `obtenerEmergencia`, `listarNotasEmergenciaPorId`, `reclamarEmergenciaPorId`, `liberarReclamoEmergenciaPorId`, `transferirEmergenciaPorId`, `resolverEmergenciaPorId`, `cerrarEmergenciaPorId`. El backend ya las sirve.
- Carril del monitoreo por viaje (`tracer.37`, DEC-135): `listarEmergenciasViaje` (`GET /api/v1/panel/viajes/{id}/emergencias`), `activarEmergenciaInterno` (`POST` en la misma ruta) y `agregarNotaEmergenciaInterno` (`POST /api/v1/panel/viajes/{id}/emergencias/{eid}/notas`).

## Resumen

| #   | Brecha                                            | Estado                                                                       |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Activar emergencia como usuario de monitoreo      | **Resuelta** en `tracer.37` (`activarEmergenciaInterno`)                     |
| 2   | Agregar nota como usuario interno                 | **Resuelta** en `tracer.37` (`agregarNotaEmergenciaInterno`)                 |
| 3   | Listar los casos de un viaje (audiencia interna)  | **Resuelta** en `tracer.37` (`listarEmergenciasViaje`)                       |
| 4   | Listar integrantes de Reacción para transferir    | **Diferida a V2** (DEC-134, DT-15). El panel no ofrece transferir            |
| 5   | Indicador de viaje terminal para decidir el botón | **Resuelta**: `esTerminal`/`ESTADOS_TERMINALES` en el paquete generado       |
| 6   | Código `404` vs `403` en la bandeja               | **Resuelta**: era error de redacción; interno `403`, cliente `404` (DEC-132) |
| 7   | Pin del contrato                                  | **Aplicado**: `@ai27-tech/contracts@0.1.0-tracer.37` fijado (tarea 1)        |
| 8   | Componentes de librería por confirmar             | **Abierta** (tarea 1)                                                        |

## Brecha 1 — Activación por usuario de monitoreo (resuelta)

`POST /api/v1/panel/viajes/{id}/emergencias`, `activarEmergenciaInterno`, entrada `{activacion_id}`.

- Activan `monitorista`, `supervisor` y `coordinador`; otro rol interno recibe `403`.
- `201` si el caso es nuevo, `200` si es reentrega con el mismo `activacion_id`. Ambos devuelven `EmergenciaViaje` (`id`, `estado`, `activada_en`).
- `409 viaje_en_estado_terminal` en `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE`. Hay `404` si el viaje no existe.
- El caso queda bajo la empresa del viaje, así que el cliente lo ve en su portal (DEC-133).
- **Deuda conocida (DT-16):** si el viaje pasa a terminal entre la lectura y la activación, el caso se crea; queda visible y se cierra normal.
- **Deuda conocida (DT-07):** el alcance por unidad no se aplica; el límite es el rol.

## Brecha 2 — Notas del usuario interno (resuelta)

`POST /api/v1/panel/viajes/{id}/emergencias/{eid}/notas`, `agregarNotaEmergenciaInterno`, entrada `{cuerpo}` de 1 a 1.000 caracteres; responde `201`.

- Anotan `monitorista`, `supervisor`, `coordinador` y `administrador`. `reaccion` y `ejecutivo` reciben `403`.
- `409 emergencia_cerrada` en un caso `cerrada`. Texto vacío tras recortar: `400`.
- Admitida en `abierta`, `en_atencion` y `resuelta`.

## Brecha 3 — Casos del viaje (resuelta)

`GET /api/v1/panel/viajes/{id}/emergencias`, `listarEmergenciasViaje`. Responde `{items: EmergenciaViaje[]}` sin paginación, del más antiguo al más reciente por `activada_en`, **incluyendo `cerrada`**. La ven `monitorista`, `supervisor`, `coordinador` y `administrador`.

- La UI filtra: el selector de notas solo ofrece casos `abierta`, `en_atencion` y `resuelta`; el cierre solo `resuelta`.
- Respuesta a la pregunta abierta: el `monitorista` y el `administrador` sacan el `eid` de esta lista y cierran con `cerrarEmergenciaPorId`. No necesitan la bandeja.

## Brecha 4 — Transferencia (diferida a V2)

DEC-134 y DT-15: el nombre de un miembro de Reacción solo vive en el IdP (misma raíz que DEC-119/DT-04), así que no hay lectura de destinos. `transferirEmergenciaPorId` sigue en el contrato y responde, pero **el panel no ofrece el botón**. Para soltar un caso detenido en V1 se usa "Devolver al pool" (`liberarReclamoEmergenciaPorId`). DEC-134 enmienda DEC-126 en este punto.

## Brecha 5 — Viaje terminal (resuelta)

El paquete generado exporta `esTerminal` y `ESTADOS_TERMINALES` (`estados` en `@ai27-tech/contracts`; en Go, `EstadoViaje.EsTerminal()`). El botón se deriva de ahí, sin copiar la lista. El `409 viaje_en_estado_terminal` del `bff` es la autoridad final.

Nota de limpieza: `src/mocks/data.ts` y `src/mocks/handlers.ts` ya duplican los cuatro terminales a mano. Al tocar esos archivos para el handler de activación, usar `esTerminal`.

## Discrepancia 6 — `404` vs `403` (resuelta)

Era un error de redacción del contrato. Interno sin acceso: `403` (DEC-132). Cliente: `404`. Corregido en `bff` y `mensajeria`. La UI sigue tratando `403` y `404` de la bandeja como acceso no autorizado, por defensa.

## Prerrequisito 7 — Pin del contrato (aplicado)

`@ai27-tech/contracts` se subió de `tracer.36` a `tracer.37` en `package.json`, y `pnpm-workspace.yaml` ya incluye `|| 0.1.0-tracer.37` en `minimumReleaseAgeExclude`. `tracer.36` solo añadió el filtro `en_curso` del dashboard; `tracer.37` añade el carril de emergencias del monitoreo.

La ruptura de `tracer.35` (`nombre` obligatorio en `crearIntencionSubidaAdjunto`) **no afecta**: `useEvidenciaViaje.ts` ya envía `nombre: archivo.name`.

## Cambio de comportamiento a probar: códigos `409` de mensajería

El backend corrigió que todo `409` de `mensajeria` llegaba con `codigo: "conflicto"`. Ahora llega el código del contrato: `emergencia_cerrada`, `conflicto_version_reclamo`, `conversacion_solo_lectura`, `stream_resync_required` y `transicion_invalida`. Efecto en este repo:

- El wrapper de emergencias debe clasificar por esos códigos (tarea 2).
- `useTrabajoBandeja.ts` y `conversaciones.ts` (E8-T15) comparaban contra esos códigos y esas ramas no se cumplían. Verificar que ahora se ejecutan; no es alcance de E8-T18, pero conviene probarlo.

## Brecha de UI 8 — Componentes

Verificar en `@ai27-tech/ui@0.2.0-beta.6` la API exacta de `Modal` (confirmación), `Textarea`, `Badge`, `Toast`, `FilterTable`/`Table`, `Select` y `Button`. No se detectó en el índice un componente de estado vacío, de banner ni de skeleton: si faltan, se componen con primitivas (`Card`, texto) como en `BannerEstado.tsx` de T15 y se registra la solicitud a la librería, sin copiar componentes localmente.

## Pendientes que siguen abiertos

1. **Producto:** textos aprobados de conflicto de reclamo, resolución, cierre y acceso no autorizado; cadencia del polling.
2. **Producto:** dónde ve el `administrador` el selector de casos. Lista, anota y cierra, pero no activa (DEC-045 #9), así que no ve el botón.
3. **Frontend:** componentes de `@ai27-tech/ui` (brecha 8).
4. **Arquitectura:** actualizar la historia técnica E8-T18 en el repo de contexto ("contrato por congelar", SSE).
5. **Deuda registrada, sin acción aquí:** alcance por unidad del monitoreo (DT-07), carrera en la activación (DT-16), transferencia dirigida (DT-15).

## Cierre de implementación (tareas 1 a 15)

Estado al cierre: tareas 1 a 13 y 15 implementadas; 14 descartada de V1 (DEC-134). Verificación (reejecutada el 2026-11-05): `typecheck`, `lint`, `test` (73 archivos, 457 pruebas) y `build:mock` pasan.

> Actualización 2026-11-05: el conteo subió de 456 a 457 al incorporar `tests/emergencias/sesion.test.tsx` (401 delegado al AppShell, Req 11.3), que no estaba en el cierre anterior. Durante la corrida de la suite completa afloró un fallo intermitente en `tests/conversaciones/BandejaConversaciones.test.tsx` (E8-T15, fuera del alcance de E8-T18): el escenario "con solo la lista abierta, una falla de polling conserva las filas y muestra un aviso" capturaba el nodo `section` una sola vez con `within(lista())`, y el remontaje de la sección por el re-render del estado de error lo dejaba huérfano. Se estabilizó reconsultando `lista()` dentro de un `waitFor`. La suite completa pasa de forma estable (dos corridas seguidas, 457/457).

Brechas y desviaciones que siguen abiertas:

1. **Textos de UI provisionales.** Conflicto de reclamo, resolución, cierre, acceso no autorizado y activación están marcados como provisionales hasta que Producto los apruebe (pendiente de producto, punto 1 de arriba).
2. **Cadencia del polling.** `VITE_EMERGENCIAS_POLLING_MS` usa 15 s por defecto. Producto debe confirmar la cadencia.
3. **Confirmación antes de activar.** El diálogo de confirmación de la activación lo agregó la implementación; el spec no lo pide. Producto debe confirmarlo o quitarlo.
4. **Cubierto en esta ronda:** 401 delegado al AppShell (sin error en la vista), reintento del detalle, avisos de éxito (reclamar, devolver, guardar nota, resolver, cerrar), destinos con cita y arribo, y anuncio de cambios del caso abierto. Con el polling caído, reclamar sigue funcionando (prueba en `tests/emergencias/polling.test.tsx`).
5. **Dependencia faltante en el contrato.** El índice raíz de `@ai27-tech/contracts@0.1.0-tracer.37` importa `@bufbuild/protobuf`, que este repo no declara. Por eso `esTerminal` se importa desde el subpath `estados`. Reportar al equipo de contratos.
6. **Mocks.** Un caso activado desde el viaje en `src/mocks/emergencias.ts` no aparece en la bandeja mock. Solo afecta a desarrollo con mocks.
7. **Transferencia dirigida** (DEC-134, DT-15): fuera de V1; el wrapper no la expone.
8. **Deuda del backend** sin acción en este repo: DT-07 (alcance por unidad) y DT-16 (carrera de activación frente a viaje terminal).
9. **Verificación manual pendiente.** No se revisó la UI en navegador: maquetación, orden de foco y uso solo con teclado (Req 11.5). Las pruebas cubren comportamiento y roles.
