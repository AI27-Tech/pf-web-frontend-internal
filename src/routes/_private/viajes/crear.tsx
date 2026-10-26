/* Ruta privada del flujo de creación de viaje por Operación (E8-T11). */

import { createFileRoute } from '@tanstack/react-router';

import { CrearViaje } from '@/features/viajes/crear/CrearViaje';

export const Route = createFileRoute('/_private/viajes/crear')({
  component: CrearViaje,
});
