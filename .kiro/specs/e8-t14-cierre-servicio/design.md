# Design Document

## Overview

Diseño del **cierre del servicio** (E8-T14): la acción del panel interno con la que el Jefe Operativo (o el Administrador) cierra un viaje con un motivo, desde el detalle del viaje (E8-T8). Se construye sobre las convenciones ya establecidas en `pf-web-frontend-internal` (capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que el detalle del viaje, la asignación de escolta (E8-T10) y el histórico (E8-T13), sin introducir patrones nuevos.

El cambio es pequeño y concentrado: **no hay operación nueva**. El cierre reutiliza `transicionar` (`POST /api/v1/viajes/{id}/transiciones`), el hook `useDetalleViaje` y la derivación de acciones `accionesDesde`. Lo nuevo es (a) una capa de contrato que reexporta el motivo tipado y arma la entrada de cierre, (b) funciones puras que deciden cuándo y cómo se ofrece el cierre, (c) un formulario de cierre, y (d) el cableado en `DetalleViaje` que reemplaza el botón genérico "Transicionar a: CERRADO".

> **Estado de las brechas (2026-10-30).** Con `tracer.24` publicado y las respuestas del brief, el motivo está tipado, `bitacora` se retiró (DEC-113), las observaciones se omiten y los roles y el criterio de última parada están confirmados. Quedan condicionados: la fecha exacta de la ventana (**brecha 4**, Producto) y los códigos de 409 en runtime y el 403 real (**brecha 5**, plataforma, diferidos). La brecha 8, correspondiente al pin del frontend, está cerrada.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context` commit `2e80dd2` (incluye DEC-113). Contrato: `v0.1.0-tracer.24` (publicado); el `package.json` del frontend fija `tracer.24` y la brecha 8 está cerrada. `@ai27-tech/ui@0.2.0-beta.6`. Superficie leída con `git show v0.1.0-tracer.24:…` porque el checkout local de contratos no está en ese tag.

```
POST /api/v1/viajes/{id}/transiciones   transicionarViaje
     body TransicionEntrada { a_estado: string,
                              causa?: string,
                              motivo_cierre?: MotivoCierre }      (additionalProperties: false)
     MotivoCierre = "normal" | "por_incidencia"                   (DEC-113)
     200 ViajeDetalle { viaje: ViajeInterno, condiciones_activas: CondicionAbierta[] }
     400 SolicitudInvalida · 401 NoAutorizado · 403 Prohibido
     409 Error — codigo declarado: transicion_no_permitida
                                 | cierre_anticipado_solo_por_incidencia
                                 | cierre_anticipado_requiere_incidencia
                 (DECLARADO en el contrato; el runtime hoy envía codigo "conflicto", brecha 5)

Aristas a CERRADO (viaje.estados.yaml):
  EN_DESTINO  → CERRADO   guarda ultima_parada
  EN_DESCARGA → CERRADO   guarda ultima_parada
  EN_TRANSITO → CERRADO   guarda cierre_anticipado_por_incidencia

CondicionAbierta { tipo: INCIDENCIA | SIN_SENAL, abierta_en }
```

Comportamiento de `operacion` (`validarCierre`, referencia; el contrato es la fuente): lee `motivo_cierre` (ausente → `400`); desde `EN_TRANSITO` solo vale `por_incidencia`, con rol `jefe_operativo`/`administrador` y con una condición `INCIDENCIA` abierta (si no, `409`); desde `EN_DESTINO`/`EN_DESCARGA` basta el rol; un rol sin facultad recibe **`401`** (no `403`; DEC-111, diferido). La "última parada" se aproxima por el estado de origen (criterio vigente de V1, confirmado por Backend). El evento `viaje.cerrado` lleva `motivo_cierre` para que `mensajeria` decida la ventana.

Consecuencias de diseño:

- El motivo es un campo tipado: el diseño importa `MotivoCierre` del contrato generado y no declara un catálogo propio.
- El detalle **no** trae el motivo de cierre ni el vencimiento de la ventana de escritura **[brecha 4]**: la ventana se comunica como regla asociada al motivo elegido, no como dato leído.
- Los códigos de 409 están declarados pero el runtime envía `conflicto`: la UI debe funcionar con el mensaje genérico hoy y mostrar el específico sin cambios cuando el runtime emita los códigos **[brecha 5]**.
- El `401` por falta de facultad cortaría la sesión (`client.ts`: refresco y un reintento, luego `cortarSesion()`): la defensa es no ofrecer la acción a roles sin facultad **[brecha 5]**.
- `DetalleViaje.tsx` hoy ofrece `CERRADO` como botón genérico sin motivo (`requiereCausa` no lo incluye), lo que contra `operacion` produce `400`. Se reemplaza.

## Architecture

### Vista de capas

```
routes/_private/viajes/$id (detalle, E8-T8; sin ruta nueva)
        │  usa
        ▼
features/viajes/detalle/
  ├─ cierreViaje.ts        (NUEVO, puro: tipo de cierre, bloqueo, motivos permitidos, ventana, rol facultado)
  ├─ cierreForm.tsx        (NUEVO: diálogo de cierre: motivo + ventana + razón de bloqueo)
  ├─ DetalleViaje.tsx      (CAMBIO: acción "Cerrar servicio" dedicada; intercepta CERRADO; aviso de viaje cerrado)
  ├─ useDetalleViaje.ts    (CAMBIO MÍNIMO: la mutación de cierre envía motivo_cierre; invalida el detalle en 409)
  ├─ accionesTransicion.ts (SIN CAMBIO: CERRADO ya se deriva de la máquina)
  └─ causaTransicion.ts    (SIN CAMBIO: CERRADO NO entra en DESTINOS_QUE_REQUIEREN_CAUSA; su motivo lo captura cierreForm)
        │  usa
        ▼
lib/api/viajeDetalle.ts     (CAMBIO MÍNIMO: ConflictoCodigoTransicion y mensajes ganan los dos códigos de cierre)
        │  tipos
        ▼
lib/contracts/cierreViaje.ts (NUEVO: reexporta MotivoCierre generado y arma la entrada de cierre)
lib/contracts/viajeDetalle.ts(SIN CAMBIO: TransicionEntrada, EstadoViaje, CondicionAbierta ya vienen del contrato)
```

### Componentes de `@ai27-tech/ui` (librería primero, nada nuevo)

| Necesidad                               | Componente                                                     |
| --------------------------------------- | -------------------------------------------------------------- |
| Diálogo de cierre                       | `Modal` (mismo patrón que el modal de causa)                   |
| Elegir el motivo (catálogo cerrado)     | `Select` con `SelectOption[]` (mismo patrón que `EstadiaForm`) |
| Formulario accesible, etiqueta y error  | `Form`, `FormField` (`required`, `error`)                      |
| Acción "Cerrar servicio" y confirmación | `Button` (`variant`, `disabled`, `loading`)                    |
| Razón de bloqueo y ventana de escritura | texto con clases `ui-text-body-*` y tokens `--ui-color-*`      |
| Estado terminal "Viaje cerrado"         | `Badge` o `Card`, como el resto del detalle                    |
| Éxito / conflicto / error               | `Toast` + `ToastContainer` (ya montados en `DetalleViaje`)     |

Verificado en `@ai27-tech/ui@0.2.0-beta.6`: no hay un aviso en línea dedicado (`Alert`/`Callout`). La razón de bloqueo y la ventana se componen con texto semántico, como el error de `CausaForm`, y queda registrada como solicitud opcional a la librería en `BRECHAS.md` (brecha 7); no se crea componente local.

## Componentes y responsabilidades

### `lib/contracts/cierreViaje.ts` (NUEVO)

Capa de contrato del cierre. Importa el tipo generado y no replica el enum a mano.

```ts
import type { components } from '@ai27-tech/contracts/openapi/bff';

/** Motivo de cierre generado (DEC-113): 'normal' | 'por_incidencia'. */
export type MotivoCierre = components['schemas']['MotivoCierre'];

/** Valores del catálogo, para armar el selector. Tipado contra MotivoCierre para que un cambio del contrato no compile en silencio. */
export const MOTIVOS_CIERRE: readonly MotivoCierre[] = ['normal', 'por_incidencia'] as const;

/** Arma la entrada de cierre: { a_estado: CERRADO, motivo_cierre }. No usa `causa`. */
export function entradaDeCierre(motivo: MotivoCierre): TransicionEntrada;
```

Si el contrato futuro cambia el catálogo, el tipo `MotivoCierre` deja de aceptar la lista local y falla `typecheck` en este único archivo. Requiere el pin `tracer.24` **[brecha 8]**. El `Record<MotivoCierre, …>` de `ventanaDeEscritura` obliga a cubrir todo valor nuevo.

### `features/viajes/detalle/cierreViaje.ts` (NUEVO) — funciones puras

```ts
type TipoCierre = 'normal' | 'anticipado';

/** true solo para jefe_operativo y administrador (DEC-060 #1). Ayuda de UI. */
export function puedeCerrar(rol: Rol): boolean;

/** 'anticipado' desde EN_TRANSITO; 'normal' desde EN_DESTINO/EN_DESCARGA; null si no hay cierre.
 *  Se apoya en accionesDesde(estado).includes(Cerrado); no repite la tabla de aristas. */
export function tipoDeCierre(estado: EstadoViaje): TipoCierre | null;

/** Razón de bloqueo visible, o null si el cierre puede intentarse. */
export function bloqueoDeCierre(
  estado: EstadoViaje,
  condiciones: readonly CondicionAbierta[],
): string | null;
// anticipado sin INCIDENCIA → 'El cierre anticipado solo es válido con una incidencia abierta'

/** Motivos que el diálogo ofrece según el tipo de cierre. */
export function motivosPermitidos(tipo: TipoCierre): readonly MotivoCierre[];
// anticipado → ['por_incidencia']; normal → ['normal', 'por_incidencia']

/** Ventana de escritura asociada al motivo. No calcula fechas. [brecha 4] */
export function ventanaDeEscritura(motivo: MotivoCierre): string;
// normal → '3 días'; por_incidencia → '6 meses'  (Record<MotivoCierre, string>)
```

`ventanaDeEscritura` es una tabla total sobre `MotivoCierre`. Cada texto cita su fuente (DEC-030, DEC-041). Los criterios de "última parada" por estado de origen y de rol facultado están confirmados (B2, C3, C4), por lo que no llevan marca de provisional.

### `features/viajes/detalle/cierreForm.tsx` (NUEVO)

Props: `tipo: TipoCierre`, `onConfirm(motivo): Promise<void>`, `onCancel()`.

- `Select` de motivo con `motivosPermitidos(tipo)`. Si solo hay un motivo (anticipado), queda preseleccionado y el `Select` se muestra fijo (deshabilitado) para que el usuario vea el motivo aplicado.
- Debajo del `Select`, el texto de ventana: "La conversación aceptará mensajes durante {ventanaDeEscritura(motivo)} y después pasará a sólo lectura".
- Confirmar deshabilitado sin motivo o mientras `cargando`; cancelar también deshabilitado durante el envío (Requirement 5.8).
- Errores (`400`, `409`, red) se muestran en el `FormField` y **conservan el motivo** (Requirements 5.3 y 5.7).
- Mismo patrón que `CausaForm`: si la promesa de `onConfirm` rechaza, el formulario muestra el error; si resuelve, el padre cierra el diálogo.

### `features/viajes/detalle/DetalleViaje.tsx` (CAMBIO)

- Estado local `cierreAbierto: boolean` junto a los otros modales.
- En el render de acciones (`d.acciones.map`): para `accion === EstadoViaje.Cerrado`:
  - Si `!puedeCerrar(usuario.rol)` → **no se renderiza** (Requirement 1.4).
  - Si `bloqueoDeCierre(...)` devuelve texto → `Button` deshabilitado "Cerrar servicio" con la razón visible debajo (Requirement 3.2).
  - Si no → `Button` "Cerrar servicio" que abre el diálogo. El texto genérico "Transicionar a: CERRADO" desaparece.
- En `handleAccion`: si `a_estado === EstadoViaje.Cerrado`, abre `cierreAbierto` y retorna (defensa en profundidad: nunca se envía `CERRADO` sin motivo).
- `handleCierreConfirm(motivo)`: llama a la mutación de cierre del hook, cierra el diálogo y lanza el `Toast` de éxito con la ventana del motivo (Requirement 4.2). Ante error, clasifica con la misma lógica que `enviarTransicion` y repropaga para que el formulario conserve el motivo:
  - `ErrorTransicion` (409) con `codigo` `cierre_anticipado_requiere_incidencia` → "El cierre anticipado requiere una incidencia abierta"; `cierre_anticipado_solo_por_incidencia` → "El cierre anticipado solo es válido por incidencia"; cualquier otro (incluido el `conflicto` que hoy envía el runtime) → "El cierre no es posible en el estado actual del viaje". En todos los casos recarga el detalle. **[Condicionado a brecha 5]**
  - `ApiError` 400 → mensaje del formulario "El motivo de cierre no es válido".
  - `ApiError` 403 → "El cierre requiere Jefe Operativo o Administrador". **[Condicionado a brecha 5]**
  - 401 → sin tratamiento propio; lo gobierna `client.ts` (Requirement 5.6).
- Viaje terminal en `CERRADO`: sin acciones (ya lo garantiza `accionesDesde`); se muestra una línea "Este viaje está cerrado". No se reconstruye la ventana (Requirement 4.5).

### `useDetalleViaje.ts` y `lib/api/viajeDetalle.ts` (CAMBIO MÍNIMO)

- `transicionar` conserva su firma. El hook gana una forma de enviar el cierre con `entradaDeCierre(motivo)` (por ejemplo `cerrarServicio(motivo)`) para que la mutación no mezcle `causa` con `motivo_cierre`; reutiliza la misma `useMutation` o una gemela, y en `onError` de un 409 invalida `['viaje', id]` (mismo criterio que la mutación de asignación).
- `ConflictoCodigoTransicion` gana `'cierre_anticipado_solo_por_incidencia'` y `'cierre_anticipado_requiere_incidencia'`, con su mensaje en `MENSAJE_CONFLICTO`. `clasificarConflicto` ya cae al respaldo `transicion_no_permitida` cuando el `codigo` no es reconocido, que es lo que ocurre hoy con `conflicto`. No hace falta inventar ni mapear `conflicto`.

## Correctness Properties (candidatas a PBT)

1. **Motivo obligatorio.** Para todo estado de formulario sin motivo elegido, la confirmación está deshabilitada y no se llama al envío. Para todo envío, `entradaDeCierre(m)` produce `{ a_estado: CERRADO, motivo_cierre: m }` con `m ∈ MOTIVOS_CIERRE` y sin `causa`.
2. **Anticipado solo por incidencia.** Para `estado === EN_TRANSITO`, `motivosPermitidos('anticipado') = {por_incidencia}`; y `bloqueoDeCierre(EN_TRANSITO, c) !== null` si y solo si `c` no contiene una `INCIDENCIA`.
3. **Sin bloqueo fuera del anticipado.** Para `estado ∈ {EN_DESTINO, EN_DESCARGA}` y cualquier `condiciones`, `bloqueoDeCierre` es `null`: la UI no inventa un gateo por `arribo` ni por incidencia en el cierre normal (C3, B2).
4. **Terminal sin acciones.** Para todo estado terminal (incluido `CERRADO`), `tipoDeCierre(estado) === null` y no se renderiza ninguna acción de cierre.
5. **Rol facultado.** Para todo `rol: Rol`, `puedeCerrar(rol)` es verdadero si y solo si `rol ∈ {jefe_operativo, administrador}`. Ocultar la acción no sustituye la autorización del `bff` (C4, DEC-060).
6. **Ventana total y sin fechas.** `ventanaDeEscritura` está definida para todo `MotivoCierre`; `normal → 3 días`, `por_incidencia → 6 meses`. Nunca produce una fecha. **[Condicionado a brecha 4 si Producto exige la fecha]**
7. **Derivación desde la máquina.** `tipoDeCierre(e) !== null` si y solo si `accionesDesde(e)` contiene `CERRADO`; no existe una segunda tabla de aristas de cierre.
8. **Clasificación de errores.** Todo `409` del cierre se clasifica como `ErrorTransicion` y recarga el detalle sin presentar el viaje como cerrado; un `codigo` desconocido (como `conflicto`) cae al mensaje genérico; todo `400` conserva el motivo elegido.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir los casos del cierre, sin cambiar el contrato:

- `VJ-1004` (`EN_DESTINO`) y `VJ-1008` (`EN_DESCARGA`): cierre normal ya cubierto por datos existentes.
- `VJ-1001` / `VJ-1006` (`EN_TRANSITO`, sin incidencia): cierre anticipado bloqueado.
- **Nuevo** `VJ-1010` (`EN_TRANSITO` con `condiciones_activas: [{ tipo: 'INCIDENCIA', … }]`): cierre anticipado permitido.
- `VJ-1007` (`CERRADO`): viaje ya cerrado.
- El manejo de `a_estado === 'CERRADO'` en `POST /viajes/:id/transiciones` imita `validarCierre`: `motivo_cierre` ausente o fuera del enum → `400`; desde `EN_TRANSITO` con motivo distinto de `por_incidencia` → `409` con `codigo: cierre_anticipado_solo_por_incidencia`; sin `INCIDENCIA` abierta → `409` con `codigo: cierre_anticipado_requiere_incidencia`; arista inválida → `409 transicion_no_permitida` (comportamiento ya existente).
- Un encabezado de prueba (`x-mock-409-generico`) hace que esos `409` lleguen con `codigo: conflicto`, para ejercitar el comportamiento real del runtime de hoy (Escenario 11).
- Un encabezado de prueba (`x-mock-rol-sin-facultad`) fuerza `403` para ejercitar Requirement 5.4 (el contrato declara `403`; el backend real hoy responde `401`, brecha 5).
- Un caso de carrera forzable: el cierre anticipado de `VJ-1010` responde `409` si la incidencia ya fue resuelta en el mock.

## Decisiones

- **Sin operación nueva:** el cierre es `transicionarViaje`; el diseño no añade clientes a mano ni capas paralelas.
- **Motivo tipado, sin catálogo local:** `MotivoCierre` viene del contrato generado (`tracer.24`). La capa `cierreViaje.ts` es el único punto de acoplamiento; no hay puente por `causa`.
- **Prevención en la UI, autoridad en el `bff`:** rol, estado y `condiciones_activas` bastan para ocultar o bloquear sin replicar dominio; las guardas reales siguen en `operacion`. Cubre los estados obligatorios sin depender de códigos que el runtime todavía no emite (brecha 5).
- **Códigos de 409 preparados:** se ampliaron tipo y mensajes para los códigos declarados en `tracer.24`; el respaldo existente cubre el `conflicto` de hoy. Cuando plataforma emita los códigos, no hay cambio en la UI.
- **Acción dedicada en lugar del botón genérico:** corrige el hueco actual (cierre sin motivo) sin tocar `requiereCausa` ni `causaForm`, porque el motivo de cierre es un catálogo cerrado y no una causa libre.
- **Ventana comunicada como regla, no como fecha:** el detalle no trae motivo ni vencimiento (brecha 4); calcular `cerrado_en + 3 días` sería reimplementar una regla de `mensajeria`.
- **Sin gateo por `destinos[].arribo`:** confirmado por Producto y Backend; `operacion` tampoco lo verifica.
- **Sin cambios en `client.ts`:** el riesgo del `401` por falta de facultad es transversal; se mitiga con la prevención por rol. Backend propone que `transicionarViaje` no corte sesión ante un 401; `client.ts` ya refresca antes de cortar, por lo que la propuesta se eleva al senior y no se implementa aquí.
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; la falta de un aviso en línea se registra como solicitud, no como componente local.
