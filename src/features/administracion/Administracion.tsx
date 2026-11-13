import { Alert, PageHeader } from '@ai27-tech/ui';

import { useSession } from '@/context/SessionContext';

import { AdministracionAutorizada, type SeccionAdministracion } from './AdministracionAutorizada';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { puedeAdministrar } from './puedeAdministrar';

interface AdministracionProps {
  readonly seccion: SeccionAdministracion;
  readonly usuarioId: string | null;
  readonly onCambiarSeccion: (seccion: SeccionAdministracion) => void;
  readonly onAbrirUsuario: (id: string | null) => void;
}

/**
 * Pantalla `/administracion` (E8-T19). El título siempre es visible. Sin sesión o
 * con un rol distinto de `administrador`, muestra el aviso de acceso no autorizado y
 * no monta `AdministracionAutorizada`: no hay controles, ni consultas, ni llamadas
 * al puerto.
 */
export function Administracion({
  seccion,
  usuarioId,
  onCambiarSeccion,
  onAbrirUsuario,
}: AdministracionProps) {
  const { usuario } = useSession();
  const autorizado = usuario !== null && puedeAdministrar(usuario.rol);

  return (
    <section aria-labelledby="administracion-titulo" className="flex flex-col gap-4 p-6">
      <PageHeader
        title={
          <span id="administracion-titulo" tabIndex={-1}>
            Administración
          </span>
        }
      />

      {autorizado ? (
        <AdministracionAutorizada
          seccion={seccion}
          usuarioId={usuarioId}
          onCambiarSeccion={onCambiarSeccion}
          onAbrirUsuario={onAbrirUsuario}
        />
      ) : (
        <Alert variant="danger">{TEXTOS.accesoNoAutorizado}</Alert>
      )}
    </section>
  );
}
