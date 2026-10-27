# Diseño: Ficha técnica del viaje (E8-T12)

## Overview

Este diseño cubre el flujo funcional de E8-T12 en el panel interno: el `monitorista` abre la ficha técnica de un `viaje`, lee los datos conocidos, y —cuando el contrato lo permita— captura y edita la ficha de forma incremental. El contrato verificado (`@ai27-tech/contracts@0.1.0-tracer.20`) expone **lectura** del detalle del viaje (`obtenerViajeInterno` → `ViajeDetalle`) y la escolta/roster (`asignarRecursos`/`listarUnidades`), pero **no expone escritura ni edición de la ficha técnica**, ni campos de **contenedores**, **tracto del cliente** o **lista de GPS del catálogo**. El diseño se apega a esa forma: construye la lectura y la representación sobre lo disponible, aísla la escritura tras una frontera de adaptador que queda **condicionada a las brechas** de `BRECHAS.md`, y no inventa superficie contractual.

## Architecture

La solución separa navegación, presentación de la ficha, formulario y estado de edición, adaptadores contractuales y cliente HTTP autenticado. El BFF conserva autorización, alcance, validación, persistencia y auditoría. La escritura de ficha es un punto de extensión aislado que se habilita cuando la operación contractual exista.

## Components and Interfaces

Los componentes funcionales y la frontera del adaptador se describen en la sección 4. Las interfaces técnicas concretas dependen de los tipos contractuales verificados; la parte de escritura no se declara con tipos wire inventados.

## Data Models

El modelo conceptual de la ficha y del formulario se describe en la sección 5; no duplica el wire contractual y usa los tipos generados disponibles para la lectura (`ViajeDetalle`, `ViajeInterno`, `Unidad`).

## Correctness Properties

### Property 1: Ausencia de campos excluidos

Para cualquier estado de la ficha, no existe campo, control ni DOM para `cuenta espejo`, `clave_amago` ni `kit de seguridad`, y ningún payload construido los incluye.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 2: Resultado fiel y frontera contractual

Para cualquier respuesta contractual, la UI muestra únicamente los datos que el BFF confirma. La escritura, cuando exista, usa únicamente la operación contractual verificada; la UI no emite endpoints inventados ni infiere el resultado desde el estado local.

**Validates: Requirements 2.1, 3.3, 3.5**

Las propiedades adicionales se encuentran en la sección 11: escolta derivada, destinos/contenedores con orden y cardinalidad, GPS sin texto libre, un solo guardado y no invención ante contrato incompleto.

## Error Handling

El manejo de errores se encuentra en la sección 8 e incluye lectura, catálogos, sesión, autorización, guardado rechazado, respuesta insuficiente, red y éxito confirmado.

## Testing Strategy

La estrategia de pruebas se encuentra en la sección 10 e incluye lectura y estados, ausencia de campos excluidos (DOM y payload), escolta derivada, grupos repetibles, selección de GPS, guardado condicionado, accesibilidad y frontera contractual.

## 1. Objetivo y límites

El diseño cubre el flujo del panel interno para que el `monitorista` abra la ficha técnica de un viaje de su alcance, lea los datos conocidos, y capture/edite la ficha cuando exista la superficie contractual. La interfaz representa la ficha según el BFF; no decide persistencia ni resultado localmente.

El frontend lee, presenta, captura y —condicionado a brecha— orquesta la escritura y clasifica su respuesta. El BFF conserva autorización, alcance, validación, persistencia, edición incremental y auditoría. No se inventan endpoints, payloads, campos, catálogos ni componentes compartidos. La ficha técnica y el histórico de bitácora (E8-T13) son superficies distintas.

## 2. Decisiones de diseño

