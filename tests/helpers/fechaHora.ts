/*
 * Helper de pruebas para `DateTimeInput` de @ai27-tech/ui (R7).
 *
 * El control tiene dos partes: la fecha (`DateInput`, un input de texto DD/MM/AAAA)
 * y la hora (`TimePicker`, dos segmentos con aria-label "Horas" y "Minutos").
 *
 * - La fecha se confirma al salir de su campo (blur). Enter no se usa: en un
 *   formulario dispara el submit.
 * - Cada segmento de hora acepta dígitos por teclado. Un segmento con valor
 *   previo no se sobrescribe, así que se borra con Backspace antes de escribir.
 */

import { within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

const PATRON_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Escribe `valor` (`YYYY-MM-DDTHH:mm`) en un `DateTimeInput`.
 *
 * @param user Instancia de `userEvent.setup()` de la prueba.
 * @param control Input de fecha del componente (el que enlaza el label de `FormField`).
 * @param valor Fecha y hora en hora de pared, por ejemplo `2026-10-23T10:00`.
 */
export async function escribirFechaHora(
  user: UserEvent,
  control: HTMLElement,
  valor: string,
): Promise<void> {
  const partes = PATRON_FECHA_HORA.exec(valor);
  if (!partes) {
    throw new Error(`escribirFechaHora: "${valor}" no es YYYY-MM-DDTHH:mm.`);
  }
  const [, anio, mes, dia, hora, minuto] = partes;

  const ambito = within(control.closest('form') ?? document.body);
  const segmentoHoras = ambito.getByRole('textbox', { name: 'Horas' });
  const segmentoMinutos = ambito.getByRole('textbox', { name: 'Minutos' });

  await user.clear(control);
  await user.type(control, `${dia}/${mes}/${anio}`);

  await user.click(segmentoHoras);
  await user.keyboard('{Backspace}');
  await user.keyboard(hora!);

  await user.click(segmentoMinutos);
  await user.keyboard('{Backspace}');
  await user.keyboard(minuto!);
}
