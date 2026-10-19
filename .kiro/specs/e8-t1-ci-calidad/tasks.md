# Tareas — E8-T1 CI y línea base de calidad (panel interno)

- [ ] 1. Agregar pruebas unitarias mínimas reales
  - `tests/utils.test.ts`: casos de `cn()` (unir clases, descartar falsy)
  - `tests/Button.test.tsx`: render de `components/ui/Button` + assert de contenido
  - Ejecutar `pnpm test` y confirmar verde (ya no solo `setup.ts`)
  - _Requisitos: R1_

- [ ] 2. Crear configuración e2e y un spec mínimo
  - `playwright.config.ts` copiando el patrón de `client` (webServer con `vite build --mode mock` + `preview`, puerto propio, retries en CI)
  - `e2e/login.spec.ts`: cargar la app en modo mock y verificar que login renderiza
  - Verificar local: `pnpm build:mock && pnpm preview`, luego `pnpm test:e2e` en verde
  - _Requisitos: R2_

- [ ] 3. Versionar el pre-commit de husky
  - Crear `.husky/pre-commit` alineado con el de `client` (lint-staged + `tsc --build --force`)
  - Confirmar que el hook dispara en un commit de prueba
  - _Requisitos: R3_

- [ ] 4. Crear el workflow de CI
  - `.github/workflows/ci.yml`: disparo `push` a `pf-wfi-m/d/q` + `pull_request`
  - Job `calidad`: install + lint + typecheck + test
  - Job `e2e`: install + `playwright install --with-deps chromium` + test:e2e
  - Node 22, pnpm 12.3.4, caché pnpm
  - _Requisitos: R4_

- [ ] 4b. Agregar los workflows de promoción
  - Copiar `promotion-pr-dq.yml` y `promotion-pr-qm.yml` de `pf-svc-identidad` sin cambios
  - _Requisitos: R7_

- [ ] 5. Subir rama y abrir PR hacia dev
  - `git push -u origin feature/e8-t1-ci-calidad`
  - `gh pr create` hacia `pf-wfi-d`; confirmar ambos jobs en verde
  - _Requisitos: R4_

- [ ] 6. Prueba negativa deliberada
  - Romper un tipo o una prueba, confirmar rojo, revertir, confirmar verde
  - Anotar el resultado en el PR
  - _Requisitos: R6_

- [ ] 7. Branch protection (requiere permisos de admin)
  - Marcar `calidad` y `e2e` como required en `pf-wfi-d` (ver guía compartida)
  - _Requisitos: R5_
