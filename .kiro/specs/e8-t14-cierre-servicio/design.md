# Design Document

## Overview

Diseño del **cierre del servicio** (E8-T14): la acción del panel interno con la que el Jefe Operativo (o el Administrador) cierra un viaje con un motivo, desde el detalle del viaje (E8-T8). Se construye sobre las convenciones ya establecidas en `pf-web-frontend-internal` (capas `lib/contracts` → `lib/api` → `features`, TanStack Query, `@ai27-tech/ui`), igual que el detalle del viaje, la asignación de escolta (E8-T10) y el histórico (E8-T13), sin introducir patrones nuevos.

El cambio es pequeño y concentrado: **no hay operación nueva**. El cierre reutiliza `transicionar` (`POST /api/v1/viajes/{id}/transiciones`), el hook `useDetalleViaje` y la derivación de acciones `accionesDesde`. Lo nuevo es (a) una capa de contrato aislada que fija cómo viaja el motivo, (b) funciones puras que deciden cuándo y cómo se ofrece el cierre, (c) un formulario de cierre, y (d) el cableado en `DetalleViaje` que reemplaza el botón genérico "Transicionar a: CERRADO".

> **Spec con brechas abiertas.** Las decisiones de diseño que dependen de una brecha de `BRECHAS.md` están marcadas **[Condicionado a brecha N]** y se localizan en un solo módulo para que cerrarlas sea un cambio acotado. Las reglas marcadas "provisional" no son vigentes hasta que Producto, Contratos o Backend las confirmen.

### Hecho de contrato verificado (fundamento del diseño)

Contexto consultado: `ai27-platform-context` commit `07f906d`. Contrato fijado por el frontend: `@ai27-tech/contracts@0.1.0-tracer.22`, `@ai27-tech/ui@0.2.0-beta.6`. El último tag publicado es `tracer.23` (solo agrega `transicionarViajeCliente`, no afecta al cierre). Superficie leída con `git show v0.1.0-tracer.22:…` porque el checkout local de contratos no está en ese tag.

```
POST /api/v1/viajes/{id}/transiciones   transicionarViaje
     body TransicionEntrada { a_estado: string, causa?: string }  (additionalProperties: false)
     200 ViajeDetalle { viaje: ViajeInterno, condiciones_activas: CondicionAbierta[] }
     400 SolicitudInvalida · 401 NoAutorizado · 403 Prohibido · 409 Error (codigo documentado: transicion_no_permitida)

Aristas a CERRADO (viaje.estados.yaml):
  EN_DESTINO  → CERRADO   guarda ultima_parada
  EN_DESCARGA → CERRADO   guarda ultima_parada
  EN_TRANSITO → CERRADO   guarda cierre_anticipado_por_incidencia

CondicionAbierta { tipo: INCIDENCIA | SIN_SENAL, abierta_en }
```

Comportamiento real de `operacion` (`validarCierre`, referencia; el contrato es la fuente): el motivo se lee de `causa` y debe ser `normal`, `por_incidencia` o `bitacora` (si no, `400`); desde `EN_TRANSITO` solo vale `por_incidencia`, con rol `jefe_operativo`/`administrador` y con una condición `INCIDENCIA` abierta (si no, `409`); desde `EN_DESTINO`/`EN_DESCARGA` basta el rol; un rol sin facultad recibe **`401`** (no `403`; DEC-111). El evento `viaje.cerrado` lleva `motivo_cierre` para que `mensajeria` decida la ventana.

Consecuencias de diseño:

- El motivo no es un campo tipado del contrato: se aísla el puente `causa` en una sola capa **[brecha 1]**.
- El detalle **no** trae el motivo de cierre ni el vencimiento de la ventana de escritura **[brecha 4]**: la ventana se comunica como regla asociada al motivo elegido, no como dato leído.
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
  ├─ useDetalleViaje.ts    (SIN CAMBIO: reutiliza transicionar(a_estado, causa?))
  ├─ accionesTransicion.ts (SIN CAMBIO: CERRADO ya se deriva de la máquina)
  └─ causaTransicion.ts    (SIN CAMBIO: CERRADO NO entra en DESTINOS_QUE_REQUIEREN_CAUSA; su motivo lo captura cierreForm)
        │  usa
        ▼
