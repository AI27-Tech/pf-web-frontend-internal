/*
 * Enlace para los items del `Breadcrumb` de `@ai27-tech/ui`.
 *
 * La librería renderiza cada item con `href`, mientras que el `Link` de TanStack
 * Router recibe la ruta en `to`. Este componente traduce `href` a `to` y reenvía
 * solo las props que el `Breadcrumb` le pasa (className, title, onClick, children).
 */

import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export interface EnlaceRutaProps {
  /** Ruta absoluta ya resuelta, por ejemplo `/viajes/VJ-10`. */
  readonly href: string;
  readonly className?: string | undefined;
  readonly title?: string | undefined;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement> | undefined;
  readonly children?: ReactNode;
}

export function EnlaceRuta({ href, className, title, onClick, children }: EnlaceRutaProps) {
  return (
    <Link to={href} className={className} title={title} onClick={onClick}>
      {children}
    </Link>
  );
}
