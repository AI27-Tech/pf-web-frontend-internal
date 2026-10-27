/* Ruta pública de login. */

import { Toast, ToastContainer } from '@ai27-tech/ui';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import LoginForm from '@/features/sesion/LoginForm';
import { tokenStore } from '@/lib/api/tokenStore';

type LoginSearch = {
  redirect?: string;
  motivo?: 'sesion_finalizada';
};

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(typeof search['redirect'] === 'string' ? { redirect: search['redirect'] } : {}),
    ...(search['motivo'] === 'sesion_finalizada' ? { motivo: 'sesion_finalizada' } : {}),
  }),
  beforeLoad: ({ search }) => {
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
      <aside className="bg-primary text-on-primary relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <span className="bg-on-primary/10 text-on-primary flex size-9 items-center justify-center rounded-md text-lg font-bold">
            A
          </span>
          <span className="text-on-primary text-lg font-semibold">AI27</span>
        </div>
        <div className="relative flex flex-col gap-2">
          <h2 className="text-on-primary text-2xl font-semibold">
            Seguridad Logística Inteligente
          </h2>
          <p className="text-on-primary/80 max-w-sm text-sm font-light">
            Plataforma avanzada para la gestión, monitoreo y protección de tus operaciones en tiempo
            real.
          </p>
        </div>
      </aside>

      <section className="bg-surface flex items-center justify-center p-6 sm:p-10">
        {search.motivo === 'sesion_finalizada' && (
          <ToastContainer position="top-right">
            <Toast
              variant="info"
              title="Tu sesión finalizó. Inicia sesión de nuevo para continuar."
            />
          </ToastContainer>
        )}
        <LoginForm onSuccess={handleSuccess} />
      </section>
    </main>
  );
}
