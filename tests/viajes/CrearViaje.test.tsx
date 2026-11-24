/*
 * CrearViaje — formulario de creación por Operación (E8-T11).
 *
 * Replica el formulario de solicitud del portal del cliente (Ruta, Servicio, Fecha y hora,
 * vista previa), más lo propio de Operación: selector de cliente y roster. Se afirma el
 * comportamiento, no el detalle de implementación:
 *   - El envío queda deshabilitado mientras falte un obligatorio.
 *   - Los destinos intermedios se agregan con el interruptor; el destino final cierra la ruta.
 *   - El envío arma `[...intermedios, destinoFinal]`, el tipo de servicio y el instante UTC.
 *   - Un segundo clic con el envío en vuelo no reenvía.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
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
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

type Usuario = ReturnType<typeof userEvent.setup>;

/** Como se captura la fecha (`DD/MM/AAAA`) y la hora (`HHmm` + AM) en los campos de la librería. */
const FECHA_TEXTO = '20/11/2026';
const HORA_DIGITOS = '0930';
const FECHA_HORA_UTC = new Date(2026, 10, 20, 9, 30, 0, 0).toISOString();

const botonConfirmar = (): HTMLButtonElement =>
  screen.getByRole('button', { name: 'Confirmar creación' });

/** Abre el `Select` por su etiqueta y elige la opción por su texto. */
async function elegirOpcion(user: Usuario, etiqueta: string, opcion: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: etiqueta }));
  await user.click(screen.getByRole('button', { name: opcion }));
}

async function elegirCliente(user: Usuario): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: 'Cliente' }));
  await user.click(screen.getByText('Cliente Uno'));
}

/** Escribe la fecha como `DD/MM/AAAA` y sale del campo para confirmarla. */
async function escribirFecha(user: Usuario, texto: string): Promise<void> {
  const campo = screen.getByLabelText(/Fecha del servicio/);
  await user.click(campo);
  await user.type(campo, texto);
  await user.tab();
}

/** Escribe la hora por segmentos: `0930` y el período (`a` o `p`) del formato de 12 horas. */
async function escribirHora(user: Usuario, digitos: string, periodo: 'a' | 'p'): Promise<void> {
  await user.click(screen.getByRole('textbox', { name: 'Horas' }));
  await user.keyboard(digitos + periodo);
}

/** Completa todos los obligatorios con una ruta de un solo destino. */
async function completarFormulario(user: Usuario): Promise<void> {
  await elegirCliente(user);
  await user.type(screen.getByRole('textbox', { name: 'Origen' }), 'Origen 1');
  await user.type(screen.getByRole('textbox', { name: 'Destino final' }), 'Destino final 1');
  await elegirOpcion(user, 'Tipo de escolta', 'Patrulla');
  await escribirFecha(user, FECHA_TEXTO);
  await escribirHora(user, HORA_DIGITOS, 'a');
}

describe('CrearViaje', () => {
  it('deshabilita la creación mientras falte cualquier obligatorio y la habilita con todos', async () => {
    const user = userEvent.setup();
    mocks.crear.mockReset();
    render(<CrearViaje />);

    expect(botonConfirmar()).toBeDisabled();

    await elegirCliente(user);
    await user.type(screen.getByRole('textbox', { name: 'Origen' }), 'Origen 1');
    expect(botonConfirmar()).toBeDisabled(); // falta el destino final

    await user.type(screen.getByRole('textbox', { name: 'Destino final' }), 'Destino final 1');
    expect(botonConfirmar()).toBeDisabled(); // falta el tipo de escolta

    await elegirOpcion(user, 'Tipo de escolta', 'Patrulla');
    expect(botonConfirmar()).toBeDisabled(); // faltan fecha y hora

    await escribirFecha(user, FECHA_TEXTO);
    expect(botonConfirmar()).toBeDisabled(); // falta la hora
    expect(screen.getByText('Indica también la hora.')).toBeInTheDocument();

    await escribirHora(user, HORA_DIGITOS, 'a');
    expect(botonConfirmar()).toBeEnabled();
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it('no permite crear sin cliente aunque lo demás esté completo', async () => {
    const user = userEvent.setup();
    mocks.crear.mockReset();
    render(<CrearViaje />);

    await user.type(screen.getByRole('textbox', { name: 'Origen' }), 'Origen 1');
    await user.type(screen.getByRole('textbox', { name: 'Destino final' }), 'Destino final 1');
    await elegirOpcion(user, 'Tipo de escolta', 'Patrulla');
    await escribirFecha(user, FECHA_TEXTO);
    await escribirHora(user, HORA_DIGITOS, 'a');

    expect(botonConfirmar()).toBeDisabled();
  });

  it('envía la ruta con el destino final al último, el tipo de servicio y el instante UTC', async () => {
    const user = userEvent.setup();
    mocks.crear.mockResolvedValue({
      tipo: 'aprobado',
      viaje: { id: 'VJ-1', estado: 'APROBADO', origen: 'Origen 1' },
    });
    render(<CrearViaje />);

    await elegirCliente(user);
    await user.type(screen.getByRole('textbox', { name: 'Origen' }), 'Origen 1');
    await user.click(screen.getByLabelText('Seguimiento con múltiples destinos'));
    await user.type(screen.getByRole('textbox', { name: 'Destino 1' }), 'Destino 1');
    await user.click(screen.getByRole('button', { name: 'Agregar otro destino' }));
    await user.type(screen.getByRole('textbox', { name: 'Destino 2' }), 'Destino 2');
    await user.type(screen.getByRole('textbox', { name: 'Destino final' }), 'Destino final 1');
    await elegirOpcion(user, 'Tipo de servicio', 'Foráneo');
    await elegirOpcion(user, 'Tipo de escolta', 'Moto');
    await escribirFecha(user, FECHA_TEXTO);
    await escribirHora(user, HORA_DIGITOS, 'a');
    await user.click(botonConfirmar());

    expect(mocks.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 'CLI-1',
        origen: 'Origen 1',
        destinos: ['Destino 1', 'Destino 2', 'Destino final 1'],
        fechaHora: FECHA_HORA_UTC,
        tipoServicio: 'foraneo',
      }),
    );
  });

  it('muestra la ruta Viajes > Crear viaje con enlace de regreso a la bandeja', () => {
    render(<CrearViaje />);

    const ruta = screen.getByRole('navigation', { name: /ruta|breadcrumb/i });
    expect(screen.getByRole('link', { name: 'Viajes' })).toHaveAttribute('href', '/viajes');
    expect(ruta).toHaveTextContent('Crear viaje');
  });

  it('al apagar el interruptor descarta los destinos intermedios', async () => {
    const user = userEvent.setup();
    render(<CrearViaje />);

    const interruptor = screen.getByLabelText('Seguimiento con múltiples destinos');
    await user.click(interruptor);
    expect(screen.getByRole('textbox', { name: 'Destino 1' })).toBeInTheDocument();

    await user.click(interruptor);
    expect(screen.queryByRole('textbox', { name: 'Destino 1' })).not.toBeInTheDocument();
  });

  it('ignora una segunda confirmación mientras la secuencia sigue pendiente', async () => {
    const user = userEvent.setup();
    let resolver: ((resultado: unknown) => void) | undefined;
    mocks.crear.mockReset();
    mocks.crear.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );
    render(<CrearViaje />);

    await completarFormulario(user);

    const confirmar = botonConfirmar();
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
