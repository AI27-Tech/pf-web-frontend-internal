# Implementation Plan: Administración de usuarios, roles y organizaciones (E8-T19)

## Overview

Las tareas implementan el comportamiento funcional de E8-T19 en `/administracion`: guarda exclusiva del `administrador`, consulta, alta, cambio de rol, alcance, desactivación y reactivación de usuarios, organizaciones cliente y revocación masiva de sesiones. **El `bff` no expone sujetos, roles, organizaciones, alcance ni revocación administrativa** (`BRECHAS.md`, B-1 a B-5); por eso el plan se divide en dos bloques:

- **Bloque A (tareas 1 a 7): construible hoy, sin contrato nuevo.** Guarda de rol y navegación (B-12), funciones puras, puerto `AdministracionPort` con implementación "no publicada", pantalla base con estados, bloqueo de auto-escalada en la interfaz y las pruebas de la definición de terminado (DoD) que no dependen del servidor.
- **Bloque B (tareas 8 a 17): condicionado a contrato.** Cada tarea indica "**Bloqueada por B-n**" y se implementa **contra el puerto falso** inyectado por `AdministracionProvider`. Los nombres del puerto son de trabajo del frontend: **no** son `operationId` del `bff`. No se inventan rutas, campos ni handlers MSW (`src/mocks/handlers.ts` no se toca).

La tarea 19 (reverificación al publicarse el contrato) está **bloqueada y fuera de este ciclo**. Las exclusiones de V1 (auditoría, rol Auditor, break-glass, transferencia, edición de tenant, organización padre, reactivación de organizaciones, edición del identificador de usuario, revocación por `sesion_id`, asignación de clientes a un Ejecutivo) no se construyen.

## Estado de avance

**Bloque A ejecutado** (tareas 1 a 7), salvo la 4.6 y las pruebas opcionales (`*`) no escritas: la 4.6 necesita tocar `src/mocks/handlers.ts`, que este plan excluye. Verificado: `tsc --build`, `eslint .`, `vite build --mode mock` y `vitest run` (479 pruebas). El Bloque B sigue sin iniciar, bloqueado por contrato. Spec de requisitos, diseño y brechas aprobados; actualizados con DEC-139 y la respuesta de Lead (2026-11-05). Actualizado con DEC-140 y DEC-141 (2026-11-06): PA-3, PA-4, PA-6, B-4, B-6, B-13 y B-17 quedaron decididas; B-16 se resuelve con `tracer.38`. Las brechas de contrato B-1, B-2, B-3, B-4, B-5 y B-15 esperan la ola `tracer.40`. El pin efectivo de `@ai27-tech/contracts` en `package.json` es `0.1.0-tracer.37` (verificado); no se sube sin aprobación explícita.

## Task Dependency Graph

