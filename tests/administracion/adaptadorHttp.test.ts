/*
 * E8-T19 · 19.2 — Adaptador HTTP real de `AdministracionPort` (tracer.40).
 *
 * Se prueba contra un `fetch` simulado: verifica método, ruta, cuerpo y la
 * traducción de wire a modelo de vista. No sustituye la prueba de punta a punta
 * contra el `bff`, que espera a que `identidad`, `bff` y core sirvan estas rutas
 * (hoy responden 404).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rol } from '@ai27-tech/contracts/roles';

import { ApiError } from '@/lib/api/errors';
import { crearAdministracionHttp } from '@/lib/api/administracion';
import {
  clasificarError,
  ErrorAutoescaladaBloqueada,
  ErrorConflictoAlcance,
  ErrorConflictoRol,
  ErrorOrganizacionDesactivada,
} from '@/features/administracion/clasificarError';

const TOKEN = 'token-admin';
let fetchSimulado: ReturnType<typeof vi.fn>;

function responder(estado: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

/** Última petición emitida: método, URL (sin origen) y cuerpo ya interpretado. */
function ultimaPeticion(posicion = -1) {
  const llamadas = fetchSimulado.mock.calls;
  const [url, init] = llamadas.at(posicion) as [string, RequestInit];
  return {
    metodo: init.method,
    ruta: url.slice(url.indexOf('/api/v1') + '/api/v1'.length),
    cuerpo: init.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    signal: init.signal,
  };
}

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adaptador HTTP · usuarios', () => {
  it('listarUsuarios envía los filtros del contrato y traduce el wire sin inventar datos', async () => {
    fetchSimulado.mockResolvedValue(
      responder(200, {
        items: [
          { id: 'u1', activo: true, es_propio: true },
          {
            id: 'u2',
            nombre: 'Ana',
            identificador_usuario: 'ana@ai27.mx',
            rol: 'cliente',
            activo: false,
            es_propio: false,
            organizacion: { id: 'org-1', nombre: 'Norte' },
          },
        ],
        cursor_siguiente: 'c2',
      }),
    );

    const pagina = await crearAdministracionHttp().listarUsuarios(
      { texto: 'ana', rol: Rol.Cliente, organizacionId: 'org-1', activo: false, cursor: 'c1' },
      TOKEN,
    );

    const peticion = ultimaPeticion();
    expect(peticion.metodo).toBe('GET');
    expect(peticion.ruta).toBe('/sujetos?q=ana&rol=cliente&tenant_id=org-1&activo=false&cursor=c1');
    expect(pagina.cursorSiguiente).toBe('c2');
    expect(pagina.items[0]).toEqual({ id: 'u1', rol: null, activo: true, esPropio: true });
    expect(pagina.items[0]).not.toHaveProperty('nombre');
    expect(pagina.items[1]).toEqual({
      id: 'u2',
      nombre: 'Ana',
      identificadorUsuario: 'ana@ai27.mx',
      rol: 'cliente',
      activo: false,
      organizacion: { id: 'org-1', nombre: 'Norte' },
      esPropio: false,
    });
  });

  it('altaUsuario no envía tenant_id y manda la organización solo si existe', async () => {
    // Una respuesta nueva por llamada: el cuerpo de una `Response` se lee una sola vez.
    fetchSimulado.mockImplementation(() =>
      Promise.resolve(responder(201, { id: 'u3', activo: true, es_propio: false })),
    );
    const puerto = crearAdministracionHttp();

    await puerto.altaUsuario(
      { nombre: 'Luis', identificadorUsuario: 'luis', rol: Rol.Monitorista },
      TOKEN,
    );
    expect(ultimaPeticion()).toMatchObject({
      metodo: 'POST',
      ruta: '/sujetos',
      cuerpo: { nombre: 'Luis', identificador_usuario: 'luis', rol: 'monitorista' },
    });
    expect(ultimaPeticion().cuerpo).not.toHaveProperty('tenant_id');
    expect(ultimaPeticion().cuerpo).not.toHaveProperty('organizacion_id');

    await puerto.altaUsuario(
      { nombre: 'Eva', identificadorUsuario: 'eva', rol: Rol.Cliente, organizacionId: 'org-1' },
      TOKEN,
    );
    expect(ultimaPeticion().cuerpo).toMatchObject({ organizacion_id: 'org-1' });
  });

  it('fijarRol usa PUT .../rol y las acciones sin cuerpo (204) resuelven sin valor', async () => {
    fetchSimulado.mockResolvedValue(responder(204));
    const puerto = crearAdministracionHttp();

    await expect(puerto.fijarRol('u1', Rol.Supervisor, TOKEN)).resolves.toBeUndefined();
    expect(ultimaPeticion()).toMatchObject({
      metodo: 'PUT',
      ruta: '/sujetos/u1/rol',
      cuerpo: { rol: 'supervisor' },
    });

    await puerto.desactivarUsuario('u1', TOKEN);
    expect(ultimaPeticion()).toMatchObject({ metodo: 'DELETE', ruta: '/sujetos/u1' });

    await puerto.reactivarUsuario('u1', TOKEN);
    expect(ultimaPeticion()).toMatchObject({ metodo: 'POST', ruta: '/sujetos/u1/reactivacion' });
  });

  it('editarUsuario edita solo el nombre', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { id: 'u1', activo: true, es_propio: false }));

    await crearAdministracionHttp().editarUsuario('u1', 'Nuevo nombre', TOKEN);

    expect(ultimaPeticion()).toMatchObject({
      metodo: 'PATCH',
      ruta: '/sujetos/u1',
      cuerpo: { nombre: 'Nuevo nombre' },
    });
  });

  it('propaga el código de máquina de un 409 como ApiError', async () => {
    fetchSimulado.mockResolvedValue(responder(409, { codigo: 'rol_cruza_audiencia' }));

    const fallo = await crearAdministracionHttp()
      .fijarRol('u1', Rol.Cliente, TOKEN)
      .catch((error: unknown) => error);

    expect(fallo).toBeInstanceOf(ApiError);
    expect(fallo).toMatchObject({ status: 409, codigo: 'rol_cruza_audiencia' });
  });
});

