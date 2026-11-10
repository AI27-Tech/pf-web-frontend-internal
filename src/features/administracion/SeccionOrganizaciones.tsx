import { useState } from 'react';
import { Button, Table, type Column } from '@ai27-tech/ui';

import type { Organizacion } from '@/lib/contracts/administracion';

import { DesactivarOrganizacionDialog } from './DesactivarOrganizacionDialog';
import { EstadoBadge } from './EstadoBadge';
import { estadoConsulta } from './estadoConsulta';
import { OrganizacionFormDialog } from './OrganizacionFormDialog';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { RegionConsulta } from './RegionConsulta';
import { useOrganizaciones } from './consultasAdministracion';
import type { EnvioUnico } from './useEnvioUnico';

interface SeccionOrganizacionesProps {
  readonly envio: EnvioUnico;
  readonly onAviso: (texto: string, tipo: 'exito' | 'error') => void;
}

type DialogoOrganizacion =
  | { readonly tipo: 'crear' }
  | { readonly tipo: 'editar'; readonly organizacion: Organizacion }
  | { readonly tipo: 'desactivar'; readonly organizacion: Organizacion }
  | null;

const SIN_DATO = TEXTOS.sinDato;

/**
 * Lista plana de organizaciones de Cliente (R9). El tenant es solo lectura. No hay
 * organización padre ni reactivar: desactivar es terminal (PA-8).
 */
export function SeccionOrganizaciones({ envio, onAviso }: SeccionOrganizacionesProps) {
  const consulta = useOrganizaciones();
  const [dialogo, setDialogo] = useState<DialogoOrganizacion>(null);

  const estado = estadoConsulta(
    {
      isLoading: consulta.isLoading,
      isError: consulta.isError,
      error: consulta.error,
      data: consulta.data,
    },
    (datos) => datos.length === 0,
  );

  const columnas: Column<Organizacion>[] = [
    { key: 'nombre', header: TEXTOS.columnaNombre, cell: (fila) => fila.nombre },
    { key: 'correo', header: TEXTOS.columnaCorreo, cell: (fila) => fila.correo ?? SIN_DATO },
    { key: 'telefono', header: TEXTOS.columnaTelefono, cell: (fila) => fila.telefono ?? SIN_DATO },
    { key: 'tenant', header: TEXTOS.columnaTenant, cell: (fila) => fila.id },
    {
      key: 'usuarios',
      header: TEXTOS.columnaUsuariosActivos,
      cell: (fila) => fila.usuariosActivos,
    },
    {
      key: 'estado',
      header: TEXTOS.columnaEstado,
      cell: (fila) => <EstadoBadge activo={fila.activa} />,
    },
    {
      key: 'acciones',
      header: TEXTOS.columnaAcciones,
      cell: (fila) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogo({ tipo: 'editar', organizacion: fila })}
          >
            {TEXTOS.editar}
          </Button>
          {fila.activa && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDialogo({ tipo: 'desactivar', organizacion: fila })}
            >
              {TEXTOS.desactivar}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const cerrar = () => setDialogo(null);
  const editando = dialogo?.tipo === 'editar' ? dialogo.organizacion : undefined;
  const desactivando = dialogo?.tipo === 'desactivar' ? dialogo.organizacion : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="administracion-seccion-organizaciones"
          tabIndex={-1}
          className="text-lg font-semibold"
        >
          {TEXTOS.organizacionesTitulo}
        </h2>
        <Button variant="primary" onClick={() => setDialogo({ tipo: 'crear' })}>
          {TEXTOS.nuevaOrganizacion}
        </Button>
      </div>

      {estado.estado === 'datos' || estado.estado === 'datos_desactualizado' ? (
        <RegionConsulta estado={estado.estado} etiqueta={TEXTOS.organizacionesTitulo}>
          <Table<Organizacion>
            columns={columnas}
            data={[...(consulta.data ?? [])]}
            rowKey={(fila) => fila.id}
            aria-label={TEXTOS.organizacionesTitulo}
          />
        </RegionConsulta>
      ) : (
        <RegionConsulta
          estado={estado.estado}
          etiqueta={TEXTOS.organizacionesTitulo}
          textoVacio={TEXTOS.organizacionesVacias}
          onReintentar={() => void consulta.refetch()}
        />
      )}

      <OrganizacionFormDialog
        abierto={dialogo?.tipo === 'crear' || dialogo?.tipo === 'editar'}
        onCerrar={cerrar}
        {...(editando ? { organizacion: editando } : {})}
        envio={envio}
        idEncabezadoSeccion="administracion-seccion-organizaciones"
        onGuardada={(mensaje) => onAviso(mensaje, 'exito')}
      />

      {desactivando && (
        <DesactivarOrganizacionDialog
          abierto={dialogo?.tipo === 'desactivar'}
          onCerrar={cerrar}
          organizacion={desactivando}
          envio={envio}
          idEncabezadoSeccion="administracion-seccion-organizaciones"
          onCompletado={(mensaje) => onAviso(mensaje, 'exito')}
        />
      )}
    </div>
  );
}
