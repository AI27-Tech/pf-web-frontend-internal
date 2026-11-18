import { useState } from 'react';
import { Alert, Button, Grid, Textarea } from '@ai27-tech/ui';
import { ErrorEmergenciaCerrada } from '@/lib/api/emergencias';
import { esNotaValida, LONGITUD_MAXIMA_NOTA, normalizarNota } from '../nota';

interface NotaEmergenciaProps {
  enviando: boolean;
  /** Devuelve true si la nota se guardó. Solo entonces se limpia el texto. */
  onEnviar: (cuerpo: string) => Promise<boolean>;
  /** Error de la última tentativa. El texto se conserva en todos los casos. */
  error: Error | null;
}

/**
 * Nota del monitoreo sobre un caso. Si la emergencia se cerró mientras se escribía
 * (409 `emergencia_cerrada`), el texto se conserva para copiarlo.
 */
export function NotaEmergencia({ enviando, onEnviar, error }: NotaEmergenciaProps) {
  const [texto, setTexto] = useState('');
  const valida = esNotaValida(texto);
  const cerrada = error instanceof ErrorEmergenciaCerrada;

  return (
    <Grid
      as="form"
      gap={2}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!valida || enviando) return;
        void onEnviar(normalizarNota(texto)).then((ok) => {
          if (ok) setTexto('');
        });
      }}
    >
      <label htmlFor="nota-emergencia">Nota (1 a {LONGITUD_MAXIMA_NOTA} caracteres)</label>
      <Textarea
        id="nota-emergencia"
        rows={3}
        value={texto}
        maxLength={LONGITUD_MAXIMA_NOTA}
        onChange={(evento) => setTexto(evento.target.value)}
        invalid={texto.length > 0 && !valida}
        disabled={cerrada}
      />
      <small>
        {texto.length} / {LONGITUD_MAXIMA_NOTA}
      </small>
      {error && <Alert variant="danger">{error.message}</Alert>}
      <div>
        <Button type="submit" disabled={!valida || enviando || cerrada}>
          {enviando ? 'Enviando...' : 'Agregar nota'}
        </Button>
      </div>
    </Grid>
  );
}