describe('adaptador HTTP · organizaciones', () => {
  it('crearOrganizacion envía el id del intento y los tres datos de contacto', async () => {
    fetchSimulado.mockResolvedValue(
      responder(201, { id: 'org-9', nombre: 'Sur', activa: true, usuarios_activos: 0 }),
    );

    const organizacion = await crearAdministracionHttp().crearOrganizacion(
      { id: 'org-9', nombre: 'Sur', correo: 'a@b.mx', telefono: '555' },
      TOKEN,
    );

    expect(ultimaPeticion()).toMatchObject({
      metodo: 'POST',
      ruta: '/organizaciones',
      cuerpo: { id: 'org-9', nombre: 'Sur', correo: 'a@b.mx', telefono: '555' },
    });
    expect(organizacion).toEqual({ id: 'org-9', nombre: 'Sur', activa: true, usuariosActivos: 0 });
  });

  it('listarOrganizaciones recorre todas las páginas', async () => {
    fetchSimulado
      .mockResolvedValueOnce(
        responder(200, {
          items: [{ id: 'o1', nombre: 'Uno', activa: true, usuarios_activos: 2 }],
          cursor_siguiente: 'sig',
        }),
      )
      .mockResolvedValueOnce(
        responder(200, {
          items: [{ id: 'o2', nombre: 'Dos', activa: false, usuarios_activos: 0 }],
          cursor_siguiente: null,
        }),
      );

    const lista = await crearAdministracionHttp().listarOrganizaciones(TOKEN);

    expect(lista.map((organizacion) => organizacion.id)).toEqual(['o1', 'o2']);
    expect(ultimaPeticion().ruta).toBe('/organizaciones?cursor=sig');
  });

  it('consultarConsecuencia toma el conteo del bff y la lista de usuarios activos de la organización', async () => {
    fetchSimulado
      .mockResolvedValueOnce(
        responder(200, {
          items: [{ id: 'org-1', nombre: 'Norte', activa: true, usuarios_activos: 2 }],
          cursor_siguiente: null,
        }),
      )
      .mockResolvedValueOnce(
        responder(200, {
          items: [
            {
              id: 'u1',
              nombre: 'Ana',
              identificador_usuario: 'ana',
              activo: true,
              es_propio: false,
            },
            { id: 'u2', activo: true, es_propio: false },
          ],
          cursor_siguiente: null,
        }),
      );

    const consecuencia = await crearAdministracionHttp().consultarConsecuencia('org-1', TOKEN);

    expect(ultimaPeticion().ruta).toBe('/sujetos?tenant_id=org-1&activo=true');
    expect(consecuencia.usuariosActivos).toBe(2);
    expect(consecuencia.usuarios).toEqual([{ nombre: 'Ana', identificadorUsuario: 'ana' }, {}]);
  });

  it('desactivarOrganizacion usa DELETE', async () => {
    fetchSimulado.mockResolvedValue(responder(204));

    await crearAdministracionHttp().desactivarOrganizacion('org-1', TOKEN);

    expect(ultimaPeticion()).toMatchObject({ metodo: 'DELETE', ruta: '/organizaciones/org-1' });
  });
});

