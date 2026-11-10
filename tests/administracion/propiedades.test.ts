/*
 * E8-T19 · Pruebas de propiedades de las funciones puras (tareas 1.3, 2.8 a 2.16,
 * 3.4, 4.8 y 6.4).
 *
 * Feature: e8-t19-administracion-usuarios-roles-organizaciones. Cada propiedad usa
 * `fast-check` con al menos 100 iteraciones. Van en un solo archivo; el plan pedía
 * uno por propiedad, pero comparten generadores y no tocan React.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Rol, ROLES } from '@ai27-tech/contracts/roles';

import { entradasVisiblesPara } from '@/components/layout/navigationConfig';
import { ApiError } from '@/lib/api/errors';
import { ADMINISTRACION_NO_PUBLICADA, crearAdministracionHttp } from '@/lib/api/administracion';
import { OPCIONES_ROL, type Organizacion } from '@/lib/contracts/administracion';
import {
  capacidades,
  controlesDeAlcance,
  opcionesRolParaCambio,
} from '@/features/administracion/afordancias';
import {
  clasificarError,
  type OperacionAdministracion,
} from '@/features/administracion/clasificarError';
import { estadoConsulta } from '@/features/administracion/estadoConsulta';
import { TEXTOS_EXITO } from '@/features/administracion/mensajes';
import { puedeAdministrar } from '@/features/administracion/puedeAdministrar';
import {
  relacionConSesion,
  type RelacionConSesion,
} from '@/features/administracion/relacionConSesion';
import {
  organizacionesOfrecibles,
  validarAlta,
  validarMotivo,
  validarOrganizacion,
} from '@/features/administracion/validacion';

const RUNS = { numRuns: 100 };

const rolArb = fc.constantFrom(...ROLES);
const relacionArb = fc.constantFrom<RelacionConSesion>('propio', 'ajeno', 'indeterminado');

/** Texto con y sin espacios, incluidas cadenas vacías o solo con espacios. */
const textoArb = fc.oneof(
  fc.string({ maxLength: 12 }),
  fc.constant(''),
  fc.constantFrom(' ', '   ', '\t', ' \n '),
);

const organizacionArb = fc.record({
  id: fc.uuid(),
  nombre: fc.string({ minLength: 1, maxLength: 12 }),
  activa: fc.boolean(),
  usuariosActivos: fc.nat({ max: 50 }),
}) satisfies fc.Arbitrary<Organizacion>;

describe('Property 1 · visibilidad por rol (1.3)', () => {
  it('solo el administrador ve y puede usar la administración', () => {
    fc.assert(
      fc.property(rolArb, (rol) => {
        const ve = entradasVisiblesPara(rol).some((item) => item.label === 'Administración');
        expect(ve).toBe(rol === Rol.Administrador);
        expect(puedeAdministrar(rol)).toBe(rol === Rol.Administrador);
      }),
      RUNS,
    );
  });
});

describe('Property 2 · relacionConSesion (2.8)', () => {
  it('toma la relación de es_propio y es indeterminada sin respuesta', () => {
    fc.assert(
      fc.property(fc.constantFrom(true, false, undefined, null), (esPropio) => {
        const esperada: RelacionConSesion =
          esPropio === true ? 'propio' : esPropio === false ? 'ajeno' : 'indeterminado';
        expect(relacionConSesion(esPropio === undefined ? {} : { esPropio })).toBe(esperada);
      }),
      RUNS,
    );
  });
});

describe('Property 3 · capacidades (2.9)', () => {
  const objetivoArb = fc.record({
    activo: fc.boolean(),
    rol: fc.option(rolArb, { nil: null }),
  });

  it('rol y alcance solo se habilitan sobre un ajeno, activo y sin solicitud en curso', () => {
    fc.assert(
      fc.property(objetivoArb, relacionArb, fc.boolean(), (objetivo, relacion, enCurso) => {
        const c = capacidades(objetivo, relacion, enCurso);
        const habilitado = relacion === 'ajeno' && objetivo.activo && !enCurso;
        expect(c.puedeCambiarRol).toBe(habilitado && objetivo.rol !== Rol.Cliente);
        expect(c.puedeEditarAlcance).toBe(habilitado && controlesDeAlcance(objetivo.rol) !== null);
        if (relacion !== 'ajeno') {
          expect(c.puedeCambiarRol).toBe(false);
          expect(c.puedeEditarAlcance).toBe(false);
          expect(c.motivoBloqueo).not.toBeNull();
        }
        if (relacion === 'propio') expect(c.puedeRevocarSesiones).toBe(false);
      }),
      RUNS,
    );
  });

  it('desactivar exige estar activo, reactivar exigir estar inactivo y no dependen de la relación', () => {
    fc.assert(
      fc.property(objetivoArb, relacionArb, fc.boolean(), (objetivo, relacion, enCurso) => {
        const c = capacidades(objetivo, relacion, enCurso);
        expect(c.puedeDesactivar).toBe(objetivo.activo && !enCurso);
        expect(c.puedeReactivar).toBe(!objetivo.activo && !enCurso);
        expect(c.puedeDesactivar && c.puedeReactivar).toBe(false);
      }),
      RUNS,
    );
  });
});

