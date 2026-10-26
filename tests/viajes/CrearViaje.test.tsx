import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CrearViaje } from '@/features/viajes/crear/CrearViaje';

const mocks = vi.hoisted(() => ({
  crear: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
  hook: {
    clientes: [{ id: 'CLI-1', nombre: 'Cliente Uno', estado: 'activo' }],
    cargandoClientes: false,
    errorClientes: null,
    reintentarClientes: vi.fn(),
    unidades: [],
    cargandoUnidades: false,
    errorUnidades: null,
    reintentarUnidades: vi.fn(),
    enviando: false,
    crear: vi.fn(),
  },
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    usuario: { id: 'usr-demo-1', rol: 'jefe_operativo', audiencia: 'Interno' },
    sesion: { accessToken: 'token' },
    logout: mocks.logout,
  }),
}));

vi.mock('@/features/viajes/crear/useCrearViaje', () => ({
  useCrearViaje: () => ({ ...mocks.hook, crear: mocks.crear }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

describe('CrearViaje', () => {
  it('señala los campos obligatorios sin emitir creación', async () => {
    const user = userEvent.setup();
    mocks.crear.mockReset();
    render(<CrearViaje />);

    await user.click(screen.getByRole('button', { name: 'Confirmar creación' }));

    expect(screen.getByText('Selecciona un cliente.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un origen.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa al menos un destino válido.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa una fecha y hora válida.')).toBeInTheDocument();
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it('envía el cliente seleccionado y conserva el orden de destinos', async () => {
    const user = userEvent.setup();
    mocks.crear.mockResolvedValue({
      tipo: 'aprobado',
      viaje: { id: 'VJ-1', estado: 'APROBADO', origen: 'Origen 1' },
    });
    render(<CrearViaje />);

    await user.click(screen.getByRole('button', { name: 'Selecciona un cliente' }));
    await user.click(screen.getByText('Cliente Uno'));
    await user.type(screen.getByPlaceholderText('Dirección o ciudad de origen'), 'Origen 1');
    await user.type(screen.getByLabelText('Destino 1'), 'Destino 1');
    await user.click(screen.getByRole('button', { name: 'Agregar destino' }));
    await user.type(screen.getByLabelText('Destino 2'), 'Destino 2');
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: '2026-10-23T10:00' },
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar creación' }));

    expect(mocks.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 'CLI-1',
        origen: 'Origen 1',
        destinos: ['Destino 1', 'Destino 2'],
      }),
    );
  });

  it('ignora una segunda confirmación mientras la secuencia sigue pendiente', async () => {
    const user = userEvent.setup();
    let resolver: ((resultado: unknown) => void) | undefined;
    mocks.crear.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );
    render(<CrearViaje />);

    await user.click(screen.getByRole('button', { name: 'Selecciona un cliente' }));
    await user.click(screen.getByText('Cliente Uno'));
    await user.type(screen.getByPlaceholderText('Dirección o ciudad de origen'), 'Origen 1');
    await user.type(screen.getByLabelText('Destino 1'), 'Destino 1');
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: '2026-10-23T10:00' },
    });

    const confirmar = screen.getByRole('button', { name: 'Confirmar creación' });
    const primera = user.click(confirmar);
    const segunda = user.click(confirmar);
    await Promise.all([primera, segunda]);

    expect(mocks.crear).toHaveBeenCalledOnce();
    resolver?.({
      tipo: 'aprobado',
      viaje: { id: 'VJ-1', estado: 'APROBADO', origen: 'Origen 1' },
    });
  });
});
