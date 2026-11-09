import { useReducer, useState } from 'react';
import { Button } from '@ai27-tech/ui';
import type { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { DialogoAdministracion } from './DialogoAdministracion';
import { controlesDeAlcance, opcionesRolParaCambio } from './afordancias';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import {
  reducirDialogoConfirmacion,
  estaPendienteConfirmacion,
} from './dialogoConfirmacionReducer';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import type { RelacionConSesion } from './relacionConSesion';
import { SelectorRol } from './SelectorRol';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';

interface CambioRolDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly usuario: UsuarioResumen;
  readonly relacion: RelacionConSesion;
  /** Cerrojo de envío del padre. Vive fuera del diálogo para sobrevivir a su cierre. */
  readonly envio: EnvioUnico;
  /** Id del encabezado de la sección que recibe el foco como respaldo. */
  readonly idEncabezadoSeccion: string;
  readonly onCambiado: (mensaje: string) => void;
}

/**
 * Cambio de rol de un usuario (R5). Solo ofrece roles del mismo lado: un cliente
 * no cambia de rol y un interno no recibe `cliente`. Avisa que el cambio retira
 * el alcance actual del usuario (DEC-140 #3). Contra el puerto falso: no consume
 * datos reales.
 */
export function CambioRolDialog({
  abierto,
  onCerrar,
  usuario,
  relacion,
  envio,
  idEncabezadoSeccion,
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
      // Una segunda confirmación que llega con el cerrojo tomado no emite nada.
      if (resultado === undefined) return;

      despachar('exito');
      onCambiado(mensajesDeExito('cambioRol'));
      onCerrar();
    } catch (fallo) {
      const clasificado = clasificarFallo('fijarRol', fallo, relacion);
      despachar('fallo');
      setErrorEnvio(textoDeFallo(clasificado));
    }
  };

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={cerrar}
      pendiente={pendiente}
      titulo="Cambiar rol"
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="primary" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
            {pendiente ? TEXTOS.enviando : 'Cambiar rol'}
          </Button>
        </>
      }
    >
      {opciones.length === 0 ? (
        <p>{TEXTOS.cambioRolDeClienteNoEditable}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <SelectorRol
            nombre={`cambio-rol-${usuario.id}`}
            leyenda="Nuevo rol"
            valor={rolElegido}
            onCambiar={setRolElegido}
            opciones={opciones}
            rolActual={usuario.rol}
            disabled={pendiente || !habilitado}
          />
          {retiraAlcance && <p role="note">{TEXTOS.cambioRolRetiraAlcance}</p>}
          {errorEnvio && <p role="alert">{errorEnvio}</p>}
        </div>
      )}
    </DialogoAdministracion>
  );
}
