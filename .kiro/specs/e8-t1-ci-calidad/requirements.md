# E8-T1 — CI y línea base de calidad (panel interno)

| | |
| --- | --- |
| **Épica / eje** | E8 — panel administrativo (eje de entrega, no épica funcional) |
| **Tarea** | E8-T1 — CI y línea base de calidad de los tres repos de frontend |
| **Repositorio** | `pf-web-frontend-internal` |
| **Rama base** | `pf-wfi-d` (dev) |
| **Rama de trabajo** | `feature/e8-t1-ci-calidad` |
| **Fuente** | `ai27-platform-context/docs/historias-tecnicas/E8-panel-admin.md` → E8-T1 |
| **Dependencias** | Ninguna |

## Alcance de este spec

E8-T1 abarca tres repos. Este spec cubre **solo** `pf-web-frontend-internal`. Los otros dos tienen su propio spec.

Es el repo con más trabajo de los tres: `test:e2e` está declarado pero falla porque **no existe `playwright.config.ts` ni directorio `e2e/`**, y `tests/` solo tiene `setup.ts` (cero pruebas reales). La historia pide explícitamente que el pipeline quede verde "con al menos una prueba real, no solo con el `setup.ts` actual".

E8-T1, por instrucción del equipo, incluye también el **flujo de ramas dev → qa → main** copiado del patrón de los backends (`pf-svc-identidad`, `pf-pkg-contracts`), con merge manual.

## Historia técnica

Como equipo de desarrollo, necesito que lint, typecheck, pruebas unitarias y end-to-end corran en cada pull request de `pf-web-frontend-internal`, para que la calidad no dependa de que alguien se acuerde de ejecutarlas.

## Estado verificado hoy (rama dev)

- Scripts presentes: `lint`, `typecheck`, `test` (vitest run), `test:e2e` (playwright), `build:mock`.
- `vite.config.ts` tiene vitest configurado (jsdom, `setupFiles: ./tests/setup.ts`, `include` para `tests/**/*.test.{ts,tsx}` y `src/**/*.test.{ts,tsx}`). Un comentario dice "Playwright vive en e2e/ y lo corre su propio runner" — pero ese directorio y su config no existen.
- `tests/` solo tiene `setup.ts`. **Cero pruebas reales.**
- **No existe `playwright.config.ts` ni `e2e/`** → `pnpm test:e2e` falla hoy.
- `.husky/` existe pero solo con `_/` (husky instalado); **no hay `pre-commit` versionado** (a diferencia de `client`).
- `src/` tiene componentes `components/ui/Button.tsx`, `Input.tsx` y util puro `lib/utils.ts` (`cn`).
- Sin workflow de CI: `.github/` solo tiene `pull_request_template.md`.

## Requisitos

### R1 — Al menos una prueba unitaria real
`tests/` DEBE tener al menos una prueba real que pase, además de `setup.ts`. Prueba mínima: `cn` de `lib/utils.ts` (función pura) y/o render de `components/ui/Button`.

**Criterios de aceptación:**
- `pnpm test` corre al menos una prueba con aserciones y pasa.

### R2 — Configuración e2e funcional
DEBE crearse `playwright.config.ts` y el directorio `e2e/` con al menos un spec real, de modo que `pnpm test:e2e` deje de fallar por falta de configuración. Los e2e corren sobre el bundle construido en modo mock (`vite build --mode mock` + `preview`), igual que en `client`.

**Criterios de aceptación:**
- `pnpm test:e2e` ejecuta al menos un spec y pasa sobre el bundle mock.

### R3 — pre-commit versionado
DEBE versionarse `.husky/pre-commit` alineado con el de `client` (lint-staged + typecheck completo).

### R4 — Workflow de CI (estilo plataforma)
El repo DEBE tener un workflow de GitHub Actions alineado al patrón de los backends: dispara en **push a las tres ramas** (`pf-wfi-m`, `pf-wfi-d`, `pf-wfi-q`) y en **cada `pull_request`**, y ejecuta `lint`, `typecheck`, `test` y `test:e2e`.

**Criterios de aceptación:**
- Un PR con error de lint, de tipos, una prueba unitaria rota o un e2e roto falla el workflow.
- Tras una promoción fusionada, el push a la rama destino vuelve a correr el CI.

### R7 — Flujo de ramas automatizado (dev → qa → main)
El repo DEBE adoptar el flujo de promoción de la plataforma, copiando `promotion-pr-dq.yml` y `promotion-pr-qm.yml` de `pf-svc-identidad` sin cambios (derivan la rama por sufijo, funcionan con `pf-wfi-d/q/m`). **No fusionan**: merge manual en ambos tramos. No se crea auto-merge.

**Criterios de aceptación:**
- Un push a `pf-wfi-d` crea/actualiza el PR hacia `pf-wfi-q`; un push a `pf-wfi-q`, hacia `pf-wfi-m`.
- Ningún workflow fusiona automáticamente.

### R5 — Compuerta de fusión (fuera del código)
Un PR con el workflow en rojo NO DEBE poder fusionarse. Requiere branch protection con required checks en `pf-wfi-d`. Se entrega guía; la activa alguien con permisos de admin.

### R6 — Prueba negativa deliberada
DEBE demostrarse con una prueba negativa deliberada que la compuerta bloquea. Se revierte tras confirmarla.

## Fuera de alcance

- No se construye AppShell ni navegación (eso es E8-T4 y otras historias).
- No se corrige el enum de roles ni se consume el contrato generado (eso es E8-T3).
- La prueba e2e mínima cubre lo que hoy existe (login/placeholder); no se prueban pantallas que aún no se construyen.
- Umbral de cobertura: fuera de alcance.
