/*
 * Bandeja operativa de viajes — E8-T7
 *
 * Ruta del panel interno que lista los viajes del alcance del usuario. Vive en el
 * outlet del AppShell (ruta padre `_private`). Su único trabajo es componer
 * `BandejaViajes`; la lógica (query, filtro, paginación) vive en el feature.
 */

import { createFileRoute } from '@tanstack/react-router';

import { BandejaViajes } from '@/features/viajes/BandejaViajes';

export const Route = createFileRoute('/_private/viajes/')({
  component: BandejaViajes,
});
