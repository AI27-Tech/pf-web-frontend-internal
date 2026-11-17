# Implementation Plan

## Grafo de dependencias

```
1 ──► 2 ──► 4 ──► 6 ──► 7 ──► 8 ──► 9
 └──► 3 ──┘      │
        └────► 5 ┘
```

- [ ] 1. Funciones puras y pruebas
  - [ ] 1.1 `estadoBadge.ts`: `ESTADO_BADGE` y `badgeDeEstado` con respaldo `neutral`, cubriendo todos los tokens de `viajeEstados.gen.ts`. Prueba de cobertura contra el enum.
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ] 1.2 `distribucion.ts`: porcentaje entero, orden conteo desc y alfabético, total 0.
    - _Requirements: 2.2, 2.3_
  - [ ] 1.3 `kpis.ts`: `kpisEnCurso` y `kpisRango`.
    - _Requirements: 1.3, 1.4_
  - [ ] 1.4 `paginar.ts`: `paginar` y `ajustarPagina`.
    - _Requirements: 4.3, 4.4_
  - [ ] 1.5 `tiempoRelativo.ts`: `haceCuanto(ahora, marca)`.
    - _Requirements: 5.5_
  - [ ] 1.6 Pruebas de las propiedades 1 a 7 del design.
    - _Requirements: 9.3_

- [ ] 2. Hook
  - [ ] 2.1 Agregar `recargando`, `actualizar` y `actualizadoEn` (`dataUpdatedAt`) a `useDashboardMonitoreo` sin cambiar claves de query ni sondeo.
    - _Requirements: 5.5, 5.6, 6.3_

- [ ] 3. Estilos y movimiento
  - [ ] 3.1 `dashboard.css` solo con tokens `--ui-*`: animación de entrada escalonada y `@media (prefers-reduced-motion: reduce)`; comentario `// BRECHA-UI` en la primera línea.
    - _Requirements: 7.2, 7.3, 7.4, 9.1_

- [ ] 4. Componentes de presentación
  - [ ] 4.1 `TarjetaKpi.tsx` (`// BRECHA-UI`): recuadro de icono, etiqueta, `Badge` opcional, `Stat` con cifra de telemetría, pie y `loading`.
    - _Requirements: 1.2, 1.7, 1.8, 1.9_
  - [ ] 4.2 `FilaKpis.tsx`: tarjetas por vista; `Badge` de frescura en la primera con `estadoFrescura`.
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_
  - [ ] 4.3 `ViajesPorEstado.tsx`: lista con `Badge`, conteo y porcentaje; `Skeleton` en carga; `EmptyState` si total 0.
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 6.1_
  - [ ] 4.4 `TarjetaViajes.tsx`: encabezado con icono, `Table`, `Pagination` y pie con `IndicadorFrescura` y enlace a la bandeja si la ruta existe para el rol.
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 6.1_
  - [ ] 4.5 `EncabezadoDashboard.tsx`: `PageHeader`, chip «Actualizado hace…» y botón «Actualizar» con `Spinner`.
    - _Requirements: 5.1, 5.5, 5.6, 6.3_

- [ ] 5. Columna de condiciones
  - [ ] 5.1 Verificar si `FilaViaje` (tracer 40) trae condiciones. Si las trae, agregar la columna con `VARIANTE_CONDICION`; si no, dejar constancia en `BRECHAS-UI.md` #4 y omitirla.
    - _Requirements: 3.5_

- [ ] 6. Ensamblar `DashboardMonitoreo.tsx`
  - [ ] 6.1 Reemplazar el cuerpo por los bloques nuevos con `Stack`, `Inline`, `Grid`; conservar guarda de rol, `Alert`, `BloqueError` y `EmptyState` (con icono y acción).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3_
  - [ ] 6.2 Reiniciar página al cambiar de vista o de tamaño; ajustar al recargar.
    - _Requirements: 4.4_

- [ ] 7. Pruebas de componente
  - [ ] 7.1 Carga, recarga, vacío, error, prohibido, sin acceso, paginación y cambio de vista.
    - _Requirements: 6, 8, 9.4_

- [ ] 8. Verificación
  - [ ] 8.1 `lint`, `typecheck` y `test`; revisar la lista «Antes de abrir un PR» del steering.
    - _Requirements: 9.1, 9.2, 9.6_
  - [ ] 8.2 Revisión manual: tema claro y oscuro (contraste ≥ 4.5:1 en `Badge`), ancho angosto, `prefers-reduced-motion`, teclado.
    - _Requirements: 5.2, 7.3, 9.5_

- [ ] 9. Cierre
  - [ ] 9.1 Avisar al equipo de la librería de las brechas de `BRECHAS-UI.md`; texto de PR con la skill `pr-frontend-ai27`.
