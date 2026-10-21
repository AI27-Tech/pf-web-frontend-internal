# CHANGELOG

Todos los cambios relevantes del proyecto se documentan en este archivo.
Las entradas se escriben en español, con fecha en formato `yyyy:mm:dd` y hora en formato `hora:minuto`.
Las entradas más recientes se colocan al inicio.

## 2026:10:21 13:05

**Resumen:** Se implementó **E8-T8** (detalle del viaje: avance y ETA manual) en el panel interno: nueva pantalla `/_private/viajes/$id` que lee el detalle con estado canónico, deriva las acciones de transición de la máquina de estados generada (`@ai27-tech/contracts/estados`), permite registrar transiciones (con captura de causa obligatoria en rechazos/cancelación, DEC-020 #2) y fijar el ETA a mano marcado "estimado, no en vivo" (ADR 20 / DEC-007). Se migró la capa de contrato a `@ai27-tech/contracts@0.1.0-tracer.13`, que ya publica los endpoints internos del viaje (`obtenerViajeInterno`, `transicionarViaje`, `fijarEta`): los tipos del detalle pasan a derivarse del OpenAPI generado (`@ai27-tech/contracts/openapi/bff`), retirando la réplica manual. El 409 se clasifica por el `codigo` real del cuerpo (`transicion_no_permitida` / `viaje_en_estado_terminal`), no por el endpoint. La fila de la bandeja (E8-T7) se hizo clickeable para navegar al detalle, y la ruta `viajes.tsx` pasó a `viajes/index.tsx` para alojar la ruta hija `$id`. `typecheck`, `lint` y `test` (17 archivos, 85 pruebas) en verde; `build` en verde.

**Cambios:**

- `src/lib/contracts/viajeDetalle.ts`: los tipos `ViajeDetalle`, `ViajeInterno`, `CondicionAbierta`, `TransicionEntrada`, `EtaEntrada` pasan a ser alias de `components['schemas']` del OpenAPI generado (tracer.13); se eliminó la réplica manual. Reexporta `EstadoViaje`/`TRANSICIONES_VIAJE`/`puedeTransicionar`/`esTerminal` del contrato de estados.
- `src/lib/api/viajeDetalle.ts` (nuevo): wrapper `obtenerDetalle`/`transicionar`/`fijarEta`; clasifica el 409 por el `codigo` real del cuerpo mediante `clasificarConflicto`, con valor de respaldo solo si el cuerpo no trae código interpretable. Expone `ErrorTransicion`.
- `src/lib/api/client.ts`: el cliente lee el cuerpo de las respuestas de error y extrae el `codigo` (`leerCodigoError`), tolerando las formas `{codigo}` y `{error:{codigo}}`.
- `src/lib/api/errors.ts`: `ApiError` transporta ahora un `codigo` opcional de negocio.
- `src/features/viajes/detalle/accionesTransicion.ts` (nuevo): `accionesDesde(estado)` filtra `TRANSICIONES_VIAJE` por origen, excluye `PATRULLA_EN_CAMINO` y devuelve vacío en terminales.
- `src/features/viajes/detalle/causaTransicion.ts` (nuevo): `requiereCausa(destino)` marca rechazos y cancelación como destinos que exigen causa (el contrato no publica ese metadato por arista).
- `src/features/viajes/detalle/useDetalleViaje.ts` (nuevo): `useQuery` de lectura + `useMutation` de transición/ETA con invalidación; expone contrato plano a la presentación y detecta 401.
- `src/features/viajes/detalle/DetalleViaje.tsx` (nuevo): presentación con cabecera (estado + condiciones separadas, P15), paradas con fase del bucle derivada del estado canónico (Req 5.1), ETA marcado "no en vivo" y ofrecido solo si el viaje no es terminal (Req 4.1), acciones, modales de ETA y de causa, toasts para carrera/éxito/error, delegación de 401 al AppShell y estados de carga/error con reintento.
- `src/features/viajes/detalle/etaForm.tsx` y `causaForm.tsx` (nuevos): formularios de captura de ETA (datetime) y de causa obligatoria, compuestos solo con `@ai27-tech/ui`.
- `src/routes/_private/viajes/$id.tsx` (nuevo): ruta de detalle `createFileRoute('/_private/viajes/$id')`.
- `src/routes/_private/viajes.tsx` → `src/routes/_private/viajes/index.tsx`: la bandeja pasa a ruta índice para alojar la ruta hija `$id`.
- `src/features/viajes/filaViaje.tsx`: `columnasViaje` pasa a `obtenerColumnasViaje(navigate)`; la celda del id es un botón que navega al detalle. `BandejaViajes.tsx` consume la factory con `useNavigate`.
- `src/mocks/{data,handlers}.ts`: catálogo de detalles por id + handlers de detalle, transición (409 `transicion_no_permitida`) y ETA (409 `viaje_en_estado_terminal`), cumpliendo la forma generada.
- `package.json` / `pnpm-workspace.yaml` / `pnpm-lock.yaml`: `@ai27-tech/contracts` de `0.1.0-tracer.11` a `0.1.0-tracer.13`.
- `tests/viajes/{viajeDetalleApi,causaTransicion,accionesTransicion.property,DetalleViaje}.test.{ts,tsx}`: wrapper de API ejercido contra un servidor MSW (clasificación de 409 por código real, incluido el caso cruzado), causa requerida, property tests de acciones y smoke de UI.

**Archivos modificados:**

- `src/lib/contracts/viajeDetalle.ts` · `src/lib/api/viajeDetalle.ts` (nuevo) · `src/lib/api/client.ts` · `src/lib/api/errors.ts`
- `src/features/viajes/detalle/{accionesTransicion,causaTransicion,useDetalleViaje}.ts` (nuevos) · `src/features/viajes/detalle/{DetalleViaje,etaForm,causaForm}.tsx` (nuevos)
- `src/routes/_private/viajes/$id.tsx` (nuevo) · `src/routes/_private/viajes/index.tsx` (renombrado desde `viajes.tsx`)
- `src/features/viajes/filaViaje.tsx` · `src/features/viajes/BandejaViajes.tsx` · `src/features/viajes/viajeVista.ts`
- `src/mocks/data.ts` · `src/mocks/handlers.ts`
- `package.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml`
- `tests/viajes/{viajeDetalleApi,causaTransicion,accionesTransicion.property,DetalleViaje}.test.{ts,tsx}`
- `.kiro/specs/e8-t8-detalle-viaje-avance-eta/{requirements,design,tasks}.md`

**Señalado (no se tocó):** el contrato no entrega estado por parada (`ViajeInterno.destinos` es `{nombre, numero_envio?}[]`), así que el bucle multi-parada (Req 5) muestra la fase global derivada del estado canónico, no un marcador arribado/descargado por destino; queda como brecha documentada hasta que el `bff` publique estado por parada. `numero_envio` es opcional en el contrato generado: la UI oculta la línea "Envío:" y usa un `key` de respaldo cuando falta. No se corrió `pnpm format:check`, `pnpm test:e2e` ni la verificación manual en `dev:mock` en esta sesión.

## 2026:10:20 17:20

**Resumen:** Se implementó **E8-T7** (bandeja operativa de viajes) en el panel interno: la ruta `/_private/viajes` deja de ser un stub y pasa a listar los viajes del alcance del usuario pidiéndolos al `bff` (operación `listarViajes`, `GET /api/v1/viajes`), mostrando exactamente lo que el `bff` autoriza y entrega (P10) y separando el estado de progreso de las condiciones ortogonales (P15). El listado se consume contra el contrato generado `@ai27-tech/contracts` (`ViajeResumen = { id, estado, origen }`; `PaginaViajesResumen = { items, cursor_siguiente }`) y toda la interfaz usa componentes de `@ai27-tech/ui`: `FilterBar` (filtro por estado con chips y limpiar), `Table` (filas con estado literal y columna de condiciones), `Pagination`, `Badge` y `Card`. Para disponer de `FilterBar` se subió la librería de `0.2.0-beta.1` a `0.2.0-beta.6` (cambio aditivo de exports; nada de lo que el repo ya usaba cambió). Se montó TanStack Query en `providers.tsx` (`retry: false`). `typecheck`, `lint` y `test` (12 archivos, 50 pruebas: 35 previas + 15 de E8-T7, incluidas 5 Correctness Properties con `fast-check` a 100+ iteraciones) en verde; `build` en verde.

**Cambios:**

- `src/lib/contracts/viajes.ts` (nuevo): reexporta del contrato los tipos de wire (`ViajeResumen`, `PaginaViajesResumen`) y los enums de dominio (`EstadoViaje`, `CondicionViaje`, `ESTADOS_VIAJE`). No se escribe ninguna forma de wire a mano.
- `src/lib/api/viajes.ts` (nuevo): wrapper de dominio `listarViajes(params, accessToken)` + `construirQueryString` pura; delega en `client.ts` (features/routes nunca llaman al cliente directo).
- `src/features/viajes/viajeVista.ts` (nuevo): modelo de vista y `adaptarItem`/`adaptarPagina`; preserva el estado literal del `bff` y aísla la brecha de condiciones (`condiciones_activas?`).
- `src/features/viajes/bandejaReducer.ts` (nuevo): reducer puro del estado de vista. Modela la paginación por cursor sobre un control numérico con `{ pagina, cursores }` (pila de cursores por página) y las acciones `cambiarFiltro` (reinicia a página 1) e `irAPagina` (avanza apilando el `cursor_siguiente`, retrocede recortando la pila).
- `src/features/viajes/filaViaje.tsx` (nuevo): `columnasViaje` con `Table`/`Column` de la librería; estado literal con `data-testid="estado"` y condiciones en columna separada con `Badge` por condición (`VARIANTE_CONDICION` cubre el enum). Columnas no sortables (el orden lo fija el `bff`).
- `src/features/viajes/useBandejaViajes.ts` (nuevo): conecta el reducer con `useQuery` (`queryKey: ['viajes', params]`, `retry: false`); expone `filas`, `cursorSiguiente`, `pagina`, estados de UI, `reintentar`, `cambiarFiltro` e `irAPagina`; detecta 401 vía `ApiError.kind === 'noAutorizado'`.
- `src/features/viajes/BandejaViajes.tsx` (nuevo): presentación. `FilterBar` + `Table` + `Pagination` de la librería, los cuatro estados de UI (carga, vacío con filtro visible, error con reintento, 401 delegado al flujo de sesión del AppShell) y el error compuesto con `Card`/`CardBody`/`CardFooter`.
- `src/routes/_private/viajes.tsx`: se reemplaza el stub por `createFileRoute('/_private/viajes')({ component: BandejaViajes })`.
- `src/app/providers.tsx`: se monta `QueryClientProvider` (sin reintentos, sin refetch en focus) envolviendo `SessionProvider`.
- `src/styles/globals.css`: `color-scheme: dark` se engancha a `[data-theme='dark']` (antes solo a `.dark`, que no se ponía), para que los popups nativos sigan el tema oscuro.
- `src/mocks/{data,handlers}.ts`: catálogo de viajes demo + handler `GET /viajes` del backend simulado (filtra por `estado`, pagina por `cursor`), para que la bandeja tenga datos en modo mock.
- `package.json`: `@ai27-tech/ui` sube a `0.2.0-beta.6`; se agrega `fast-check` como devDependency (PBT, exigido por el diseño del spec).
- `tests/viajes/*` (nuevos): property tests (Properties 1–5) y pruebas de ejemplo de UI con MSW (cuatro estados, filtro y paginación).

**Archivos modificados:**

- `src/lib/contracts/viajes.ts` · `src/lib/api/viajes.ts` (nuevos)
- `src/features/viajes/{viajeVista,bandejaReducer,useBandejaViajes}.ts` · `src/features/viajes/{filaViaje,BandejaViajes}.tsx` (nuevos)
- `src/routes/_private/viajes.tsx` · `src/app/providers.tsx` · `src/styles/globals.css`
- `src/mocks/data.ts` · `src/mocks/handlers.ts`
- `package.json` · `pnpm-lock.yaml`
- `tests/viajes/{viajeVista.property,bandejaReducer.property,filaViaje.property,useBandejaViajes.property}.test.{ts,tsx}` · `tests/viajes/{viajesApi,BandejaViajes}.test.{ts,tsx}` · `tests/viajes/mswServer.ts` (nuevos)
- `.kiro/specs/e8-t7-bandeja-viajes/{requirements,design,tasks}.md`

**Señalado (no se tocó):** dos brechas de contrato quedan abiertas y documentadas, no se inventan en el frontend. (1) `ViajeResumen` del `bff` no entrega condiciones activas por ítem, así que la columna "Condiciones" va vacía hasta que el contrato las publique (punto de integración aislado en `viajeVista.ts`). (2) El `bff` no expone su tamaño de página; el `Pagination` numérico de la librería usa un espejo `TAMANO_PAGINA` solo para posicionar el control, mientras que la verdad de "hay más" la da `cursor_siguiente`. El filtro por cliente queda fuera de V1 (el contrato solo admite `estado`). La librería no ofrece paginación por cursor pura: se mapea `Pagination` numérico con una pila de cursores. No se corrió `pnpm format:check`, `pnpm test:e2e` ni la verificación manual en `dev:mock` en esta sesión; nada está commiteado todavía.

## 2026:10:20 13:21

**Resumen:** Se implementó **E8-T4** (shell del panel) en el panel interno: se reemplazó el `_private.tsx` que era un `<Outlet />` desnudo por un `AppShell` con sidebar de navegación persistente y topbar con la identidad de sesión, compuesto desde el rol del token (DEC-053). La navegación lista las seis áreas de la tarea (Viajes · Conversaciones · Emergencias · Catálogos · Reportes · Administración) y, como afordancia de UI, oculta Reportes y Catálogos solo al rol `reaccion` (DEC-022 #9); la negación real de acceso sigue siendo del `bff`. El inicio por rol aterriza a cada usuario en su pantalla (jefe_operativo/administrador → panel; monitorista/supervisor/coordinador → dashboard de monitoreo; ejecutivo → conversaciones; reaccion → emergencias). El cierre de sesión se movió al pie del sidebar, arriba del botón de contraer de la librería. Todos los estilos usan `@ai27-tech/ui` (componentes `Sidebar`, `SidebarItem`, `Card`, `Button`) y sus variables CSS; el colapso del sidebar es el nativo de la librería. Se agregaron pantallas stub para las seis áreas, de modo que ninguna pestaña cae en Not Found. `typecheck` y `test` (6 archivos, 23 pruebas: 13 previas + 10 nuevas de E8-T4) en verde; `build:mock` en verde.

**Cambios:**

- `src/routes/_private.tsx`: el layout privado envuelve el `<Outlet />` con `AppShell`. Se extrajo la decisión de la guarda a `resolverGuardaPrivada(haySesion, destino)` (pura y probable); `beforeLoad` la consume y redirige a `/login` conservando el destino en `?redirect=`.
- `src/components/layout/AppShell.tsx` (nuevo): estructura sidebar + topbar + área de contenido; mantiene el estado de colapso y ejecuta el cierre de sesión (`logout()` del contexto + navegación a `/login`).
- `src/components/layout/NavigationSidebar.tsx` (nuevo): sidebar compuesto por rol con `Sidebar`/`SidebarGroup`/`SidebarItem` de la librería; marca en el header que se adapta al colapso; `SidebarItem` navega con `Link` de TanStack Router y marca la ruta activa; item de cierre de sesión empujado al pie.
- `src/components/layout/navigationConfig.ts` (nuevo): tipos, catálogo `NAV_ITEMS` (las seis áreas con el modelo `ocultarPara`) y `entradasVisiblesPara(rol)`. Separado del componente para no romper el fast refresh y para poder probarlo aislado.
- `src/components/layout/SessionTopbar.tsx` (nuevo): topbar adelgazada (alto `3.5rem`, alineada al header del sidebar) que muestra el `id` del sujeto y el rol legible.
- `src/components/layout/StubPage.tsx` (nuevo): página stub reutilizable para áreas aún no implementadas, con estilos de la librería.
- `src/components/layout/index.ts` (nuevo): barrel de la capa de layout.
- `src/lib/hooks/useInitialRoute.ts` (nuevo): `getInitialRouteForRole(rol)` con el mapeo rol → ruta inicial.
- `src/routes/_private/index.tsx`: la ruta índice redirige al inicio del rol según `getInitialRouteForRole`.
- `src/routes/_private/{viajes,conversaciones,emergencias,catalogos,reportes,administracion}.tsx` y `jefe-operativo/panel.tsx`, `monitoreo/dashboard.tsx` (nuevos): pantallas stub de las áreas, con sus layouts `jefe-operativo.tsx` y `monitoreo.tsx`.
- `tests/layout/navigation-visibility.test.ts`, `initial-route.test.ts`, `private-guard.test.ts` (nuevos): las tres pruebas de la definición de terminado (Reacción no ve Reportes/Catálogos; inicio por rol; la guarda redirige conservando `?redirect=`).

**Archivos modificados:**

- `src/routes/_private.tsx`
- `src/components/layout/{AppShell,NavigationSidebar,SessionTopbar,StubPage,index}.tsx` · `src/components/layout/navigationConfig.ts` (nuevos)
- `src/lib/hooks/useInitialRoute.ts` (nuevo)
- `src/routes/_private/index.tsx`
- `src/routes/_private/{viajes,conversaciones,emergencias,catalogos,reportes,administracion,jefe-operativo,monitoreo}.tsx` (nuevos)
- `src/routes/_private/jefe-operativo/panel.tsx` · `src/routes/_private/monitoreo/dashboard.tsx` (nuevos)
- `tests/layout/{navigation-visibility,initial-route,private-guard}.test.ts` (nuevos)

**Señalado (no se tocó):** la tarea pide mostrar el **alcance efectivo** ("cuántos clientes") en la identidad de sesión; no se muestra porque ese dato NO viaja en el token (DEC-053: el alcance lo resuelve el servidor) y no hay superficie del `bff` que lo exponga hoy: queda como brecha, no se inventa. El estado "sesión hidratando" no se maneja de forma explícita porque la hidratación desde el TokenStore es síncrona. No se corrió `pnpm lint`, `pnpm format:check`, `pnpm test:e2e` ni la verificación manual en `dev:mock` en esta sesión.

## 2026:10:20 12:30

**Resumen:** Se implementó **E8-T3** (consumo del contrato generado) en el panel interno: la sesión y los roles pasan a los tipos generados de `@ai27-tech/contracts` (`v0.1.0-tracer.11`), retirando los tipos de wire escritos a mano. El login envía `{usuario, contrasena}` y la respuesta se tipa desde `Sesion` del contrato; `rol` y `audiencia` dejan de leerse del cuerpo (que ya no los trae) y se derivan de los claims del `access_token`; se conserva `sesion_id` para el corte de revocación (E0-T4/ADR 26). El enum de roles pasa a los 8 identificadores de DEC-053 (se retira `RolInterno` hardcodeado). Se retira el mecanismo de generación local (`gen:contracts`, `openapi-typescript`, `CONTRACTS_DIR`), porque el paquete ya publica los tipos (ADR 25). `typecheck`, `lint` y `test` (3 archivos, 13 pruebas) en verde; `test:e2e` (1 spec) y `build:mock` en verde.

**Cambios:**

- `package.json`: se agrega `@ai27-tech/contracts@0.1.0-tracer.11` (versión exacta, ADR 25); se retiran el script `gen:contracts` y la devDependency `openapi-typescript`.
- `.env.example`: se retira la variable `CONTRACTS_DIR` (generación local, ya sin uso).
- `src/lib/contracts/jwt.ts` (nuevo): decodificación de los claims del JWT (`ClaimsAi27`, `decodificarClaims`, `rolValido`, `audienciaDeRol`), validando el rol con `esRol` del contrato. Brecha marcada con `TODO(contracts)`: los nombres de claim son los documentados en prosa, por confirmar contra un token real del IdP (ADR 32 §4).
- `src/lib/contracts/sesion.ts`: tipa `SesionWire`/`CredencialesEntrada`/`RefrescoEntrada` desde el contrato; `parseSesion` deriva `usuario`/`rol`/`audiencia` de los claims y conserva `sesionId`; lanza `SesionInvalidaError` si el token no trae un rol válido.
- `src/lib/contracts/index.ts`: el barrel reexporta `Rol`/`esRol`/`esInterno` del contrato y lo nuevo de sesión/jwt; salen los tipos a mano (`RolInterno`, `CredentialsWire`, `UsuarioWire`).
- `src/lib/api/sesion.ts`, `src/features/sesion/{LoginForm,useLogin}.tsx`, `src/context/SessionContext.tsx`: login con `{usuario, contrasena}`; refresh tipado con `RefrescoEntrada`; manejo de `refresh_token` opcional.
- `src/routes/_private/index.tsx`: el placeholder muestra el `id` del sujeto (el contrato no trae `name`/`email`).
- `src/mocks/{data,handlers}.ts`: `createSessionWire` devuelve la forma de `Sesion` del contrato con un `access_token` cuyos claims son decodificables; el handler de login valida `{usuario, contrasena}`.
- `tests/contracts/sesion.test.ts` (nuevo): contract test que ata el mock de sesión al tipo del tracer (rompe el typecheck si el contrato cambia; rompe el test si el mock se desvía).

**Archivos modificados:**

- `package.json` · `.env.example` · `pnpm-workspace.yaml` · `pnpm-lock.yaml`
- `src/lib/contracts/{index,sesion}.ts` · `src/lib/contracts/jwt.ts` (nuevo) · `src/lib/api/sesion.ts`
- `src/features/sesion/{LoginForm,useLogin}.tsx` · `src/context/SessionContext.tsx` · `src/routes/_private/index.tsx`
- `src/mocks/{data,handlers}.ts` · `tests/contracts/sesion.test.ts` (nuevo)
- `.kiro/specs/e8-t3-contrato-generado/tasks.md`

**Señalado (no se tocó):** los nombres de los claims del JWT son una suposición documentada en prosa, no un esquema del contrato; queda `TODO(contracts)` aislado en `jwt.ts`. El contrato no devuelve `name`/`email` del operador en ningún lado; una pantalla futura que los necesite requerirá una superficie que hoy no existe. No se corrió `pnpm format:check` ni la verificación manual en `dev:mock` en esta sesión.

## 2026:10:19 17:10

**Resumen:** Se implementó **E8-T1** (CI y línea base de calidad) en el panel interno: workflow de CI que corre lint, typecheck, pruebas unitarias y e2e en cada PR y en cada push a las tres ramas del flujo (`pf-wfi-m/d/q`), más los dos workflows de promoción `d → q` y `q → m` del patrón de la plataforma (merge manual). Era el repo con más deuda de los tres: no tenía ninguna prueba real (solo `tests/setup.ts`), el `test:e2e` estaba declarado pero fallaba por falta de configuración, y el `.husky/pre-commit` no estaba versionado. Se cubrió todo eso. `lint`, `typecheck`, `test` (6 pruebas en 2 archivos) y `test:e2e` (1 spec) en verde.

**Cambios:**

- `.github/workflows/ci.yml` (nuevo): disparo en `push` a `pf-wfi-m/d/q` y en `pull_request`. Job `calidad` (install → generar rutas con `vite build --mode mock` → lint → typecheck → test) y job `e2e` (install → `playwright install --with-deps chromium` → `test:e2e`). Autenticación a GitHub Packages (scope privado `@ai27-tech`) vía `NODE_AUTH_TOKEN` con el secreto `GH_PAT`.
- `.github/workflows/promotion-pr-dq.yml` y `.github/workflows/promotion-pr-qm.yml` (nuevos): mantienen al día un PR `*-d → *-q` y otro `*-q → *-m`; derivan la rama destino del sufijo; no fusionan.
- `tests/utils.test.ts` (nuevo): pruebas de `cn()` (unir clases, descartar falsy, cadena vacía).
- `tests/Button.test.tsx` (nuevo): render del `Button` interno, `type="button"` por defecto y `onClick`.
- `playwright.config.ts` (nuevo): webServer con `vite build --mode mock` + `preview`, puerto 4174, retries en CI.
- `e2e/login.spec.ts` (nuevo): verifica que la pantalla de login renderiza contra el bundle mock.
- `.husky/pre-commit` (versionado): `lint-staged` + `tsc --build --force`, alineado con el portal cliente.
- `.kiro/specs/e8-t1-ci-calidad/*`: spec del repo con requisitos, diseño y tareas.

**Archivos modificados:**

- `.github/workflows/ci.yml` · `.github/workflows/promotion-pr-dq.yml` · `.github/workflows/promotion-pr-qm.yml`
- `tests/utils.test.ts` · `tests/Button.test.tsx`
- `playwright.config.ts` · `e2e/login.spec.ts`
- `.husky/pre-commit`
- `.kiro/specs/e8-t1-ci-calidad/requirements.md` · `design.md` · `tasks.md`

**Señalado (no se tocó):** la prueba e2e es mínima (solo login), porque el panel más allá del login es placeholder en V1 (AppShell y navegación llegan en E8-T4 y siguientes); no se prueban pantallas que aún no existen. El CI necesita el secreto de repo `GH_PAT` (PAT con `read:packages`) para instalar `@ai27-tech/ui`; sin él, el `install` falla con 403. La activación de branch protection queda pendiente.

## 2026:09:11 13:50

**Resumen:** Se eliminó un overlay de color redundante en el panel de marca del login. Con la paleta unificada de la librería, el overlay pintaba un azul casi idéntico al fondo y tapaba el `bg-primary` base sin aportar profundidad.

**Cambios:**

- `login` (panel de marca): el `div` overlay usaba `bg-primary-container`, que con la integración mapea a `primary-hover` (`#1a63d6`), casi indistinguible del `bg-primary` (`#0f52ba`) del `aside`. Al ser opaco y a pantalla completa, tapaba el fondo base sin efecto visual. Se le quitó el color; el fondo lo aporta ahora solo `bg-primary` del `aside`. El `div` se conserva como hueco para la futura imagen de fondo.
- Se revisó el resto del panel: fondos (`bg-primary`, `bg-surface`), la cápsula del logo (`bg-on-primary/10`) y los textos (`text-on-primary`) siguen la paleta de la librería correctamente y no se tocaron.
- Se verificó con `pnpm typecheck`, `pnpm lint` y `pnpm build` (los tres en verde, sin warnings).

**Archivos modificados:**

- `src/routes/(auth)/login.tsx`
- `CHANGELOG.md`

## 2026:09:11 13:35

**Resumen:** Se corrigió el color del título del header del formulario de login, que estaba en `primary` (azul) y competía con el enlace y el botón, saturando el bloque de azul. Ahora usa el color de texto normal según la paleta de la librería.

**Cambios:**

- `LoginForm` (header): el título "Iniciar sesión" pasó de `text-primary` a `text-on-surface`. En la paleta de `@ai27-tech/ui`, `primary` (`#0f52ba`) es un color de acento para elementos interactivos (enlaces, botones), mientras que los títulos usan el color de texto normal (`--ui-color-text`, casi negro). El título ahora destaca por tamaño y peso (`text-headline-lg`), no por color, y el azul queda reservado para el enlace y el botón de envío.
- Se verificó con `pnpm typecheck` y `pnpm lint` (ambos en verde).

**Archivos modificados:**

- `src/features/sesion/LoginForm.tsx`
- `CHANGELOG.md`

## 2026:09:11 13:20

**Resumen:** Se corrigió el color de los textos del panel de marca del login, que quedaban fuera de paleta (azul sobre azul) tras unificar la paleta con la librería. Ahora usan el token de contraste correcto sobre el fondo primary.

**Cambios:**

- `login` (panel de marca): el logo, el nombre "AI27", el titular y el párrafo usaban `text-primary-fixed`. Como la librería no tiene el concepto `fixed`, ese token se había colapsado a `primary` (azul), quedando texto azul sobre fondo azul (`bg-primary`). Se cambiaron a `text-on-primary` (el color de contraste de la librería sobre primary, blanco); el párrafo secundario usa `text-on-primary/80` para conservar jerarquía.
- Se revisó el resto del login: los textos del formulario (`text-primary` para título y enlace, `text-on-surface-variant` para textos auxiliares, `text-success` para el icono de seguridad) ya seguían la paleta correctamente y no se tocaron.
- Se verificó con `pnpm typecheck`, `pnpm lint` y `pnpm build` (los tres en verde, sin warnings).

**Archivos modificados:**

- `src/routes/(auth)/login.tsx`
- `CHANGELOG.md`

## 2026:09:11 13:00

**Resumen:** Se integró la paleta de color con la librería `@ai27-tech/ui` haciendo que sus tokens sean la fuente de verdad: los tokens propios `--ai27-` ahora referencian los de la librería, de modo que app y componentes comparten exactamente los mismos colores y siguen el tema de la librería.

**Cambios:**

- `globals.css` (sección 1): se reemplazaron los valores hex de todos los tokens `--ai27-` del tema claro por referencias a los tokens de color de la librería (superficies → `surface`/`surface-muted`/`surface-raised`; texto → `text`/`text-muted`; bordes → `border`/`border-strong`; `primary`/`on-primary`/`container` → `primary`/`primary-hover`; `error` → `danger`; `secondary` → `secondary`). Los conceptos sin equivalente directo (tertiary, variantes fixed) se colapsaron al token más cercano (`info`, `primary`, `secondary`).
- `globals.css` (sección 2): se eliminaron los valores hex fijos del bloque `.dark`, que ahora solo declara `color-scheme: dark`. El tema oscuro lo gobierna la librería vía `data-theme`; como los `--ai27-` referencian los tokens de la librería, siguen el cambio automáticamente.
- `globals.css` (sección 3): se registraron en `@theme inline` los estados propios de la librería (`--color-success`, `--color-warning`, `--color-info`) como utilidades Tailwind.
- `LoginForm`: se sustituyeron las utilidades de valor arbitrario que apuntaban a los tokens de la librería por utilidades Tailwind del proyecto (`text-primary`, `text-on-surface-variant`, `border-outline-variant`, `text-success`, `text-headline-lg`), que ahora resuelven a los mismos colores.
- Se añadió `@source not "../../**/*.md"` en `globals.css` para excluir Markdown del escaneo de clases de Tailwind, evitando que ejemplos de clases documentados en el CHANGELOG generen CSS inválido (warnings de build).
- Se verificó con `pnpm typecheck`, `pnpm lint` y `pnpm build` (los tres en verde, build sin warnings).

**Archivos modificados:**

- `src/styles/globals.css`
- `src/features/sesion/LoginForm.tsx`
- `CHANGELOG.md`

## 2026:09:11 12:30

**Resumen:** Se corrigió que los componentes de `@ai27-tech/ui` se mostraran en tema oscuro cuando el sistema operativo está en modo oscuro, forzando el tema claro para alinearlos con la decisión del proyecto (panel siempre en claro).

**Cambios:**

- Se añadió el atributo `data-theme="light"` al elemento `<html>` en `index.html`. El CSS de la librería activa el tema oscuro con `@media (prefers-color-scheme: dark)` sobre `:root:not([data-theme])`; al declarar `data-theme` explícito, la media query deja de aplicar y la librería usa la paleta clara (`[data-theme="light"]`), independientemente de la preferencia del sistema operativo.
- La clase `light`/`dark` existente sigue rigiendo los tokens propios `--ai27-*` (Tailwind); `data-theme` rige los tokens `--ui-*` de la librería. Ambos quedan en claro por defecto.

**Archivos modificados:**

- `index.html`
- `CHANGELOG.md`

## 2026:09:11 12:00

**Resumen:** Se arregló la estructura del `LoginForm` para usar correctamente los componentes de la librería compartida `@ai27-tech/ui`, y se recableó a la lógica de sesión (`useLogin` + `onSuccess`), que se había perdido.

**Cambios:**

- Se corrigió el formulario para consumir los componentes de `@ai27-tech/ui` (`Card`, `CardBody`, `Form`, `FormField`, `Input`, `Checkbox`, `Button`) con sus props reales: el `FormField` aporta la etiqueta y el estado de error, el `Input` usa `startAdornment`/`endAdornment`, y el `Button` usa `loading`/`fullWidth`/`endIcon`.
- Se recableó el componente a la lógica de dominio: ahora recibe `onSuccess` (interfaz `LoginFormProps` que estaba declarada pero sin usar), llama a `useLogin` para el comando de login y muestra su estado (`submitting`) y su mensaje de error, en lugar del estado ficticio anterior.
- Se migraron los estilos inline (`style={{ ... }}`) del encabezado, el enlace, el botón de mostrar/ocultar contraseña y la nota de seguridad a clases utilitarias, referenciando los tokens con prefijo `--ui-` de la propia librería mediante utilidades de valor arbitrario de Tailwind.
- Se pasó `onSuccess={handleSuccess}` desde la ruta de login a `LoginForm` (antes el handler existía pero no se pasaba).
- Se verificó con `pnpm typecheck` y `pnpm lint` (ambos en verde).

**Archivos modificados:**

- `src/features/sesion/LoginForm.tsx`
- `src/routes/(auth)/login.tsx`
- `CHANGELOG.md`

## 2026:09:11 00:00

**Resumen:** Se corrigió un error de importación en la ruta de login que impedía la compilación.

**Cambios:**

- Se cambió la importación de `LoginForm` de importación con nombre (`import { LoginForm }`) a importación por defecto (`import LoginForm`), ya que el componente se exporta como `export default`.

**Archivos modificados:**

- `src/routes/(auth)/login.tsx`

## 2026:09:09 12:34

**Resumen:** Se integró el sistema de tokens de diseño (light/dark) con la pantalla de login, reemplazando los colores fijos (`neutral-*`, `white`, `red-*`) y las variantes manuales `dark:` por tokens semánticos que responden automáticamente al tema.

**Cambios:**

- `Input`: etiqueta e input migrados a `text-on-surface`, fondo `bg-surface-container-lowest`, placeholder `text-on-surface-variant`, borde `border-outline-variant`, foco `outline-primary` y estado de error con `border-error`/`text-error`/`outline-error`.
- `Button`: variante `primary` a `bg-primary`/`text-on-primary` con hover `bg-primary-container`; variante `secondary` a `border-outline-variant`/`text-on-surface` con hover `bg-surface-container`; foco en `outline-primary`.
- `LoginForm`: títulos, textos auxiliares, checkbox (con `accent-primary`), botón mostrar/ocultar contraseña, mensaje de error y nota de seguridad migrados a tokens `on-surface`, `on-surface-variant`, `outline-variant` y `error`.
- `login` (ruta): panel de marca a `bg-primary`/`text-on-primary` con overlay `bg-primary-container`; tarjeta del formulario a `bg-surface-container-low`, borde `outline-variant` y fondo de sección `bg-surface`.
- Se verificó con `pnpm typecheck` y `pnpm build` (ambos exitosos).

**Archivos modificados:**

- `src/components/ui/Input.tsx`
- `src/components/ui/Button.tsx`
- `src/features/sesion/LoginForm.tsx`
- `src/routes/(auth)/login.tsx`

## 2026:09:09 12:18

**Resumen:** Se fijó el tema claro (light) como predeterminado, eliminando la activación automática del tema oscuro por preferencia del sistema. Ahora el modo oscuro solo se activa de forma explícita con la clase `.dark`.

**Cambios:**

- Se eliminó el bloque `@media (prefers-color-scheme: dark)` de `globals.css`, de modo que el tema base siempre es el claro definido en `:root`, sin importar la configuración del sistema operativo.
- Los tokens de tema oscuro permanecen únicamente bajo el selector `.dark` (activación explícita, preparada para un futuro toggle).
- Se actualizaron los comentarios de la hoja de estilos para reflejar que el default es siempre light.
- Se verificó con `vite build` que compila sin errores y que las variables de tema ya no dependen de `prefers-color-scheme`.

**Archivos modificados:**

- `src/styles/globals.css`
- `CHANGELOG.md`

## 2026:09:09 12:10

**Resumen:** Se reescribió la vista `index.tsx` como demostración de uso de los tokens del sistema de diseño (superficies, acentos, controles, badges de estado, tipografía, radios y spacing), que responden automáticamente al tema claro/oscuro.

**Cambios:**

- Se reemplazó el markup genérico (clases `text-neutral-*`, `bg-white`) por utilidades basadas en tokens: `bg-background`/`text-on-background` en el canvas, `bg-surface-container-*` en tarjetas, `text-on-surface`/`text-on-surface-variant` en textos.
- Se agregaron secciones de ejemplo: escala de superficies, acentos (`primary`/`secondary`/`tertiary`/`error` con su color `on-*`), controles (botón primario, secundario con borde y ghost) y badges de estado operativo con cápsulas `rounded-full` y contenedores `*-container`.
- Se usó la escala tipográfica por tokens (`text-display-lg`, `text-title-md`, `text-body-md`, `text-label-md/sm`) y el spacing semántico (`p-space-*`, `gap-space-*`, `px-space-*`), con comentarios que documentan las convenciones de uso.
- Se verificó con `vite build` que compila y que las utilidades de tokens se materializan en el bundle.

**Archivos modificados:**

- `src/routes/index.tsx`
- `CHANGELOG.md`

## 2026:09:09 11:58

**Resumen:** Se normalizó la configuración de Tailwind 4 en `globals.css` y se dejó preparada la infraestructura de light/dark mode (solo colores) del sistema de diseño AI27 Tactical Operations System, sin toggle de UI.

**Cambios:**

- Se definieron los tokens de color semánticos (superficies, primary/secondary/tertiary, error, variantes fixed, outline, etc.) como variables CSS `--ai27-*` con sus valores para tema claro en `:root`.
- Se agregaron los mismos tokens con sus valores de tema oscuro, activables de dos formas: automática vía `prefers-color-scheme: dark` y manual vía la clase `.dark` en `<html>` (preparado para un futuro toggle, aún sin control de UI).
- Se registraron todos los tokens en Tailwind mediante `@theme inline`, generando utilidades de color (`bg-surface`, `text-on-surface`, `bg-primary`, ...) que referencian las variables `--ai27-*` y responden al cambio de tema sin duplicar clases.
- Se definió una única escala tipográfica compartida (basada en el tema claro: `display-lg`, `headline-xl/lg`, `title-md`, `body-md/sm`, `label-md/sm`, `data-mono`) con tamaño, altura de línea, peso y tracking; el tema solo cambia colores, no tipografía.
- Se estableció Inter como única fuente (`--font-sans` y `--default-font-family`).
- Se agregaron tokens compartidos de radios (`rounded-sm/md/lg/xl/full`) y de spacing semántico (`space-*`, `gutter-*`, `sidebar-width`, `topbar-height`).
- Se cablearon `background` y `color` base del `body` a los tokens de tema.
- Se verificó que el bundle de Tailwind compila (`vite build`) y que las utilidades de tokens se generan al usarse (`bg-surface`, `text-on-surface`, `text-body-md`, `p-space-md`, `border-outline-variant`).

**Archivos modificados:**

- `src/styles/globals.css`
- `CHANGELOG.md`

## 2026:09:09 13:10

**Resumen:** Se tradujeron a inglés los identificadores del código del login que no son sustantivos de dominio, conservando los comentarios en español y el lenguaje ubicuo del dominio (`sesion`, `usuario`, `Audiencia`, `rol`, y los comandos `iniciarSesion`/`refrescarSesion`/`cerrarSesion`), según la convención del README.

**Cambios:**

- Contratos: `CredencialesWire` → `CredentialsWire`; el campo `nombre` de `UsuarioWire`/`Usuario` → `name`.
- Errores: la clase `credencialesInvalidas` → `invalidCredentials` (declaración y usos).
- API: parámetros `credenciales` → `credentials`; variable local `crudo` → `raw` en `tokenStore`.
- Contexto: `autenticando` → `authenticating`, `aplicarSesion` → `applySession`, `actual` → `current`, `espera` → `delay`, `credenciales` → `credentials`.
- Hook y formulario: `enviando` → `submitting`, `mensajeDeError` → `errorMessage`, `recordarme` → `rememberMe`, `verPassword` → `showPassword`.
- UI: `Variante`/`variante`/`variantes` → `Variant`/`variant`/`variants`; valores `primario`/`secundario` → `primary`/`secondary` (y el uso en el home).
- Mocks: `CREDENCIALES_DEMO` → `DEMO_CREDENTIALS`, `USUARIO_DEMO` → `DEMO_USER`, `crearSesionWire` → `createSessionWire`, `iniciarMocks` → `enableMocks`; helper `ruta` → `path`.
- Rutas: variable local `destino` → `target` en `login.tsx`; corregido el acceso `usuario.nombre` → `usuario.name` en el home.
- Se conservaron como texto/dato (no identificadores) los literales de UI en español y la clave `mensaje` del payload simulado. Verificación en verde: `typecheck` y `lint`.

**Archivos modificados:**

- `src/lib/contracts/sesion.ts`
- `src/lib/contracts/index.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/sesion.ts`
- `src/lib/api/tokenStore.ts`
- `src/context/SessionContext.tsx`
- `src/features/sesion/useLogin.ts`
- `src/features/sesion/LoginForm.tsx`
- `src/components/ui/Button.tsx`
- `src/routes/_private/index.tsx`
- `src/routes/(auth)/login.tsx`
- `src/mocks/data.ts`
- `src/mocks/handlers.ts`
- `src/mocks/browser.ts`
- `src/main.tsx`
- `CHANGELOG.md`

## 2026:09:09 12:40

**Resumen:** Se reestructuró la pantalla de login a un layout de dos paneles (marca + formulario) y se enriqueció la estructura del formulario, sin fijar una paleta de colores (se dejaron neutros tematizables).

**Cambios:**

- Se rediseñó `routes/(auth)/login.tsx` como una cuadrícula de dos columnas: panel de marca a la izquierda (logo arriba, titular abajo, oculto en pantallas chicas) y el formulario centrado en una tarjeta a la derecha. El fondo del panel de marca queda como color plano, listo para sustituir por una imagen.
- Se amplió `components/ui/Input.tsx` con slots opcionales `leadingSlot` y `trailingSlot` (iconos o botones), reservando su espacio con padding, sin romper el uso previo.
- Se reestructuró `features/sesion/LoginForm.tsx`: encabezado, campos de correo y contraseña con iconos, botón de mostrar/ocultar contraseña, fila con "Recordarme" y enlace de contraseña olvidada, botón a ancho completo y nota de seguridad al pie. Se usaron iconos de `lucide-react`.
- Verificación en verde: `typecheck` y `lint`.

**Archivos modificados:**

- `src/routes/(auth)/login.tsx`
- `src/components/ui/Input.tsx`
- `src/features/sesion/LoginForm.tsx`
- `CHANGELOG.md`

## 2026:09:09 12:05

**Resumen:** Se construyó el inicio de sesión de `panel-admin` en modo mock (única vía posible hoy: aún no hay backend). Se partió del scaffold original limpio y se implementó una única versión coherente. Segundo factor como placeholder.

**Cambios:**

- Se restauró el scaffold original (`git checkout` de `src/main.tsx`, `src/routes/index.tsx` y `CHANGELOG.md`) y se eliminaron los archivos previos de login que habían quedado inconsistentes.
- Se crearon los contratos provisionales de sesión en `snake_case` (`CredencialesWire`, `SesionWire`, `UsuarioWire`, `Audiencia`, `RolInterno`), los modelos `Sesion`/`Usuario` y el parser `parseSesion`.
- Se añadió la capa API: cliente HTTP contra `bff`, taxonomía de errores (`ApiError`/`ApiErrorKind`), custodia de token tras interfaz (`TokenStore` sobre `localStorage`, provisional) y el wrapper de dominio `sesion` (`iniciarSesion`/`refrescarSesion`/`cerrarSesion`).
- Se creó `SessionContext` (Provider + `useSession`) con hidratación desde el store y refresco con margen antes de expirar, más `app/providers.tsx`.
- Se añadieron primitivas de UI propias (`Button`, `Input` accesible) y el helper `cn`, sin librerías de componentes.
- Se creó la feature de sesión: `useLogin` (estado y traducción de errores a español) y `LoginForm` (subcomponente hoja con su estado).
- Se reestructuraron las rutas: `(auth)/login`, `(auth)/two-factor` (placeholder, ADR 13), guarda `_private` y home privado `_private/index`. Se movió el home tras la guarda y se eliminó `routes/index.tsx`.
- Se implementó el backend simulado de sesión con MSW (`data`, `handlers`, `browser`) devolviendo forma de contrato, con arranque condicional por import dinámico en `main.tsx`. Usuario demo: `operador@demo.ai27` / `demo1234`.
- Se regeneró `routeTree.gen.ts`. Verificación en verde: `typecheck`, `lint` y `build`.

**Archivos modificados:**

- `src/lib/contracts/sesion.ts`
- `src/lib/contracts/index.ts`
- `src/lib/constants.ts`
- `src/lib/utils.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/client.ts`
- `src/lib/api/tokenStore.ts`
- `src/lib/api/sesion.ts`
- `src/context/SessionContext.tsx`
- `src/app/providers.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/features/sesion/useLogin.ts`
- `src/features/sesion/LoginForm.tsx`
- `src/routes/_private.tsx`
- `src/routes/_private/index.tsx`
- `src/routes/(auth)/login.tsx`
- `src/routes/(auth)/two-factor.tsx`
- `src/routes/index.tsx` (eliminado)
- `src/main.tsx`
- `src/mocks/data.ts`
- `src/mocks/handlers.ts`
- `src/mocks/browser.ts`
- `src/routeTree.gen.ts`
- `CHANGELOG.md`

## 2026:09:09 10:43

**Resumen:** Se inicializó el scaffold de `panel-admin` como app React + TypeScript sobre Vite, con el mismo stack que `pf-web-frontend-client`, y se copiaron las skills y el steering necesarios.

**Cambios:**

- Se copió la skill `grill-me` (`.kiro/skills/grill-me/`) y la regla de steering `changelog.md` (`.kiro/steering/`) desde `pf-web-frontend-client`.
- Se crearon los archivos de configuración con paridad de versiones exacta respecto del portal de cliente: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore`, `pnpm-workspace.yaml`, `index.html`, `.env.example` y `.env.mock`. Se adaptaron nombre, descripción, título y usuario demo (`operador@demo.ai27`) a la audiencia interna.
- Se creó la entrada mínima de la app (`src/main.tsx`, `src/styles/globals.css`, rutas `__root.tsx` e `index.tsx` de TanStack Router) y el setup de pruebas (`tests/setup.ts`).
- Se instalaron las dependencias con `pnpm@12.3.4`. Se verificó que `pnpm build` (typecheck estricto + bundle) pasa en verde y que el dev server de Vite arranca y responde en `http://localhost:5173/`.

**Archivos modificados:**

- `.kiro/skills/grill-me/SKILL.md`
- `.kiro/skills/grill-me/agents/openai.yaml`
- `.kiro/steering/changelog.md`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`
- `.gitignore`
- `index.html`
- `.env.example`
- `.env.mock`
- `src/main.tsx`
- `src/styles/globals.css`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `tests/setup.ts`
- `CHANGELOG.md`
