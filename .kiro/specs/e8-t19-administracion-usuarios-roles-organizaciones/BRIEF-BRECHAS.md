# Brief de brechas de E8-T19 — Administración de usuarios, roles y organizaciones

**Estado (2026-11-05):** abierto, pendiente de respuesta. Detalle completo y estado por brecha en `BRECHAS.md` (misma carpeta).

**Para qué sirve este brief.** El panel interno (E8-T19) necesita que el `bff` exponga la administración de usuarios, roles, organizaciones, alcance y revocación de sesiones. Hoy no expone nada de eso. El frontend ya tiene spec completo (`requirements.md`, `design.md`, `tasks.md`) y puede construir la guarda de acceso y el esqueleto de la pantalla. Todo lo demás queda detenido hasta que se publique contrato.

## Fuentes y versiones verificadas

- Contexto: `ai27-platform-context` en `a55713c`. Historia técnica E8-T19; HU E4-HU-018, E4-HU-019, E4-HU-020; DEC-022, DEC-036, DEC-045, DEC-053/054, DEC-072, DEC-091, DEC-103, DEC-137, DEC-138.
- Contrato: último tag publicado `v0.1.0-tracer.37`. El frontend fija `0.1.0-tracer.36`. Para esta superficie ambos son idénticos.
- Todo lo que se pide al `bff` se verificó contra `bff.yaml` e `identidad.yaml` de esos tags.

## Qué hay hoy

- `bff.yaml`: solo sesión propia (`iniciarSesion`, `refrescarSesion`, `cerrarSesion`), `listarUnidades` y `listarClientes`.
- `identidad.yaml` define `altaSujeto`, `obtenerSujeto`, `desactivarSujeto`, `reactivarSujeto`, `fijarRolSujeto`, `listarHistorialSujeto` y `revocarSesion` (por `sesion_id`). **No es llamable desde el frontend** (DEC-137: solo el `bff` es público).
- Ningún OpenAPI menciona organizaciones. No hay listado de sujetos, modelo de alcance ni revocación de todas las sesiones de un sujeto.

## Para Contratos / dueño del `bff` (bloquea el Bloque B del plan)

Los nombres de abajo son **propuesta del frontend**, no `operationId` existentes. Pueden cambiar; lo que importa es la capacidad y los errores.

1. **B-1. Proyectar al `bff` las operaciones de sujeto.** Alta, detalle, desactivar, reactivar y fijar rol, con los mismos errores que `identidad`. Cada causa de `403` y `409` debe llevar un `codigo` de máquina distinto: `403` por auto-escalada; `409` por usuario desactivado, rol igual al actual y último administrador. Sin eso la interfaz no puede mostrar el motivo sin inferirlo.
2. **B-2. Listado de usuarios.** Paginado por cursor, con búsqueda por texto y filtro por rol y por organización. Además alimenta los selectores de Monitoristas (para Supervisor) y de Supervisores (para Coordinador) y el conteo de usuarios activos de una organización.
3. **B-15. Nombre e identificador de usuario en el detalle y el listado.** `SujetoDetalle` solo trae `sujeto { id, idp_subject?, tenant_id, activo }`, `tiene_rol` y `rol?`. La interfaz necesita nombre e identificador de usuario (y la organización si es `cliente`); `identidad` no los custodia, así que deben venir de la proyección del `bff`.
4. **B-3. Organizaciones.** Crear, listar, editar el nombre, desactivar (y reactivar si Producto lo decide, PA-8). Identificador de tenant generado e inmutable. La consulta previa a desactivar debe devolver el número de usuarios activos que perderían el acceso y, de ser posible, quiénes son. Aclarar si "organización" y "cliente" (`listarClientes`, DEC-101) son lo mismo.
5. **B-4. Alcance de monitoreo.** Asignar y retirar unidades de un Monitorista, Monitoristas de un Supervisor y Supervisores de un Coordinador; leer el alcance efectivo (la unión) ya calculado por el servidor. Depende de PA-3 (ver Producto).
6. **B-5. Revocar todas las sesiones de un usuario.** Operación administrativa por sujeto que publique un `sesion.revocada` por cada sesión viva y devuelva un resultado (incluido "sin sesiones activas"). Hoy `revocarSesion` es por `sesion_id` y no hay forma de enumerar las sesiones de un sujeto.
7. **B-16. Etiqueta legible de `Unidad`.** `listarUnidades` solo devuelve UUID. El selector de unidades del Monitorista no puede mostrar nombre o placa sin inventarlo.
8. **B-9. Pin del contrato.** `package.json` y el lockfile fijan `tracer.36`; está publicado `tracer.37`. Avisar en qué tracer saldrán las operaciones anteriores para subir el pin (el frontend no lo sube sin aprobación explícita).

## Para Identidad

