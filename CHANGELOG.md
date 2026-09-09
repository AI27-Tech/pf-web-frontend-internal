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
