# Brief: Afinación de roles del panel interno, módulo a módulo

Para: Fabricio Fuentes (Lead) · De: Angel Arredondo · Fecha: [fecha]

Spec: `pf-web-frontend-internal/.kiro/specs/afinacion-roles-modulo-a-modulo/` (matriz acción × rol por módulo, contra `tracer.46`). Abajo, solo lo que no está definido en las fuentes y necesito que decidas o confirmes.

## Lo que no conocemos

1. **Guardas por rol de las mutaciones del viaje.** `bff.yaml` no declara qué rol puede `transicionarViaje` (por arista), `fijarEta`, `completarFechaHora`, `guardarFicha`, `obtenerFicha`, bitácora, estadías, `abrirIncidencia`, subir adjunto, `listarGps`, `reporteViajes` y `reporteEstados`. ¿El backend devuelve `403` a los roles que DEC-149 #8 niega? ¿Se documentan en el contrato?
2. **Nombre de un cliente desactivado para el Jefe Operativo.** `listarClientes` solo devuelve activos y `listarOrganizaciones` es solo del Administrador. El Jefe Operativo no puede resolver el nombre de un cliente ya asignado que se desactivó (DEC-149 #21). Hoy mostraría solo el id. ¿Se acepta o se agrega un campo?
3. **`listarClientes` para el Administrador.** La descripción dice "dentro del alcance del `jefe_operativo`". ¿El Administrador puede leerlo al crear un viaje?
4. **`obtenerAsignacion` y `cotizacion`.** El texto dice "cualquier rol interno salvo `ejecutivo` y `reaccion`", lo que incluye a `cotizacion`. ¿Es omisión o es intencional?

## Decisiones

5. **Activar emergencia y el Administrador.** DEC-149 #8 le da "Sí"; `activarEmergenciaInterno` le responde `403` (DEC-045 #9). Sigo el contrato. ¿Se corrige la celda de la tabla o se abre el contrato?
6. **Resolver incidencia.** El contrato dice "facultad de Supervisor/Coordinador". ¿Entra el Administrador por herencia? Hasta tu respuesta, solo Supervisor y Coordinador.
7. **Bandeja de chat del viaje y el Administrador.** `listarTrabajoBandeja` le responde `404`, pero DEC-022 #1 dice que hereda. ¿Ve Conversaciones? Hasta tu respuesta, no.
8. **Histórico del Jefe Operativo.** DEC-149 le da la ficha y la bitácora en solo lectura. ¿Ve también estadías e incidencias?
9. **Corregir fecha y hora del viaje.** `completarFechaHora` no declara rol. ¿Jefe Operativo y Administrador, o también el Monitorista?
10. **Catálogos y Reportes.** Confirmaste el statu quo. ¿Catálogos es solo lectura para quien no es Administrador? ¿`cotizacion` ve Catálogos y Reportes?
11. **Página de inicio de `cotizacion`.** ¿Aterriza en la bandeja de solicitudes?