describe('adaptador HTTP · alcance y revocación', () => {
  const alcanceWire = {
    unidades_ids: ['un1'],
    subordinados_ids: [],
    unidades_efectivas_ids: ['un1'],
  };

  it('fijarAlcance de unidades reemplaza la lista completa y vuelve a leer el alcance', async () => {
    fetchSimulado
      .mockResolvedValueOnce(responder(204))
      .mockResolvedValueOnce(responder(200, alcanceWire));

    const alcance = await crearAdministracionHttp().fijarAlcance(
      'u1',
      { tipo: 'unidades', ids: ['un1'] },
      TOKEN,
    );

    expect(ultimaPeticion(-2)).toMatchObject({
      metodo: 'PUT',
      ruta: '/sujetos/u1/alcance/unidades',
      cuerpo: { unidades_ids: ['un1'] },
    });
    expect(ultimaPeticion()).toMatchObject({ metodo: 'GET', ruta: '/sujetos/u1/alcance' });
    expect(alcance).toEqual({
      unidadesIds: ['un1'],
      subordinadosIds: [],
      unidadesEfectivasIds: ['un1'],
    });
  });

  it('fijarAlcance de subordinados envía sujetos_ids', async () => {
    fetchSimulado
      .mockResolvedValueOnce(responder(204))
      .mockResolvedValueOnce(responder(200, { ...alcanceWire, subordinados_ids: ['m1'] }));

    await crearAdministracionHttp().fijarAlcance(
      's1',
      { tipo: 'subordinados', ids: ['m1'] },
      TOKEN,
    );

    expect(ultimaPeticion(-2)).toMatchObject({
      metodo: 'PUT',
      ruta: '/sujetos/s1/alcance/subordinados',
      cuerpo: { sujetos_ids: ['m1'] },
    });
  });

  it('revocarSesiones envía el motivo, limita la espera y devuelve cuántas sesiones se revocaron', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { sesiones_revocadas: 0 }));

    const resultado = await crearAdministracionHttp().revocarSesiones('u1', 'Equipo robado', TOKEN);

    const peticion = ultimaPeticion();
    expect(peticion).toMatchObject({
      metodo: 'POST',
      ruta: '/sujetos/u1/revocaciones',
      cuerpo: { motivo: 'Equipo robado' },
    });
    expect(peticion.signal).toBeInstanceOf(AbortSignal);
    expect(resultado).toEqual({ sesionesRevocadas: 0 });
  });

  it('una falla de red en la revocación no se presenta como éxito', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    const fallo = await crearAdministracionHttp()
      .revocarSesiones('u1', 'motivo', TOKEN)
      .catch((error: unknown) => error);

    expect(fallo).toBeInstanceOf(ApiError);
    expect(fallo).toMatchObject({ kind: 'red' });
  });
});

describe('clasificarError · códigos de tracer.40', () => {
  it('cambio de rol: sujeto_desactivado y rol_cruza_audiencia se distinguen', () => {
    const desactivado = clasificarError('fijarRol', 409, 'sujeto_desactivado');
    const cruce = clasificarError('fijarRol', 409, 'rol_cruza_audiencia');

    expect(desactivado).toBeInstanceOf(ErrorConflictoRol);
    expect((desactivado as ErrorConflictoRol).motivo).toBe('usuario_desactivado');
    expect((cruce as ErrorConflictoRol).motivo).toBe('rol_cruza_audiencia');
  });

  it('403 con autoescalamiento es auto-escalada aunque la relación sea indeterminada', () => {
    expect(clasificarError('fijarRol', 403, 'autoescalamiento')).toBeInstanceOf(
      ErrorAutoescaladaBloqueada,
    );
    expect(clasificarError('fijarAlcance', 403, 'autoescalamiento')).toBeInstanceOf(
      ErrorAutoescaladaBloqueada,
    );
  });

  it('409 del alcance distingue sus tres causas y sin código no afirma ninguna', () => {
    for (const codigo of [
      'rol_sin_alcance',
      'subordinado_rol_invalido',
      'subordinado_con_superior',
    ] as const) {
      const error = clasificarError('fijarAlcance', 409, codigo);
      expect(error).toBeInstanceOf(ErrorConflictoAlcance);
      expect((error as ErrorConflictoAlcance).motivo).toBe(codigo);
    }
    expect((clasificarError('fijarAlcance', 409, undefined) as ErrorConflictoAlcance).motivo).toBe(
      undefined,
    );
  });

  it('organizacion_desactivada se reconoce en el alta y en las operaciones de organización', () => {
    for (const operacion of ['altaUsuario', 'crearOrganizacion', 'editarOrganizacion'] as const) {
      expect(clasificarError(operacion, 409, 'organizacion_desactivada')).toBeInstanceOf(
        ErrorOrganizacionDesactivada,
      );
    }
  });
});
