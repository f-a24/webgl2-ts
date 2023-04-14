import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Clock } from '../../common/Clock';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Texture } from '../../common/Texture';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: Program;
let scene: Scene;
let clock: Clock;
let camera: Camera;
let transforms: Transforms;
let texture: Texture;
let texture2: Texture;

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

  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexTangent',
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
    'uSampler',
    'uNormalSampler',
  ];

  // アトリビュートとユニフォームをプログラムにロード
  program.load(attributes, uniforms);

  // シーンとクロックを設定
  scene = new Scene(gl, program);
  clock = new Clock();

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 2]);
  camera.setFocus([0, 0, 0]);
  camera.setElevation(-30);
  camera.setAzimuth(40);

  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);

  // テクスチャを作成
  texture = new Texture(
    gl,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/fieldstone.jpg'
  );
  texture2 = new Texture(
    gl,
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/fieldstone-normal.jpg'
  );
};

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
    scene.traverse(object => {
      if (object.hidden) return;

      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // テクスチャを有効化
      if (object.textureCoords) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
        gl.uniform1i(program.uniforms.uSampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture2.glTexture);
        gl.uniform1i(program.uniforms.uNormalSampler, 1);
      }

      // 描画
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
