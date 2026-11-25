/*
 * Pantalla de creación de viaje por Operación (E8-T11).
 *
 * La selección de cliente queda bloqueada mientras el BFF no publique una
 * operación contractual para el catálogo. No se ofrece texto libre ni un
 * endpoint alterno: la brecha se muestra como estado accionable.
 *
 * El formulario replica el de solicitud del portal del cliente (Ruta, Servicio, Fecha y
 * hora, vista previa lateral). Lo propio de Operación se suma aparte: el selector de
 * cliente y las unidades del roster.
 *
 * Ruta: origen → destinos intermedios (opcionales, numerados y reordenables) → destino
 * final. Al enviar, `destinos` lleva `[...intermedios, destinoFinal]`.
 *
 * BRECHA CONTRACTUAL — escolta: el tipo de escolta (Patrulla o Moto) y la sobreescolta se
 * capturan y se muestran en la vista previa, pero NO se envían: `CrearViajeEntrada` aún no
 * tiene esos campos (ni en `bff.gen.ts` tracer.40 ni en la rama de contrato revisada). Hoy
 * la escolta viaja por las unidades del roster (`asignarRecursos`). Cuando el contrato los
 * publique, se agregan en `construirCrearViajeEntrada`. El tipo de escolta es obligatorio
 * igual que en el portal del cliente.
 */

import { useEffect, useRef, useState } from 'react';

import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardFooter,
  DateInput,
  Divider,
  EmptyState,
  Form,
  FormField,
  FormRow,
  FormSection,
  Inline,
  Input,
  PageHeader,
  Select,
  SkeletonText,
  SortableFieldList,
  Stack,
  Switch,
  Table,
  TimePicker,
  Toast,
  ToastContainer,
} from '@ai27-tech/ui';
import { MapPin } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { BloqueError } from '@/components/feedback/BloqueError';
import { EnlaceRuta } from '@/components/layout/EnlaceRuta';
import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
import { puede } from '@/lib/permisos';
import { onCut } from '@/lib/api/sessionCut';
import type { Unidad } from '@/lib/contracts/unidades';
import { ClienteSelector } from './ClienteSelector';
import {
  mensajeErrorCrearViaje,
  quitarError,
  validarDatosCrearViaje,
  type DatosCrearViaje,
  type ErroresCrearViaje,
  type ResultadoCrearViaje,
} from './adaptadorCrearViaje';
import { resolverFechaHora } from './fechaHora';
import { SolicitudVistaPrevia } from './SolicitudVistaPrevia';
import { useCrearViaje } from './useCrearViaje';
import { custodiosLegibles, vehiculoLegible } from '../unidadLegible';

const columnasUnidades = [
  { key: 'vehiculo_id', header: 'Vehículo', cell: (unidad: Unidad) => vehiculoLegible(unidad) },
  {
    key: 'custodios_ids',
    header: 'Custodios',
    cell: (unidad: Unidad) => custodiosLegibles(unidad),
  },
  { key: 'tipo', header: 'Tipo', accessor: 'tipo' as const },
];

/** Destino intermedio en captura. El `id` es estable para poder reordenar la lista. */
interface DestinoCaptura {
  readonly id: string;
  readonly nombre: string;
}

let secuenciaDestino = 0;
const nuevoDestino = (): DestinoCaptura => ({ id: `destino-${++secuenciaDestino}`, nombre: '' });

/** Tipo de servicio: dos opciones fijas. El `value` es el código que viaja en `tipo_servicio`. */
type TipoServicio = 'local' | 'foraneo';

const OPCIONES_TIPO_SERVICIO: readonly { readonly value: TipoServicio; readonly label: string }[] =
  [
    { value: 'local', label: 'Local' },
    { value: 'foraneo', label: 'Foráneo' },
  ];

/** Tipo de vehículo de la escolta. Coincide con `tipo` de la unidad del roster (ADR 31). */
type TipoEscolta = 'patrulla' | 'moto';

const OPCIONES_ESCOLTA: readonly { readonly value: TipoEscolta; readonly label: string }[] = [
  { value: 'patrulla', label: 'Patrulla' },
  { value: 'moto', label: 'Moto' },
];

/** Valor del `Select` → tipo de servicio, o '' si no se eligió ninguno. */
function aTipoServicio(valor: string | number): TipoServicio | '' {
  return OPCIONES_TIPO_SERVICIO.find((opcion) => opcion.value === valor)?.value ?? '';
}

/** Valor del `Select` → tipo de escolta, o '' si no se eligió ninguno. */
function aTipoEscolta(valor: string | number): TipoEscolta | '' {
  return OPCIONES_ESCOLTA.find((opcion) => opcion.value === valor)?.value ?? '';
}