lib/api/viajeDetalle.ts     (SIN CAMBIO: transicionar + clasificarConflicto)
        │  tipos
        ▼
lib/contracts/cierreViaje.ts (NUEVO: único punto de acoplamiento del motivo; brecha 1)
lib/contracts/viajeDetalle.ts(SIN CAMBIO: TransicionEntrada, EstadoViaje, CondicionAbierta)
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

Verificado en `@ai27-tech/ui@0.2.0-beta.6`: no hay un aviso en línea dedicado (`Alert`/`Callout`). La razón de bloqueo y la ventana se componen con texto semántico, como el error de `CausaForm`, y se registra como solicitud a la librería en `BRECHAS.md` (brecha 7); no se crea componente local.

## Componentes y responsabilidades

### `lib/contracts/cierreViaje.ts` (NUEVO) — **[Condicionado a brecha 1]**

Único módulo que sabe cómo viaja el motivo de cierre hoy.

```ts
export const MotivoCierre = {
  Normal: 'normal',
  PorIncidencia: 'por_incidencia',
  Bitacora: 'bitacora',
} as const;
export type MotivoCierre = (typeof MotivoCierre)[keyof typeof MotivoCierre];
export const MOTIVOS_CIERRE: readonly MotivoCierre[]; // [normal, por_incidencia, bitacora]

/** Arma la entrada de cierre. Hoy el motivo viaja en `causa` (brecha 1). */
export function entradaDeCierre(motivo: MotivoCierre): TransicionEntrada;
// → { a_estado: EstadoViaje.Cerrado, causa: motivo }
```

El módulo documenta con un comentario que los literales replican lo que `operacion` valida y apuntan a la brecha 1. Si el contrato publica `motivo_cierre` tipado, este archivo pasa a reexportar el enum generado y `entradaDeCierre` cambia su cuerpo; nadie más se entera. Sigue el mismo criterio de aislamiento que la Opción A de E8-T9.

### `features/viajes/detalle/cierreViaje.ts` (NUEVO) — funciones puras

```ts
type TipoCierre = 'normal' | 'anticipado';

/** true solo para jefe_operativo y administrador (DEC-060 #1). Ayuda de UI. [brecha 6] */
export function puedeCerrar(rol: Rol): boolean;

/** 'anticipado' desde EN_TRANSITO; 'normal' desde EN_DESTINO/EN_DESCARGA; null si no hay cierre. [brecha 6]
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
// anticipado → [por_incidencia]; normal → [normal, por_incidencia, bitacora]

/** Ventana de escritura asociada al motivo. No calcula fechas. [brecha 3, brecha 4] */
export function ventanaDeEscritura(motivo: MotivoCierre): { texto: string; definida: boolean };
// normal → '3 días'; por_incidencia → '6 meses'; bitacora → 'por definir' (definida: false)
```

`ventanaDeEscritura` es una tabla total sobre `MotivoCierre`: un motivo nuevo sin entrada no compila. Cada texto cita su fuente (DEC-030, DEC-041) y el valor de `bitacora` lleva la marca "provisional, brecha 3".

### `features/viajes/detalle/cierreForm.tsx` (NUEVO)

Props: `tipo: TipoCierre`, `onConfirm(motivo): Promise<void>`, `onCancel()`.

- `Select` de motivo con `motivosPermitidos(tipo)`. Si solo hay un motivo (anticipado), queda preseleccionado y el `Select` se muestra fijo (deshabilitado) para que el usuario vea el motivo aplicado.
- Debajo del `Select`, el texto de ventana de `ventanaDeEscritura(motivo)`: "La conversación aceptará mensajes durante {texto} y después pasará a sólo lectura", o "La ventana de escritura de este motivo está por definir" cuando `definida` es falso.
- Confirmar deshabilitado sin motivo o mientras `cargando`; el cierre del diálogo (cancelar) también se deshabilita durante el envío (Requirement 5.8).
- Errores (`400`, `409`, red) se muestran en el `FormField` y **conservan el motivo** (Requirement 5.3 y 5.7).
- Cierra por patrón igual a `CausaForm`: la promesa de `onConfirm` rechaza → el formulario muestra el error; resuelve → el padre cierra el diálogo.

