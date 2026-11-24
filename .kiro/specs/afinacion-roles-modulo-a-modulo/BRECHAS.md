# Brechas y preguntas: afinación de roles módulo a módulo

Fuentes: contexto `origin/main` `0c48d67`; contrato tag `v0.1.0-tracer.46`; pin del panel `tracer.40`. No se escribió nada en `ai27-platform-context` ni en `pf-pkg-contracts`.

## Brechas

### B-01. El pin está seis tracers atrás y `tracer.45` rompe el viaje

- **Qué pide el spec:** `obtenerMiAlcance` y la descripción del `400` de `fijarClientesSujeto` (`tracer.43`); aprobar y rechazar por la API de solicitudes y el enum del viaje sin estados previos (`tracer.45`).
- **Qué existe:** `package.json` fija `tracer.40`. El Lead fijó `.43` como objetivo el 2026-11-18 ("no subas a `.41` ni `.42` para no hacer dos bumps") y DT-24 lo repite. Después se publicaron `.44` (aditivo), `.45` (**incompatible**) y `.46` (aditivo, `idp_subject`).
- **Qué rompe `.45` en el panel:** `EstadoViaje` pierde `SOLICITADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE`; `CANCELADO` pasa a `CANCELADO_POR_CLIENTE`; `listarViajes` (filtro `estado`) y `transicionarViaje` (`a_estado`) dejan de aceptar los valores retirados; `roles.Todos` pasa de 8 a 9; aprobar y rechazar pasan a `aprobarSolicitud` y `rechazarSolicitud`.
- **Impacto:** M2, M4 y M14. Subir solo a `.43` obliga a un segundo bump y mantiene código de aprobación sobre un estado que el backend ya retiró.
- **Propuesta:** subir directo a `.46` en una tarea aparte (0.3 de `tasks.md`) y absorber la ruptura en M2, M4 y M14. Requiere confirmación del usuario y aviso al Lead de que el objetivo `.43` quedó atrás. Las fases sin pin no esperan.

### B-02. DEC-149 #8 y el contrato discrepan en "activar emergencia" del Administrador

