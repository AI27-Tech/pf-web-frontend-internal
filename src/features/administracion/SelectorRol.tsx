import { FormSection, Radio } from '@ai27-tech/ui';
import type { Rol } from '@ai27-tech/contracts/roles';

import { OPCIONES_ROL } from '@/lib/contracts/administracion';

import { ETIQUETAS_ROL } from './mensajes';

interface SelectorRolProps {
  /** Nombre del grupo de radios. */
  readonly nombre: string;
  /** Leyenda del grupo (R1.6, R3.1, R5.1). */
  readonly leyenda: string;
  readonly valor: Rol | null;
  readonly onCambiar: (rol: Rol) => void;
  /** Roles ofrecidos. Por defecto, los ocho del enum. */
  readonly opciones?: readonly Rol[];
  /** Rol actual del usuario. Se marca en la lista cuando se indica. */
  readonly rolActual?: Rol | null;
  readonly disabled?: boolean;
}

/** Selector de rol. Por defecto ofrece las ocho opciones del enum del contrato. */
export function SelectorRol({
  nombre,
  leyenda,
  valor,
  onCambiar,
  opciones = OPCIONES_ROL,
  rolActual,
  disabled,
}: SelectorRolProps) {
  return (
    <FormSection title={leyenda}>
      {opciones.map((rol) => (
        <Radio
          key={rol}
          name={nombre}
          value={rol}
          checked={valor === rol}
          disabled={disabled}
          onChange={() => onCambiar(rol)}
          label={rolActual === rol ? `${ETIQUETAS_ROL[rol]} (rol actual)` : ETIQUETAS_ROL[rol]}
        />
      ))}
    </FormSection>
  );
}
