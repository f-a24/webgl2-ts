import {
  autoResizeCanvas,
  calculateNormals,
  denormalizeColor,
  getCanvas,
  getGLContext,
  normalizeColor,
  RGBColor,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'dat.gui';
import { mat4 } from 'gl-matrix';
import { Program } from '../../common/Program';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: Program;
let angle = 0;
let lastTime = 0;
let distance = -120;

const clearColor: RGBColor = [0.9, 0.9, 0.9];
const modelViewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const normalMatrix = mat4.create();
const parts: Parts[] = [];
const shininess = 24;
const lightPosition = [100, 400, 100];
const controls = {
  'Translate X': 100,
  'Translate Y': 400,
  'Translate Z': 100,
};

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
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal'];

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uLightAmbient',
    'uLightPosition',
    'uMaterialSpecular',
    'uMaterialDiffuse',
    'uShininess',
  ];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);
};

const initLights = () => {
  gl.uniform3fv(program.uniforms.uLightPosition, lightPosition);
  gl.uniform3f(program.uniforms.uLightAmbient, 0.1, 0.1, 0.1);
  gl.uniform3f(program.uniforms.uMaterialSpecular, 0.5, 0.5, 0.5);
  gl.uniform3f(program.uniforms.uMaterialDiffuse, 0.8, 0.8, 0.8);
  gl.uniform1f(program.uniforms.uShininess, shininess);
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // これらの操作については後の章で説明
  mat4.perspective(
    projectionMatrix,
    45,
    gl.canvas.width / gl.canvas.height,
    1,
    10000
  );
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, distance]);
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    (20 * Math.PI) / 180,
    [1, 0, 0]
  );
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    (angle * Math.PI) / 180,
    [0, 1, 0]
  );

  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

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
  gl.uniformMatrix4fv(program.uniforms.uNormalMatrix, false, normalMatrix);

  // partsを反復して描画する
  parts.forEach(part => {
    // VAOをバインド
    if (part.vao) gl.bindVertexArray(part.vao);
    // IBOをバインド
    if (part.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ibo);

    // 描画
    gl.drawElements(gl.TRIANGLES, part.indices.length, gl.UNSIGNED_SHORT, 0);
  });

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

/**
 * 角度を変える簡易アニメーション機能
 */
const animate = () => {
  let timeNow = new Date().getTime();
  if (lastTime) {
    const elapsed = timeNow - lastTime;
    angle += (90 * elapsed) / 10000;
  }
  lastTime = timeNow;
};

const render = () => {
  requestAnimationFrame(render);
  draw();
  // すべてのレンダリングサイクルでanimateを呼び出す
  animate();
};

const load = () => {
  for (let i = 1; i < 179; i++) {
    fetch(
      `https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/nissan-gtr/part${i}.json`
    )
      .then(res => res.json())
      .then(part => {
        // VAOインスタンス作成
        const vao = gl.createVertexArray();
        // バインドしてその上で処理
        gl.bindVertexArray(vao);

        // VBOの準備
        const vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(part.vertices),
          gl.STATIC_DRAW
        );
        // draw内で後ほどデータを使用するためにVAOの命令を実行
        gl.enableVertexAttribArray(program.attributes.aVertexPosition);
        gl.vertexAttribPointer(
          program.attributes.aVertexPosition,
          3,
          gl.FLOAT,
          false,
          0,
          0
        );

        // 法線
        const normalBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(calculateNormals(part.vertices, part.indices)),
          gl.STATIC_DRAW
        );
        // draw内で後ほどデータを使用するためにVAOの命令を実行
        gl.enableVertexAttribArray(program.attributes.aVertexNormal);
        gl.vertexAttribPointer(
          program.attributes.aVertexNormal,
          3,
          gl.FLOAT,
          false,
          0,
          0
        );

        // IBOの準備
        const indexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
        gl.bufferData(
          gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(part.indices),
          gl.STATIC_DRAW
        );

        // 後でアクセスできるようにアタッチしておく
        part.vao = vao;
        part.ibo = indexBufferObject;

        // 後で参照するためにparts配列に格納
        parts.push(part);

        // クリア
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      });
  }
};

// アプリケーションのエントリーポイント
const init = () => {
  // 適切な順序で関数を呼び出す
  initProgram();
  initLights();
  load();
  render();

  initControls();
};

const initControls = () => {
  const gui = new GUI();
  gui.addColor({ 'Car Color': [255, 255, 255] }, 'Car Color').onChange(v => {
    const [r, g, b] = normalizeColor(v);
    gl.uniform3f(program.uniforms.uMaterialDiffuse, r, g, b);
  });
  gui
    .addColor({ Background: denormalizeColor(clearColor) }, 'Background')
    .onChange(v => {
      const [r, g, b] = normalizeColor(v);
      gl.clearColor(r, g, b, 1);
    });
  gui
    .add({ Shininess: shininess }, 'Shininess', 1, 50)
    .step(0.1)
    .onChange(v => gl.uniform1f(program.uniforms.uShininess, v));
  gui
    .add({ Distance: distance }, 'Distance', -600, -80)
    .step(1)
    .onChange(v => (distance = v));
  Object.keys(controls).forEach(key => {
    gui
      .add(controls, key, -1000, 1000)
      .step(-0.1)
      .onChange(() => {
        gl.uniform3fv(program.uniforms.uLightPosition, [
          controls['Translate X'],
          controls['Translate Y'],
          controls['Translate Z'],
        ]);
      });
  });
};

init();
