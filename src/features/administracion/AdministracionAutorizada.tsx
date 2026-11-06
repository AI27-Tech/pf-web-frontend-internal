import { Button } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';

import { RegionConsulta } from './RegionConsulta';

export type SeccionAdministracion = 'usuarios' | 'organizaciones';

interface AdministracionAutorizadaProps {
  readonly seccion: SeccionAdministracion;
  /** Usuario seleccionado en `?usuario=`. Lo consumirá el panel de detalle (tarea 9.2). */
  readonly usuarioId: string | null;
  readonly onCambiarSeccion: (seccion: SeccionAdministracion) => void;
}

const SECCIONES: readonly { readonly id: SeccionAdministracion; readonly etiqueta: string }[] = [
  { id: 'usuarios', etiqueta: 'Usuarios' },
  { id: 'organizaciones', etiqueta: 'Organizaciones' },
];

/**
 * Contenido de la administración para quien tiene el rol. Cada sección muestra
 * el estado de brecha mientras el `bff` no publique su capacidad. No decide nada
 * con el rol local: ese control vive en `Administracion`.
 */
export function AdministracionAutorizada({
  seccion,
  onCambiarSeccion,
}: AdministracionAutorizadaProps) {
  const port = useAdministracionPort();
  const etiqueta = SECCIONES.find((item) => item.id === seccion)?.etiqueta ?? '';
  const publicada =
    seccion === 'usuarios' ? port.capacidades.usuarios : port.capacidades.organizaciones;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Secciones de administración" className="flex gap-2">
        {SECCIONES.map((item) => {
          const activa = item.id === seccion;
          return (
            <Button
              key={item.id}
              variant={activa ? 'primary' : 'outline'}
              aria-current={activa ? 'page' : undefined}
              onClick={() => onCambiarSeccion(item.id)}
            >
              {item.etiqueta}
            </Button>
          );
        })}
      </nav>

      <section aria-labelledby={`administracion-seccion-${seccion}`}>
        <h2
          id={`administracion-seccion-${seccion}`}
          tabIndex={-1}
          className="text-lg font-semibold"
        >
          {etiqueta}
        </h2>
        {/* Con la capacidad publicada, el contenido llega en las tareas 8 a 15 (Bloque B). */}
        <RegionConsulta
          estado={publicada ? 'vacio' : 'brecha'}
          etiqueta={etiqueta}
          textoVacio="Esta sección se conecta en la siguiente etapa."
        />
      </section>
    </div>
  );
}
