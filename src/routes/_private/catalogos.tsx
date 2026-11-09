/*
 * Catálogos — vehículos y custodios (adelanto de E8-T16, DEC-142 #6). Reemplaza el
 * stub de E5 sobre la misma ruta; los demás catálogos de E8-T16 siguen pendientes.
 */

import { createFileRoute } from '@tanstack/react-router';

import { Catalogos } from '@/features/catalogos/Catalogos';

export const Route = createFileRoute('/_private/catalogos')({
  component: Catalogos,
});
