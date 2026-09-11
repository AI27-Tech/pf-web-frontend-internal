/*
 * Providers raíz de la app. Envuelve al router con los contextos contados.
 * Hoy solo la sesión; el resto (Query, degradación, modal) se añadirá aquí.
 */

import type { ReactNode } from 'react';

import { SessionProvider } from '@/context/SessionContext';
import "@ai27-tech/ui/styles.css";

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
