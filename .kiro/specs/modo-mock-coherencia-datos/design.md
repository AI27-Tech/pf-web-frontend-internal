# Diseño: Modo mock con datos coherentes

|                 |                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Tipo**        | Feature                                                                                                                                 |
| **Flujo**       | Requirements-First. Fase 2 de 3 (diseño). Requisitos en `requirements.md`                                                               |
| **Repositorio** | `pf-web-frontend-internal`                                                                                                              |
| **Fuente**      | Tarjeta de Trello «Modo mock: datos coherentes entre listado, detalle, roster, emergencias y reportes» (Argos V1 - Sprint 5)            |
| **Estado**      | Borrador revisado con el contrato tracer.40. Sin preguntas de negocio abiertas; queda pendiente la verificación del build sin modo mock |

## Overview

Hoy el mock guarda los datos de viajes en varios lugares: `VIAJES_DEMO` y `DETALLES_VIAJES` en `src/mocks/data.ts`, `FICHAS_DEMO`, `INCIDENCIAS_DEMO`, `FILAS_REPORTE_DEMO` y el expediente fijo en el mismo archivo, `reservas` en `src/mocks/roster.ts`, y `viajesEmergencias`, `casos` y `VIAJE_DEMO` en `src/mocks/emergencias.ts`. Cada módulo lee y escribe su copia, por eso una transición no llega al listado y una emergencia no llega a Reacción.

Este diseño crea un **almacén único de viajes** (`src/mocks/almacen-viajes.ts`). Todos los módulos de mock leen y escriben en él, y las vistas se calculan a partir de ese estado. El almacén se persiste en `localStorage` solo en modo mock (decisión de la conversación de requisitos).

No cambia handlers públicos, rutas, formas de respuesta del `bff` ni tipos de `src/lib/contracts/`. Solo cambia de dónde sale el dato.

## Arquitectura

```
                  almacen-viajes.ts  (estado único + persistencia)
                 /       |        |        \          \
   data.ts (listado,   roster.ts  emergencias.ts  reportes/dashboard  expediente
   detalle, ficha,     (reservas) (casos, viaje   (derivados)          (derivado)
   incidencias, ETA)               -> emergencias)
                 \       |        |        /
                  handlers.ts (rutas MSW, sin cambios de forma)
```

### Forma del almacén

```ts
interface AlmacenViajes {
  version: number; // versión de la clave de localStorage
  viajes: Record<string, RegistroViaje>; // clave: id del viaje (VJ-10xx)
  casos: EmergenciaReaccion[]; // bandeja de Reacción
  siguienteId: { viaje: number; caso: number; incidencia: number; estadia: number };
}

interface RegistroViaje {
  resumen: ViajeResumen; // listado y filtro
  detalle: ViajeDetalle; // viaje, destinos, eta, fecha_hora, condiciones_activas
  ficha: FichaTecnica | null; // null = aún no capturada (vacía)
  expediente: { origen: string; destino: string };
  incidencias: Incidencia[]; // histórico; `condiciones_activas` se deriva de las abiertas
  escolta: string[]; // ids de unidad reservadas
  emergencias: EmergenciaViaje[]; // lista del viaje
  creado_en: string;
  cerrado_en: string | null; // para reportes
}
```

Reglas de forma:

- `resumen.estado` y `detalle.viaje.estado` son el mismo valor. Se guarda una sola vez en `detalle.viaje.estado`, y `resumen` se proyecta desde el registro. Así no puede divergir.
- `condiciones_activas` con `INCIDENCIA` se recalcula al abrir o resolver incidencias. No se edita a mano.
- `estado` se tipa con `EstadoViaje` del paquete de contratos. Un valor fuera del enum no compila, lo que cubre el requisito 8.2.

### Semilla

La semilla se construye a partir de `Object.values(EstadoViaje)`: un viaje por estado, con ids `VJ-10xx` secuenciales. Así el requisito 8.1 no depende de una lista escrita a mano. Los viajes actuales (`VJ-1001` a `VJ-1010`) se conservan como parte de la semilla, para no romper pruebas que hoy esperan esos ids.

Los reportes dejan de usar `VJ-R1` a `VJ-R4`. `FILAS_REPORTE_DEMO` se derivará del almacén con `creado_en` y `cerrado_en`. El estado `COMPLETADO` se elimina; el reporte solo puede contener valores de `EstadoViaje`.

### Persistencia

