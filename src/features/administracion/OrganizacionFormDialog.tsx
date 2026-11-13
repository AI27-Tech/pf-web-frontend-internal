import { useReducer, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input, Modal } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { Organizacion } from '@/lib/contracts/administracion';

import { clasificarFallo, textoDeFallo } from './clasificarError';
import { estaPendienteFormulario, reducirDialogoFormulario } from './dialogoFormularioReducer';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';
import { validarOrganizacion, type CampoOrganizacion } from './validacion';

interface OrganizacionFormDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  /** Sin organización, el diálogo crea. Con una, edita nombre, correo y teléfono. */
  readonly organizacion?: Organizacion;
  readonly envio: EnvioUnico;
  readonly onGuardada: (mensaje: string) => void;
}

/**
 * Crear o editar una organización de Cliente (R9.1 a R9.12). Nombre, correo (con `@`)
 * y teléfono son obligatorios. El tenant es solo lectura y no hay organización padre.
 * No hay acción de reactivar: desactivar es terminal (PA-8). Ante un nombre duplicado,
 * el formulario conserva lo capturado.
 */
export function OrganizacionFormDialog({
  abierto,
  onCerrar,
  organizacion,
  envio,
  onGuardada,
}: OrganizacionFormDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const [estado, despachar] = useReducer(reducirDialogoFormulario, 'cerrado');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errores, setErrores] = useState<Partial<Record<CampoOrganizacion, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  // Id del alta: se genera al abrir y se reutiliza al reintentar (DEC-144 #2).
  const idAlta = useRef<string>('');

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setNombre(organizacion?.nombre ?? '');
    setCorreo(organizacion?.correo ?? '');
    setTelefono(organizacion?.telefono ?? '');
    setErrores({});
    setErrorGeneral(null);
    idAlta.current = crypto.randomUUID();
  });

  const pendiente = estaPendienteFormulario(estado);
  const clave = organizacion
    ? claveEnvio('editarOrganizacion', organizacion.id)
    : claveEnvio('crearOrganizacion', 'nueva');

  const cerrar = () => {
    despachar('cerrar');
    onCerrar();
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (pendiente || envio.enCurso(clave)) return;

    const validacion = validarOrganizacion({ nombre, correo, telefono });
    if (!validacion.valido) {
      setErrores(validacion.errores);
      setErrorGeneral(null);
      despachar('fallo_de_campo');
      return;
    }

    setErrores({});
    setErrorGeneral(null);
    despachar('enviar');
    try {
      const token = sesion?.accessToken ?? '';
      const datos = validacion.datos;
      const resultado = await envio.enviar(clave, () =>
        organizacion
          ? port.editarOrganizacion(organizacion.id, datos, token)
          : port.crearOrganizacion({ ...datos, id: idAlta.current }, token),
      );
      if (!resultado.enviado) return;

      despachar('exito');
      onGuardada(mensajesDeExito('guardarOrganizacion'));
      onCerrar();
    } catch (fallo) {
      despachar('fallo_general');
      setErrorGeneral(
        textoDeFallo(
          clasificarFallo(organizacion ? 'editarOrganizacion' : 'crearOrganizacion', fallo),
        ),
      );
    }
  };

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) cerrar();
      }}
      title={organizacion ? TEXTOS.editarOrganizacionTitulo : TEXTOS.nuevaOrganizacionTitulo}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
      footer={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="primary" type="submit" form="organizacion-form" disabled={pendiente}>
            {pendiente ? TEXTOS.enviando : TEXTOS.guardar}
          </Button>
        </>
      }
    >
      <form id="organizacion-form" onSubmit={(evento) => void guardar(evento)} noValidate>
        <div className="flex flex-col gap-3">
          <FormField
            label={TEXTOS.columnaNombre}
            htmlFor="organizacion-nombre"
            required
            error={errores.nombre}
          >
            <Input
              id="organizacion-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              state={errores.nombre ? 'error' : undefined}
              disabled={pendiente}
            />
          </FormField>
          <FormField
            label={TEXTOS.columnaCorreo}
            htmlFor="organizacion-correo"
            required
            error={errores.correo}
          >
            <Input
              id="organizacion-correo"
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              state={errores.correo ? 'error' : undefined}
              disabled={pendiente}
              autoComplete="off"
            />
          </FormField>
          <FormField
            label={TEXTOS.columnaTelefono}
            htmlFor="organizacion-telefono"
            required
            error={errores.telefono}
          >
            <Input
              id="organizacion-telefono"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              state={errores.telefono ? 'error' : undefined}
              disabled={pendiente}
              autoComplete="off"
            />
          </FormField>
          {organizacion && (
            <p className="text-sm">
              {TEXTOS.organizacionEdicionTenant}: {organizacion.id}
            </p>
          )}
          {errorGeneral && <Alert variant="danger">{errorGeneral}</Alert>}
        </div>
      </form>
    </Modal>
  );
}
