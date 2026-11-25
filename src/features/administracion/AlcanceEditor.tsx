import { useState, type Key } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Inline, Stack, Table, type Column } from '@ai27-tech/ui';
import { Rol } from '@ai27-tech/contracts/roles';

import { useAdministracionPort } from '@/context/AdministracionContext';
import { useSession } from '@/context/SessionContext';
import type { UsuarioResumen } from '@/lib/contracts/administracion';

import { controlesDeAlcance, type TipoAlcance } from './afordancias';
import {
  CLAVE_ADMINISTRACION,
  useAlcance,
  useClientesAlcance,
  useInvalidarAdministracion,
  useOrganizaciones,
  useUsuariosDeRol,
} from './consultasAdministracion';
import {
  clasificarFallo,
  ErrorConflictoAlcance,
  ErrorValidacion,
  textoDeFallo,
} from './clasificarError';
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

/** Columnas según lo que se elige: clientes (nombre e id) o usuarios (nombre e identificador). */
function columnasDe(tipo: TipoAlcance): Column<OpcionAlcance>[] {
  const clientes = tipo === 'clientes';
  return [
    {
      key: 'etiqueta',
      header: clientes ? TEXTOS.columnaCliente : TEXTOS.columnaNombre,
      cell: (opcion) => opcion.etiqueta,
    },
    {
      key: 'detalle',
      header: TEXTOS.columnaIdentificador,
      cell: (opcion) => opcion.detalle,
    },
  ];
}

/** Texto del fallo al guardar. "Mis clientes" explica el `400` y el `409 rol_sin_alcance` (R12.6, R12.7). */
function textoDeFalloAlcance(tipo: TipoAlcance, fallo: unknown): string {
  const clasificado = clasificarFallo('fijarAlcance', fallo);
  if (tipo === 'clientes') {
    if (clasificado instanceof ErrorValidacion) return TEXTOS.alcanceClientesInvalidos;
    if (clasificado instanceof ErrorConflictoAlcance && clasificado.motivo === 'rol_sin_alcance') {
      return TEXTOS.alcanceClientesRolSinAlcance;
    }
  }
  return textoDeFallo(clasificado) ?? '';
}

/**
 * Alcance de monitoreo (R6, M12). Un Monitorista recibe clientes ("mis clientes", DEC-149 #18);
 * un Supervisor, Monitoristas y un Coordinador, Supervisores. Solo el administrador edita
 * (DEC-140 #1). Un cliente asignado que ya no está activo se muestra con su nombre, marcado
 * "Desactivado", y no se reenvía. El alcance efectivo se muestra tal cual lo devuelve el `bff`.
 */
