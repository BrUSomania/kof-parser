import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/kof-parser.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/kof-parser.cjs.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/kof-parser.umd.js',
        format: 'umd',
        name: 'KOFParser',
        sourcemap: true
      }
    ],
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json' })
    ]
  }
];
