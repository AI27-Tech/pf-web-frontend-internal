/*
 * Barra de progreso de navegación entre rutas.
 *
 * Indicador de "la ruta está cargando" que se pinta como una barra delgada fija
 * en el borde superior de la ventana. Se usa como `defaultPendingComponent` del
 * router (ver `main.tsx`): TanStack Router la monta mientras resuelve la ruta
 * destino (descarga del chunk y/o `beforeLoad`) y la desmonta al terminar.
 *
 * Por qué una barra superior y no un bloque centrado: no desplaza el contenido
 * (no hay salto de layout) y da señal inmediata de que el clic sí respondió, lo
 * que evita el doble clic cuando el cambio de vista tarda unas centenas de ms.
 *
 * BRECHA DE LIBRERÍA (reportar): `@ai27-tech/ui` no publica un `Spinner` /
 * `ProgressBar` reutilizable (solo spinners internos de `Button`/`Table`). Este
 * componente es chrome de layout, no un componente de dominio, y usa SOLO
 * variables CSS de la librería (`--ui-color-primary`, duraciones, z-index). Si
 * la librería publica una barra de progreso, se reemplaza por ella sin tocar el
 * router.
 */

/**
 * Barra de progreso superior para transiciones de ruta.
 *
 * Es puramente visual y sin estado: la animación de avance la da la clase CSS
 * `ui-route-progress__bar` (definida en los estilos globales). El propio montaje
 * y desmontaje los controla el router según el estado `pending` de la ruta.
 */
export function RouteProgressBar() {
  return (
    <div
      className="ui-route-progress"
      role="progressbar"
      aria-label="Cargando la página"
      aria-busy="true"
    >
      <div className="ui-route-progress__bar" />
    </div>
  );
}
