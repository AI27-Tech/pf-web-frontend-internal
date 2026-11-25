/*
 * Transferir una conversación de solicitud a otro usuario de `cotizacion` (E10-HU-038, 15.8).
 *
 * El destino es el `UsuarioAdmin.id` (no el `sub`): `mensajeria` lo traduce y valida el rol
 * (DEC-148 #74). Solo el `administrador` puede listar usuarios; si el listado responde `403`
 * (`cotizacion` hoy, Q-D de `BRECHAS.md`) no hay selector posible y se explica. En conversaciones
 * del viaje y en emergencias no existe este diálogo: el destino sería el `sub` (DT-28).
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  Modal,
  Select,
  SkeletonText,
  Stack,
  Textarea,
} from '@ai27-tech/ui';
import { esProhibido } from '@/lib/api/errors';
import { useDestinosTransferencia } from './useDestinosTransferencia';

interface DialogoTransferirProps {
  readonly abierto: boolean;
  readonly sujetoId: string;
  readonly enviando: boolean;
  readonly onCerrar: () => void;
  /** Devuelve el error de la transferencia, o `null` si salió bien (el panel ya se recargó). */
  readonly onTransferir: (destinoId: string, motivo: string) => Promise<Error | null>;
}

export function DialogoTransferir({
  abierto,
  sujetoId,
  enviando,
  onCerrar,
  onTransferir,
}: DialogoTransferirProps) {
  const destinos = useDestinosTransferencia(abierto);
  const [destinoId, setDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const opciones = (destinos.data ?? [])
    .filter((usuario) => !usuario.es_propio && usuario.id !== sujetoId)
    .map((usuario) => ({
      value: usuario.id,
      label: usuario.nombre ?? usuario.identificador_usuario ?? usuario.id,
    }));
  const sinPermisoParaListar = esProhibido(destinos.error);

  const confirmar = async () => {
    setError(null);
    const fallo = await onTransferir(destinoId, motivo.trim());
    if (fallo) setError(fallo.message);
    else onCerrar();
  };

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!enviando) onCerrar();
      }}
      title="Transferir conversación"
      closeOnEsc={!enviando}
      closeOnOverlayClick={!enviando}
      showCloseButton={!enviando}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} disabled={destinoId === '' || enviando}>
            {enviando ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </>
      }
    >
      <Stack gap={3}>
        <p>
          Tu reclamo se cierra y se abre el de la persona que elijas, en una sola operación. La
          historia de la conversación se conserva.
        </p>
        {destinos.isPending ? (
          <div role="status" aria-label="Cargando usuarios de Cotización">
            <SkeletonText lines={2} />
          </div>
        ) : sinPermisoParaListar ? (
          <Alert variant="info">
            Tu rol no puede consultar la lista de usuarios de Cotización, así que no se puede elegir
            a quién transferir. Pídele la transferencia al Administrador.
          </Alert>
        ) : destinos.isError ? (
          <Alert variant="danger">No se pudo cargar la lista de usuarios de Cotización.</Alert>
        ) : opciones.length === 0 ? (
          <Alert variant="info">No hay otros usuarios activos de Cotización.</Alert>
        ) : (
          <>
            <FormField label="Destino" htmlFor="transferir-destino" required>
              <Select
                placeholder="Elige a una persona de Cotización"
                value={destinoId}
                disabled={enviando}
                options={opciones}
                onChange={(valor) => setDestinoId(String(valor))}
              />
            </FormField>
            <FormField label="Motivo" htmlFor="transferir-motivo">
              <Textarea
                id="transferir-motivo"
                rows={3}
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                disabled={enviando}
              />
            </FormField>
          </>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
      </Stack>
    </Modal>
  );
}
