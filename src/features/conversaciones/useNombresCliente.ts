import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { listarTodosClientes } from '@/lib/api/clientes';

export function useNombresCliente() {
  const { sesion } = useSession();
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!sesion) return;
    void listarTodosClientes(sesion.accessToken)
      .then((clientes) => {
        const mapa: Record<string, string> = {};
        for (const cliente of clientes) mapa[cliente.id] = cliente.nombre;
        setNombres(mapa);
      })
      .catch(() => undefined);
  }, [sesion]);
  return nombres;
}
