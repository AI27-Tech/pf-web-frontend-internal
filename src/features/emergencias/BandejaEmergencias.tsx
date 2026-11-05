import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Toast } from '@ai27-tech/ui';
import { ErrorEmergenciaNoDisponible, ErrorSinAccesoEmergencias } from '@/lib/api/emergencias';
import { ListaCasos } from './ListaCasos';
import { PanelCaso } from './PanelCaso';
import { useAccionesCaso } from './useAccionesCaso';
import { useBandejaEmergencias } from './useBandejaEmergencias';
import { useCasoEmergencia } from './useCasoEmergencia';

/**
 * Bandeja de emergencias de Reacción. Con `caso` en la búsqueda, muestra el detalle de
 * ese caso junto a la lista. Los gestos se muestran según el rol y el estado del caso.
 */
export function BandejaEmergencias({ casoAbierto }: { casoAbierto?: string | undefined }) {
  const navegar = useNavigate();
  const bandeja = useBandejaEmergencias();
  const caso = useCasoEmergencia(casoAbierto);
  const [aviso, setAviso] = useState<string | null>(null);

  const refrescar = useCallback(() => {
    void bandeja.reintentar();
    void caso.recargar();
  }, [bandeja, caso]);

  const acciones = useAccionesCaso(caso.detalle?.caso ?? null, refrescar);

  // Los casos cerrados no se muestran aunque el servidor los envíe (Property 7).
  const visibles = bandeja.items.filter((item) => item.estado !== 'cerrada');

  const seleccionar = (id: string) => {
    setAviso(null);
    void navegar({ to: '/emergencias', search: { caso: id } });
  };

  const onCerrar = async () => {
    const ok = await acciones.cerrar();
    if (ok) {
      setAviso('Emergencia cerrada.');
      void navegar({ to: '/emergencias', search: {} });
    }
  };

  const onResolver = async (nota: string) => {
    const ok = await acciones.resolver(nota);
    if (ok) setAviso('Emergencia resuelta.');
    return ok;
  };

  const sinAcceso =
    caso.error instanceof ErrorSinAccesoEmergencias ||
    caso.error instanceof ErrorEmergenciaNoDisponible;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <h1 className="ui-text-headline-lg" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
        Bandeja de Emergencias
      </h1>
      {aviso && (
        <Toast variant="success" title={aviso} onClose={() => setAviso(null)}>
          Los cambios ya están aplicados.
        </Toast>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) 2fr',
          gap: 'var(--ui-space-4)',
        }}
      >
        <ListaCasos
          items={visibles}
          seleccionado={casoAbierto}
          onSelect={seleccionar}
          cargando={bandeja.cargando}
          cargandoMas={bandeja.cargandoMas}
          cursor={bandeja.cursor}
          onMas={() => void bandeja.cargarMas()}
          error={bandeja.error}
          reintentar={() => void bandeja.reintentar()}
          desactualizada={bandeja.desactualizada}
          actualizadoEn={bandeja.actualizadoEn}
        />
        <div>
          {!casoAbierto && <p>Selecciona una emergencia para ver su detalle.</p>}
          {casoAbierto && caso.cargando && <p role="status">Cargando emergencia...</p>}
          {casoAbierto && sinAcceso && (
            <p role="alert">La emergencia no está disponible para ti.</p>
          )}
          {casoAbierto && caso.error && !sinAcceso && !caso.detalle && (
            <p role="alert">{caso.error.message}</p>
          )}
          {caso.detalle && (
            <PanelCaso
              detalle={caso.detalle}
              notas={caso.notas}
              hayMasNotas={caso.hayMasNotas}
              cargandoMasNotas={caso.cargandoMasNotas}
              onCargarMasNotas={() => void caso.cargarMasNotas()}
              desactualizada={caso.desactualizada}
              actualizadoEn={caso.actualizadoEn}
              enCurso={acciones.enCurso}
              errorAccion={acciones.error}
              onReclamar={() => void acciones.reclamar()}
              onDevolver={() => void acciones.devolver()}
              onResolver={onResolver}
              onCerrar={() => void onCerrar()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
