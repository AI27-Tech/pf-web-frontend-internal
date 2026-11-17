import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BloqueError } from '@/components/feedback/BloqueError';

describe('BloqueError', () => {
  it('anuncia el mensaje con role="alert"', () => {
    render(<BloqueError mensaje="No se pudo cargar el roster." onReintentar={() => {}} />);

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo cargar el roster.');
  });

  it('muestra el botón "Reintentar" dentro del aviso', () => {
    render(<BloqueError mensaje="Error de red." onReintentar={() => {}} />);

    const boton = screen.getByRole('button', { name: 'Reintentar' });
    expect(screen.getByRole('alert')).toContainElement(boton);
  });

  it('invoca onReintentar al pulsar el botón, una vez por clic', async () => {
    const onReintentar = vi.fn();
    render(<BloqueError mensaje="Error de red." onReintentar={onReintentar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
