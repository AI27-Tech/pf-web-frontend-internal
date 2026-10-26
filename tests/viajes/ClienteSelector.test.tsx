import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClienteSelector, type ClienteOption } from '@/features/viajes/crear/ClienteSelector';

const clientes: ClienteOption[] = [
  { id: 'CLI-1', nombre: 'Cliente Uno' },
  { id: 'CLI-2', nombre: 'Cliente Dos', disabled: true },
];

describe('ClienteSelector', () => {
  it('distingue la carga del catálogo', () => {
    render(<ClienteSelector estado="cargando" value="" onChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogo de clientes');
  });

  it('representa un catálogo vacío como estado propio', () => {
    render(<ClienteSelector estado="vacio" value="" onChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('No hay clientes disponibles');
  });

  it('permite reintentar después de un error', async () => {
    const onReintentar = vi.fn();
    const user = userEvent.setup();
    render(
      <ClienteSelector
        estado="error"
        value=""
        error="No se pudo consultar el catálogo."
        onChange={vi.fn()}
        onReintentar={onReintentar}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledOnce();
    expect(screen.getByText('No se pudo cargar el catálogo de clientes.')).toBeInTheDocument();
  });

  it('renderiza las opciones del catálogo sin permitir texto libre', async () => {
    const user = userEvent.setup();
    render(<ClienteSelector estado="disponible" clientes={clientes} value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Selecciona un cliente' }));
    expect(screen.getByText('Cliente Uno')).toBeInTheDocument();
    expect(screen.getByText('Cliente Dos')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('representa explícitamente la brecha contractual actual', () => {
    render(<ClienteSelector estado="brecha" value="" onChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('todavía no está disponible');
  });
});
