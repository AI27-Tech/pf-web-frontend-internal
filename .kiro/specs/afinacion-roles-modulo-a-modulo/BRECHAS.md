# Brechas y pendientes: afinación de roles módulo a módulo

Fuentes: contexto `origin/main` `0c48d67`; contrato tag `v0.1.0-tracer.46` (último publicado, verificado contra el remoto); pin actual del panel `tracer.40`. No se escribió nada en `ai27-platform-context` ni en `pf-pkg-contracts`.

Las 11 preguntas del brief al Lead quedaron respondidas. Las decisiones están en `requirements.md`, sección "Decisiones del Lead". Regla acordada: **el panel sigue la tabla de `requirements.md` y no espera el `403`**.

## Pendientes de backend y contrato (tareas del Lead)

El panel ya muestra o esconde según la tabla. Mientras estos cambios no lleguen, puede recibir `403` o `404` y los trata con Requirement T2.

| #    | Pendiente                                                                                                                                                                   | Dueño                   | Lo que ve el panel mientras tanto                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| BE-1 | Devolver `403` al Jefe Operativo en avanzar el viaje (salvo cerrar), `fijarEta`, estadías y escribir bitácora                                                               | `operacion`             | Esas acciones ya están ocultas al JO                                                     |
| BE-2 | Documentar en el contrato el rol por operación                                                                                                                              | contrato (próxima ola)  | Sin efecto                                                                               |
| BE-3 | Descripción de `listarClientes`: el Administrador lo puede leer                                                                                                             | contrato                | ADM carga clientes al crear viaje                                                        |
| BE-4 | `obtenerAsignacion`: "salvo `ejecutivo`, `reaccion` y `cotizacion`"                                                                                                         | contrato                | `cotizacion` no abre la ficha                                                            |
| BE-5 | `activarEmergenciaInterno` admite al Administrador (corrige DEC-045 #9)                                                                                                     | `mensajeria` y contrato | ADM ve el botón y puede recibir `403`                                                    |
| BE-6 | La bandeja de chat del viaje admite al Administrador, que escribe como el Ejecutivo                                                                                         | `mensajeria` y contrato | ADM ve Conversaciones; la bandeja responde `404` y la UI muestra "bandeja no disponible" |
| BE-7 | Catálogos: ADM y COO leen y escriben todo, vehículos y custodios incluidos (enmienda DEC-142 #6); JO solo lee; el resto no entra. Hoy `catalogos` solo deja escribir al ADM | `catalogos`             | La UI muestra la escritura al COO y puede recibir `403`                                  |

## Preguntas abiertas

- **Q-3 (usuario). Rama. RESUELTA.** El usuario confirmó que `feature/refinacion-ui-roles` es la rama de trabajo.
- **Q-4 (usuario). Orden.** Propuesta: M0 y M1 primero, porque bloquean a los demás.
- **P-A (usuario). Página de inicio del Administrador. RESUELTA.** Aterriza en el panel del Jefe Operativo (`/jefe-operativo/panel`), como hoy. El rol ya tiene `panel.jefeOperativo`.
- **PM-008.** Override conversacional de Supervisor y Coordinador: sigue abierto. No se crean botones.

## Nota sobre fuentes locales

- Contexto local en `df42d43` (40 commits atrás, con cambios locales en `scripts/demo/demo.sh` y `scripts/gate-g2/entorno.sh`). La ruta `.kiro/steering/decision-log.md` ya no existe en `origin/main` (ahora `argos-context/decision-log.md`). Se lee con `git show origin/main:...`; no se hace pull sin que el usuario lo pida.
- Checkout de contratos en `feat/ficha-tecnica-e-historico-tracer21` (`tracer.37`). Se lee con `git show v0.1.0-tracer.46:...`.

## Sin brechas de UI conocidas

Los módulos usan componentes existentes de `@ai27-tech/ui` (`EmptyState`, `Alert`, `Toast`, `Badge`, `Tabs`, `Table`, `FilterTable`, `Section`, `DescriptionList`). Si el paso 2 de algún ciclo encuentra una falta, se registra aquí con el formato de la sección 7 de `ai27-tech-library-first`.

## Hallazgos de implementación

- **M10 (conversaciones).** `useNombresCliente` llama `listarClientes` con la sesión del Ejecutivo, pero el contrato describe esa operación solo para `jefe_operativo` (y ADM por BE-3). El BFF real probablemente responde `403` y la bandeja caería a mostrar ids. El mock de `/clientes` deja pasar tokens no decodificables y aplica `clientes.listar` a los decodificables. Resolver en M10: o el BFF agrega el nombre del cliente a la bandeja, o se pide ampliar `listarClientes`.
