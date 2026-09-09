/*
 * Input — primitiva propia con etiqueta y texto de error accesibles.
 * Sin librerías de componentes (Tailwind puro).
 *
 * Soporta slots opcionales: `leadingSlot` (icono a la izquierda, p. ej. correo o
 * candado) y `trailingSlot` (a la derecha, p. ej. el botón de mostrar/ocultar
 * contraseña). Ambos son decorativos desde el punto de vista de la estructura;
 * el campo sigue siendo un <input> con su <label> asociado.
 */

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Mensaje de error a mostrar bajo el campo. Marca el input como inválido. */
  error?: string;
  /** Contenido antes del campo (icono). Se le reserva espacio con padding. */
  leadingSlot?: ReactNode;
  /** Contenido después del campo (icono o botón). Se le reserva espacio. */
  trailingSlot?: ReactNode;
}

export function Input({
  label,
  error,
  leadingSlot,
  trailingSlot,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>

      <div className="relative flex items-center">
        {leadingSlot ? (
          <span className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
            {leadingSlot}
          </span>
        ) : null}

        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-500',
            'dark:bg-neutral-900 dark:text-neutral-100',
            leadingSlot ? 'pl-10' : undefined,
            trailingSlot ? 'pr-10' : undefined,
            error
              ? 'border-red-500 focus-visible:outline-red-500'
              : 'border-neutral-300 dark:border-neutral-700',
            className,
          )}
          {...props}
        />

        {trailingSlot ? (
          <span className="absolute right-2 flex items-center">{trailingSlot}</span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
