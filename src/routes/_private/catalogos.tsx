/*
 * Administración de catálogos — E5
 * Stub temporal: la pestaña debe aterrizar en una pantalla real, no en Not Found.
 */

import { createFileRoute } from '@tanstack/react-router';

import { StubPage } from '@/components/layout/StubPage';

export const Route = createFileRoute('/_private/catalogos')({
  component: CatalogosPage,
});

function CatalogosPage() {
  return (
    <StubPage
      titulo="Catálogos"
      historia="E5"
      descripcion="Aquí irá la administración de catálogos del sistema: tipos de unidad, tipos de custodia y demás valores operativos que define Operación."
    />
  );
}
