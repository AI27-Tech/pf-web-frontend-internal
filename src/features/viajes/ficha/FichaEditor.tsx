/* Editor incremental de la ficha técnica, compuesto con primitivas de @ai27-tech/ui. */

import { useRef, useState } from 'react';

import {
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

import type {
  DispositivoGps,
  FichaTecnica,
  FichaTecnicaEntrada,
} from '@/lib/contracts/fichaTecnica';

import {
  CAMPOS_CONTENEDOR,
  CAMPOS_TRACTO,
  construirFichaEntrada,
  datosDesdeFicha,
  esFichaConfirmada,
  mensajeErrorGuardarFicha,
  validarDatosFicha,
  type CampoContenedor,
  type CampoTracto,
  type DatosFichaTecnica,
} from './adaptadorFichaTecnica';

interface FichaEditorProps {
  readonly viajeId: string;
  readonly ficha: FichaTecnica | null;
  readonly gps: DispositivoGps[];
  readonly cargandoGps: boolean;
  readonly errorGps: Error | null;
  readonly reintentarGps: () => void;
  readonly guardar: (entrada: FichaTecnicaEntrada) => Promise<FichaTecnica>;
  readonly guardando: boolean;
}

const ETIQUETAS_TRACTO: Record<CampoTracto, string> = {
  placas: 'Placas',
  economico: 'Económico',
  marca: 'Marca',
  modelo: 'Modelo',
  color: 'Color',
};

const ETIQUETAS_CONTENEDOR: Record<CampoContenedor, string> = {
  economico: 'Económico',
  placas: 'Placas',
  sello: 'Sello',
  color: 'Color',
};

const COLUMNAS_GPS = [
  { key: 'identificador', header: 'Identificador', accessor: 'identificador' as const },
  { key: 'estado', header: 'Estado', cell: () => 'Activo' },
];

export function FichaEditor({
  viajeId,
  ficha,
  gps,
  cargandoGps,
  errorGps,
  reintentarGps,
  guardar,
  guardando,
}: FichaEditorProps) {
  const [datos, setDatos] = useState<DatosFichaTecnica>(() => datosDesdeFicha(ficha));
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [avisoExito, setAvisoExito] = useState(false);
  const [enviandoLocal, setEnviandoLocal] = useState(false);
  const envioEnCurso = useRef(false);
  const ocupada = guardando || enviandoLocal;

  const confirmar = async () => {
    if (envioEnCurso.current) return;

    const errores = validarDatosFicha(datos);
    if (Object.keys(errores).length > 0) {
      setErrorEnvio(errores.formulario ?? 'Revisa los datos capturados.');
      return;
    }

    envioEnCurso.current = true;
    setEnviandoLocal(true);
    setErrorEnvio(null);
    setAvisoExito(false);

    try {
      const respuesta = await guardar(construirFichaEntrada(datos));
      if (!esFichaConfirmada(respuesta, viajeId)) {
        setErrorEnvio('La respuesta del BFF no confirmó la ficha actualizada.');
        return;
      }
      setDatos(datosDesdeFicha(respuesta));
      setAvisoExito(true);
    } catch (error) {
      setErrorEnvio(mensajeErrorGuardarFicha(error));
    } finally {
      envioEnCurso.current = false;
      setEnviandoLocal(false);
    }
  };

  const actualizarTracto = (campo: CampoTracto, valor: string) => {
    setDatos((actual) => ({
      ...actual,
      tracto: { ...(actual.tracto ?? {}), [campo]: valor },
    }));
    setAvisoExito(false);
  };

  const actualizarContenedor = (indice: number, campo: CampoContenedor, valor: string) => {
    setDatos((actual) => ({
      ...actual,
      contenedores: actual.contenedores.map((contenedor, i) =>
        i === indice ? { ...contenedor, [campo]: valor } : contenedor,
      ),
    }));
    setAvisoExito(false);
  };

  return (
    <Card variant="outlined">
      <CardHeader>
        <p className="ui-text-body-sm" style={{ margin: 0, color: 'var(--ui-color-text)' }}>
          Capturar o editar ficha
        </p>
      </CardHeader>
      <CardBody>
        <Form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void confirmar();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}
        >
          <section aria-labelledby="tracto-titulo">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--ui-space-2)',
              }}
            >
              <h2
                id="tracto-titulo"
                className="ui-text-label-md"
                style={{ margin: 0, color: 'var(--ui-color-text)' }}
              >
                Tracto del cliente
              </h2>
              <Button
                variant="ghost"
                type="button"
                disabled={ocupada}
                onClick={() =>
                  setDatos((actual) => ({
                    ...actual,
                    tracto: actual.tracto === null ? {} : null,
                  }))
                }
              >
                {datos.tracto === null ? 'Agregar tracto' : 'Eliminar tracto'}
              </Button>
            </div>
            {datos.tracto === null ? (
              <p
                className="ui-text-body-sm"
                style={{ margin: 'var(--ui-space-2) 0 0', color: 'var(--ui-color-text-muted)' }}
              >
                No se enviará un tracto. Guardar esta selección lo eliminará de la ficha.
              </p>
            ) : (
              <FormRow columns={2}>
                {CAMPOS_TRACTO.map((campo) => (
                  <FormField key={campo} label={ETIQUETAS_TRACTO[campo]}>
                    <Input
                      value={String(datos.tracto?.[campo] ?? '')}
                      onChange={(event) => actualizarTracto(campo, event.target.value)}
                      disabled={ocupada}
                    />
                  </FormField>
                ))}
              </FormRow>
            )}
          </section>

          <section aria-labelledby="contenedores-titulo">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--ui-space-2)',
              }}
            >
              <h2
                id="contenedores-titulo"
                className="ui-text-label-md"
                style={{ margin: 0, color: 'var(--ui-color-text)' }}
              >
                Contenedores ({datos.contenedores.length})
              </h2>
              <Button
                variant="secondary"
                type="button"
                disabled={ocupada}
                onClick={() =>
                  setDatos((actual) => ({
                    ...actual,
                    contenedores: [...actual.contenedores, {}],
                  }))
                }
              >
                Agregar contenedor
              </Button>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--ui-space-3)',
                marginTop: 'var(--ui-space-2)',
              }}
            >
              {datos.contenedores.length === 0 ? (
                <p
                  className="ui-text-body-sm"
                  style={{ margin: 0, color: 'var(--ui-color-text-muted)' }}
                >
                  Cero contenedores es válido para este viaje.
                </p>
              ) : (
                datos.contenedores.map((contenedor, indice) => (
                  <div
                    key={`contenedor-${indice}`}
                    style={{
                      border: '1px solid var(--ui-color-border)',
                      borderRadius: 'var(--ui-radius-sm)',
                      padding: 'var(--ui-space-2)',
                    }}
                  >
                    <FormRow columns={2}>
                      {CAMPOS_CONTENEDOR.map((campo) => (
                        <FormField
                          key={campo}
                          label={`${ETIQUETAS_CONTENEDOR[campo]} ${indice + 1}`}
                        >
                          <Input
                            value={String(contenedor[campo] ?? '')}
                            onChange={(event) =>
                              actualizarContenedor(indice, campo, event.target.value)
                            }
                            disabled={ocupada}
                          />
                        </FormField>
                      ))}
                    </FormRow>
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={ocupada}
                      onClick={() =>
                        setDatos((actual) => ({
                          ...actual,
                          contenedores: actual.contenedores.filter((_, i) => i !== indice),
                        }))
                      }
                      aria-label={`Quitar contenedor ${indice + 1}`}
                    >
                      Quitar contenedor
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="gps-titulo">
            <h2
              id="gps-titulo"
              className="ui-text-label-md"
              style={{ margin: 0, color: 'var(--ui-color-text)' }}
            >
              GPS registrados ({datos.gpsIds.length})
            </h2>
            <p
              className="ui-text-body-sm"
              style={{
                margin: 'var(--ui-space-1) 0 var(--ui-space-2)',
                color: 'var(--ui-color-text-muted)',
              }}
            >
              Selecciona dispositivos del catálogo activo. Este registro no implica seguimiento en
              vivo.
            </p>
            <GpsSelector
              dispositivos={gps}
              seleccionados={new Set(datos.gpsIds)}
              cargando={cargandoGps}
              error={errorGps}
              disabled={ocupada}
              onReintentar={reintentarGps}
              onSelectionChange={(keys) => {
                setDatos((actual) => ({ ...actual, gpsIds: [...keys].map(String) }));
                setAvisoExito(false);
              }}
            />
          </section>

          {errorEnvio && (
            <p role="alert" style={{ color: 'var(--ui-color-error)', margin: 0 }}>
              {errorEnvio}
            </p>
          )}
          {avisoExito && (
            <p role="status" style={{ color: 'var(--ui-color-success)', margin: 0 }}>
              Ficha guardada. La vista refleja la respuesta confirmada por el BFF.
            </p>
          )}

          <CardFooter
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: 0,
            }}
          >
            <Button variant="primary" type="submit" loading={guardando} disabled={ocupada}>
              Guardar ficha
            </Button>
          </CardFooter>
        </Form>
      </CardBody>
    </Card>
  );
}

