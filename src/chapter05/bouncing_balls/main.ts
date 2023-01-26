import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { vec3 } from 'gl-matrix';
import { Program } from '../../common/Program';
import { Object, Scene } from '../../common/Scene';
import { Floor } from '../../common/Floor';
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
const balls: BouncingBall[] = [];
let sceneTime = 0;
const animationRate = 15;
const gravity = 9.8;
const ballsCount = 500;

/**
 * ランダムな位置を生成
 * @returns ランダムな位置[x, y, z]
 */
const generatePosition = (): vec3 => [
  Math.floor(Math.random() * 50) - Math.floor(Math.random() * 50),
  Math.floor(Math.random() * 30) + 50,
  Math.floor(Math.random() * 50),
];

/**
 * 弾むボールの動作をカプセル化するヘルパークラス
 */
class BouncingBall {
  position: vec3;
  H0: number;
  V0: number;
  VF: number;
  HF: number;
  bouncingTime: number;
  BOUNCINESS: number;
  color: number[];

  constructor() {
    this.position = generatePosition();

    this.H0 = this.position[1];
    this.V0 = 0;
    this.VF = Math.sqrt(2 * gravity * this.H0);
    this.HF = 0;

    this.bouncingTime = 0;
    this.BOUNCINESS = Math.random() + 0.5;

    this.color = [Math.random(), Math.random(), Math.random(), 1];
  }

  update(time: number) {
    const t = time - this.bouncingTime;
    const h = this.H0 + this.V0 * t - 0.5 * gravity * t * t;

    if (h <= 0) {
      this.bouncingTime = time;
      this.V0 = this.VF * this.BOUNCINESS;
      this.HF = (this.V0 * this.V0) / (2 * gravity);
      this.VF = Math.sqrt(2 * gravity * this.HF);
      this.H0 = 0;
    } else {
      this.position[1] = h;
    }
  }
}

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
    'uTranslation',
    'uTranslate',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 2, 70]);
  camera.setFocus([0, 0, 0]);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uShininess, 230);

  // uniform uTranslationをマップするプログラム変数を作成
  gl.uniform3fv(program.uniforms.uTranslation, [0, 0, 0]);

  // uniform uTranslateをマップするプログラム変数を作成
  gl.uniform1i(program.uniforms.uTranslate, 0);

  for (let i = 0; i < ballsCount; i++) {
    balls.push(new BouncingBall());
  }
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(80, 2));
  // すべてのボールに同じジオメトリを使用
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/ball.json',
    'ball'
  );
};

const drawBall = (ball: BouncingBall, sphere: Object) => {
  gl.uniform3fv(program.uniforms.uTranslation, ball.position);
  gl.uniform4fv(program.uniforms.uMaterialDiffuse, ball.color);
  gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
};

const drawBalls = (object: Object) => {
  if (object.specular)
    gl.uniform4fv(program.uniforms.uMaterialSpecular, object.specular);
  if (object.ambient)
    gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
  gl.uniform1i(program.uniforms.uWireframe, 0);
  gl.uniform1i(program.uniforms.uTranslate, 1);

  // VAOをバインド
  if (object.vao) gl.bindVertexArray(object.vao);
  // IBOをバインド
  if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

  // balls配列を繰り返し処理し、それぞれを描画
  balls.forEach(ball => drawBall(ball, object));

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
      transforms.setMatrixUniforms();

      // オブジェクトがballの場合、最適化された描画コマンドで戻る
      if (object.alias === 'ball') return drawBalls(object);

      // uniforms設定
      gl.uniform1i(program.uniforms.uTranslate, 0);
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
  balls.forEach(ball => ball.update(sceneTime));
  sceneTime += 33 / 1000;
  draw();
};

const onFrame = () => {
  elapsedTime = new Date().getTime() - initialTime;
  if (elapsedTime < animationRate) return;

  let steps = Math.floor(elapsedTime / animationRate);
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
