/*
 * Capacidades que `administrador` NO hereda, cada una con la fuente que la niega.
 *
 * Regla del administrador: hace todo salvo lo que una fuente le niega de forma
 * explícita y no está en corrección. Activar emergencia y el chat del viaje ya
 * no son excepciones: el Lead los corrige en backend y contrato (BE-5, BE-6).
 */
import type { Capacidad } from './capacidades';

export const EXCEPCIONES_ADM: Readonly<Partial<Record<Capacidad, string>>> = {
  'emergencia.bandeja':
    'DEC-130, DEC-131, DEC-132: `listarBandejaEmergencias` responde 403 al administrador',
  'emergencia.reclamar': 'DEC-130, DEC-028 #2: solo Reacción reclama',
  'emergencia.resolver': 'ADR 21 §5, DEC-028 #3: solo el responsable de Reacción resuelve',
  'emergencia.devolver':
    'DEC-126, DEC-131: devuelven Reacción (responsable), supervisor y coordinador',
  'emergencia.transferir':
    'DEC-126, DEC-131: transfieren Reacción (responsable), supervisor y coordinador',
  'emergencia.gestionarAjeno':
    'DEC-126, DEC-131: solo supervisor y coordinador operan casos ajenos',
  'alcance.leerPropio': 'DEC-149 #24: `obtenerMiAlcance` responde 403 al administrador',
};
