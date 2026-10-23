// Setup de Vitest: extiende expect con los matchers de Testing Library
// y limpia el DOM entre pruebas.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
