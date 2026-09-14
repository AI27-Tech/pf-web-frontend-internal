import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/incidentes/')({
  component: Incidentes,
});

function Incidentes() {
  return <h1 className="text-2xl font-semibold">Incidentes C4</h1>;
}