- Clave: `ai27.mock.almacen-viajes.v{version}`. Se lee al cargar el módulo.
- Guardado: después de cada mutación. Se escribe el almacén completo (son pocos datos).
- Versión distinta o JSON inválido: se descarta y se carga la semilla (requisito 9.3).
- Solo se activa cuando `import.meta.env.VITE_ENABLE_MOCKS === 'true'`, la misma condición que arranca MSW. En otro build, el almacén vive en memoria y no toca `localStorage` (requisito 9.5).
- No guarda tokens ni credenciales. Los tokens siguen en `tokenStore.ts`, que ya gestiona su propia persistencia (requisito 9.2).
- `reiniciarAlmacenMock()` borra la clave y vuelve a la semilla. Se expone para QA, por ejemplo con un botón en el pie de la pantalla de login, solo en modo mock. Requisito 9.4.

### Módulos y cambios

| Archivo                               | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Requisitos          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `src/mocks/almacen-viajes.ts` (nuevo) | Estado único, semilla, persistencia, operaciones de mutación (`transicionar`, `fijarEta`, `fijarFechaHora`, `reservarEscolta`, `abrirIncidencia`, `resolverIncidencia`, `activarEmergencia`) y selectores (`listarViajes`, `obtenerDetalle`, `obtenerFicha`, `obtenerExpediente`, `reporteViajes`, `reporteEstados`).                                                                                                                                                                             | 1, 2, 5, 6, 7, 8, 9 |
| `src/mocks/data.ts`                   | Se eliminan `VIAJES_DEMO`, `DETALLES_VIAJES`, `FICHAS_DEMO`, `INCIDENCIAS_DEMO`, `FILAS_REPORTE_DEMO`. Las funciones exportadas (`obtenerDetalleViajeMock`, `obtenerFichaMock`, `listarIncidenciasMock`, `abrirIncidenciaMock`, `resolverIncidenciaMock`, `descargarViajeMock`, `reporteViajesMock`, `reporteEstadosMock`, `transicionarViajeMock`, `fijarEtaMock`, `completarFechaHoraMock`, `asignarEscoltaMock`, `guardarFichaMock`) quedan como fachada sobre el almacén, con la misma firma. | 1, 2, 3, 5, 6       |
| `src/mocks/roster.ts`                 | `reservas` sale del módulo y se lee del almacén. `tieneReservaVigente` consulta el estado del viaje en el almacén. `reservarEscoltaMock` escribe en el almacén. Valida que la unidad no esté en otro viaje no terminal (requisito 7.1).                                                                                                                                                                                                                                                           | 2.2, 7              |
| `src/mocks/emergencias.ts`            | `casos` y `viajesEmergencias` salen del módulo. Activar una emergencia en `VJ-10xx` crea el caso en `casos` y la entrada en `emergencias` del viaje. `VIAJE_DEMO` y los ids `viaje-001` y `viaje-terminal` se eliminan.                                                                                                                                                                                                                                                                           | 4                   |
| `src/mocks/handlers.ts`               | Sin cambio de rutas ni de formas. Las cabeceras de prueba (`x-mock-*`) se conservan.                                                                                                                                                                                                                                                                                                                                                                                                              | Todos               |
| `src/mocks/browser.ts`                | Sin cambio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | -                   |

Los `reiniciar*Mock()` existentes en `roster.ts` y `administracion.ts` siguen funcionando. `reiniciarRosterMock()` debe reiniciar también la parte del almacén que le pertenece (reservas), para que las pruebas sigan aisladas.

## Reglas de consistencia

