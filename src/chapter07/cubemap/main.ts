import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Clock } from '../../common/Clock';
import { Texture } from '../../common/Texture';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let texture: Texture;
let cubeTexture: WebGLTexture;

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
    'uCubeSampler',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexTextureCoords'];

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

  texture = new Texture(gl);
  texture.setImage(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/webgl.png'
  );

  // キューブテクスチャを作成
  cubeTexture = gl.createTexture()!;

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/positive-x.png'
  );
  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/negative-x.png'
  );
  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/positive-y.png'
  );
  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/negative-y.png'
  );
  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/positive-z.png'
  );
  loadCubemapFace(
    gl,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    cubeTexture,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/cubemap/negative-z.png'
  );
};

/**
 * キューブマップの面を読み込み
 * @param gl WebGLコンテキスト
 * @param target 対象の面
 * @param texture テクスチャ
 * @param url 画像URL
 */
const loadCubemapFace = (
  gl: WebGL2RenderingContext,
  target: number,
  texture: WebGLTexture,
  url: string
) => {
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  image.src = url;
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
        gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
        gl.uniform1i(program.uniforms.uSampler, 0);
      }

      // キューブマップをアクティブにする
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
      gl.uniform1i(program.uniforms.uCubeSampler, 1);

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
};

init();
