import { useState } from 'react';
import { Alert, Button, Grid, Inline, Modal, Textarea } from '@ai27-tech/ui';
import { esNotaValida, LONGITUD_MAXIMA_NOTA, normalizarNota } from './nota';

interface DialogoResolucionProps {
  enviando: boolean;
  /** Mensaje de la última tentativa fallida. El texto escrito se conserva. */
  error: string | null;
  onCancelar: () => void;
  onConfirmar: (nota: string) => Promise<boolean>;
}

/**
 * Nota obligatoria para resolver. La confirmación queda deshabilitada mientras la nota
 * sea inválida. Si el envío falla, el texto se conserva para reintentar. El padre lo monta
 * solo mientras está abierto, así que el texto se descarta al cerrar.
 */
export function DialogoResolucion({
  enviando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoResolucionProps) {
  const [texto, setTexto] = useState('');
  const valida = esNotaValida(texto);

  return (
    <Modal open onClose={onCancelar} title="Resolver emergencia">
      <Grid
        as="form"
        gap={3}
        onSubmit={(evento) => {
          evento.preventDefault();
          if (valida && !enviando) void onConfirmar(normalizarNota(texto));
        }}
      >
        <label htmlFor="nota-resolucion">Nota de resolución (obligatoria)</label>
        <Textarea
          id="nota-resolucion"
          rows={5}
          value={texto}
          maxLength={LONGITUD_MAXIMA_NOTA}
          onChange={(evento) => setTexto(evento.target.value)}
          invalid={texto.length > 0 && !valida}
        />
        <small>
          {texto.length} / {LONGITUD_MAXIMA_NOTA}
        </small>
        {error && <Alert variant="danger">{error}</Alert>}
        <Inline gap={2} justify="end" wrap={false} align="stretch">
          <Button variant="outline" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valida || enviando}>
            {enviando ? 'Resolviendo...' : 'Resolver'}
          </Button>
        </Inline>
      </Grid>
    </Modal>
  );
}