describe('Property 4 · controles de alcance por rol (2.10)', () => {
  it('solo monitorista, supervisor y coordinador tienen control, y nunca clientes para ejecutivo', () => {
    fc.assert(
      fc.property(rolArb, (rol) => {
        const control = controlesDeAlcance(rol);
        const conAlcance = [Rol.Monitorista, Rol.Supervisor, Rol.Coordinador] as readonly Rol[];
        expect(control !== null).toBe(conAlcance.includes(rol));
        if (rol === Rol.Ejecutivo) expect(control).toBeNull();
      }),
      RUNS,
    );
  });
});

describe('Property 5 · validarAlta (2.11)', () => {
  const formularioArb = fc.record({
    nombre: textoArb,
    identificadorUsuario: textoArb,
    rol: fc.option(rolArb, { nil: null }),
    organizacionId: fc.option(fc.uuid(), { nil: null }),
  });

  it('es válida solo con nombre e identificador, rol del enum y, para cliente, organización activa', () => {
    fc.assert(
      fc.property(formularioArb, fc.array(organizacionArb, { maxLength: 4 }), (form, orgs) => {
        const resultado = validarAlta(form, orgs);
        const orgValida = orgs.some((o) => o.activa && o.id === form.organizacionId);
        const esperada =
          form.nombre.trim() !== '' &&
          form.identificadorUsuario.trim() !== '' &&
          form.rol !== null &&
          (form.rol !== Rol.Cliente || orgValida);
        expect(resultado.valido).toBe(esperada);
        if (resultado.valido) {
          expect(resultado.comando).not.toHaveProperty('tenant_id');
          expect(resultado.comando.nombre).toBe(form.nombre.trim());
          // La organización solo viaja con el rol cliente.
          expect('organizacionId' in resultado.comando).toBe(form.rol === Rol.Cliente);
        }
      }),
      RUNS,
    );
  });
});

describe('Property 6 · organizacionesOfrecibles (2.12)', () => {
  it('ofrece exactamente las activas, en su orden', () => {
    fc.assert(
      fc.property(fc.array(organizacionArb, { maxLength: 8 }), (orgs) => {
        const ofrecidas = organizacionesOfrecibles(orgs);
        expect(ofrecidas.every((o) => o.activa)).toBe(true);
        expect(ofrecidas.map((o) => o.id)).toEqual(orgs.filter((o) => o.activa).map((o) => o.id));
      }),
      RUNS,
    );
  });
});

describe('Property 7 · validación de organización y de motivo (2.13)', () => {
  it('nombre, correo con @ y teléfono son obligatorios tras recortar espacios', () => {
    fc.assert(
      fc.property(textoArb, textoArb, textoArb, (nombre, correo, telefono) => {
        const resultado = validarOrganizacion({ nombre, correo, telefono });
        const esperada =
          nombre.trim() !== '' &&
          correo.trim() !== '' &&
          correo.trim().includes('@') &&
          telefono.trim() !== '';
        expect(resultado.valido).toBe(esperada);
      }),
      RUNS,
    );
  });

  it('el motivo de revocación es obligatorio y se recorta', () => {
    fc.assert(
      fc.property(textoArb, (motivo) => {
        const resultado = validarMotivo(motivo);
        expect(resultado.valido).toBe(motivo.trim() !== '');
        if (resultado.valido) expect(resultado.motivo).toBe(motivo.trim());
      }),
      RUNS,
    );
  });
});

describe('Property 8 · estadoConsulta (2.14)', () => {
  const entradaArb = fc.record({
    isLoading: fc.boolean(),
    isError: fc.boolean(),
    error: fc.constantFrom<unknown>(
      undefined,
      new Error('red'),
      new ApiError('prohibido', 'x', 403),
      new ApiError('red', 'x'),
    ),
    data: fc.option(fc.array(fc.nat(), { maxLength: 3 }), { nil: undefined }),
  });

  it('con datos previos y un fallo distinto de 403 conserva los datos y nunca dice "vacío"', () => {
    fc.assert(
      fc.property(entradaArb, (entrada) => {
        const resultado = estadoConsulta(entrada, (datos) => datos.length === 0);
        const es403 = entrada.error instanceof ApiError && entrada.error.status === 403;
        if (entrada.isError && entrada.data !== undefined && !es403) {
          expect(resultado.estado).toBe('datos_desactualizado');
          expect(resultado.datos).toEqual(entrada.data);
        }
        if (entrada.isError && es403) expect(resultado.estado).toBe('sin_acceso');
        if (!entrada.isError && entrada.data === undefined) {
          expect(resultado.estado).toBe('cargando');
        }
        if (entrada.isError) expect(resultado.estado).not.toBe('vacio');
      }),
      RUNS,
    );
  });
});

