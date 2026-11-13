/*
 * Prueba de humo del helper `escribirFechaHora` sobre `DateTimeInput` (tarea 7.1).
 * Confirma que el helper deja el valor `2026-10-23T10:00` en el control.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DateTimeInput, FormField } from '@ai27-tech/ui';

import { escribirFechaHora } from './fechaHora';

function Formulario({ onValor }: { readonly onValor: (valor: string) => void }) {
  const [valor, setValor] = useState('');
  return (
    <form>
      <FormField label="Fecha y hora del servicio" required>
        <DateTimeInput
          value={valor}
          onChange={(nuevo) => {
            onValor(nuevo);
            setValor(nuevo);
          }}
        />
      </FormField>
    </form>
  );
}

describe('escribirFechaHora', () => {
  it('deja el valor 2026-10-23T10:00 en el DateTimeInput', async () => {
    const user = userEvent.setup();
    const onValor = vi.fn();
    render(<Formulario onValor={onValor} />);

    await escribirFechaHora(
      user,
      screen.getByLabelText(/Fecha y hora del servicio/),
      '2026-10-23T10:00',
    );

    expect(onValor).toHaveBeenLastCalledWith('2026-10-23T10:00');
    expect(screen.getByLabelText(/Fecha y hora del servicio/)).toHaveValue('23/10/2026');
    expect(screen.getByRole('textbox', { name: 'Horas' })).toHaveValue('10');
    expect(screen.getByRole('textbox', { name: 'Minutos' })).toHaveValue('00');
  });
});
