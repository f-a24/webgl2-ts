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
import { PostProcess } from '../../common/PostProcess';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let clock: Clock;
let post: PostProcess;

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
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // プログラムを作成
  const program = new Program(gl, vertex.trim(), fragment.trim());

  // シーンとクロックを設定
  new Scene(gl, program);
  clock = new Clock();

  // カメラとコントロールを設定
  const camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 40]);
  camera.setFocus([0, 0, 0]);
  camera.setElevation(-40);
  camera.setAzimuth(-30);

  new Controls(camera, canvas);

  // トランスフォームを設定
  new Transforms(gl, program, camera, canvas);

  post = new PostProcess(canvas, gl, vertex.trim(), fragment.trim());
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // canvasにマッチさせるためにフレームバッファをリサイズする必要があるかどうかを確認
  post.validateSize();
  post.bind();

  // フルスクリーンquadに描画
  post.draw();
};

/**
 * アプリケーションのエントリーポイント
 */
const init = () => {
  configure();
  clock.on('tick', draw);
};

init();
