import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Grid, PageHeader, Stack, Toast } from '@ai27-tech/ui';
import { BloqueError } from '@/components/feedback/BloqueError';
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

  const onReclamar = async () => {
    if (await acciones.reclamar()) setAviso('Caso reclamado. Ya eres su responsable.');
  };

  const onDevolver = async () => {
    if (await acciones.devolver()) setAviso('Caso devuelto al pool.');
  };

  const onResolver = async (nota: string) => {
    const ok = await acciones.resolver(nota);
    if (ok) setAviso('Emergencia resuelta.');
    return ok;
  };

  const onCerrar = async () => {
    const ok = await acciones.cerrar();
    if (ok) {
      setAviso('Emergencia cerrada.');
      void navegar({ to: '/emergencias', search: {} });
    }
  };

  const sinAcceso =
    caso.error instanceof ErrorSinAccesoEmergencias ||
    caso.error instanceof ErrorEmergenciaNoDisponible;

  return (
    <Stack gap={4}>
      <PageHeader title="Bandeja de Emergencias" />
      {aviso && (
        <Toast variant="success" title={aviso} onClose={() => setAviso(null)}>
          Los cambios ya están aplicados.
        </Toast>
      )}
      {/* Región accesible: anuncia cambios de estado o responsable del caso abierto (Req 10.8). */}
      <p role="status" aria-live="polite" style={{ margin: 0 }}>
        {caso.anuncio}
      </p>
      <Grid gap={4} style={{ gridTemplateColumns: 'minmax(260px, 1fr) 2fr' }}>
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
            <Alert variant="danger">La emergencia no está disponible para ti.</Alert>
          )}
          {casoAbierto && caso.error && !sinAcceso && !caso.detalle && (
            <BloqueError mensaje={caso.error.message} onReintentar={() => void caso.recargar()} />
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
              onReclamar={() => void onReclamar()}
              onDevolver={() => void onDevolver()}
              onResolver={onResolver}
              onCerrar={() => void onCerrar()}
            />
          )}
        </div>
      </Grid>
    </Stack>
  );
}
