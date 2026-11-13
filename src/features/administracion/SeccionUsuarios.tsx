import { useDeferredValue, useReducer, useState } from 'react';
import { Alert, Badge, Button, FilterTable, type Column } from '@ai27-tech/ui';
import type { Rol } from '@ai27-tech/contracts/roles';

import { BloqueError } from '@/components/feedback/BloqueError';
import type { UsuarioResumen } from '@/lib/contracts/administracion';
import { OPCIONES_ROL } from '@/lib/contracts/administracion';

import { avisoDeEstado, estadoConsulta } from './estadoConsulta';
import { etiquetaIdentificador, etiquetaUsuario } from './etiquetas';
import { ETIQUETAS_ROL, TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { cursorDePagina, PAGINACION_INICIAL, reducirPaginacion } from './paginacionCursor';
import { useUsuarios } from './consultasAdministracion';

interface SeccionUsuariosProps {
  readonly onAbrirUsuario: (id: string) => void;
  readonly onNuevoUsuario: () => void;
}

const COLUMNAS: Column<UsuarioResumen>[] = [
  { key: 'nombre', header: TEXTOS.columnaNombre, cell: (fila) => etiquetaUsuario(fila) },
  {
    key: 'identificador',
    header: TEXTOS.columnaIdentificador,
    cell: (fila) => etiquetaIdentificador(fila),
  },
  {
    key: 'rol',
    header: TEXTOS.columnaRol,
    cell: (fila) => (fila.rol ? ETIQUETAS_ROL[fila.rol] : TEXTOS.sinRol),
  },
  {
    key: 'organizacion',
    header: TEXTOS.columnaOrganizacion,
    cell: (fila) => fila.organizacion?.nombre ?? '—',
  },
  {
    key: 'estado',
    header: TEXTOS.columnaEstado,
    cell: (fila) => (
      <Badge variant={fila.activo ? 'secure' : 'neutral'} dot>
        {fila.activo ? TEXTOS.activo : TEXTOS.inactivo}
      </Badge>
    ),
  },
];

/**
 * Listado de usuarios con búsqueda, filtro por rol y paginación por cursor. Muestra
 * en el orden que recibe del `bff`. La tabla de la librería lleva el estado de carga
 * y el de vacío; los avisos de error, acceso y datos viejos van en una tarjeta.
 */
export function SeccionUsuarios({ onAbrirUsuario, onNuevoUsuario }: SeccionUsuariosProps) {
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState<string>('');
  const [paginacion, despachar] = useReducer(reducirPaginacion, PAGINACION_INICIAL);
  // React aplaza el valor mientras el usuario escribe: la búsqueda no lanza una consulta por tecla.
  const textoAplazado = useDeferredValue(texto);

  const consulta = useUsuarios({
    ...(textoAplazado.trim() ? { texto: textoAplazado.trim() } : {}),
    ...(rol ? { rol: rol as Rol } : {}),
    ...(cursorDePagina(paginacion) ? { cursor: cursorDePagina(paginacion) } : {}),
  });

  const estado = estadoConsulta(
    {
      isLoading: consulta.isLoading,
      isError: consulta.isError,
      error: consulta.error,
      data: consulta.data,
    },
    (datos) => datos.items.length === 0,
  );
  const aviso = avisoDeEstado(estado.estado);
  const reiniciar = () => despachar({ tipo: 'reiniciar' });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="administracion-seccion-usuarios" tabIndex={-1} className="text-lg font-semibold">
          {TEXTOS.usuariosTitulo}
        </h2>
        <Button variant="primary" onClick={onNuevoUsuario}>
          {TEXTOS.nuevoUsuario}
        </Button>
      </div>

      {aviso && estado.estado === 'error' && (
        <BloqueError mensaje={aviso.texto} onReintentar={() => void consulta.refetch()} />
      )}
      {aviso && estado.estado !== 'error' && (
        <Alert variant={aviso.alerta ? 'danger' : 'info'}>{aviso.texto}</Alert>
      )}

      <FilterTable<UsuarioResumen>
        columns={COLUMNAS}
        data={[...(consulta.data?.items ?? [])]}
        rowKey={(fila) => fila.id}
        onRowClick={(fila) => onAbrirUsuario(fila.id)}
        loading={estado.estado === 'cargando'}
        emptyState={TEXTOS.vacio}
        hideCount
        search={texto}
        onSearchChange={(valor) => {
          setTexto(valor);
          reiniciar();
        }}
        searchPlaceholder={TEXTOS.buscarUsuario}
        filters={[
          {
            key: 'rol',
            label: TEXTOS.columnaRol,
            placeholder: TEXTOS.todosLosRoles,
            options: OPCIONES_ROL.map((opcion) => ({
              value: opcion,
              label: ETIQUETAS_ROL[opcion],
            })),
          },
        ]}
        filterValues={{ rol }}
        onFilterChange={(clave, valor) => {
          if (clave === 'rol') setRol(valor);
          reiniciar();
        }}
        onClear={() => {
          setTexto('');
          setRol('');
          reiniciar();
        }}
        aria-label={TEXTOS.usuariosTitulo}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={paginacion.pagina === 0}
          onClick={() => despachar({ tipo: 'anterior' })}
        >
          {TEXTOS.anterior}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!consulta.data?.cursorSiguiente}
          onClick={() => {
            const siguiente = consulta.data?.cursorSiguiente;
            if (siguiente) despachar({ tipo: 'siguiente', cursorSiguiente: siguiente });
          }}
        >
          {TEXTOS.siguiente}
        </Button>
      </div>
    </div>
  );
}