export function AlcanceEditor({ usuario, envio, onAviso }: AlcanceEditorProps) {
  const port = useAdministracionPort();
  const { sesion } = useSession();
  const invalidar = useInvalidarAdministracion();
  const queryClient = useQueryClient();
  const tipo = controlesDeAlcance(usuario.rol);

  const alcance = useAlcance(usuario.id, tipo !== null);
  const clientes = useClientesAlcance(tipo === 'clientes');
  const monitoristas = useUsuariosDeRol(Rol.Monitorista, tipo === 'monitoristas');
  const supervisores = useUsuariosDeRol(Rol.Supervisor, tipo === 'supervisores');

  const clientesActivos = (clientes.data ?? []).filter((cliente) => cliente.estado === 'activo');
  const idsActivos = new Set(clientesActivos.map((cliente) => cliente.id));
  // Sin la lista de activos no se puede saber qué está desactivado: no se descarta nada.
  const asignados = alcance.data?.clientesIds ?? [];
  const desactivados =
    tipo === 'clientes' && clientes.isSuccess ? asignados.filter((id) => !idsActivos.has(id)) : [];
  // La organización comparte id con el cliente (DEC-144 #2): da el nombre del desactivado.
  const organizaciones = useOrganizaciones(desactivados.length > 0);

  // Selección que el usuario cambió; `null` mientras no ha tocado la tabla.
  const [cambios, setCambios] = useState<readonly string[] | null>(null);

  if (tipo === null) return null;

  const nombreDeCliente = (id: string): string =>
    clientesActivos.find((cliente) => cliente.id === id)?.nombre ??
    organizaciones.data?.find((organizacion) => organizacion.id === id)?.nombre ??
    id;

  const sujetosDelTipo = tipo === 'monitoristas' ? monitoristas.data : supervisores.data;
  const opciones: OpcionAlcance[] =
    tipo === 'clientes'
      ? clientesActivos.map((cliente) => ({
          valor: cliente.id,
          etiqueta: cliente.nombre,
          detalle: cliente.id,
        }))
      : (sujetosDelTipo ?? []).map((sujeto) => ({
          valor: sujeto.id,
          etiqueta: etiquetaUsuario(sujeto),
          detalle: etiquetaIdentificador(sujeto),
        }));

  const actuales =
    tipo === 'clientes'
      ? asignados.filter((id) => idsActivos.has(id))
      : alcance.data?.subordinadosIds;
  const seleccion = cambios ?? actuales ?? [];
  const clave = claveEnvio('fijarAlcance', usuario.id);
  const pendiente = envio.enCurso(clave);
  const hayQueGuardar = opciones.length > 0 || desactivados.length > 0;
  const puedeGuardar =
    hayQueGuardar &&
    !alcance.isError &&
    !(tipo === 'clientes' && !clientes.isSuccess) &&
    !pendiente;

  const guardar = async () => {
    if (!puedeGuardar) return;
    try {
      const token = sesion?.accessToken ?? '';
      // Nunca se reenvía un cliente desactivado: el servidor respondería 400 (R12.5).
      const ids =
        tipo === 'clientes' ? seleccion.filter((id) => idsActivos.has(id)) : [...seleccion];
      const resultado = await envio.enviar(clave, () =>
        port.fijarAlcance(
          usuario.id,
          tipo === 'clientes' ? { tipo: 'clientes', ids } : { tipo: 'subordinados', ids },
          token,
        ),
      );
      if (!resultado.enviado) return;
      setCambios(null);
      onAviso(mensajesDeExito('alcance'), 'exito');
      await invalidar();
    } catch (fallo) {
      onAviso(textoDeFalloAlcance(tipo, fallo), 'error');
      // La lista de activos pudo cambiar: se vuelve a pedir para que la selección sea verificable.
      if (
        tipo === 'clientes' &&
        clasificarFallo('fijarAlcance', fallo) instanceof ErrorValidacion
      ) {
        await queryClient.invalidateQueries({
          queryKey: [CLAVE_ADMINISTRACION, 'clientes-activos'],
        });
      }
    }
  };

  const tituloTipo =
    tipo === 'clientes'
      ? TEXTOS.alcanceTipoClientes
      : tipo === 'monitoristas'
        ? TEXTOS.alcanceTipoMonitoristas
        : TEXTOS.alcanceTipoSupervisores;

  return (
    <section aria-labelledby={`alcance-${usuario.id}`}>
      <Stack gap={3}>
        <h3 id={`alcance-${usuario.id}`} tabIndex={-1} className="font-semibold">
          {`${TEXTOS.alcanceTitulo}: ${tituloTipo}`}
        </h3>

        {alcance.data && (
          <p className="text-sm">
            {alcance.data.clientesEfectivosIds.length === 0
              ? TEXTOS.alcanceVacio
              : `${TEXTOS.alcanceEfectivo}: ${alcance.data.clientesEfectivosIds
                  .map(nombreDeCliente)
                  .join(', ')}`}
          </p>
        )}

        {tipo === 'clientes' && clientes.isError && (
          <Alert variant="danger">{TEXTOS.alcanceClientesNoDisponibles}</Alert>
        )}

        {desactivados.length > 0 && (
          <Alert variant="warning">
            <Stack gap={1}>
              <span>{TEXTOS.alcanceClientesDesactivados}</span>
              <Inline as="ul" gap={2} wrap style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {desactivados.map((id) => (
                  <Inline as="li" key={id} gap={1} align="center" wrap={false}>
                    <span>{nombreDeCliente(id)}</span>
                    <Badge variant="neutral">{TEXTOS.alcanceClienteDesactivado}</Badge>
                  </Inline>
                ))}
              </Inline>
            </Stack>
          </Alert>
        )}

        {opciones.length === 0 ? (
          !clientes.isError && <Alert variant="info">{TEXTOS.alcanceSinOpciones}</Alert>
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

        <Inline justify="end">
          <Button variant="primary" onClick={() => void guardar()} disabled={!puedeGuardar}>
            {pendiente ? TEXTOS.enviando : TEXTOS.alcanceGuardar}
          </Button>
        </Inline>
      </Stack>
    </section>
  );
}
