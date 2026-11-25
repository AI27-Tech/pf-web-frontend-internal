/*
 * Etiquetas legibles de los enums de estadía. Los tokens del contrato no cambian:
 * solo cambia el texto que ve el monitorista.
 */

import type { EjeAutorizacionEstadia, MotivoEstadia } from '@/lib/contracts/historicoViaje';

export const ETIQUETA_MOTIVO: Record<MotivoEstadia, string> = {
  combustible: 'Combustible',
  descanso: 'Descanso',
  alimentos: 'Alimentos',
  sanitario: 'Sanitario',
  reten: 'Retén',
  revision_autoridades: 'Revisión de autoridades',
  gastos: 'Gastos',
  espera_entrega: 'Espera de entrega',
};

export const ETIQUETA_EJE: Record<EjeAutorizacionEstadia, string> = {
  autorizada: 'Autorizada',
  no_autorizada: 'No autorizada',
  antes_200km: 'Antes de 200 km',
};
