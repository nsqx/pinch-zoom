import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const input = 'src/index.js';

export default [
  {
    input,
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ]
  },
  // --- LEGACY (UMD/ES5)
  {
    input,
    output: {
      file: 'dist/index.legacy.js',
      format: 'umd',
      name: 'PinchZoom',
      exports: 'named',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', {
            useBuiltIns: "usage",
            corejs: 3,
            modules: false
          }]
        ]
      }),
      terser()
    ]
  },

  // --- TYPES
  {
    input: 'src/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()]
  }
];