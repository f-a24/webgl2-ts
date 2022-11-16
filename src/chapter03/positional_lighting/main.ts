import {
  autoResizeCanvas,
  calculateNormals,
  getCanvas,
  getGLContext,
  getShader,
  normalizeColor,
  RGBColor,
} from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { mat4 } from 'gl-matrix';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: WebGLProgram | null;
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();
let objects: ObjectType[] = [];
let angle = 0;
let lastTime = 0;
let shininess = 200;
let distance = -100;

const controls = {
  'Translate X': 4.5,
  'Translate Y': 3,
  'Translate Z': 15,
};

type ObjectType = {
  vertices: number[];
  indices: number[];
  ambient: number[];
  diffuse: number[];
  specular: number[];
  alias?: string;
  vao?: WebGLVertexArrayObject | null;
  ibo?: WebGLBuffer | null;
};

interface WebGLProgram {
  aVertexPosition?: number;
  aVertexNormal?: number;
  uProjectionMatrix?: WebGLUniformLocation | null;
  uModelViewMatrix?: WebGLUniformLocation | null;
  uNormalMatrix?: WebGLUniformLocation | null;
  uMaterialAmbient?: WebGLUniformLocation | null;
  uMaterialDiffuse?: WebGLUniformLocation | null;
  uMaterialSpecular?: WebGLUniformLocation | null;
  uShininess?: WebGLUniformLocation | null;
  uLightPosition?: WebGLUniformLocation | null;
  uLightAmbient?: WebGLUniformLocation | null;
  uLightDiffuse?: WebGLUniformLocation | null;
  uLightSpecular?: WebGLUniformLocation | null;
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
  program.uMaterialAmbient = gl.getUniformLocation(program, 'uMaterialAmbient');
  program.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
  program.uMaterialSpecular = gl.getUniformLocation(
    program,
    'uMaterialSpecular'
  );
  program.uShininess = gl.getUniformLocation(program, 'uShininess');
  program.uLightPosition = gl.getUniformLocation(program, 'uLightPosition');
  program.uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
  program.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  program.uLightSpecular = gl.getUniformLocation(program, 'uLightSpecular');
};