function etiquetaEscolta(tipo: TipoEscolta | ''): string {
  return OPCIONES_ESCOLTA.find((opcion) => opcion.value === tipo)?.label ?? '';
}

const ICONO_UBICACION = <MapPin aria-hidden="true" className="size-4" />;

/** El botón de envío vive fuera del <form> (bajo la vista previa) y se asocia por este id. */
const ID_FORMULARIO = 'form-crear-viaje';

/** Marcador del `Select` sin elección. Lo pinta la librería como opción deshabilitada. */
const SIN_ELEGIR = 'Selecciona un tipo';

export function CrearViaje() {
  const { usuario, sesion } = useSession();
  const navigate = useNavigate();
  const [clienteId, setClienteId] = useState('');
  const [origen, setOrigen] = useState('');
  // Destinos intermedios, en orden. Vacío = sin ellos (el interruptor va apagado).
  const [paradas, setParadas] = useState<readonly DestinoCaptura[]>([]);
  // El destino final: siempre existe y siempre es el último punto de la ruta.
  const [destino, setDestino] = useState('');
  const [tipoServicio, setTipoServicio] = useState<TipoServicio | ''>('');
  // Escolta: hoy solo se captura y se muestra; el contrato aún no la acepta (ver cabecera).
  const [tipoEscolta, setTipoEscolta] = useState<TipoEscolta | ''>('');
  const [conSobreescolta, setConSobreescolta] = useState(false);
  const [tipoSobreescolta, setTipoSobreescolta] = useState<TipoEscolta | ''>('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [unidadesIds, setUnidadesIds] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<ErroresCrearViaje>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCrearViaje | null>(null);
  const [avisoSesionFinalizada, setAvisoSesionFinalizada] = useState(false);
  const envioEnCurso = useRef(false);
  // Sin permiso para crear no se piden clientes ni unidades (Requirement 2.5, T2.7).
  const autorizado = puede(usuario?.rol, 'viaje.crear');
  const c = useCrearViaje(autorizado);
  // Aviso efímero de `403` (Requirement T2.3): la pantalla y lo capturado quedan intactos.
  const [avisoSinPermiso, setAvisoSinPermiso] = useState(false);

  useEffect(() => onCut(() => setAvisoSesionFinalizada(true)), []);

  if (!autorizado) {
    return <AccesoNoAutorizado onVolver={() => void navigate({ to: '/viajes' })} />;
  }

  // El interruptor está activo exactamente cuando hay al menos un destino intermedio.
  const conParadas = paradas.length > 0;

  // Fecha y hora son obligatorias y van juntas: el contrato solo acepta un instante
  // completo (`fecha_hora_servicio`). Si falta una, o la fecha es irreal, no se envía.
  const fechaHora = resolverFechaHora(fecha, hora);
  const errorFecha =
    fechaHora.estado === 'invalido'
      ? 'Escribe una fecha válida.'
      : fechaHora.estado === 'incompleto' && fechaHora.falta === 'fecha'
        ? 'Indica también la fecha.'
        : undefined;
  const errorHora =
    fechaHora.estado === 'incompleto' && fechaHora.falta === 'hora'
      ? 'Indica también la hora.'
      : undefined;

  const datos: DatosCrearViaje = {
    clienteId,
    origen,
    // Los destinos van primero, en su orden actual, y el destino final al último.
    destinos: [...paradas.map((p) => p.nombre), destino],
    // Instante UTC (RFC 3339) ya combinado; '' si falta o es irreal.
    fechaHora: fechaHora.estado === 'valido' ? fechaHora.iso : '',
    unidadesIds: [...unidadesIds],
    ...(tipoServicio !== '' ? { tipoServicio } : {}),
  };

  // Mismo criterio que el portal del cliente: el envío queda deshabilitado hasta que la
  // ruta, el tipo de escolta y la fecha y hora estén completos. El cliente es propio de
  // Operación.
  const puedeEnviar =
    clienteId.trim() !== '' &&
    origen.trim() !== '' &&
    destino.trim() !== '' &&
    paradas.every((p) => p.nombre.trim() !== '') &&
    tipoEscolta !== '' &&
    fechaHora.estado === 'valido' &&
    (!conSobreescolta || tipoSobreescolta !== '');

  const actualizarParada = (id: string, nombre: string) => {
    setParadas((prev) => prev.map((p) => (p.id === id ? { ...p, nombre } : p)));
    setErrores((actuales) => quitarError(actuales, 'destinos'));
  };

  // Activar abre el primer destino; desactivar descarta todos.
  const alternarParadas = (activo: boolean) => setParadas(activo ? [nuevoDestino()] : []);

  const alternarSobreescolta = (activo: boolean) => {
    setConSobreescolta(activo);
    // Apagar el interruptor descarta el tipo elegido.
    if (!activo) setTipoSobreescolta('');
  };

  const confirmar = async () => {
    if (envioEnCurso.current || !puedeEnviar) return;

    const nuevosErrores = validarDatosCrearViaje(datos);
    setErrores(nuevosErrores);
    setErrorEnvio(null);
    setResultado(null);
    if (Object.keys(nuevosErrores).length > 0) return;

    envioEnCurso.current = true;
    try {
      const nuevoResultado = await c.crear(datos);
      setResultado(nuevoResultado);
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'sesionFinalizada') return;
      if (error instanceof ApiError && error.kind === 'prohibido') {
        setAvisoSinPermiso(true);
        return;
      }
      setErrorEnvio(mensajeErrorCrearViaje(error));
    } finally {
      envioEnCurso.current = false;
    }
  };

  const volver = () => void navigate({ to: '/viajes' });

  const etiquetaTipoServicio = OPCIONES_TIPO_SERVICIO.find(
    (opcion) => opcion.value === tipoServicio,
  )?.label;

  return (
    <Stack gap={4} style={{ maxWidth: '80rem' }}>
      {avisoSesionFinalizada && (
        <Alert variant="danger">Tu sesión finalizó. La información capturada no se envió.</Alert>
      )}
      {avisoSinPermiso && (
        <ToastContainer position="top-right">
          <Toast
            variant="error"
            title="No tienes permiso para crear viajes."
            duration={4000}
            onClose={() => setAvisoSinPermiso(false)}
          />
        </ToastContainer>
      )}
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Viajes', href: '/viajes', as: EnlaceRuta }, { label: 'Crear viaje' }]}
          />
        }
        title="Crear viaje por Operación"
        description="Registra los datos esenciales y, si aplica, selecciona una escolta completa."
      />

      <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card variant="outlined" padding="lg" className="w-full">
          <CardBody>
            <Form
              id={ID_FORMULARIO}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void confirmar();
              }}
            >
              <FormSection
                title="Datos del cliente"
                description="Elige para quién se crea el viaje."
              >
                <ClienteSelector
                  estado={
                    c.cargandoClientes
                      ? 'cargando'
                      : c.errorClientes instanceof ApiError && c.errorClientes.kind === 'prohibido'
                        ? 'prohibido'
                        : c.errorClientes
                          ? 'error'
                          : c.clientes.length === 0
                            ? 'vacio'
                            : 'disponible'
                  }
                  clientes={c.clientes}
                  value={clienteId}
                  error={errores.cliente}
                  onChange={(value) => {
                    setClienteId(value);
                    setErrores((actuales) => quitarError(actuales, 'cliente'));
                  }}
                  onReintentar={c.reintentarClientes}
                  disabled={c.enviando}
                />
              </FormSection>

              <Divider />

              <FormSection
                title="Ruta del viaje"
                description="Origen, destinos intermedios (opcionales) y destino final."
              >
                <FormField label="Origen" required error={errores.origen}>
                  <Input
                    value={origen}
                    onChange={(event) => {
                      setOrigen(event.target.value);
                      setErrores((actuales) => quitarError(actuales, 'origen'));
                    }}
                    disabled={c.enviando}
                    placeholder="Ciudad o sitio de origen"
                    startAdornment={ICONO_UBICACION}
                  />
                </FormField>
                {conParadas && (
                  <Card variant="outlined" padding="md">
                    <CardBody>
                      <Stack gap={4}>
                        <p
                          className="ui-text-body-sm"
                          style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}
                        >
                          Agrega destinos intermedios entre el origen y el destino final.
                        </p>
                        <SortableFieldList
                          items={paradas.map((parada, indice) => ({
                            id: parada.id,
                            label: `Destino ${indice + 1}`,
                          }))}
                          onReorder={(ordenados) =>
                            setParadas((prev) =>
                              ordenados.flatMap((item) => prev.find((p) => p.id === item.id) ?? []),
                            )
                          }
                          slotLabel={(indice) => `Destino ${indice + 1}`}
                          renderField={(item) => (
                            <Input
                              value={paradas.find((p) => p.id === item.id)?.nombre ?? ''}
                              onChange={(event) => actualizarParada(item.id, event.target.value)}
                              disabled={c.enviando}
                              aria-label={item.label}
                              placeholder="Ciudad o sitio del destino"
                              startAdornment={ICONO_UBICACION}
                            />
                          )}
                          onRemove={(item) =>
                            // Al quitar el último, la ruta vuelve a ser origen → destino final.
                            setParadas((prev) => prev.filter((p) => p.id !== item.id))
                          }
                          onAdd={() => setParadas((prev) => [...prev, nuevoDestino()])}
                          addLabel="Agregar otro destino"
                          disabled={c.enviando}
                        />
                      </Stack>
                    </CardBody>
                  </Card>
                )}
                <div className="relative flex flex-col">
                  <FormField label="Destino final" required error={errores.destinos}>
                    <Input
                      value={destino}
                      onChange={(event) => {
                        setDestino(event.target.value);
                        setErrores((actuales) => quitarError(actuales, 'destinos'));
                      }}
                      disabled={c.enviando}
                      placeholder="Ciudad o sitio del destino final"
                      startAdornment={ICONO_UBICACION}
                    />
                  </FormField>
                  <div className="pt-2 sm:absolute sm:-top-1 sm:right-0 sm:pt-0">
                    <Switch
                      label="Seguimiento con múltiples destinos"
                      checked={conParadas}
                      disabled={c.enviando}
                      onChange={(event) => alternarParadas(event.target.checked)}
                    />
                  </div>
                </div>
              </FormSection>

              <Divider />

              <FormSection
                title="Servicio y escolta"
                description="Tipo de servicio y tipo de vehículo de la escolta."
              >
                <FormField label="Tipo de servicio">
                  <Select
                    value={tipoServicio}
                    placeholder={SIN_ELEGIR}
                    onChange={(valor) => setTipoServicio(aTipoServicio(valor))}
                    options={[...OPCIONES_TIPO_SERVICIO]}
                    disabled={c.enviando}
                  />
                </FormField>
                <FormField label="Tipo de escolta" required>
                  <Select
                    value={tipoEscolta}
                    placeholder={SIN_ELEGIR}
                    onChange={(valor) => setTipoEscolta(aTipoEscolta(valor))}
                    options={[...OPCIONES_ESCOLTA]}
                    disabled={c.enviando}
                  />
                </FormField>
                <Switch
                  label="Agregar sobreescolta"
                  checked={conSobreescolta}
                  disabled={c.enviando}
                  onChange={(event) => alternarSobreescolta(event.target.checked)}
                />
                {conSobreescolta && (
                  <FormField label="Tipo de sobreescolta" required>
                    <Select
                      value={tipoSobreescolta}
                      placeholder={SIN_ELEGIR}
                      onChange={(valor) => setTipoSobreescolta(aTipoEscolta(valor))}
                      options={[...OPCIONES_ESCOLTA]}
                      disabled={c.enviando}
                    />
                  </FormField>
                )}
              </FormSection>

              <Divider />

              <FormSection title="Programación" description="Cuándo inicia el servicio.">
                <FormRow columns={2}>
                  <FormField label="Fecha del servicio" error={errorFecha} required>
                    <DateInput
                      value={fecha}
                      onChange={setFecha}
                      displayFormat="AAAA Mmm DD"
                      disabled={c.enviando}
                    />
                  </FormField>
                  <FormField label="Hora del servicio" error={errorHora} required>
                    <TimePicker
                      value={hora}
                      onChange={setHora}
                      format="12h"
                      disabled={c.enviando}
                    />
                  </FormField>
                </FormRow>
              </FormSection>

              <Divider />

              <FormSection
                title="Unidades del roster (opcional)"
                description="Asigna desde ahora unidades completas de la escolta."
              >
                <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text-muted)' }}>
                  Selecciona unidades completas. La aptitud es informativa y no bloquea por sí sola.
                </p>
                <Roster
                  unidades={c.unidades}
                  cargando={c.cargandoUnidades}
                  error={c.errorUnidades}
                  seleccionadas={unidadesIds}
                  enviando={c.enviando}
                  onSelectionChange={setUnidadesIds}
                  onReintentar={c.reintentarUnidades}
                />
              </FormSection>
            </Form>
          </CardBody>
        </Card>

        {/*
          Columna derecha: la vista previa y, debajo, el resultado, los errores y los botones.
          El botón de envío está fuera del <form> y lo envía por el atributo `form`.
        */}
        <Stack gap={4} className="lg:sticky lg:top-6">
          <SolicitudVistaPrevia
            origen={origen}
            paradas={paradas.map((p) => p.nombre)}
            destino={destino}
            tipoServicio={etiquetaTipoServicio ?? ''}
            tipoEscolta={etiquetaEscolta(tipoEscolta)}
            sobreescolta={conSobreescolta ? etiquetaEscolta(tipoSobreescolta) : 'No'}
            fechaHora={fechaHora.estado === 'valido' ? fechaHora.iso : ''}
          />
          {errorEnvio && <Alert variant="danger">{errorEnvio}</Alert>}
          {resultado && (
            <Resultado
              resultado={resultado}
              onContinuar={(id) => void navigate({ to: '/viajes/$id', params: { id } })}
            />
          )}
          <Inline gap={2} justify="end">
            <Button variant="secondary" type="button" onClick={volver} disabled={c.enviando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form={ID_FORMULARIO}
              loading={c.enviando}
              disabled={c.enviando || !sesion || !puedeEnviar}
            >
              Confirmar creación
            </Button>
          </Inline>
        </Stack>
      </div>
    </Stack>
  );
}

