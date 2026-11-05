/* Apertura de una estadía (E8-T13, tarea 7). Motivo y eje desde enums del contrato. */
import { useRef, useState } from 'react';

import { Button, Form, FormField, Select } from '@ai27-tech/ui';
import type { SelectOption } from '@ai27-tech/ui';

import {
  EJES_AUTORIZACION_ESTADIA,
  MOTIVOS_ESTADIA,
  type EjeAutorizacionEstadia,
  type EstadiaEntrada,
  type MotivoEstadia,
} from '@/lib/contracts/historicoViaje';

export interface EstadiaFormProps {
  readonly enviando: boolean;
  readonly onAbrir: (entrada: EstadiaEntrada) => Promise<void>;
}

/** Etiquetas legibles de los valores del enum, sin alterar los tokens del contrato. */
const ETIQUETA_MOTIVO: Record<MotivoEstadia, string> = {
  combustible: 'Combustible',
  descanso: 'Descanso',
  alimentos: 'Alimentos',
  sanitario: 'Sanitario',
  reten: 'Retén',
  revision_autoridades: 'Revisión de autoridades',
  gastos: 'Gastos',
  espera_entrega: 'Espera de entrega',
};

const ETIQUETA_EJE: Record<EjeAutorizacionEstadia, string> = {
  autorizada: 'Autorizada',
  no_autorizada: 'No autorizada',
  antes_200km: 'Antes de 200 km',
};

const OPCIONES_MOTIVO: SelectOption[] = MOTIVOS_ESTADIA.map((motivo) => ({
  value: motivo,
  label: ETIQUETA_MOTIVO[motivo],
}));

const OPCIONES_EJE: SelectOption[] = EJES_AUTORIZACION_ESTADIA.map((eje) => ({
  value: eje,
  label: ETIQUETA_EJE[eje],
}));

/**
 * Abre una estadía con motivo y eje de autorización tomados de los enums del
 * contrato (sin texto libre). No captura el `inicio`: lo fija el servidor.
 */
export function EstadiaForm({ enviando, onAbrir }: EstadiaFormProps) {
  const [motivo, setMotivo] = useState<MotivoEstadia | ''>('');
  const [eje, setEje] = useState<EjeAutorizacionEstadia | ''>('');
  const [error, setError] = useState<string | null>(null);
  const envioEnCurso = useRef(false);

  const confirmar = async () => {
    if (envioEnCurso.current) return;
    if (motivo === '' || eje === '') {
      setError('Selecciona el motivo y el eje de autorización.');
      return;
    }
    setError(null);
    envioEnCurso.current = true;
    try {
      await onAbrir({ motivo, eje_autorizacion: eje });
      setMotivo('');
      setEje('');
    } finally {
      envioEnCurso.current = false;
    }
  };

  return (
    <Form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirmar();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      <FormField label="Motivo de la estadía" required error={error ?? undefined}>
        <Select
          options={OPCIONES_MOTIVO}
          value={motivo}
          placeholder="Selecciona un motivo"
          disabled={enviando}
          onChange={(value) => {
            setMotivo(value as MotivoEstadia);
            if (error) setError(null);
          }}
        />
      </FormField>
      <FormField label="Eje de autorización" required>
        <Select
          options={OPCIONES_EJE}
          value={eje}
          placeholder="Selecciona el eje de autorización"
          disabled={enviando}
          onChange={(value) => {
            setEje(value as EjeAutorizacionEstadia);
            if (error) setError(null);
          }}
        />
      </FormField>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" type="submit" loading={enviando} disabled={enviando}>
          Abrir estadía
        </Button>
      </div>
    </Form>
  );
}
