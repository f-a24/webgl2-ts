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
import { Light, LightsManager } from '../../common/Light';
import { Floor } from '../../common/Floor';
import { mat4, vec3, vec4 } from 'gl-matrix';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let lights: LightsManager;
let lightCutOff = 0.75;
let exponentFactor = 10;
type LightData = {
  id: string;
  name: string;
  position: vec3;
  diffuse: vec4;
  direction: vec3;
};
const lightsData: LightData[] = [
  {
    id: 'redLight',
    name: 'Red Light',
    position: [0, 7, 3],
    diffuse: [1, 0, 0, 1],
    direction: [0, -2, -0.1],
  },
  {
    id: 'greenLight',
    name: 'Green Light',
    position: [2.5, 3, 3],
    diffuse: [0, 1, 0, 1],
    direction: [-0.5, 1, -0.1],
  },
  {
    id: 'blueLight',
    name: 'Blue Light',
    position: [-2.5, 3, 3],
    diffuse: [0, 0, 1, 1],
    direction: [0.5, 1, -0.1],
  },
];

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
    'uLightDiffuse',
    'uLightDirection',
    'uLightPosition',
    'uWireframe',
    'uLightSource',
    'uCutOff',
    'uExponentFactor',
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

  // 複数の光源を管理するヘルパー
  lights = new LightsManager();

  lightsData.forEach(({ id, position, diffuse, direction }) => {
    const light = new Light(id);
    light.setPosition(position);
    light.setDiffuse(diffuse);
    light.setProperty('direction', direction);
    lights.add(light);
  });

  gl.uniform3fv(
    program.uniforms.uLightPosition,
    lights.getArray('position') as vec3
  );
  gl.uniform3fv(
    program.uniforms.uLightDirection,
    lights.getArray('direction') as vec3
  );
  gl.uniform4fv(
    program.uniforms.uLightDiffuse,
    lights.getArray('diffuse') as vec4
  );
  gl.uniform1f(program.uniforms.uCutOff, lightCutOff);
  gl.uniform1f(program.uniforms.uExponentFactor, exponentFactor);
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
  lightsData.forEach(({ id }) => {
    scene.load(
      'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere3.json',
      id
    );
  });
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
      const light = lightsData.find(({ id }) => object.alias === id);
      if (light) {
        const { position, diffuse } = lights.get(light.id)!;
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          position
        );
        object.diffuse = diffuse as number[];
        gl.uniform1i(program.uniforms.uLightSource, 1);
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      // 光源の位置を設定
      gl.uniform3fv(
        program.uniforms.uLightPosition,
        lights.getArray('position') as vec3
      );
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
  lightsData.forEach(data => {
    const lightGUI = gui.addFolder(data.name);
    ['X', 'Y', 'Z'].forEach((s, i) => {
      lightGUI
        .add(
          { [`${s} - ${data.name}`]: data.position[i] },
          `${s} - ${data.name}`,
          -15,
          15
        )
        .step(0.1)
        .onChange((v: number) => {
          data.position[i] = v;
          lights.get(data.id)!.position = data.position;
        });
    });
  });
  gui
    .add({ 'Light Cone Cut Off': lightCutOff }, 'Light Cone Cut Off', 0, 1)
    .step(0.01)
    .onChange((v: number) => gl.uniform1f(program.uniforms.uCutOff, v));
  gui
    .add({ 'Exponent Factor': exponentFactor }, 'Exponent Factor', 1, 100)
    .step(0.01)
    .onChange((v: number) => gl.uniform1f(program.uniforms.uExponentFactor, v));
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
