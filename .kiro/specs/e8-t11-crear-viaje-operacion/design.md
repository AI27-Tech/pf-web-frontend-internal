# Diseño: Crear viaje por Operación (E8-T11)

## Overview

Este diseño cubre el flujo funcional de E8-T11 en el panel interno. El contrato verificado (`@ai27-tech/contracts`) expone la creación con asignación como dos operaciones encadenadas del BFF: `crearViaje` (deja `APROBADO`) y `asignarRecursos` (reserva atómica que lleva a `ASIGNADO`). El diseño se apega a esa forma y no inventa una mutación combinada.

## Architecture

La solución separa navegación, formulario, estado de interacción, adaptadores contractuales y cliente HTTP autenticado; el BFF conserva autorización, alcance y atomicidad.

## Components and Interfaces

Los componentes funcionales y la frontera del adaptador se describen en la sección 4. Las interfaces técnicas concretas dependen de los tipos contractuales verificados.

## Data Models

El modelo conceptual del formulario y del resultado se describe en la sección 5; no constituye una duplicación del wire contractual.

## Correctness Properties

### Property 1: Campos obligatorios

Para cualquier estado sin cliente, origen, destino o fecha/hora, la UI bloquea el envío y señala el dato faltante.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: Resultado fiel y frontera contractual

Para cualquier respuesta contractual, la UI muestra únicamente el identificador y estado confirmados por el BFF. El flujo usa únicamente `crearViaje` y, cuando hay unidades, `asignarRecursos`; no emite una tercera operación de compensación, reparación o publicación.

**Validates: Requirements 3.1, 4.3, 5.1, 5.3, 5.4**

Las propiedades adicionales se encuentran en la sección 11: conservación de destinos, aptitud no bloqueante, un solo envío y ausencia de resultado parcial.

## Error Handling

El manejo de errores se encuentra en la sección 8 e incluye consultas, sesión, autorización, disponibilidad, respuesta insuficiente, red y resultados confirmados.

## Testing Strategy

La estrategia de pruebas se encuentra en la sección 10 e incluye validación de formulario, estados resultantes, atomicidad, errores, accesibilidad y frontera contractual.

## 1. Objetivo y límites

El diseño cubre el flujo del panel interno para que `jefe_operativo` cree un `viaje` para un `cliente`, capture origen, uno o más destinos y fecha/hora, y opcionalmente seleccione una o más `unidades` como escolta. La interfaz representa `APROBADO` cuando el BFF confirma una creación sin asignación y `ASIGNADO` cuando confirma una escolta; no decide esos estados localmente.

El frontend captura, orquesta la secuencia `crearViaje → asignarRecursos` y representa el resultado. El BFF conserva autorización, alcance, validación de disponibilidad, atomicidad de la reserva, reserva y auditoría. No se inventan endpoints, payloads, campos ni componentes compartidos.

## 2. Decisiones de diseño

1. **Dos operaciones encadenadas, no una mutación combinada:** sin unidades el flujo ejecuta solo `crearViaje` (`APROBADO`). Con unidades ejecuta `crearViaje` y luego `asignarRecursos` sobre el `id` devuelto (`ASIGNADO`). La atomicidad de la reserva la garantiza el BFF dentro de `asignarRecursos`; la UI no reparte, reintenta automáticamente ni compensa. No existe una operación de creación que acepte unidades en su cuerpo.
2. **Frontera de adaptador:** los componentes visuales trabajan con estado de formulario; un adaptador aislado transforma ese estado a los tipos contractuales verificados, orquesta la secuencia `crearViaje → asignarRecursos` y clasifica cada respuesta.
3. **Respuesta como autoridad:** la UI solo muestra éxito, identificador, estado y escolta cuando la respuesta contractual los confirma. `APROBADO` lo confirma `crearViaje`; `ASIGNADO` y la escolta los confirma `asignarRecursos`.
4. **Datos del BFF:** clientes y unidades provienen de las operaciones publicadas y verificadas. La UI no replica el alcance del `jefe_operativo`.
5. **Librería compartida primero:** se usan los componentes disponibles en `@ai27-tech/ui`; una ausencia se registra como brecha antes de crear una alternativa local.
6. **Aptitud no bloqueante:** la aptitud se puede representar si está disponible, pero no impide la creación o asignación por sí sola.

## 3. Arquitectura propuesta

```text
Ruta privada / navegación
        ↓
Pantalla de crear viaje
        ↓
Formulario de datos + selección opcional de escolta
        ↓
Estado de interacción y validación local
        ↓
Adaptador contractual (orquesta crearViaje → asignarRecursos y consultas)
        ↓
Cliente HTTP autenticado existente
        ↓
BFF
```

