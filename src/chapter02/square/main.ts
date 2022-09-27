import {
  autoResizeCanvas,
  getCanvas,
  getGLContext,
  getShader,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: WebGLProgram | null;
let squareVAO: WebGLVertexArrayObject | null;
let squareIndexBuffer: WebGLBuffer | null;
let indices: number[];

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
 * 正方形のためのバッファを準備
 */
const initBuffers = () => {
  /*
    V0                    V3
    (-0.5, 0.5, 0)        (0.5, 0.5, 0)
    X---------------------X
    |                     |
    |                     |
    |       (0, 0)        |
    |                     |
    |                     |
    X---------------------X
    V1                    V2
    (-0.5, -0.5, 0)       (0.5, -0.5, 0)
  */
  const vertices = [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0];

  // 反時計回りで定義されたインデックス
  indices = [0, 1, 2, 0, 2, 3];

  // VAOインスタンス作成
  squareVAO = gl.createVertexArray();

  // バインドしてその上で処理
  gl.bindVertexArray(squareVAO);

  // VBOの準備
  const squareVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexBuffer);
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

  // IBOの準備
  squareIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer);
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
  gl.bindVertexArray(squareVAO);

  // IBOをバインド
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer);

  // トライアングルプリミティブを使用してシーンを描画
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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

  // 適切な順序で関数を呼び出す
  initProgram();
  initBuffers();
  draw();
};

init();
