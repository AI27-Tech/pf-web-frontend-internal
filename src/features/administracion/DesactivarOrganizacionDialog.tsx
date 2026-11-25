import { useState } from 'react';
import { Alert, Button, Card, CardBody, Modal, Table, type Column } from '@ai27-tech/ui';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { Organizacion } from '@/lib/contracts/administracion';

import { useConsecuenciaOrganizacion, useInvalidarAdministracion } from './consultasAdministracion';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import { etiquetaIdentificador, etiquetaUsuario } from './etiquetas';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';

interface DesactivarOrganizacionDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly organizacion: Organizacion;
  readonly envio: EnvioUnico;
  readonly onCompletado: (mensaje: string) => void;
}

/** Fila de la consecuencia: solo el nombre y el identificador que devuelve el `bff`. */
interface FilaConsecuencia {
  readonly fila: string;
  readonly nombre?: string | undefined;
  readonly identificadorUsuario?: string | undefined;
}

const COLUMNAS_CONSECUENCIA: Column<FilaConsecuencia>[] = [
  { key: 'nombre', header: TEXTOS.columnaNombre, cell: (fila) => etiquetaUsuario(fila) },
  {
    key: 'identificador',
    header: TEXTOS.columnaIdentificador,
    cell: (fila) => etiquetaIdentificador(fila),
  },
];

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
  onCompletado,
}: DesactivarOrganizacionDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const invalidar = useInvalidarAdministracion();
  const consecuencia = useConsecuenciaOrganizacion(organizacion.id, abierto);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const clave = claveEnvio('desactivarOrganizacion', organizacion.id);
  const pendiente = envio.enCurso(clave);
  const puedeConfirmar = consecuencia.isSuccess && !pendiente;

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

  const usuarios = consecuencia.data?.usuarios ?? [];

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) onCerrar();
      }}
      title={`${TEXTOS.desactivarOrganizacionTitulo}: ${organizacion.nombre}`}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
      footer={
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
        <Card variant="outlined">
          <CardBody>
            <p>{TEXTOS.organizacionDesactivarAviso}</p>
          </CardBody>
        </Card>

        {consecuencia.isPending && <p role="status">{TEXTOS.organizacionConsultando}</p>}

        {consecuencia.isError && (
          <BloqueError
            mensaje={TEXTOS.organizacionConsecuenciaError}
            onReintentar={() => void consecuencia.refetch()}
          />
        )}

        {consecuencia.isSuccess && (
          <>
            <p>{TEXTOS.organizacionConsecuencia(consecuencia.data.usuariosActivos)}</p>
            {consecuencia.data.usuariosActivos > 0 && (
              <Table<FilaConsecuencia>
                columns={COLUMNAS_CONSECUENCIA}
                data={usuarios.map((usuario, indice) => ({ ...usuario, fila: String(indice) }))}
                rowKey={(fila) => fila.fila}
                emptyState={TEXTOS.organizacionSinUsuarios}
                aria-label={TEXTOS.consecuenciaUsuarios}
              />
            )}
            {consecuencia.data.usuariosActivos === 0 && (
              <Card variant="outlined">
                <CardBody>
                  <p>{TEXTOS.organizacionSinUsuarios}</p>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {errorEnvio && <Alert variant="danger">{errorEnvio}</Alert>}
      </div>
    </Modal>
  );
}
