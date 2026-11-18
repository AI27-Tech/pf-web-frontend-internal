/*
 * Cascarón de las vistas del viaje (E8-T8 / E8-T13).
 *
 * Dibuja el encabezado con el título de la sección, el estado y las condiciones del
 * viaje, la activación de emergencia y las pestañas. El contenido de cada sección va
 * en `children`. Lo monta la ruta padre `/viajes/$id`; las pruebas lo montan igual.
 */
import { useState, type ReactNode } from 'react';
import { Badge, Breadcrumb, Inline, PageHeader, Stack } from '@ai27-tech/ui';
import { EnlaceRuta } from '@/components/layout/EnlaceRuta';
import { useSession } from '@/context/SessionContext';
import { badgeDeEstado } from '@/features/monitoreo/dashboard/estadoBadge';
import { AccionEmergencia } from '@/features/emergencias/activacion/AccionEmergencia';
import { puedeMostrarActivacion } from '@/features/emergencias/afordancias';
import { useDetalleViaje } from './detalle/useDetalleViaje';
import { ActivacionEmergenciaContext } from './activacionEmergenciaContexto';
import { NavegacionViaje, type SeccionViaje } from './NavegacionViaje';
import type { EmergenciaViaje } from '@/lib/contracts/emergencias';

/** Etiqueta de cada sección distinta del detalle, usada en la migaja y el título. */
const ETIQUETA_SECCION: Record<Exclude<SeccionViaje, 'detalle'>, string> = {
  ficha: 'Ficha técnica',
  historico: 'Histórico',
  expediente: 'Expediente',
};

export interface ViajeShellProps {
  readonly id: string;
  readonly seccion: SeccionViaje;
  readonly children: ReactNode;
}

export function ViajeShell({ id, seccion, children }: ViajeShellProps) {
  const { usuario } = useSession();
  const d = useDetalleViaje(id);
  const [casoActivado, setCasoActivado] = useState<EmergenciaViaje | null>(null);

  const viaje = d.viaje;
  const descriptorEstado = viaje ? badgeDeEstado(viaje.estado) : null;
  const incidenciaAbierta = d.condicionesActivas.find((c) => c.tipo === 'INCIDENCIA');

  const titulo =
    seccion === 'detalle'
      ? `Detalle del Viaje: ${id}`
      : seccion === 'ficha'
        ? 'Ficha técnica del viaje'
        : seccion === 'historico'
          ? `Histórico del viaje: ${id}`
          : 'Expediente del viaje';

  const migas =
    seccion === 'detalle'
      ? [{ label: 'Viajes', href: '/viajes', as: EnlaceRuta }, { label: `Viaje ${id}` }]
      : [
          { label: 'Viajes', href: '/viajes', as: EnlaceRuta },
          { label: `Viaje ${id}`, href: `/viajes/${id}`, as: EnlaceRuta },
          { label: ETIQUETA_SECCION[seccion] },
        ];

  return (
    <ActivacionEmergenciaContext.Provider value={{ casoActivado }}>
      <Stack gap={4}>
        <PageHeader
          title={
            <Inline gap={2} align="center">
              <span>{titulo}</span>
              {viaje && descriptorEstado && (
                <Badge
                  variant={descriptorEstado.variant}
                  appearance={descriptorEstado.appearance}
                  dot={descriptorEstado.dot}
                  pulse={descriptorEstado.pulse}
                >
                  {viaje.estado}
                </Badge>
              )}
              {viaje && !incidenciaAbierta && <Badge variant="neutral">Sin incidencias</Badge>}
              {d.condicionesActivas.map((c) => (
                <Badge key={c.tipo} variant="warning" dot>
                  {c.tipo}
                </Badge>
              ))}
            </Inline>
          }
          breadcrumb={<Breadcrumb items={migas} />}
          actions={
            viaje && usuario && puedeMostrarActivacion(usuario.rol, viaje.estado) ? (
              <AccionEmergencia
                viajeId={id}
                onActivada={setCasoActivado}
                onViajeTerminal={() => void d.reintentar()}
              />
            ) : undefined
          }
        />
        <NavegacionViaje id={id} actual={seccion} />
        {children}
      </Stack>
    </ActivacionEmergenciaContext.Provider>
  );
}
