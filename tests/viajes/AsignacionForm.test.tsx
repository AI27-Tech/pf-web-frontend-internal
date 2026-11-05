import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AsignacionForm } from '@/features/viajes/detalle/asignacionForm';
import type { Unidad } from '@/lib/contracts/unidades';

const unidades: Unidad[] = [
  {
    id: 'UN-1',
    vehiculo_id: 'VEH-1',
    custodios_ids: ['CUS-1'],
    tipo: 'moto',
    activa: false,
  },
  {
    id: 'UN-2',
    vehiculo_id: 'VEH-2',
    custodios_ids: ['CUS-2', 'CUS-3'],
    tipo: 'patrulla',
    activa: true,
  },
];

function renderForm(overrides: Partial<React.ComponentProps<typeof AsignacionForm>> = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <AsignacionForm
      unidades={unidades}
      cargando={false}
      error={null}
      enviando={false}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
      onReintentar={vi.fn()}
      {...overrides}
    />,
  );
  return { onConfirm };
}

describe('AsignacionForm', () => {
  it('mantiene Confirmar deshabilitado sin selección y permite seleccionar varias unidades activas', async () => {
    const user = userEvent.setup();
    // Dos unidades activas para comprobar la selección múltiple sin tropezar con
    // la regla de que las inactivas no se seleccionan.
    const soloActivas: Unidad[] = [
      {
        id: 'UN-2',
        vehiculo_id: 'VEH-2',
        custodios_ids: ['CUS-2'],
        tipo: 'patrulla',
        activa: true,
      },
      { id: 'UN-3', vehiculo_id: 'VEH-3', custodios_ids: ['CUS-3'], tipo: 'moto', activa: true },
    ];
    const { onConfirm } = renderForm({ unidades: soloActivas });
    const confirmar = screen.getByRole('button', { name: /Confirmar asignación/i });

    expect(confirmar).toBeDisabled();
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]!);
    await user.click(checkboxes[2]!);
    expect(confirmar).toBeEnabled();

    await user.click(confirmar);
    expect(onConfirm).toHaveBeenCalledWith(['UN-2', 'UN-3']);
  });

  it('no muestra las unidades inactivas y sin pintar aptitud', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderForm();

    // UN-1 es inactiva: su fila no aparece. UN-2 (activa) sí.
    expect(screen.getByText('VEH-2')).toBeInTheDocument();
    expect(screen.queryByText('VEH-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactiva')).not.toBeInTheDocument();
    expect(screen.queryByText(/apto|no apto|desconocido/i)).not.toBeInTheDocument();

    // Solo hay un checkbox de fila (UN-2); seleccionarlo confirma esa unidad.
    await user.click(screen.getAllByRole('checkbox').at(-1)!);
    const confirmar = screen.getByRole('button', { name: /Confirmar asignación/i });
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);
    expect(onConfirm).toHaveBeenCalledWith(['UN-2']);
  });

  it('muestra el estado de roster vacío cuando todas las unidades están inactivas', () => {
    renderForm({
      unidades: [
        { id: 'UN-1', vehiculo_id: 'VEH-1', custodios_ids: ['CUS-1'], tipo: 'moto', activa: false },
      ],
    });
    expect(screen.getByText('Sin unidades disponibles para asignar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar asignación/i })).toBeDisabled();
  });

  it('deshabilita Confirmar mientras la asignación está en curso', () => {
    renderForm({ enviando: true });
    expect(screen.getByRole('button', { name: /Asignando/i })).toBeDisabled();
  });

  it('muestra un estado distinto cuando el roster está vacío', () => {
    renderForm({ unidades: [] });
    expect(screen.getByText('Sin unidades disponibles para asignar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar asignación/i })).toBeDisabled();
  });
});
