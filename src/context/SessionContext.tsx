/*
 * SessionContext — la sesión interna viva de la app.
 *
 * Exporta su Provider y su hook de consumo juntos a propósito (ver la nota en
 * eslint.config.js sobre react-refresh en src/context/).
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

import { ApiError } from '@/lib/api/errors';
import { cerrarSesion, iniciarSesion, refrescarSesion } from '@/lib/api/sesion';
import { onCut, restablecerCorte } from '@/lib/api/sessionCut';
import { tokenStore } from '@/lib/api/tokenStore';
import { SESSION_REFRESH_MARGIN_MS } from '@/lib/constants';
import type { CredencialesEntrada, Sesion, Usuario } from '@/lib/contracts';
import { router } from '@/app/router';

interface SessionValue {
  /** Sesión activa, o null si no hay nadie autenticado. */
  sesion: Sesion | null;
  /** Usuario activo, atajo de `sesion?.usuario`. */
  usuario: Usuario | null;
  /** true mientras el comando de login está en vuelo. */
  authenticating: boolean;
  /** Inicia sesión. Lanza ApiError('credencialesInvalidas') si fallan. */
  login: (credenciales: CredencialesEntrada) => Promise<void>;
  /** Cierra la sesión local y avisa a bff de forma best-effort. */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => tokenStore.cargar());
  const [authenticating, setAuthenticating] = useState(false);

  const applySession = useCallback((next: Sesion | null) => {
    if (next) {
      restablecerCorte();
      tokenStore.guardar(next);
    } else {
      tokenStore.limpiar();
    }
    setSesion(next);
  }, []);

  const login = useCallback(
    async (credenciales: CredencialesEntrada) => {
      setAuthenticating(true);
      try {
        applySession(await iniciarSesion(credenciales));
      } finally {
        setAuthenticating(false);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const current = sesion;
    applySession(null);
    if (current) {
      try {
        await cerrarSesion(current.accessToken);
      } catch {
        // El cierre en servidor es best-effort; el estado local ya está limpio.
      }
    }
  }, [sesion, applySession]);

  useEffect(
    () =>
      onCut((motivo) => {
        applySession(null);
        void router.navigate({
          to: '/login',
          search: { redirect: router.state.location.href, motivo },
        });
      }),
    [applySession],
  );

  useEffect(() => {
    if (!sesion?.refreshToken) return;

    const delay = Math.max(0, sesion.expiraEn - Date.now() - SESSION_REFRESH_MARGIN_MS);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          applySession(await refrescarSesion(sesion.refreshToken!));
        } catch (error) {
          if (error instanceof ApiError && error.kind === 'noAutorizado') {
            applySession(null);
          }
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
