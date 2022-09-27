import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

const root = resolve(__dirname, 'src');

export default defineConfig({
  root,
  publicDir: resolve(__dirname, 'public'),
  plugins: [glsl()],
  build: {
    outDir: resolve(__dirname, 'docs'),
    rollupOptions: {
      input: {
        chapter01: resolve(root, 'chapter01', 'index.html'),
        'chapter02/rendering_modes': resolve(
          root,
          'chapter02',
          'rendering_modes',
          'index.html'
        ),
        'chapter02/square': resolve(root, 'chapter02', 'square', 'index.html'),
        'chapter02/state_machine': resolve(
          root,
          'chapter02',
          'state_machine',
          'index.html'
        ),
		'chapter03/moving_light': resolve(
			root,
			'chapter03',
			'moving_light',
			'index.html'
		  ),
      },
    },
  },
});
