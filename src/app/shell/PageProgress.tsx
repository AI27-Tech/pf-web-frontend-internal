/*
 * PageProgress: la barra de carga general de la página.
 *
 * Se pinta fija en el borde superior mientras la página carga. Usa el `ProgressBar` de
 * `@ai27-tech/ui` en modo indeterminado, igual que el portal del cliente. Reemplaza a la
 * antigua `RouteProgressBar`, que dibujaba la barra con CSS propio.
 *
 * "Carga" son dos cosas:
 *   - El router resuelve una navegación (`status === 'pending'`), igual que en el cliente.
 *   - Hay una consulta en vuelo que aún no tiene datos. A diferencia del cliente, este
 *     portal no lee en `loader`s sino con `useQuery` dentro de las pantallas, así que el
 *     router queda en `idle` casi al instante y por sí solo no mostraría nada. Las
 *     recargas en segundo plano (consulta que ya tiene datos, por ejemplo un sondeo) no
 *     cuentan: no deben parpadear la barra.
 */
import { useIsFetching } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { ProgressBar } from '@ai27-tech/ui';

export function PageProgress() {
  const navegando = useRouterState({ select: (estado) => estado.status === 'pending' });
  const cargandoDatos =
    useIsFetching({ predicate: (consulta) => consulta.state.data === undefined }) > 0;

  if (!navegando && !cargandoDatos) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-(--ui-z-popover)">
      <ProgressBar size="sm" label="Cargando página" />
    </div>
  );
}
