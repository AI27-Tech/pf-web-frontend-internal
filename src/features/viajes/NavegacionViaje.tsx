/*
 * Pestañas de las secciones del viaje: detalle, ficha técnica, histórico y
 * expediente y evidencia (@ai27-tech/ui `Tabs`).
 *
 * Cada sección sigue siendo su propia ruta; la pestaña activa la marca `actual`
 * y el cambio navega a la ruta correspondiente. Cada pestaña aparece solo si el rol
 * tiene la capacidad de su sección (M4), la misma que guarda su ruta.
 */
import { Tab, TabList, Tabs } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '@/context/SessionContext';
import { puede } from '@/lib/permisos';

export type SeccionViaje = 'detalle' | 'ficha' | 'historico' | 'expediente';

export interface NavegacionViajeProps {
  readonly id: string;
  readonly actual: SeccionViaje;
}

export function NavegacionViaje({ id, actual }: NavegacionViajeProps) {
  const { usuario } = useSession();
  const navigate = useNavigate();

  const verFicha = puede(usuario?.rol, 'viaje.ficha.ver');
  const verHistorico = puede(usuario?.rol, 'viaje.historico.ver');
  const verExpediente = puede(usuario?.rol, 'monitoreo.consultar');

  const irA = (destino: SeccionViaje) => {
    switch (destino) {
      case 'detalle':
        return navigate({ to: '/viajes/$id', params: { id } });
      case 'ficha':
        return navigate({ to: '/viajes/$id/ficha', params: { id } });
      case 'historico':
        return navigate({ to: '/viajes/$id/historico', params: { id } });
      case 'expediente':
        return navigate({ to: '/viajes/$id/expediente', params: { id } });
    }
  };

  return (
    <Tabs
      value={actual}
      onChange={(valor) => {
        if (valor !== actual) void irA(valor as SeccionViaje);
      }}
    >
      <TabList>
        <Tab value="detalle">Detalle</Tab>
        {verFicha && <Tab value="ficha">Ficha técnica</Tab>}
        {verHistorico && <Tab value="historico">Histórico del viaje</Tab>}
        {verExpediente && <Tab value="expediente">Expediente y evidencia</Tab>}
      </TabList>
    </Tabs>
  );
}
