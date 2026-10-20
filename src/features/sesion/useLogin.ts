/*
 * useLogin — hook de interacción del formulario de login.
 *
 * Traduce el resultado del comando (SessionContext.login → lib/api/sesion) a un
 * estado de UI: enviando / mensaje de error. No toca la API directamente ni
 * guarda el token: eso es del contexto y del wrapper de dominio.
 */

import { useCallback, useState } from 'react';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import type { CredencialesEntrada } from '@/lib/contracts';

interface UseLoginResult {
  /** true mientras el comando de login está en vuelo. */
  submitting: boolean;
  /** Mensaje de error legible, o null si no hay error pendiente. */
  error: string | null;
  /** Ejecuta el login. Devuelve true si tuvo éxito. */
  login: (credenciales: CredencialesEntrada) => Promise<boolean>;
}

export function useLogin(): UseLoginResult {
  const { login: loginSession } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (credenciales: CredencialesEntrada): Promise<boolean> => {
      setSubmitting(true);
      setError(null);
      try {
        await loginSession(credenciales);
        return true;
      } catch (e) {
        setError(errorMessage(e));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [loginSession],
  );

  return { submitting, error, login };
}

/** Traduce el error a un mensaje para el operador, sin filtrar detalles internos. */
function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.kind) {
      case 'invalidCredentials':
        return 'Correo o contraseña incorrectos.';
      case 'red':
        return 'No se pudo conectar. Revisa tu red e inténtalo de nuevo.';
      case 'degradado':
        return 'El servicio no está disponible ahora mismo. Inténtalo más tarde.';
      default:
        return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
    }
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}