1. **Lectura primero, escritura condicionada:** el flujo se construye sobre la lectura verificada (`obtenerViajeInterno` → `ViajeDetalle`) y la escolta (`asignarRecursos`/`listarUnidades`). La captura/edición de la ficha se aísla tras un adaptador cuyo punto de escritura queda **deshabilitado y marcado como brecha** hasta que el contrato publique la operación (Brecha 1 de `BRECHAS.md`). Mientras tanto, la UI opera en solo lectura sobre lo disponible.
2. **Escolta derivada, no recapturada:** la ficha muestra la escolta a partir de la asignación (E8-T10). No existe recaptura de custodios ni de patrulla como recursos sueltos. Los campos exactos de la `unidad` mostrados quedan sujetos al Pendiente P-1 (dueño Operación).
3. **Frontera de adaptador:** los componentes visuales trabajan con estado de formulario; un adaptador aislado transforma ese estado a los tipos contractuales verificados y clasifica cada respuesta. El punto de escritura del adaptador es el único lugar que tocaría la operación de ficha cuando exista.
4. **Campos excluidos ausentes por construcción:** `cuenta espejo`, `clave_amago` y `kit de seguridad` no tienen campo, control, DOM ni representación en ningún payload. Es una propiedad verificable, no una validación de entrada.
5. **Grupos repetibles y selección de catálogo por composición:** destinos (1..N) y contenedores (0..N) se componen con `FormRow` + primitivas + `Button` agregar/quitar; la lista de GPS se compone con `Table`/`Card` + `Checkbox` sobre el catálogo registrado. Sin componentes locales nuevos; una ausencia se registra como brecha de UI.
6. **Tracto como texto libre:** el tracto del cliente se captura con `Input`/`Textarea`, sin catálogo (DEC-011/DEC-017), cuando exista la superficie de escritura.
7. **Respuesta como autoridad:** la UI muestra la ficha guardada solo cuando la respuesta contractual la confirma; no infiere éxito desde el estado local.

## 3. Arquitectura propuesta

```text
Ruta privada / navegación (detalle del viaje)
        ↓
Pantalla de ficha técnica
        ↓
Vista de lectura (datos del viaje + escolta derivada)
        ↓
Formulario de captura/edición  ──(condicionado a Brecha 1)──┐
   · datos generales                                        │
   · tracto (texto libre)        ──(Brecha 4)               │
   · destinos (1..N)  / contenedores (0..N) ──(Brecha 2)    │
   · lista de GPS (catálogo)     ──(Brecha 3)               │
        ↓                                                   │
Estado de interacción y validación local                   │
        ↓                                                   │
Adaptador contractual (lectura verificada;                 │
   punto de escritura deshabilitado hasta Brecha 1) ←───────┘
        ↓
Cliente HTTP autenticado existente
        ↓
BFF
```

Las operaciones verificadas y disponibles son `obtenerViajeInterno`, `asignarRecursos` (lectura de escolta) y `listarUnidades`. Las operaciones de escritura de ficha, contenedores y GPS **no existen** en el contrato verificado y se tratan como brechas.

## 4. Componentes funcionales

- **Pantalla de ficha técnica:** integra la ficha en la navegación del detalle del viaje y aplica la guardia de rol/alcance como experiencia de usuario; el BFF es la autoridad.
- **Vista de lectura:** presenta origen, destinos, campos de servicio disponibles y la escolta derivada de la asignación; distingue carga, vacío, error y datos presentes.
- **Formulario de captura/edición (condicionado):** captura datos generales, tracto (texto libre), grupos repetibles de destinos y contenedores, y selección de GPS del catálogo. Se habilita cuando exista la operación de escritura.
- **Sección de escolta (solo lectura):** muestra las `unidades` de la escolta derivadas de la asignación; no ofrece recaptura de custodios ni patrulla.
- **Grupo repetible de destinos:** conserva lista ordenada de 1..N destinos; agregar/quitar por composición de primitivas.
- **Grupo repetible de contenedores:** conserva 0..N contenedores; cero es válido.
- **Selector de lista de GPS:** elige dispositivos del catálogo registrado por composición (`Table`/`Card` + `Checkbox`); sin texto libre; estados de carga/vacío/error.
- **Confirmación y resultado:** deshabilita guardados duplicados y muestra la ficha actualizada cuando la respuesta la confirma.
- **Adaptador contractual:** único lugar que importa tipos generados, invoca la lectura verificada y —cuando exista— la escritura de ficha; traduce errores a estados de UI. El punto de escritura queda marcado como brecha.

