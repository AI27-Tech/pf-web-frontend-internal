import { FormSection, Radio } from '@ai27-tech/ui';

import type { Organizacion } from '@/lib/contracts/administracion';

import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { organizacionesOfrecibles } from './validacion';

interface SelectorOrganizacionProps {
  readonly nombre: string;
  readonly leyenda: string;
  readonly valor: string | null;
  readonly onCambiar: (id: string) => void;
  /** Todas las organizaciones; el selector ofrece solo las activas, por nombre. */
  readonly organizaciones: readonly Organizacion[];
  readonly disabled?: boolean;
}

/** Selector de organización de Cliente: selección única, solo activas (R4.1, R4.2). */
export function SelectorOrganizacion({
  nombre,
  leyenda,
  valor,
  onCambiar,
  organizaciones,
  disabled,
}: SelectorOrganizacionProps) {
  const ofrecibles = organizacionesOfrecibles(organizaciones);

  return (
    <FormSection title={leyenda}>
      {ofrecibles.length === 0 ? (
        <p role="status">{TEXTOS.sinOrganizaciones}</p>
      ) : (
        ofrecibles.map((organizacion) => (
          <Radio
            key={organizacion.id}
            name={nombre}
            value={organizacion.id}
            checked={valor === organizacion.id}
            disabled={disabled}
            onChange={() => onCambiar(organizacion.id)}
            label={organizacion.nombre}
          />
        ))
      )}
    </FormSection>
  );
}
