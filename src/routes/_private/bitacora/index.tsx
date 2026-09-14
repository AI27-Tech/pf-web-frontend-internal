import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/bitacora/')({
  component: Bitacora,
});

function Bitacora() {
  return <h1 className="text-2xl font-semibold">Bitácora y Novedades</h1>;
}
