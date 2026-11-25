import { useEffect, useState } from 'react';
import { Alert, Button, Section, SkeletonText, Stack } from '@ai27-tech/ui';
import type { Rol } from '@ai27-tech/contracts/roles';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';
import { ErrorEmergenciaCerrada, ErrorAccionNoPermitida } from '@/lib/api/emergencias';
import { puede } from '@/lib/permisos';
import { puedeAnotar, puedeCerrar } from '../afordancias';
import { NotaEmergencia } from './NotaEmergencia';
import { SelectorCaso } from './SelectorCaso';
import { useEmergenciasViaje, type EmergenciasViaje } from './useEmergenciasViaje';

interface SeccionEmergenciasViajeProps {
  viajeId: string;
  rol: Rol | null;
  /** Caso recién activado desde la cabecera: el carril lo selecciona y recarga la lista. */
  casoActivado?: EmergenciaViaje | null;
  /**
   * Lista de casos compartida con el detalle (la alerta de emergencias activas la usa).
   * Si no se pasa, el carril carga su propia lista.
   */
  emergencias?: EmergenciasViaje;
}

/**
 * Carril de emergencias del detalle del viaje: seleccionar caso, anotar y cerrar casos
 * `resuelta`. No se monta para roles sin carril (p. ej. Reacción o ejecutivo).
 */
export function SeccionEmergenciasViaje(props: SeccionEmergenciasViajeProps) {
  // Sin carril no se monta CarrilEmergencias: el bff responde 403 a la lista para otros roles.
  if (props.rol === null || !puede(props.rol, 'emergencia.verDeViaje')) return null;
  if (props.emergencias) {
    return <CarrilEmergencias {...props} rol={props.rol} emergencias={props.emergencias} />;
  }
  return <CarrilConListaPropia {...props} rol={props.rol} />;
}

/** Carril sin lista compartida: carga sus propios casos. */
function CarrilConListaPropia(props: SeccionEmergenciasViajeProps & { rol: Rol }) {
  const emergencias = useEmergenciasViaje(props.viajeId);
  return <CarrilEmergencias {...props} emergencias={emergencias} />;
}

function CarrilEmergencias({
  rol,
  casoActivado,
  emergencias,
}: SeccionEmergenciasViajeProps & { rol: Rol; emergencias: EmergenciasViaje }) {
  const { recargar } = emergencias;
  const [seleccionado, setSeleccionado] = useState<string | undefined>(undefined);
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [errorNota, setErrorNota] = useState<Error | null>(null);
  const [errorCierre, setErrorCierre] = useState<Error | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!casoActivado) return;
    // Sincroniza el selector con una activación hecha fuera de esta sección (cabecera).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeleccionado(casoActivado.id);
    void recargar();
  }, [casoActivado, recargar]);

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
    <Section
      collapsible
      title={
        <span role="heading" aria-level={2}>
          Emergencias
        </span>
      }
    >
      <Stack gap={3}>
        {aviso && <Alert variant="success">{aviso}</Alert>}
        {emergencias.error && <Alert variant="danger">{emergencias.error.message}</Alert>}
        {emergencias.cargando ? (
          <div role="status" aria-label="Cargando emergencias">
            <SkeletonText lines={2} />
          </div>
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
          <Stack gap={1}>
            <Button variant="secondary" onClick={() => void cerrarCaso()}>
              Cerrar emergencia
            </Button>
            {errorCierre && <Alert variant="danger">{errorCierre.message}</Alert>}
          </Stack>
        )}
      </Stack>
    </Section>
  );
}