Los nombres anteriores son roles funcionales, no una instrucción para duplicar componentes existentes.

## 5. Modelo conceptual de datos

```text
FichaView {
  viaje: ViajeInterno (lectura verificada)
  escolta: lista de Unidad derivada de la asignación (campos sujetos a P-1)
  condicionesActivas: lista (dato separado del estado)
}

EstadoFormulario {
  datosGenerales: { tipoServicio, lineaTransporte?, operadorLogistico?, ... }  // sujeto a contrato
  tracto: texto libre                                   // Brecha 4
  destinos: lista ordenada 1..N { nombre, numeroEnvio?, ... }
  contenedores: lista 0..N { ... }                      // Brecha 2
  gpsSeleccionados: lista de referencias del catálogo   // Brecha 3
}

// Campos que NO existen en el modelo y no se declaran:
//   cuentaEspejo  (DEC-009)
//   claveAmago    (DEC-039)
//   kitSeguridad  (DEC-047 §F.1)

ResultadoGuardado {
  ficha: representación confirmada por el BFF   // Brecha 1
  error: presente si el BFF rechaza
}
```

Son modelos conceptuales, no tipos wire. El adaptador usa los tipos generados disponibles para la lectura (`ViajeDetalle`, `ViajeInterno`, `Unidad`) y **no declara** interfaces locales que dupliquen o inventen el contrato de escritura.

## 6. Flujo de interacción

1. La ruta vigente valida la sesión y la experiencia identifica rol `monitorista` y alcance.
2. La pantalla carga el detalle del viaje mediante `obtenerViajeInterno` y la escolta mediante la lectura verificada; distingue carga, vacío, éxito y error.
3. La vista de lectura muestra origen, destinos, campos de servicio y la escolta derivada.
4. Si existe la operación de escritura (Brecha 1 resuelta), el formulario se habilita precargado con los datos conocidos; el usuario captura datos faltantes y edita los existentes.
5. El usuario agrega/quita destinos (1..N) y contenedores (0..N), captura el tracto como texto libre, y elige GPS del catálogo registrado, según las superficies disponibles.
6. Antes de guardar, la UI valida las reglas confirmadas y bloquea guardados adicionales.
7. El adaptador ejecuta la operación de escritura verificada. La UI representa la ficha según la respuesta del BFF.
8. Ante rechazo, la UI conserva los datos, muestra un error accionable y no presenta la ficha como guardada. Ante sesión expirada, delega al flujo vigente.
9. Mientras la escritura no exista en el contrato, la pantalla opera en solo lectura, muestra el estado de brecha y no ofrece controles de guardado que no puedan ejecutarse.

## 7. Validación funcional

La UI valida orden y cardinalidad de destinos (1..N) y permite cero contenedores. El tracto es texto libre. La selección de GPS no admite texto libre. La escolta es derivada y no recapturable. Las reglas adicionales de obligatoriedad por campo solo se aplican si están confirmadas (Pendiente de E1-HU-006).

La UI no valida ni resuelve localmente autorización, alcance, persistencia, atomicidad ni auditoría. Esas responsabilidades pertenecen al BFF y al dominio.

## 8. Manejo de errores

| Situación                                              | Resultado esperado                                          |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Detalle o escolta en carga                             | Estado de carga distinto de vacío                           |
| Viaje inexistente o fuera de alcance                   | Estado explícito (403/404 del BFF); sin datos inventados    |
| Catálogo de GPS en carga o vacío                       | Estado diferenciado; sin selección sobre datos ausentes     |
| Sesión expirada                                        | Delegar al flujo vigente de sesión                          |
| Rechazo de autorización o alcance                      | Mostrar fallo; no mostrar éxito                             |
| Escritura de ficha rechazada (condicionado a Brecha 1) | Mostrar fallo; conservar datos; no presentar ficha guardada |
| Operación de escritura inexistente en contrato         | Solo lectura; representar brecha; no inventar endpoint      |
| Respuesta insuficiente                                 | Reportar brecha contractual; no inventar operación          |
| Error de red o desconocido                             | Error accionable; permitir reintento cuando sea posible     |
| Guardado confirmado                                    | Mostrar aviso de éxito y ficha actualizada del BFF          |

