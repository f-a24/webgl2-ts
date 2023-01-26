import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { GUI } from 'lil-gui';
import { mat4, vec3 } from 'gl-matrix';
import { Program } from '../../common/Program';
import { Scene } from '../../common/Scene';
import { Floor } from '../../common/Floor';
import { Camera, cameraTypes } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Axis } from '../../common/Axis';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let fixedLight = false;
let sceneTime = 0;
let position: vec3[] = [];
let incrementSteps = 1000;
const ballColor = [1, 1, 0, 1];
const flagStartColor = [0, 1, 0, 1];
const flagEndColor = [0, 0, 1, 1];
const flagColor = [0.5, 0.5, 0.5, 1];
const flagColorHighlight = [1, 0, 0, 1];
const zDimension = 150;
const linearInterpolation = 'Linear Interpolation';
const polynomialInterpolation = 'Polynomial Interpolation';
const bSplineInterpolation = 'B-Spline Interpolation';
let interpolationType = linearInterpolation;
let controlPoints: vec3[] = [
  [-25, 0, 20],
  [-40, 0, -10],
  [0, 0, 10],
  [25, 0, -5],
  [40, 0, -20],
];

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
  gl.depthFunc(gl.LEQUAL);

  // プログラムを作成
  program = new Program(gl, vertex.trim(), fragment.trim());

  // プログラムに読み込むユニフォーム
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uMaterialSpecular',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightSpecular',
    'uLightPosition',
    'uShininess',
    'uUpdateLight',
    'uWireframe',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  scene = new Scene(gl, program);

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 2, 80]);
  camera.setElevation(-20);
  new Controls(camera, canvas);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniforms.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniforms.uShininess, 230);

  doLinearInterpolation();
};

/**
 * オブジェクトをシーンにロード
 */
const load = () => {
  scene.add(new Floor(zDimension, 2));
  scene.add(new Axis(zDimension));
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/ball.json',
    'ball',
    { diffuse: ballColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/flag.json',
    'flagStart',
    { diffuse: flagStartColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/flag.json',
    'flagEnd',
    { diffuse: flagEndColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/flag.json',
    'flag1',
    { diffuse: flagColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/flag.json',
    'flag2',
    { diffuse: flagColor }
  );
  scene.load(
    'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/flag.json',
    'flag3',
    { diffuse: flagColor }
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
    gl.uniform1i(program.uniforms.uUpdateLight, fixedLight ? 1 : 0);

    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();

      const { alias } = object;
      if (alias === 'ball' && position[sceneTime]) {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          position[sceneTime]
        );
      } else if (alias === 'flagStart') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          controlPoints[0]
        );
      } else if (alias === 'flagEnd') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          controlPoints[4]
        );
      } else if (alias === 'flag1') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(
            transforms.modelViewMatrix,
            transforms.modelViewMatrix,
            controlPoints[1]
          );
          object.diffuse = close(controlPoints[1], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        } else {
          transforms.pop();
          return;
        }
      } else if (alias === 'flag2') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(
            transforms.modelViewMatrix,
            transforms.modelViewMatrix,
            controlPoints[2]
          );
          object.diffuse = close(controlPoints[2], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        } else {
          transforms.pop();
          return;
        }
      } else if (alias === 'flag3') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(
            transforms.modelViewMatrix,
            transforms.modelViewMatrix,
            controlPoints[3]
          );
          object.diffuse = close(controlPoints[3], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        } else {
          transforms.pop();
          return;
        }
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      // uniforms設定
      if (object.diffuse)
        gl.uniform4fv(program.uniforms.uMaterialDiffuse, object.diffuse);
      if (object.specular)
        gl.uniform4fv(program.uniforms.uMaterialSpecular, object.specular);
      if (object.ambient)
        gl.uniform4fv(program.uniforms.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniforms.uWireframe, object.wireframe ? 1 : 0);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // 描画
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawElements(
          gl.TRIANGLES,
          object.indices.length,
          gl.UNSIGNED_SHORT,
          0
        );
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

const animate = () => {
  sceneTime += 1;
  if (sceneTime === incrementSteps) sceneTime = 0;
  draw();
};

const resetAnimation = () => {
  sceneTime = 0;
  position.length = 0;
};

const render = () => {
  setInterval(animate, 30 / 1000);
};

/**
 * アプリケーションのエントリーポイント
 */
const init = () => {
  configure();
  load();
  render();

  initControls();
};