9. **B-14. ¿Con qué identificador sabe el frontend que el usuario objetivo es él mismo?** El frontend solo conoce el claim `sub` de su sesión, que es opaco y distinto de `Sujeto.id` (DEC-072). R7.7 pide comparar identificadores, no nombres. _Propuesta:_ que el `bff` devuelva `idp_subject` del objetivo, o un indicador "es el propio sujeto", o que el token lleve un claim `sujeto_id`. Mientras no exista, la interfaz bloquea cambio de rol, alcance y revocación sobre todos los usuarios (falla cerrada).
10. **B-7. `tenant_id` de usuarios internos.** `AltaSujetoEntrada` exige `tenant_id` para todo rol, pero la HU solo liga una organización al rol `cliente`. ¿Qué valor lleva un `monitorista` o un `administrador`? La interfaz no lo captura ni lo deriva (DEC-129).
11. **B-17. Cambio de rol desde o hacia `cliente`.** `fijarRolSujeto` solo recibe `rol`. ¿Cómo viaja la organización al pasar a `cliente` y qué pasa con el `tenant_id` al pasar de `cliente` a un rol interno?
12. **PA-5. Sesiones simultáneas.** La definición de terminado de E8-T19 pide un e2e de revocación masiva con **dos sesiones abiertas** del mismo usuario. DEC-138 dice que un login nuevo revoca y reemplaza la sesión viva. ¿Pueden coexistir dos sesiones vivas de un sujeto (otro dispositivo, refresh, otro flujo)? Sin esa respuesta el e2e no se puede armar.
13. **B-13. Reautenticación.** ¿Desactivar un usuario o revocar sesiones exige segundo factor o reautenticación? No se asume.

## Para Producto

14. **PA-1** ¿El motivo de revocación es obligatorio? (E4-HU-020).
15. **PA-2** ¿Qué datos de contacto de la organización entran en V1? (E4-HU-019). Mientras tanto la interfaz solo captura el nombre.
16. **PA-3** Mecánica del vínculo Monitorista↔unidad: quién asigna y cuándo (E4-HU-018, DEC-045). Bloquea B-4.
17. **PA-6** Qué pasa con el alcance previo al cambiar el rol de un usuario.
18. **PA-7** ¿Puede un Administrador desactivarse a sí mismo cuando hay otro administrador? Hoy lo decide el servidor sin regla escrita.
19. **PA-8** ¿Se reactivan las organizaciones? ¿Desactivar una organización revoca las sesiones vivas de sus usuarios?
20. **PA-9** Objetivo medible de aplicación de un cambio de rol (hoy: siguiente refresco, DEC-091).
21. **PA-10 / B-8** ¿Editar nombre e identificador de usuario es V1? La HU dice "crear, editar y desactivar"; el contrato solo permite fijar el rol.
22. **PA-4** Textos aprobados de mensajes. Mientras no existan, el frontend usa textos provisionales marcados.

## Para Arquitectura / Contexto

23. **B-10. Corregir las fuentes.** La historia técnica de E8-T19 dice que "un Ejecutivo puede tener varios clientes" y cita `/api/v1/roles/...`. Lo primero contradice E4-HU-018 y DEC-103 (el Ejecutivo no lleva clientes asignados en el alta; el spec sigue la HU) y lo segundo no existe (el rol se fija con `PUT /sujetos/{id}/rol`). Corregir también la matriz del Ejecutivo de E4-HU-018.
24. **Registrar como DEC** la decisión de que la interfaz no asigna clientes a un Ejecutivo. Hoy está "decidida, pendiente de registro".

## Para la librería `@ai27-tech/ui` (no bloquea)

25. **B-11.** Verificado en `0.2.0-beta.6`: `Select` no reenvía `id`, `aria-label` ni `aria-describedby` (el frontend usa `Radio`); no hay `Tabs`, multi-select, alerta ni estado vacío; `Table` y `Modal` traen textos en inglés ("Select all rows", `aria-label="Close"`); `Pagination` es numérica y el `bff` pagina por cursor. El frontend compone con primitivas y no duplica nada.

## Del lado del frontend (sin dependencia externa)

- **B-12.** Cambiar la entrada "Administración" a `visiblePara` solo `administrador` y proteger la ruta. Actualizar `tests/layout/navigation-visibility.test.ts`. Bloque A del plan.
- **B-18.** `src/lib/api/client.ts` no admite `PUT` ni tiene tiempo de espera ni `AbortSignal`. Se coordina al escribir el adaptador real; el valor del tiempo de espera no está fijado.
- Subir el pin de `@ai27-tech/contracts` cuando se publique contrato. **Pendiente de aprobación explícita.**

## Qué desbloquea cada respuesta

| Respuesta                | Desbloquea (tareas de `tasks.md`)                       |
| ------------------------ | ------------------------------------------------------- |
| B-2 (+ B-15)             | 8.1, 8.2                                                |
| B-1 (+ B-14, B-15)       | 9.1, 9.2, 12.1, 17.6                                    |
| B-3 (+ B-7)              | 10.1, 10.2, 14.1, 14.2                                  |
| B-17                     | 11.1                                                    |
| B-4 (+ PA-3)             | 13.1                                                    |
| B-5                      | 15.1                                                    |
| Publicación de B-1 a B-5 | 16.1 y tarea 19 (adaptador real, DoD 2 servidor, DoD 3) |
| PA-5                     | e2e de revocación masiva con dos sesiones (19.4)        |
