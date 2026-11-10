import { useRef, useState } from 'react';
import { Button, Toast, ToastContainer } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';

import { AltaUsuarioDialog } from './AltaUsuarioDialog';
import { PanelUsuario } from './PanelUsuario';
import { RegionConsulta } from './RegionConsulta';
import { SeccionOrganizaciones } from './SeccionOrganizaciones';
import { SeccionUsuarios } from './SeccionUsuarios';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { useEnvioUnico } from './useEnvioUnico';

export type SeccionAdministracion = 'usuarios' | 'organizaciones';

interface Aviso {
  readonly id: number;
  readonly texto: string;
  readonly tipo: 'exito' | 'error';
}

interface AdministracionAutorizadaProps {
  readonly seccion: SeccionAdministracion;
  /** Usuario abierto desde `?usuario=`. Si existe, se muestra su detalle. */
  readonly usuarioId: string | null;
  readonly onCambiarSeccion: (seccion: SeccionAdministracion) => void;
  readonly onAbrirUsuario: (id: string | null) => void;
}

const SECCIONES: readonly { readonly id: SeccionAdministracion; readonly etiqueta: string }[] = [
  { id: 'usuarios', etiqueta: TEXTOS.usuariosTitulo },
  { id: 'organizaciones', etiqueta: TEXTOS.organizacionesTitulo },
];

/**
 * Contenido de la administración para quien tiene el rol. Cada sección muestra el
 * estado de brecha si el puerto no publica su capacidad. El cerrojo de envío vive
 * aquí: sobrevive al cierre de los diálogos, y la revocación en curso sigue visible.
 * No decide nada con el rol local: ese control vive en `Administracion`.
 */
export function AdministracionAutorizada({
  seccion,
  usuarioId,
  onCambiarSeccion,
  onAbrirUsuario,
}: AdministracionAutorizadaProps) {
  const port = useAdministracionPort();
  const envio = useEnvioUnico();
  const [avisos, setAvisos] = useState<readonly Aviso[]>([]);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const contador = useRef(0);

  const aviso = (texto: string, tipo: 'exito' | 'error') => {
    if (!texto) return;
    contador.current += 1;
    const id = contador.current;
    setAvisos((previos) => [...previos, { id, texto, tipo }]);
  };

  const publicada =
    seccion === 'usuarios' ? port.capacidades.usuarios : port.capacidades.organizaciones;

  const contenido = () => {
    if (!publicada) {
      return (
        <RegionConsulta
          estado="brecha"
          etiqueta={seccion === 'usuarios' ? TEXTOS.usuariosTitulo : TEXTOS.organizacionesTitulo}
        />
      );
    }
    if (seccion === 'organizaciones') {
      return <SeccionOrganizaciones envio={envio} onAviso={aviso} />;
    }
    if (usuarioId !== null) {
      return (
        <PanelUsuario
          usuarioId={usuarioId}
          envio={envio}
          idEncabezadoSeccion="administracion-seccion-usuarios"
          onVolver={() => onAbrirUsuario(null)}
          onAviso={aviso}
        />
      );
    }
    return (
      <>
        <SeccionUsuarios
          onAbrirUsuario={(id) => onAbrirUsuario(id)}
          onNuevoUsuario={() => setAltaAbierta(true)}
        />
        <AltaUsuarioDialog
          abierto={altaAbierta}
          onCerrar={() => setAltaAbierta(false)}
          envio={envio}
          idEncabezadoSeccion="administracion-seccion-usuarios"
          onAlta={(mensaje) => aviso(mensaje, 'exito')}
        />
      </>
    );
  };

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

      {contenido()}

      <ToastContainer position="bottom-right">
        {avisos.map((item) => (
          <Toast
            key={item.id}
            variant={item.tipo === 'exito' ? 'success' : 'error'}
            duration={6000}
            onClose={() =>
              setAvisos((previos) => previos.filter((previo) => previo.id !== item.id))
            }
          >
            {item.texto}
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
}
