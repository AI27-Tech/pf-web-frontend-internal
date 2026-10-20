# Tareas — E8-T1 CI y línea base de calidad (panel interno)

- [x] 1. Agregar pruebas unitarias mínimas reales
  - `tests/utils.test.ts`: `cn()` (unir clases, descartar falsy, cadena vacía)
  - `tests/Button.test.tsx`: render, type="button" por defecto, onClick
  - `pnpm test`=0 — **6 pruebas en 2 archivos** (antes solo `setup.ts`)
  - _Requisitos: R1_

- [x] 2. Crear configuración e2e y un spec mínimo
  - `playwright.config.ts` con el patrón de `client` (webServer `vite build --mode mock` + `preview`, **puerto 4174**, retries en CI)
  - `e2e/login.spec.ts`: carga `/login` y verifica heading, campo correo y botón — pasa
  - `pnpm test:e2e`=0
  - _Requisitos: R2_

- [x] 3. Versionar el pre-commit de husky
  - `.husky/pre-commit` versionado, alineado con `client` (lint-staged + `tsc --build --force`). `husky`/`lint-staged`/config/`prepare` ya existían
  - _Requisitos: R3_

- [x] 4. Crear el workflow de CI
  - `.github/workflows/ci.yml`: disparo `push` a `pf-wfi-m/d/q` + `pull_request`
  - Job `calidad`: install + **generar rutas (`vite build --mode mock`)** + lint + typecheck + test
  - Job `e2e`: install + `playwright install --with-deps chromium` + test:e2e
  - Node 22, pnpm 12.3.4, caché pnpm. YAML validado.
  - _Requisitos: R4_

- [x] 4b. Agregar los workflows de promoción
  - `promotion-pr-dq.yml` y `promotion-pr-qm.yml` copiados de `pf-svc-identidad` sin cambios. YAML validado.
  - _Requisitos: R7_

- [ ] 5. Subir rama y abrir PR hacia dev
  - **Pendiente: requiere push, que no se hace sin autorización del usuario.**
  - _Requisitos: R4_

- [ ] 6. Prueba negativa deliberada
  - Romper un tipo o una prueba, confirmar rojo, revertir, confirmar verde
  - Anotar el resultado en el PR
  - _Requisitos: R6_

- [ ] 7. Branch protection (requiere permisos de admin)
  - Marcar `calidad` y `e2e` como required en `pf-wfi-d` (ver guía compartida)
  - _Requisitos: R5_
