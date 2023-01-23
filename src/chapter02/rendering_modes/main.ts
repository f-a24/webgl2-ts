import {
  autoResizeCanvas,
  getCanvas,
  getGLContext,
  getShader,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: WebGLProgram | null;
let trapezoidVAO: WebGLVertexArrayObject | null;
let trapezoidIndexBuffer: WebGLBuffer | null;
let indices: number[];
const renderingModes = [
  'TRIANGLES',
  'LINES',
  'POINTS',
  'LINE_LOOP',
  'LINE_STRIP',
  'TRIANGLE_STRIP',
  'TRIANGLE_FAN',
] as const;
const controls: {
  'Rendering Mode': (typeof renderingModes)[number];
} = {
  'Rendering Mode': 'TRIANGLES',
};

interface WebGLProgram {
  aVertexPosition?: number;
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
};

/**
 * バッファを準備
 */
const initBuffers = () => {
  const vertices = [
    -0.5, -0.5, 0, -0.25, 0.5, 0, 0.0, -0.5, 0, 0.25, 0.5, 0, 0.5, -0.5, 0,
  ];

  indices = [0, 1, 2, 0, 2, 3, 2, 3, 4];

  // VAOインスタンス作成
  trapezoidVAO = gl.createVertexArray();

  // バインドしてその上で処理
  gl.bindVertexArray(trapezoidVAO);

  // VBOの準備
  const trapezoidVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, trapezoidVertexBuffer);
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
  trapezoidIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trapezoidIndexBuffer);
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
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // VAOをバインド
  gl.bindVertexArray(trapezoidVAO);

  // Depending on the rendering mode type, we will draw differently
  switch (controls['Rendering Mode']) {
    case 'TRIANGLES': {
      indices = [0, 1, 2, 2, 3, 4];
      break;
    }
    case 'LINES': {
      indices = [1, 3, 0, 4, 1, 2, 2, 3];
      break;
    }
    case 'POINTS': {
      indices = [1, 2, 3];
      break;
    }
    case 'LINE_LOOP':
    case 'LINE_STRIP': {
      indices = [2, 3, 4, 1, 0];
      break;
    }
    case 'TRIANGLE_STRIP':
    case 'TRIANGLE_FAN': {
      indices = [0, 1, 2, 3, 4];
      break;
    }
  }
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  gl.drawElements(
    gl[controls['Rendering Mode']],
    indices.length,
    gl.UNSIGNED_SHORT,
    0
  );

  // クリア
  gl.bindVertexArray(null);
};

const render = () => {
  requestAnimationFrame(render);
  draw();
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

  initControls();
};

const initControls = () => {
  const gui = new GUI();
  gui.add(controls, 'Rendering Mode', renderingModes);
};

init();
