import type { BadgeProps } from '@ai27-tech/ui';

import { EstadoViaje } from '@/lib/contracts/viajeDetalle';

type VariantBadge = NonNullable<BadgeProps['variant']>;
type AparienciaBadge = NonNullable<BadgeProps['appearance']>;

/**
 * Descriptor visual de un estado. Solo los viajes en tránsito llevan punto y pulso; el resto de
 * los estados se muestra como texto con color suave, sin punto ni animación.
 */
export interface DescriptorBadge {
  readonly variant: VariantBadge;
  readonly appearance: AparienciaBadge;
  readonly dot: boolean;
  readonly pulse: boolean;
}

const SIN_PUNTO: Pick<DescriptorBadge, 'dot' | 'pulse'> = { dot: false, pulse: false };

/**
 * Mapa único estado → Badge (design D4). Propuesta de trabajo, pendiente de aprobación de
 * Producto. `Record` obliga a cubrir cada token de `EstadoViaje`: si el contrato agrega uno,
 * esto no compila hasta que se decida su apariencia.
 */
export const ESTADO_BADGE: Readonly<Record<EstadoViaje, DescriptorBadge>> = {
  [EstadoViaje.Aprobado]: { variant: 'primary', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.Asignado]: { variant: 'secondary', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.AptoParaSalida]: { variant: 'secure', appearance: 'outline', ...SIN_PUNTO },
  [EstadoViaje.EnEmbarque]: { variant: 'escort', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.PatrullaEnCamino]: { variant: 'escort', appearance: 'outline', ...SIN_PUNTO },
  [EstadoViaje.EnTransito]: { variant: 'secure', appearance: 'soft', dot: true, pulse: true },
  [EstadoViaje.EnDestino]: { variant: 'warning', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.EnDescarga]: { variant: 'warning', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.Cerrado]: { variant: 'secure', appearance: 'soft', ...SIN_PUNTO },
  [EstadoViaje.CanceladoPorCliente]: { variant: 'neutral', appearance: 'outline', ...SIN_PUNTO },
};

const RESPALDO: DescriptorBadge = { variant: 'neutral', appearance: 'soft', ...SIN_PUNTO };

/**
 * Devuelve el descriptor de un estado. Un token que no está en el mapa (p. ej. un estado nuevo
 * del `bff`) recibe `neutral` y no lanza error. Se usa `hasOwnProperty` para que claves del
 * prototipo, como `constructor`, no cuenten como estados.
 */
export function badgeDeEstado(token: string): DescriptorBadge {
  return Object.prototype.hasOwnProperty.call(ESTADO_BADGE, token)
    ? ESTADO_BADGE[token as EstadoViaje]
    : RESPALDO;
}
