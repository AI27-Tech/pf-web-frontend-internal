import { useReducer, useState, type FormEvent } from 'react';
import { Button, FormField, Input } from '@ai27-tech/ui';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { Organizacion } from '@/lib/contracts/administracion';

import { DialogoAdministracion } from './DialogoAdministracion';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import { estaPendienteFormulario, reducirDialogoFormulario } from './dialogoFormularioReducer';
import { TEXTOS_ADMINISTRACION as TEXTOS, mensajesDeExito } from './mensajes';
import { validarOrganizacion, type CampoOrganizacion } from './validacion';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { useAlAbrir } from './useAlAbrir';

interface OrganizacionFormDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  /** Sin organización, el diálogo crea. Con una, edita nombre, correo y teléfono. */
  readonly organizacion?: Organizacion;
  readonly envio: EnvioUnico;
  readonly idEncabezadoSeccion: string;
  readonly onGuardada: (mensaje: string) => void;
}

/**
 * Crear o editar una organización de Cliente (R9.1 a R9.12). Nombre, correo (con
 * `@`) y teléfono son obligatorios. El tenant es solo lectura y no hay organización
 * padre. No hay acción de reactivar: desactivar es terminal (PA-8). Ante un
 * nombre duplicado, el formulario conserva lo capturado.
 */
export function OrganizacionFormDialog({
  abierto,
  onCerrar,
  organizacion,
  envio,
  idEncabezadoSeccion,
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

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setNombre(organizacion?.nombre ?? '');
    setCorreo(organizacion?.correo ?? '');
    setTelefono(organizacion?.telefono ?? '');
    setErrores({});
    setErrorGeneral(null);
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
          : port.crearOrganizacion(datos, token),
      );
      if (resultado === undefined) return;

      despachar('exito');
      onGuardada(mensajesDeExito('guardarOrganizacion'));
      onCerrar();
    } catch (fallo) {
      const operacion = organizacion ? 'editarOrganizacion' : 'crearOrganizacion';
      const clasificado = clasificarFallo(operacion, fallo);
      despachar('fallo_general');
      setErrorGeneral(textoDeFallo(clasificado));
    }
  };

  const campo = (
    id: string,
    etiqueta: string,
    valor: string,
    alCambiar: (valor: string) => void,
    error: string | undefined,
    tipo: 'text' | 'email' = 'text',
  ) => (
    <FormField label={etiqueta} htmlFor={id} required error={error}>
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        state={error ? 'error' : undefined}
        disabled={pendiente}
        autoComplete="off"
      />
    </FormField>
  );

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={cerrar}
      pendiente={pendiente}
      titulo={organizacion ? 'Editar organización' : 'Nueva organización'}
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
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
          {campo('organizacion-nombre', 'Nombre', nombre, setNombre, errores.nombre)}
          {campo(
            'organizacion-correo',
            'Correo de contacto',
            correo,
            setCorreo,
            errores.correo,
            'email',
          )}
          {campo(
            'organizacion-telefono',
            'Teléfono de contacto',
            telefono,
            setTelefono,
            errores.telefono,
            'text',
          )}
          {organizacion && (
            <p className="text-sm">
              {TEXTOS.organizacionEdicionTenant}: {organizacion.tenant}
            </p>
          )}
          {errorGeneral && <p role="alert">{errorGeneral}</p>}
        </div>
      </form>
    </DialogoAdministracion>
  );
}
