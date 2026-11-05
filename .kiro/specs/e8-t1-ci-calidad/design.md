# Diseño — E8-T1 CI y línea base de calidad (panel interno)

## Problema

A diferencia de `client`, `internal` tiene el andamiaje a medias: vitest está configurado pero sin pruebas, y el e2e está declarado pero sin config ni specs. Hay que completar el andamiaje mínimo (una prueba unitaria real, config e2e + un spec, pre-commit versionado) y luego poner el workflow encima. Se copia el patrón ya probado de `client` para no divergir entre los dos portales.

## Decisiones de diseño

### Prueba unitaria mínima

`internal` ya tiene vitest en jsdom con `@testing-library/jest-dom` en el setup. Se agregan dos pruebas pequeñas y estables:
- `tests/utils.test.ts`: `cn()` de `lib/utils.ts` — función pura, sin DOM. Cubre el caso de descartar falsy y unir clases.
- `tests/Button.test.tsx`: render de `components/ui/Button` con `@testing-library/react`, assert de contenido.

Ambas usan dependencias ya instaladas (`@testing-library/react`, `@testing-library/jest-dom`, `vitest`). No se añaden devDependencies para las unitarias.

### Config e2e (copiar el patrón de `client`)

Se crea `playwright.config.ts` equivalente al de `client`:
- `testDir: './e2e'`, `testMatch: '**/*.spec.ts'`.
- `webServer` que corre `npx vite build --mode mock && npx vite preview --port <PORT> --strictPort`. El modo mock es el único que incluye MSW (hay `.env.mock` y `src/mocks/`).
- `retries: 2` y `forbidOnly` en CI; reporter `github` en CI.
- Puerto propio (p. ej. 4174) para no chocar si algo más usa 4173.

Se crea `e2e/login.spec.ts` como spec mínimo: carga la app en modo mock y verifica que la pantalla de login (lo único funcional hoy) renderiza. `e2e/support/` para helpers si hace falta.

> La historia advierte (F-06) contra probar superficie que no existe. El e2e mínimo se limita a login/placeholder, que es lo construido hoy. No se prueban pantallas futuras.

### pre-commit versionado

Se copia `.husky/pre-commit` de `client` (lint-staged + `tsc --build --force`). `internal` ya tiene `husky`, `lint-staged`, config `lint-staged` en `package.json` y el script `prepare: husky`; solo falta el archivo versionado.

## Workflow de CI

Archivo `.github/workflows/ci.yml`, disparo estilo plataforma (igual que `client` e `identidad`):
```yaml
on:
  push:
    branches: [pf-wfi-m, pf-wfi-d, pf-wfi-q]
  pull_request:
```

Job `calidad`: install + lint + typecheck + test.
Job `e2e`: install + `playwright install --with-deps chromium` + test:e2e.

Node 22, pnpm 12.3.4, caché pnpm.

## Workflows de promoción (flujo de ramas)

Se copian de `pf-svc-identidad` sin cambios: `promotion-pr-dq.yml` y `promotion-pr-qm.yml`. Derivan la rama por sufijo, funcionan con `pf-wfi-d/q/m`. **No fusionan**; merge manual. No se crea `automerge-promotion.yml`.

> Requiere habilitar en la org "Allow GitHub Actions to create and approve pull requests". Se anota en la guía.

## Orden interno

1. Prueba unitaria (desbloquea el job `calidad`).
2. Config e2e + spec mínimo (desbloquea el job `e2e`).
3. pre-commit versionado.
4. Workflow.
5. PR + verificación + prueba negativa.

Se hace **después** de `client`, porque `client` valida el patrón de workflow que aquí se reutiliza.

## Riesgos

- **El e2e mínimo depende de que el modo mock levante:** si MSW no arranca en el bundle mock, el spec falla. Se verifica localmente con `pnpm build:mock && pnpm preview` antes de confiar en CI.
- **`tanstackRouter` genera `routeTree.gen.ts`:** el build en CI debe regenerarlo; `vite build` ya corre el plugin, así que no hace falta paso extra.
- **Flaky e2e:** mismo tratamiento que `client` (retries en CI); no se desactiva.
