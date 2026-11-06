import { Button } from '@ai27-tech/ui';

import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { capacidades, controlesDeAlcance } from './afordancias';
import type { RelacionConSesion } from './relacionConSesion';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';

export type AccionUsuario =
  'cambiarRol' | 'editarAlcance' | 'desactivar' | 'reactivar' | 'revocarSesiones';

interface AccionesUsuarioProps {
  readonly usuario: UsuarioResumen;
  readonly relacion: RelacionConSesion;
  /** Hay una solicitud en curso para este usuario. */
  readonly enCurso: boolean;
  /** Recibe la intención. El llamador decide cuándo llamar al puerto. */
  readonly onAccion: (accion: AccionUsuario) => void;
}

/**
 * Acciones sobre un usuario, habilitadas según `capacidades`. Las acciones
 * bloqueadas quedan deshabilitadas con el motivo visible. Como una acción
 * deshabilitada no dispara `onAccion` por ningún medio, no se emite ninguna
 * solicitud sobre un objetivo bloqueado (R7.2, R7.5, R8.8).
 */
export function AccionesUsuario({ usuario, relacion, enCurso, onAccion }: AccionesUsuarioProps) {
  const permisos = capacidades(usuario, relacion, enCurso);
  const tipoAlcance = controlesDeAlcance(usuario.rol);
  const idMotivo = `acciones-motivo-${usuario.id}`;

  const disparar = (accion: AccionUsuario, habilitada: boolean) => {
    if (habilitada) onAccion(accion);
  };

  return (
    <section aria-labelledby={`acciones-usuario-${usuario.id}`} className="flex flex-col gap-3">
      <h3 id={`acciones-usuario-${usuario.id}`} tabIndex={-1} className="font-semibold">
        Acciones
      </h3>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!permisos.puedeCambiarRol}
          aria-describedby={permisos.motivoBloqueo ? idMotivo : undefined}
          onClick={() => disparar('cambiarRol', permisos.puedeCambiarRol)}
        >
          Cambiar rol
        </Button>

        {tipoAlcance !== null && (
          <Button
            variant="outline"
            disabled={!permisos.puedeEditarAlcance}
            aria-describedby={permisos.motivoBloqueo ? idMotivo : undefined}
            onClick={() => disparar('editarAlcance', permisos.puedeEditarAlcance)}
          >
            Editar alcance
          </Button>
        )}

        {usuario.activo ? (
          <Button
            variant="danger"
            disabled={!permisos.puedeDesactivar}
            onClick={() => disparar('desactivar', permisos.puedeDesactivar)}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={!permisos.puedeReactivar}
            onClick={() => disparar('reactivar', permisos.puedeReactivar)}
          >
            Reactivar
          </Button>
        )}

        {relacion !== 'propio' && (
          <Button
            variant="danger"
            disabled={!permisos.puedeRevocarSesiones}
            onClick={() => disparar('revocarSesiones', permisos.puedeRevocarSesiones)}
          >
            Revocar sesiones
          </Button>
        )}
      </div>

      <AvisoBloqueo id={idMotivo} motivo={permisos.motivoBloqueo} />

      {relacion === 'propio' && <p>{TEXTOS.propioRevocacion}</p>}
    </section>
  );
}

interface AvisoBloqueoProps {
  readonly id: string;
  readonly motivo: string | null;
}

/** Motivo visible del bloqueo de rol y alcance. Asociado a los controles por `aria-describedby`. */
export function AvisoBloqueo({ id, motivo }: AvisoBloqueoProps) {
  if (motivo === null) return null;
  return (
    <p id={id} role="note" className="text-sm">
      {motivo}
    </p>
  );
}