- **Qué dice la tabla:** "Emergencia interna: activar, notas, `Resuelta → Cerrada`": `administrador` Sí.
- **Qué dice el contrato:** `activarEmergenciaInterno` lo activan `monitorista`, `supervisor` y `coordinador`; otro rol interno responde `403` (DEC-045 #9: el administrador no activa). `agregarNotaEmergenciaInterno` y `cerrarEmergenciaPorId` sí admiten a ADM.
- **Impacto:** M4 (botón de cabecera) y M9. El código actual ya excluye a ADM del botón.
- **Propuesta:** seguir el contrato (más específico) y pedir al Lead que corrija la celda de la tabla o autorice a ADM en el contrato.

### B-03. El contrato no documenta la guarda por rol de las mutaciones del viaje

- **Existe:** descripciones con rol para solicitudes, emergencias, roster, administración y alcance. **No** declaran rol: `transicionarViaje` (por arista), `fijarEta`, `completarFechaHora`, `guardarFicha`, `obtenerFicha`, `registrarEntradaBitacora`, `abrirEstadia`, `cerrarEstadia`, `abrirIncidencia`, `crearIntencionSubidaAdjunto`, `listarGps`, `reporteViajes`, `reporteEstados` (algunas con descripción vacía).
- **Falta:** saber si el backend devuelve `403` a los roles que DEC-149 #8 niega (p. ej. JO en avance y ETA).
- **Impacto:** la UI oculta por la tabla, pero sin garantía de que el backend aplique la misma negativa. Filas marcadas `D` en M4, M5, M6, M7 y M13.
- **Propuesta:** pedir al Lead que confirme o documente las guardas; mientras tanto la UI sigue DEC-149 #8 y no se emula una negativa que el contrato no declara.

### B-04. Resolver incidencia: el contrato nombra a Supervisor y Coordinador, no al Administrador

- **Existe:** `resolverIncidencia`: "Resolver es facultad de Supervisor/Coordinador: un rol sin ella recibe 403". DEC-022 #1 y la respuesta del Lead dicen que el Administrador hereda todo.
- **Impacto:** M6. El spec v2 había agregado a ADM sin fuente contractual.
- **Propuesta:** preguntar si ADM entra. Hasta entonces, solo SUP y COO.

### B-05. Administrador y la bandeja de chat del viaje

- **Existe:** `listarTrabajoBandeja` la ven `ejecutivo` y, en lectura, `supervisor` y `coordinador`; "otro rol recibe `404`". `obtenerConversacion` responde `403` a otro rol interno. DEC-022 #1 dice que ADM hereda las facultades de los demás roles internos.
- **Impacto:** M1 y M10: no está claro si ADM ve Conversaciones.
- **Propuesta:** preguntar al Lead. Mientras tanto, ADM no ve la entrada de chat del viaje (el contrato le da `404`).

### B-06. `cotizacion` frente a las operaciones del viaje

- **Existe:** `obtenerAsignacion` "la lee cualquier rol interno salvo `ejecutivo` y `reaccion`", lo que incluye a `cotizacion`. Las demás operaciones del viaje no nombran a `cotizacion`. DEC-148 no le da acceso a viajes.
- **Impacto:** el modelo de lista blanca niega a `cotizacion` todo lo del viaje (marcado ✘*); `obtenerAsignacion` queda en `?`.
- **Propuesta:** preguntar si es omisión del texto. La UI no ofrece la ruta de la ficha a `cotizacion`.

### B-07. Un Jefe Operativo no puede resolver el nombre de un cliente desactivado

- **Existe:** `listarClientes` devuelve solo clientes `activo`. `listarOrganizaciones` (que sí trae desactivadas) es solo de ADM. DEC-149 #21 pide mostrar los desactivados marcados como tales. `listarClientes` tampoco declara si ADM lo puede leer.
- **Falta:** para JO, un cliente asignado que no está entre los activos solo se identifica por su id.
- **Impacto:** M3 y M11. JO ve "Cliente desactivado (id …)" sin nombre.
- **Propuesta:** tratar como desactivado todo id de `clientes_ids` que no esté en los activos, mostrar el id, y pedir al Lead si hace falta un campo de nombre o una lectura para JO. ADM sí tiene nombre vía `listarOrganizaciones`.

### B-08. Rol que corrige la fecha y hora del viaje

- **Existe:** `completarFechaHora`: "En V2 la fecha la exige la aprobación de la solicitud y el viaje nace con ella; este endpoint la corrige después". No declara rol. DEC-149 #8 solo cubre "fijar fecha antes de aprobar" (hoy parte de la solicitud).
- **Impacto:** M4. La acción queda en `?`.
- **Propuesta:** preguntar si JO y ADM, o también MON.

### B-09. Lectura de estadías e incidencias para el Jefe Operativo

- **Existe:** DEC-149 #8: JO "ve la ficha y la bitácora" sin editar. No dice nada de estadías e incidencias.
- **Impacto:** M6, pestaña Histórico.
- **Propuesta:** preguntar si JO ve el histórico completo en solo lectura.

### B-10. No hay historia técnica del panel para solicitudes

- **Existe:** `E10-cotizacion-y-pago.md` lista el "Panel interno (E8)" (bandeja de `cotizacion`, confirmar pago, reprogramar, aprobar o rechazar, conversación de la solicitud, avisos) solo como referencia, sin tarea E8 propia. E8-T9 sigue describiendo la aprobación sobre el viaje en `SOLICITADO`.
- **Impacto:** M14 no tiene tarea de origen. El panel de JO (E8-T20) todavía es stub.
- **Propuesta:** pedir al Lead una tarea E8 para solicitudes y reescribir E8-T9. Entre tanto, M14 queda como matriz y política.

### B-11. Las fuentes locales están desactualizadas

- **Existe:** contexto local en `df42d43` (40 commits atrás, con cambios locales en `scripts/demo/demo.sh` y `scripts/gate-g2/entorno.sh`); la ruta `.kiro/steering/decision-log.md` ya no existe en `origin/main` (ahora `argos-context/decision-log.md`). El checkout de contratos está en la rama `feat/ficha-tecnica-e-historico-tracer21`.
- **Impacto:** el spec v2 citaba rutas viejas y concluyó que DEC-149 no estaba registrada; sí lo está.
- **Propuesta:** leer siempre con `git show origin/main:...` y `git show v0.1.0-tracer.46:...`. No hacer pull sin que el usuario lo pida, porque el árbol tiene cambios ajenos.

## Preguntas

### Para el usuario (Angel)

- **Q-1. Pin.** ¿Subimos directo a `tracer.46` (recomendado, B-01) o primero a `.43` como pidió el Lead? Esto no bloquea las fases sin pin.
- **Q-2. Solicitudes (M14).** ¿Entra en este spec o va en uno aparte cuando exista la tarea E8 (B-10)? Propuesta: dejar aquí solo la matriz, la política y la navegación.
- **Q-3. Rama.** El Lead pidió una rama nueva `feat/alineacion-ui-roles-capacidades` desde `pf-wfi-d` actualizado. Hoy el trabajo está en `feature/refinacion-ui-roles`. ¿Se mantiene o se cambia?
- **Q-4. Orden.** ¿Empezamos por M0 y M1 (política y navegación), que bloquean a los demás, o prefieres otro módulo primero?

### Para el Lead (Fabricio)

- **Q-5.** B-02: ¿se corrige la celda "activar emergencia" de ADM en DEC-149 #8 o se abre el contrato?
- **Q-6.** B-03: ¿el backend responde `403` a los roles que DEC-149 #8 niega en `transicionarViaje`, `fijarEta`, `guardarFicha`, bitácora, estadías, incidencias y adjuntos? ¿Se documentan en el contrato?
- **Q-7.** B-04 y B-05: ¿ADM resuelve incidencias y ve la bandeja de chat del viaje?
- **Q-8.** B-06 y B-09: ¿`cotizacion` accede a `obtenerAsignacion`? ¿JO ve estadías e incidencias en solo lectura?
- **Q-9.** B-07 y B-08: ¿cómo identifica JO el nombre de un cliente desactivado? ¿Quién corrige la fecha y hora del viaje?
- **Q-10.** ¿Catálogos es solo lectura para no administradores? ¿`cotizacion` ve Catálogos y Reportes? ¿Quién ve el panel del Jefe Operativo además de JO y ADM?

## Sin brechas de UI conocidas

Los módulos usan componentes existentes de `@ai27-tech/ui` (`EmptyState`, `Alert`, `Toast`, `Badge`, `Tabs`, `Table`, `FilterTable`, `Section`, `DescriptionList`). Si el paso 2 de algún ciclo encuentra una falta, se registra aquí con el formato de la sección 7 de `ai27-tech-library-first`.
