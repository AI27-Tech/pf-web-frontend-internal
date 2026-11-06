/*
 * Envoltorio común de los diálogos de administración.
 *
 * Usa el `Modal` de la librería sin duplicarlo. Añade dos reglas de E8-T19:
 * - Mientras hay una solicitud pendiente, Esc, el clic en el overlay y el botón
 *   de cerrar quedan desactivados (R13.10).
 * - Al cerrar, el foco vuelve al elemento que abrió el diálogo. Si ese elemento ya
 *   no existe, el foco va al encabezado de la sección (R13.11). Ese encabezado
 *   debe tener `tabIndex={-1}` y el `id` que se pasa en `idEncabezadoSeccion`.
 */

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Modal } from '@ai27-tech/ui';

interface DialogoAdministracionProps {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  /** Hay una solicitud en vuelo: bloquea los tres medios de cierre. */
  readonly pendiente: boolean;
  readonly titulo: string;
  /** Id del encabezado de la sección que recibe el foco como respaldo. */
  readonly idEncabezadoSeccion: string;
  readonly pie?: ReactNode;
  readonly children: ReactNode;
}

export function DialogoAdministracion({
  abierto,
  onCerrar,
  pendiente,
  titulo,
  idEncabezadoSeccion,
  pie,
  children,
}: DialogoAdministracionProps) {
  const disparador = useRef<HTMLElement | null>(null);
  const abiertoAntes = useRef(false);

  // Layout effect: captura y devuelve el foco antes de que el navegador pinte.
  useLayoutEffect(() => {
    if (abierto && !abiertoAntes.current) {
      const activo = document.activeElement;
      disparador.current = activo instanceof HTMLElement ? activo : null;
    }

    if (!abierto && abiertoAntes.current) {
      const elemento = disparador.current;
      disparador.current = null;
      if (elemento?.isConnected) elemento.focus();
      else document.getElementById(idEncabezadoSeccion)?.focus();
    }

    abiertoAntes.current = abierto;
  }, [abierto, idEncabezadoSeccion]);

  return (
    <Modal
      open={abierto}
      onClose={() => {
        if (!pendiente) onCerrar();
      }}
      title={titulo}
      footer={pie}
      closeOnEsc={!pendiente}
      closeOnOverlayClick={!pendiente}
      showCloseButton={!pendiente}
    >
      {children}
    </Modal>
  );
}
