import {
  autoResizeCanvas,
  denormalizeColor,
  getCanvas,
  getGLContext,
  normalizeColor,
  RGBAColor,
  RGBColor,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Clock } from '../../common/Clock';
import { Floor } from '../../common/Floor';
import { mat4 } from 'gl-matrix';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let blendingEquation: number;
let blendingSource: number;
let blendingTarget: number;
let blending = true;
let depthTest = true;
let culling = true;
let lambert = true;
let floor = true;
let coneColor: RGBAColor = [0, 1, 1, 1];
let sphereColor: RGBAColor = [0.7, 0, 0.7, 1];
let blendingColor = [0, 1, 0];
let blendingAlpha = 1;

/**
 * 適切な頂点シェーダーとフラグメントシェーダーでプログラムを作成
 */
const configure = () => {
  // canvasを取得
  const canvas = getCanvas('webgl-canves');
  if (!canvas) return;

  // 自動リサイズ処理
  autoResizeCanvas(canvas);

  // WebGLコンテキストを取得
  const _gl = getGLContext(canvas);
  if (!_gl) return;
  gl = _gl;
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const [r, g, b] = blendingColor;
  gl.blendColor(r, g, b, blendingAlpha);
  gl.enable(gl.CULL_FACE);

  // 値を設定
  blendingEquation = gl.FUNC_ADD;
  blendingSource = gl.SRC_ALPHA;
  blendingTarget = gl.ONE_MINUS_SRC_ALPHA;

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe',
    'uUseLambert',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 5, 35]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(25);
  camera.setElevation(-25);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1i(program.uniforms.uUseLambert, lambert ? 1 : 0);
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(80, 2));
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cone3.json',
    'cone',
    { diffuse: coneColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere2.json',
    'sphere',
    { diffuse: sphereColor }
  );
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      const { alias } = object;
      if (alias === 'floor' && !floor) return;

      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();

      if (alias === 'cone') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          [0, 0, -3.5]
        );
      }

      if (alias === 'sphere') {
        mat4.scale(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          [0.5, 0.5, 0.5]
        );
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          [0, 0, 2.5]
        );
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniforms.uWireframe, object.wireframe ? 1 : 0);
      gl.uniform1i(program.uniforms.uUseLambert, lambert ? 1 : 0);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // 描画
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawElements(
          gl.TRIANGLES,
          object.indices.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // クリア
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  } catch (error) {
    console.error(error);
  }
};

/**
 * アプリケーションのエントリーポイント
 */
const init = () => {
  configure();
  load();
  clock.on('tick', draw);

  initControls();
};

const initControls = () => {
  const blendFuncs = [
    'ZERO',
    'ONE',
    'SRC_COLOR',
    'DST_COLOR',
    'SRC_ALPHA',
    'DST_ALPHA',
    'CONSTANT_COLOR',
    'CONSTANT_ALPHA',
    'ONE_MINUS_SRC_ALPHA',
    'ONE_MINUS_DST_ALPHA',
    'ONE_MINUS_SRC_COLOR',
    'ONE_MINUS_DST_COLOR',
    'ONE_MINUS_CONSTANT_COLOR',
    'ONE_MINUS_CONSTANT_ALPHA',
  ] as const;
  const getState = (v: boolean) => (v ? 'enable' : 'disable');

  const updateBlending = (v = true) => {
    gl[v ? 'enable' : 'disable'](gl.BLEND);
    gl.blendFunc(blendingSource, blendingTarget);
    gl.blendEquation(blendingEquation);
    const [r, g, b] = blendingColor;
    gl.blendColor(r, g, b, blendingAlpha);
  };

  const gui = new GUI();
  gui.add({ Blending: blending }, 'Blending').onChange(updateBlending);
  gui
    .add({ 'Depth Testing': depthTest }, 'Depth Testing')
    .onChange((v: boolean) => gl[getState(v)](gl.DEPTH_TEST));
  gui
    .add({ 'Back Face Culling': culling }, 'Back Face Culling')
    .onChange((v: boolean) => gl[getState(v)](gl.CULL_FACE));
  gui
    .add({ Lambert: lambert }, 'Lambert')
    .onChange((v: boolean) => (lambert = v));
  gui.add({ Floor: floor }, 'Floor').onChange((v: boolean) => (floor = v));
  [
    { name: 'Sphere', id: 'sphere', color: sphereColor },
    { name: 'Cone', id: 'cone', color: coneColor },
  ].forEach(data => {
    gui
      .add({ [`${data.name} Alpha`]: 1 }, `${data.name} Alpha`, 0, 1)
      .step(0.1)
      .onChange((v: number) => (scene.get(data.id)!.diffuse![3] = v));
    gui
      .addColor(
        { [`${data.name} Color`]: denormalizeColor(data.color) },
        `${data.name} Color`,
        255
      )
      .onChange(
        (v: RGBColor) => (scene.get(data.id)!.diffuse = normalizeColor(v))
      );
  });
  gui
    .add({ 'Blend Function': blendingEquation }, 'Blend Function', [
      'FUNC_ADD',
      'FUNC_SUBTRACT',
      'FUNC_REVERSE_SUBTRACT',
    ])
    .onChange((v: 'FUNC_ADD' | 'FUNC_SUBTRACT' | 'FUNC_REVERSE_SUBTRACT') => {
      blendingEquation = gl[v];
      updateBlending();
    });
  gui
    .add({ Source: blendingSource }, 'Source', [
      ...blendFuncs,
      'SRC_ALPHA_SATURATE',
    ])
    .onChange((v: (typeof blendFuncs)[number] | 'SRC_ALPHA_SATURATE') => {
      blendingSource = gl[v];
      updateBlending();
    });
  gui
    .add({ Destination: blendingTarget }, 'Destination', blendFuncs)
    .onChange((v: (typeof blendFuncs)[number]) => {
      blendingTarget = gl[v];
      updateBlending();
    });
  gui
    .addColor({ 'Blending Color': [0, 0, 0] }, 'Blending Color', 255)
    .onChange((v: RGBColor) => {
      blendingColor = normalizeColor(v);
      updateBlending();
    });
  gui
    .add({ 'Alpha Value': 1 }, 'Alpha Value', 0, 1)
    .step(0.1)
    .onChange((v: number) => {
      blendingAlpha = v;
      updateBlending();
    });
  gui
    .add({ 'Render Order': 'Cone First' }, 'Render Order', [
      'Cone First',
      'Sphere First',
    ])
    .onChange((v: string) => {
      if (v === 'Sphere First') {
        scene.renderSooner('sphere');
        scene.renderFirst('floor');
      } else {
        scene.renderSooner('cone');
        scene.renderFirst('floor');
      }
    });
  gui.add(
    {
      Reset: () => {
        depthTest = true;
        blending = true;
        culling = true;
        lambert = true;
        floor = true;
        blendingEquation = gl.FUNC_ADD;
        blendingSource = gl.SRC_ALPHA;
        blendingTarget = gl.ONE_MINUS_SRC_ALPHA;
        camera.goHome([0, 5, 35]);
        camera.setFocus([0, 0, 0]);
        camera.setAzimuth(25);
        camera.setElevation(-25);
      },
    },
    'Reset'
  );
};

init();
