import typescript from '@rollup/plugin-typescript';

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/kof-parser.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/kof-parser.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto',
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // UMD build for browser
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/kof-parser.umd.js',
      format: 'umd',
      name: 'kof',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
];
