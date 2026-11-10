import { Button, Card, CardBody } from '@ai27-tech/ui';

import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { capacidades, controlesDeAlcance } from './afordancias';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import type { RelacionConSesion } from './relacionConSesion';

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
 * Acciones sobre un usuario, habilitadas según `capacidades`. Una acción bloqueada
 * queda deshabilitada y su motivo se muestra. Como un control deshabilitado no
 * dispara `onAccion` por ningún medio, no sale ninguna solicitud sobre un objetivo
 * bloqueado (R7.2, R7.5, R8.8).
 */
export function AccionesUsuario({ usuario, relacion, enCurso, onAccion }: AccionesUsuarioProps) {
  const permisos = capacidades(usuario, relacion, enCurso);
  const tieneAlcance = controlesDeAlcance(usuario.rol) !== null;
  const idMotivo = `acciones-motivo-${usuario.id}`;
  const describir = permisos.motivoBloqueo ? idMotivo : undefined;

  const disparar = (accion: AccionUsuario, habilitada: boolean) => {
    if (habilitada) onAccion(accion);
  };

  return (
    <section aria-labelledby={`acciones-usuario-${usuario.id}`} className="flex flex-col gap-3">
      <h3 id={`acciones-usuario-${usuario.id}`} tabIndex={-1} className="font-semibold">
        {TEXTOS.accionesTitulo}
      </h3>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!permisos.puedeCambiarRol}
          aria-describedby={describir}
          onClick={() => disparar('cambiarRol', permisos.puedeCambiarRol)}
        >
          {TEXTOS.cambiarRol}
        </Button>

        {tieneAlcance && (
          <Button
            variant="outline"
            disabled={!permisos.puedeEditarAlcance}
            aria-describedby={describir}
            onClick={() => disparar('editarAlcance', permisos.puedeEditarAlcance)}
          >
            {TEXTOS.editarAlcance}
          </Button>
        )}

        {usuario.activo ? (
          <Button
            variant="danger"
            disabled={!permisos.puedeDesactivar}
            onClick={() => disparar('desactivar', permisos.puedeDesactivar)}
          >
            {TEXTOS.desactivar}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={!permisos.puedeReactivar}
            onClick={() => disparar('reactivar', permisos.puedeReactivar)}
          >
            {TEXTOS.reactivar}
          </Button>
        )}

        {relacion !== 'propio' && (
          <Button
            variant="danger"
            disabled={!permisos.puedeRevocarSesiones}
            onClick={() => disparar('revocarSesiones', permisos.puedeRevocarSesiones)}
          >
            {TEXTOS.revocarSesiones}
          </Button>
        )}
      </div>

      {permisos.motivoBloqueo && (
        <Card variant="outlined">
          <CardBody>
            <p id={idMotivo} role="note">
              {permisos.motivoBloqueo}
            </p>
          </CardBody>
        </Card>
      )}

      {relacion === 'propio' && (
        <Card variant="outlined">
          <CardBody>
            <p>{TEXTOS.propioRevocacion}</p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