El roster de unidades (`listarUnidades`) y el catálogo de clientes cruzan la misma frontera contractual. Las operaciones verificadas del flujo son `crearViaje`, `asignarRecursos` y `listarUnidades`; el nombre de la consulta de clientes se confirma conforme a **Notas de brechas** de `requirements.md`.

## 4. Componentes funcionales

- **Pantalla de creación:** integra el flujo en la navegación vigente del panel y aplica la guardia de rol como experiencia de usuario.
- **Formulario:** captura cliente, origen, destinos y fecha/hora; no conoce rutas ni payloads técnicos.
- **Selector de cliente:** muestra opciones devueltas por el BFF y estados de carga, vacío y error; no permite texto libre.
- **Sección de destinos:** permite conservar una lista ordenada de uno o más destinos.
- **Sección de escolta opcional:** permite seleccionar una o más unidades completas; no separa custodios ni patrulla.
- **Confirmación y resultado:** deshabilita confirmaciones duplicadas y muestra el identificador, estado y escolta confirmada cuando existan en la respuesta.
- **Adaptador contractual:** único lugar que importa tipos generados, invoca `crearViaje`, `asignarRecursos` y las consultas verificadas, orquesta la secuencia de las dos operaciones y traduce errores a estados de UI.

Los nombres anteriores son roles funcionales del diseño, no una instrucción para duplicar componentes ya existentes.

## 5. Modelo conceptual de datos

```text
EstadoFormulario {
  cliente: selección | vacío
  origen: valor confirmado
  destinos: lista ordenada de valores confirmados
  fechaHora: valor local
  unidadesSeleccionadas: lista de unidades o identificadores conforme al contrato verificado
}

ResultadoCrearViaje {
  viajeId: identificador devuelto por crearViaje
  estado: APROBADO (de crearViaje) | ASIGNADO (de asignarRecursos)
  escolta: escolta confirmada por asignarRecursos | ausente si no hubo asignación
  falloAsignacion: presente si crearViaje tuvo éxito pero asignarRecursos falló
}
```

Son modelos conceptuales, no tipos wire. El adaptador debe utilizar los tipos generados (`CrearViajeEntrada`, `ViajeResumen`, `AsignacionEntrada`, `Asignacion`, `Unidad`) y no declarar interfaces locales que dupliquen el contrato.

## 6. Flujo de interacción

1. La ruta vigente valida la sesión y la experiencia identifica el rol `jefe_operativo`.
2. El formulario carga el catálogo de clientes mediante la operación contractual verificada y distingue carga, vacío, éxito y error.
3. Al activar la selección de escolta, el formulario carga el roster de unidades mediante la operación contractual verificada y distingue carga, vacío, éxito y error.
4. El usuario captura cliente, origen, destinos y fecha/hora. La validación local solo aplica reglas confirmadas.
5. El usuario puede confirmar sin unidades o con una o más unidades.
6. Antes de iniciar la solicitud, la UI valida los datos y bloquea confirmaciones adicionales.
7. El adaptador ejecuta `crearViaje`. Si no hay unidades seleccionadas, el flujo termina aquí con `APROBADO`.
8. Si hay unidades, el adaptador encadena `asignarRecursos` con el `id` devuelto y las unidades seleccionadas; su respuesta confirma `ASIGNADO` y la escolta.
9. La UI representa el resultado devuelto por el BFF: `APROBADO` sin asignación, o `ASIGNADO` con escolta confirmada.
10. Ante rechazo de `crearViaje`, la UI conserva el formulario, muestra un error accionable y no presenta viaje creado. Ante rechazo de `asignarRecursos`, el viaje queda creado en `APROBADO`: la UI muestra el fallo de la asignación, conserva los datos y permite reintentar la asignación o continuar sin ella, sin reserva parcial ni compensación automática.
11. Tras éxito, la UI ofrece la continuación compatible con la navegación existente, sin exigir aprobación posterior.

## 7. Validación funcional

La UI valida cliente, origen, al menos un destino y fecha/hora. Conserva orden y cardinalidad de destinos. La selección de unidades es opcional y la aptitud no es un bloqueo. Las reglas adicionales de `E1-HU-001` solo se aplican si están confirmadas.

La UI no valida ni resuelve localmente autorización, alcance, disponibilidad, atomicidad, reserva o auditoría. Esas responsabilidades pertenecen al BFF y al dominio.

## 8. Manejo de errores

