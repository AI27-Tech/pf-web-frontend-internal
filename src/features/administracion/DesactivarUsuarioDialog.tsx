import { useReducer, useState } from 'react';
import { Button } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { DialogoAdministracion } from './DialogoAdministracion';
import { clasificarFallo, textoDeFallo, type OperacionAdministracion } from './clasificarError';
import {
  reducirDialogoConfirmacion,
  estaPendienteConfirmacion,
} from './dialogoConfirmacionReducer';
import { etiquetaUsuario } from './etiquetas';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';

export type ModoActivacion = 'desactivar' | 'reactivar';

interface DesactivarUsuarioDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly usuario: UsuarioResumen;
  readonly modo: ModoActivacion;
  readonly envio: EnvioUnico;
  readonly idEncabezadoSeccion: string;
  readonly onCompletado: (mensaje: string) => void;
}

const OPERACION: Record<ModoActivacion, OperacionAdministracion> = {
  desactivar: 'desactivarUsuario',
  reactivar: 'reactivarUsuario',
};

/**
 * Confirmación previa para desactivar (R8.1, R8.2) o reactivar un usuario. Ninguna
 * solicitud sale antes de confirmar. Desactivar avisa el corte en máximo 30 s y
 * que no cambia rol ni alcance (R8.4, R8.7). El último administrador lo explica el
 * motivo que devuelve el `bff` (R8.10), no la interfaz.
 */
export function DesactivarUsuarioDialog({
  abierto,
  onCerrar,
  usuario,
  modo,
  envio,
  idEncabezadoSeccion,
  onCompletado,
}: DesactivarUsuarioDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const [estado, despachar] = useReducer(reducirDialogoConfirmacion, 'cerrado');
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setErrorEnvio(null);
  });

  const pendiente = estaPendienteConfirmacion(estado);
  const desactivar = modo === 'desactivar';
  const clave = claveEnvio(OPERACION[modo], usuario.id);
  const puedeConfirmar = !pendiente && !envio.enCurso(clave);

  const cerrar = () => {
    despachar('cerrar');
    onCerrar();
  };

  const confirmar = async () => {
    if (!puedeConfirmar) return;

    despachar('confirmar');
    setErrorEnvio(null);
    try {
      const token = sesion?.accessToken ?? '';
      const resultado = await envio.enviar(clave, () =>
        desactivar
          ? port.desactivarUsuario(usuario.id, token)
          : port.reactivarUsuario(usuario.id, token),
      );
      if (!resultado.enviado) return;

      despachar('exito');
      onCompletado(mensajesDeExito(desactivar ? 'desactivarUsuario' : 'reactivarUsuario'));
      onCerrar();
    } catch (fallo) {
      const clasificado = clasificarFallo(OPERACION[modo], fallo);
      despachar('fallo');
      setErrorEnvio(textoDeFallo(clasificado));
    }
  };

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={cerrar}
      pendiente={pendiente}
      titulo={desactivar ? 'Desactivar usuario' : 'Reactivar usuario'}
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button
            variant={desactivar ? 'danger' : 'primary'}
            onClick={() => void confirmar()}
            disabled={!puedeConfirmar}
          >
            {pendiente ? TEXTOS.enviando : desactivar ? 'Desactivar' : 'Reactivar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>
          {desactivar ? '¿Desactivar a ' : '¿Reactivar a '}
          <strong>{etiquetaUsuario(usuario)}</strong>?
        </p>
        <p>{desactivar ? TEXTOS.desactivarCorte : TEXTOS.reactivarConfirmacion}</p>
        {errorEnvio && <p role="alert">{errorEnvio}</p>}
      </div>
    </DialogoAdministracion>
  );
}
