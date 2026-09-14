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
 *   - Fila auxiliar: recordar sesión + enlace de contraseña olvidada.
 *   - Botón de envío a ancho completo.
 *   - Nota de seguridad al pie.
 */

import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Form,
  FormField,
  Input,
} from '@ai27-tech/ui';
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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await login({ email, password });
    if (ok) onSuccess();
  }

  return (
    <Card variant="outlined" padding="lg" className="w-full max-w-sm">
      <CardBody>
        {/* Encabezado */}
        <header className="my-5">
          <h1 className="text-2xl text-on-surface">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Ingresa a tu Portal de Clientes</p>
        </header>

        <Form onSubmit={handleSubmit} noValidate>
          <FormField label="Correo electrónico empresarial" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              autoComplete="email"
              startAdornment={<MailIcon className="size-4" aria-hidden="true" />}
            />
          </FormField>

          <FormField label="Contraseña" required error={error ?? undefined}>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Recordarme + Olvidaste tu contraseña */}
          <div className="flex items-center justify-between gap-2">
            <Checkbox
              label="Recordarme"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <a
              href="#"
              className="text-sm text-primary no-underline hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button type="submit" loading={submitting} fullWidth endIcon={<ArrowRight className="size-4" />}>
            Iniciar sesión
          </Button>
        </Form>

        {/* Nota de seguridad */}
        <div className="mt-5 flex items-center gap-2 border-t border-outline-variant pt-4 text-sm leading-snug text-on-surface-variant">
          <ShieldIcon className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
          <span>
            Tu conexión es segura y está protegida por los protocolos de seguridad de AI27.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

export default LoginForm;
