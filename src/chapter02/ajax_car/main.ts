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
let parts: Parts[] = [];
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();

interface WebGLProgram {
  aVertexPosition?: number;
  uProjectionMatrix?: WebGLUniformLocation | null;
  uModelViewMatrix?: WebGLUniformLocation | null;
}

type Parts = {
  alias: string;
  vertices: number[];
  indices: number[];
  Ni: number;
  Ka: number[];
  d: number;
  Kd: number[];
  illum: number;
  Ks: number[];
  Ns: number;
  vao?: WebGLVertexArrayObject | null;
  ibo?: WebGLBuffer | null;
};

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

const load = () => {
  for (let i = 1; i < 179; i++) {
    fetch(
      `https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/nissan-gtr/part${i}.json`
    )
      .then(res => res.json())
      .then((data: Parts) => {
        // VAOインスタンス作成
        const vao = gl.createVertexArray();

        // バインドしてその上で処理
        gl.bindVertexArray(vao);

        // VBOの準備
        const vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(data.vertices),
          gl.STATIC_DRAW
        );

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
        const indexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
        gl.bufferData(
          gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(data.indices),
          gl.STATIC_DRAW
        );

        // 後でアクセスできるようにアタッチしておく
        data.vao = vao;
        data.ibo = indexBufferObject;

        // parts配列に格納
        parts.push(data);

        // クリア
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      })
      .catch(console.error);
  }
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

  // これらの操作については後の章で説明
  mat4.perspective(
    projectionMatrix,
    45,
    gl.canvas.width / gl.canvas.height,
    10,
    10000
  );
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [-10, 0, -100]);
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    (30 * Math.PI) / 180,
    [1, 0, 0]
  );
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    (30 * Math.PI) / 180,
    [0, 1, 0]
  );

  gl.uniformMatrix4fv(
    program.uProjectionMatrix || null,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(program.uModelViewMatrix || null, false, modelViewMatrix);

  // parts配列で反復処理
  parts.forEach(part => {
    // VAOをバインド
    if (part.vao) gl.bindVertexArray(part.vao);
    // IBOをバインド
    if (part.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ibo);

    // シーンを描画
    gl.drawElements(gl.LINES, part.indices.length, gl.UNSIGNED_SHORT, 0);

    // クリア
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  });
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
  load();
  render();
};

init();
