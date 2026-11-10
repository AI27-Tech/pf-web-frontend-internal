import { useReducer, useState } from 'react';
import { Button, Card, CardBody, FormSection, Modal, Radio } from '@ai27-tech/ui';
import { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { controlesDeAlcance, opcionesRolParaCambio } from './afordancias';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import {
  reducirDialogoConfirmacion,
  estaPendienteConfirmacion,
} from './dialogoConfirmacionReducer';
import { ETIQUETAS_ROL, mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import type { RelacionConSesion } from './relacionConSesion';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';

interface CambioRolDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly usuario: UsuarioResumen;
  readonly relacion: RelacionConSesion;
  /** Cerrojo de envío del padre. Vive fuera del diálogo para sobrevivir a su cierre. */
  readonly envio: EnvioUnico;
  readonly onCambiado: (mensaje: string) => void;
}

/**
 * Cambio de rol de un usuario (R5). Solo ofrece roles del mismo lado: un cliente no
 * cambia de rol y un interno no recibe `cliente`. Avisa que el cambio retira el
 * alcance actual del usuario (DEC-140 #3). Contra el puerto: no consume datos fuera
 * del puerto.
 */
export function CambioRolDialog({
  abierto,
  onCerrar,
  usuario,
  relacion,
  envio,
  onCambiado,
}: CambioRolDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const [estado, despachar] = useReducer(reducirDialogoConfirmacion, 'cerrado');
  const [rolElegido, setRolElegido] = useState<Rol | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setRolElegido(null);
    setErrorEnvio(null);
  });

  const pendiente = estaPendienteConfirmacion(estado);
  const opciones = opcionesRolParaCambio(usuario.rol);
  const clave = claveEnvio('fijarRol', usuario.id);
  const habilitado = usuario.activo && relacion === 'ajeno' && opciones.length > 0;
  const retiraAlcance =
    controlesDeAlcance(usuario.rol) !== null && rolElegido !== null && rolElegido !== usuario.rol;
  const puedeConfirmar = habilitado && rolElegido !== null && !pendiente && !envio.enCurso(clave);

  const cerrar = () => {
    despachar('cerrar');
    onCerrar();
  };

  const confirmar = async () => {
    if (!puedeConfirmar || rolElegido === null) return;

    despachar('confirmar');
    setErrorEnvio(null);
    try {
      const token = sesion?.accessToken ?? '';
      const resultado = await envio.enviar(clave, () =>
        port.fijarRol(usuario.id, rolElegido, token),
      );
      if (!resultado.enviado) return;

      despachar('exito');
      onCambiado(mensajesDeExito('cambioRol'));
      onCerrar();
    } catch (fallo) {
      despachar('fallo');
      setErrorEnvio(textoDeFallo(clasificarFallo('fijarRol', fallo, relacion)));
    }
  };

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) cerrar();
      }}
      title={TEXTOS.cambioRolTitulo}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
      footer={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="primary" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
            {pendiente ? TEXTOS.enviando : TEXTOS.cambiarRol}
          </Button>
        </>
      }
    >
      {opciones.length === 0 ? (
        <Card variant="outlined">
          <CardBody>
            <p>{TEXTOS.cambioRolDeClienteNoEditable}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <FormSection title={TEXTOS.cambioRolLeyenda}>
            {opciones.map((rol) => (
              <Radio
                key={rol}
                name={`cambio-rol-${usuario.id}`}
                value={rol}
                checked={rolElegido === rol}
                disabled={pendiente || !habilitado}
                onChange={() => setRolElegido(rol)}
                label={
                  rol === usuario.rol
                    ? `${ETIQUETAS_ROL[rol]} (${TEXTOS.rolActual})`
                    : ETIQUETAS_ROL[rol]
                }
              />
            ))}
          </FormSection>
          {retiraAlcance && (
            <Card variant="outlined">
              <CardBody>
                <p role="note">{TEXTOS.cambioRolRetiraAlcance}</p>
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
      )}
    </Modal>
  );
}
