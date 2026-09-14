import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/monitoreo/')({
  component: Monitoreo,
});

function Monitoreo() {
  return <h1 className="text-2xl font-semibold">Monitoreo Carga</h1>;
}
