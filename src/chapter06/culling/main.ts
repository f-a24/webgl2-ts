import {
  autoResizeCanvas,
  getCanvas,
  getGLContext,
  normalizeColor,
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
let blendingColor = [0, 1, 0];
let blendingAlpha = 1;
let showFrontFace = true;
let showBackFace = true;

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
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uLightDiffuse',
    'uWireframe',
    'uAlpha',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 4]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(50);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uAlpha, 0.5);
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cube-complex.json',
    'cube'
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
      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniforms.uWireframe, object.wireframe ? 1 : 0);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // 描画
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        if (showBackFace) {
          gl.cullFace(gl.FRONT);
          gl.drawElements(
            gl.TRIANGLES,
            object.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
        }
        if (showFrontFace) {
          gl.cullFace(gl.BACK);
          gl.drawElements(
            gl.TRIANGLES,
            object.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
        }
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

  const updateBlending = (v = true) => {
    gl[v ? 'enable' : 'disable'](gl.BLEND);
    gl.blendEquation(blendingEquation);
    gl.blendFunc(blendingSource, blendingTarget);
    const [r, g, b] = blendingColor;
    gl.blendColor(r, g, b, blendingAlpha);
  };

  const gui = new GUI();
  gui
    .add({ 'Alpha Blending': true }, 'Alpha Blending')
    .onChange(updateBlending);
  gui
    .add({ 'Render Front Face': true }, 'Render Front Face')
    .onChange((v: boolean) => (showFrontFace = v));
  gui
    .add({ 'Render Back Face': true }, 'Render Back Face')
    .onChange((v: boolean) => (showBackFace = v));
  gui
    .add({ 'Alpha Value': 0.5 }, 'Alpha Value', 0, 1)
    .step(0.1)
    .onChange((v: number) => gl.uniform1f(program.uniforms.uAlpha, v));
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
    .add({ 'Constant Alpha': 1 }, 'Constant Alpha', 0, 1)
    .step(0.1)
    .onChange((v: number) => {
      blendingAlpha = v;
      updateBlending();
    });
};

init();
