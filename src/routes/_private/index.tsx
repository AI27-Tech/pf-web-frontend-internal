/*
 * Home privado: tablero de flota. Por ahora es un placeholder detrás de la
 * guarda de sesión; su contenido real llega cuando exista el dominio de viajes.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/Button';
import { useSession } from '@/context/SessionContext';

export const Route = createFileRoute('/_private/')({
  component: Home,
});

function Home() {
  const { usuario, logout } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    await navigate({ to: '/login' });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 p-8">
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        AI27 · Audiencia Interno
      </p>
      <h1 className="text-3xl font-semibold">panel-admin</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Sesión iniciada como <strong>{usuario?.name ?? usuario?.email}</strong>
        {usuario ? ` · rol: ${usuario.rol}` : null}. Tablero de flota pendiente de implementar.
      </p>
      <div>
        <Button variant="secondary" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
