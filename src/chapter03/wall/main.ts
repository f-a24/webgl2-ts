import {
  autoResizeCanvas,
  calculateNormals,
  getCanvas,
  getGLContext,
  getShader,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { mat4 } from 'gl-matrix';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: WebGLProgram | null;
let vao: WebGLVertexArrayObject | null;
let indices: number[];
let indicesBuffer: WebGLBuffer | null;
// 後で参照するための方向値
let azimuth = 0;
let elevation = 0;
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();

interface WebGLProgram {
  aVertexPosition?: number;
  aVertexNormal?: number;
  uProjectionMatrix?: WebGLUniformLocation | null;
  uModelViewMatrix?: WebGLUniformLocation | null;
  uNormalMatrix?: WebGLUniformLocation | null;
  uLightDirection?: WebGLUniformLocation | null;
  uLightAmbient?: WebGLUniformLocation | null;
  uLightDiffuse?: WebGLUniformLocation | null;
  uMaterialDiffuse?: WebGLUniformLocation | null;
}

/**
 * 適切な頂点シェーダーとフラグメントシェーダーでプログラムを作成
 */
const initProgram = () => {
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

  // シェーダーを取得
  const vertexShader = getShader(gl, vertex.trim(), 'vertex');
  const fragmentShader = getShader(gl, fragment.trim(), 'fragment');

  if (!vertexShader || !fragmentShader) return;

  // プログラムを作成
  program = gl.createProgram();
  if (!program) return;

  // このプログラムをシェーダーにアタッチ
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error('Could not initialize shaders');

  // プログラムインスタンスを使用
  gl.useProgram(program);

  // コードの後半で簡単にアクセスできるようにこれらのシェーダーの値の
  // ロケーションをプログラムインスタンスにアタッチする
  program.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  program.aVertexNormal = gl.getAttribLocation(program, 'aVertexNormal');
  program.uProjectionMatrix = gl.getUniformLocation(
    program,
    'uProjectionMatrix'
  );
  program.uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
  program.uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
  program.uLightDirection = gl.getUniformLocation(program, 'uLightDirection');
  program.uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
  program.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  program.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
};

const initLights = () => {
  if (program) {
    if (program.uLightDirection)
      gl.uniform3fv(program.uLightDirection, [0, 0, -1]);
    if (program.uLightAmbient)
      gl.uniform4fv(program.uLightAmbient, [0.01, 0.01, 0.01, 1]);
    if (program.uLightDiffuse)
      gl.uniform4fv(program.uLightDiffuse, [0.5, 0.5, 0.5, 1]);
    if (program.uMaterialDiffuse)
      gl.uniform4f(program.uMaterialDiffuse, 0.1, 0.5, 0.8, 1);
  }
};
/**
 * ←↑→↓キーで方向値を更新する
 * @param ev キーボードイベント
 * @returns
 */
const processKey = ({ key }: KeyboardEvent) => {
  if (!program || !program.uLightDirection) return;

  const lightDirection = gl.getUniform(program, program.uLightDirection);
  const incrementValue = 10;

  switch (key) {
    case 'ArrowLeft': {
      azimuth -= incrementValue;
      break;
    }
    case 'ArrowUp': {
      elevation += incrementValue;
      break;
    }
    case 'ArrowRight': {
      azimuth += incrementValue;
      break;
    }
    case 'ArrowDown': {
      elevation -= incrementValue;
      break;
    }
  }

  azimuth %= 360;
  elevation %= 360;

  const theta = (elevation * Math.PI) / 180;
  const phi = (azimuth * Math.PI) / 180;

  // 極座標からデカルト座標に変換
  lightDirection[0] = Math.cos(theta) * Math.sin(phi);
  lightDirection[1] = Math.sin(theta);
  lightDirection[2] = Math.cos(theta) * -Math.cos(phi);

  gl.uniform3fv(program.uLightDirection, lightDirection);
};

/**
 * バッファを準備
 */
const initBuffers = () => {
  /**
   *
   *           4          5             6         7
   *           +----------+-------------+---------+
   *           |          |             |         |
   *           |          |             |         |
   *           |          |             |         |
   *           |          |             |         |
   *           |          |             |         |
   *           +----------+-------------+---------+
   *           0          1             2         3
   *
   */
  const vertices = [
    -20,
    -8,
    20, // 0
    -10,
    -8,
    0, // 1
    10,
    -8,
    0, // 2
    20,
    -8,
    20, // 3
    -20,
    8,
    20, // 4
    -10,
    8,
    0, // 5
    10,
    8,
    0, // 6
    20,
    8,
    20, // 7
  ];

  indices = [0, 5, 4, 1, 5, 0, 1, 6, 5, 2, 6, 1, 2, 7, 6, 3, 7, 2];

  // 法線を計算
  const normals = calculateNormals(vertices, indices);

  // VAOインスタンス作成
  vao = gl.createVertexArray();

  // バインドしてその上で処理
  gl.bindVertexArray(vao);

  // VBOの準備
  const verticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // draw内で後ほどデータを使用するためにVAOの命令を実行
  if (program) {
    gl.enableVertexAttribArray(program.aVertexPosition || 0);
    gl.vertexAttribPointer(
      program.aVertexPosition || 0,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
  }

  // 法線
  const normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  // draw内で後ほどデータを使用するためにVAOの命令を実行
  if (program) {
    gl.enableVertexAttribArray(program.aVertexNormal || 0);
    gl.vertexAttribPointer(
      program.aVertexNormal || 0,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
  }

  // IBOの準備
  indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  if (!program) {
    console.error('WebGLProgram is null.');
    return;
  }
  // シーンのクリア
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const { width, height } = gl.canvas;
  gl.viewport(0, 0, width, height);

  // これらの操作については後の章で説明
  mat4.perspective(projectionMatrix, 45, width / height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -40]);

  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  gl.uniformMatrix4fv(program.uModelViewMatrix || null, false, modelViewMatrix);
  gl.uniformMatrix4fv(
    program.uProjectionMatrix || null,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(program.uNormalMatrix || null, false, normalMatrix);

  try {
    // VAOをバインド
    gl.bindVertexArray(vao);
    // IBOをバインド
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    // シーンを描画
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    // クリア
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  } catch (error) {
    console.error(error);
  }
};

const render = () => {
  requestAnimationFrame(render);
  draw();
};

// アプリケーションのエントリーポイント
const init = () => {
  // 適切な順序で関数を呼び出す
  initProgram();
  initBuffers();
  initLights();
  render();

  // onkeydownイベントでprocessKey関数を呼び出す
  document.onkeydown = processKey;
};

init();
