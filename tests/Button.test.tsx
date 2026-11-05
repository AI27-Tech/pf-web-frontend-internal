// Render mínimo del Button interno, para que el pipeline tenga una prueba real.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renderiza su contenido como un boton', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('por defecto es type="button" (no envía formularios)', () => {
    render(<Button>Accion</Button>);
    expect(screen.getByRole('button', { name: 'Accion' })).toHaveAttribute('type', 'button');
  });

  it('invoca onClick al pulsarlo', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
