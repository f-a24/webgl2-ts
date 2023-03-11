import {
  autoResizeCanvas,
  denormalizeColor,
  getCanvas,
  getGLContext,
  normalizeColor,
  RGBColor,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import type { Object } from '../../common/Scene';
import { Clock } from '../../common/Clock';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Light, LightsManager } from '../../common/Light';
import { Floor } from '../../common/Floor';
import { Controls } from '../../common/Controls';
import { vec3 } from 'gl-matrix';
import GUI from 'lil-gui';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: Program;
let scene: Scene;
let clock: Clock;
let camera: Camera;
let transforms: Transforms;
let lights: LightsManager;
let floor: Floor;
let selectedCar: keyof typeof carModelData;

// シーン内の個々のライト位置
const lightPositions: {
  [key in 'farLeft' | 'farRight' | 'nearLeft' | 'nearRight']: vec3;
} = {
  farLeft: [-5, 5, -5],
  farRight: [5, 5, -5],
  nearLeft: [-5, 5, 5],
  nearRight: [5, 5, 5],
};

// 車種ごとのデータを記載
const carModelData = {
  'BMW i8': {
    // 読み込まれているアイテムが塗装されたボディパネルであるかどうかを判断するために使用されるエイリアス
    // モデル内の各オブジェクトには、3Dアーティストによって特定のエイリアスが設定されている
    paintAlias: 'BMW',
    // ロードするモデルのパーツ数
    partsCount: 25,
    // モデルのパス
    path: 'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/bmw-i8/part',
  },
  'Audi R8': {
    paintAlias: 'Lack',
    partsCount: 150,
    path: 'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/audi-r8/part',
  },
  'Ford Mustang': {
    paintAlias: 'pintura_carro',
    partsCount: 103,
    path: 'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/ford-mustang/part',
  },
  'Lamborghini Gallardo': {
    paintAlias: 'Yellow',
    partsCount: 66,
    path: 'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/lamborghini-gallardo/part',
  },
};

const clearColor: RGBColor = [0.9, 0.9, 0.9];

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
  gl.clearColor(...clearColor, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uLightPosition',
    'uWireframe',
    'uLd',
    'uLs',
    'uKa',
    'uKd',
    'uKs',
    'uNs',
    'uD',
  ];

  // アトリビュートとユニフォームをプログラムにロード
  program.load(attributes, uniforms);

  // シーンとクロックを設定
  scene = new Scene(gl, program);
  clock = new Clock();

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  // 複数のライトを管理するヘルパーを設定
  lights = new LightsManager();

  // 各ライトを繰り返し設定
  (Object.keys(lightPositions) as Array<keyof typeof lightPositions>).forEach(
    key => {
      const light = new Light(key);
      light.setPosition(lightPositions[key]);
      light.setDiffuse([0.4, 0.4, 0.4]);
      light.setSpecular([0.8, 0.8, 0.8]);
      lights.add(light);
    }
  );

  gl.uniform3fv(
    program.uniforms.uLightPosition,
    lights.getArray('position') as vec3
  );
  gl.uniform3fv(program.uniforms.uLd, lights.getArray('diffuse') as vec3);
  gl.uniform3fv(program.uniforms.uLs, lights.getArray('specular') as vec3);

  gl.uniform3fv(program.uniforms.uKa, [1, 1, 1]);
  gl.uniform3fv(program.uniforms.uKd, [1, 1, 1]);
  gl.uniform3fv(program.uniforms.uKs, [1, 1, 1]);
  gl.uniform1f(program.uniforms.uNs, 1);
  gl.uniform1f(program.uniforms.uNi, 1);

  // 床を設定
  floor = new Floor(200, 2);
};

/**
 * カメラをホームに戻す
 */
const goHome = () => {
  camera.goHome([0, 0.5, 5]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(25);
  camera.setElevation(-10);
};

/**
 * 車をシーンにロード
 * @param model 車名
 */
const loadCar = (model: keyof typeof carModelData) => {
  scene.objects = [];
  scene.add(floor);
  const { path, partsCount } = carModelData[model];
  scene.loadByParts(path, partsCount);
  selectedCar = model;
};

const load = () => {
  goHome();
  loadCar('BMW i8');
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
      // オブジェクトが見えない場合、何もレンダリングしない
      if (!object.visible) return;

      // 変換を適用
      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      // ユニフォームを設定
      gl.uniform1i(program.uniforms.uWireframe, 0);
      if (object.Ka) gl.uniform3fv(program.uniforms.uKa, object.Ka);
      if (object.Kd) gl.uniform3fv(program.uniforms.uKd, object.Kd);
      if (object.Ks) gl.uniform3fv(program.uniforms.uKs, object.Ks);
      if (object.Ni) gl.uniform1f(program.uniforms.uNi, object.Ni);
      if (object.Ns) gl.uniform1f(program.uniforms.uNs, object.Ns);
      if (object.d) gl.uniform1f(program.uniforms.uD, object.d);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      if (object.wireframe) {
        gl.uniform1i(program.uniforms.uWireframe, 1);
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.uniform1i(program.uniforms.uWireframe, 0);
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
  const eachCarPanel = (cb: (item: Object) => void) => {
    const paintAlias = carModelData[selectedCar].paintAlias;
    scene.traverse(item => {
      if (item.alias.indexOf(paintAlias) >= 0) cb(item);
    });
  };

  const gui = new GUI();
  const carGui = gui.addFolder('Car');
  carGui
    .add({ Model: selectedCar }, 'Model', Object.keys(carModelData))
    .onChange(loadCar);
  carGui
    .addColor({ Color: [255, 255, 255] }, 'Color', 255)
    .onChange((v: RGBColor) => {
      const color = normalizeColor(v);
      eachCarPanel(item => (item.Kd = color));
    });
  carGui
    .add({ Shininess: 0.5 }, 'Shininess', 0, 50)
    .step(0.1)
    .onChange((v: number) => {
      const shininess = [v, v, v];
      eachCarPanel(item => (item.Ks = shininess));
    });
  const lightsGui = gui.addFolder('Lights');
  (Object.keys(lightPositions) as Array<keyof typeof lightPositions>).forEach(
    key => {
      const posGui = lightsGui.addFolder(key);
      ['Diffuse', 'Specular'].forEach(property => {
        posGui
          .add({ [property]: 0.5 }, property, 0, 1)
          .step(0.1)
          .onChange((v: number) => {
            const value: vec3 = [v, v, v];
            const light = lights.get(key)!;
            if (property === 'Diffuse') {
              light.setDiffuse(value);
              gl.uniform3fv(
                program.uniforms.uLd,
                lights.getArray('diffuse') as vec3
              );
              return;
            }
            light.setSpecular(value);
            gl.uniform3fv(
              program.uniforms.uLs,
              lights.getArray('specular') as vec3
            );
          });
      });
    }
  );
  gui
    .addColor({ Background: denormalizeColor(clearColor) }, 'Background', 255)
    .onChange((v: RGBColor) => gl.clearColor(...normalizeColor(v), 1));
  gui
    .add({ Floor: floor.visible }, 'Floor')
    .onChange((v: boolean) => (floor.visible = v));
  gui.add({ 'Go Home': goHome }, 'Go Home');
};

init();
