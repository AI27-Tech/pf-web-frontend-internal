import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/asignacion/')({
  component: Asignacion,
});

function Asignacion() {
  return <h1 className="text-2xl font-semibold">Asignación Táctica</h1>;
}