describe('Property 9 · clasificarError (2.15)', () => {
  const operaciones: readonly OperacionAdministracion[] = [
    'listarUsuarios',
    'obtenerUsuario',
    'altaUsuario',
    'fijarRol',
    'desactivarUsuario',
    'reactivarUsuario',
    'editarUsuario',
    'listarOrganizaciones',
    'crearOrganizacion',
    'editarOrganizacion',
    'consultarConsecuencia',
    'desactivarOrganizacion',
    'leerAlcance',
    'fijarAlcance',
    'revocarSesiones',
  ];

  it('es total: cualquier operación, estado y código producen un ApiError', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...operaciones),
        fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
        fc.option(fc.constantFrom('rol_igual', 'autoescalamiento', 'otro', ''), { nil: undefined }),
        fc.option(relacionArb, { nil: undefined }),
        (operacion, status, codigo, relacion) => {
          expect(clasificarError(operacion, status, codigo, relacion)).toBeInstanceOf(ApiError);
        },
      ),
      RUNS,
    );
  });

  it('un 403 de rol o alcance con autoescalamiento nunca se trata como sesión vencida', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('fijarRol', 'fijarAlcance'),
        relacionArb,
        (operacion, relacion) => {
          const error = clasificarError(operacion, 403, 'autoescalamiento', relacion);
          expect(error.kind).toBe('prohibido');
        },
      ),
      RUNS,
    );
  });
});

describe('Property 10 · textos de éxito (2.16)', () => {
  it('no afirman auditoría, notificación, corte inmediato ni que la sesión ya dejó de funcionar', () => {
    for (const texto of Object.values(TEXTOS_EXITO)) {
      expect(texto).not.toMatch(/auditor|notific|inmediat|ya dej/i);
    }
  });
});

describe('Property 11 · opciones de rol (4.8)', () => {
  it('el selector tiene los ocho roles del enum y sin Auditor', () => {
    expect(OPCIONES_ROL).toEqual(ROLES);
    expect(OPCIONES_ROL).toHaveLength(8);
    expect(OPCIONES_ROL as readonly string[]).not.toContain('auditor');
  });

  it('el cambio de rol nunca ofrece cliente y a un cliente no le ofrece nada', () => {
    fc.assert(
      fc.property(fc.option(rolArb, { nil: null }), (rolActual) => {
        const opciones = opcionesRolParaCambio(rolActual);
        expect(opciones).not.toContain(Rol.Cliente);
        if (rolActual === Rol.Cliente) expect(opciones).toHaveLength(0);
      }),
      RUNS,
    );
  });
});

describe('Estructura del puerto y exclusiones de V1 (3.4, 6.4)', () => {
  const METODOS = [
    'altaUsuario',
    'consultarConsecuencia',
    'crearOrganizacion',
    'desactivarOrganizacion',
    'desactivarUsuario',
    'editarOrganizacion',
    'editarUsuario',
    'fijarAlcance',
    'fijarRol',
    'leerAlcance',
    'listarOrganizaciones',
    'listarUsuarios',
    'obtenerUsuario',
    'reactivarUsuario',
    'revocarSesiones',
  ];

  it('las dos implementaciones exponen exactamente los métodos declarados', () => {
    for (const puerto of [ADMINISTRACION_NO_PUBLICADA, crearAdministracionHttp()]) {
      const metodos = Object.keys(puerto)
        .filter((clave) => clave !== 'capacidades')
        .sort();
      expect(metodos).toEqual(METODOS);
    }
  });

  it('no incluye revocar por sesion_id, enumerar sesiones, auditoría, historial, tenant ni reactivar organización', () => {
    const prohibidos =
      /sesionId|enumerar|auditor|historial|tenant|breakGlass|transferir|reactivarOrganizacion|clientesEjecutivo/i;
    for (const puerto of [ADMINISTRACION_NO_PUBLICADA, crearAdministracionHttp()]) {
      for (const clave of Object.keys(puerto)) expect(clave).not.toMatch(prohibidos);
    }
  });
});
