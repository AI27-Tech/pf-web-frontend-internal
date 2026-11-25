import type { ReactNode } from 'react';
import { useSession } from '@/context/SessionContext';
import { puede, type Capacidad } from '@/lib/permisos';
import { SinPermiso } from './SinPermiso';

interface RequiereCapacidadProps {
  readonly capacidad: Capacidad;
  readonly children: ReactNode;
}

/**
 * Guarda de pantalla por rol. Los hijos no se montan si el rol no tiene la
 * capacidad, así sus hooks de datos no disparan peticiones (Requirement 2.5).
 * Decide solo por rol; no valida alcance. La autoridad real es el BFF.
 */
export function RequiereCapacidad({ capacidad, children }: RequiereCapacidadProps) {
  const { usuario } = useSession();
  return puede(usuario?.rol, capacidad) ? <>{children}</> : <SinPermiso />;
}
