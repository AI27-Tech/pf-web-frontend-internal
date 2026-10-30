import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';
import { RouteProgressBar } from '@/components/layout/RouteProgressBar';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: RouteProgressBar,
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
