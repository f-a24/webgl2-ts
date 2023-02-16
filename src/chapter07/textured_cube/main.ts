import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Clock } from '../../common/Clock';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let texture: WebGLTexture;
let useVertexColors = false;

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
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

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
    'uLightPosition',
    'uWireframe',
    'uAlpha',
    'uUseVertexColor',
    'uUseLambert',
    'uSampler',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor',
    'aVertexTextureCoords',
  ];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 4]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(45);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uAlpha, 1.0);
  gl.uniform1i(program.uniforms.uUseVertexColor, Number(useVertexColors));
  gl.uniform1i(program.uniforms.uUseLambert, 1);

  texture = gl.createTexture()!;
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  image.src =
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/webgl.png';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cube-texture.json'
  );
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
      if (object.hidden) return;

      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniforms.uWireframe, Number(object.wireframe));
      gl.uniform1i(program.uniforms.uUseVertexColor, Number(useVertexColors));

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // テクスチャをアクティブにする
      if (object.textureCoords) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms.uSampler, 0);
      }

      // 描画
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.drawElements(
          gl.TRIANGLES,
          object.indices.length,
          gl.UNSIGNED_SHORT,
          0
        );
        gl.cullFace(gl.BACK);
        gl.drawElements(
          gl.TRIANGLES,
          object.indices.length,
          gl.UNSIGNED_SHORT,
          0
        );
        gl.disable(gl.CULL_FACE);
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
    .add({ 'Use Lambert Term': true }, 'Use Lambert Term')
    .onChange((v: boolean) =>
      gl.uniform1i(program.uniforms.uUseLambert, Number(v))
    );
  gui
    .add({ 'Use Per Vertex': useVertexColors }, 'Use Per Vertex')
    .onChange((v: boolean) => (useVertexColors = v));
  gui
    .add({ 'Alpha Value': 1 }, 'Alpha Value', 0, 1)
    .step(0.1)
    .onChange((v: number) => gl.uniform1f(program.uniforms.uAlpha, v));
};

init();
