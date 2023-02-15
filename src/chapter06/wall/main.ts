import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Camera, cameraTypes } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Clock } from '../../common/Clock';
import { Light } from '../../common/Light';
import { Floor } from '../../common/Floor';
import { mat4, vec3 } from 'gl-matrix';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let lightCutOff = 0.5;
let redLightPosition: vec3 = [0, 7, 3];
let greenLightPosition: vec3 = [2.5, 3, 3];
let blueLightPosition: vec3 = [-2.5, 3, 3];

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
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
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
    'uLightAmbient',
    'uDiffuseRedLight',
    'uDiffuseGreenLight',
    'uDiffuseBlueLight',
    'uPositionRedLight',
    'uPositionGreenLight',
    'uPositionBlueLight',
    'uWireframe',
    'uLightSource',
    'uCutOff',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 5, 30]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(0);
  camera.setElevation(-3);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  const redLight = new Light('redLight');
  redLight.setPosition(redLightPosition);
  redLight.setDiffuse([1, 0, 0, 1]);

  const greenLight = new Light('greenLight');
  greenLight.setPosition(greenLightPosition);
  greenLight.setDiffuse([0, 1, 0, 1]);

  const blueLight = new Light('blueLight');
  blueLight.setPosition(blueLightPosition);
  blueLight.setDiffuse([0, 0, 1, 1]);

  gl.uniform3fv(program.uniforms.uPositionRedLight, redLight.position);
  gl.uniform3fv(program.uniforms.uPositionGreenLight, greenLight.position);
  gl.uniform3fv(program.uniforms.uPositionBlueLight, blueLight.position);
  gl.uniform4fv(program.uniforms.uDiffuseRedLight, redLight.diffuse);
  gl.uniform4fv(program.uniforms.uDiffuseGreenLight, greenLight.diffuse);
  gl.uniform4fv(program.uniforms.uDiffuseBlueLight, blueLight.diffuse);
  gl.uniform1f(program.uniforms.uCutOff, lightCutOff);
  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(80, 2));
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/wall.json',
    'wall'
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere3.json',
    'redLight'
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere3.json',
    'greenLight'
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere3.json',
    'blueLight'
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

      gl.uniform1i(program.uniforms.uLightSource, 0);
      const { alias } = object;
      if (alias === 'redLight') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          program.getUniform(program.uniforms.uPositionRedLight)
        );
        object.diffuse = program.getUniform(program.uniforms.uDiffuseRedLight);
        gl.uniform1i(program.uniforms.uLightSource, 1);
      }

      if (alias === 'greenLight') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          program.getUniform(program.uniforms.uPositionGreenLight)
        );
        object.diffuse = program.getUniform(
          program.uniforms.uDiffuseGreenLight
        );
        gl.uniform1i(program.uniforms.uLightSource, 1);
      }

      if (alias === 'blueLight') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          program.getUniform(program.uniforms.uPositionBlueLight)
        );
        object.diffuse = program.getUniform(program.uniforms.uDiffuseBlueLight);
        gl.uniform1i(program.uniforms.uLightSource, 1);
      }

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
  const gui = new GUI();
  gui
    .add({ 'Camera Type': camera.type }, 'Camera Type', cameraTypes)
    .onChange((v: (typeof cameraTypes)[number]) => {
      camera.goHome();
      camera.setType(v);
    });
  const redLightGUI = gui.addFolder('Red Light');
  const greenLightGUI = gui.addFolder('Green Light');
  const blueLightGUI = gui.addFolder('Green Light');
  ['X', 'Y', 'Z'].forEach((s, i) => {
    redLightGUI
      .add(
        { [`${s} - Red Light`]: redLightPosition[i] },
        `${s} - Red Light`,
        -15,
        15
      )
      .step(0.1)
      .onChange((v: number) => {
        redLightPosition[i] = v;
        gl.uniform3fv(program.uniforms.uPositionRedLight, redLightPosition);
      });
    greenLightGUI
      .add(
        { [`${s} - Green Light`]: greenLightPosition[i] },
        `${s} - Green Light`,
        -15,
        15
      )
      .step(0.1)
      .onChange((v: number) => {
        greenLightPosition[i] = v;
        gl.uniform3fv(program.uniforms.uPositionGreenLight, greenLightPosition);
      });
    blueLightGUI
      .add(
        { [`${s} - Blue Light`]: blueLightPosition[i] },
        `${s} - Blue Light`,
        -15,
        15
      )
      .step(0.1)
      .onChange((v: number) => {
        blueLightPosition[i] = v;
        gl.uniform3fv(program.uniforms.uPositionBlueLight, blueLightPosition);
      });
  });
  gui
    .add({ 'Light Cone Cut Off': lightCutOff }, 'Light Cone Cut Off', 0, 1)
    .step(0.01)
    .onChange((v: number) => gl.uniform1f(program.uniforms.uCutOff, v));
  gui.add(
    {
      'Go Home': () => {
        camera.goHome();
        camera.setType('ORBITING_TYPE');
      },
    },
    'Go Home'
  );
};

init();
