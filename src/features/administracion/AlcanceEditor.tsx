import { useState, type Key } from 'react';
import { Alert, Button, Table, type Column } from '@ai27-tech/ui';
import { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { controlesDeAlcance } from './afordancias';
import {
  useAlcance,
  useInvalidarAdministracion,
  useUnidadesAlcance,
  useUsuariosDeRol,
} from './consultasAdministracion';
import { clasificarFallo, textoDeFallo } from './clasificarError';
import { opcionesUnidadesAlcance } from './opcionesUnidades';
import { etiquetaIdentificador, etiquetaUsuario } from './etiquetas';
import { mensajesDeExito, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { claveEnvio, type EnvioUnico } from './useEnvioUnico';

interface AlcanceEditorProps {
  readonly usuario: UsuarioResumen;
  readonly envio: EnvioUnico;
  readonly onAviso: (texto: string, tipo: 'exito' | 'error') => void;
}

interface OpcionAlcance {
  readonly valor: string;
  readonly etiqueta: string;
  readonly detalle: string;
}

/** Columnas según lo que se elige: unidades (vehículo y custodios) o usuarios (nombre e identificador). */
function columnasDe(tipo: 'unidades' | 'monitoristas' | 'supervisores'): Column<OpcionAlcance>[] {
  const unidades = tipo === 'unidades';
  return [
    {
      key: 'etiqueta',
      header: unidades ? TEXTOS.columnaVehiculo : TEXTOS.columnaNombre,
      cell: (opcion) => opcion.etiqueta,
    },
    {
      key: 'detalle',
      header: unidades ? TEXTOS.columnaCustodios : TEXTOS.columnaIdentificador,
      cell: (opcion) => opcion.detalle,
    },
  ];
}

/**
 * Alcance de monitoreo (R6). Un Monitorista recibe unidades; un Supervisor, Monitoristas
 * y un Coordinador, Supervisores. Solo el administrador edita (DEC-140 #1). Las opciones
 * son las que devuelve el `bff`, y el alcance efectivo se muestra tal cual lo devuelve.
 */
export function AlcanceEditor({ usuario, envio, onAviso }: AlcanceEditorProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const invalidar = useInvalidarAdministracion();
  const tipo = controlesDeAlcance(usuario.rol);

  const alcance = useAlcance(usuario.id, tipo !== null);
  const unidades = useUnidadesAlcance(tipo === 'unidades');
  const monitoristas = useUsuariosDeRol(Rol.Monitorista, tipo === 'monitoristas');
  const supervisores = useUsuariosDeRol(Rol.Supervisor, tipo === 'supervisores');

  // Selección que el usuario cambió; `null` mientras no ha tocado la tabla.
  const [cambios, setCambios] = useState<readonly string[] | null>(null);

  if (tipo === null) return null;

  const sujetosDelTipo = tipo === 'monitoristas' ? monitoristas.data : supervisores.data;
  const opciones: OpcionAlcance[] =
    tipo === 'unidades'
      ? [...opcionesUnidadesAlcance(unidades.data ?? [])]
      : (sujetosDelTipo ?? []).map((sujeto) => ({
          valor: sujeto.id,
          etiqueta: etiquetaUsuario(sujeto),
          detalle: etiquetaIdentificador(sujeto),
        }));

  const actuales = tipo === 'unidades' ? alcance.data?.unidadesIds : alcance.data?.subordinadosIds;
  const seleccion = cambios ?? actuales ?? [];
  const clave = claveEnvio('fijarAlcance', usuario.id);
  const pendiente = envio.enCurso(clave);
  const puedeGuardar = opciones.length > 0 && !alcance.isError && !pendiente;

  const guardar = async () => {
    if (!puedeGuardar) return;
    try {
      const token = sesion?.accessToken ?? '';
      const ids = [...seleccion];
      const resultado = await envio.enviar(clave, () =>
        port.fijarAlcance(
          usuario.id,
          tipo === 'unidades' ? { tipo: 'unidades', ids } : { tipo: 'subordinados', ids },
          token,
        ),
      );
      if (!resultado.enviado) return;
      setCambios(null);
      onAviso(mensajesDeExito('alcance'), 'exito');
      await invalidar();
    } catch (fallo) {
      const texto = textoDeFallo(clasificarFallo('fijarAlcance', fallo));
      onAviso(texto ?? '', 'error');
    }
  };

  const tituloTipo =
    tipo === 'unidades'
      ? TEXTOS.alcanceTipoUnidades
      : tipo === 'monitoristas'
        ? TEXTOS.alcanceTipoMonitoristas
        : TEXTOS.alcanceTipoSupervisores;

  return (
    <section aria-labelledby={`alcance-${usuario.id}`} className="flex flex-col gap-3">
      <h3 id={`alcance-${usuario.id}`} tabIndex={-1} className="font-semibold">
        {`${TEXTOS.alcanceTitulo}: ${tituloTipo}`}
      </h3>

      {alcance.data && (
        <p className="text-sm">
          {alcance.data.unidadesEfectivasIds.length === 0
            ? TEXTOS.alcanceVacio
            : `${TEXTOS.alcanceEfectivo}: ${alcance.data.unidadesEfectivasIds.join(', ')}`}
        </p>
      )}

      {opciones.length === 0 ? (
        <Alert variant="info">{TEXTOS.alcanceSinOpciones}</Alert>
      ) : (
        <Table<OpcionAlcance>
          columns={columnasDe(tipo)}
          data={opciones}
          rowKey={(opcion) => opcion.valor}
          selectedKeys={new Set<Key>(seleccion)}
          onSelectionChange={(keys) => setCambios([...keys].map(String))}
          aria-label={`${TEXTOS.alcanceTitulo}: ${tituloTipo}`}
        />
      )}

      <div className="flex justify-end">
        <Button variant="primary" onClick={() => void guardar()} disabled={!puedeGuardar}>
          {pendiente ? TEXTOS.enviando : TEXTOS.alcanceGuardar}
        </Button>
      </div>
    </section>
  );
}
