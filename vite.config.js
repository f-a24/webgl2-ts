import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

const root = resolve(__dirname, 'src');

export default defineConfig({
  root,
  publicDir: resolve(__dirname, 'public'),
  plugins: [glsl()],
  base: '/webgl2-ts/',
  build: {
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
        'chapter04/projection_modes': resolve(
          root,
          'chapter04',
          'projection_modes',
          'index.html'
        ),
        'chapter05/simple_animation': resolve(
          root,
          'chapter05',
          'simple_animation',
          'index.html'
        ),
        'chapter05/bouncing_balls': resolve(
          root,
          'chapter05',
          'bouncing_balls',
          'index.html'
        ),
        'chapter05/interpolation': resolve(
          root,
          'chapter05',
          'interpolation',
          'index.html'
        ),
        'chapter06/cube': resolve(
          root,
          'chapter06',
          'cube',
          'index.html'
        ),
        'chapter06/wall': resolve(
          root,
          'chapter06',
          'wall',
          'index.html'
        ),
        'chapter06/wall_light_arrays': resolve(
          root,
          'chapter06',
          'wall_light_arrays',
          'index.html'
        ),
        'chapter06/wall_spot_light': resolve(
          root,
          'chapter06',
          'wall_spot_light',
          'index.html'
        ),
        'chapter06/blending': resolve(
          root,
          'chapter06',
          'blending',
          'index.html'
        ),
        'chapter06/culling': resolve(
          root,
          'chapter06',
          'culling',
          'index.html'
        ),
        'chapter06/transparency': resolve(
          root,
          'chapter06',
          'transparency',
          'index.html'
        ),
        'chapter07/textured_cube': resolve(
          root,
          'chapter07',
          'textured_cube',
          'index.html'
        ),
        'chapter07/textured_filters': resolve(
          root,
          'chapter07',
          'textured_filters',
          'index.html'
        ),
        'chapter07/textured_wrapping': resolve(
          root,
          'chapter07',
          'textured_wrapping',
          'index.html'
        ),
        'chapter07/multi_texture': resolve(
          root,
          'chapter07',
          'multi_texture',
          'index.html'
        ),
        'chapter07/cubemap': resolve(
          root,
          'chapter07',
          'cubemap',
          'index.html'
        ),
        'chapter08/picking_sample': resolve(
          root,
          'chapter08',
          'picking_sample',
          'index.html'
        ),
        'chapter08/picking': resolve(
          root,
          'chapter08',
          'picking',
          'index.html'
        ),
        'chapter09/showroom': resolve(
          root,
          'chapter09',
          'showroom',
          'index.html'
        ),
        'chapter10/post_process': resolve(
          root,
          'chapter10',
          'post_process',
          'index.html'
        ),
        'chapter10/point_sprites': resolve(
          root,
          'chapter10',
          'point_sprites',
          'index.html'
        ),
        'chapter10/normal_map': resolve(
          root,
          'chapter10',
          'normal_map',
          'index.html'
        ),
        'chapter10/ray_tracing': resolve(
          root,
          'chapter10',
          'ray_tracing',
          'index.html'
        ),
      },
    },
  },
});
