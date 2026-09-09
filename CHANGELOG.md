# CHANGELOG

Todos los cambios relevantes del proyecto se documentan en este archivo.
Las entradas se escriben en español, con fecha en formato `yyyy:mm:dd` y hora en formato `hora:minuto`.
Las entradas más recientes se colocan al inicio.

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
