/*
 * LoginForm — subcomponente hoja del login.
 *
 * Aquí vive el estado de interacción (email, password, recordar sesión, ver u
 * ocultar contraseña), como manda el README: no en una *Section contenedora.
 * Delega el comando en useLogin y, al tener éxito, invoca onSuccess.
 *
 * UI con la librería de componentes compartida @ai27-tech/ui (Card, Form,
 * FormField, Input, Checkbox, Button). El estilo lo aporta la propia librería
 * a través de sus tokens (prefijo `--ui-`); su CSS se importa en app/providers.tsx.
 *
 * Estructura del formulario (de arriba abajo):
 *   - Encabezado: título + subtítulo.
 *   - Campo correo (con icono).
 *   - Campo contraseña (con icono y botón mostrar/ocultar).
 *   - Campo opcional de Segundo_Factor.
 *   - Fila auxiliar: recordar sesión + enlace de contraseña olvidada.
 *   - Botón de envío a ancho completo.
 *   - Nota de seguridad al pie.
 */

import { useState, type FormEvent } from 'react';
import { Button, Card, CardBody, Checkbox, Form, FormField, Input } from '@ai27-tech/ui';
import { ArrowRight, EyeIcon, EyeOffIcon, LockIcon, MailIcon, ShieldIcon } from 'lucide-react';

import { useLogin } from '@/features/sesion/useLogin';

interface LoginFormProps {
  /** Se llama tras un login correcto. La ruta decide la navegación. */
  onSuccess: () => void;
}

function LoginForm({ onSuccess }: LoginFormProps) {
  const { submitting, error, login } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secondFactor, setSecondFactor] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const emailIsEmpty = email.trim() === '';
    const passwordIsEmpty = password.trim() === '';
    setEmailError(emailIsEmpty ? 'El correo electrónico es obligatorio.' : null);
    setPasswordError(passwordIsEmpty ? 'La contraseña es obligatoria.' : null);

    if (emailIsEmpty || passwordIsEmpty) return;

    // La UI captura credenciales y un Segundo_Factor opcional; el contrato los recibe como
    // `usuario`, `contrasena` y `segundo_factor`.
    const credenciales = {
      usuario: email,
      contrasena: password,
      ...(secondFactor.trim() !== '' ? { segundo_factor: secondFactor.trim() } : {}),
    };
    const ok = await login(credenciales);
    if (ok) onSuccess();
  }

  return (
    <Card variant="outlined" padding="lg" className="w-full max-w-sm">
      <CardBody>
        {/* Encabezado */}
        <header className="my-5">
          <h1 className="text-on-surface text-2xl">Iniciar sesión</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Ingresa a tu Portal de Clientes</p>
        </header>

        <Form onSubmit={handleSubmit} noValidate>
          <FormField
            label="Correo electrónico empresarial"
            required
            error={emailError ?? undefined}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value.trim() !== '') setEmailError(null);
              }}
              placeholder="nombre@empresa.com"
              autoComplete="email"
              startAdornment={<MailIcon className="size-4" aria-hidden="true" />}
            />
          </FormField>

          <FormField label="Contraseña" required error={passwordError ?? error ?? undefined}>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value.trim() !== '') setPasswordError(null);
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              startAdornment={<LockIcon className="size-4" aria-hidden="true" />}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-inherit"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="size-4" aria-hidden="true" />
                  )}
                </button>
              }
            />
          </FormField>

          <FormField label="Código de segundo factor (opcional)">
            <Input
              type="text"
              value={secondFactor}
              onChange={(e) => setSecondFactor(e.target.value)}
              placeholder="Código de 6 dígitos"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </FormField>

          {/* Recordarme + Olvidaste tu contraseña */}
          <div className="flex items-center justify-between gap-2">
            <Checkbox
              label="Recordarme"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <a href="#" className="text-primary text-sm no-underline hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button
            type="submit"
            loading={submitting}
            fullWidth
            endIcon={<ArrowRight className="size-4" />}
          >
            Iniciar sesión
          </Button>
        </Form>

        {/* Nota de seguridad */}
        <div className="border-outline-variant text-on-surface-variant mt-5 flex items-center gap-2 border-t pt-4 text-sm leading-snug">
          <ShieldIcon className="text-success mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <span>
            Tu conexión es segura y está protegida por los protocolos de seguridad de AI27.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

export default LoginForm;
