import { createRouter } from '@tanstack/react-router';
import { SkeletonCard } from '@ai27-tech/ui';

import { routeTree } from '@/routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: () => <SkeletonCard lines={4} />,
  defaultPendingMs: 150,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
