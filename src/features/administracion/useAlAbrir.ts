import { useState } from 'react';

/**
 * Ejecuta `alAbrir` en el render en que `abierto` pasa de falso a verdadero.
 * Reinicia el estado de un diálogo sin usar un efecto: el patrón es el que
 * documenta React para ajustar estado cuando cambian las props.
 */
export function useAlAbrir(abierto: boolean, alAbrir: () => void): void {
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);

  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) alAbrir();
  }
}
