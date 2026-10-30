import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/*
 * Librerias que el scaffold excluye por decision de arquitectura, no por gusto.
 * Si alguna vez hace falta una, se quita de aqui en el mismo commit que la
 * justifica — nunca por goteo.
 */
const forbiddenPackages = {
  paths: [
    { name: 'zustand', message: 'Sin estado global: usa Context (src/context/).' },
    { name: 'jotai', message: 'Sin estado global: usa Context (src/context/).' },
    { name: 'redux', message: 'Sin estado global: usa Context (src/context/).' },
    { name: '@reduxjs/toolkit', message: 'Sin estado global: usa Context (src/context/).' },
    { name: 'swr', message: 'El estado de servidor es de TanStack Query.' },
    {
      name: 'framer-motion',
      message: 'Sin librerias de UI: Tailwind puro y componentes propios en components/ui/.',
    },
    {
      name: 'next-auth',
      message: 'El login va contra bff (POST /api/v1/sesion), no contra una libreria de auth.',
    },
    {
      name: 'aws-amplify',
      message: 'El frontend no habla con Cognito directamente: habla con bff.',
    },
  ],
  patterns: [
    {
      group: ['@radix-ui/*', '@mui/*', '@chakra-ui/*'],
      message: 'Sin librerias de componentes UI: Tailwind puro y componentes propios.',
    },
  ],
};

/*
 * Los artefactos generados solo se consumen desde dentro de src/lib/. El resto
 * de la app habla con los wrappers de dominio, nunca con el cliente generado:
 * es lo que permite cambiar la generacion sin tocar features/ ni routes/.
 */
const generatedArtifacts = [
  {
    group: ['**/lib/api/generated/**', '@/lib/api/generated/**'],
    message:
      'El cliente generado solo se consume desde src/lib/api/. Usa el wrapper de dominio correspondiente.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'src/routeTree.gen.ts',
      'src/lib/api/generated/**',
      // Worker vendido por msw: no es nuestro codigo.
      'public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // `configs.flat[...]` es la variante de flat config; `configs[...]` sigue siendo legacy.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },

  // Fuera de lib/: prohibidas las librerias excluidas y los artefactos generados.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: forbiddenPackages.paths,
          patterns: [...forbiddenPackages.patterns, ...generatedArtifacts],
        },
      ],
    },
  },

  // Dentro de lib/: solo las librerias excluidas. Aqui si se toca lo generado.
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', forbiddenPackages],
    },
  },

  /*
   * Cada Context exporta su Provider y su hook de consumo juntos. Separarlos en dos
   * archivos por complacer a Fast Refresh empeora la lectura sin ganar nada: estos
   * providers viven en la raiz de la app, asi que editarlos remonta de todas formas.
   */
  {
    files: ['src/context/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  /*
   * Las rutas de TanStack Router exportan `Route`, que no es un componente. Es
   * inherente al enrutado por archivos, no un descuido: la regla de react-refresh no
   * aplica aqui.
   */
  {
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['e2e/**/*.ts', '*.config.{ts,js}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
