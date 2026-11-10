import { useReducer, useState } from 'react';
import { Button, Card, CardBody, FormField, Modal, Textarea } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { clasificarFallo, textoDeFallo } from './clasificarError';
import {
  reducirDialogoConfirmacion,
  estaPendienteConfirmacion,
} from './dialogoConfirmacionReducer';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import type { RelacionConSesion } from './relacionConSesion';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';
import { validarMotivo } from './validacion';

interface RevocarSesionesDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly usuario: UsuarioResumen;
  readonly relacion: RelacionConSesion;
  /** Cerrojo del padre. La revocación en curso sigue visible al cerrar el diálogo. */
  readonly envio: EnvioUnico;
  readonly onResultado: (mensaje: string) => void;
}

/**
 * Revocación masiva de las sesiones de un usuario (R11). Exige un motivo de texto
 * libre y confirmar queda deshabilitado mientras esté vacío (PA-1). No ofrece la
 * revocación sobre uno mismo: remite al cierre de sesión. No revoca por `sesion_id`.
 * El resultado se muestra tal como lo devuelve el `bff`, incluido "sin sesiones"
 * (R11.5, R11.6).
 */
export function RevocarSesionesDialog({
  abierto,
  onCerrar,
  usuario,
  relacion,
  envio,
  onResultado,
}: RevocarSesionesDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const [estado, despachar] = useReducer(reducirDialogoConfirmacion, 'cerrado');
  const [motivo, setMotivo] = useState('');
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setMotivo('');
    setErrorEnvio(null);
  });

  const pendiente = estaPendienteConfirmacion(estado);
  const clave = claveEnvio('revocarSesiones', usuario.id);
  const enCurso = envio.enCurso(clave);
  const motivoValidado = validarMotivo(motivo);
  const puedeConfirmar = relacion === 'ajeno' && motivoValidado.valido && !pendiente && !enCurso;

  const cerrar = () => {
    despachar('cerrar');
    onCerrar();
  };

  const confirmar = async () => {
    if (!puedeConfirmar || !motivoValidado.valido) return;

    despachar('confirmar');
    setErrorEnvio(null);
    try {
      const token = sesion?.accessToken ?? '';
      const resultado = await envio.enviar(clave, () =>
        port.revocarSesiones(usuario.id, motivoValidado.motivo, token),
      );
      if (!resultado.enviado) return;

      despachar('exito');
      onResultado(
        resultado.valor.sesionesRevocadas === 0
          ? TEXTOS.revocacionSinSesiones
          : mensajesDeExito('revocarSesiones'),
      );
      onCerrar();
    } catch (fallo) {
      despachar('fallo');
      setErrorEnvio(textoDeFallo(clasificarFallo('revocarSesiones', fallo, relacion)));
    }
  };

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) cerrar();
      }}
      title={TEXTOS.revocarSesiones}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
      footer={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="danger" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
            {pendiente ? TEXTOS.enviando : TEXTOS.revocarSesiones}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {relacion === 'propio' ? (
          <Card variant="outlined">
            <CardBody>
              <p>{TEXTOS.propioRevocacion}</p>
            </CardBody>
          </Card>
        ) : (
          <>
            <p>
              {TEXTOS.revocacionAlcance}{' '}
              <strong>
                {usuario.nombre ?? usuario.identificadorUsuario ?? TEXTOS.usuarioSinNombre}
              </strong>
              . {TEXTOS.revocacionCorte}
            </p>
            <FormField label={TEXTOS.revocacionMotivoEtiqueta} htmlFor="revocacion-motivo" required>
              <Textarea
                id="revocacion-motivo"
                rows={3}
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                disabled={pendiente}
              />
            </FormField>
          </>
        )}
        {enCurso && (
          <Card variant="outlined">
            <CardBody>
              <p role="status">{TEXTOS.revocacionEnCurso}</p>
            </CardBody>
          </Card>
        )}
        {errorEnvio && (
          <Card variant="outlined">
            <CardBody>
              <p role="alert">{errorEnvio}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </Modal>
  );
}
