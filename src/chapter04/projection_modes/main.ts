import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { mat4 } from 'gl-matrix';
import { Program } from '../../common/Program';
import { Clock } from '../../common/Clock';
import { Scene } from '../../common/Scene';
import { Floor } from '../../common/Floor';
import { Axis } from '../../common/Axis';
import { Camera, cameraTypes } from '../../common/Camera';
import { Controls } from '../../common/Controls';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let clock: Clock;
let fov = 45;
let fixedLight = false;
let modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat4.create();
const PERSPECTIVE_PROJECTION = 'Perspective Projection';
const ORTHOGRAPHIC_PROJECTION = 'Orthographic Projection';
let projectionMode = PERSPECTIVE_PROJECTION;

const controls = {
  X: 0,
  Y: 2,
  Z: 50,
};

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

  clock = new Clock();

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe',
    'uFixedLight',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  // シーンの作成
  // （前の章で行ったようにグローバル配列のセットを維持するのではなく、
  // 　シーンにオブジェクトを追加する簡単な方法）
  scene = new Scene(gl, program);

  // カメラを構成し、追跡モードに設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 20, 120]);

  // ユーザー主導のイベントでカメラを移動できるようにすることでコントロールを構成
  new Controls(camera, canvas);

  // 光源の作成
  gl.uniform4fv(program.uniforms.uLightAmbient, [0.1, 0.1, 0.1, 1]);
  gl.uniform3fv(program.uniforms.uLightPosition, [0, 0, 5000]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [0.7, 0.7, 0.7, 1]);
  gl.uniform1i(program.uniforms.uFixedLight, fixedLight ? 1 : 0);

  initTransforms();
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(2000, 100));
  scene.add(new Axis(2000));
  // Helper function that iterates over the number of parts count
  // and loads them asynchronously into our application
  scene.loadByParts(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/nissan-gtr/part',
    178
  );
};

/**
 * 必要なトランスフォームを初期化
 */
const initTransforms = () => {
  modelViewMatrix = camera.getViewTransform();
  mat4.identity(projectionMatrix);
  updateTransforms();
  mat4.identity(normalMatrix);
  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
};

/**
 * トランスフォームを更新
 */
const updateTransforms = () => {
  const { width, height } = gl.canvas;
  if (projectionMode === PERSPECTIVE_PROJECTION) {
    mat4.perspective(projectionMatrix, fov, width / height, 1, 5000);
  } else {
    mat4.ortho(
      projectionMatrix,
      -width / fov,
      width / fov,
      -height / fov,
      height / fov,
      -5000,
      5000
    );
  }
};

/**
 * マトリックスのユニフォームをセット
 */
const setMatrixUniforms = () => {
  gl.uniformMatrix4fv(
    program.uniforms.uModelViewMatrix,
    false,
    camera.getViewTransform()
  );
  gl.uniformMatrix4fv(
    program.uniforms.uProjectionMatrix,
    false,
    projectionMatrix
  );
  mat4.transpose(normalMatrix, camera.matrix);
  gl.uniformMatrix4fv(program.uniforms.uNormalMatrix, false, normalMatrix);
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  try {
    updateTransforms();
    setMatrixUniforms();

    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
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

// アプリケーションのエントリーポイント
const init = () => {
  configure();
  load();
  clock.on('tick', draw);

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
    .add({ 'Projection Mode': projectionMode }, 'Projection Mode', [
      PERSPECTIVE_PROJECTION,
      ORTHOGRAPHIC_PROJECTION,
    ])
    .onChange((v: string) => (projectionMode = v));
  gui
    .add({ fov }, 'fov', 1, 200)
    .step(1)
    .onChange((v: number) => (fov = v));
  gui
    .add({ Dolly: 0 }, 'Dolly', -100, 100)
    .step(0.1)
    .onChange((v: number) => camera.dolly(v));
  const positionGUI = gui.addFolder('Position');
  Object.keys(controls).forEach(key => {
    positionGUI
      .add(controls, key, -200, 200)
      .step(0.1)
      .onChange(() => {
        camera.setPosition([controls.X, controls.Y, controls.Z]);
      });
  });
  const rotationGUI = gui.addFolder('Rotation');
  rotationGUI
    .add({ Elevation: camera.elevation }, 'Elevation', -180, 180)
    .step(0.1)
    .onChange((v: number) => camera.setElevation(v));
  rotationGUI
    .add({ Azimuth: camera.azimuth }, 'Azimuth', -180, 180)
    .step(0.1)
    .onChange((v: number) => camera.setAzimuth(v));
  gui
    .add({ 'Static Light Position': fixedLight }, 'Static Light Position')
    .onChange((v: boolean) =>
      gl.uniform1i(program.uniforms.uFixedLight, v ? 1 : 0)
    );
  gui.add({ 'Go Home': camera.goHome }, 'Go Home');

  // すべてのティック(requestAnimationFrame)でコールバックを呼び出す
  clock.on('tick', () => {
    camera.matrix.forEach((data, i) => {
      const el = document.getElementById(`m${i}`);
      if (el) el.innerText = data.toFixed(1);
    });
  });
};

init();
