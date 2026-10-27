# Design Document

## Overview

Diseño del **histórico del viaje: notas, estadías e incidencias** (E8-T13): la parte del panel interno que, bajo el detalle de un viaje, registra notas y observaciones, abre y cierra estadías, marca incidencias y las resuelve según el rol, y muestra todo como un expediente append-only con actor y marca de tiempo. Se construye sobre las convenciones ya establecidas en `pf-web-frontend-internal` (TanStack Router por archivos, capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que el detalle del viaje (E8-T8) y la creación (E8-T11), sin introducir patrones nuevos.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context@ba1abc3` (árbol limpio, al día). Contrato fijado por el frontend: `@ai27-tech/contracts@0.1.0-tracer.20`, `@ai27-tech/ui@0.2.0-beta.6`. El contrato se leyó contra el tag `v0.1.0-tracer.20` del repo de contratos (el checkout local está en la rama `pf-contracts-m`, no en el tag; el tag `.20` es también el último publicado, así que el frontend está al día).

El `bff` (`bff.yaml`) hoy **NO expone** escritura ni lectura del histórico interno. De este dominio solo tiene **lecturas curadas**: `IncidenciaCurada` (categoría + estado para el cliente, DEC-006), `IncidenciaActiva`/`CondicionAbierta` embebidas en el detalle interno (solo lectura), y `EntradaBitacoraDescarga` (expediente de descarga, E6). Las operaciones que esta historia necesita existen **solo en `operacion.yaml`**, que el frontend no consume directo:

```
# Bitácora (E1-HU-009)
GET   /api/v1/viajes/{id}/bitacora            listarBitacora            → PaginaBitacora { items: EntradaBitacora[], cursor_siguiente }
POST  /api/v1/viajes/{id}/bitacora            registrarEntradaBitacora  body EntradaBitacoraEntrada { texto }            → 201 EntradaBitacora { id, viaje_id, texto, autor, ts }

# Incidencias (E1-HU-007)
POST  /api/v1/viajes/{id}/incidencias         abrirIncidencia           body IncidenciaEntrada { tipo_interno, descripcion? } → 201 Incidencia / 409 condicion_ya_abierta
PATCH /api/v1/viajes/{id}/incidencias/{iid}   resolverIncidencia        body ResolucionIncidenciaEntrada { resolucion }      → 200 Incidencia
#   Incidencia { id, viaje_id, tipo_interno, estado(en_atencion|resuelta), abierta_en, resuelta_en? }

# Estadías (E1-HU-008 / DEC-038)
GET   /api/v1/viajes/{id}/estadias            listarEstadias            → PaginaEstadias { items: Estadia[], cursor_siguiente }
POST  /api/v1/viajes/{id}/estadias            abrirEstadia              body EstadiaEntrada { motivo, eje_autorizacion }  → 201 Estadia
PATCH /api/v1/viajes/{id}/estadias/{eid}      cerrarEstadia             body CierreEstadiaEntrada {} (vacío válido)       → 200 Estadia / 409 estadia_ya_cerrada
#   Estadia { id, viaje_id, motivo, eje_autorizacion, inicio, cierre? }   (DURACIÓN se DERIVA de inicio/cierre; sin prolongada ni umbral)
#   MotivoEstadia enum: combustible|descanso|alimentos|sanitario|reten|revision_autoridades|gastos|espera_entrega
#   EjeAutorizacionEstadia enum: autorizada|no_autorizada|antes_200km
```

Consecuencia de diseño: la ausencia de estas operaciones en el `bff` se maneja como **brecha de contrato aislada** —tipos de wire esperados en una sola capa (`lib/contracts/historicoViaje.ts`) y mocks (MSW) que los sirven. Cuando el `bff` publique el contrato, se reemplazan esos tipos por los generados de `@ai27-tech/contracts/openapi/bff` —cambio de importación, no reescritura. Nada del resto del código asume más que el contrato esperado. Detalle y resolución en `BRECHAS.md`.

Dos propiedades del dominio son del `bff`/backend, no de la UI: la **atomicidad del índice único parcial** (una sola incidencia abierta por tipo → `409 condicion_ya_abierta`) y la **autorización por rol** de corrección/cierre (`403`). La interfaz no las reimplementa: deriva la visibilidad del gesto del rol de sesión y clasifica las respuestas.

## Architecture

### Vista de capas

```
routes/_private/viajes.$id.historico.tsx   (ruta TanStack bajo el detalle del viaje E8-T8)
        │  usa
        ▼
features/viajes/historico/
  ├─ useHistoricoViaje.ts        (hook: Query de bitácora/incidencias/estadías + mutaciones)
  ├─ duracionEstadia.ts          (función pura: inicio + cierre|ahora → duración; sin clasificar)
  ├─ visibilidadCorreccion.ts    (función pura: rol de sesión → ¿ofrecer resolver/cerrar incidencia?)
  ├─ HistoricoViaje.tsx          (presentación: lista cronológica append-only)
  ├─ NotaForm.tsx                (captura de nota/observación)
  ├─ EstadiaForm.tsx             (apertura de estadía: motivo + eje de autorización)
  └─ IncidenciaForm.tsx          (marcado de incidencia: tipo interno + descripción)
        │  usa
        ▼
lib/api/historicoViaje.ts        (wrappers: listarBitacora, registrarEntradaBitacora,
                                   listarEstadias, abrirEstadia, cerrarEstadia,
                                   abrirIncidencia, resolverIncidencia; clasifica 409/403)
        │  usa
        ▼
lib/api/client.ts                (única puerta HTTP contra el bff — ya existe)
        │  tipos
        ▼
lib/contracts/historicoViaje.ts  (tipos de wire ESPERADOS; brecha de contrato aislada)
```

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                                              | Componente                                          |
| ------------------------------------------------------ | --------------------------------------------------- |
| Contenedor y secciones del histórico                   | `Card`, `CardHeader`, `CardBody`                    |
| Lista cronológica de entradas                          | `Table` o composición de `Card` + lista             |
| Estado de incidencia / estadía / tipo de entrada       | `Badge`                                             |
| Capturar nota / estadía / incidencia                   | `Form`, `FormField`, `FormRow`, `Input`, `Textarea` |
| Elegir motivo, eje de autorización, tipo de entrada    | `Select` / `Radio` (valores del enum del contrato)  |
| Acciones (registrar, abrir/cerrar estadía, resolver)   | `Button`                                            |
| Confirmar resolución de incidencia                     | `Modal` + `Form`/`FormField` + `Textarea`           |
| Éxito / rechazo (`condicion_ya_abierta`, `403`, error) | `Toast` + `ToastContainer`                          |
| Aclaración "no cambia el estado de progreso"           | `Tooltip` / texto                                   |

Verificación de la lista de la librería pendiente contra `@ai27-tech/ui@0.2.0-beta.6`, igual que en E8-T11; cualquier afordancia faltante (p. ej. una línea de tiempo dedicada) se compone con primitivas y se registra como solicitud a la librería en `BRECHAS.md`, no como componente local.

## Componentes y responsabilidades

- **`lib/contracts/historicoViaje.ts`** — tipos de wire esperados (`EntradaBitacora`, `EntradaBitacoraEntrada`, `PaginaBitacora`, `Incidencia`, `IncidenciaEntrada`, `ResolucionIncidenciaEntrada`, `Estadia`, `EstadiaEntrada`, `CierreEstadiaEntrada`, `PaginaEstadias`, enums `MotivoEstadia`/`EjeAutorizacionEstadia`), documentados como brecha. Único punto de cambio cuando el `bff` publique el contrato.
- **`lib/api/historicoViaje.ts`** — wrappers de las siete operaciones, delegando en `request` de `client.ts`. Traducen `409` por `codigo` (`condicion_ya_abierta`, `estadia_ya_cerrada`) y `403` (autorización de corrección) a clases de error, para que la presentación decida la política. No contiene reglas de dominio.
- **`features/viajes/historico/duracionEstadia.ts`** — función pura `duracionDe(inicio, cierre?, ahora): Duracion` que deriva la duración; para una estadía abierta usa `ahora`. **No** clasifica ni rotula (DEC-038).
- **`features/viajes/historico/visibilidadCorreccion.ts`** — función pura `puedeCorregirIncidencia(rol): boolean` que decide si se ofrece el gesto de resolver/cerrar (Supervisor/Coordinador sí; Monitorista no). Es una ayuda de interfaz; la autoridad final es el `403` del `bff`.
- **`features/viajes/historico/useHistoricoViaje.ts`** — `useQuery` para bitácora, incidencias y estadías (claves `['viaje', id, 'bitacora'|'incidencias'|'estadias']`, `retry: false`) + `useMutation` para registrar nota, abrir/cerrar estadía, abrir/resolver incidencia, invalidando la lectura correspondiente al confirmar. Expone contrato plano a la presentación (`entradas`, `incidencias`, `estadias`, `cargando`, `vacio`, `error`, `esNoAutorizado`, `registrarNota`, `abrirEstadia`, `cerrarEstadia`, `marcarIncidencia`, `resolverIncidencia`, `reintentar`).
- **`features/viajes/historico/HistoricoViaje.tsx`** — composición de la vista append-only: lista cronológica con actor y marca de tiempo, formularios de nota/estadía/incidencia, el modal de resolución cuando el rol lo permite, y los avisos de rechazo/éxito con `Toast`. **No renderiza** ningún control de editar ni borrar. Ramifica `esNoAutorizado` (delegar al AppShell) antes del error genérico.
- **`routes/_private/viajes.$id.historico.tsx`** — `createFileRoute` bajo el detalle del viaje (E8-T8); reutiliza su sesión y navegación.

## Correctness Properties (candidatas a PBT)

1. **Append-only en la UI.** `HistoricoViaje.tsx` no expone ningún control de editar ni borrar: para todo conjunto de entradas renderizadas, la única mutación ofrecida es agregar (nota), abrir/cerrar (estadía) o marcar/resolver (incidencia). Ninguna reescribe una entrada existente (DoD de E8-T13).
2. **Duración sin clasificación.** Para toda estadía, `duracionDe(inicio, cierre?, ahora)` depende solo de `inicio` y de `cierre ?? ahora`; nunca produce un rótulo `prolongada` ni un booleano de "estadía larga" (DEC-038).
3. **Gesto de corrección por rol.** Para todo rol, `puedeCorregirIncidencia(rol)` es verdadero solo para Supervisor/Coordinador; falso para Monitorista. Ocultar el gesto no sustituye la autorización del `bff`: un `403` se clasifica como autorización insuficiente, no como error genérico.
4. **Clasificación de 409.** Para todo `409` del wrapper, el `codigo` se mapea a la clase esperada (`condicion_ya_abierta` → segunda incidencia del mismo tipo; `estadia_ya_cerrada` → cierre duplicado) sin colapsarlos en un error genérico.
5. **Enums cerrados.** Los selectores de estadía ofrecen exactamente los valores del enum del contrato (`MotivoEstadia`, `EjeAutorizacionEstadia`) y ninguno fuera de él; no hay captura de texto libre para esos campos.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir el contrato esperado:

- lectura de bitácora, incidencias y estadías por `id` de viaje (cada una con actor y marca de tiempo; estadías con `inicio` y `cierre?`);
- registro de nota (`201` con `autor`/`ts`), que aparece como nueva entrada sin alterar las previas;
- apertura de estadía (`201`) y cierre (`200`); un caso de cierre duplicado que fuerza `409 estadia_ya_cerrada`;
- apertura de incidencia (`201`) y un caso que fuerza `409 condicion_ya_abierta` (segunda del mismo tipo);
- resolución de incidencia (`200`) y un caso que fuerza `403` para un rol sin facultad de corrección, para probar Requirements 5.4 y 4.4.

## Decisiones

- **Append-only de principio a interfaz:** no se construye ningún gesto de edición o eliminación; la corrección es una nueva entrada. Es la propiedad probatoria de E8-T13 y su DoD.
- **Brecha aislada en una capa:** toda la incertidumbre de contrato vive en `lib/contracts/historicoViaje.ts` + mocks; el resto del código asume solo el contrato esperado, igual que en E8-T8.
- **Duración derivada, nunca clasificada:** la UI muestra inicio/cierre/duración y deja fuera `prolongada` y cualquier umbral (DEC-038); introducir uno sería implementar un umbral no aprobado.
- **Rol como ayuda, `bff` como autoridad:** la visibilidad del gesto de corrección es conveniencia de interfaz; la autorización efectiva es del `bff`.
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; cualquier afordancia faltante se reporta como brecha.