interface RosterProps {
  readonly unidades: Unidad[];
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly seleccionadas: Set<string>;
  readonly enviando: boolean;
  readonly onSelectionChange: (ids: Set<string>) => void;
  readonly onReintentar: () => void;
}

function Roster({
  unidades,
  cargando,
  error,
  seleccionadas,
  enviando,
  onSelectionChange,
  onReintentar,
}: RosterProps) {
  if (cargando)
    return (
      <div role="status" aria-label="Cargando unidades del roster">
        <SkeletonText lines={3} />
      </div>
    );
  if (error) {
    return (
      <BloqueError mensaje="No se pudo cargar el roster de unidades." onReintentar={onReintentar} />
    );
  }
  if (unidades.length === 0)
    return <EmptyState size="sm" title="No hay unidades disponibles para seleccionar." />;

  return (
    <div aria-label={`${seleccionadas.size} unidades seleccionadas`}>
      <Table<Unidad>
        columns={columnasUnidades}
        data={unidades}
        rowKey={(unidad) => unidad.id}
        selectedKeys={seleccionadas}
        onSelectionChange={(keys) => {
          if (!enviando) onSelectionChange(new Set([...keys].map(String)));
        }}
        aria-label="Unidades completas del roster"
        density="compact"
      />
    </div>
  );
}

