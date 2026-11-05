import { useCallback, useState } from 'react';
import { Button } from '@ai27-tech/ui';
import type { Rol } from '@ai27-tech/contracts/roles';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';
import { ErrorEmergenciaCerrada, ErrorAccionNoPermitida } from '@/lib/api/emergencias';
import { puedeAnotar, puedeCerrar, puedeActivar } from '../afordancias';
import { AccionEmergencia } from './AccionEmergencia';
import { NotaEmergencia } from './NotaEmergencia';
import { SelectorCaso } from './SelectorCaso';
import { useEmergenciasViaje } from './useEmergenciasViaje';

/** Roles que ven el carril de emergencias del viaje (DEC-045 #9: `administrador` no activa). */
const ROLES_CON_CARRIL: readonly Rol[] = [
  'monitorista',
  'supervisor',
  'coordinador',
  'administrador',
];

interface SeccionEmergenciasViajeProps {
  viajeId: string;
  estadoViaje: string;
  rol: Rol | null;
  /** Recarga el detalle del viaje tras una activación o un 409 de viaje terminal. */
  onViajeCambio: () => void;
}

/**
 * Carril de emergencias del detalle del viaje: activar, seleccionar caso, anotar y cerrar
 * casos `resuelta`. No se monta para roles sin carril (p. ej. Reacción o ejecutivo).
 */
export function SeccionEmergenciasViaje({
  viajeId,
  estadoViaje,
  rol,
  onViajeCambio,
}: SeccionEmergenciasViajeProps) {
  const emergencias = useEmergenciasViaje(viajeId);
  const [seleccionado, setSeleccionado] = useState<string | undefined>(undefined);
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [errorNota, setErrorNota] = useState<Error | null>(null);
  const [errorCierre, setErrorCierre] = useState<Error | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alActivar = useCallback(
    (caso: EmergenciaViaje) => {
      setSeleccionado(caso.id);
      void emergencias.recargar();
    },
    [emergencias],
  );

  if (rol === null || !ROLES_CON_CARRIL.includes(rol)) return null;

  const casoActual = emergencias.casos.find((c) => c.id === seleccionado);
  const sujetoPuedeCerrar = casoActual !== undefined && puedeCerrar(rol, casoActual);

  const enviarNota = async (cuerpo: string): Promise<boolean> => {
    if (!seleccionado) return false;
    setEnviandoNota(true);
    setErrorNota(null);
    try {
      await emergencias.agregarNota(seleccionado, cuerpo);
      setAviso('Nota guardada.');
      return true;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('No se pudo agregar la nota');
      setErrorNota(error);
      if (error instanceof ErrorEmergenciaCerrada || error instanceof ErrorAccionNoPermitida) {
        void emergencias.recargar();
      }
      return false;
    } finally {
      setEnviandoNota(false);
    }
  };

  const cerrarCaso = async () => {
    if (!seleccionado) return;
    setErrorCierre(null);
    try {
      await emergencias.cerrar(seleccionado);
      setSeleccionado(undefined);
      setAviso('Emergencia cerrada.');
      await emergencias.recargar();
    } catch (e) {
      setErrorCierre(e instanceof Error ? e : new Error('No se pudo cerrar la emergencia'));
      void emergencias.recargar();
    }
  };

  return (
    <section
      aria-label="Emergencias del viaje"
      style={{ display: 'grid', gap: 'var(--ui-space-3)' }}
    >
      <h2 className="ui-text-headline-sm" style={{ margin: 0 }}>
        Emergencias
      </h2>
      {puedeActivar(rol, estadoViaje) && (
        <AccionEmergencia
          viajeId={viajeId}
          onActivada={alActivar}
          onViajeTerminal={onViajeCambio}
        />
      )}
      {aviso && <p role="status">{aviso}</p>}
      {emergencias.error && <p role="alert">{emergencias.error.message}</p>}
      {emergencias.cargando ? (
        <p role="status">Cargando emergencias...</p>
      ) : (
        <SelectorCaso
          casos={emergencias.casos}
          seleccionado={seleccionado}
          onSelect={(id) => {
            setSeleccionado(id);
            setErrorNota(null);
            setErrorCierre(null);
          }}
        />
      )}
      {casoActual && puedeAnotar(rol, casoActual) && (
        <NotaEmergencia enviando={enviandoNota} onEnviar={enviarNota} error={errorNota} />
      )}
      {casoActual && sujetoPuedeCerrar && (
        <div style={{ display: 'grid', gap: 'var(--ui-space-1)' }}>
          <Button variant="secondary" onClick={() => void cerrarCaso()}>
            Cerrar emergencia
          </Button>
          {errorCierre && <p role="alert">{errorCierre.message}</p>}
        </div>
      )}
    </section>
  );
}
