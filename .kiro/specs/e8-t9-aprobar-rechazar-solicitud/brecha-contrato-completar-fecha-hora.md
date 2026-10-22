# Solicitud de contrato — Completar la fecha/hora del servicio de un viaje

**Para:** Encargado de `pf-pkg-contracts`
**De:** Equipo `pf-web-frontend-internal` (panel-admin)
**Origen:** E8-T9 — Revisar, aprobar o rechazar la solicitud (satisface `E1-HU-003`)
**Contrato verificado:** `@ai27-tech/contracts@0.1.0-tracer.13`
**Fecha:** 2026-10-22
**Prioridad:** Media — el flujo opera hoy con `mock`; se vuelve bloqueante al integrar contra el `bff` real.

---

## 1. Resumen en una línea

Falta un endpoint de **escritura** para completar o editar la `fecha_hora_servicio` de un `viaje` ya creado. Hoy el contrato solo permite **leerla**, y solo permite **escribirla al crear** el viaje. El panel interno necesita escribirla sobre una `solicitud` existente, antes de aprobarla.

## 2. Por qué se necesita (regla de negocio)

`E1-HU-003`: el `Jefe Operativo` revisa una `solicitud` (un `viaje` en estado `SOLICITADO`) y la aprueba o la rechaza. La aprobación es explícita y tiene una **guarda**: el `viaje` no se puede aprobar si falta la `fecha_hora_servicio`. Si el cliente no la puso al crear la solicitud, el `Jefe Operativo` la completa **antes** de aprobar, sin salir del detalle.

Para cumplir esa guarda, el frontend necesita enviar la `fecha_hora_servicio` al `bff`. Esa operación no existe en el contrato.

## 3. Evidencia de la brecha (contrato `tracer.13`)

Verificado en `@ai27-tech/contracts/openapi/bff` (archivo generado `bff.gen.ts`):

| Punto                                          | Estado en `tracer.13`                     | Consecuencia                                              |
| ---------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `GET /api/v1/viajes/{id}/detalle`              | Existe (`obtenerViajeInterno`)            | `fecha_hora_servicio` se puede **leer** en `ViajeInterno` |
| `POST /api/v1/viajes/{id}/transiciones`        | Existe (`transicionarViaje`), solo `post` | No lleva `fecha_hora_servicio`; es solo cambio de estado  |
| `PATCH /api/v1/viajes/{id}/eta`                | Existe (`fijarEta`), solo `patch`         | Toca `eta_estimado`, **no** `fecha_hora_servicio`         |
| `PATCH /api/v1/viajes/{id}` (edición de viaje) | **No existe**                             | No hay ruta de edición del viaje                          |
| `fecha_hora_servicio` como escritura           | Solo en `CrearViajeEntrada` (creación)    | No se puede escribir sobre un viaje existente             |

- En `ViajeInterno`, `fecha_hora_servicio` es de lectura: `fecha_hora_servicio?: string | null` (`Format: date-time`, equivalente a `MarcaTiempo`).
- En `CrearViajeEntrada`, `fecha_hora_servicio` es opcional y solo entra al **crear**.
- No hay ningún `operation` ni `path` que permita completar/editar ese campo después de la creación.

## 4. Lo que pedimos (propuesta, ajustable)

Un endpoint de escritura de `fecha_hora_servicio` sobre un viaje existente, **simétrico a `fijarEta`** (misma forma: `PATCH` sobre un sub-recurso del viaje, devuelve el detalle recompuesto para refrescar la vista sin un segundo `GET`).

### 4.1 Ruta y verbo (esperados por el frontend hoy)

```
PATCH /api/v1/viajes/{id}/fecha-hora
```

> El frontend ya habla contra esta ruta vía `mock`. Si el `bff` prefiere otra ruta, nombre de campo o verbo, no hay problema: el frontend aísla ruta y forma en un único punto (`FechaHoraEntrada` + `completarFechaHora`) y el reemplazo es mecánico. Lo único innegociable es que exista una operación de escritura para este campo.

### 4.2 Cuerpo de entrada (propuesto)

```jsonc
// FechaHoraEntrada
{
  "fecha_hora_servicio": "2026-10-30T14:00:00Z", // ISO 8601, mismo formato que MarcaTiempo. Requerido.
}
```

### 4.3 Respuesta de éxito

- `200 OK` con `ViajeDetalle` recompuesto (igual que `fijarEta` y `transicionarViaje`), para refrescar el detalle sin un segundo `GET`.

### 4.4 Errores que ya sabemos manejar

| Código | Caso                 | Nota                                                                                                       |
| ------ | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `401`  | Sesión inválida      | El frontend delega al flujo de sesión del AppShell                                                         |
| `403`  | Fuera de alcance     | —                                                                                                          |
| `404`  | Viaje no existe      | —                                                                                                          |
| `409`  | Conflicto de carrera | Reutilizamos el `codigo` de máquina existente `transicion_no_permitida`; **no hace falta un código nuevo** |

## 5. Preguntas abiertas para el encargado de contracts

1. **Ruta/forma definitiva.** ¿`PATCH /viajes/{id}/fecha-hora` con `{ fecha_hora_servicio }`, o prefieres otra superficie (p. ej. un `PATCH /viajes/{id}` genérico de edición parcial)?
2. **Guarda de estado.** ¿La escritura se permite solo en `SOLICITADO`, o en cualquier estado no terminal (como `fijarEta`)? El caso de uso de E8-T9 es solo `SOLICITADO`.
3. **Reenvío en `operacion`.** Hoy `operacion` acepta `fecha_hora_servicio` solo en `ViajeEntrada` (creación). ¿La escritura post-creación requiere una operación nueva también en `operacion`, o se reusa alguna existente?
4. **Nombre del esquema.** Si publicas un esquema dedicado, ¿lo llamamos `FechaHoraEntrada` para que el alias del frontend quede 1:1?
5. **Código 409.** ¿Confirmas que el conflicto de carrera seguirá usando `transicion_no_permitida` y no se introduce un código nuevo?

## 6. Qué hace el frontend mientras tanto (para que no bloquee)

Opción A (ya implementada y verificada en E8-T9): la forma esperada está aislada en un solo punto de cambio y servida por `mock` (MSW), sin inventar un cliente paralelo como autoridad.

- Tipo esperado: `FechaHoraEntrada` en `src/lib/contracts/viajeDetalle.ts`.
- Llamada de dominio: `completarFechaHora(id, entrada, accessToken)` en `src/lib/api/viajeDetalle.ts`.
- `mock`: handler `PATCH /viajes/{id}/fecha-hora` en `src/mocks/handlers.ts`.

**Cuando publiques el endpoint real**, el reemplazo del lado del frontend es mecánico: se re-apunta el tipo al esquema generado y se retira el `mock`. No cambia la lógica de la pantalla.

---

**Definición de "brecha cerrada":** el `bff` publica una operación de escritura de `fecha_hora_servicio` sobre un viaje existente, con su esquema de entrada y su respuesta `ViajeDetalle`, en un tracer nuevo de `pf-pkg-contracts`. A partir de ese tag, el frontend retira el `mock` y consume el tipo generado.