### `features/viajes/detalle/DetalleViaje.tsx` (CAMBIO)

- Estado local `cierreAbierto: boolean` junto a los otros modales.
- En el render de acciones (`d.acciones.map`): para `accion === EstadoViaje.Cerrado`:
  - Si `!puedeCerrar(usuario.rol)` → **no se renderiza** (Requirement 1.4).
  - Si `bloqueoDeCierre(...)` devuelve texto → se renderiza `Button` deshabilitado "Cerrar servicio" con la razón visible debajo (Requirement 3.2).
  - Si no → `Button` "Cerrar servicio" que abre el diálogo. El texto genérico "Transicionar a: CERRADO" desaparece.
- En `handleAccion`: si `a_estado === EstadoViaje.Cerrado`, abre `cierreAbierto` y retorna (defensa en profundidad: nunca se envía `CERRADO` sin motivo).
- `handleCierreConfirm(motivo)`: llama `d.transicionar(EstadoViaje.Cerrado, motivo)` (el hook ya envía `{ a_estado, causa }`), cierra el diálogo y lanza el `Toast` de éxito con la ventana del motivo. Ante error, clasifica con la misma lógica que `enviarTransicion` y repropaga para que el formulario conserve el motivo.
  - `ErrorTransicion` (409) → toast de conflicto "El cierre no es posible en el estado actual del viaje", recarga automática (el hook ya invalida `['viaje', id]` en `onSuccess`; en `onError` de 409 el diseño añade la invalidación, igual que `mutacionAsignacion`). **[Condicionado a brecha 5: mensaje por `codigo` si se publica]**
  - `ApiError` 400 → mensaje del formulario "El motivo de cierre no es válido".
  - `ApiError` 403 → "El cierre requiere Jefe Operativo o Administrador". **[Condicionado a brecha 5]**
  - 401 → sin tratamiento propio; lo gobierna `client.ts` (Requirement 5.6).
- Viaje terminal en `CERRADO`: sin acciones (ya lo garantiza `accionesDesde`); se muestra una línea "Este viaje está cerrado" usando `viajeTerminal` y el estado. No se reconstruye la ventana (Requirement 4.6).

`useDetalleViaje.ts` se mantiene sin cambios de firma; la única adición posible es invalidar el detalle también cuando la mutación de transición falla con 409, para reflejar el estado real tras una carrera (mismo criterio que la mutación de asignación).

## Correctness Properties (candidatas a PBT)

1. **Motivo obligatorio.** Para todo estado de formulario sin motivo elegido, la confirmación está deshabilitada y no se llama a `transicionar`. Para todo envío, `entradaDeCierre(m).causa ∈ MOTIVOS_CIERRE` y `a_estado === CERRADO`.
2. **Anticipado solo por incidencia.** Para todo `estado === EN_TRANSITO`, `motivosPermitidos('anticipado') = {por_incidencia}`; y `bloqueoDeCierre(EN_TRANSITO, c) !== null` si y solo si `c` no contiene una `INCIDENCIA`.
3. **Sin bloqueo fuera del anticipado.** Para `estado ∈ {EN_DESTINO, EN_DESCARGA}` y cualquier `condiciones`, `bloqueoDeCierre` es `null` (la UI no inventa un gateo por `arribo` ni por incidencia en el cierre normal). **[provisional, brecha 6]**
4. **Terminal sin acciones.** Para todo estado terminal (incluido `CERRADO`), `tipoDeCierre(estado) === null` y no se renderiza ninguna acción de cierre.
5. **Rol facultado.** Para todo `rol: Rol`, `puedeCerrar(rol)` es verdadero si y solo si `rol ∈ {jefe_operativo, administrador}`. Ocultar la acción no sustituye la autorización del `bff`. **[brecha 6]**
6. **Ventana total y sin invención.** `ventanaDeEscritura` está definida para todo `MotivoCierre`; `normal → 3 días`, `por_incidencia → 6 meses`, `bitacora → definida: false`. Nunca produce una fecha. **[brecha 3, brecha 4]**
7. **Derivación desde la máquina.** `tipoDeCierre(e) !== null` si y solo si `accionesDesde(e)` contiene `CERRADO`; no existe una segunda tabla de aristas de cierre.
8. **Clasificación de errores.** Todo `409` del cierre se clasifica como `ErrorTransicion` (conflicto) y recarga el detalle sin presentar el viaje como cerrado; todo `400` conserva el motivo elegido.

