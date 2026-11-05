/*
 * Ruta inicial de /_private.
 *
 * Redirige automáticamente a la página de inicio del rol del usuario.
 * Si el usuario accede directamente a /, no queda en blanco,
 * sino que va a su dashboard correspondiente.
 *
 * Nota: No usamos beforeLoad para redirect porque eso genera un 404 visual.
 * Usamos useEffect en el componente para redirigir después del render.
 */

import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSession } from '@/context/SessionContext';
import { getInitialRouteForRole } from '@/lib/hooks/useInitialRoute';

export const Route = createFileRoute('/_private/')({
  component: PrivateIndexPage,
});

function PrivateIndexPage() {
  const { usuario } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) {
      // Redirigir a la ruta inicial según el rol
      const initialRoute = getInitialRouteForRole(usuario.rol);
      void navigate({ to: initialRoute });
    }
  }, [usuario, navigate]);

  // Mientras se procesa la redirección, mostrar un esqueleto
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary inline-block h-8 w-8 animate-spin rounded-full border-b-2" />
        <p className="mt-4 text-gray-500">Cargando...</p>
      </div>
    </div>
  );
}
