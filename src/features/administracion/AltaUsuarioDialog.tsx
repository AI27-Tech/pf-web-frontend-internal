import { useReducer, useState, type FormEvent } from 'react';
import { Button, FormField, Input } from '@ai27-tech/ui';
import { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';

import { DialogoAdministracion } from './DialogoAdministracion';
import { useInvalidarAdministracion, useOrganizaciones } from './consultasAdministracion';
import {
  clasificarFallo,
  ErrorIdentificadorDuplicado,
  ErrorOrganizacionInvalida,
  textoDeFallo,
} from './clasificarError';
import { estaPendienteFormulario, reducirDialogoFormulario } from './dialogoFormularioReducer';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { SelectorOrganizacion } from './SelectorOrganizacion';
import { SelectorRol } from './SelectorRol';
import { useAlAbrir } from './useAlAbrir';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { validarAlta, type CampoAlta } from './validacion';

interface AltaUsuarioDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly envio: EnvioUnico;
  readonly idEncabezadoSeccion: string;
  readonly onAlta: (mensaje: string) => void;
}

/**
 * Alta de usuario (R3). Organización solo para `cliente`; al cambiar a un rol
 * interno se descarta la organización capturada. Nunca captura `tenant_id`. Ante
 * cualquier error conserva lo capturado. Identificador duplicado va junto a su
 * campo; una organización inválida va junto al selector y recarga las organizaciones.
 */
export function AltaUsuarioDialog({
  abierto,
  onCerrar,
  envio,
  idEncabezadoSeccion,
  onAlta,
}: AltaUsuarioDialogProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const organizaciones = useOrganizaciones();
  const invalidar = useInvalidarAdministracion();

  const [estado, despachar] = useReducer(reducirDialogoFormulario, 'cerrado');
  const [nombre, setNombre] = useState('');
  const [identificadorUsuario, setIdentificadorUsuario] = useState('');
  const [rol, setRol] = useState<Rol | null>(null);
  const [organizacionId, setOrganizacionId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Partial<Record<CampoAlta, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  useAlAbrir(abierto, () => {
    despachar('abrir');
    setNombre('');
    setIdentificadorUsuario('');
    setRol(null);
    setOrganizacionId(null);
    setErrores({});
    setErrorGeneral(null);
  });

  const pendiente = estaPendienteFormulario(estado);
  const clave = claveEnvio('altaUsuario', 'nuevo');

  const elegirRol = (nuevo: Rol) => {
    setRol(nuevo);
    // Un rol interno no lleva organización: se descarta la que estuviera capturada.
    if (nuevo !== Rol.Cliente) setOrganizacionId(null);
  };

  const cerrar = () => {
    despachar('cerrar');
    onCerrar();
  };

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    if (pendiente || envio.enCurso(clave)) return;

    const validacion = validarAlta(
      { nombre, identificadorUsuario, rol, organizacionId },
      organizaciones.data ?? [],
    );
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
      const resultado = await envio.enviar(clave, () =>
        port.altaUsuario(validacion.comando, token),
      );
      if (!resultado.enviado) return;

      despachar('exito');
      onAlta(mensajesDeExito('altaUsuario'));
      await invalidar();
      onCerrar();
    } catch (fallo) {
      const clasificado = clasificarFallo('altaUsuario', fallo);
      despachar('fallo_general');
      if (clasificado instanceof ErrorIdentificadorDuplicado) {
        setErrores({ identificadorUsuario: TEXTOS.identificadorDuplicado });
      } else if (clasificado instanceof ErrorOrganizacionInvalida) {
        setErrores({ organizacionId: TEXTOS.organizacionInvalida });
        void invalidar();
      } else {
        setErrorGeneral(textoDeFallo(clasificado));
      }
    }
  };

  return (
    <DialogoAdministracion
      abierto={abierto}
      onCerrar={cerrar}
      pendiente={pendiente}
      titulo={TEXTOS.altaTitulo}
      idEncabezadoSeccion={idEncabezadoSeccion}
      pie={
        <>
          <Button variant="outline" onClick={cerrar} disabled={pendiente}>
            {TEXTOS.cancelar}
          </Button>
          <Button variant="primary" type="submit" form="alta-usuario-form" disabled={pendiente}>
            {pendiente ? TEXTOS.enviando : TEXTOS.altaCrear}
          </Button>
        </>
      }
    >
      <form id="alta-usuario-form" onSubmit={(evento) => void crear(evento)} noValidate>
        <div className="flex flex-col gap-3">
          <FormField
            label={TEXTOS.altaNombre}
            htmlFor="alta-nombre"
            required
            error={errores.nombre}
          >
            <Input
              id="alta-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              state={errores.nombre ? 'error' : undefined}
              disabled={pendiente}
            />
          </FormField>
          <FormField
            label={TEXTOS.altaIdentificador}
            htmlFor="alta-identificador"
            required
            error={errores.identificadorUsuario}
          >
            <Input
              id="alta-identificador"
              value={identificadorUsuario}
              onChange={(evento) => setIdentificadorUsuario(evento.target.value)}
              state={errores.identificadorUsuario ? 'error' : undefined}
              disabled={pendiente}
              autoComplete="off"
            />
          </FormField>
          <SelectorRol
            nombre="alta-rol"
            leyenda={TEXTOS.altaRol}
            valor={rol}
            onCambiar={elegirRol}
            disabled={pendiente}
          />
          {rol === Rol.Cliente && (
            <SelectorOrganizacion
              nombre="alta-organizacion"
              leyenda={TEXTOS.altaOrganizacion}
              valor={organizacionId}
              onCambiar={setOrganizacionId}
              organizaciones={organizaciones.data ?? []}
              disabled={pendiente}
            />
          )}
          {errores.organizacionId && <p role="alert">{errores.organizacionId}</p>}
          {errorGeneral && <p role="alert">{errorGeneral}</p>}
        </div>
      </form>
    </DialogoAdministracion>
  );
}