| Situación                                                                 | Resultado esperado                                                                                                                                               |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo o roster en carga                                                | Estado de carga distinto de vacío; no confirmar con datos incompletos                                                                                            |
| Catálogo vacío o consulta fallida                                         | Estado explícito; no enviar una creación sin cliente válido                                                                                                      |
| Sesión expirada                                                           | Delegar al flujo vigente de sesión                                                                                                                               |
| Rechazo de autorización o alcance                                         | Mostrar fallo y no mostrar éxito                                                                                                                                 |
| `crearViaje` rechazado                                                    | Mostrar fallo; no presentar viaje creado; conservar formulario                                                                                                   |
| `asignarRecursos` rechazado (unidad no disponible, reserva no confirmada) | Viaje queda `APROBADO`; mostrar fallo de asignación, conservar datos, permitir reintento o continuar sin escolta; sin reserva parcial ni compensación automática |
| Respuesta insuficiente                                                    | Reportar brecha contractual; no emitir una tercera operación                                                                                                     |
| Error de red o desconocido                                                | Mostrar error accionable y permitir reintento cuando sea posible                                                                                                 |
| Creación sin asignación confirmada                                        | Mostrar identificador y `APROBADO` (de `crearViaje`)                                                                                                             |
| Creación con asignación confirmada                                        | Mostrar identificador, `ASIGNADO` y escolta confirmada (de `asignarRecursos`)                                                                                    |

## 9. Accesibilidad

Los controles tendrán etiquetas visibles y asociación programática. Los errores se asociarán al campo correspondiente y los estados de carga, éxito y error usarán los patrones accesibles disponibles en `@ai27-tech/ui`. La selección múltiple será operable por teclado y comunicará el número de unidades elegidas. No se dependerá únicamente del color o iconografía para comunicar estado.

Si falta una affordance en la librería compartida, se registra la brecha y se evita duplicarla localmente hasta contar con definición.

## 10. Estrategia de pruebas

- Validar campos obligatorios, destinos múltiples, selección opcional y aptitud no bloqueante.
- Verificar que una creación sin unidades representa `APROBADO` solo con confirmación del BFF.
- Verificar que una creación con una o más unidades representa `ASIGNADO` y la escolta solo con confirmación atómica.
- Verificar rechazo de disponibilidad, autorización, alcance, sesión y respuesta insuficiente.
- Verificar preservación de datos ante error y bloqueo de doble envío.
- Verificar que el flujo no emite una segunda operación de asignación, compensación o publicación.
- Verificar accesibilidad con los componentes compartidos disponibles.
- Verificar adaptadores contra los tipos contractuales instalados antes de escribir código dependiente de su forma.

## 11. Propiedades de corrección

1. **Campos obligatorios:** para cualquier estado sin cliente, origen, destino o fecha/hora, la UI bloquea el envío y señala el dato faltante.
2. **Destinos:** para cualquier lista válida de destinos, el adaptador conserva orden, cantidad y valores.
3. **Aptitud:** para cualquier aptitud conocida, desconocida o no apta, la UI no bloquea únicamente por aptitud.
4. **Un solo envío:** mientras la secuencia está pendiente, todos los intentos adicionales de confirmar producen una sola corrida de la secuencia (un `crearViaje` y, a lo sumo, un `asignarRecursos`).
5. **Resultado fiel:** la UI muestra el identificador y estado devueltos, sin inferir `APROBADO` o `ASIGNADO` por la selección local.
6. **Sin parcialidad:** ante rechazo o respuesta insuficiente, la UI no muestra reserva parcial como éxito; si `asignarRecursos` falla tras un `crearViaje` exitoso, representa el viaje en `APROBADO` según el BFF.
7. **Frontera contractual:** el flujo utiliza únicamente `crearViaje` y, cuando hay unidades, `asignarRecursos`; nunca una tercera operación de compensación, reparación o publicación.

## 12. Verificación previa y brechas

El contrato instalado (`@ai27-tech/contracts`) ya se verificó: `crearViaje` (`CrearViajeEntrada` → `ViajeResumen`, sin unidades en el cuerpo), `asignarRecursos` (`AsignacionEntrada { unidades_ids[] }` → `Asignacion`, reserva atómica `APROBADO → ASIGNADO`) y `listarUnidades` existen. La consulta de clientes y los textos/códigos de error se confirman conforme a la sección **Notas de brechas** de `requirements.md`. En `@ai27-tech/ui` se confirmó la ausencia de un multi-select y de un selector de fecha/hora dedicados: se componen con primitivas de la librería, no se duplican localmente.

El destino exacto posterior al éxito y los textos/códigos concretos se toman del flujo existente y del contrato verificado. No se fijan aquí sin evidencia.
