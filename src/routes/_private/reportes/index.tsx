import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/reportes/')({
  component: Reportes,
});

function Reportes() {
  return <h1 className="text-2xl font-semibold">Reportes &amp; BI</h1>;
}
