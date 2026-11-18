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

    expect(
      screen.getByRole('status', { name: 'Cargando catálogo de clientes' }),
    ).toBeInTheDocument();
  });

  it('representa un catálogo vacío como estado propio', () => {
    render(<ClienteSelector estado="vacio" value="" onChange={vi.fn()} />);

    expect(screen.getByText('No hay clientes disponibles para tu alcance.')).toBeInTheDocument();
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

  it('renderiza las opciones del catÃ¡logo y filtra al escribir sin emitir texto libre', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClienteSelector estado="disponible" clientes={clientes} value="" onChange={onChange} />,
    );
    const busqueda = screen.getByRole('combobox', { name: 'Cliente' });
    await user.click(busqueda);
    expect(await screen.findByText('Cliente Uno')).toBeInTheDocument();
    expect(screen.getByText('Cliente Dos')).toBeInTheDocument();
    await user.type(busqueda, 'zzz');
    expect(await screen.findByText('Sin clientes que coincidan')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('representa explícitamente la brecha contractual actual', () => {
    render(<ClienteSelector estado="brecha" value="" onChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('todavía no está disponible');
  });
});
