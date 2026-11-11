import { useState } from 'react';
import { Badge, Button, Card, CardBody, Table, type Column } from '@ai27-tech/ui';

import type { Organizacion } from '@/lib/contracts/administracion';

import { avisoDeEstado, estadoConsulta } from './estadoConsulta';
import { DesactivarOrganizacionDialog } from './DesactivarOrganizacionDialog';
import { OrganizacionFormDialog } from './OrganizacionFormDialog';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';
import { useInvalidarAdministracion, useOrganizaciones } from './consultasAdministracion';
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

/**
 * Lista plana de organizaciones de Cliente (R9). El tenant es solo lectura. No hay
 * organización padre ni reactivar: desactivar es terminal (PA-8).
 */
export function SeccionOrganizaciones({ envio, onAviso }: SeccionOrganizacionesProps) {
  const consulta = useOrganizaciones();
  const invalidar = useInvalidarAdministracion();
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
  const aviso = avisoDeEstado(estado.estado);

  const columnas: Column<Organizacion>[] = [
    { key: 'nombre', header: TEXTOS.columnaNombre, cell: (fila) => fila.nombre },
    { key: 'correo', header: TEXTOS.columnaCorreo, cell: (fila) => fila.correo ?? TEXTOS.sinDato },
    {
      key: 'telefono',
      header: TEXTOS.columnaTelefono,
      cell: (fila) => fila.telefono ?? TEXTOS.sinDato,
    },
    { key: 'tenant', header: TEXTOS.columnaTenant, cell: (fila) => fila.id },
    {
      key: 'usuarios',
      header: TEXTOS.columnaUsuariosActivos,
      cell: (fila) => fila.usuariosActivos,
    },
    {
      key: 'estado',
      header: TEXTOS.columnaEstado,
      cell: (fila) => (
        <Badge variant={fila.activa ? 'secure' : 'neutral'} dot>
          {fila.activa ? TEXTOS.activo : TEXTOS.inactivo}
        </Badge>
      ),
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

      {aviso && (
        <Card variant="outlined">
          <CardBody>
            <p role={aviso.alerta ? 'alert' : 'status'}>{aviso.texto}</p>
            {estado.estado === 'error' && (
              <Button variant="outline" size="sm" onClick={() => void consulta.refetch()}>
                {TEXTOS.reintentar}
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      <Table<Organizacion>
        columns={columnas}
        data={[...(consulta.data ?? [])]}
        rowKey={(fila) => fila.id}
        loading={estado.estado === 'cargando'}
        emptyState={TEXTOS.organizacionesVacias}
        aria-label={TEXTOS.organizacionesTitulo}
      />

      <OrganizacionFormDialog
        abierto={dialogo?.tipo === 'crear' || dialogo?.tipo === 'editar'}
        onCerrar={cerrar}
        {...(editando ? { organizacion: editando } : {})}
        envio={envio}
        onGuardada={(mensaje) => {
          onAviso(mensaje, 'exito');
          void invalidar();
        }}
      />

      {desactivando && (
        <DesactivarOrganizacionDialog
          abierto={dialogo?.tipo === 'desactivar'}
          onCerrar={cerrar}
          organizacion={desactivando}
          envio={envio}
          onCompletado={(mensaje) => onAviso(mensaje, 'exito')}
        />
      )}
    </div>
  );
}
