import { useRef, useState } from 'react';

import { Button, Form, FormField, Inline, Select, Stack } from '@ai27-tech/ui';
import type { SelectOption } from '@ai27-tech/ui';

import type { MotivoCierre } from '@/lib/contracts/cierreViaje';

import { motivosPermitidos, type TipoCierre, ventanaDeEscritura } from './cierreViaje';

export interface CierreFormProps {
  readonly tipo: TipoCierre;
  readonly onConfirm: (motivo: MotivoCierre) => Promise<void>;
  readonly onCancel: () => void;
}

const ETIQUETA_MOTIVO: Record<MotivoCierre, string> = {
  normal: 'Cierre normal',
  por_incidencia: 'Cierre por incidencia',
};

/** Captura el motivo contractual y comunica la ventana de escritura resultante. */
export function CierreForm({ tipo, onConfirm, onCancel }: CierreFormProps) {
  const permitidos = motivosPermitidos(tipo);
  const [motivo, setMotivo] = useState<MotivoCierre | ''>(
    permitidos.length === 1 ? (permitidos[0] ?? '') : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const envioEnCurso = useRef(false);

  const opciones: SelectOption[] = permitidos.map((valor) => ({
    value: valor,
    label: ETIQUETA_MOTIVO[valor],
  }));

  const confirmar = async () => {
    if (envioEnCurso.current) return;
    if (motivo === '') {
      setError('Selecciona un motivo de cierre.');
      return;
    }

    setError(null);
    envioEnCurso.current = true;
    setCargando(true);
    try {
      await onConfirm(motivo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el servicio.');
    } finally {
      envioEnCurso.current = false;
      setCargando(false);
    }
  };

  return (
    // Form conserva noValidate: Stack no acepta esa prop en sus tipos, así que el
    // apilado va en un Stack interno.
    <Form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirmar();
      }}
    >
      <Stack gap={3}>
        <FormField label="Motivo de cierre" required error={error ?? undefined}>
          <Select
            options={opciones}
            value={motivo}
            placeholder="Selecciona un motivo"
            disabled={cargando || permitidos.length === 1}
            onChange={(value) => {
              setMotivo(value as MotivoCierre);
              if (error) setError(null);
            }}
          />
        </FormField>

        {motivo !== '' && (
          <p className="ui-text-body-xs" style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}>
            La conversación aceptará mensajes durante {ventanaDeEscritura(motivo)} y después pasará
            a sólo lectura.
          </p>
        )}

        <Inline gap={2} align="stretch" justify="end" wrap={false}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={cargando}
            disabled={cargando || motivo === ''}
          >
            {cargando ? 'Cerrando...' : 'Confirmar cierre'}
          </Button>
        </Inline>
      </Stack>
    </Form>
  );
}
