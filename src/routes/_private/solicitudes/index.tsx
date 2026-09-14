import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/solicitudes/')({
  component: Solicitudes,
});

function Solicitudes() {
  return <h1 className="text-2xl font-semibold">Solicitudes</h1>;
}
