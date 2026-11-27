import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

/*
 * Sin `defaultPendingComponent`: mientras carga el código de una ruta no se pinta un skeleton
 * genérico. Cada pantalla muestra su propio skeleton cuando faltan sus datos.
 */
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
