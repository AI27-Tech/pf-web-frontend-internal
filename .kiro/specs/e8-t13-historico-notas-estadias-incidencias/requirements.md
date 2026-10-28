# Requirements Document

## Introduction

El **histórico del viaje: notas, estadías e incidencias** (E8-T13) es la parte del panel interno que, para un viaje concreto, permite al Monitorista (o al Supervisor/Coordinador en su alcance; DEC-060) **registrar notas y observaciones**, **abrir y cerrar estadías** y **marcar incidencias**, y ver todo ello como un **expediente append-only** con actor y marca de tiempo en cada entrada. Satisface `E1-HU-007` (incidencias), `E1-HU-008` (estadías) y `E1-HU-009` (notas y observaciones). La pantalla vive bajo el detalle del viaje del panel interno (E8-T8), reutilizando sus convenciones de capas, sesión y navegación.

Principios rectores de la historia técnica E8-T13:

- El histórico es **append-only**: una entrada registrada **no se edita ni se borra**; se corrige agregando una nueva. La interfaz **no ofrece** el gesto de editar o eliminar una entrada.
- La **estadía** y la **incidencia** son **condiciones ortogonales**: no cambian el estado de progreso del viaje. Un viaje puede estar en recorrido y con una incidencia abierta a la vez.
- **Marcar** una incidencia lo puede hacer cualquier operativo autorizado (Monitorista, Supervisor, Coordinador en su alcance); **corregirla o cerrarla exige Supervisor o Coordinador** (Q221, DEC-045 #4). La autorización la aplica el `bff`; la interfaz **no ofrece lo que el rol no puede hacer**.
- La estadía muestra **inicio, cierre y duración derivada**. En V1 **no existe** clasificación `prolongada` ni umbral de tiempo (DEC-038): la interfaz **no debe inventar** un indicador de "estadía larga".
- Al **marcar** la incidencia, el cliente la ve como **categoría curada** (E2-HU-013, DEC-006); no hay paso separado de publicación. El curado lo hace el `bff`, no esta pantalla.
- Una **segunda incidencia abierta del mismo tipo** se rechaza por el índice único parcial del dominio; la interfaz comunica el rechazo sin romper la vista.

> **Nota de contrato (RESUELTA en la rama; pendiente de publicar `tracer.21`):** las siete operaciones del histórico —`listarBitacora`, `registrarEntradaBitacora`, `abrirIncidencia`, `resolverIncidencia`, `listarEstadias`, `abrirEstadia`, `cerrarEstadia`— **ya están en el `bff`** de la rama `feat/ficha-tecnica-e-historico-tracer21` (PR #76), reenviando a `operacion`, con sus `409` (`condicion_ya_abierta`, `estadia_ya_cerrada`), el `403` y el estado de incidencia `enum [en_atencion, resuelta]`; DEC-105 registra la decisión. En el tag publicado que hoy fija el frontend (`@ai27-tech/contracts@0.1.0-tracer.20`) el `bff` solo tiene lecturas curadas de este dominio (`IncidenciaCurada`, `EntradaBitacoraDescarga`) y `condiciones_activas` del detalle interno. Hasta que se publique `tracer.21` y suba el pin, la pantalla se construye contra el **contrato esperado**, con la brecha aislada en una sola capa de tipos y servida con mocks (MSW); al publicar, se reemplazan los tipos por los generados. Detalle en **Notas de brechas** y en `BRECHAS.md`.

Este documento define el comportamiento funcional del frontend interno. El frontend no inventa endpoints, payloads, campos, catálogos ni componentes compartidos; resuelve dominio (autorización, alcance, atomicidad, auditoría, índice único) el `bff`/backend, y la interfaz consume resultados y clasifica respuestas.

## Glossary

- **Historico_UI**: el sistema de interfaz que registra y muestra el histórico de un viaje (componente de ruta y sus elementos). Es el "sistema" al que refieren los criterios.
- **Historico**: diario cronológico append-only del viaje (DEC-011); reúne transiciones (E8-T8), notas, observaciones, estadías e incidencias, cada entrada con actor y marca de tiempo.
- **Entrada de bitácora**: nota de monitoreo u observación de cámara/tripulación registrada en el histórico (`E1-HU-009`).
- **Incidencia**: condición ortogonal del viaje con un tipo interno (catálogo operativo); se **marca**, y se **corrige/cierra** solo por Supervisor/Coordinador (`E1-HU-007`).
- **Estadía**: parada durante el recorrido, con motivo y eje de autorización; registra **inicio** y **cierre**, y su **duración se deriva** de ambos (`E1-HU-008`, DEC-038).
- **Condición ortogonal**: dato separado del estado de progreso; no lo cambia. Incidencia y estadía son condiciones, no estados.
- **Append-only**: propiedad del histórico; las entradas no se editan ni se borran, solo se agregan.
- **Monitorista / Supervisor / Coordinador**: roles internos de DEC-045/DEC-060. El Monitorista marca; Supervisor/Coordinador corrigen y cierran.
- **Categoría curada**: vista del cliente de una incidencia (categoría + estado), compuesta por el `bff` (DEC-006); nunca el tipo interno.
- **BFF**: backend-for-frontend de AI27. Única puerta del frontend; valida alcance/rol y reenvía a `operacion`.

## Requirements

### Requirement 1: Lectura del histórico append-only

**User Story:** Como Monitorista, quiero ver el histórico cronológico del viaje con notas, estadías e incidencias, para tener el expediente a la vista mientras opero.

#### Acceptance Criteria

1. WHEN la Historico_UI se monta con un identificador de viaje, THE Historico_UI SHALL solicitar al `bff` las entradas del histórico (bitácora), las estadías y las incidencias del viaje usando el cliente de `@ai27-tech/contracts`.
2. WHEN el `bff` responde, THE Historico_UI SHALL mostrar cada entrada con su **actor** y su **marca de tiempo**, tal como los entrega el `bff`, sin derivarlos ni normalizarlos.
3. THE Historico_UI SHALL presentar las entradas en orden cronológico según los datos del `bff`.
4. THE Historico_UI SHALL NOT ofrecer ningún gesto de **editar** ni **borrar** una entrada del histórico.
5. WHERE el histórico no tiene entradas, THE Historico_UI SHALL mostrar un estado vacío diferenciado de un estado de carga y de un estado de error.

### Requirement 2: Registrar notas y observaciones

**User Story:** Como Monitorista, quiero registrar notas de monitoreo y observaciones en el histórico, para dejar constancia cronológica de lo que ocurre.

#### Acceptance Criteria

1. THE Historico_UI SHALL permitir capturar una entrada de bitácora con su contenido de texto y enviarla al `bff` mediante la operación contractual verificada de registro de bitácora.
2. THE Historico_UI SHALL exigir el contenido de la entrada antes de permitir el envío, y IF el contenido está vacío THEN THE Historico_UI SHALL impedir el envío y señalar el dato faltante.
3. WHEN el `bff` confirma el registro, THE Historico_UI SHALL mostrar la nueva entrada en el histórico con el actor y la marca de tiempo devueltos, sin editar entradas previas.
4. THE Historico_UI SHALL capturar la entrada de bitácora como solo texto en V1 (sin campo de tipo de entrada), porque no existe un catálogo nota/observación validado (decisión de V1, ver Nota de brechas). IF Producto define más adelante ese catálogo, THEN la selección tipada se agrega como ola posterior.
5. IF el `bff` rechaza el registro, THEN THE Historico_UI SHALL mostrar el error y SHALL NOT presentar la entrada como registrada.

### Requirement 3: Registrar y cerrar estadías

**User Story:** Como Monitorista, quiero abrir una estadía con su motivo y autorización y cerrarla al reiniciar el viaje, para dejar constancia de las detenciones y su duración.

#### Acceptance Criteria

1. THE Historico_UI SHALL permitir abrir una estadía capturando **motivo** (catálogo cerrado de V1) y **eje de autorización** (catálogo cerrado de V1), y enviarla al `bff` mediante la operación contractual verificada de apertura de estadía.
2. THE Historico_UI SHALL tomar los valores de **motivo** y **eje de autorización** de los enumerados del contrato y SHALL NOT ofrecerlos como texto libre.
3. THE Historico_UI SHALL NOT capturar el **inicio** de la estadía: el `bff` lo fija al registrar; la interfaz solo lo muestra tal como lo devuelve.
4. WHEN una estadía está abierta, THE Historico_UI SHALL permitir **cerrarla** mediante la operación contractual verificada de cierre, sin exigir que el usuario teclee la marca de cierre.
5. THE Historico_UI SHALL mostrar, para cada estadía, su **inicio**, su **cierre** (cuando exista) y la **duración derivada** de ambos, y SHALL NOT mostrar un rótulo `prolongada` ni un indicador de "estadía larga" (DEC-038).
6. WHILE una estadía está abierta, THE Historico_UI SHALL mostrar su duración creciente a partir del inicio y del tiempo actual, sin clasificarla.
7. THE Historico_UI SHALL representar que una estadía **no cambia** el estado de progreso del viaje.
8. IF el `bff` rechaza la apertura o el cierre, THEN THE Historico_UI SHALL mostrar el error y SHALL NOT presentar la estadía como abierta o cerrada.

### Requirement 4: Marcar una incidencia

**User Story:** Como Monitorista, quiero marcar una incidencia con su tipo, para dejar constancia y activar su atención.

#### Acceptance Criteria

1. THE Historico_UI SHALL permitir marcar una incidencia capturando su **tipo interno** (catálogo operativo) y una descripción opcional, y enviarla al `bff` mediante la operación contractual verificada de apertura de incidencia.
2. THE Historico_UI SHALL capturar el **tipo interno** como texto en V1 (`tipo_interno: string`), porque el contrato no publica aún el enum curado (decisión de V1, DEC-105; ver Nota de brechas), y SHALL NOT inventar un selector cerrado con la lista de DEC-003. IF el contrato publica el enum en una ola posterior, THEN la selección tipada reemplaza al texto.
3. WHEN el `bff` confirma la apertura, THE Historico_UI SHALL mostrar la incidencia en el histórico con su estado (`en_atencion`), actor y marca de tiempo, y SHALL representar que **no cambia** el estado de progreso.
4. IF el `bff` responde que ya existe una incidencia abierta del mismo tipo (código `condicion_ya_abierta`), THEN THE Historico_UI SHALL informar el rechazo con un mensaje claro, sin romper la vista y sin presentar una segunda incidencia abierta.
5. THE Historico_UI SHALL representar que, al marcarse, la incidencia se hace visible al cliente como categoría curada por el `bff` (E2-HU-013), SHALL NOT ofrecer un paso separado de publicación y SHALL NOT mostrar la categoría del cliente como si fuera el tipo interno.
6. IF el `bff` rechaza la apertura por otra causa, THEN THE Historico_UI SHALL mostrar el error y SHALL NOT presentar la incidencia como marcada.

### Requirement 5: Corregir o cerrar una incidencia según el rol

**User Story:** Como Supervisor o Coordinador, quiero resolver una incidencia abierta, para cerrar la condición dejando constancia; y como Monitorista, no quiero ofrecido un gesto que mi rol no puede ejecutar.

#### Acceptance Criteria

1. WHERE el usuario tiene rol de Supervisor o Coordinador en su alcance, THE Historico_UI SHALL ofrecer la acción de **resolver/cerrar** una incidencia abierta y enviarla al `bff` mediante la operación contractual verificada de resolución.
2. WHERE el usuario es Monitorista sin facultad de corrección, THE Historico_UI SHALL NOT ofrecer el gesto de corregir ni cerrar una incidencia.
3. WHEN el `bff` confirma la resolución, THE Historico_UI SHALL reflejar la incidencia como `resuelta` con su marca de tiempo, sin editar la entrada de apertura (se agrega el cierre, no se reescribe el histórico).
4. IF el `bff` responde que el rol no está autorizado (`403`), THEN THE Historico_UI SHALL informar que la acción requiere Supervisor o Coordinador, sin romper la vista; la autorización efectiva la aplica el `bff`, no la interfaz.
5. THE Historico_UI SHALL derivar la visibilidad del gesto de corrección del rol efectivo de la sesión del panel interno, y SHALL tratar la decisión del `bff` como autoridad final aunque la interfaz haya ocultado o mostrado el gesto.

### Requirement 6: Estados de carga, error y sesión

**User Story:** Como operador interno, quiero señales claras de carga, vacío y error con reintento, para saber qué ocurre al consultar o registrar en el histórico.

#### Acceptance Criteria

1. WHILE la lectura del histórico, de las estadías o de las incidencias está en curso, THE Historico_UI SHALL mostrar un indicador de carga diferenciado del estado vacío.
2. WHILE un registro (nota, estadía, incidencia o resolución) está en curso, THE Historico_UI SHALL deshabilitar la confirmación correspondiente y SHALL impedir envíos duplicados.
3. IF una lectura o un registro falla y no es un problema de sesión, THEN THE Historico_UI SHALL mostrar un error accionable con reintento y SHALL conservar los datos capturados cuando el flujo lo permita.
4. IF el `bff` responde `401` o la sesión expira durante el flujo, THEN THE Historico_UI SHALL delegar el manejo al flujo de sesión vigente del panel interno en lugar de mostrar un error genérico.
5. WHEN un registro termina exitosamente, THE Historico_UI SHALL mostrar un aviso de éxito y reflejar la entrada o el cambio en el histórico.

## Escenarios

### Escenarios positivos

**Escenario 1. Registrar una nota de monitoreo**  
Dado que un viaje está en curso, cuando el Monitorista captura una nota ("tránsito lento") y confirma, entonces el `bff` registra la entrada y la interfaz la muestra en el histórico con actor y marca de tiempo, sin alterar entradas previas.

**Escenario 2. Abrir una estadía autorizada**  
Dado que la unidad se detiene por combustible, cuando el Monitorista abre una estadía con motivo "combustible" y eje "autorizada", entonces la interfaz la muestra como condición abierta con su inicio, sin que el estado de progreso cambie, y mostrando la duración creciente mientras siga abierta.

**Escenario 3. Cerrar una estadía**  
Dado que hay una estadía abierta, cuando el Monitorista la cierra, entonces la interfaz muestra inicio, cierre y la duración derivada, sin rótulo `prolongada`.

**Escenario 4. Marcar una incidencia**  
Dado que un viaje está en curso, cuando el Monitorista marca una incidencia con su tipo interno, entonces la interfaz la muestra en atención con actor y marca de tiempo, sin cambiar el estado de progreso, y reconoce que el cliente la verá como categoría curada compuesta por el `bff`.

**Escenario 5. Resolver una incidencia por Supervisor**  
Dado que existe una incidencia abierta y el usuario es Supervisor en su alcance, cuando la resuelve, entonces la interfaz la refleja como resuelta con su marca de tiempo, agregando el cierre sin reescribir la apertura.

### Escenarios negativos y de borde

**Escenario 6. Sin gesto de editar ni borrar**  
Dado que existe una entrada en el histórico, cuando el operador la observa, entonces la interfaz no ofrece ningún control para editarla ni eliminarla; una corrección se hace agregando una nueva entrada.

**Escenario 7. Segunda incidencia del mismo tipo rechazada**  
Dado que ya existe una incidencia abierta del mismo tipo, cuando el operador intenta abrir otra, entonces el `bff` la rechaza con `condicion_ya_abierta` y la interfaz comunica el rechazo con un mensaje claro, sin presentar una segunda incidencia abierta ni romper la vista.

**Escenario 8. Monitorista sin permiso de corrección**  
Dado que el usuario es Monitorista sin facultad de corrección, cuando observa una incidencia abierta, entonces la interfaz no le ofrece el gesto de corregir ni cerrar; si de algún modo lo intentara, el `bff` responde `403` y la interfaz informa que requiere Supervisor o Coordinador.

**Escenario 9. Estadía abierta con duración creciente**  
Dado que una estadía sigue abierta mientras la pantalla está abierta, cuando pasa el tiempo, entonces la interfaz muestra la duración creciente a partir del inicio, sin inventar un indicador de "estadía larga" ni un umbral.

**Escenario 10. Fallo de registro**  
Dado que un registro de nota, estadía o incidencia falla por un problema que no es de sesión, cuando ocurre el error, entonces la interfaz muestra un error accionable con reintento, conserva lo capturado cuando el flujo lo permite y no presenta la entrada como registrada.

**Escenario 11. Sesión expirada durante el registro**  
Dado que la sesión expira durante un registro, cuando el `bff` responde `401`, entonces la interfaz delega el manejo al flujo de sesión del panel interno en lugar de mostrar un error genérico.

## Dependencias

- `E1-HU-007`, `E1-HU-008`, `E1-HU-009`: comportamiento funcional confirmado de incidencias, estadías y notas del histórico.
- E8-T8 (detalle del viaje): la pantalla del histórico vive bajo el detalle y reutiliza sus capas, sesión y navegación. La historia técnica E8-T13 declara dependencia de E8-T8, `E1-T6` y `E0-T8`.
- DEC-003 (motivos/ejes de estadía y catálogo de incidencias validado por Operación), DEC-006 (curado de la incidencia hacia el cliente), DEC-011 (histórico como diario append-only), DEC-038 (sin clasificación `prolongada` ni umbral en V1), DEC-045/DEC-060 (roles y reparto Monitorista vs Supervisor/Coordinador).
- Contrato generado y componentes de `@ai27-tech`: se verifican antes de implementar, conforme a la Nota de brechas y a `BRECHAS.md`.

## Fuera de alcance

- Crear o modificar endpoints, contratos, servicios backend o esquemas del `bff`.
- Editar o borrar entradas del histórico (append-only): no se construye ningún gesto de edición o eliminación.
- Clasificar la estadía como `prolongada` o inventar un umbral de "estadía larga" (DEC-038, diferido a V2 con `parametro_operativo`).
- Componer la categoría curada de la incidencia hacia el cliente: lo hace el `bff` (DEC-006).
- Un paso separado de "publicación" de la incidencia hacia el cliente.
- Resolver en el frontend autorización, alcance, atomicidad, auditoría o el índice único parcial de incidencias: lo aplica el `bff`/backend.
- Hitos de patio (`Arribando`, `Ingreso a Patio`) como estados: en V1 son notas del histórico, no estados (DEC-020 #3). Esta pantalla no los modela como transición de estado.
- Conversación bidireccional dentro de una incidencia o emergencia: fuera de esta historia.

## Notas de brechas

Estas notas son prerrequisitos de verificación y no preguntas que redefinan el comportamiento funcional de E8-T13. Si una verificación no está disponible, se documenta la brecha en `BRECHAS.md` y no se inventa una alternativa.

- **Operaciones del histórico en el `bff` (RESUELTAS en la rama; pendiente de publicar `tracer.21`):** `registrarEntradaBitacora`, `listarBitacora`, `abrirIncidencia`, `resolverIncidencia`, `abrirEstadia`, `cerrarEstadia` y `listarEstadias` **ya están en el `bff`** de la rama `feat/ficha-tecnica-e-historico-tracer21` (PR #76, DEC-105), reenviando a `operacion`. El tag que hoy fija el frontend (`@ai27-tech/contracts@0.1.0-tracer.20`) aún no las trae. Hasta que se publique `tracer.21` y suba el pin, la pantalla se construye contra el **contrato esperado**, con la brecha aislada en una sola capa de tipos y servida con mocks; reemplazo mecánico al publicar. No se escriben clientes a mano como autoridad paralela.
- **Forma verificada (en el `bff.yaml` de la rama):** bitácora `EntradaBitacoraEntrada { texto }` → `EntradaBitacora { id, viaje_id, texto, autor, ts }`, listado `PaginaBitacora` por cursor; incidencia `IncidenciaEntrada { tipo_interno, descripcion? }` → `Incidencia { id, viaje_id, tipo_interno, estado(en_atencion|resuelta), abierta_en, resuelta_en? }`, resolución `ResolucionIncidenciaEntrada { resolucion }`, rechazo `409 condicion_ya_abierta`; estadía `EstadiaEntrada { motivo, eje_autorizacion }` → `Estadia { id, viaje_id, motivo, eje_autorizacion, inicio, cierre? }`, cierre `CierreEstadiaEntrada {}` (cuerpo vacío válido, el servidor fija `cierre`), rechazo `409 estadia_ya_cerrada`, listado `PaginaEstadias`.
- **Catálogos (DECIDIDOS):** bitácora es solo `{ texto }` en V1, **sin** tipo de entrada (no hay catálogo nota/observación; propuesta §5). `tipo_interno` de incidencia es `string` en V1; la lista existe (DEC-003 §2) pero el enum curado es una **ola aditiva posterior** (DEC-105). La interfaz **no inventa** esos valores ni ofrece un selector cerrado. Los motivos de estadía (`combustible`, `descanso`, `alimentos`, `sanitario`, `reten`, `revision_autoridades`, `gastos`, `espera_entrega`) y los ejes (`autorizada`, `no_autorizada`, `antes_200km`) **sí** son enums cerrados verificados.
- **Rol efectivo para el gesto de corrección:** la visibilidad de resolver/cerrar incidencia depende del rol de la sesión del panel interno (Supervisor/Coordinador vs Monitorista). Verificar cómo expone el panel el rol efectivo; la decisión final de autorización es del `bff` (`403`).
- **Librerías compartidas:** `@ai27-tech/ui` (0.2.0-beta.6). Verificar qué primitivas cubren la lista cronológica del histórico, los formularios de nota/estadía/incidencia y los avisos de rechazo. Toda afordancia faltante se compone con primitivas de la librería y se registra como solicitud a la librería, nunca como componente local nuevo (ver `BRECHAS.md`).
- **Mensajes:** verificar los textos y códigos aprobados para `condicion_ya_abierta`, `estadia_ya_cerrada`, autorización insuficiente y contrato incompleto.

## Trazabilidad

- Histórico append-only y sin edición/borrado: Requirement 1 y escenarios 1 y 6; DoD de E8-T13 ("no existe gesto de editar ni borrar").
- Notas y observaciones (`E1-HU-009`): Requirement 2 y escenario 1.
- Estadías con inicio/cierre/duración derivada y sin `prolongada` (`E1-HU-008`, DEC-038): Requirement 3 y escenarios 2, 3 y 9.
- Marcar incidencia y curado hacia el cliente (`E1-HU-007`, DEC-006): Requirement 4 y escenario 4.
- Segunda incidencia del mismo tipo rechazada (DoD de E8-T13): Requirement 4.4 y escenario 7.
- Corrección/cierre por rol (Q221, DEC-045 #4): Requirement 5 y escenarios 5 y 8.
- Carga, error, doble envío y sesión: Requirement 6 y escenarios 10 y 11.