const initLights = () => {
  if (program) {
    if (program.uLightPosition)
      gl.uniform3fv(program.uLightPosition, Object.values(controls));
    if (program.uLightAmbient) gl.uniform4f(program.uLightAmbient, 1, 1, 1, 1);
    if (program.uLightDiffuse) gl.uniform4f(program.uLightDiffuse, 1, 1, 1, 1);
    if (program.uLightSpecular)
      gl.uniform4f(program.uLightSpecular, 1, 1, 1, 1);
    if (program.uMaterialAmbient)
      gl.uniform4f(program.uMaterialAmbient, 0.1, 0.1, 0.1, 1);
    if (program.uMaterialDiffuse)
      gl.uniform4f(program.uMaterialDiffuse, 0.5, 0.8, 0.1, 1);
    if (program.uMaterialSpecular)
      gl.uniform4f(program.uMaterialSpecular, 0.6, 0.6, 0.6, 1);
    if (program.uShininess) gl.uniform1f(program.uShininess, shininess);
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
  const { width, height } = gl.canvas;
  gl.viewport(0, 0, width, height);

  mat4.perspective(projectionMatrix, 45, width / height, 0.1, 1000);

  // try/catchを使用して、draw呼び出しからのエラーをキャプチャ
  try {
    objects.forEach(object => {
      if (!program) return;

      // これらの操作については後の章で説明
      mat4.identity(modelViewMatrix);
      mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, distance]);
      mat4.rotate(
        modelViewMatrix,
        modelViewMatrix,
        (30 * Math.PI) / 180,
        [1, 0, 0]
      );
      mat4.rotate(
        modelViewMatrix,
        modelViewMatrix,
        (angle * Math.PI) / 180,
        [0, 1, 0]
      );

      // objectがlightの場合、位置を更新
      if (object.alias === 'light' && program.uLightPosition) {
        const lightPosition = gl.getUniform(program, program.uLightPosition);
        mat4.translate(modelViewMatrix, modelViewMatrix, lightPosition);
      }

      mat4.copy(normalMatrix, modelViewMatrix);
      mat4.invert(normalMatrix, normalMatrix);
      mat4.transpose(normalMatrix, normalMatrix);

      gl.uniformMatrix4fv(
        program.uModelViewMatrix || null,
        false,
        modelViewMatrix
      );
      gl.uniformMatrix4fv(
        program.uProjectionMatrix || null,
        false,
        projectionMatrix
      );
      gl.uniformMatrix4fv(program.uNormalMatrix || null, false, normalMatrix);

      // 照明データをセット
      gl.uniform4fv(program.uMaterialAmbient || null, object.ambient);
      gl.uniform4fv(program.uMaterialDiffuse || null, object.diffuse);
      gl.uniform4fv(program.uMaterialSpecular || null, object.specular);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // シーンを描画
      gl.drawElements(
        gl.TRIANGLES,
        object.indices.length,
        gl.UNSIGNED_SHORT,
        0
      );

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
 * エイリアスを指定して、関連付けられたオブジェクトを返す
 * @param alias エイリアス
 * @returns オブジェクト
 */
const getObject = (alias: string) =>
  objects.find(object => object.alias === alias);

/**
 * 角度を変える簡易アニメーション機能
 */
const animate = () => {
  let timeNow = new Date().getTime();
  if (lastTime) {
    const elapsed = timeNow - lastTime;
    angle += (90 * elapsed) / 1000.0;
  }
  lastTime = timeNow;
};

const render = () => {
  requestAnimationFrame(render);
  draw();
  // すべてのレンダリングサイクルでanimateを呼び出す
  animate();
};

const loadObject = (filePath: string, alias: string) => {
  fetch(filePath)
    .then(res => res.json())
    .then(data => {
      data.alias = alias;

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

      // 法線
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(calculateNormals(data.vertices, data.indices)),
        gl.STATIC_DRAW
      );
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

      // 後で参照するためにobjectsに格納
      objects.push(data);

      // クリア
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
};

/**
 * 個々のオブジェクトをロード
 */
const load = () => {
  const githubPath =
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master';
  loadObject(`${githubPath}/common/models/geometries/plane.json`, 'plane');
  loadObject(`${githubPath}/common/models/geometries/cone2.json`, 'cone');
  loadObject(`${githubPath}/common/models/geometries/sphere1.json`, 'sphere');
  loadObject(`${githubPath}/common/models/geometries/sphere3.json`, 'light');
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
  gui
    .addColor({ 'Sphere Color': [0, 255, 0] }, 'Sphere Color', 255)
    .onChange((v: RGBColor) => {
      const sphere = getObject('sphere');
      if (sphere) sphere.diffuse = [...normalizeColor(v), 1.0];
    });
  gui
    .addColor({ 'Cone  Color': [235, 0, 210] }, 'Cone  Color', 255)
    .onChange((v: RGBColor) => {
      const cone = getObject('cone');
      if (cone) cone.diffuse = [...normalizeColor(v), 1.0];
    });
  gui
    .add({ Shininess: shininess }, 'Shininess', 1, 50)
    .step(0.1)
    .onChange(
      (v: number) => program?.uShininess && gl.uniform1f(program?.uShininess, v)
    );
  Object.keys(controls).forEach(key => {
    gui
      .add(controls, key, -50, 50)
      .step(-0.1)
      .onChange(() => {
        if (program) {
          gl.uniform3fv(program.uLightPosition || null, [
            controls['Translate X'],
            controls['Translate Y'],
            controls['Translate Z'],
          ]);
        }
      });
  });
  gui
    .add({ Distance: distance }, 'Distance', -200, -50)
    .step(0.1)
    .onChange((v: number) => (distance = v));
};

init();
