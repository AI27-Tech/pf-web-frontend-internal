# Línea base de verificación — modo-mock-roles-internos

Tarea 1.1 de `tasks.md`. Registro tomado antes de editar código, en `repos/pf-web-frontend-internal`.

| Comando                                  | Código de salida | Resultado                                 |
| ---------------------------------------- | ---------------- | ----------------------------------------- |
| `pnpm typecheck` (`tsc --build --force`) | 0                | Sin errores                               |
| `pnpm lint` (`eslint .`)                 | 0                | Sin errores ni advertencias               |
| `pnpm test` (`vitest run`)               | 0                | 75 archivos y 497 pruebas pasan; 0 fallos |

## Fallos preexistentes

Ninguno. Ni typecheck, ni lint, ni test tenían fallos antes de la feature.

## Notas

- El log de `pnpm test` contiene líneas `[MSW] Error: intercepted a request without a matching request handler`. Son mensajes de consola emitidos por pruebas que pasan. No son fallos.
- Cualquier fallo que aparezca en las tareas 8.1 a 8.3 y no esté en esta lista viene de la feature, no de la línea base.

## Verificación final

Tareas 8.1 a 8.3 de `tasks.md`, ejecutadas en `repos/pf-web-frontend-internal` después de la implementación. Orden: typecheck, lint, test.

| Comando                                  | Código de salida | Resultado                                 |
| ---------------------------------------- | ---------------- | ----------------------------------------- |
| `pnpm typecheck` (`tsc --build --force`) | 0                | Sin errores                               |
| `pnpm lint` (`eslint .`)                 | 0                | Sin errores ni advertencias               |
| `pnpm test` (`vitest run`)               | 0                | 77 archivos y 523 pruebas pasan; 0 fallos |

Comparación con la línea base de 1.1: el conteo subió de 75 a 77 archivos y de 497 a 523 pruebas (+2 archivos, +26 pruebas). No se revisó archivo por archivo cuál es nuevo. El aumento es consistente con las pruebas añadidas por la feature.

### Fallos

- Nuevos: ninguno.
- Preexistentes: ninguno.

### Notas

- El log de `pnpm test` contiene 4 líneas `[MSW] Error: intercepted a request without a matching request handler`. Son las mismas advertencias de consola que documenta la línea base. No son fallos.