const initControls = () => {
  const gui = new GUI();
  gui
    .add({ 'Camera Type': cameraTypes[0] }, 'Camera Type', cameraTypes)
    .onChange((v: (typeof cameraTypes)[number]) => {
      camera.goHome();
      camera.setType(v);
    });

  const pointsGUI = gui.addFolder('Points');
  [0, 1, 2, 3, 4].forEach(i => {
    pointsGUI
      .add(
        { [`Point ${i + 1}`]: controlPoints[i][0] },
        `Point ${i + 1}`,
        -70,
        70
      )
      .step(1)
      .onChange((v: number) => {
        controlPoints[i][0] = v;
        interpolate();
      });
  });
  gui
    .add({ Interpolation: interpolationType }, 'Interpolation', [
      linearInterpolation,
      polynomialInterpolation,
      bSplineInterpolation,
    ])
    .onChange((v: string) => {
      resetAnimation();
      interpolationType = v;
      if (interpolationType === linearInterpolation) {
        controlPoints = [
          [-25, 0, 20],
          [-40, 0, -10],
          [0, 0, 10],
          [25, 0, -5],
          [40, 0, -20],
        ];
        incrementSteps = 1000;
      } else if (interpolationType === polynomialInterpolation) {
        controlPoints = [
          [21, 0, 23],
          [-3, 0, -10],
          [-21, 0, -53],
          [50, 0, -31],
          [-24, 0, 2],
        ];
        incrementSteps = 1355;
      } else if (interpolationType === bSplineInterpolation) {
        controlPoints = [
          [-21, 0, 23],
          [32, 0, -10],
          [0, 0, -53],
          [-32, 0, -10],
          [21, 0, 23],
        ];
        incrementSteps = 1000;
      }
      interpolate();
    });
  gui
    .add(
      { 'Interpolation Steps': incrementSteps },
      'Interpolation Steps',
      10,
      1500
    )
    .step(1)
    .onChange((v: number) => {
      incrementSteps = v;
      interpolate();
    });
  gui
    .add({ 'Static Light Position': fixedLight }, 'Static Light Position')
    .onChange((v: boolean) => (fixedLight = v));
  gui.add({ 'Go Home': camera.goHome }, 'Go Home');
};

const close = (c1: vec3, c0: vec3, r: number) =>
  Math.sqrt(
    (c1[0] - c0[0]) * (c1[0] - c0[0]) +
      (c1[1] - c0[1]) * (c1[1] - c0[1]) +
      (c1[2] - c0[2]) * (c1[2] - c0[2])
  ) <= r;

const doLinearInterpolation = () => {
  position = [];
  const [X0, Y0, Z0] = controlPoints[0];
  const [X1, Y1, Z1] = controlPoints[controlPoints.length - 1];

  for (let i = 0; i < incrementSteps; i++) {
    const s = i / incrementSteps;
    position.push([
      X0 * (1 - s) + X1 * s,
      Y0 * (1 - s) + Y1 * s,
      Z0 * (1 - s) + Z1 * s,
    ]);
  }
};

const doLagrangeInterpolation = () => {
  position = [];

  const N = controlPoints.length;
  const dT = incrementSteps / (N - 1);
  const D: number[] = [];

  for (let i = 0; i < N; i++) {
    D[i] = 1;
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      D[i] *= dT * (i - j);
    }
  }

  const Lk = (x: number, axis: number) => {
    const R: number[] = [];
    let S = 0;
    for (let i = 0; i < N; i++) {
      R[i] = 1;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        R[i] *= x - j * dT;
      }
      R[i] /= D[i];
      S += R[i] * controlPoints[i][axis];
    }
    return S;
  };

  for (let k = 0; k < incrementSteps; k++) {
    position.push([Lk(k, 0), Lk(k, 1), Lk(k, 2)]);
  }
};

// Creating the knot vector (clamped):
// http://web.mit.edu/hyperbook/Patrikalakis-Maekawa-Cho/node17.html
const doBSplineInterpolation = () => {
  position = [];
  const N = controlPoints.length - 1;
  const P = 3;
  const U: number[] = [];
  const M = N + P + 1;
  const deltaKnot = 1 / (M - 2 * P);

  for (let i = 0; i <= P; i++) {
    U.push(0);
  }

  let v = deltaKnot;
  for (let i = P + 1; i < M - P + 1; i++) {
    U.push(v);
    v += deltaKnot;
  }

  for (let i = M - P + 1; i <= M; i++) {
    U.push(1);
  }

  const No = (u: number, i: number) => (U[i] <= u && u < U[i + 1] ? 1 : 0);

  const Np = (u: number, i: number, p: number) => {
    let A = 0,
      B = 0;

    if (p - 1 === 0) {
      A = No(u, i);
      B = No(u, i + 1);
    } else {
      A = Np(u, i, p - 1);
      B = Np(u, i + 1, p - 1);
    }

    let coefficientA = 0,
      coefficientB = 0;
    if (U[i + p] - U[i] !== 0) {
      coefficientA = (u - U[i]) / (U[i + p] - U[i]);
    }
    if (U[i + p + 1] - U[i + 1] !== 0) {
      coefficientB = (U[i + p + 1] - u) / (U[i + p + 1] - U[i + 1]);
    }

    return coefficientA * A + coefficientB * B;
  };

  const C = (t: number) => {
    const result: vec3 = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let i = 0; i <= N; i++) {
        sum += controlPoints[i][j] * Np(t, i, P);
      }
      result[j] = sum;
    }
    return result;
  };

  const dT = 1 / incrementSteps;
  let t = 0;
  do {
    position.push(C(t));
    t += dT;
  } while (t < 1.0);

  position.push(C(1.0));
};

const interpolate = () => {
  const interpolate = {
    [linearInterpolation]: doLinearInterpolation,
    [polynomialInterpolation]: doLagrangeInterpolation,
    [bSplineInterpolation]: doBSplineInterpolation,
  }[interpolationType];
  interpolate && interpolate();
};

init();
