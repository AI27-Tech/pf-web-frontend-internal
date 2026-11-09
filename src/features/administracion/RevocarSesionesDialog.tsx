import { useReducer, useState } from 'react';
import { Button, FormField, Textarea } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { DialogoAdministracion } from './DialogoAdministracion';
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
  readonly idEncabezadoSeccion: string;
  readonly onResultado: (mensaje: string) => void;
}

/**
 * Revocación masiva de las sesiones de un usuario (R11). Exige un motivo de texto
 * libre y confirmar queda deshabilitado mientras esté vacío (PA-1). No ofrece la
 * revocación sobre uno mismo: remite al cierre de sesión. No revoca por
 * `sesion_id`. El resultado se muestra tal como lo devuelve el `bff`, incluido
 * "sin sesiones" (R11.5, R11.6).
 */
export function RevocarSesionesDialog({
  abierto,
  onCerrar,
  usuario,
  relacion,
  envio,
  idEncabezadoSeccion,
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
      if (resultado === undefined) return;

      despachar('exito');
      onResultado(
        resultado.sinSesiones ? TEXTOS.revocacionSinSesiones : mensajesDeExito('revocarSesiones'),
      );
      onCerrar();
    } catch (fallo) {
      const clasificado = clasificarFallo('revocarSesiones', fallo, relacion);
      despachar('fallo');
      setErrorEnvio(textoDeFallo(clasificado));
    }
  };

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={cerrar}
      pendiente={pendiente}
      titulo="Revocar sesiones"
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="danger" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
            {pendiente ? TEXTOS.enviando : 'Revocar sesiones'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {relacion === 'propio' ? (
          <p>{TEXTOS.propioRevocacion}</p>
        ) : (
          <>
            <p>
              Se cerrarán las sesiones activas de <strong>{usuario.nombre}</strong>.{' '}
              {TEXTOS.revocacionCorte}
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
        {enCurso && <p role="status">{TEXTOS.revocacionEnCurso}</p>}
        {errorEnvio && <p role="alert">{errorEnvio}</p>}
      </div>
    </DialogoAdministracion>
  );
}
