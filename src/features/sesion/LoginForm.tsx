/*
 * LoginForm — subcomponente hoja del login.
 *
 * Aquí vive el estado de interacción (email, password, recordar sesión, ver u
 * ocultar contraseña), como manda el README: no en una *Section contenedora.
 * Delega el comando en useLogin y, al tener éxito, invoca onSuccess.
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
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from './useLogin';

interface LoginFormProps {
  /** Se llama tras un login correcto. La ruta decide la navegación. */
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, submitting, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await login({ email, password });
    if (ok) onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Iniciar sesión
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Ingresa a la consola interna de AI27.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="nombre@empresa.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          leadingSlot={<Mail size={16} aria-hidden="true" />}
        />

        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          leadingSlot={<Lock size={16} aria-hidden="true" />}
          trailingSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="flex items-center rounded p-1.5 text-neutral-400 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-500 dark:hover:text-neutral-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            name="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={submitting}
            className="size-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          Recordarme
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Entrando…' : 'Iniciar sesión'}
        {submitting ? null : <ArrowRight size={16} aria-hidden="true" />}
      </Button>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
        <ShieldCheck size={18} aria-hidden="true" />
        Tu conexión es segura y está protegida por los protocolos de AI27.
      </p>
    </form>
  );
}
