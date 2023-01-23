import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { mat4, vec3 } from 'gl-matrix';
import { Program } from '../../common/Program';
import { Clock } from '../../common/Clock';
import { Scene } from '../../common/Scene';
import { Floor } from '../../common/Floor';
import { Axis } from '../../common/Axis';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let clock: Clock;
const WORLD_COORDINATES = 'World Coordinates';
const CAMERA_COORDINATES = 'Camera Coordinates';
let coordinates = WORLD_COORDINATES;
const home: vec3 = [0, -2, -50];
let position: vec3 = [0, -2, -50];
let rotation: vec3 = [0, 0, 0];
const cameraMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat4.create();

const controls = {
  position: {
    'Translate X': 0,
    'Translate Y': -2,
    'Translate Z': -50,
  },
  rotation: {
    'Rotate X': 0,
    'Rotate Y': 0,
    'Rotate Z': 0,
  },
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
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  // シーンの作成
  // （前の章で行ったようにグローバル配列のセットを維持するのではなく、
  // 　シーンにオブジェクトを追加する簡単な方法）
  scene = new Scene(gl, program);

  // 光源の作成
  gl.uniform3fv(program.uniforms.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);

  initTransforms();
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cone3.json',
    'cone'
  );
};

/**
 * 必要なトランスフォームを初期化
 */
const initTransforms = () => {
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, home);

  mat4.identity(cameraMatrix);
  mat4.invert(modelViewMatrix, cameraMatrix);

  mat4.identity(projectionMatrix);

  mat4.identity(normalMatrix);
  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
};

/**
 * トランスフォームを更新
 */
const updateTransforms = () => {
  mat4.perspective(
    projectionMatrix,
    45,
    gl.canvas.width / gl.canvas.height,
    0.1,
    1000
  );

  if (coordinates === WORLD_COORDINATES) {
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, position);
    mat4.rotateX(
      modelViewMatrix,
      modelViewMatrix,
      (rotation[0] * Math.PI) / 180
    );
    mat4.rotateY(
      modelViewMatrix,
      modelViewMatrix,
      (rotation[1] * Math.PI) / 180
    );
    mat4.rotateZ(
      modelViewMatrix,
      modelViewMatrix,
      (rotation[2] * Math.PI) / 180
    );
  } else {
    mat4.identity(cameraMatrix);
    mat4.translate(cameraMatrix, cameraMatrix, position);
    mat4.rotateX(cameraMatrix, cameraMatrix, (rotation[0] * Math.PI) / 180);
    mat4.rotateY(cameraMatrix, cameraMatrix, (rotation[1] * Math.PI) / 180);
    mat4.rotateZ(cameraMatrix, cameraMatrix, (rotation[2] * Math.PI) / 180);
  }
};

/**
 * マトリックスのユニフォームをセット
 */
const setMatrixUniforms = () => {
  if (coordinates === WORLD_COORDINATES) {
    mat4.invert(cameraMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(
      program.uniforms.uModelViewMatrix,
      false,
      modelViewMatrix
    );
  } else {
    mat4.invert(modelViewMatrix, cameraMatrix);
  }

  gl.uniformMatrix4fv(
    program.uniforms.uProjectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    program.uniforms.uModelViewMatrix,
    false,
    modelViewMatrix
  );
  mat4.transpose(normalMatrix, cameraMatrix);
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
  // 値を変更するDOM要素
  const coordinatesElement = document.getElementById('coordinates');

  const gui = new GUI();
  gui
    .add({ Coordinates: coordinates }, 'Coordinates', [
      WORLD_COORDINATES,
      CAMERA_COORDINATES,
    ])
    .onChange((v: string) => {
      coordinates = v;
      if (coordinatesElement) coordinatesElement.innerText = coordinates;
      vec3.copy(home, position);
      rotation = [0, 0, 0];
      if (coordinates === CAMERA_COORDINATES) vec3.negate(position, position);
    });
  const positionGUI = gui.addFolder('Position');
  Object.keys(controls.position).forEach(key => {
    positionGUI
      .add(controls.position, key, -100, 100)
      .step(-0.1)
      .onChange(() => {
        position = [
          controls.position['Translate X'],
          controls.position['Translate Y'],
          controls.position['Translate Z'],
        ];
      });
  });
  const rotationGUI = gui.addFolder('Rotation');
  Object.keys(controls.rotation).forEach(key => {
    rotationGUI
      .add(controls.rotation, key, -180, 180)
      .step(0.1)
      .onChange(() => {
        rotation = [
          controls.rotation['Rotate X'],
          controls.rotation['Rotate Y'],
          controls.rotation['Rotate Z'],
        ];
      });
  });

  // すべてのティック(requestAnimationFrame)でコールバックを呼び出す
  clock.on('tick', () => {
    // DOMの値を更新
    const matrix =
      coordinates === WORLD_COORDINATES ? modelViewMatrix : cameraMatrix;
    matrix.forEach((data, i) => {
      const el = document.getElementById(`m${i}`);
      if (el) el.innerText = data.toFixed(1);
    });
  });
};

init();
