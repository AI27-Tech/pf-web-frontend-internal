# Implementation Plan: Alineación de la UI interna con roles y capacidades

## Estado del plan

Todas las tareas son propuestas. Las tareas marcadas como bloqueadas no deben ejecutarse hasta resolver la fuente de verdad indicada.

## 0. Verificación de fuentes y contrato

- [ ] 0.1 Confirmar el tracer publicado vigente y registrar el commit/tag consultado.
  - Comparar el paquete de contratos usado por el frontend, el checkout local y el último tracer publicado.
  - No actualizar dependencias automáticamente.
- [ ] 0.2 Comparar la superficie BFF vigente contra las capacidades existentes del frontend.
  - Confirmar operaciones disponibles para sesión, viajes, detalle, transiciones, ETA, fecha/hora y asignación.
  - Registrar roster/asignación, conversaciones, emergencias, gobierno, catálogos, reportes y dashboards como brechas si siguen ausentes.
- [ ] 0.3 Revisar contradicciones pendientes en E4-HU-018 antes de fijar permisos para aprobación, rechazo, cierre y override.
  - **Bloqueada por decisión de Producto.**

## 1. Taxonomía de errores y sesión

- [ ] 1.1 Separar `401` y `403` en la taxonomía de `ApiError`.
- [ ] 1.2 Mantener la delegación de sesión solo para `401`.
- [ ] 1.3 Crear el estado de UI de prohibición para `403` sin logout.
- [ ] 1.4 Integrar el estado de prohibición en la bandeja y detalle del viaje.
- [ ]* 1.5 Probar `401` y `403` por separado en bandeja, detalle y una mutación.

## 2. Política de capacidades confirmadas

- [ ] 2.1 Crear una política pura de capacidades basada en los roles del contrato.
  - Incluir únicamente reglas confirmadas.
  - No incluir alcance de unidad/cliente.
- [ ] 2.2 Documentar en la política las capacidades que permanecen pendientes.
- [ ] 2.3 Cubrir con pruebas la política de asignación:
  - `jefe_operativo`: permitido;
  - `administrador`: permitido;
  - demás roles: no permitido.
- [ ]* 2.4 Probar que la política no concede capacidades por pertenecer a Supervisor/Coordinador sin una decisión explícita.

## 3. Navegación y guardas

- [ ] 3.1 Cambiar el catálogo de navegación de ocultamientos parciales a capacidades/roles permitidos.
- [ ] 3.2 Evitar que `cliente` acceda al panel interno.
- [ ] 3.3 Limitar Ejecutivo a la navegación de conversación cuando exista la capacidad BFF correspondiente.
- [ ] 3.4 Limitar Reacción a la navegación de emergencias/caso autorizado, sin acceso general a viajes.
- [ ] 3.5 Proteger el acceso directo a rutas con una guarda de audiencia/rol.
- [ ] 3.6 Conservar sesión ante una prohibición por rol o alcance.
- [ ]* 3.7 Probar menú y acceso directo para los ocho roles V1.

## 4. Acciones del detalle de viaje

- [ ] 4.1 Mantener la derivación de acciones desde la máquina de estados generada.
- [ ] 4.2 Añadir el filtro de capacidad sobre acciones confirmadas.
- [ ] 4.3 Mostrar `Asignar escolta` solo a `jefe_operativo`/`administrador` cuando el estado permita `ASIGNADO`.
- [ ] 4.4 Ocultar asignación a Monitorista, Supervisor, Coordinador, Ejecutivo, Reacción y Cliente.
- [ ] 4.5 No fijar todavía permisos de aprobar/rechazar/cerrar para Supervisor/Coordinador.
  - **Bloqueada por decisión de Producto.**
- [ ] 4.6 Manejar `403` de una acción sin logout y sin romper el detalle.
- [ ]* 4.7 Probar las acciones por rol y conservar regresiones de E8-T8, E8-T9 y E8-T10.

## 5. Mocks por rol

- [ ] 5.1 Crear fixtures de sesión para los ocho roles V1.
- [ ] 5.2 Separar el fixture exitoso de E8-T10 como `jefe_operativo`.
- [ ] 5.3 Hacer que el handler mock de asignación valide rol y devuelva `403` para roles no autorizados.
- [ ] 5.4 Mantener casos mock de `401`, `403`, `404` y `409` sin inventar códigos contractuales.
- [ ] 5.5 No calcular alcances de unidades/clientes en los handlers; representar respuestas ya autorizadas.
- [ ]* 5.6 Probar handlers con varios roles y respuestas de autorización.

## 6. Tratamiento de capacidades sin BFF

- [ ] 6.1 Inventariar pantallas stub y asociarlas con su operación BFF requerida.
- [ ] 6.2 Para cada capacidad sin contrato, elegir con Product Management entre:
  - ocultar la navegación;
  - mostrar estado “no disponible”;
  - mantener mock de desarrollo explícitamente etiquetado.
  - **Bloqueada por decisión de Producto y contrato BFF.**
- [ ] 6.3 No crear wrappers directos contra servicios internos.
- [ ]* 6.4 Probar que una capacidad sin contrato no se presenta como integrada.

## 7. Validación final

- [ ] 7.1 Ejecutar typecheck.
- [ ] 7.2 Ejecutar lint.
- [ ] 7.3 Ejecutar la suite completa en modo de una sola ejecución.
- [ ] 7.4 Ejecutar build con mocks.
- [ ] 7.5 Revisar que no existan permisos inventados, cálculos locales de alcance ni rutas sin guardas.
- [ ] 7.6 Actualizar este spec con las decisiones resueltas y cerrar solo las tareas realmente implementadas.

## Dependencias explícitas

- La tarea 0.1 bloquea toda sustitución de contratos.
- La tarea 0.3 bloquea la matriz completa de acciones de aprobación, rechazo, cierre y override.
- Las tareas 3.3, 3.4 y 6 dependen del inventario contractual BFF y de las decisiones de Producto.
- Las tareas de E8-T10 pueden usar este spec para corregir autorización de asignación, pero la funcionalidad de asignación sigue limitada por la brecha contractual del BFF.
