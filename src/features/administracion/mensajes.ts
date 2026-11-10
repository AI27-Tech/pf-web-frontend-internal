/*
 * Textos de la administración (E8-T19).
 *
 * Son textos de trabajo (PA-4): viven aquí para revisarlos en un solo lugar
 * cuando Product Management los fije. Solo afirman lo que el contrato garantiza:
 * no mencionan auditoría, notificación, corte inmediato ni que la sesión "ya
 * dejó de funcionar".
 */

import type { Rol } from '@ai27-tech/contracts/roles';

export const TEXTOS_ADMINISTRACION = {
  accesoNoAutorizado:
    'No tiene acceso a la administración. Esta sección es solo para el rol administrador.',
  seccionNoPublicada: 'Esta sección aún no está disponible: el servicio no publica esta capacidad.',

  // Afordancias (afordancias.ts)
  propioRolAlcance: 'No se puede modificar el propio rol ni el propio alcance.',
  sinIdentificarSesion:
    'No se pudo identificar la sesión: el rol y el alcance están deshabilitados.',
  usuarioInactivo: 'El usuario está desactivado: reactívelo para modificar su rol o alcance.',
  solicitudEnCurso: 'Hay una solicitud en curso para este usuario.',
  propioRevocacion: 'Para cerrar su propia sesión, use el cierre de sesión.',

  // Consultas (estadoConsulta / RegionConsulta)
  cargando: 'Cargando…',
  vacio: 'No hay resultados.',
  errorConsulta: 'No se pudo cargar la información.',
  reintentar: 'Reintentar',
  sinAccesoConsulta: 'No tiene acceso a esta información.',
  datosDesactualizados:
    'Estos datos son de una consulta anterior. La consulta falló; esta lista no es la vigente.',

  // Errores clasificados (clasificarError.ts)
  autorizacionInsuficiente:
    'No tiene permiso para realizar esta acción. El servidor rechazó la solicitud.',
  autoescaladaBloqueada:
    'El servidor rechazó el cambio sobre su propio usuario. El rol y el alcance no cambiaron.',
  usuarioNoDisponible: 'El usuario no está disponible. Puede que ya no exista.',
  conflictoRolGenerico:
    'No se pudo cambiar el rol por un conflicto con el estado actual del usuario. Recargue e intente de nuevo.',
  conflictoGenerico:
    'La solicitud entró en conflicto con el estado actual. Recargue e intente de nuevo.',
  conflictoRolUsuarioDesactivado: 'No se puede cambiar el rol de un usuario desactivado.',
  conflictoRolIgual: 'El usuario ya tiene ese rol.',
  conflictoRolCruzaAudiencia:
    'Una cuenta no cambia entre cliente e interno. Desactive esta cuenta y dé de alta otra.',
  conflictoRolUltimoAdministrador:
    'No se puede quitar el rol de administrador al último administrador activo.',
  ultimoAdministrador:
    'No se puede desactivar al último administrador activo. El usuario sigue activo.',
  identificadorDuplicado: 'Ya existe un usuario con ese identificador de usuario.',
  validacion: 'Revise los datos capturados.',
  organizacionDesactivada:
    'La organización está desactivada. No admite altas ni cambios y no se reactiva.',
  conflictoAlcanceRolSinAlcance: 'El rol actual del usuario no tiene alcance de monitoreo.',
  conflictoAlcanceSubordinadoRolInvalido:
    'Alguno de los usuarios elegidos no tiene el rol que corresponde a este alcance.',
  conflictoAlcanceSubordinadoConSuperior:
    'Alguno de los usuarios elegidos ya tiene otro superior asignado.',
  usuarioSinNombre: 'Sin nombre registrado',
  usuarioSinIdentificador: 'Sin identificador registrado',
  organizacionInvalida: 'La organización seleccionada ya no es válida. Seleccione otra.',
  nombreOrganizacionDuplicado: 'Ya existe una organización con ese nombre.',
  servicioNoDisponibleAccion:
    'El servicio no está disponible. La acción no se aplicó; intente de nuevo más tarde.',
  resultadoNoConfirmado:
    'Resultado no confirmado: no se pudo confirmar la respuesta del servidor. No se pudo confirmar si la acción se aplicó.',
  superficieNoPublicada: 'Esta función aún no está disponible en el servicio.',

  // Diálogos del Bloque B (contra el puerto falso)
  cambioRolRetiraAlcance:
    'Al cambiar el rol se retirará el alcance actual del usuario. El retiro aplica de inmediato.',
  cambioRolDeClienteNoEditable: 'El rol de un cliente no se cambia desde esta pantalla.',
  desactivarCorte:
    'El corte del acceso ocurre en máximo 30 segundos. Desactivar no cambia el rol ni el alcance del usuario.',
  reactivarConfirmacion: 'Confirme la reactivación del usuario.',
  revocacionCorte: 'El corte de las sesiones ocurre en máximo 30 segundos.',
  revocacionMotivoEtiqueta: 'Motivo de la revocación (obligatorio)',
  revocacionSinSesiones: 'El usuario no tenía sesiones activas.',
  revocacionEnCurso: 'Hay una revocación en curso para este usuario.',
  organizacionEdicionTenant: 'Tenant (solo lectura)',
  enviando: 'Enviando…',
  cancelar: 'Cancelar',
  confirmar: 'Confirmar',
  guardar: 'Guardar',

  // Secciones del Bloque B (tareas 8 a 16)
  usuariosTitulo: 'Usuarios',
  nuevoUsuario: 'Nuevo usuario',
  altaTitulo: 'Nuevo usuario',
  buscarUsuario: 'Buscar por nombre o identificador',
  todosLosRoles: 'Todos los roles',
  columnaNombre: 'Nombre',
  columnaVehiculo: 'Vehículo',
  columnaCustodios: 'Custodios',
  columnaIdentificador: 'Identificador',
  columnaRol: 'Rol',
  columnaOrganizacion: 'Organización',
  columnaEstado: 'Estado',
  columnaCorreo: 'Correo',
  columnaTelefono: 'Teléfono',
  columnaTenant: 'Tenant',
  columnaUsuariosActivos: 'Usuarios activos',
  columnaAcciones: 'Acciones',
  sinRol: 'Sin rol',
  sinDato: 'Sin dato',
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  volverUsuarios: 'Volver a usuarios',
  cargandoUsuario: 'Cargando usuario…',
  alcanceTitulo: 'Alcance de monitoreo',
  alcanceVacio: 'Sin alcance asignado.',
  alcanceEfectivo: 'Unidades efectivas (tal como lo devuelve el servidor)',
  alcanceSinOpciones: 'No hay opciones disponibles para este alcance.',
  alcanceGuardar: 'Guardar alcance',
  alcanceTipoUnidades: 'Unidades',
  alcanceTipoMonitoristas: 'Monitoristas',
  alcanceTipoSupervisores: 'Supervisores',
  organizacionesTitulo: 'Organizaciones',
  nuevaOrganizacion: 'Nueva organización',
  organizacionesVacias: 'Aún no hay organizaciones. Crea la primera.',
  editar: 'Editar',
  desactivar: 'Desactivar',
  organizacionConsultando: 'Consultando cuántos usuarios se afectan…',
  organizacionSinUsuarios: 'No tiene usuarios activos: no se corta ningún acceso.',
  organizacionConsecuenciaError: 'No se pudo consultar la consecuencia de desactivar.',
  organizacionDesactivarAviso:
    'Desactivar la organización es terminal. Sus usuarios pierden el acceso en su siguiente refresco.',
  organizacionConsecuencia: (usuarios: number) =>
    usuarios === 1
      ? 'Un usuario activo perderá el acceso.'
      : `${usuarios} usuarios activos perderán el acceso.`,
  altaNombre: 'Nombre',
  altaIdentificador: 'Identificador de usuario',
  altaRol: 'Rol',
  altaOrganizacion: 'Organización del cliente',
  sinOrganizaciones: 'No hay organizaciones activas. Crea una antes de dar de alta un cliente.',
  altaCrear: 'Crear usuario',
  activo: 'Activo',
  inactivo: 'Inactivo',
  datoCampo: 'Dato',
  datoValor: 'Valor',
  accionesTitulo: 'Acciones',
  cambiarRol: 'Cambiar rol',
  editarAlcance: 'Editar alcance',
  reactivar: 'Reactivar',
  revocarSesiones: 'Revocar sesiones',
  cambioRolTitulo: 'Cambiar rol',
  cambioRolLeyenda: 'Nuevo rol',
  rolActual: 'rol actual',
  desactivarUsuarioTitulo: 'Desactivar usuario',
  reactivarUsuarioTitulo: 'Reactivar usuario',
  confirmarDesactivarUsuario: '¿Desactivar a',
  confirmarReactivarUsuario: '¿Reactivar a',
  revocacionAlcance: 'Se cerrarán las sesiones activas de',
  editarOrganizacionTitulo: 'Editar organización',
  nuevaOrganizacionTitulo: 'Nueva organización',
  desactivarOrganizacionTitulo: 'Desactivar organización',
  consecuenciaUsuarios: 'Usuarios activos que perderían el acceso',
  seccionesAdministracion: 'Secciones de administración',
} as const;

