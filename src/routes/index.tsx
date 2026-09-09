import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 p-8">
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        AI27 · Audiencia Interno
      </p>
      <h1 className="text-3xl font-semibold">panel-admin</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Consola interna de la plataforma AI27. Scaffold en arranque: mismo stack que{' '}
        <code>portal-cliente</code>, sobre la superficie de audiencia interna. Consulta el{' '}
        <code>README.md</code> para la arquitectura y las decisiones abiertas.
      </p>
    </main>
  );
}
