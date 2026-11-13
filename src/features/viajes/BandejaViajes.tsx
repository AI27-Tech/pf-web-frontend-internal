/*
 * PresentaciÃ³n de la bandeja operativa de viajes (E8-T7).
 *
 * Compone `FilterTable` (con las columnas de `filaViaje`, el filtro de estado y
 * los estados de carga/vacÃ­o) y `Pagination` (mapeada al cursor del bff). Resuelve
 * los cuatro estados de UI y delega el 401 al flujo de sesiÃ³n del AppShell.
 *
 * Toda la lÃ³gica (query, estado de vista, acciones) vive en `useBandejaViajes`;
 * aquÃ­ solo se mapea ese contrato a los componentes de @ai27-tech/ui. No se crean
 * componentes de interfaz nuevos: los mensajes de vacÃ­o/error/delegaciÃ³n son
 * composiciÃ³n local de `Card`/`Button`/texto de la librerÃ­a.
 */

import { useEffect } from 'react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  FilterBar,
  PageHeader,
  Pagination,
  Table,
} from '@ai27-tech/ui';
import type { FilterDefinition } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';

import { BloqueError } from '@/components/feedback/BloqueError';
import { useSession } from '@/context/SessionContext';
import { ESTADOS_VIAJE } from '@/lib/contracts/viajes';

import { obtenerColumnasViaje } from './filaViaje';
import { useBandejaViajes } from './useBandejaViajes';
import type { ViajeVista } from './viajeVista';

/**
 * DefiniciÃ³n del Filtro_Estado para el `FilterBar` de la librerÃ­a (Requirement 3.1).
 *
 * Las opciones salen del enum `EstadoViaje` (`ESTADOS_VIAJE`). El "sin filtro" lo
 * da el `placeholder`; limpiar el filtro (Requirement 3.3) usa la afordancia
 * `onClear`/`showClear` del `FilterBar`. No se define control propio.
 */
const filtroEstado: FilterDefinition = {
  key: 'estado',
  label: 'Estado',
  placeholder: 'Todos los estados',
  options: ESTADOS_VIAJE.map((e) => ({ label: e, value: e })),
};

/**
 * TamaÃ±o de pÃ¡gina asumido para el control `Pagination` numÃ©rico de la librerÃ­a.
 *
 * BRECHA DE CONTRATO: el bff pagina por cursor opaco y NO expone su tamaÃ±o de
 * pÃ¡gina en la respuesta (`PaginaViajesResumen` = { items, cursor_siguiente }).
 * El `Pagination` de la librerÃ­a necesita un `pageSize` para derivar el nÃºmero de
 * pÃ¡ginas; aquÃ­ se usa un espejo del tamaÃ±o del bff. Sirve solo para posicionar el
 * control (page/total): la verdad de "hay mÃ¡s" la da `cursor_siguiente`, no este
 * nÃºmero. Si el bff publica su tamaÃ±o de pÃ¡gina, leerlo de ahÃ­.
 */
const TAMANO_PAGINA = 20;

