import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: false
  },
  plugins: [
    nodeResolve({ browser: true, preferBuiltins: true }),
    commonjs(),
    esbuild({ tsconfig: 'tsconfig.json', target: 'es2022' })
  ],
  external: ['obsidian']
};
