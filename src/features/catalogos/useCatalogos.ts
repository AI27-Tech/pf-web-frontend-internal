/*
 * Lectura y escritura de vehículos y custodios (adelanto de E8-T16, tracer.39).
 *
 * Las listas las comparten `/catalogos` y el alta de unidades de `/roster`. Escribir
 * invalida la lista y también el roster, que muestra vehículo y custodios legibles.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/context/SessionContext';
import {
  actualizarCustodio,
  actualizarVehiculo,
  crearCustodio,
  crearVehiculo,
  listarCustodios,
  listarVehiculos,
} from '@/lib/api/catalogos';
import type {
  CustodioCambios,
  CustodioEntrada,
  VehiculoCambios,
  VehiculoEntrada,
} from '@/lib/contracts/catalogos';

export const CLAVE_VEHICULOS = ['catalogos', 'vehiculos'] as const;
export const CLAVE_CUSTODIOS = ['catalogos', 'custodios'] as const;

export function useVehiculos(habilitado = true) {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  return useQuery({
    queryKey: CLAVE_VEHICULOS,
    queryFn: () => listarVehiculos(accessToken),
    retry: false,
    enabled: habilitado && accessToken.length > 0,
  });
}

export function useCustodios(habilitado = true) {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  return useQuery({
    queryKey: CLAVE_CUSTODIOS,
    queryFn: () => listarCustodios(accessToken),
    retry: false,
    enabled: habilitado && accessToken.length > 0,
  });
}

/** Alta o edición de un vehículo: con `id` es PATCH, sin `id` es POST. */
export function useGuardarVehiculo() {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      datos:
        { id: string; cambios: VehiculoCambios } | { id?: undefined; entrada: VehiculoEntrada },
    ) =>
      datos.id === undefined
        ? crearVehiculo(datos.entrada, accessToken)
        : actualizarVehiculo(datos.id, datos.cambios, accessToken),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_VEHICULOS });
      void queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });
}

/** Alta o edición de un custodio: con `id` es PATCH, sin `id` es POST. */
export function useGuardarCustodio() {
  const { sesion } = useSession();
  const accessToken = sesion?.accessToken ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      datos:
        { id: string; cambios: CustodioCambios } | { id?: undefined; entrada: CustodioEntrada },
    ) =>
      datos.id === undefined
        ? crearCustodio(datos.entrada, accessToken)
        : actualizarCustodio(datos.id, datos.cambios, accessToken),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_CUSTODIOS });
      void queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });
}
