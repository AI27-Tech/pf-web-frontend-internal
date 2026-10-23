/*
 * Ruta de segundo factor — PLACEHOLDER, sin lógica.
 *
 * TODO(auth) — Decisión abierta #8 (ADR 13): ¿entrega Cognito el OTP? Si lo
 * hace, esta ruta puede no existir. Queda como marcador para no bloquear la
 * estructura de rutas de autenticación mientras se resuelve.
 */

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/two-factor')({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Verificación en dos pasos</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Placeholder. El flujo de segundo factor está pendiente de decisión (ADR 13). Ver README,
        “Decisiones abiertas”.
      </p>
    </main>
  );
}
