import { useReducer, useState, type FormEvent } from 'react';
import { Button, Card, CardBody, FormField, FormSection, Input, Modal, Radio } from '@ai27-tech/ui';
import { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import { OPCIONES_ROL } from '@/lib/contracts/administracion';

import { useInvalidarAdministracion, useOrganizaciones } from './consultasAdministracion';
import {
  clasificarFallo,
  ErrorIdentificadorDuplicado,
  ErrorOrganizacionInvalida,
  textoDeFallo,
} from './clasificarError';
import { estaPendienteFormulario, reducirDialogoFormulario } from './dialogoFormularioReducer';
import { ETIQUETAS_ROL, mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { organizacionesOfrecibles } from './validacion';
import { useAlAbrir } from './useAlAbrir';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';
import { validarAlta, type CampoAlta } from './validacion';

interface AltaUsuarioDialogProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly envio: EnvioUnico;
  readonly onAlta: (mensaje: string) => void;
}

/**
 * Alta de usuario (R3). Organización solo para `cliente`; al cambiar a un rol interno
 * se descarta la organización capturada. Nunca captura `tenant_id`. Ante cualquier
 * error conserva lo capturado. El identificador duplicado va junto a su campo; una
 * organización inválida va junto al selector y recarga las organizaciones.
 */
export function AltaUsuarioDialog({ abierto, onCerrar, envio, onAlta }: AltaUsuarioDialogProps) {
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
  const ofrecibles = organizacionesOfrecibles(organizaciones.data ?? []);

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
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) cerrar();
      }}
      title={TEXTOS.altaTitulo}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
      footer={
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

          <FormSection title={TEXTOS.altaRol}>
            {OPCIONES_ROL.map((opcion) => (
              <Radio
                key={opcion}
                name="alta-rol"
                value={opcion}
                checked={rol === opcion}
                disabled={pendiente}
                onChange={() => elegirRol(opcion)}
                label={ETIQUETAS_ROL[opcion]}
              />
            ))}
          </FormSection>

          {rol === Rol.Cliente && (
            <FormSection title={TEXTOS.altaOrganizacion}>
              {ofrecibles.length === 0 ? (
                <Card variant="outlined">
                  <CardBody>
                    <p role="status">{TEXTOS.sinOrganizaciones}</p>
                  </CardBody>
                </Card>
              ) : (
                ofrecibles.map((organizacion) => (
                  <Radio
                    key={organizacion.id}
                    name="alta-organizacion"
                    value={organizacion.id}
                    checked={organizacionId === organizacion.id}
                    disabled={pendiente}
                    onChange={() => setOrganizacionId(organizacion.id)}
                    label={organizacion.nombre}
                  />
                ))
              )}
              {errores.organizacionId && <p role="alert">{errores.organizacionId}</p>}
            </FormSection>
          )}

          {errorGeneral && (
            <Card variant="outlined">
              <CardBody>
                <p role="alert">{errorGeneral}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </form>
    </Modal>
  );
}