export function BandejaViajes() {
  const b = useBandejaViajes();
  const { usuario } = useSession();
  const navigate = useNavigate();
  const columnasViaje = obtenerColumnasViaje(navigate);

  // Requirement 7.3: un 401 no pinta el error genérico del listado; se delega
  // al flujo de sesión del AppShell (logout limpia el TokenStore y la guarda
  // _private redirige a /login conservando ?redirect=).
  if (b.esNoAutorizado) {
    return <DelegacionSesion />;
  }

  // Un 403 no es sesión vencida: se avisa la falta de permiso y la sesión sigue.
  if (b.esProhibido) {
    return <SinPermiso />;
  }

  // Requirement 7.1/7.2: cualquier otro fallo muestra error + reintento (filtro vigente).
  if (b.error) {
    return <EstadoError onReintentar={b.reintentar} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-4)' }}>
      <PageHeader
        title="Viajes"
        actions={
          usuario?.rol === 'jefe_operativo' && (
            <Button
              variant="primary"
              type="button"
              onClick={() => void navigate({ to: '/viajes/crear' })}
            >
              Crear viaje
            </Button>
          )
        }
      />

      {/*
        Barra de filtros de la librerÃ­a (FilterBar). Siempre montada (Req 3.5/6.2).
        - `filters`: el filtro de estado (Req 3.1).
        - cambiar el valor reejecuta con `estado` y reinicia la paginaciÃ³n (Req 3.2/4.5).
        - `onClear`/`showClear`: limpia el filtro (Req 3.3) con la afordancia propia.
        - `showActiveFilterChips`: muestra el estado activo como chip de la librerÃ­a.
        No se usa bÃºsqueda de texto ni toggle de vista: el contrato del bff solo
        admite `estado` (el filtro por cliente es brecha de contrato, fuera de V1).
      */}
      <FilterBar
        filters={[filtroEstado]}
        filterValues={{ estado: b.estadoSeleccionado ?? '' }}
        onFilterChange={(_key: string, value: string) => b.cambiarFiltro(value || undefined)}
        onClear={() => b.cambiarFiltro(undefined)}
        showClear={Boolean(b.estadoSeleccionado)}
        showActiveFilterChips
      />

      <Table<ViajeVista>
        columns={columnasViaje}
        data={[...b.filas]}
        loading={b.cargando} // Requirement 5.1
        emptyState={<MensajeVacio />} // Requirement 6.1
        aria-label="Bandeja de viajes"
      />

      {/*
        Requirement 4: el `Pagination` de la librerÃ­a es por nÃºmero de pÃ¡gina;
        el bff pagina por cursor opaco. Se mapea manteniendo un `page` real
        (b.pagina) y un `total` que solo codifica "Â¿hay una pÃ¡gina mÃ¡s?":
          - con `cursorSiguiente`: hay al menos una pÃ¡gina adicional â†’ total que
            fuerza al control a mostrar el botÃ³n "siguiente" (Req 4.1).
          - sin `cursorSiguiente`: la pÃ¡gina actual es la Ãºltima â†’ total exacto
            hasta aquÃ­, sin botÃ³n siguiente (Req 4.3).
        `onPageChange(n)` navega a la pÃ¡gina adyacente: avanzar usa el
        `cursor_siguiente` recibido (Req 4.2), retroceder reusa el cursor visitado.
        Brecha registrada (tasks.md #4): la librerÃ­a no ofrece paginaciÃ³n por
        cursor; no se construye un control propio.
      */}
      {(b.pagina > 1 || b.cursorSiguiente) && (
        <Pagination
          page={b.pagina}
          pageSize={TAMANO_PAGINA}
          total={
            b.cursorSiguiente
              ? b.pagina * TAMANO_PAGINA + 1
              : (b.pagina - 1) * TAMANO_PAGINA + b.filas.length
          }
          showInfo={false}
          onPageChange={(n) => b.irAPagina(n)}
        />
      )}
    </div>
  );
}

/** Estado vacÃ­o: no hay viajes en el alcance. El filtro sigue visible (Req 6.2). */
function MensajeVacio() {
  return (
    <div style={{ padding: 'var(--ui-space-4)', textAlign: 'center' }}>
      <p className="ui-text-body-sm" style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}>
        No hay viajes en tu alcance.
      </p>
    </div>
  );
}

/**
 * Estado de error con acción de reintento (Req 7.1/7.2). `BloqueError` (Alert
 * danger con el botón Reintentar) va dentro de un `Card`.
 */
function EstadoError({ onReintentar }: { readonly onReintentar: () => void }) {
  return (
    <Card variant="outlined">
      <CardBody>
        <BloqueError
          mensaje="No se pudo cargar el listado de viajes."
          onReintentar={onReintentar}
        />
      </CardBody>
    </Card>
  );
}

/** Sin permiso (403): la sesión es válida pero el rol no alcanza al listado. */
function SinPermiso() {
  return (
    <Card variant="outlined">
      <CardBody>
        <Alert variant="danger">No tienes permiso para ver el listado de viajes.</Alert>
      </CardBody>
    </Card>
  );
}

/**
 * DelegaciÃ³n de sesiÃ³n en 401 (Req 7.3). No pinta error: cierra la sesiÃ³n local
 * y deja que la guarda `_private` redirija a /login conservando el destino.
 */
function DelegacionSesion() {
  const { logout } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await logout();
      void navigate({ to: '/login', search: { redirect: '/viajes' } });
    })();
  }, [logout, navigate]);

  return null;
}
