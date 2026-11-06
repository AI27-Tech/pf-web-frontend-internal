/*
 * Envío único por acción y objetivo (R3.10, R5.2, R8.5, R8.6, R9.10, R10.11, R11.3, R13.4).
 *
 * Un cerrojo en `useRef` bloquea la segunda confirmación síncrona, aunque el
 * estado de React todavía no se haya repintado. El estado `enCurso` se mantiene
 * aparte para que la interfaz deshabilite el control. La clave es
 * `(acción, objetivo)`: una solicitud en curso para un usuario no bloquea a otro.
 *
 * El cerrojo se libera al terminar, con éxito o con error. No hay reintento
 * automático. El hook debe montarse en un componente que sobreviva al cierre del
 * diálogo, si la solicitud debe seguir bloqueando el control al cerrarlo.
 */

import { useCallback, useRef, useState } from 'react';

export interface EnvioUnico {
  /**
   * Ejecuta `operacion` salvo que la misma clave ya tenga una en curso. En ese
   * caso no llama a `operacion` y devuelve `undefined`. Los errores de la
   * operación se propagan al llamador.
   */
  readonly enviar: <T>(clave: string, operacion: () => Promise<T>) => Promise<T | undefined>;
  /** Verdadero mientras la clave tiene una solicitud en vuelo. */
  readonly enCurso: (clave: string) => boolean;
}

export function claveEnvio(accion: string, objetivo: string): string {
  return `${accion}:${objetivo}`;
}

export function useEnvioUnico(): EnvioUnico {
  const enVuelo = useRef(new Set<string>());
  const [claves, setClaves] = useState<ReadonlySet<string>>(() => new Set());

  const enviar = useCallback(async <T>(clave: string, operacion: () => Promise<T>) => {
    if (enVuelo.current.has(clave)) return undefined;

    enVuelo.current.add(clave);
    setClaves(new Set(enVuelo.current));
    try {
      return await operacion();
    } finally {
      enVuelo.current.delete(clave);
      setClaves(new Set(enVuelo.current));
    }
  }, []);

  const enCurso = useCallback((clave: string) => claves.has(clave), [claves]);

  return { enviar, enCurso };
}
