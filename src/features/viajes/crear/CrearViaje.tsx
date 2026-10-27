/*
 * Pantalla de creación de viaje por Operación (E8-T11).
 *
 * La selección de cliente queda bloqueada mientras el BFF no publique una
 * operación contractual para el catálogo. No se ofrece texto libre ni un
 * endpoint alterno: la brecha se muestra como estado accionable.
 */

import { useEffect, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Form,
  FormField,
  FormRow,
  Input,
  Table,
} from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { useSession } from '@/context/SessionContext';
import { ApiError } from '@/lib/api/errors';
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
import { useCrearViaje } from './useCrearViaje';

const columnasUnidades = [
  { key: 'vehiculo_id', header: 'Vehículo', accessor: 'vehiculo_id' as const },
  {
    key: 'custodios_ids',
    header: 'Custodios',
    cell: (unidad: Unidad) => unidad.custodios_ids.join(', '),
  },
  { key: 'tipo', header: 'Tipo', accessor: 'tipo' as const },
];

export function CrearViaje() {
  const { usuario, sesion } = useSession();
  const navigate = useNavigate();
  const [clienteId, setClienteId] = useState('');
  const [origen, setOrigen] = useState('');
  const [destinos, setDestinos] = useState(['']);
  const [fechaHora, setFechaHora] = useState('');
  const [unidadesIds, setUnidadesIds] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<ErroresCrearViaje>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCrearViaje | null>(null);
  const [avisoSesionFinalizada, setAvisoSesionFinalizada] = useState(false);
  const envioEnCurso = useRef(false);
  const c = useCrearViaje(usuario?.rol === 'jefe_operativo');

  useEffect(() => onCut(() => setAvisoSesionFinalizada(true)), []);

  if (usuario?.rol !== 'jefe_operativo') {
    return <AccesoNoAutorizado onVolver={() => void navigate({ to: '/viajes' })} />;
  }

  const datos: DatosCrearViaje = {
    clienteId,
    origen,
    destinos,
    fechaHora,
    unidadesIds: [...unidadesIds],
  };

  const actualizarDestino = (indice: number, valor: string) => {
    setDestinos((actuales) => actuales.map((destino, i) => (i === indice ? valor : destino)));
    setErrores((actuales) => quitarError(actuales, 'destinos'));
  };

  const confirmar = async () => {
    if (envioEnCurso.current) return;

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
      setErrorEnvio(mensajeErrorCrearViaje(error));
    } finally {
      envioEnCurso.current = false;
    }
  };

  const volver = () => void navigate({ to: '/viajes' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-4)',
        maxWidth: '62rem',
      }}
    >
      <header>
        {avisoSesionFinalizada && (
          <p role="alert" style={{ color: 'var(--ui-color-error)', margin: 0 }}>
            Tu sesión finalizó. La información capturada no se envió.
          </p>
        )}
        <Button variant="ghost" type="button" onClick={volver}>
          Volver a viajes
        </Button>
        <h1
          className="ui-text-headline-lg"
          style={{ margin: 'var(--ui-space-2) 0 0', color: 'var(--ui-color-text)' }}
        >
          Crear viaje por Operación
        </h1>
        <p
          className="ui-text-body-sm"
          style={{ color: 'var(--ui-color-text-muted)', margin: 'var(--ui-space-1) 0 0' }}
        >
          Registra los datos esenciales y, si aplica, selecciona una escolta completa.
        </p>
      </header>

      <Card variant="outlined">
        <CardHeader>Datos del viaje</CardHeader>
        <CardBody>
          <Form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void confirmar();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}
          >
            <ClienteSelector
              estado={
                c.cargandoClientes
                  ? 'cargando'
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

            <FormRow columns={2}>
              <FormField label="Origen" required error={errores.origen}>
                <Input
                  value={origen}
                  onChange={(event) => {
                    setOrigen(event.target.value);
                    setErrores((actuales) => quitarError(actuales, 'origen'));
                  }}
                  disabled={c.enviando}
                  placeholder="Dirección o ciudad de origen"
                />
              </FormField>
              <FormField label="Fecha y hora del servicio" required error={errores.fechaHora}>
                <Input
                  type="datetime-local"
                  value={fechaHora}
                  onChange={(event) => {
                    setFechaHora(event.target.value);
                    setErrores((actuales) => quitarError(actuales, 'fechaHora'));
                  }}
                  disabled={c.enviando}
                />
              </FormField>
            </FormRow>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend
                className="ui-text-label-md"
                style={{ color: 'var(--ui-color-text)', marginBottom: 'var(--ui-space-2)' }}
              >
                Destinos <span aria-hidden="true">*</span>
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-2)' }}>
                {destinos.map((destino, indice) => (
                  <div
                    key={`destino-${indice}`}
                    style={{ display: 'flex', gap: 'var(--ui-space-2)' }}
                  >
                    <Input
                      value={destino}
                      onChange={(event) => actualizarDestino(indice, event.target.value)}
                      disabled={c.enviando}
                      aria-label={`Destino ${indice + 1}`}
                      placeholder={`Destino ${indice + 1}`}
                    />
                    {destinos.length > 1 && (
                      <Button
                        variant="ghost"
                        type="button"
                        disabled={c.enviando}
                        onClick={() =>
                          setDestinos((actuales) => actuales.filter((_, i) => i !== indice))
                        }
                        aria-label={`Quitar destino ${indice + 1}`}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
                {errores.destinos && (
                  <p role="alert" style={{ color: 'var(--ui-color-error)', margin: 0 }}>
                    {errores.destinos}
                  </p>
                )}
                <Button
                  variant="secondary"
                  type="button"
                  disabled={c.enviando}
                  onClick={() => setDestinos((actuales) => [...actuales, ''])}
                >
                  Agregar destino
                </Button>
              </div>
            </fieldset>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend
                className="ui-text-label-md"
                style={{ color: 'var(--ui-color-text)', marginBottom: 'var(--ui-space-2)' }}
              >
                Escolta opcional
              </legend>
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
            </fieldset>

            {errorEnvio && (
              <p role="alert" style={{ color: 'var(--ui-color-error)', margin: 0 }}>
                {errorEnvio}
              </p>
            )}
            {resultado && (
              <Resultado
                resultado={resultado}
                onContinuar={(id) => void navigate({ to: '/viajes/$id', params: { id } })}
              />
            )}

            <CardFooter
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--ui-space-2)',
                padding: 0,
              }}
            >
              <Button variant="secondary" type="button" onClick={volver} disabled={c.enviando}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={c.enviando}
                disabled={c.enviando || !sesion}
              >
                Confirmar creación
              </Button>
            </CardFooter>
          </Form>
        </CardBody>
      </Card>
    </div>
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
  if (cargando) return <p role="status">Cargando unidades del roster...</p>;
  if (error) {
    return (
      <Card variant="outlined">
        <CardBody>
          <p role="alert">No se pudo cargar el roster de unidades.</p>
          <Button variant="secondary" type="button" onClick={onReintentar}>
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }
  if (unidades.length === 0)
    return <p role="status">No hay unidades disponibles para seleccionar.</p>;

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
        <p role="alert">Este flujo está disponible para el rol Jefe Operativo.</p>
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
