/*
 * Edición de "mis unidades" de un Monitorista (E8-T21, DEC-140 #1, DEC-145).
 *
 * Se ofrecen las unidades activas del roster y, además, las que el Monitorista ya
 * tiene aunque estén inactivas o ya no estén en el roster, para poder quitarlas.
 * Una unidad puede estar en varios Monitoristas (DEC-145 #1). Guardar envía el
 * conjunto completo, una sola vez.
 */

import { useEffect, useRef, useState } from 'react';

import { Button, Checkbox, Form } from '@ai27-tech/ui';

import type { Unidad } from '@/lib/contracts/unidades';

import { vehiculoLegible } from '../viajes/unidadLegible';

export interface UnidadesMonitoristaFormProps {
  /** Unidades asignadas hoy al Monitorista. */
  readonly actuales: readonly string[];
  /** Roster completo. */
  readonly unidades: readonly Unidad[];
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (unidadesIds: readonly string[]) => void;
  readonly onCancelar: () => void;
}

interface Opcion {
  readonly id: string;
  readonly etiqueta: string;
}

function opciones(unidades: readonly Unidad[], actuales: readonly string[]): Opcion[] {
  const delRoster = unidades
    .filter((u) => u.activa || actuales.includes(u.id))
    .map((u) => ({
      id: u.id,
      etiqueta: u.activa ? vehiculoLegible(u) : `${vehiculoLegible(u)} (inactiva)`,
    }));
  const fuera = actuales
    .filter((id) => !unidades.some((u) => u.id === id))
    .map((id) => ({ id, etiqueta: `${id} (ya no está en el roster)` }));
  return [...delRoster, ...fuera];
}

export function UnidadesMonitoristaForm({
  actuales,
  unidades,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: UnidadesMonitoristaFormProps) {
  const [elegidas, setElegidas] = useState<readonly string[]>(actuales);
  // Envío único: el doble clic llega antes de que `enviando` deshabilite el botón.
  const enviado = useRef(false);
  useEffect(() => {
    if (!enviando) enviado.current = false;
  }, [enviando]);

  const ofrecidas = opciones(unidades, actuales);
  const sinCambios =
    elegidas.length === actuales.length && elegidas.every((id) => actuales.includes(id));
  const bloqueado = enviando || sinCambios;

  const alternar = (id: string, marcado: boolean) =>
    setElegidas((actual) => (marcado ? [...actual, id] : actual.filter((u) => u !== id)));

  const enviar = () => {
    if (bloqueado || enviado.current) return;
    enviado.current = true;
    // Orden estable del roster; el servidor reemplaza el conjunto completo.
    onGuardar(ofrecidas.map((o) => o.id).filter((id) => elegidas.includes(id)));
  };

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        enviar();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-3)' }}
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-text-body-sm">Unidades del roster</legend>
        {ofrecidas.length === 0 ? (
          <p className="ui-text-body-sm" style={{ margin: 0 }}>
            No hay unidades activas en el roster.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-1)' }}>
            {ofrecidas.map((o) => (
              <Checkbox
                key={o.id}
                label={o.etiqueta}
                checked={elegidas.includes(o.id)}
                disabled={enviando}
                onChange={(event) => alternar(o.id, event.target.checked)}
              />
            ))}
          </div>
        )}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="ui-text-body-sm"
          style={{ margin: 0, color: 'var(--ui-color-error)' }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--ui-space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado}>
          {enviando ? 'Guardando...' : 'Guardar unidades'}
        </Button>
      </div>
    </Form>
  );
}