function GpsSelector({
  dispositivos,
  seleccionados,
  cargando,
  error,
  disabled,
  onReintentar,
  onSelectionChange,
}: {
  readonly dispositivos: DispositivoGps[];
  readonly seleccionados: Set<string>;
  readonly cargando: boolean;
  readonly error: Error | null;
  readonly disabled: boolean;
  readonly onReintentar: () => void;
  readonly onSelectionChange: (keys: Set<string>) => void;
}) {
  if (cargando) {
    return <p className="ui-text-body-sm">Cargando catálogo GPS...</p>;
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="ui-text-body-sm" style={{ color: 'var(--ui-color-error)' }}>
          No se pudo cargar el catálogo GPS.
        </p>
        <Button variant="secondary" type="button" onClick={onReintentar} disabled={disabled}>
          Reintentar catálogo
        </Button>
      </div>
    );
  }

  if (dispositivos.length === 0) {
    return <p className="ui-text-body-sm">No hay dispositivos GPS activos disponibles.</p>;
  }

  return (
    <Table<DispositivoGps>
      columns={COLUMNAS_GPS}
      data={dispositivos}
      rowKey={(dispositivo) => dispositivo.id}
      selectedKeys={seleccionados}
      onSelectionChange={(keys) => onSelectionChange(new Set([...keys].map(String)))}
      aria-label="Catálogo de GPS activos"
      density="compact"
    />
  );
}
