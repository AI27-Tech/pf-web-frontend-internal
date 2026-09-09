import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';
import './styles/globals.css';

// La instancia del router. El árbol de rutas lo genera el plugin de TanStack
// Router desde src/routes/ (ver vite.config.ts).
const router = createRouter({ routeTree });

// Registro de tipos: da inferencia de rutas en toda la app.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