`Bloque A: 1, 2, 3, 4 → 5 → 6 → 7 (checkpoint) · Bloque B: 8–15 → 16 → 17 → 18 (checkpoint) · 19 bloqueada`

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.6"] },
    {
      "id": 1,
      "tasks": ["1.2", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "4.2", "4.4", "4.5"]
    },
    {
      "id": 2,
      "tasks": [
        "1.3",
        "2.8",
        "2.9",
        "2.10",
        "2.11",
        "2.12",
        "2.13",
        "2.14",
        "2.15",
        "2.16",
        "3.3",
        "3.4",
        "4.3"
      ]
    },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.7", "4.8", "5.2", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["8.1", "9.1", "10.1"] },
    { "id": 6, "tasks": ["8.2", "9.2", "10.2", "11.1", "12.1", "13.1", "14.1", "14.2", "15.1"] },
    { "id": 7, "tasks": ["16.1"] },
    { "id": 8, "tasks": ["13.2", "17.1", "17.2", "17.3", "17.4", "17.5", "17.6", "17.7"] },
    { "id": 9, "tasks": ["19.1"] },
    { "id": 10, "tasks": ["19.2"] },
    { "id": 11, "tasks": ["19.3"] },
    { "id": 12, "tasks": ["19.4"] }
  ]
}
```

Las ondas 0 a 4 son el Bloque A y se pueden ejecutar hoy. Las ondas 5 a 8 son el Bloque B contra el puerto falso. Las ondas 9 a 12 (tarea 19) están bloqueadas por la publicación del contrato y **no se ejecutan en este ciclo**. Las tareas que tocan el mismo archivo están en ondas distintas; cada prueba de propiedades vive en su propio archivo bajo `tests/administracion/`.

## Tasks

### Bloque A: construible hoy (sin contrato nuevo)

- [x] 1. Guarda de rol y navegación
  - [x] 1.1 Crear `src/features/administracion/puedeAdministrar.ts` con `ROLES_ADMINISTRACION = [Rol.Administrador]` y `puedeAdministrar(rol)` (mismo patrón que `puedeUsarMonitoreo`). En `src/components/layout/navigationConfig.ts` cambiar la entrada `administracion` a `visiblePara: ROLES_ADMINISTRACION` (conservar `ocultarPara: []`). No tocar la guarda `_private.tsx`.
    - _Requirements: 1.1, 1.2, 1.3 (B-12)_
  - [x] 1.2 Actualizar `tests/layout/navigation-visibility.test.ts`: hoy espera "Administración" para Reacción y otros roles; debe afirmar que solo `administrador` la ve y que los otros siete roles no.
    - _Requirements: 1.1, 1.3; escenario 9_
  - [ ]* 1.3 Escribir prueba de propiedades para la visibilidad por rol
    - **Property 1: Visibilidad por rol**
    - **Validates: Requirements 1.1, 1.3**

- [x] 2. Tipos y funciones puras
  - [x] 2.1 Crear `src/lib/contracts/administracion.ts` (re-exporta `Rol` de `@ai27-tech/contracts/roles` y el tipo `Unidad`; ningún tipo de wire a mano) y la lista de opciones de rol derivada de los valores del enum `Rol` (ocho valores, sin Auditor, sin lista local).
    - _Requirements: 1.6, 3.1, 5.1, 12.3, 13.8_
  - [x] 2.2 Implementar `relacionConSesion.ts`: `propio | ajeno | indeterminado` comparando **identificadores** (nunca nombres); `indeterminado` si falta el identificador de la sesión o el del IdP del objetivo (punto de extensión B-14).
    - _Requirements: 7.7_
  - [x] 2.3 Implementar `afordancias.ts`: `capacidades(objetivo, relacion, enCurso)` con `puedeCambiarRol`, `puedeEditarAlcance`, `puedeDesactivar`, `puedeReactivar`, `puedeRevocarSesiones` y `motivoBloqueo` según la tabla del diseño (falla cerrada en `indeterminado`; PA-7: desactivar no depende de la relación). Incluir `controlesDeAlcance(rol)`: solo `monitorista`, `supervisor` y `coordinador`; nunca clientes para `ejecutivo`; monitoreo y conversación sin control compartido.
    - _Requirements: 6.5, 6.6, 6.8, 7.1, 7.5, 8.8, 8.10, 11.11_
  - [x] 2.4 Implementar `validacion.ts`: `validarAlta` (nombre e identificador recortados no vacíos, rol del enum, organización activa única solo si el rol es `cliente`; el comando descarta la organización y nunca lleva `tenant_id` si el rol no es `cliente`), `validarOrganizacion` (nombre, correo con `@` y teléfono obligatorios, sin formato de teléfono; PA-2), `validarMotivo` (motivo de revocación obligatorio, no vacío tras recortar; PA-1) y `organizacionesOfrecibles` (solo activas).
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.6, 9.11_
  - [x] 2.5 Implementar `estadoConsulta.ts`: función pura que deriva `EstadoConsulta` (`cargando`, `vacio`, `error`, `sin_acceso`, `datos`, `datos_desactualizado`) de `isLoading`, `isError`, el `status` y `data`; ver nota sobre el nombre del estado en Notes.
    - _Requirements: 2.5, 2.7, 2.8, 9.13, 13.1, 13.2_
  - [x] 2.6 Implementar `clasificarError.ts` y `mensajes.ts`: clases que extienden `ApiError` (autorización insuficiente, auto-escalada bloqueada, usuario no disponible, conflicto de rol con motivo, último administrador, identificador duplicado, validación, organización inválida, nombre de organización duplicado, servicio no disponible, superficie no publicada); `clasificarError(operación, status, codigo)` total; `401` y sesión finalizada pasan sin transformar; `409` con `codigo` desconocido produce conflicto genérico sin afirmar motivo. `mensajesDeExito(acción)` limitado a lo que el contrato garantiza ("siguiente refresco", "máximo 30 segundos") y textos centralizados marcados como de trabajo (PA-4).
    - _Requirements: 4.5, 5.4, 5.6, 5.10, 6.10, 8.3, 10.6, 11.4, 11.5, 12.1, 12.6, 13.3_
  - [x] 2.7 Implementar `usarEnvioUnico.ts` (nombre final: `useEnvioUnico.ts`, por la regla react-hooks): cerrojo en `useRef` combinado con `isPending`, clave `(acción, objetivo)`, liberado al terminar con éxito o error; sin reintento automático.
    - _Requirements: 3.10, 5.2, 8.5, 8.6, 9.10, 10.11, 11.3, 13.4_
  - [ ]* 2.8 Escribir prueba de propiedades para `relacionConSesion`
    - **Property 7: El sujeto de la sesión se identifica por identificador, no por nombre**
    - **Validates: Requirements 7.7**
  - [ ]* 2.9 Escribir prueba de propiedades para `capacidades`
    - **Property 8: Capacidades según relación y estado**
    - **Validates: Requirements 7.1, 7.5, 8.8, 8.10, 11.11**
  - [ ]* 2.10 Escribir prueba de propiedades para los controles de alcance por rol
    - **Property 10: Controles de alcance según el rol del objetivo**
    - **Validates: Requirements 6.5, 6.6, 6.8**
  - [ ]* 2.11 Escribir prueba de propiedades para `validarAlta`
    - **Property 4: Validez del alta y forma del comando**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 4.3, 4.4, 4.6** (se revalida al cerrar B-1, B-3 y B-7)
  - [ ]* 2.12 Escribir prueba de propiedades para `organizacionesOfrecibles`
    - **Property 5: Organizaciones ofrecibles**
    - **Validates: Requirements 4.1, 4.2, 10.7** (se revalida al cerrar B-3)
  - [ ]* 2.13 Escribir prueba de propiedades para `validarOrganizacion` y `validarMotivo`
    - **Property 6: Datos de organización obligatorios**
    - **Validates: Requirements 9.11**
  - [ ]* 2.14 Escribir prueba de propiedades para `estadoConsulta`
    - **Property 12: Estados de consulta excluyentes**
    - **Validates: Requirements 2.5, 2.7, 2.8, 9.13, 13.1, 13.2**
  - [ ]* 2.15 Escribir prueba de propiedades para `clasificarError`
    - **Property 16: Clasificación total de errores**
    - **Validates: Requirements 5.6, 13.3** (se revalida al cerrar B-1)
  - [ ]* 2.16 Escribir prueba de propiedades para `mensajesDeExito`
    - **Property 19: Los textos de éxito se limitan a lo que el contrato garantiza**
    - **Validates: Requirements 4.5, 5.4, 5.10, 6.10, 8.3, 10.6, 11.4, 11.5, 12.1, 12.6**

- [x] 3. Puerto de administración, implementación "no publicada" y provider
  - [x] 3.1 Crear `src/lib/api/administracion.ts`: interfaz `AdministracionPort` con `capacidades` y los métodos del diseño (usuarios, organizaciones, alcance, sesiones), `ErrorSuperficieNoPublicada` y la implementación "no publicada" (`capacidades` en `false`; cada método lanza `ErrorSuperficieNoPublicada`). Los nombres son de trabajo, no `operationId`; el puerto no incluye revocar por `sesion_id`, enumerar sesiones, auditoría, historial, edición de tenant, clientes de un Ejecutivo, organización padre ni transferencia. Cada método recibe `accessToken`. No agregar handlers MSW.
    - _Requirements: 6.5, 9.5, 9.6, 11.9, 12.2, 12.4, 12.5, 13.4, 13.8_
  - [x] 3.2 Crear `AdministracionProvider` (contexto React) y `useAdministracionPort()`; el valor por defecto es la implementación "no publicada". Los hooks no importan el adaptador directamente.
    - _Requirements: 13.4_
  - [x] 3.3 Crear el puerto falso de pruebas `tests/administracion/puertoFalso.ts`: dobles configurables por método con espías, para inyectar vía `AdministracionProvider` (apoyo a las pruebas de ambos bloques; no es un handler MSW).
    - _Requirements: 13.4_
  - [ ]* 3.4 Escribir prueba estructural del puerto: el conjunto de métodos es el declarado y no incluye los excluidos
    - _Requirements: 6.5, 9.5, 9.6, 11.9, 12.2, 12.4, 12.5_

- [ ] 4. Pantalla base, estados y accesibilidad
  - [x] 4.1 Implementar `Administracion.tsx` y `AdministracionAutorizada.tsx` y reemplazar el stub `src/routes/_private/administracion.tsx`: título "Administración" siempre visible; sin sesión o rol distinto de `administrador` se muestra el aviso de acceso no autorizado y **no se monta** `AdministracionAutorizada` (sin hooks de red, sin controles). Dentro de la pantalla autorizada, secciones `usuarios` / `organizaciones` por parámetros de búsqueda (`?seccion=`, `?usuario=`) alternadas con `Button`; mientras la capacidad del puerto no esté publicada cada sección muestra el estado `brecha`. Ninguna acción consulta el rol local para decidir su resultado.
    - _Requirements: 1.2, 1.3, 1.5, 13.1, 13.5_
  - [x] 4.2 Crear `SelectorRol.tsx` (`Radio` dentro de `FormSection` con leyenda; ocho opciones desde el enum; marca visible del rol actual cuando se indica) y `EstadoBadge.tsx` (`Badge` con texto activo / inactivo; sin estado "bloqueado").
    - _Requirements: 1.6, 3.1, 5.1, 12.3, 13.5, 13.6, 13.9_
  - [x] 4.3 Crear el componente de región de consulta (`Card` + texto con `role="status"` / `role="alert"`) para los estados `brecha`, `cargando`, `vacio`, `error` con reintento manual, `sin_acceso` y `datos_desactualizado` (datos previos visibles y atenuados con aviso persistente; nunca vacío sin datos que conservar).
    - _Requirements: 2.5, 2.7, 2.8, 9.9, 9.13, 13.1, 13.2_
  - [x] 4.4 Implementar el estado y el foco de los diálogos: reducer puro de diálogo de formulario (`cerrado`, `editando`, `enviando`, `error_general`, `error_de_campo`) y de confirmación (`cerrado`, `confirmando`, `enviando`, `error`, más `consultando_consecuencia` / `error_consecuencia` / `listo` para organización); configuración común de `Modal` que bloquea `closeOnEsc`, `closeOnOverlayClick` y `showCloseButton` mientras haya solicitud pendiente; devolución del foco al elemento que abrió o, si ya no existe, al encabezado de la sección. Sin duplicar `Modal`.
    - _Requirements: 13.4, 13.10, 13.11_
  - [x] 4.5 Ajustar `src/lib/api/unidades.ts` con `listarTodasUnidades` que recorre todas las páginas (como `listarTodosClientes`) y crear la lista de opciones de unidades para el selector de alcance. La etiqueta es el identificador devuelto, sin inventar nombre o placa (B-16). No guarda alcance (eso es B-4).
    - _Requirements: 6.1 (solo opciones)_
  - [ ] 4.6 Agregar en `src/mocks/data.ts` una credencial demo con rol `administrador` (contrato de sesión existente) para ver la pantalla en `dev:mock`; no agregar handlers de sujetos, organizaciones, alcance ni revocación.
    - _Requirements: 1.1_
  - [ ]* 4.7 Escribir prueba de propiedades para el acceso sin solicitudes ni controles
    - **Property 2: Sin solicitudes ni controles para quien no es administrador**
    - **Validates: Requirements 1.2, 1.3**
  - [ ]* 4.8 Escribir prueba de propiedades para las opciones de rol
    - **Property 3: Las opciones de rol son exactamente el enum**
    - **Validates: Requirements 1.6, 3.1, 5.1, 12.3**

- [x] 5. Controles de usuario con bloqueo de auto-escalada
  - [x] 5.1 Crear `AccionesUsuario.tsx` y `AvisoBloqueo`: recibe un modelo de vista de usuario y la relación con la sesión y renderiza cambio de rol, alcance, desactivar, reactivar y revocar a partir de `capacidades`; los bloqueados quedan deshabilitados con el motivo visible ("no se puede modificar el propio rol ni el propio alcance", "no se pudo identificar la sesión") y ningún medio de disparo (clic, Enter, reenvío) emite una solicitud. Revocación sobre uno mismo no se ofrece y remite al cierre de sesión. Cambiar al rol que ya tiene **no** se bloquea en el cliente.
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 7.7, 8.8, 8.10, 11.11, 13.5_
  - [ ]* 5.2 Escribir prueba de propiedades para objetivos bloqueados
    - **Property 9: Ninguna solicitud sobre un objetivo bloqueado**
    - **Validates: Requirements 7.2, 7.5, 8.8**

- [x] 6. Pruebas de la definición de terminado (Bloque A)
  - [x] 6.1 DoD 1: probar para cada uno de los siete roles distintos de `administrador` y para "sin sesión" que la navegación no muestra "Administración", que `/administracion` por URL muestra el aviso de acceso no autorizado y que no hay controles de asignación de roles ni de alcance ni llamadas al puerto.
    - _Requirements: 1.1, 1.2, 1.3; escenario 9_
  - [x] 6.2 DoD 2 (parte de interfaz): con la sesión simulada como el propio objetivo, probar que cambio de rol y de alcance están deshabilitados con el motivo visible y que no se envía solicitud por ningún medio; y que con identificador no comparable (`indeterminado`) ocurre lo mismo con el aviso de sesión no identificable. La prueba de que el servidor rechaza con `403` queda en la tarea 17.6 y en la 19.4.
    - _Requirements: 7.1, 7.2, 7.5; escenario 10_
  - [ ]* 6.3 Pruebas de accesibilidad de ejemplo: nombre accesible no vacío en cada control, `Radio` de rol con leyenda, `Badge` con texto, foco inicial dentro del diálogo, Tab atrapado, foco devuelto y respaldo al encabezado, operación completa con teclado.
    - _Requirements: 13.5, 13.6, 13.10, 13.11_
  - [ ]* 6.4 Pruebas de exclusiones de V1: no existen controles de auditoría, rol Auditor, break-glass, transferencia, edición de tenant, organización padre, reactivación de organizaciones, edición del identificador de usuario ni revocación por `sesion_id`.
    - _Requirements: 9.5, 9.6, 9.7, 11.9, 11.10, 12.2, 12.3, 12.4, 12.5_

- [x] 7. Checkpoint - Bloque A completo
  - Ensure all tests pass, ask the user if questions arise.

### Bloque B: condicionado a contrato (contra el puerto falso; no inventar `operationId`, rutas ni campos)

- [ ] 8. Sección de usuarios
  - [ ] 8.1 **Bloqueada por B-2** (y B-15 para nombre e identificador de usuario). Implementar `useUsuarios(consulta)` con clave `['administracion','usuarios',consulta]`, `retry: false`, sin sondeo, consulta con `texto`, `rol` y `cursor`; reductor puro de `page` real y cursores visitados (patrón de `bandejaReducer`); búsqueda con retraso corto (valor no fijado).
    - _Requirements: 2.1, 2.2, 2.8_
  - [ ] 8.2 **Bloqueada por B-2, B-15.** Implementar `SeccionUsuarios.tsx` con `FilterTable` (búsqueda, filtro por rol desde el enum, `hideCount`), `Pagination` mapeada a cursor, `EstadoBadge`, organización solo para `cliente`, renderizado tal cual en el orden recibido y los estados de la tarea 4.3.
    - _Requirements: 2.1, 2.2, 2.5, 2.7, 2.8, 13.1, 13.2_

- [ ] 9. Detalle de usuario y acciones base
  - [ ] 9.1 **Bloqueada por B-1.** Implementar `useUsuario(id)` (clave `['administracion','usuario',id]`, recarga tras mutación exitosa y tras `403`/`409`) y `useAccionUsuario()`: `useMutation` por acción, sin actualización optimista ni reintento, con `usarEnvioUnico`; tras el éxito recarga y muestra solo lo que devuelve el `bff`.
    - _Requirements: 2.3, 5.3, 5.7, 7.3, 8.5, 13.4_
  - [ ] 9.2 **Bloqueada por B-1, B-14, B-15.** Implementar `PanelUsuario.tsx`: detalle (nombre, identificador de usuario, rol o "sin rol", estado, organización si es `cliente`) con estados `cargando`, `no_disponible` (404), `error`, `sin_acceso` y `datos`; integra `AccionesUsuario` y la relación con la sesión; sin datos de otro usuario ante error. El aviso de auto-escalada es independiente de la recarga del detalle.
    - _Requirements: 2.3, 2.6, 2.9, 7.3, 7.4, 13.1, 13.2_

- [ ] 10. Alta de usuario y organización del Cliente
  - [ ] 10.1 **Bloqueada por B-3.** Implementar `useOrganizaciones()` y `SelectorOrganizacion.tsx` (`Radio` con leyenda; solo organizaciones activas por nombre; selección única).
    - _Requirements: 4.1, 4.2, 9.1_
  - [ ] 10.2 **Bloqueada por B-1, B-3, B-7.** Implementar `AltaUsuarioDialog.tsx`: nombre, identificador de usuario, `SelectorRol` y `SelectorOrganizacion` solo para `cliente`; cambiar a un rol distinto descarta la organización del comando; sin `tenant_id` capturado; confirmación deshabilitada mientras la solicitud está en curso; conserva lo capturado ante cualquier error; identificador duplicado junto al campo; organización inválida junto al selector con recarga de organizaciones. No define qué valor lleva `tenant_id` de usuarios internos (B-7 abierta).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.3, 4.4, 4.6, 4.8_

- [ ] 11. Cambio de rol
  - [ ] 11.1 **Bloqueada por B-1** (el `409` de cruce llega en `tracer.40`). Implementar `CambioRolDialog.tsx`: solo roles del mismo lado que el actual con el actual marcado (siete internos para un interno; sin cambio de rol para un `cliente`; DEC-141), solo para usuario activo y ajeno; el motivo del `409` (desactivado, rol igual, último administrador) solo si el `codigo` lo distingue, si no conflicto genérico; aviso previo de que se retirará el alcance actual (DEC-140 #3 y #4; texto nuevo en `mensajes.ts`), después de confirmar el rol nuevo aplica en el "siguiente refresco" y el retiro de alcance de inmediato; sin plazo (PA-9); el cambio de rol no revoca sesiones ni desactiva. `409` de cruce `cliente`↔interno: mensaje propio cuando exista su `codigo`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.10_

- [ ] 12. Desactivar y reactivar usuarios
  - [ ] 12.1 **Bloqueada por B-1.** Implementar `DesactivarUsuarioDialog.tsx` (confirmación previa, `danger`, sin solicitud antes de confirmar) y la acción de reactivar; aviso del corte "máximo 30 segundos"; el último administrador se explica con el motivo del `bff`; la auto-desactivación la decide el `bff` (PA-7); desactivar no cambia rol ni alcance.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.9, 8.10_

- [ ] 13. Alcance de monitoreo
  - [ ] 13.1 **Bloqueada por B-4 y B-2 (`tracer.40`).** Implementar `AlcanceEditor.tsx`: unidades para `monitorista` (opciones de la tarea 4.5; las edita el `administrador`), Monitoristas para `supervisor` y Supervisores para `coordinador` (solo `administrador`; DEC-140 #1 y #2), con columna `Checkbox` y `aria-label` por fila en `Table`; opciones solo las devueltas, filtradas por rol; el alcance efectivo se muestra tal cual lo devuelve el `bff` (sin calcular uniones); alcance vacío con mensaje; opciones vacías o con error deshabilitan confirmar sin perder la selección. El vínculo es la lista "mis unidades" de `identidad` (DEC-140 #1); el alcance de Supervisor y Coordinador se muestra como lo devuelve el `bff`.
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.4, 6.9, 6.11_
  - [ ]* 13.2 Escribir prueba de propiedades para las opciones de alcance
    - **Property 11: Las opciones de alcance son solo las devueltas, filtradas por rol**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.11** (se revalida al cerrar B-2 y B-4)

- [ ] 14. Organizaciones
  - [ ] 14.1 **Bloqueada por B-3.** Implementar `useAccionOrganizacion()`, `SeccionOrganizaciones.tsx` (lista plana con `Table`, `EstadoBadge`, tenant solo lectura, estado vacío con "crear la primera") y `OrganizacionFormDialog.tsx` (crear y editar nombre, correo y teléfono, los tres obligatorios; correo con `@`, teléfono sin formato; conflicto de nombre conserva el formulario). Sin organización padre y sin acción de reactivar: la desactivación es terminal (PA-8).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13_
  - [ ] 14.2 **Bloqueada por B-2, B-3.** Implementar `DesactivarOrganizacionDialog.tsx`: consulta la consecuencia (número de usuarios activos que pierden el acceso, tal cual lo devuelve el `bff`), `confirmar` solo en el estado `listo`, error de consecuencia con reintento, conteo cero con mensaje propio, sin afirmar plazos ni revocación de sesiones (PA-8).
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.8, 10.10, 10.11_

- [ ] 15. Revocación masiva de sesiones
  - [ ] 15.1 **Bloqueada por B-5.** Implementar `RevocarSesionesDialog.tsx`: confirmación previa, estado "revocación en curso" por usuario que sobrevive a cerrar el diálogo, resultado informativo tal cual (incluido "sin sesiones"), aviso "máximo 30 segundos", "no se pudo confirmar" ante falta de respuesta sin asumir que no se aplicó, campo de motivo obligatorio de texto libre con confirmar deshabilitado si está vacío (PA-1), sin revocación por `sesion_id` y sin ofrecerla sobre uno mismo. Sin afirmar auditoría ni "la sesión ya dejó de funcionar".
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.11_

- [ ] 16. Integración del Bloque B
  - [ ] 16.1 **Bloqueada por B-1 a B-5.** Cablear secciones y diálogos: montar `SeccionUsuarios`, `SeccionOrganizaciones` y `PanelUsuario` en `AdministracionAutorizada`; abrir `AltaUsuarioDialog` desde la sección de usuarios; abrir cambio de rol, desactivar/reactivar, alcance y revocar desde `PanelUsuario`; avisos con `Toast`/`ToastContainer`; mientras la capacidad del puerto no esté publicada se conserva el estado `brecha` y no se muestran controles de la acción.
    - _Requirements: 2.1, 3.1, 5.1, 6.1, 8.1, 9.1, 10.1, 11.1, 13.1_

- [ ] 17. Verificación del Bloque B contra el puerto falso
  - [ ]* 17.1 Escribir prueba de propiedades para la vista de lo devuelto
    - **Property 13: La vista refleja lo devuelto**
    - **Validates: Requirements 2.2, 2.4, 6.4, 10.2, 10.3** (se revalida al cerrar B-2, B-3 y B-4)
  - [ ]* 17.2 Escribir prueba de propiedades para el envío único
    - **Property 14: Un solo envío por acción y objetivo**
    - **Validates: Requirements 3.10, 5.2, 8.5, 8.6, 9.10, 10.11, 11.3**
  - [ ]* 17.3 Escribir prueba de propiedades para la confirmación del `bff`
    - **Property 15: Solo la confirmación del `bff` cambia lo mostrado**
    - **Validates: Requirements 1.4, 3.9, 5.3, 5.6, 5.8, 6.9, 8.3, 8.4, 8.7, 9.8, 9.12, 10.8, 11.6, 13.4**
  - [ ]* 17.4 Escribir prueba de propiedades para la ausencia de efectos cruzados
    - **Property 17: Sin efectos cruzados entre acciones**
    - **Validates: Requirements 5.5, 8.9**
  - [ ]* 17.5 Escribir prueba de propiedades para las acciones destructivas
    - **Property 18: Ninguna solicitud destructiva antes de confirmar**
    - **Validates: Requirements 8.1, 8.2, 10.4, 10.5, 10.10, 11.2**
  - [ ] 17.6 **Bloqueada por B-1 (solo la parte del servidor).** DoD 2, lado de la interfaz ante `403`: con el puerto falso respondiendo `403` a un cambio de rol o de alcance del propio sujeto, la interfaz muestra el estado de auto-escalada bloqueada, el rol no cambia y el aviso se conserva si la recarga del detalle falla. Que el servidor real rechace con `403` **no** se demuestra aquí (tarea 19.4).
    - _Requirements: 7.3, 7.4; escenario 10_
  - [ ]* 17.7 Pruebas de ejemplo de los flujos condicionados con el puerto falso: alta interna y de Cliente, cambio de rol con `409` por motivo y genérico, desactivar/reactivar, organización (crear, editar, duplicado, consecuencia), revocación en curso y sin respuesta, `401` delegado al AppShell sin presentar la acción como realizada, `404` y error del detalle.
    - _Requirements: 3, 4, 5, 8, 9, 10, 11, 13.3, 13.4; escenarios 1, 2, 4, 5, 6, 7, 8, 11, 12, 16, 17, 18, 19_

- [ ] 18. Checkpoint final
  - Ejecutar `typecheck`, `lint`, `test` y `build:mock` y verificar la ausencia de controles excluidos. Registrar en `BRECHAS.md` toda superficie que no permita demostrar el resultado requerido. Ensure all tests pass, ask the user if questions arise.

### Reverificación al publicarse el contrato (bloqueada; fuera de este ciclo)

- [ ] 19. **Bloqueada por la publicación de `tracer.40` (B-1 a B-5, B-14 y B-15).** No iniciar en este ciclo.
  - [ ] 19.1 Subir el pin de `@ai27-tech/contracts` (hoy `0.1.0-tracer.37`; `tracer.39` publicado, que es la ola de `/roster` y no trae esta superficie) a `tracer.40`, cuando Lead confirme que está publicada. **Requiere aprobación explícita.** Actualizar la entrada en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`, reinstalar para alinear `node_modules` con el lockfile (B-9) y confirmar en `bff.gen.ts` los `operationId` reales.
    - _Requirements: 13.8_
  - [ ] 19.2 Regenerar tipos y escribir el adaptador real de `AdministracionPort` (único lugar con tipos generados de esta superficie): traducir wire a modelo de vista, mapear `codigo` a las clases de error (B-1), resolver el identificador comparable de la sesión (B-14), obtener nombre e identificador de usuario (B-15), etiqueta de unidad (B-16) y organización en cambios de rol (B-17). Coordinar B-18 en `src/lib/api/client.ts`: admitir `PUT` en `RequestOptions.method` y definir `AbortSignal` / tiempo de espera (valor no fijado en el spec). Solo entonces, y con autorización, agregar fixtures y handlers MSW.
    - _Requirements: 2, 3, 4, 5, 6, 7.7, 8, 9, 10, 11, 13.8_
  - [ ] 19.3 Revalidar cada criterio `[CONDICIONADO a B-n]` y las propiedades marcadas condicionadas (4, 5, 11, 13, 16) contra los tipos y respuestas reales; actualizar `BRECHAS.md` con lo que cambie.
    - _Requirements: 2 a 11_
  - [ ] 19.4 Pruebas que dependen del servidor: (a) DoD 2, el `bff` rechaza con `403` el cambio del propio rol o alcance (B-1); (b) DoD 3, e2e de revocación masiva sobre dos usuarios, ambos fuera de acceso por HTTP y SSE en máximo 30 segundos (**bloqueada por B-5**; PA-5 resuelto: se arma con dos sujetos distintos, cada uno con su sesión viva, porque DEC-138 no permite dos sesiones del mismo sujeto).
    - _Requirements: 7.3, 11.4; escenarios 10 y 20_

