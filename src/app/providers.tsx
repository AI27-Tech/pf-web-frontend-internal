/*
 * Providers raíz de la app. Envuelve al router con los contextos contados.
 * Hoy SessionProvider y QueryClientProvider; el resto (degradación, modal, etc.) se añadirá aquí.
 */

import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/context/SessionContext';
import '@ai27-tech/ui/styles.css';

/** Cliente de Query con configuración V1: sin reintentos automáticos, sin refetch en focus. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
