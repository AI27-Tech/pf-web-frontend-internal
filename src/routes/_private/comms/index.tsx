import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/comms/')({
  component: Comms,
});

function Comms() {
  return <h1 className="text-2xl font-semibold">Comms &amp; WhatsApp</h1>;
}
