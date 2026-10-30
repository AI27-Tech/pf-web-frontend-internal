import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';

const { loginSessionMock } = vi.hoisted(() => ({
  loginSessionMock: vi.fn(),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ login: loginSessionMock }),
}));

import { useLogin } from '@/features/sesion/useLogin';

describe('useLogin', () => {
  beforeEach(() => {
    loginSessionMock.mockReset();
  });

  it.each([
    ['invalidCredentials', 'Correo o contraseña incorrectos.'],
    ['red', 'El servicio de identidad no está disponible ahora mismo. Inténtalo más tarde.'],
    ['degradado', 'El servicio de identidad no está disponible ahora mismo. Inténtalo más tarde.'],
    ['noEncontrado', 'No se pudo iniciar sesión. Inténtalo de nuevo.'],
  ] as const)('mapea %s al mensaje de UI correspondiente', async (kind, message) => {
    loginSessionMock.mockRejectedValue(new ApiError(kind, 'fallo'));
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login({ usuario: 'operador', contrasena: 'secreta' });
    });

    expect(result.current.error).toBe(message);
    expect(result.current.submitting).toBe(false);
  });
});
