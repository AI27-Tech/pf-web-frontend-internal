/*
 * Estado del diálogo de formulario (alta de usuario, organización). Función pura.
 *
 * Al fallar, el diálogo vuelve a un estado editable con lo capturado intacto
 * (`error_general` o `error_de_campo`). Mientras la solicitud está en vuelo no
 * se puede cerrar ni reenviar.
 */

export type EstadoDialogoFormulario =
  'cerrado' | 'editando' | 'enviando' | 'error_general' | 'error_de_campo';

export type EventoDialogoFormulario =
  'abrir' | 'enviar' | 'exito' | 'fallo_general' | 'fallo_de_campo' | 'cerrar';

export function reducirDialogoFormulario(
  estado: EstadoDialogoFormulario,
  evento: EventoDialogoFormulario,
): EstadoDialogoFormulario {
  switch (estado) {
    case 'cerrado':
      return evento === 'abrir' ? 'editando' : 'cerrado';

    case 'enviando':
      if (evento === 'exito') return 'cerrado';
      if (evento === 'fallo_general') return 'error_general';
      if (evento === 'fallo_de_campo') return 'error_de_campo';
      return 'enviando';

    case 'editando':
    case 'error_general':
    case 'error_de_campo':
      if (evento === 'enviar') return 'enviando';
      if (evento === 'cerrar') return 'cerrado';
      return estado;
  }
}

/** Verdadero mientras una solicitud del formulario está en vuelo. */
export function estaPendienteFormulario(estado: EstadoDialogoFormulario): boolean {
  return estado === 'enviando';
}
