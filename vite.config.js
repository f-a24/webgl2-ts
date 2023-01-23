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
        'chapter03/goraud_phong': resolve(
          root,
          'chapter03',
          'goraud_phong',
          'index.html'
        ),
        'chapter03/sphere_phong': resolve(
          root,
          'chapter03',
          'sphere_phong',
          'index.html'
        ),
        'chapter03/wall': resolve(root, 'chapter03', 'wall', 'index.html'),
        'chapter03/positional_lighting': resolve(
          root,
          'chapter03',
          'positional_lighting',
          'index.html'
        ),
        'chapter03/showroom': resolve(
          root,
          'chapter03',
          'showroom',
          'index.html'
        ),
        'chapter04/model_view': resolve(
          root,
          'chapter04',
          'model_view',
          'index.html'
        ),
        'chapter04/camera_types': resolve(
          root,
          'chapter04',
          'camera_types',
          'index.html'
        ),
        'chapter04/camera_types': resolve(
          root,
          'chapter04',
          'projection_modes',
          'index.html'
        ),
      },
    },
  },
});
