import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/catalogos/')({
  component: Catalogos,
});

function Catalogos() {
  return <h1 className="text-2xl font-semibold">Catálogos &amp; Flota</h1>;
}
