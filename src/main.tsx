import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AppProviders } from './app/providers';
import { RouteProgressBar } from './components/layout/RouteProgressBar';
import { routeTree } from './routeTree.gen';
import './styles/globals.css';

// La instancia del router. El árbol de rutas lo genera el plugin de TanStack
// Router desde src/routes/ (ver vite.config.ts).
const router = createRouter({
  routeTree,
  // Precarga la ruta al pasar el cursor/foco sobre un Link (todos los del
  // sidebar lo son): el chunk de la ruta se descarga ANTES del clic, así el
  // cambio de vista se siente casi inmediato.
  defaultPreload: 'intent',
  // Barra de progreso superior mientras la ruta destino resuelve (descarga del
  // chunk y/o beforeLoad). Señal inmediata que evita el doble clic.
  defaultPendingComponent: RouteProgressBar,
  // Aparece pronto (100 ms) para que un clic lento se sienta atendido, pero no
  // en navegaciones instantáneas, evitando parpadeo.
  defaultPendingMs: 100,
  // Si aparece, se muestra al menos 300 ms para que no parpadee.
  defaultPendingMinMs: 300,
});

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

// Arranque condicional de los mocks: el import es dinámico, así que con la
// bandera apagada ni MSW ni los handlers entran en el bundle. Ver README,
// "El backend simulado".
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return;
  const { enableMocks } = await import('./mocks/browser');
  await enableMocks();
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
