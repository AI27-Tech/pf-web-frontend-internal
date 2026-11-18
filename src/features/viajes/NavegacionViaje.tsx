/*
 * Pestañas de las secciones del viaje: detalle, ficha técnica, histórico y
 * expediente y evidencia (@ai27-tech/ui `Tabs`).
 *
 * Cada sección sigue siendo su propia ruta; la pestaña activa la marca `actual`
 * y el cambio navega a la ruta correspondiente. La visibilidad de cada pestaña
 * es la misma que tenían los botones que reemplaza.
 */
import { Tab, TabList, Tabs } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '@/context/SessionContext';
import { puedeUsarMonitoreo } from '@/features/monitoreo/puedeUsarMonitoreo';

export type SeccionViaje = 'detalle' | 'ficha' | 'historico' | 'expediente';

export interface NavegacionViajeProps {
  readonly id: string;
  readonly actual: SeccionViaje;
}

export function NavegacionViaje({ id, actual }: NavegacionViajeProps) {
  const { usuario } = useSession();
  const navigate = useNavigate();

  const verFicha = usuario?.rol === 'monitorista';
  const verExpediente = usuario ? puedeUsarMonitoreo(usuario.rol) : false;

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
        <Tab value="historico">Histórico del viaje</Tab>
        {verExpediente && <Tab value="expediente">Expediente y evidencia</Tab>}
      </TabList>
    </Tabs>
  );
}
