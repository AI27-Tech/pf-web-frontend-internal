import { useState } from 'react';
import { Button } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { ApiError } from '@/lib/api/errors';

import { AccionesUsuario, type AccionUsuario } from './AccionesUsuario';
import { AlcanceEditor } from './AlcanceEditor';
import { CambioRolDialog } from './CambioRolDialog';
import { controlesDeAlcance } from './afordancias';
import { DesactivarUsuarioDialog } from './DesactivarUsuarioDialog';
import { EstadoBadge } from './EstadoBadge';
import { estadoConsulta } from './estadoConsulta';
import { etiquetaIdentificador, etiquetaUsuario } from './etiquetas';
import { RegionConsulta } from './RegionConsulta';
import { relacionConSesion } from './relacionConSesion';
import { ETIQUETAS_ROL, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { RevocarSesionesDialog } from './RevocarSesionesDialog';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useInvalidarAdministracion, useUsuario } from './consultasAdministracion';

interface PanelUsuarioProps {
  readonly usuarioId: string;
  readonly envio: EnvioUnico;
  /** Id del encabezado de esta sección: recibe el foco al cerrar un diálogo. */
  readonly idEncabezadoSeccion: string;
  readonly onVolver: () => void;
  readonly onAviso: (texto: string, tipo: 'exito' | 'error') => void;
}

type DialogoAbierto = 'cambiarRol' | 'desactivar' | 'reactivar' | 'revocar' | null;

/** Acciones que pueden estar en curso para un usuario (bloquean sus controles). */
const OPERACIONES_DEL_USUARIO = [
  'fijarRol',
  'desactivarUsuario',
  'reactivarUsuario',
  'revocarSesiones',
  'fijarAlcance',
] as const;

/**
 * Detalle de un usuario (R2.3, R2.6, R2.9). Ante un 404 dice que el usuario no está
 * disponible; ante otro error no muestra datos de otro usuario. Las acciones solo
 * aparecen con datos frescos: sobre datos de una consulta fallida no se actúa.
 */
export function PanelUsuario({
  usuarioId,
  envio,
  idEncabezadoSeccion,
  onVolver,
  onAviso,
}: PanelUsuarioProps) {
  const port = useAdministracionPort();
  const consulta = useUsuario(usuarioId);
  const invalidar = useInvalidarAdministracion();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  const [alcanceAbierto, setAlcanceAbierto] = useState(false);

  const noDisponible =
    consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 404;

  const estado = estadoConsulta({
    isLoading: consulta.isLoading,
    isError: consulta.isError,
    error: consulta.error,
    data: consulta.data,
  });

  const cabecera = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={onVolver}>
        {TEXTOS.volverUsuarios}
      </Button>
    </div>
  );

  if (noDisponible) {
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <p role="alert">{TEXTOS.usuarioNoDisponible}</p>
      </div>
    );
  }

  if (
    estado.estado === 'cargando' ||
    estado.estado === 'error' ||
    estado.estado === 'sin_acceso' ||
    estado.estado === 'brecha'
  ) {
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <RegionConsulta
          estado={estado.estado}
          etiqueta={TEXTOS.usuariosTitulo}
          onReintentar={() => void consulta.refetch()}
        />
      </div>
    );
  }

  const usuario = consulta.data;
  if (!usuario) return null;

  const relacion = relacionConSesion({ esPropio: usuario.esPropio ?? null });
  const enCurso = OPERACIONES_DEL_USUARIO.some((operacion) =>
    envio.enCurso(claveEnvio(operacion, usuario.id)),
  );
  const datos = (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="font-medium">{TEXTOS.columnaNombre}</dt>
      <dd>{etiquetaUsuario(usuario)}</dd>
      <dt className="font-medium">{TEXTOS.columnaIdentificador}</dt>
      <dd>{etiquetaIdentificador(usuario)}</dd>
      <dt className="font-medium">{TEXTOS.columnaRol}</dt>
      <dd>{usuario.rol ? ETIQUETAS_ROL[usuario.rol] : TEXTOS.sinRol}</dd>
      <dt className="font-medium">{TEXTOS.columnaEstado}</dt>
      <dd>
        <EstadoBadge activo={usuario.activo} />
      </dd>
      {usuario.organizacion && (
        <>
          <dt className="font-medium">{TEXTOS.columnaOrganizacion}</dt>
          <dd>{usuario.organizacion.nombre}</dd>
        </>
      )}
    </dl>
  );

  // Con datos viejos (consulta fallida) se muestra el detalle, pero no se ofrecen acciones.
  if (estado.estado === 'datos_desactualizado') {
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <RegionConsulta estado="datos_desactualizado" etiqueta={TEXTOS.usuariosTitulo}>
          {datos}
        </RegionConsulta>
      </div>
    );
  }

  const cerrarDialogo = () => setDialogo(null);
  const tieneAlcance = controlesDeAlcance(usuario.rol) !== null;

  return (
    <div className="flex flex-col gap-4">
      {cabecera}
      <h2 id={idEncabezadoSeccion} tabIndex={-1} className="text-lg font-semibold">
        {etiquetaUsuario(usuario)}
      </h2>
      {datos}

      <AccionesUsuario
        usuario={usuario}
        relacion={relacion}
        enCurso={enCurso}
        onAccion={(accion: AccionUsuario) => {
          if (accion === 'editarAlcance') setAlcanceAbierto(true);
          if (accion === 'cambiarRol') setDialogo('cambiarRol');
          if (accion === 'desactivar') setDialogo('desactivar');
          if (accion === 'reactivar') setDialogo('reactivar');
          if (accion === 'revocarSesiones') setDialogo('revocar');
        }}
      />

      {tieneAlcance && alcanceAbierto && port.capacidades.alcance && (
        <AlcanceEditor usuario={usuario} envio={envio} onAviso={onAviso} />
      )}

      <CambioRolDialog
        abierto={dialogo === 'cambiarRol'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        relacion={relacion}
        envio={envio}
        idEncabezadoSeccion={idEncabezadoSeccion}
        onCambiado={(mensaje) => {
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
      />
      <DesactivarUsuarioDialog
        abierto={dialogo === 'desactivar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        modo="desactivar"
        envio={envio}
        idEncabezadoSeccion={idEncabezadoSeccion}
        onCompletado={(mensaje) => {
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
      />
      <DesactivarUsuarioDialog
        abierto={dialogo === 'reactivar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        modo="reactivar"
        envio={envio}
        idEncabezadoSeccion={idEncabezadoSeccion}
        onCompletado={(mensaje) => {
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
      />
      <RevocarSesionesDialog
        abierto={dialogo === 'revocar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        relacion={relacion}
        envio={envio}
        idEncabezadoSeccion={idEncabezadoSeccion}
        onResultado={(mensaje) => onAviso(mensaje, 'exito')}
      />
    </div>
  );
}