## Mocks (MSW)

Ampliar `src/mocks/data.ts` y `handlers.ts` para servir los casos del cierre, sin cambiar el contrato:

- `VJ-1004` (`EN_DESTINO`) y `VJ-1008` (`EN_DESCARGA`): cierre normal ya cubierto por datos existentes.
- `VJ-1001` / `VJ-1006` (`EN_TRANSITO`, sin incidencia): cierre anticipado bloqueado.
- **Nuevo** `VJ-1010` (`EN_TRANSITO` con `condiciones_activas: [{ tipo: 'INCIDENCIA', … }]`): cierre anticipado permitido.
- `VJ-1007` (`CERRADO`): viaje ya cerrado.
- `transicionarViajeMock` (o un envoltorio en el handler) imita `validarCierre` solo para `a_estado === 'CERRADO'`: `causa` ausente o fuera del catálogo → `400`; desde `EN_TRANSITO` con motivo distinto de `por_incidencia` o sin `INCIDENCIA` → `409`; arista inválida → `409 transicion_no_permitida` (comportamiento ya existente).
- Un encabezado de prueba (`x-mock-rol-sin-facultad`) fuerza `403` para ejercitar Requirement 5.4 (el contrato declara `403`; el backend real hoy responde `401`, ver brecha 5).
- Un caso de carrera forzable: el cierre anticipado de `VJ-1010` responde `409` si la incidencia ya fue resuelta en el mock.

## Decisiones

- **Sin operación nueva:** el cierre es `transicionarViaje`; el diseño no añade clientes a mano ni capas paralelas.
- **Puente de motivo aislado (brecha 1):** un solo archivo conoce que el motivo viaja en `causa`. Evita esparcir tres literales por la UI y deja el cambio futuro en un punto.
- **Prevención en la UI, autoridad en el `bff`:** rol, estado y `condiciones_activas` bastan para ocultar o bloquear sin replicar dominio; las guardas reales siguen en `operacion`. Cubre los estados obligatorios sin depender de códigos de error que el contrato aún no publica (brecha 5).
- **Acción dedicada en lugar del botón genérico:** corrige el hueco actual (cierre sin motivo) sin tocar `requiereCausa` ni `causaForm`, porque el motivo de cierre es un catálogo cerrado y no una causa libre.
- **Ventana comunicada como regla, no como fecha:** el detalle no trae motivo ni vencimiento (brecha 4); calcular `cerrado_en + 3 días` sería reimplementar una regla de `mensajeria`.
- **`bitacora` visible pero sin ventana:** se ofrece porque `operacion` lo acepta y la HU lo lista, y se marca "por definir" para no inventar significado (brecha 3). Si Producto lo retira, se quita de `MOTIVOS_CIERRE`.
- **Sin gateo por `destinos[].arribo`:** ninguna fuente lo define (brecha 6); `operacion` tampoco lo verifica.
- **Sin cambios en `client.ts`:** el riesgo del `401` por falta de facultad es transversal; se mitiga con la prevención por rol y se eleva al senior (brief, sección D).
- **Nada de UI nueva:** solo composición de `@ai27-tech/ui`; la falta de un aviso en línea se registra como solicitud, no como componente local.