## 9. Accesibilidad

Los controles tendrán etiquetas visibles y asociación programática. Los grupos repetibles comunicarán por teclado las acciones de agregar y quitar, y el número de elementos. La selección de GPS será operable por teclado y comunicará los dispositivos elegidos. Los errores se asociarán al campo correspondiente y los estados de carga/éxito/error usarán los patrones accesibles de `@ai27-tech/ui`. No se dependerá solo del color o iconografía.

Si falta una affordance en la librería compartida, se registra la brecha y no se duplica localmente hasta contar con definición.

## 10. Estrategia de pruebas

- Verificar la lectura del detalle y la escolta derivada, con estados de carga, vacío, error y datos presentes.
- Verificar por DOM y por payload que **no** existen `cuenta espejo`, `clave_amago` ni `kit de seguridad` (definición de terminado de E8-T12).
- Verificar grupos repetibles: agregar/quitar destinos conservando orden; agregar/quitar contenedores; cero contenedores válido.
- Verificar selección de GPS desde catálogo sin texto libre (condicionado a Brecha 3).
- Verificar guardado condicionado a Brecha 1: éxito representa la respuesta del BFF; rechazo conserva datos y no presenta ficha guardada.
- Verificar bloqueo de doble guardado y preservación de datos ante error.
- Verificar que la UI no emite endpoints inventados y opera en solo lectura cuando la escritura no existe.
- Verificar accesibilidad con los componentes compartidos disponibles.
- Verificar adaptadores contra los tipos contractuales instalados antes de escribir código dependiente de su forma.

## 11. Propiedades de corrección

1. **Campos excluidos:** para cualquier estado, no hay campo, control, DOM ni payload para `cuenta espejo`, `clave_amago` ni `kit de seguridad`.
2. **Escolta derivada:** la escolta se muestra a partir de la asignación; no existe recaptura de custodios ni patrulla.
3. **Destinos:** para cualquier lista válida, se conserva orden y cardinalidad (1..N).
4. **Contenedores:** 0..N admitido; cero no es error.
5. **GPS sin texto libre:** la lista de GPS solo se arma por selección del catálogo registrado.
6. **Un solo guardado:** mientras un guardado está pendiente, los intentos adicionales producen una sola solicitud.
7. **Resultado fiel:** la UI muestra la ficha devuelta por el BFF, sin inferir el resultado desde el estado local.
8. **Frontera contractual:** la escritura usa únicamente la operación verificada; ante contrato incompleto, la UI opera en solo lectura y reporta la brecha sin inventar superficie.

## 12. Verificación previa y brechas

El contrato instalado (`@ai27-tech/contracts@0.1.0-tracer.20`, tag `v0.1.0-tracer.20`) se verificó. **Disponible:** `obtenerViajeInterno` (`GET /api/v1/viajes/{id}/detalle` → `ViajeDetalle`/`ViajeInterno`), `asignarRecursos` (lectura de escolta) y `listarUnidades`. **No disponible (brechas, ver `BRECHAS.md`):** escritura/edición de ficha (Brecha 1), contenedores (Brecha 2), lista de GPS del catálogo (Brecha 3) y campo de tracto (Brecha 4). Pendiente de producto P-1: campos exactos de la `unidad` en la ficha (dueño Operación).

En `@ai27-tech/ui@0.2.0-beta.6` se confirmó la ausencia de un componente dedicado de grupo repetible y de multiselección de catálogo: se componen con primitivas (`Form`/`FormRow`/`Input`/`Textarea`/`Button` y `Table`/`Card`/`Checkbox`), no se duplican localmente. Un control dedicado sería una solicitud a la librería.

El diseño se construye de modo que, al resolverse las brechas, solo se habilita el punto de escritura del adaptador y los controles de captura ya compuestos, sin rediseñar la vista de lectura.
