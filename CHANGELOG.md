# CHANGELOG

Todos los cambios relevantes del proyecto se documentan en este archivo.
Las entradas se escriben en español, con fecha en formato `yyyy:mm:dd` y hora en formato `hora:minuto`.
Las entradas más recientes se colocan al inicio.

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
