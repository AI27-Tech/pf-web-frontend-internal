/*
 * Validación de formularios de administración (E8-T19).
 *
 * Funciones puras: no hacen solicitudes ni leen estado de React. Un formulario
 * válido produce el comando de alta; uno inválido produce mensajes por campo.
 */

import { ROLES, Rol } from '@ai27-tech/contracts/roles';

import type { AltaUsuario, DatosOrganizacion, Organizacion } from '@/lib/contracts/administracion';

export type CampoAlta = 'nombre' | 'identificadorUsuario' | 'rol' | 'organizacionId';
export type CampoOrganizacion = 'nombre' | 'correo' | 'telefono';

export interface FormularioAlta {
  readonly nombre: string;
  readonly identificadorUsuario: string;
  readonly rol: Rol | null;
  readonly organizacionId: string | null;
}

export type ResultadoAlta =
  | { readonly valido: true; readonly comando: AltaUsuario }
  | { readonly valido: false; readonly errores: Partial<Record<CampoAlta, string>> };

/**
 * Valida el alta. La confirmación está habilitada solo si nombre e identificador
 * no están vacíos tras recortar espacios, el rol pertenece al enum y, si el rol
 * es `cliente`, hay una organización activa seleccionada.
 *
 * Para cualquier rol distinto de `cliente`, el comando no lleva organización.
 * Nunca lleva `tenant_id`: la interfaz no lo captura (R3.5).
 */
export function validarAlta(
  formulario: FormularioAlta,
  organizacionesActivas: readonly Organizacion[],
): ResultadoAlta {
  const errores: Partial<Record<CampoAlta, string>> = {};
  const nombre = formulario.nombre.trim();
  const identificadorUsuario = formulario.identificadorUsuario.trim();

  if (nombre === '') errores.nombre = 'Capture el nombre del usuario.';
  if (identificadorUsuario === '')
    errores.identificadorUsuario = 'Capture el identificador de usuario.';
  if (formulario.rol === null || !(ROLES as readonly string[]).includes(formulario.rol)) {
    errores.rol = 'Seleccione un rol.';
  }

  let organizacionId: string | undefined;
  if (formulario.rol === Rol.Cliente) {
    const organizacion = organizacionesActivas.find(
      (item) => item.activa && item.id === formulario.organizacionId,
    );
    if (organizacion) organizacionId = organizacion.id;
    else errores.organizacionId = 'Seleccione una organización activa.';
  }

  if (formulario.rol === null || Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    comando: {
      nombre,
      identificadorUsuario,
      rol: formulario.rol,
      ...(organizacionId !== undefined ? { organizacionId } : {}),
    },
  };
}

export type ResultadoOrganizacion =
  | { readonly valido: true; readonly datos: DatosOrganizacion }
  | { readonly valido: false; readonly errores: Partial<Record<CampoOrganizacion, string>> };

/**
 * Valida los datos de una organización (R9.11). Nombre, correo y teléfono son
 * obligatorios tras recortar espacios. El correo debe contener `@`; el teléfono
 * no tiene formato (PA-2).
 */
export function validarOrganizacion(datos: DatosOrganizacion): ResultadoOrganizacion {
  const errores: Partial<Record<CampoOrganizacion, string>> = {};
  const normalizados: DatosOrganizacion = {
    nombre: datos.nombre.trim(),
    correo: datos.correo.trim(),
    telefono: datos.telefono.trim(),
  };

  if (normalizados.nombre === '') errores.nombre = 'Capture el nombre de la organización.';
  if (normalizados.correo === '') errores.correo = 'Capture el correo de contacto.';
  else if (!normalizados.correo.includes('@')) errores.correo = 'El correo debe incluir @.';
  if (normalizados.telefono === '') errores.telefono = 'Capture el teléfono de contacto.';

  if (Object.keys(errores).length > 0) return { valido: false, errores };
  return { valido: true, datos: normalizados };
}

export type ResultadoMotivo =
  { readonly valido: true; readonly motivo: string } | { readonly valido: false };

/** El motivo de una revocación es texto libre obligatorio (PA-1). */
export function validarMotivo(motivo: string): ResultadoMotivo {
  const recortado = motivo.trim();
  return recortado === '' ? { valido: false } : { valido: true, motivo: recortado };
}

/** Organizaciones que el selector puede ofrecer: solo las activas, en su orden. */
export function organizacionesOfrecibles(
  organizaciones: readonly Organizacion[],
): readonly Organizacion[] {
  return organizaciones.filter((organizacion) => organizacion.activa);
}
