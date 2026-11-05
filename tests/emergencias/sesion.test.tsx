import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BandejaEmergencias } from '@/features/emergencias/BandejaEmergencias';
import { onCut, restablecerCorte } from '@/lib/api/sessionCut';
import { API_PREFIX } from '@/lib/constants';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    sesion: { accessToken: 'token-vencido' },
    usuario: { id: 'sujeto-reaccion', rol: 'reaccion' },
  }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const path = (segmento: string) => `${API_PREFIX}${segmento}`;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => restablecerCorte());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('401 delegado al flujo de sesión (11.3)', () => {
  it('la vista no muestra error genérico y el corte de sesión lo maneja el AppShell', async () => {
    server.use(http.get(path('/panel/emergencias'), () => HttpResponse.json({}, { status: 401 })));
    const cortes = vi.fn();
    const desuscribir = onCut(cortes);
    const { container } = render(<BandejaEmergencias />);
    await waitFor(() => expect(cortes).toHaveBeenCalledWith('sesion_finalizada'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('No se pudo');
    desuscribir();
  });
});
