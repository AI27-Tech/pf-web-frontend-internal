# Plan de implementación: Modo mock con datos coherentes

Fase 3 de 3. Requiere `requirements.md` y `design.md` aprobados. Las preguntas de escolta, estados terminales, incidencia y ficha quedaron resueltas. Sigue pendiente la verificación del build sin modo mock (tarea 11).

No se agregan pruebas automatizadas, porque no se pidieron. La validación es `pnpm typecheck`, `pnpm build:mock` y el recorrido manual de los escenarios de `requirements.md`.

## Grafo de dependencias

```
1 → 2 → 3 → 4 → 5 → 6
              ↘ 7 ↗
8 (independiente, puede ir primero)
9 → 10
```

## Tareas

- [x] 1. Verificar contrato y contexto antes de tocar código (hecho: tracer.40 y respuesta del equipo de contratos)
  - Revisar el tag de `@ai27-tech/contracts` en `package.json` y confirmar la forma de `GET /viajes/{id}/ficha`, de `EmergenciaReaccion` (¿incluye el id del viaje?) y del rechazo de emergencia en viaje terminal.
  - Registrar en `BRECHAS.md` de esta carpeta las brechas que aparezcan (design.md, sección Brechas, puntos 1 a 3).
  - _Requisitos: 4.4, 5.2; design Brechas 1 a 3._

- [x] 2. Crear el almacén único `src/mocks/almacen-viajes.ts` (hecho: `resumen` no se guarda, se proyecta de `detalle.viaje`, según design "Reglas de forma")
  - Definir `AlmacenViajes` y `RegistroViaje` como en design.md.
  - Construir la semilla desde `Object.values(EstadoViaje)`, con un viaje por estado, conservando `VJ-1001` a `VJ-1010`.
  - Agregar la constante de estados terminales con `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE`.
  - _Requisitos: 1.1, 8.1, 8.2; design Forma del almacén, Semilla._

- [x] 3. Persistencia en `localStorage` solo en modo mock (hecho en `almacen-viajes.ts`; `reemplazarAlmacen` persiste)
  - Clave versionada `ai27.mock.almacen-viajes.v{version}`. Carga al iniciar, guarda después de cada mutación.
  - Descartar datos con versión distinta o JSON inválido.
  - Guardar solo si `import.meta.env.VITE_ENABLE_MOCKS === 'true'`.
  - Exportar `reiniciarAlmacenMock()`.
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5; design Persistencia._

- [x] 4. Migrar viajes, fichas, expediente, incidencias y reportes a fachadas sobre el almacén (`data.ts`)
  - Eliminar `VIAJES_DEMO`, `DETALLES_VIAJES`, `FICHAS_DEMO`, `INCIDENCIAS_DEMO` y `FILAS_REPORTE_DEMO`.
  - Mantener las firmas exportadas. `descargarViajeMock` lee el expediente del registro.
  - `FILAS_REPORTE_DEMO` pasa a derivarse del almacén. Eliminar `VJ-R1` a `VJ-R4` y `COMPLETADO`.
  - Ajustar `reporteEstadosMock` para que cuente desde el almacén.
  - _Requisitos: 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 5.1, 5.3._

- [x] 5. Mutaciones coherentes: transición, ETA, fecha y hora, incidencias y condición `INCIDENCIA`
  - Las funciones `transicionarViajeMock`, `fijarEtaMock`, `completarFechaHoraMock`, `guardarFichaMock`, `abrirIncidenciaMock` y `resolverIncidenciaMock` escriben en el almacén en una sola operación.
  - Abrir incidencia agrega `INCIDENCIA` a `condiciones_activas`. Resolver la última abierta la quita.
  - Verificar que un rechazo no cambia el almacén.
  - _Requisitos: 2.1, 2.3, 2.4, 6.1, 6.2, 6.3._

- [x] 6. Escolta y roster sobre el almacén (`roster.ts`)
  - Sacar `reservas` de `roster.ts`. `reservarEscoltaMock` escribe en el almacén. `tieneReservaVigente` lee el estado del viaje del almacén.
  - Rechazar la reserva si la unidad ya está en otro viaje no terminal.
  - Liberar la reserva al entrar en estado terminal.
  - `reiniciarRosterMock` reinicia solo su parte del almacén.
  - _Requisitos: 2.2, 7.1, 7.2._

- [x] 7. Emergencias sobre el almacén (`emergencias.ts`)
  - Sacar `casos` y `viajesEmergencias` del módulo. Activar una emergencia en `VJ-10xx` crea el caso en el almacén y la entrada en `emergencias` del viaje.
  - Eliminar `VIAJE_DEMO` y los ids `viaje-001` y `viaje-terminal`.
  - Dar detalle a todo caso listado. Corregir `em-004` (hoy 404 en detalle).
  - Rechazar la activación si el viaje está en estado terminal, según el estado real del almacén.
  - _Requisitos: 4.1, 4.2, 4.3, 4.4. La fila de la bandeja no incluye `viaje_id` (DEC-121 #2)._

- [x] 8. Semilla de cobertura de estados y contrato de tipos
  - Confirmar que la semilla tiene al menos un viaje por valor de `EstadoViaje`.
  - Confirmar con el compilador que no hay literales de estado fuera del enum en `src/mocks/`. Buscar `COMPLETADO` y `VJ-R` con grep, para que no quede ninguno.
  - _Requisitos: 8.1, 8.2, 3.2._

- [x] 9. Ficha y expediente para todos los viajes
  - Todo viaje del almacén tiene `ficha` (null o capturada) y `expediente` propio.
  - Responder `200` con `{ viaje_id, tracto: null, contenedores: [], gps_ids: [] }` para la ficha sin captura (contrato tracer.40).
  - _Requisitos: 5.1, 5.2, 5.3._

- [x] 10. Reglas de negocio ya fijadas: escolta y estados terminales
  - Garantizar que todo viaje en `ASIGNADO` o posterior tiene escolta (semilla y transiciones; requisito 7.3).
  - Usar la lista de estados terminales de la tarea 2 en reservas y emergencias (requisitos 4.4 y 7.2).

- [~] 11. Validación
  - `pnpm typecheck` sin errores.
  - `pnpm build:mock` sin errores. Confirmar que el build sin modo mock no contiene `almacen-viajes` activo.
  - Recorrer los escenarios 1 a 7 de `requirements.md` en `pnpm dev:mock`, incluida una recarga entre pasos para validar la persistencia.
  - Confirmar con `reiniciarAlmacenMock()` que el mock vuelve a la semilla.
  - _Requisitos: todos._

## Trazabilidad de tareas a requisitos

| Requisito | Tareas  |
| --------- | ------- |
| 1         | 2, 4    |
| 2         | 5, 6    |
| 3         | 4, 8    |
| 4         | 1, 7    |
| 5         | 1, 4, 9 |
| 6         | 5       |
| 7         | 6, 10   |
| 8         | 2, 8    |
| 9         | 3       |
