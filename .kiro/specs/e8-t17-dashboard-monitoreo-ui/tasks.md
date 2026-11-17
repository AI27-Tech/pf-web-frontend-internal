# Implementation Plan

## Grafo de dependencias

```
1 ──► 2 ──► 4 ──► 6 ──► 7 ──► 8 ──► 9
 └──► 3 ──┘      │
        └────► 5 ┘
```

- [ ] 1. Funciones puras y pruebas
  - [ ] 1.1 `estadoBadge.ts`: `ESTADO_BADGE` y `badgeDeEstado` con respaldo `neutral`, cubriendo todos los tokens de `viajeEstados.gen.ts`. Prueba de cobertura contra el enum.
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [ ] 1.2 `distribucion.ts`: porcentaje entero, orden conteo desc y alfabético, total 0.
    - _Requirements: 2.2, 2.4_
  - [ ] 1.3 `kpis.ts`: `kpisEnCurso` y `kpisRango`.
    - _Requirements: 1.2, 1.3_
  - [ ] 1.4 `paginar.ts`: `paginar` y `ajustarPagina`.
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ] 1.5 Pruebas de propiedades 1 a 6 del design.
    - _Requirements: 9.3_

- [ ] 2. Hook
  - [ ] 2.1 Agregar `recargando` y `actualizar` a `useDashboardMonitoreo` sin cambiar claves de query ni sondeo.
    - _Requirements: 5.6, 6.3, 6.4_

- [ ] 3. Estilos y movimiento
  - [ ] 3.1 CSS del portal solo con tokens `--ui-*`: animación de entrada escalonada, `@media (prefers-reduced-motion: reduce)`, comentario `// BRECHA-UI` en la primera línea.
    - _Requirements: 7.2, 7.3, 7.4, 9.1_

- [ ] 4. Componentes de presentación
  - [ ] 4.1 `FilaKpis.tsx` con `Grid`, `Stat`, iconos `lucide-react`, `loading`.
    - _Requirements: 1.1, 1.5, 1.6_
  - [ ] 4.2 `DistribucionEstados.tsx` con `Section`, `Badge`, `ProgressBar` y `label`; `Skeleton` en carga; `EmptyState` si total 0.
    - _Requirements: 2.1, 2.3, 2.5, 6.1_
  - [ ] 4.3 `TablaViajes.tsx` con `Table` (`hoverable`, `striped`, `stickyHeader`, `loading`) y `Pagination` (10, [10, 25, 50], `showInfo`); `Badge` por estado.
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.5, 4.6, 6.1_
  - [ ] 4.4 `EncabezadoDashboard.tsx` con `PageHeader`, `IndicadorFrescura`, `Button` «Actualizar» y `ProgressBar` indeterminado.
    - _Requirements: 5.1, 5.5, 6.3, 6.4_

- [ ] 5. Columna de condiciones
  - [ ] 5.1 Verificar si `FilaViaje` (tracer 40) trae condiciones. Si las trae, agregar la columna con `VARIANTE_CONDICION`; si no, dejar registrado en `BRECHAS-UI.md` #2 y omitirla.
    - _Requirements: 3.6_

- [ ] 6. Ensamblar `DashboardMonitoreo.tsx`
  - [ ] 6.1 Reemplazar el cuerpo por los bloques nuevos con `Stack`, `Inline`, `Grid` y `Section`; conservar guarda de rol, `Alert`, `BloqueError`, `EmptyState` (con icono y acción).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3_
  - [ ] 6.2 Reiniciar la página al cambiar de vista o tamaño; ajustar al recargar.
    - _Requirements: 4.3, 4.4_

- [ ] 7. Pruebas de componente
  - [ ] 7.1 Carga, recarga, vacío, error, prohibido, sin acceso, paginación, cambio de vista.
    - _Requirements: 6, 8, 9.4_

- [ ] 8. Verificación
  - [ ] 8.1 `lint`, `typecheck`, `test`; revisar lista de «Antes de abrir un PR» del steering.
    - _Requirements: 9.1, 9.2, 9.5_
  - [ ] 8.2 Revisión manual: claro y oscuro, viewport angosto, `prefers-reduced-motion`, navegación por teclado.
    - _Requirements: 5.2, 7.3_

- [ ] 9. Cierre
  - [ ] 9.1 Avisar al equipo de la librería de las brechas de `BRECHAS-UI.md`; texto de PR con la skill `pr-frontend-ai27`.
