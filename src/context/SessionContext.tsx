/*
 * SessionContext — la sesión interna viva de la app.
 *
 * Exporta su Provider y su hook de consumo juntos a propósito (ver la nota en
 * eslint.config.js sobre react-refresh en src/context/).
 *
 * Responsabilidades:
 *  - Hidratar la sesión desde el TokenStore al arrancar.
 *  - Exponer login / logout, delegando el HTTP a lib/api/sesion.ts.
 *  - Refrescar CON MARGEN antes de expirar: el refresco es donde bff reevalúa
 *    los claims. Un 401 a media conexión significa "reconecta tras refrescar".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { cerrarSesion, iniciarSesion, refrescarSesion } from '@/lib/api/sesion';
import { tokenStore } from '@/lib/api/tokenStore';
import { SESSION_REFRESH_MARGIN_MS } from '@/lib/constants';
import type { CredentialsWire, Sesion, Usuario } from '@/lib/contracts';

interface SessionValue {
  /** Sesión activa, o null si no hay nadie autenticado. */
  sesion: Sesion | null;
  /** Usuario activo, atajo de `sesion?.usuario`. */
  usuario: Usuario | null;
  /** true mientras el comando de login está en vuelo. */
  authenticating: boolean;
  /** Inicia sesión. Lanza ApiError('credencialesInvalidas') si fallan. */
  login: (credentials: CredentialsWire) => Promise<void>;
  /** Cierra sesión: avisa a bff (best-effort) y limpia el estado local. */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  // Hidratación síncrona: si había sesión en el store, arrancamos con ella.
  const [sesion, setSesion] = useState<Sesion | null>(() => tokenStore.cargar());
  const [authenticating, setAuthenticating] = useState(false);

  const applySession = useCallback((next: Sesion | null) => {
    if (next) {
      tokenStore.guardar(next);
    } else {
      tokenStore.limpiar();
    }
    setSesion(next);
  }, []);

  const login = useCallback(
    async (credentials: CredentialsWire) => {
      setAuthenticating(true);
      try {
        applySession(await iniciarSesion(credentials));
      } finally {
        setAuthenticating(false);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const current = sesion;
    // Limpiamos local primero: la UI no debe quedar "dentro" si bff tarda o falla.
    applySession(null);
    if (current) {
      try {
        await cerrarSesion(current.accessToken);
      } catch {
        // El cierre en servidor es best-effort; el estado local ya está limpio.
      }
    }
  }, [sesion, applySession]);

  // Refresco con margen: un temporizador reprogramado en cada cambio de sesión.
  useEffect(() => {
    if (!sesion) return;

    const refreshToken = sesion.refreshToken;
    const delay = Math.max(0, sesion.expiraEn - Date.now() - SESSION_REFRESH_MARGIN_MS);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          applySession(await refrescarSesion(refreshToken));
        } catch {
          // Si el refresco falla, la sesión dejó de ser válida: cerramos.
          applySession(null);
        }
      })();
    }, delay);

    return () => clearTimeout(timer);
  }, [sesion, applySession]);

  const value = useMemo<SessionValue>(
    () => ({ sesion, usuario: sesion?.usuario ?? null, authenticating, login, logout }),
    [sesion, authenticating, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Hook de consumo. Lanza si se usa fuera del Provider: es un error de montaje. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return value;
}