## Notes

### Notas de brechas

- **Bloque B bloqueado por contrato:** B-1 (sujetos y roles), B-2 (listado), B-3 (organizaciones), B-4 (alcance), B-5 (revocación masiva), B-14 (identificación del sujeto de la sesión) y B-15 (nombre e identificador de usuario en el detalle); todo sale en `tracer.40`. Decididas: B-7, B-17 y PA-3. Resuelta con `tracer.38`: B-16. Hasta entonces la pantalla muestra el estado `brecha` y el puerto "no publicada" lanza `ErrorSuperficieNoPublicada`.
- **Sin handlers MSW** para sujetos, organizaciones, alcance ni revocación: inventarían rutas y campos. Solo se agrega una credencial demo `administrador` (contrato de sesión existente).
- **B-12 se resuelve en la tarea 1** sin contrato. **B-11** (sin `Tabs`, `Select` sin nombre accesible, sin multi-select, textos en inglés en `Modal` y `Table`, `Pagination` numérica) se resuelve componiendo con primitivas de la librería y registrando la brecha; no se duplica nada.
- **B-18 (`PUT` y tiempo de espera en `client.ts`)** es un cambio en archivo compartido que se coordina al escribir el adaptador real (tarea 19.2). No se ejecuta en este ciclo.
- **B-13 (reautenticación en acciones sensibles)** está decidida (DEC-141 #5): no se pide en V1. DT-21 queda para Seguridad.
- **B-6** queda fuera de V1 (DEC-140 #6). **B-8/PA-10** está decidida: el identificador de usuario es inmutable y editar usuario cambia solo el nombre (`editarUsuario` en el puerto); queda bloqueada por la ola de contrato de B-9.
- **Decididas en DEC-139:** PA-1, PA-2, PA-5, PA-7, PA-8, PA-9 y PA-10, ya incorporadas. También decididas en DEC-140 y DEC-141: PA-3, PA-4, PA-6, B-4, B-6, B-13 y B-17. DEC-142: el `jefe_operativo` asigna unidades en `/roster` (E8-T21), no en esta pantalla. No queda pregunta abierta de producto.
- **Rama desactualizada (2026-11-09):** `feature/e8-t19-administracion-usuarios` está 12 commits detrás de `pf-wfi-d` y choca en `src/lib/api/unidades.ts` (conservar `listarTodasUnidades` y el encabezado nuevo) y en `tests/layout/navigation-visibility.test.ts` (la entrada de `/roster`). Resuelto: `pf-wfi-d` está mergeada en la rama (`bbbadc2`). El push queda pendiente de aprobación.
- **Errores 403 (PR #28):** el código nuevo usa `esProhibido(err)` para mostrar "no tienes permiso" sin cerrar la sesión, y `esSesionInvalida(err)` solo para el 401 o la sesión cortada (DT-03). Resuelto: `clasificarError` clasifica el 403 como `prohibido` y `textoDeFallo` no produce texto ante sesión inválida.

### Inconsistencias detectadas en los documentos

- El diseño nombra el estado de datos previos con fallo como `datos_desactualizados` (Estados de la interfaz, `EstadoConsulta` de Data Models) y como `datos_desactualizado` (Property 12, Decisiones de diseño, `BRECHAS.md`). Las tareas usan `datos_desactualizado`; alinear al implementar la tarea 2.5.
- El diseño ubica "Estados y foco de los diálogos" en el Bloque A aunque los diálogos son del Bloque B. Se construye el estado y la configuración de `Modal` en la tarea 4.4 y los diálogos en las tareas 10 a 15.
- Las Correctness Properties 4, 5, 11, 13 y 16 están marcadas como condicionadas pero las funciones puras (4, 5, 16) se pueden probar hoy; se escriben en el Bloque A y se revalidan en la tarea 19.3.
- El e2e de revocación masiva (DoD 3) se arma con dos sujetos distintos (PA-5 resuelto); sigue sin armarse en este ciclo porque depende de B-5.
- R13.6 menciona el estado "bloqueado", que el contrato no tiene (solo `activo`); se muestran solo activo e inactivo.

### Notas generales

- Las tareas marcadas con `*` son opcionales (pruebas de propiedades y pruebas de ejemplo adicionales) y pueden omitirse para un MVP; las pruebas de DoD (6.1, 6.2, 17.6) no son opcionales.
- Cada prueba de propiedades usa `fast-check` con `vitest`, mínimo 100 iteraciones, etiquetada `Feature: e8-t19-administracion-usuarios-roles-organizaciones, Property N: <título>`, en su propio archivo bajo `tests/administracion/`. Las propiedades 2, 9, 14, 15, 17 y 18 usan React Testing Library y el puerto falso de la tarea 3.3.
- No se escribe en `repos/pf-pkg-contracts` ni en `repos/ai27-platform-context`; las solicitudes de contrato se gestionan con Plataforma/Contratos.
