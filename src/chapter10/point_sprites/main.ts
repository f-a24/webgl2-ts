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
import GUI from 'lil-gui';
import { Texture } from '../../common/Texture';
import { Floor } from '../../common/Floor';
import { vec3 } from 'gl-matrix';

// パーティクルの型
type Particle = {
  position: vec3;
  velocity: vec3;
  lifespan: number;
  remainingLife: number;
};

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let program: Program;
let scene: Scene;
let clock: Clock;
let camera: Camera;
let transforms: Transforms;
let spriteTexture: Texture;
let particleArray: Float32Array;
let particleBuffer: WebGLBuffer;
let particles: Particle[] = [];
let lastFrameTime = 0;
let particleSize = 14;
let particleLifespan = 3;

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
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clearDepth(100);
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  const attributes = ['aParticle'];

  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uPointSize',
    'uSampler',
  ];

  // アトリビュートとユニフォームをプログラムにロード
  program.load(attributes, uniforms);

  // シーンとクロックを設定
  scene = new Scene(gl, program);
  clock = new Clock();

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 40]);
  camera.setFocus([0, 0, 0]);
  camera.setElevation(-40);
  camera.setAzimuth(-30);

  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  spriteTexture = new Texture(gl);
  spriteTexture.setImage(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/spark.png'
  );

  configureParticles(1024);
};

const resetParticle = (): Particle => {
  const lifespan = Math.random() * particleLifespan;
  return {
    position: [0, 0, 0],
    velocity: [
      Math.random() * 20 - 10,
      Math.random() * 20,
      Math.random() * 20 - 10,
    ],
    lifespan,
    remainingLife: lifespan,
  };
};

const configureParticles = (count: number) => {
  particleArray = new Float32Array(count * 4);

  for (let i = 0; i < count; ++i) {
    const particle = resetParticle();
    particles.push(particle);

    const index = i * 4;
    particleArray[index] = particle.position[0];
    particleArray[index + 1] = particle.position[1];
    particleArray[index + 2] = particle.position[2];
    particleArray[index + 3] = particle.remainingLife / particle.lifespan;
  }

  particleBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleArray, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

const updateParticles = (elapsed: number) => {
  // 配列内のすべてのパーティクルをループ
  particles.forEach((particle, i) => {
    // パーティクルの寿命を追跡
    particle.remainingLife -= elapsed;

    // パーティクルの寿命が尽きたら速度を更新して原点に戻す
    if (particle.remainingLife <= 0) {
      const { position, velocity, lifespan, remainingLife } = resetParticle();
      particle.position = position;
      particle.velocity = velocity;
      particle.lifespan = lifespan;
      particle.remainingLife = remainingLife;
    }

    // パーティクルの位置を更新
    particle.position[0] += particle.velocity[0] * elapsed;
    particle.position[1] += particle.velocity[1] * elapsed;
    particle.position[2] += particle.velocity[2] * elapsed;

    // 速度に重力を適用
    particle.velocity[1] -= 9.8 * elapsed;

    if (particle.position[1] < 0) {
      // パーティクルを床でバウンドさせる
      particle.velocity[1] *= -0.75;
      particle.position[1] = 0;
    }

    // 配列の対応する値を更新
    const index = i * 4;
    particleArray[index] = particle.position[0];
    particleArray[index + 1] = particle.position[1];
    particleArray[index + 2] = particle.position[2];
    particleArray[index + 3] = particle.remainingLife / particle.lifespan;
  });

  // パーティクルをすべてループすると、バッファを更新
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleArray, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

const load = () => {
  scene.add(new Floor(80, 20));
  lastFrameTime = Date.now();
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  transforms.updatePerspective();

  // パーティクルの位置を更新
  const now = Date.now();
  updateParticles((now - lastFrameTime) / 1000.0);
  lastFrameTime = now;

  try {
    transforms.calculateModelView();
    transforms.setMatrixUniforms();

    gl.uniform1f(program.uniforms.uPointSize, particleSize);

    // バインド
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.vertexAttribPointer(
      program.attributes.aParticle,
      4,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(program.attributes.aParticle);

    // テクスチャを有効
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spriteTexture.glTexture);
    gl.uniform1i(program.uniforms.uSampler, 0);

    // 描画
    gl.drawArrays(gl.POINTS, 0, particles.length);

    // クリア
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
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
    .add({ 'Particle Size': particleSize }, 'Particle Size', 5, 50, 0.1)
    .onChange((v: number) => (particleSize = v));
  gui
    .add(
      { 'Particle Life Span': particleLifespan },
      'Particle Life Span',
      1,
      10,
      0.1
    )
    .onChange((v: number) => (particleLifespan = v));
};

init();
