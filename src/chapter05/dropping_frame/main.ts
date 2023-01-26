import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { mat4 } from 'gl-matrix';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Floor } from '../../common/Floor';
import { Axis } from '../../common/Axis';
import { Camera, cameraTypes } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let elapsedTime: number;
let initialTime: number;
let fixedLight = false;
let dxSphere = 0.5;
let dxCone = 0.15;
let spherePosition = 0;
let conePosition = 0;
const animationRate = 300;
const simulationRate = 30;

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
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uMaterialSpecular',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightSpecular',
    'uLightPosition',
    'uShininess',
    'uUpdateLight',
    'uWireframe',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 2, 50]);
  camera.setFocus([0, 0, 0]);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uShininess, 230);
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere2.json',
    'sphere'
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cone3.json',
    'cone'
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
    gl.uniform1i(program.uniforms.uUpdateLight, fixedLight ? 1 : 0);

    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();

      // オブジェクトに応じてtransformsを適用する
      if (object.alias === 'sphere') {
        const sphereTransform = transforms.modelViewMatrix;
        mat4.translate(sphereTransform, sphereTransform, [
          0,
          0,
          spherePosition,
        ]);
      } else if (object.alias === 'cone') {
        const coneTransform = transforms.modelViewMatrix;
        mat4.translate(coneTransform, coneTransform, [conePosition, 0, 0]);
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.specular)
        gl.uniform4fv(program.uniforms.uMaterialSpecular, object.specular);
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
 * オブジェクトの位置を更新
 */
const animate = () => {
  spherePosition += dxSphere;
  if (spherePosition >= 30 || spherePosition <= -30) dxSphere = -dxSphere;
  conePosition += dxCone;
  if (conePosition >= 35 || conePosition <= -35) dxCone = -dxCone;
  draw();
};

const onFrame = () => {
  elapsedTime = new Date().getTime() - initialTime;
  if (elapsedTime < animationRate) return;

  let steps = Math.floor(elapsedTime / simulationRate);
  while (steps > 0) {
    animate();
    steps -= 1;
  }

  initialTime = new Date().getTime();
};

const render = () => {
  initialTime = new Date().getTime();
  setInterval(onFrame, animationRate / 1000);
};

/**
 * アプリケーションのエントリーポイント
 */
const init = () => {
  configure();
  load();
  render();

  initControls();
};

const initControls = () => {
  const gui = new GUI();
  gui
    .add({ 'Camera Type': cameraTypes[0] }, 'Camera Type', cameraTypes)
    .onChange((v: (typeof cameraTypes)[number]) => {
      camera.goHome();
      camera.setType(v);
    });
  gui
    .add({ 'Static Light Position': fixedLight }, 'Static Light Position')
    .onChange((v: boolean) => (fixedLight = v));
  gui.add({ 'Go Home': camera.goHome }, 'Go Home');
};

init();
