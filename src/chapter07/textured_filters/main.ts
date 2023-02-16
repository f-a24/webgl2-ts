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
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uSampler',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexTextureCoords'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 0]);
  camera.dolly(-4);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(45);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  texture = gl.createTexture()!;
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  image.src =
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/webgl.gif';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
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
    .add({ Distance: 0 }, 'Distance', 0, 20)
    .step(0.1)
    .onChange((v: number) => {
      camera.dolly(-v);
      camera.update();
    });
  const magFilterOptions = ['NEAREST', 'LINEAR'] as const;
  gui
    .add({ 'Mag Filter': 'NEAREST' }, 'Mag Filter', magFilterOptions)
    .onChange((v: (typeof magFilterOptions)[number]) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[v]);
      gl.bindTexture(gl.TEXTURE_2D, null);
    });
  const minFilterOptions = [
    'NEAREST',
    'LINEAR',
    'NEAREST_MIPMAP_NEAREST',
    'LINEAR_MIPMAP_NEAREST',
    'NEAREST_MIPMAP_LINEAR',
    'LINEAR_MIPMAP_LINEAR',
  ] as const;
  gui
    .add({ 'Min Filter': 'NEAREST' }, 'Min Filter', minFilterOptions)
    .onChange((v: (typeof minFilterOptions)[number]) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[v]);
      gl.bindTexture(gl.TEXTURE_2D, null);
    });
};

init();
