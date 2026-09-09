/*
 * Button — primitiva propia. Sin librerías de componentes (Tailwind puro).
 */

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:outline-neutral-900 ' +
    'dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
  secondary:
    'border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-100 ' +
    'focus-visible:outline-neutral-500 dark:border-neutral-700 dark:text-neutral-100 ' +
    'dark:hover:bg-neutral-900',
};

export function Button({ variant = 'primary', className, type, ...props }: ButtonProps) {
  return (
    <button
      // Un <button> sin type explícito envía el formulario: lo fijamos a 'button'
      // por defecto para que solo envíe quien lo pida con type="submit".
      type={type ?? 'button'}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
