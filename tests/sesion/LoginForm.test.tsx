import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}));

vi.mock('@/features/sesion/useLogin', () => ({
  useLogin: () => ({
    submitting: false,
    error: null,
    login: loginMock,
  }),
}));

import LoginForm from '@/features/sesion/LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('impide el envío cuando ambos campos están vacíos', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(loginMock).not.toHaveBeenCalled();
    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
  });

  it('considera solo espacios como campos vacíos y no emite login', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), '   ');
    await user.type(screen.getByPlaceholderText('••••••••'), '   ');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(loginMock).not.toHaveBeenCalled();
    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
  });

  it('envía las credenciales cuando ambos campos tienen contenido', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(true);
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('nombre@empresa.com'), 'operador@demo.ai27');
    await user.type(screen.getByPlaceholderText('••••••••'), 'demo1234');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(loginMock).toHaveBeenCalledWith({
      usuario: 'operador@demo.ai27',
      contrasena: 'demo1234',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
