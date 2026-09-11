/*
 * Ruta pública de login.
 *
 * Compone el LoginForm (que trae su propio estado y comando) y decide la
 * navegación tras el éxito: al destino guardado en `?redirect=` o al home.
 * Si ya hay sesión, `beforeLoad` evita pintar el login y manda al destino.
 */

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import LoginForm from '@/features/sesion/LoginForm';
import { tokenStore } from '@/lib/api/tokenStore';
interface LoginSearch {
  /** Destino al que volver tras autenticarse. */
  redirect?: string;
}

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const target = search['redirect'];
    return typeof target === 'string' ? { redirect: target } : {};
  },
  beforeLoad: ({ search }) => {
    // Ya autenticado: no tiene sentido mostrar el login.
    if (tokenStore.cargar()) {
      throw redirect({ to: search.redirect ?? '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  function handleSuccess() {
    void navigate({ to: search.redirect ?? '/' });
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca. Solo desde lg: en pantallas chicas se oculta y queda
          únicamente el formulario, que es lo esencial. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-on-primary lg:flex">
        {/* Hueco para la imagen de fondo. Hoy el fondo es el color de marca
            plano (bg-primary del aside); cuando exista el asset, sustituir este
            div por la <img>/background. No se pinta un segundo color aquí para
            no duplicar el azul de la paleta. */}
        <div className="absolute inset-0" aria-hidden="true" />

        <div className="relative flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-on-primary/10 text-lg font-bold text-on-primary">
            A
          </span>
          <span className="text-lg font-semibold text-on-primary">AI27</span>
        </div>

        <div className="relative flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-on-primary">Seguridad Logística Inteligente</h2>
          <p className="max-w-sm text-sm font-light text-on-primary/80">
            Plataforma avanzada para la gestión, monitoreo y protección de tus operaciones en
            tiempo real.
          </p>
        </div>
      </aside>

      {/* Panel del formulario. Centrado vertical y horizontalmente, con un ancho
          máximo cómodo para lectura. */}
      <section className="flex items-center justify-center bg-surface p-6 sm:p-10">
        <LoginForm onSuccess={handleSuccess} />
      </section>
    </main>
  );
}