1. **Una sola escritura por mutación.** Cada operación (transicionar, fijar ETA, asignar escolta, abrir o resolver incidencia, activar emergencia) cambia el almacén en una sola llamada y lo persiste al final. Si la operación se rechaza, no cambia nada (requisito 2.4).
2. **Listado derivado.** El listado y el filtro leen `resumen` del almacén. No hay copia.
3. **Expediente derivado.** `descargarViajeMock` lee `expediente` del registro del viaje. Si el viaje no existe, devuelve `null`, igual que hoy.
4. **Ficha vacía, no 404.** Hoy `GET /viajes/{id}/ficha` responde `404 Ficha no encontrada` cuando `obtenerFichaMock` devuelve `null` (`src/mocks/handlers.ts`, línea 277). Ese es el síntoma que describe la tarjeta. El contrato confirma `200` con `{ viaje_id, tracto: null, contenedores: [], gps_ids: [] }`. El `404` es solo para un viaje inexistente (respuesta del equipo de contratos, tracer.40).
5. **Incidencia y condición.** Abrir una incidencia añade `INCIDENCIA` a `condiciones_activas`. Resolver la última incidencia abierta la quita (requisito 6). Solo puede haber una incidencia abierta por viaje (índice único `una_condicion_abierta_por_tipo` en `operacion`). El handler de cierre con cabecera `x-mock-cierre-incidencia-resuelta` sigue funcionando, porque opera sobre el mismo estado.
6. **Reserva y estado terminal.** Una reserva se libera cuando el viaje entra en un estado terminal. La lista de estados terminales es `CERRADO`, `CANCELADO`, `RECHAZADO_POR_AI27` y `RECHAZADO_POR_CLIENTE` (ADR 19; DEC-135 #5), fijada en una constante del almacén.
7. **Escolta en `ASIGNADO` o posterior.** Ninguna transición ni la semilla deja un viaje en `ASIGNADO` o después sin al menos una unidad reservada. Quitar la escolta sin reemplazarla no se permite, igual que en el backend.

## Manejo de errores

Los rechazos mantienen el comportamiento actual, con las formas de error que ya usa cada handler:

- Transición inválida: `409 transicion_no_permitida`.
- Cierre anticipado sin incidencia: `409 cierre_anticipado_requiere_incidencia`.
- Unidad ya reservada: `409` con el código que hoy declara el handler de asignación.
- Emergencia en viaje terminal: `409 viaje_en_estado_terminal` (el mock actual lo responde para `viaje-terminal`; el nuevo mock lo responderá por estado real del viaje).
- Viaje inexistente: `404 no_encontrado`.

## Brechas y verificaciones

Las brechas 1, 2, 4 y 5 quedaron resueltas con el contrato tracer.40 y la respuesta del equipo de contratos. La 3 cambió: `EmergenciaReaccion` no tiene `viaje_id` por diseño (DEC-121 #2), así que la bandeja no muestra el viaje de origen. Se conserva la lista como referencia:

1. **Ficha vacía (requisito 5.2).** Confirmar en `pf-pkg-contracts` (tag de `package.json`) si `GET /viajes/{id}/ficha` puede responder 200 con ficha vacía. Si solo declara 404 para "no capturada", el mock sigue el contrato y el requisito 5.2 se reescribe, no se inventa.
2. **Rechazo de emergencia en terminal (requisito 4.4).** Confirmar el código y estatus que declara el contrato de emergencias. Hoy el mock usa `409 viaje_en_estado_terminal`.
3. **Forma del caso de Reacción (resuelta).** `EmergenciaReaccion` no incluye `viaje_id` (DEC-121 #2). La bandeja muestra el caso sin viaje de origen. El detalle sí trae los datos del viaje que Reacción necesita (`ViajeEmergencia`), sin su id.
4. **Estados terminales (ADR 19).** Pregunta abierta en `requirements.md`.
5. **Escolta obligatoria (requisito 7.3, resuelta).** La máquina de estados la exige. El almacén debe respetarla en semilla y transiciones (regla 7).

## Decisiones

| Decisión                                                                 | Alternativa descartada              | Motivo                                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Un almacén único en un módulo nuevo                                      | Sincronizar copias entre módulos    | Las copias ya divergieron. Una sola fuente evita volver a divergir.                                                          |
| Persistir todo el almacén (viajes, fichas, incidencias, reservas, casos) | Persistir solo viajes               | Si los viajes persisten y las reservas no, una recarga deja escoltas huérfanas. Todo el estado de dominio del mock va junto. |
| Fachada con las mismas firmas en `data.ts`                               | Cambiar los imports de los handlers | Menos cambios en handlers y en pruebas existentes.                                                                           |
| Semilla derivada de `EstadoViaje`                                        | Lista de estados escrita a mano     | Un estado nuevo del enum aparece en el mock sin tocar datos.                                                                 |
| Persistencia activa solo con `VITE_ENABLE_MOCKS`                         | Persistencia en todos los builds    | Requisito 9.5. Evita leer o escribir `localStorage` en producción.                                                           |

Nota: la decisión de persistir casos de Reacción y reservas va más allá de la lista de la tarjeta. Si Product prefiere persistir solo viajes, se cambia la forma del almacén, sin afectar los requisitos.

## Correctness properties

Se verifican de forma manual, con el recorrido de `requirements.md` (escenarios 1 a 7), en el build de modo mock:

- Para cualquier viaje, el estado en listado, detalle y filtro es el mismo.
- Para cualquier emergencia activada desde un viaje, aparece en la bandeja de Reacción y su detalle abre.
- Ninguna unidad aparece reservada en dos viajes no terminales.
- Tras recargar en modo mock, el estado coincide con el de antes de la recarga. En otro build, no hay clave en `localStorage`.

No se agregan pruebas automatizadas, porque no se pidieron. Si se piden, deben cubrir estas propiedades.

## Componentes de UI

No hay cambios de UI, salvo el botón de restablecer del requisito 9.4. Se construye con `@ai27-tech/ui`. Si la librería no ofrece un botón para esa zona, se usa su componente de botón existente y no se crea uno local. Verificar en `node_modules/@ai27-tech/ui/dist` antes de implementar.
