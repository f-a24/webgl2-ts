import { autoResizeCanvas, getCanvas, getGLContext } from '../../common/utils';
import vertex from './vert.glsl';
import fragment from './frag.glsl';
import './style.css';
import { Program } from '../../common/Program';
import { Object, Scene } from '../../common/Scene';
import { Camera } from '../../common/Camera';
import { Transforms } from '../../common/Transforms';
import { Controls } from '../../common/Controls';
import { Clock } from '../../common/Clock';
import { Picker } from '../../common/Picker';
import { Floor } from '../../common/Floor';
import { mat4, vec3 } from 'gl-matrix';
import GUI from 'lil-gui';

// アプリケーション全体を通じて利用されるグローバル変数
let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let controls: Controls;
let picker: Picker;
let transforms: Transforms;
let clock: Clock;
let showPickingImage = false;

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
    'uOffscreen',
    'uPickingColor',
  ];

  // プログラムに読み込むアトリビュート
  const attributes = ['aVertexPosition', 'aVertexNormal', 'aVertexColor'];

  // アトリビュートとユニフォームを読み込む
  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  // ピッカー作成
  picker = new Picker(canvas, gl, scene, {
    hitPropertyCallback: hitProperty,
    addHitCallback: addHit,
    moveCallback: movePickedObjects,
    processHitsCallback: processHits,
    removeHitCallback: removeHit,
  });

  // カメラとコントロールを設定
  camera = new Camera('ORBITING_TYPE');
  camera.goHome([0, 0, 192]);
  camera.setFocus([0, 0, 0]);
  camera.setElevation(-22);
  camera.setAzimuth(37);
  controls = new Controls(camera, canvas);
  // ピッカーを設定
  controls.setPicker(picker);

  // トランスフォームを設定
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniforms.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniforms.uLightAmbient, [0, 0, 0, 1]);
  gl.uniform4fv(program.uniforms.uLightDiffuse, [1, 1, 1, 1]);
};

const positionGenerator = () => {
  const flagX = Math.floor(Math.random() * 10);
  const flagZ = Math.floor(Math.random() * 10);

  let x = Math.floor(Math.random() * 60);
  let z = Math.floor(Math.random() * 60);

  if (flagX >= 5) x = -x;
  if (flagZ >= 5) z = -z;

  return [x, 0, z];
};

const colorset: { [key: string]: boolean } = {};

const objectLabelGenerator = (): number[] => {
  const color = [Math.random(), Math.random(), Math.random(), 1];
  const key = color.toString();

  if (key in colorset) return objectLabelGenerator();

  colorset[key] = true;
  return color;
};

const diffuseColorGenerator = (index: number) => {
  const color = (index % 30) / 60 + 0.2;
  return [color, color, color, 1];
};

const scaleGenerator = () => {
  const scale = Math.random() + 0.3;
  return [scale, scale, scale];
};

const load = () => {
  scene.add(new Floor(80, 20));

  for (let i = 0; i < 100; i++) {
    const objectType = Math.floor(Math.random() * 2);

    const options = {
      position: positionGenerator(),
      scale: scaleGenerator(),
      diffuse: diffuseColorGenerator(i),
      pickingColor: objectLabelGenerator(),
    };

    switch (objectType) {
      case 1:
        scene.load(
          'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/sphere1.json',
          `ball_${i}`,
          options
        );
        break;
      case 0:
        scene.load(
          'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/models/geometries/cylinder.json',
          `cylinder_${i}`,
          options
        );
        break;
      default:
        break;
    }
  }
};

const hitProperty = (obj: Object) => obj.pickingColor;

const addHit = (obj: Object) => {
  obj.previous = obj.diffuse!.slice(0);
  obj.diffuse = obj.pickingColor;
};

const removeHit = (obj: Object) => {
  obj.diffuse = obj.previous!.slice(0);
};

const processHits = (hits: Object[]) => {
  hits.forEach(hit => (hit.diffuse = hit.previous));
};

const movePickedObjects = (dx: number, dy: number) => {
  const hits = picker.getHits();
  if (!hits) return;

  const factor =
    Math.max(
      Math.max(camera.position[0], camera.position[1]),
      camera.position[2]
    ) / 2000;
  hits.forEach(hit => {
    const scaleX = vec3.create();
    const scaleY = vec3.create();

    if (controls.alt) {
      vec3.scale(scaleY, camera.normal, dy * factor);
    } else {
      vec3.scale(scaleY, camera.up, -dy * factor);
      vec3.scale(scaleX, camera.right, dx * factor);
    }

    vec3.add(hit.position!, hit.position!, scaleY);
    vec3.add(hit.position!, hit.position!, scaleX);
  });
};

const render = () => {
  // オフスクリーン描画
  gl.bindFramebuffer(gl.FRAMEBUFFER, picker.framebuffer);
  // オフスクリーン描画のため、uniformをtrueに設定
  gl.uniform1i(program.uniforms.uOffscreen, 1);
  draw();

  // オンスクリーン描画
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // デフォルトの描画のため、uniformをfalseに設定
  gl.uniform1i(program.uniforms.uOffscreen, 0);
  draw();
};

/**
 * canvasを描画するためにdrawを呼び出す
 */
const draw = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    const offscreen = program.getUniform(program.uniforms.uOffscreen);
    const flatShadingMode = showPickingImage || offscreen;

    // シーン内のすべてのオブジェクトを反復
    scene.traverse(object => {
      if (object.alias === 'floor' && flatShadingMode) return;

      // ローカルtransformsを計算
      transforms.calculateModelView();
      transforms.push();

      if (object.alias !== 'floor') {
        mat4.translate(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          object.position!
        );
        mat4.scale(
          transforms.modelViewMatrix,
          transforms.modelViewMatrix,
          object.scale!
        );
      }

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
      gl.uniform1i(program.uniforms.uWireframe, Number(object.wireframe));
      // 存在しない場合のデフォルト色
      gl.uniform4fv(
        program.uniforms.uPickingColor,
        object.pickingColor || [0, 0, 0, 0]
      );
      gl.uniform1i(program.uniforms.uOffscreen, flatShadingMode);

      // VAOをバインド
      if (object.vao) gl.bindVertexArray(object.vao);
      // IBOをバインド
      if (object.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

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
  const gui = new GUI();
  gui
    .add({ 'Show Picking Image': showPickingImage }, 'Show Picking Image')
    .onChange((v: boolean) => (showPickingImage = v));
  gui.add(
    {
      'Reset Scene': () => {
        scene.objects = [];
        load();
        camera.goHome();
        camera.setElevation(-40);
        camera.setAzimuth(-30);
      },
    },
    'Reset Scene'
  );
};

init();
