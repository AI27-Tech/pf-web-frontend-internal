/*
 * Puerto falso de administración para pruebas.
 *
 * Cada método es un espía (`vi.fn`) que por defecto rechaza: si una prueba
 * llama a un método sin configurarlo, falla en lugar de pasar en silencio. Se
 * inyecta con `AdministracionProvider`. No es un handler MSW.
 */

import { vi, type Mock } from 'vitest';

import type { AdministracionPort, CapacidadesPublicadas } from '@/lib/api/administracion';

type Metodos = Omit<AdministracionPort, 'capacidades'>;

export interface PuertoFalso extends AdministracionPort {
  readonly espias: { readonly [K in keyof Metodos]: Mock<Metodos[K]> };
}

const CAPACIDADES_POR_OMISION: CapacidadesPublicadas = {
  usuarios: true,
  organizaciones: true,
  alcance: true,
  revocacionMasiva: true,
};

function sinConfigurar(): Promise<never> {
  return Promise.reject(new Error('método del puerto falso sin configurar'));
}

/** Crea un puerto falso. `capacidades` permite simular la superficie publicada o no. */
export function crearPuertoFalso(capacidades: Partial<CapacidadesPublicadas> = {}): PuertoFalso {
  const espias: PuertoFalso['espias'] = {
    listarUsuarios: vi.fn<Metodos['listarUsuarios']>(sinConfigurar),
    obtenerUsuario: vi.fn<Metodos['obtenerUsuario']>(sinConfigurar),
    altaUsuario: vi.fn<Metodos['altaUsuario']>(sinConfigurar),
    fijarRol: vi.fn<Metodos['fijarRol']>(sinConfigurar),
    desactivarUsuario: vi.fn<Metodos['desactivarUsuario']>(sinConfigurar),
    reactivarUsuario: vi.fn<Metodos['reactivarUsuario']>(sinConfigurar),
    editarUsuario: vi.fn<Metodos['editarUsuario']>(sinConfigurar),
    listarOrganizaciones: vi.fn<Metodos['listarOrganizaciones']>(sinConfigurar),
    crearOrganizacion: vi.fn<Metodos['crearOrganizacion']>(sinConfigurar),
    editarOrganizacion: vi.fn<Metodos['editarOrganizacion']>(sinConfigurar),
    consultarConsecuencia: vi.fn<Metodos['consultarConsecuencia']>(sinConfigurar),
    desactivarOrganizacion: vi.fn<Metodos['desactivarOrganizacion']>(sinConfigurar),
    leerAlcance: vi.fn<Metodos['leerAlcance']>(sinConfigurar),
    fijarAlcance: vi.fn<Metodos['fijarAlcance']>(sinConfigurar),
    revocarSesiones: vi.fn<Metodos['revocarSesiones']>(sinConfigurar),
  };

  return {
    capacidades: { ...CAPACIDADES_POR_OMISION, ...capacidades },
    ...espias,
    espias,
  };
}