/** Textos de éxito. Solo afirman plazos que el contrato o el PO fijaron (PA-4, PA-8, PA-9). */
export const TEXTOS_EXITO = {
  altaUsuario: 'Usuario creado.',
  cambioRol:
    'Rol actualizado. El cambio surte efecto en el siguiente refresco de la sesión del usuario.',
  desactivarUsuario: 'Usuario desactivado. El corte de su acceso ocurre en máximo 30 segundos.',
  reactivarUsuario: 'Usuario reactivado.',
  alcance: 'Alcance actualizado.',
  guardarOrganizacion: 'Organización guardada.',
  desactivarOrganizacion:
    'Organización desactivada. Sus usuarios pierden el acceso en su siguiente refresco.',
  revocarSesiones: 'Revocación aplicada. El corte de las sesiones ocurre en máximo 30 segundos.',
} as const;

export type AccionExito = keyof typeof TEXTOS_EXITO;

/** Texto de éxito de una acción. Limitado a lo que el contrato garantiza. */
export function mensajesDeExito(accion: AccionExito): string {
  return TEXTOS_EXITO[accion];
}

/** Etiqueta visible de cada rol del enum. Texto de trabajo. */
export const ETIQUETAS_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  jefe_operativo: 'Jefe operativo',
  monitorista: 'Monitorista',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador',
  ejecutivo: 'Ejecutivo',
  reaccion: 'Reacción',
  administrador: 'Administrador',
};
