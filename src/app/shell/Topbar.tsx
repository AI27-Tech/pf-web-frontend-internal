/*
 * Barra superior de la consola interna.
 *
 * Por ahora solo expone búsqueda y notificaciones en el slot `actions` de la
 * Navbar de la librería. La marca no se repite aquí porque ya vive en la
 * sidebar. Los handlers son placeholders listos para cablear.
 */

import { Badge, Button, Input, Navbar } from '@ai27-tech/ui';
import { Asterisk, Bell, Search } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

/*
 * Número de notificaciones sin leer. Cuando exista el dominio real, reemplaza
 * este valor por el dato que venga del estado/servidor.
 */
const UNREAD_COUNT = 0;

/*
 * Iniciales para el avatar, a partir del nombre (o el email como respaldo).
 */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Topbar() {
  const { usuario } = useSession();
  const displayName = usuario?.name ?? usuario?.email ?? 'Invitado';

  return (
    <Navbar
      sticky
      actions={
        <div className="flex items-center gap-2">
          {/* Indicadores de estado (izquierda de la búsqueda). Textos placeholder. */}
          <Badge variant="neutral">
            C4 CDMX / RED NACIONAL
          </Badge>
          <Badge variant="secure" pulse>
            CONDICION: VERDE - NOMINAL
          </Badge>

          <Input
            type="search"
            placeholder="Buscar..."
            aria-label="Buscar"
            startAdornment={<Search size={16} />}
          />

          {/* Botón de emergencia: resalta con el estilo de peligro. Handler placeholder. */}
          <Button variant="danger" startIcon={<Asterisk size={16} />}>
            ESCALACIÓN C4
          </Button>

          <div className="relative">
            <Button variant="ghost" aria-label="Notificaciones">
              <Bell size={18} />
            </Button>
            {UNREAD_COUNT > 0 ? (
              <Badge
                variant="alert"
                pill
                className="pointer-events-none absolute -top-0.5 -right-0.5"
              >
                {UNREAD_COUNT}
              </Badge>
            ) : null}
          </div>

          {/* Separador entre acciones y el usuario */}
          <span className="bg-outline mx-1 h-6 w-px shrink-0 self-center" aria-hidden />

          {/* Usuario (extremo derecho) */}
          <div className="flex items-center gap-2">
            <span
              className="bg-surface-container-highest text-on-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              aria-hidden
            >
              {iniciales(displayName)}
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-on-surface text-sm font-medium">{displayName}</span>
              {usuario?.rol ? (
                <span className="text-on-surface-variant text-xs">{usuario.rol}</span>
              ) : null}
            </span>
          </div>
        </div>
      }
    />
  );
}
