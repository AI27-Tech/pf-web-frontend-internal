import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { listarTodosClientes } from '@/lib/api/clientes';

/** habilitado en falso evita pedir el catálogo a un rol que no lo puede listar. */
export function useNombresCliente(habilitado = true) {
  const { sesion } = useSession();
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!sesion || !habilitado) return;
    void listarTodosClientes(sesion.accessToken)
      .then((clientes) => {
        const mapa: Record<string, string> = {};
        for (const cliente of clientes) mapa[cliente.id] = cliente.nombre;
        setNombres(mapa);
      })
      .catch(() => undefined);
  }, [sesion, habilitado]);
  return nombres;
}
