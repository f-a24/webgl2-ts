import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './shaders/vert.glsl';
import fragment from './shaders/frag.glsl';
import commonVs from './shaders/common-vs.glsl';
import normal from './shaders/normal.glsl';
import greyscale from './shaders/greyscale.glsl';
import invert from './shaders/invert.glsl';
import wavy from './shaders/wavy.glsl';
import blur from './shaders/blur.glsl';
import filmgrain from './shaders/filmgrain.glsl';
import './style.css';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Clock } from '../../common/Clock';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { mat4 } from 'gl-matrix';
import GUI from 'lil-gui';
import { PostProcess } from '../../common/PostProcess';
import { Texture } from '../../common/Texture';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: Program;
let scene: Scene;
let clock: Clock;
let camera: Camera;
let transforms: Transforms;
let post: PostProcess;
let noiseTexture: Texture;

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
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor',
    'aVertexTextureCoords',
  ];

  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uAlpha',
    'uUseVertexColor',
    'uOffscreen',
    'uSampler',
  ];

  // アトリビュートとユニフォームをプログラムにロード
  program.load(attributes, uniforms);

  // シーンとクロックを設定
  scene = new Scene(gl, program);
  clock = new Clock();

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 25]);
  camera.setFocus([0, 0, 0]);
  camera.setElevation(-40);
  camera.setAzimuth(-30);

  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uAlpha, 1);

  post = new PostProcess(canvas, gl, commonVs, normal);

  noiseTexture = new Texture(gl);
  noiseTexture.setImage(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/noise.png'
  );
};

const load = () => {
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cube-texture.json',
    'cube',
    {
      position: [0, 0, 0],
      scale: [6, 6, 6],
    }
  );
};

const render = () => {
  // キャンバスに合わせてフレームバッファのサイズを変更する必要があるかどうかを確認
  post.validateSize();

  // シーンをフレームバッファに描画
  gl.bindFramebuffer(gl.FRAMEBUFFER, post.framebuffer);
  draw();

  // レンダリングのポストプロセスエフェクトを設定
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  post.bind();

  // 追加のポストプロセスシェーダーユニフォームの設定
  if (post.uniforms.uNoiseSampler) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture.glTexture);
    gl.uniform1i(post.uniforms.uNoiseSampler, 1);
  }

  // ポストプロセスエフェクトを使用してフレームバッファからシーンを再描画
  post.draw();
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    program.useProgram();
    const offscreen = program.getUniform(program.uniforms.uOffscreen);

    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      // 変換を適用
      transforms.calculateModelView();
      transforms.push();

      if (object.position)
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          object.position
        );
      if (object.scale)
        mat4.scale(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          object.scale
        );

      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse && object.diffuse[3] < 1 && !offscreen) {
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
      } else {
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
      }

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniforms.uUseVertexColor, 0);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // テクスチャを有効化
      if (object.textureCoords && object.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, object.texture.glTexture);
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
  clock.on('tick', render);

  initControls();
};

const initControls = () => {
  const options = [
    'Normal',
    'Greyscale',
    'Invert',
    'Wavy',
    'Blur',
    'Film Grain',
  ] as const;
  const gui = new GUI();
  gui
    .add({ Filters: options[0] }, 'Filters', options)
    .onChange((v: (typeof options)[number]) => {
      switch (v) {
        case 'Normal':
          post.configureShader(commonVs, normal);
          break;
        case 'Greyscale':
          post.configureShader(commonVs, greyscale);
          break;
        case 'Invert':
          post.configureShader(commonVs, invert);
          break;
        case 'Wavy':
          post.configureShader(commonVs, wavy);
          break;
        case 'Blur':
          post.configureShader(commonVs, blur);
          break;
        case 'Film Grain':
          post.configureShader(commonVs, filmgrain);
          break;
        default:
          break;
      }
    });
};

init();