function Resultado({
  resultado,
  onContinuar,
}: {
  readonly resultado: ResultadoCrearViaje;
  readonly onContinuar: (viajeId: string) => void;
}) {
  if (resultado.tipo === 'aprobado') {
    return (
      <Card variant="outlined">
        <CardBody role="status">
          <p>Viaje creado correctamente.</p>
          <p>
            Identificador: <strong>{resultado.viaje.id}</strong>
          </p>
          <Badge variant="secure">{resultado.viaje.estado}</Badge>
        </CardBody>
      </Card>
    );
  }
  if (resultado.tipo === 'asignado') {
    return (
      <Card variant="outlined">
        <CardBody role="status">
          <p>Viaje creado y escolta confirmada.</p>
          <p>
            Identificador: <strong>{resultado.viaje.id}</strong>
          </p>
          <Badge variant="escort">{resultado.asignacion.estado}</Badge>
          <p>Escolta confirmada:</p>
          <ul>
            {resultado.asignacion.unidades.map((unidad) => (
              <li key={unidad.unidad_id}>{unidad.unidad_id}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    );
  }
  if (resultado.tipo === 'respuesta_insuficiente') {
    return (
      <Card variant="outlined">
        <CardBody role="alert">
          <p>No se puede confirmar el resultado del servicio.</p>
          <p>{resultado.mensaje}</p>
          {resultado.viaje && (
            <p>
              Viaje creado: <strong>{resultado.viaje.id}</strong> ({resultado.viaje.estado}).
            </p>
          )}
        </CardBody>
      </Card>
    );
  }
  return (
    <Card variant="outlined">
      <CardBody role="alert">
        <p>
          El viaje {resultado.viaje.id} quedó en {resultado.viaje.estado}, pero la asignación no
          pudo confirmarse.
        </p>
        <p>{mensajeErrorCrearViaje(resultado.error)}</p>
        <p>La escolta puede intentarse desde el detalle del viaje.</p>
        <Button variant="secondary" type="button" onClick={() => onContinuar(resultado.viaje.id)}>
          Continuar con el viaje
        </Button>
      </CardBody>
    </Card>
  );
}

function AccesoNoAutorizado({ onVolver }: { readonly onVolver: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">
          Este flujo está disponible para los roles Jefe Operativo y Administrador.
        </Alert>
      </CardBody>
      <CardFooter>
        <Button variant="secondary" onClick={onVolver}>
          Volver a viajes
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CrearViaje;
