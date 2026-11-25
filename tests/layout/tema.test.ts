/*
 * Tema visual: se lee la elección guardada, se aplica a <html> y se recuerda
 * entre cargas. Sin elección guardada, el tema es el oscuro (el de index.html).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aplicarTema, cambiarTema, leerTema } from '@/lib/tema';

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('sin elección guardada usa el tema oscuro', () => {
    expect(leerTema()).toBe('oscuro');
  });

  it('ignora un valor guardado que no es un tema válido', () => {
    localStorage.setItem('ai27.tema', 'azul');
    expect(leerTema()).toBe('oscuro');
  });

  it('aplicarTema pone el atributo data-theme que espera la librería', () => {
    aplicarTema('claro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    aplicarTema('oscuro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('cambiarTema aplica el tema y lo guarda para la siguiente carga', () => {
    cambiarTema('claro');

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(leerTema()).toBe('claro');
  });
});
