import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FichaEditor } from '@/features/viajes/ficha/FichaEditor';
import type {
  DispositivoGps,
  FichaTecnica,
  FichaTecnicaEntrada,
} from '@/lib/contracts/fichaTecnica';

const fichaVacia: FichaTecnica = {
  viaje_id: 'VJ-1',
  contenedores: [],
  gps_ids: [],
};

const gps: DispositivoGps[] = [
  { id: 'GPS-1', identificador: 'GPS-A', activo: true },
  { id: 'GPS-2', identificador: 'GPS-B', activo: true },
];

type GuardarFicha = (entrada: FichaTecnicaEntrada) => Promise<FichaTecnica>;
type GuardarFichaMock = ReturnType<typeof vi.fn<GuardarFicha>>;

function crearGuardar(): GuardarFichaMock {
  return vi.fn<GuardarFicha>().mockResolvedValue(fichaVacia);
}

function renderEditor(guardar: GuardarFichaMock = crearGuardar()) {
  render(
    <FichaEditor
      viajeId="VJ-1"
      ficha={fichaVacia}
      gps={gps}
      cargandoGps={false}
      errorGps={null}
      reintentarGps={vi.fn()}
      guardar={guardar}
      guardando={false}
    />,
  );
  return { guardar };
}

describe('FichaEditor', () => {
  it('permite agregar y quitar contenedores, incluyendo cero contenedores', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('Cero contenedores es válido para este viaje.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar contenedor' }));
    expect(screen.getByLabelText('Económico 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar contenedor 1' }));
    expect(screen.getByText('Cero contenedores es válido para este viaje.')).toBeInTheDocument();
  });

  it('solo ofrece selección de GPS del catálogo y no campos de texto libre para GPS', async () => {
    const user = userEvent.setup();
    const { guardar } = renderEditor();

    expect(screen.getByText('GPS-A')).toBeInTheDocument();
    expect(screen.getByText('GPS-B')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /GPS/i })).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]!);
    await user.click(screen.getByRole('button', { name: 'Guardar ficha' }));

    expect(guardar).toHaveBeenCalledWith({ tracto: {}, contenedores: [], gps_ids: ['GPS-1'] });
  });

  it('excluye campos prohibidos del DOM y bloquea el doble guardado', async () => {
    const user = userEvent.setup();
    let resolver: ((ficha: FichaTecnica) => void) | undefined;
    const guardar = vi.fn<GuardarFicha>(
      () =>
        new Promise<FichaTecnica>((resolve) => {
          resolver = resolve;
        }),
    );
    renderEditor(guardar);

    expect(
      screen.queryByText(/cuenta espejo|clave_amago|kit de seguridad/i),
    ).not.toBeInTheDocument();

    const boton = screen.getByRole('button', { name: 'Guardar ficha' });
    await user.click(boton);
    await user.click(boton);
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(boton).toBeDisabled();

    resolver?.(fichaVacia);
    await waitFor(() => expect(boton).toBeEnabled());
  });
});
