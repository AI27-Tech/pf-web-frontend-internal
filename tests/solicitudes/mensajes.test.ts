/*
 * M14 · texto de los rechazos del servidor y regla de fecha pasada (15.9, tracer.47).
 *
 * Se decide por `status` y `codigo`, nunca por el `mensaje` del servidor. `codigo` es un `string`
 * abierto en el contrato: uno desconocido cae al texto genérico de su `status`.
 */
import { describe, expect, it } from 'vitest';
import { ApiError, kindFromStatus } from '@/lib/api/errors';
import type { AccionSolicitud } from '@/features/solicitudes/afordancias';
import { esFechaPasada } from '@/features/solicitudes/estados';
import { mensajeErrorSolicitud } from '@/features/solicitudes/mensajes';

const conflicto = (codigo: string) => new ApiError('conflicto', 'x', 409, codigo);
const validacion = () => new ApiError(kindFromStatus(400), 'x', 400);

describe('mensajeErrorSolicitud · códigos de tracer.47', () => {
  it('409 fecha_hora_servicio_pasada al aprobar manda a reprogramar', () => {
    const texto = mensajeErrorSolicitud(conflicto('fecha_hora_servicio_pasada'), 'aprobar');
    expect(texto).toMatch(/ya pasó/);
    expect(texto).toMatch(/Cotización que la reprograme/);
  });

  it('409 transicion_no_permitida al confirmar el pago explica el pago tardío único', () => {
    const texto = mensajeErrorSolicitud(conflicto('transicion_no_permitida'), 'confirmarPago');
    expect(texto).toMatch(/ya tuvo su pago tardío, que solo se acepta una vez/);
  });

  it.each<AccionSolicitud>(['cotizar', 'reprogramar', 'aprobar', 'rechazar', 'revertirPago'])(
    '409 transicion_no_permitida al %s sigue diciendo que cambió de estado',
    (accion) => {
      expect(mensajeErrorSolicitud(conflicto('transicion_no_permitida'), accion)).toMatch(
        /cambió de estado y esta acción ya no aplica/,
      );
    },
  );

  it('400 sin código al cotizar nombra la fecha y el monto; al reprogramar, la fecha', () => {
    expect(mensajeErrorSolicitud(validacion(), 'cotizar')).toMatch(
      /posterior a este momento.*no sea negativo/,
    );
    expect(mensajeErrorSolicitud(validacion(), 'reprogramar')).toMatch(/posterior a este momento/);
  });

  it('400 en otra acción conserva el texto genérico', () => {
    expect(mensajeErrorSolicitud(validacion(), 'rechazar')).toBe(
      'El servicio rechazó los datos. Revisa la captura.',
    );
  });

  it('un código desconocido cae al texto de su status', () => {
    expect(mensajeErrorSolicitud(conflicto('codigo_nuevo'), 'aprobar')).toMatch(
      /cambió en otra operación/,
    );
  });
});

describe('esFechaPasada', () => {
  const ahora = new Date('2026-11-25T12:00:00');

  it('una fecha anterior o igual al instante actual es pasada', () => {
    expect(esFechaPasada('2026-11-25T11:59', ahora)).toBe(true);
    expect(esFechaPasada('2026-11-25T12:00', ahora)).toBe(true);
  });

  it('una fecha posterior no es pasada', () => {
    expect(esFechaPasada('2026-11-25T12:01', ahora)).toBe(false);
  });

  it('un valor vacío o inválido no es pasado: lo cubre la obligatoriedad', () => {
    expect(esFechaPasada('', ahora)).toBe(false);
    expect(esFechaPasada('no es fecha', ahora)).toBe(false);
  });
});
