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
    'bg-primary text-on-primary hover:bg-primary-container focus-visible:outline-primary',
  secondary:
    'border border-outline-variant bg-transparent text-on-surface ' +
    'hover:bg-surface-container focus-visible:outline-primary',
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
