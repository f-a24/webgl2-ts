import {
  autoResizeCanvas,
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
let indices: number[];
let coneVAO: WebGLVertexArrayObject | null;
let coneIndexBuffer: WebGLBuffer | null;
let vboName: string;
let iboName: string;
let vboSize = 0;
let vboUsage = 0;
let iboSize = 0;
let iboUsage = 0;
let isVerticesVbo = false;
let isConeVertexBufferVbo = false;
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();

interface WebGLProgram {
  aVertexPosition?: number;
  uProjectionMatrix?: WebGLUniformLocation | null;
  uModelViewMatrix?: WebGLUniformLocation | null;
}

/**
 * 適切な頂点シェーダーとフラグメントシェーダーでプログラムを作成
 */
const initProgram = () => {
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
  program.uProjectionMatrix = gl.getUniformLocation(
    program,
    'uProjectionMatrix'
  );
  program.uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
};

/**
 * 正方形のためのバッファを準備
 */
const initBuffers = () => {
  const vertices = [
    1.5, 0, 0, -1.5, 1, 0, -1.5, 0.809017, 0.587785, -1.5, 0.309017, 0.951057,
    -1.5, -0.309017, 0.951057, -1.5, -0.809017, 0.587785, -1.5, -1, 0, -1.5,
    -0.809017, -0.587785, -1.5, -0.309017, -0.951057, -1.5, 0.309017, -0.951057,
    -1.5, 0.809017, -0.587785,
  ];

  indices = [
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7, 0, 7, 8, 0, 8, 9, 0,
    9, 10, 0, 10, 1,
  ];

  // VAOインスタンス作成
  coneVAO = gl.createVertexArray();

  // バインドしてその上で処理
  gl.bindVertexArray(coneVAO);

  // VBOの準備
  const coneVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // draw内で後ほどデータを使用するためにVAOの命令を実行
  if (program) {
    gl.vertexAttribPointer(
      program.aVertexPosition || 0,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(program.aVertexPosition || 0);
  }

  // IBOの準備
  coneIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  // Set the global variables based on the parameter type
  if (coneVertexBuffer === gl.getParameter(gl.ARRAY_BUFFER_BINDING)) {
    vboName = 'coneVertexBuffer';
  }
  if (coneIndexBuffer === gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)) {
    iboName = 'coneIndexBuffer';
  }

  vboSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
  vboUsage = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_USAGE);

  iboSize = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_SIZE);
  iboUsage = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_USAGE);

  try {
    isVerticesVbo = gl.isBuffer(vertices);
  } catch (e) {
    isVerticesVbo = false;
  }

  isConeVertexBufferVbo = gl.isBuffer(coneVertexBuffer);

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
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // We will discuss these operations in later chapters
  mat4.perspective(
    projectionMatrix,
    45,
    gl.canvas.width / gl.canvas.height,
    0.1,
    10000
  );
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5]);

  if (program) {
    gl.uniformMatrix4fv(
      program.uProjectionMatrix || null,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      program.uModelViewMatrix || null,
      false,
      modelViewMatrix
    );
  }

  // VAOをバインド
  gl.bindVertexArray(coneVAO);

  // トライアングルプリミティブを使用してシーンを描画
  gl.drawElements(gl.LINE_LOOP, indices.length, gl.UNSIGNED_SHORT, 0);

  // クリア
  gl.bindVertexArray(null);
};

const render = () => {
  requestAnimationFrame(render);
  draw();
};

const updateInfo = () => {
  document.getElementById('t-vbo-name')!.innerText = vboName;
  document.getElementById('t-ibo-name')!.innerText = iboName;
  document.getElementById('t-vbo-size')!.innerText = `${vboSize}`;
  document.getElementById('t-vbo-usage')!.innerText = `${vboUsage}`;
  document.getElementById('t-ibo-size')!.innerText = `${iboSize}`;
  document.getElementById('t-ibo-usage')!.innerText = `${iboUsage}`;
  document.getElementById('s-is-vertices-vbo')!.innerText = isVerticesVbo
    ? 'Yes'
    : 'No';
  document.getElementById('s-is-cone-vertex-buffer-vbo')!.innerText =
    isConeVertexBufferVbo ? 'Yes' : 'No';
};

// アプリケーションのエントリーポイント
const init = () => {
  // canvasを取得
  const canvas = getCanvas('webgl-canves');
  if (!canvas) return;

  // 自動リサイズ処理
  autoResizeCanvas(canvas);

  // WebGLコンテキストを取得
  const _gl = getGLContext(canvas);
  if (!_gl) return;
  gl = _gl;
  // クリアカラーを黒に設定
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);

  // 適切な順序で関数を呼び出す
  initProgram();
  initBuffers();
  render();

  updateInfo();
};

init();
