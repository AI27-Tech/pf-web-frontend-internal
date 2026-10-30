/*
 * Administración del sistema — E4 / gobierno
 * Stub temporal: la pestaña debe aterrizar en una pantalla real, no en Not Found.
 */

import { createFileRoute } from '@tanstack/react-router';

import { StubPage } from '@/components/layout/StubPage';

export const Route = createFileRoute('/_private/administracion')({
  component: AdministracionPage,
});

function AdministracionPage() {
  return (
    <StubPage
      titulo="Administración"
      historia="E4"
      descripcion="Aquí irá la administración del sistema: usuarios, roles, membresías y la revocación de sesiones."
    />
  );
}
