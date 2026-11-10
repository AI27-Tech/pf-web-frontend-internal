import { useState } from 'react';
import { Button } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { Organizacion } from '@/lib/contracts/administracion';

import { DialogoAdministracion } from './DialogoAdministracion';
import { useConsecuenciaOrganizacion, useInvalidarAdministracion } from './consultasAdministracion';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import { etiquetaUsuario } from './etiquetas';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';

interface DesactivarOrganizacionDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly organizacion: Organizacion;
  readonly envio: EnvioUnico;
  readonly idEncabezadoSeccion: string;
  readonly onCompletado: (mensaje: string) => void;
}

/**
 * Desactivar una organización (R10). Antes de confirmar consulta la consecuencia: los
 * usuarios activos que perderían el acceso, tal como los devuelve el `bff`. Confirmar
 * solo está disponible con la consecuencia lista. Desactivar es terminal y no afirma
 * plazos ni revocación de sesiones (PA-8).
 */
export function DesactivarOrganizacionDialog({
  abierto,
  onCerrar,
  organizacion,
  envio,
  idEncabezadoSeccion,
  onCompletado,
}: DesactivarOrganizacionDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const invalidar = useInvalidarAdministracion();
  const consecuencia = useConsecuenciaOrganizacion(organizacion.id, abierto);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const clave = claveEnvio('desactivarOrganizacion', organizacion.id);
  const pendiente = envio.enCurso(clave);
  const listo = consecuencia.isSuccess && !pendiente;
  const puedeConfirmar = listo;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setErrorEnvio(null);
    try {
      const token = sesion?.accessToken ?? '';
      const resultado = await envio.enviar(clave, () =>
        port.desactivarOrganizacion(organizacion.id, token),
      );
      if (!resultado.enviado) return;
      onCompletado(mensajesDeExito('desactivarOrganizacion'));
      await invalidar();
      onCerrar();
    } catch (fallo) {
      setErrorEnvio(textoDeFallo(clasificarFallo('desactivarOrganizacion', fallo)));
    }
  };

  const contenido = () => {
    if (consecuencia.isPending) return <p role="status">{TEXTOS.organizacionConsultando}</p>;
    if (consecuencia.isError) {
      return (
        <div className="flex flex-col gap-2">
          <p role="alert">{TEXTOS.organizacionConsecuenciaError}</p>
          <Button variant="outline" size="sm" onClick={() => void consecuencia.refetch()}>
            {TEXTOS.reintentar}
          </Button>
        </div>
      );
    }
    const datos = consecuencia.data;
    if (!datos) return null;
    if (datos.usuariosActivos === 0) return <p>{TEXTOS.organizacionSinUsuarios}</p>;
    return (
      <div className="flex flex-col gap-2">
        <p>{TEXTOS.organizacionConsecuencia(datos.usuariosActivos)}</p>
        <ul className="list-disc pl-5 text-sm">
          {datos.usuarios.map((usuario, indice) => (
            <li key={indice}>{etiquetaUsuario(usuario)}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={onCerrar}
      pendiente={pendiente}
      titulo={`Desactivar ${organizacion.nombre}`}
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="danger" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
            {pendiente ? TEXTOS.enviando : TEXTOS.desactivar}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{TEXTOS.organizacionDesactivarAviso}</p>
        {contenido()}
        {errorEnvio && <p role="alert">{errorEnvio}</p>}
      </div>
    </DialogoAdministracion>
  );
}
