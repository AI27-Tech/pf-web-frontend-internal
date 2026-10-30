import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { tokenStore } from '@/lib/api/tokenStore';
import { parseSesion } from '@/lib/contracts';
import { createSessionWire } from '@/mocks/data';

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/api/sesion', () => ({
  cerrarSesion: vi.fn(),
  iniciarSesion: vi.fn(),
  refrescarSesion: refreshMock,
}));

import { SessionProvider, useSession } from '@/context/SessionContext';

function SesionProbe() {
  const { sesion } = useSession();
  return <output>{sesion?.sesionId ?? 'sin sesión'}</output>;
}

describe('SessionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
    tokenStore.limpiar();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['degradado', 'red'] as const)(
    'conserva la sesión ante un fallo de refresco %s',
    async (kind) => {
      const sesion = { ...parseSesion(createSessionWire()), expiraEn: Date.now() };
      tokenStore.guardar(sesion);
      refreshMock.mockRejectedValue(new ApiError(kind, 'indisponible'));

      render(
        <SessionProvider>
          <SesionProbe />
        </SessionProvider>,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText(sesion.sesionId)).toBeInTheDocument();
      expect(refreshMock).toHaveBeenCalledWith(sesion.refreshToken);
    },
  );

  it('cierra la sesión ante un fallo de refresco no autorizado', async () => {
    const sesion = { ...parseSesion(createSessionWire()), expiraEn: Date.now() };
    tokenStore.guardar(sesion);
    refreshMock.mockRejectedValue(new ApiError('noAutorizado', 'sesión vencida'));

    render(
      <SessionProvider>
        <SesionProbe />
      </SessionProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('sin sesión')).toBeInTheDocument();
    expect(tokenStore.cargar()).toBeNull();
  });
});
