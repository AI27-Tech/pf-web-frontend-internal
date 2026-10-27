import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import './styles/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html');
}

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
