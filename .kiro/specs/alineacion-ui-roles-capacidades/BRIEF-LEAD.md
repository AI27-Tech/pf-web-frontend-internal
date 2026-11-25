# Brief: Alineación de roles en el panel interno (seguimiento a DEC-149)

Para: Fabricio Fuentes (Lead) · De: Angel Arredondo · Fecha: 2026-11-17

## Resumen

Con tu respuesta del 12 y la nota de "mis clientes" armé el spec para que el panel interno muestre y permita solo lo que cada rol puede hacer. Está en `pf-web-frontend-internal/.kiro/specs/alineacion-ui-roles-capacidades/` (requirements, design, tasks y brechas). Reemplaza al spec de la rama `feature/alineacion-ui-roles-capacidades`. Retiré PM-001, PM-002, PM-003, PM-006 y PM-007 como indicaste. Todavía no hay código.

## Qué encontré en el panel hoy

- **Reglas de rol dispersas.** Cada módulo tiene su propia lista de roles (roster, monitoreo, cierre, emergencias, navegación). No hay una tabla única.
- **Acciones sin revisión de rol.** En el detalle del viaje, aprobar, rechazar, asignar escolta, avance, ETA y fecha se muestran a cualquier rol interno. Solo "cerrar" revisa rol.
- **El Administrador queda fuera (C4).** Crear viaje solo deja pasar a `jefe_operativo`, y la ficha técnica y su pestaña solo a `monitorista`. El Jefe Operativo no ve la ficha.
- **Sin guarda de rol en rutas.** `/_private` solo revisa que haya sesión. Cada pantalla se protege sola, y varias no lo hacen.
- **`/roster` y el editor de alcance de Administración usan "mis unidades"** (`fijarUnidadesSujeto`), ya deprecado en `tracer.41`.
- **El detalle trata el `403` como "rol o alcance".** Con `tracer.41` el alcance responde `404`, así que ese texto queda incorrecto.

## Qué propone el spec

1. **Una sola tabla de capacidades** (`lib/permisos`) con la tabla rol × acción de DEC-149 #8. Navegación, rutas y acciones la consultan. Una prueba recorre las transiciones de la máquina de estados y falla si alguna queda abierta a todos los roles.
2. **Navegación y rutas** con un solo modelo "visible solo para estos roles" (C8) y un estado "sin permiso" que conserva la sesión.
3. **Acciones del viaje** filtradas por estado y por rol. El Administrador entra a crear viaje y a la ficha. El Jefe Operativo ve la ficha en solo lectura.
4. **`403` y `404` separados.** `403` es "sin permiso"; `404` es "viaje no encontrado".
5. **Bandeja** con columnas Cliente y Escolta (`ViajeResumen.cliente` y `unidades`). El filtro de estado del Monitorista empieza en `APROBADO`. No se filtra nada en el navegador.
6. **`/roster`:** "mis clientes" con `fijarClientesSujeto`, solo clientes activos, y el campo opcional "cliente al que sirve" en la unidad.
7. **Mocks** con `403` por rol, filtro por "mis clientes" y `404` fuera de alcance.

## Fases

| Fase                          | Contenido                                                       | Depende de                                       |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| 1 a 4                         | Política, navegación y rutas, acciones del viaje, `403` y `404` | Nada                                             |
| 5 y 6                         | Bandeja con cliente y escolta; roster "mis clientes"            | Pin a `tracer.41`                                |
| 7 y 8                         | Mocks, validación final                                         | Fases anteriores                                 |
| Extremo a extremo del alcance | Verificación contra el backend real                             | PR de `identidad`, `operacion` y `bff` con DT-07 |

## Estado de fuentes

- Contexto: commit `df42d43`, al día con `origin/main`.
- Contrato: el frontend fija `tracer.40`; el último publicado es `tracer.41`. Leí todo desde el tag, no desde el checkout local (que está en una rama feature).
- **DEC-149 no aparece en `decision-log.md`.** Solo está en las notas del brief. El spec la trata como "decidida, pendiente de registro".

## Lo que necesito de ti

**Decisiones**

1. **P-1. Supervisor y Coordinador.** La tabla de DEC-149 no los nombra. Supuse que tienen las facultades del Monitorista (E4-HU-018 v2) y que no aprueban, asignan ni cierran. ¿Se confirma?
2. **P-2. Otras facultades de Supervisor y Coordinador** (override, corrección de incidencias). Solo conservé la corrección de incidencias que ya existe, y agregué al Administrador. ¿Hay alguna más que deba verse?
3. **P-3. Catálogos y Reportes.** No están en la tabla. Dejé las reglas actuales: Catálogos todos menos `reaccion`; Reportes todos menos `reaccion`, `jefe_operativo` y `ejecutivo`. ¿Se mantienen?
4. **P-4. `ejecutivo` y `reaccion`.** Asumí que conservan solo conversaciones y emergencias. ¿Es correcto?
5. **Lista vacía del Monitorista (B-04).** ¿Puede un Monitorista leer su propio alcance? Sin eso, la pantalla no distingue "sin clientes asignados" de "sin viajes" y muestra un mensaje genérico.
6. **Registro de DEC-149** en `decision-log.md`. El repo de contexto es compartido, así que no lo escribo yo.

**Confirmaciones**

7. **Subir el pin a `@ai27-tech/contracts@0.1.0-tracer.41`.** Lo hago cuando lo confirmes.
8. **Fecha estimada de los PR de backend** (DT-07). Hasta entonces el alcance solo se prueba con mocks.
9. **Rama:** ¿trabajo el spec en `feature/alineacion-ui-roles-capacidades` o abro una nueva desde `main`?

## Riesgos

- Si el backend aplica el alcance distinto a lo que emulan los mocks, habrá ajustes tras la integración.
- La política toca muchos archivos. Lo mitigo con adaptadores delgados sobre las funciones actuales y una migración por área.
- Pendientes tuyos que no bloquean: cliente de la unidad obligatorio o no, motivo del préstamo, y si al cambiar el cliente de una unidad cambia de inmediato el alcance de los viajes en curso.

## Fuera de alcance

Backend, contrato y DT-07 (tuyos); V2 (cotización y rol `cotizacion`); reasignación de escolta; cambios a la máquina de estados.
