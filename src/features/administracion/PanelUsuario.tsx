import { useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Card, CardBody, DescriptionList, Section } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { ApiError } from '@/lib/api/errors';
import { useAdministracionPort } from '@/context/AdministracionContext';

import { AccionesUsuario, type AccionUsuario } from './AccionesUsuario';
import { AlcanceEditor } from './AlcanceEditor';
import { CambioRolDialog } from './CambioRolDialog';
import { controlesDeAlcance } from './afordancias';
import { avisoDeEstado, estadoConsulta } from './estadoConsulta';
import { DesactivarUsuarioDialog } from './DesactivarUsuarioDialog';
import { etiquetaIdentificador, etiquetaUsuario } from './etiquetas';
import { ETIQUETAS_ROL, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { RevocarSesionesDialog } from './RevocarSesionesDialog';
import { relacionConSesion } from './relacionConSesion';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useInvalidarAdministracion, useUsuario } from './consultasAdministracion';

interface PanelUsuarioProps {
  readonly usuarioId: string;
  readonly envio: EnvioUnico;
  readonly onVolver: () => void;
  readonly onAviso: (texto: string, tipo: 'exito' | 'error') => void;
}

type DialogoAbierto = 'cambiarRol' | 'desactivar' | 'reactivar' | 'revocar' | null;

interface Dato {
  readonly etiqueta: string;
  readonly valor: ReactNode;
}

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
export function PanelUsuario({ usuarioId, envio, onVolver, onAviso }: PanelUsuarioProps) {
  const port = useAdministracionPort();
  const consulta = useUsuario(usuarioId);
  const invalidar = useInvalidarAdministracion();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  const [alcanceAbierto, setAlcanceAbierto] = useState(false);
  // Aviso de un rechazo del `bff` (403 o 409). Vive en el panel para sobrevivir a una
  // recarga fallida del detalle, que cambia lo que se renderiza (R7.4).
  const [rechazo, setRechazo] = useState<string | null>(null);
  const alRechazar = (texto: string | null) => {
    setRechazo(texto);
    void invalidar();
  };

  const noDisponible =
    consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 404;
  const estado = estadoConsulta({
    isLoading: consulta.isLoading,
    isError: consulta.isError,
    error: consulta.error,
    data: consulta.data,
  });
  const aviso = avisoDeEstado(estado.estado);
  const avisoRechazo = rechazo ? <Alert variant="danger">{rechazo}</Alert> : null;

  const volver = (
    <Button variant="ghost" size="sm" onClick={onVolver}>
      {TEXTOS.volverUsuarios}
    </Button>
  );

  if (noDisponible) {
    return (
      <div className="flex flex-col gap-3">
        {volver}
        <Alert variant="danger">{TEXTOS.usuarioNoDisponible}</Alert>
      </div>
    );
  }

  if (estado.estado === 'cargando') {
    return (
      <div className="flex flex-col gap-3">
        {volver}
        <Card variant="outlined">
          <CardBody>
            <p role="status">{TEXTOS.cargandoUsuario}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const usuario = consulta.data;
  if (!usuario) {
    // Error sin datos previos: el aviso de la consulta, con reintento.
    return (
      <div className="flex flex-col gap-3">
        {volver}
        {aviso && aviso.alerta && (
          <BloqueError mensaje={aviso.texto} onReintentar={() => void consulta.refetch()} />
        )}
        {aviso && !aviso.alerta && (
          <Alert variant="info">
            {aviso.texto}
            <Button variant="outline" size="sm" onClick={() => void consulta.refetch()}>
              {TEXTOS.reintentar}
            </Button>
          </Alert>
        )}
      </div>
    );
  }

  const relacion = relacionConSesion({ esPropio: usuario.esPropio ?? null });
  const enCurso = OPERACIONES_DEL_USUARIO.some((operacion) =>
    envio.enCurso(claveEnvio(operacion, usuario.id)),
  );
  const filas: Dato[] = [
    { etiqueta: TEXTOS.columnaNombre, valor: etiquetaUsuario(usuario) },
    { etiqueta: TEXTOS.columnaIdentificador, valor: etiquetaIdentificador(usuario) },
    {
      etiqueta: TEXTOS.columnaRol,
      valor: usuario.rol ? ETIQUETAS_ROL[usuario.rol] : TEXTOS.sinRol,
    },
    {
      etiqueta: TEXTOS.columnaEstado,
      valor: (
        <Badge variant={usuario.activo ? 'secure' : 'neutral'} dot>
          {usuario.activo ? TEXTOS.activo : TEXTOS.inactivo}
        </Badge>
      ),
    },
    ...(usuario.organizacion
      ? [{ etiqueta: TEXTOS.columnaOrganizacion, valor: usuario.organizacion.nombre }]
      : []),
  ];
  const tabla = (
    <DescriptionList items={filas.map((fila) => ({ label: fila.etiqueta, value: fila.valor }))} />
  );

  // Con datos viejos (consulta fallida) se muestra el detalle, pero no se ofrecen acciones.
  if (estado.estado === 'datos_desactualizado') {
    return (
      <div className="flex flex-col gap-3">
        {volver}
        {avisoRechazo}
        {aviso && <Alert variant="danger">{aviso.texto}</Alert>}
        {tabla}
      </div>
    );
  }

  const cerrarDialogo = () => setDialogo(null);
  const tieneAlcance = controlesDeAlcance(usuario.rol) !== null;

  return (
    <div className="flex flex-col gap-4">
      {volver}
      {/* Section pinta el título en un span: role y aria-level conservan el encabezado nivel 2. */}
      <Section
        title={
          <span role="heading" aria-level={2}>
            {etiquetaUsuario(usuario)}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          {avisoRechazo}
          {tabla}

          <AccionesUsuario
            usuario={usuario}
            relacion={relacion}
            enCurso={enCurso}
            onAccion={(accion: AccionUsuario) => {
              setRechazo(null);
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
        </div>
      </Section>

      <CambioRolDialog
        abierto={dialogo === 'cambiarRol'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        relacion={relacion}
        envio={envio}
        onCambiado={(mensaje) => {
          setRechazo(null);
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
        onRechazado={alRechazar}
      />
      <DesactivarUsuarioDialog
        abierto={dialogo === 'desactivar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        modo="desactivar"
        envio={envio}
        onCompletado={(mensaje) => {
          setRechazo(null);
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
        onRechazado={alRechazar}
      />
      <DesactivarUsuarioDialog
        abierto={dialogo === 'reactivar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        modo="reactivar"
        envio={envio}
        onCompletado={(mensaje) => {
          setRechazo(null);
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
        onRechazado={alRechazar}
      />
      <RevocarSesionesDialog
        abierto={dialogo === 'revocar'}
        onCerrar={cerrarDialogo}
        usuario={usuario}
        relacion={relacion}
        envio={envio}
        onResultado={(mensaje) => onAviso(mensaje, 'exito')}
      />
    </div>
  );
}
