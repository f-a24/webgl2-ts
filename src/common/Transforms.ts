import { mat4 } from 'gl-matrix';
import { Camera } from './Camera';
import { Program } from './Program';

/**
 * 3Dシーンで一般的な変換をカプセル化
 */
export class Transforms {
  stack: mat4[];
  gl: WebGL2RenderingContext;
  program: Program;
  camera: Camera;
  canvas: HTMLCanvasElement;
  modelViewMatrix: mat4;
  projectionMatrix: mat4;
  normalMatrix: mat4;

  constructor(
    gl: WebGL2RenderingContext,
    program: Program,
    camera: Camera,
    canvas: HTMLCanvasElement
  ) {
    this.stack = [];

    this.gl = gl;
    this.program = program;
    this.camera = camera;
    this.canvas = canvas;

    this.modelViewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.normalMatrix = mat4.create();

    this.calculateModelView();
    this.updatePerspective();
    this.calculateNormal();
  }

  /**
   * モデルビュー行列を計算
   */
  calculateModelView() {
    this.modelViewMatrix = this.camera.getViewTransform();
  }

  /**
   * 正規行列を計算
   */
  calculateNormal() {
    mat4.copy(this.normalMatrix, this.modelViewMatrix);
    mat4.invert(this.normalMatrix, this.normalMatrix);
    mat4.transpose(this.normalMatrix, this.normalMatrix);
  }

  /**
   * パースペクティブを更新
   */
  updatePerspective() {
    mat4.perspective(
      this.projectionMatrix,
      this.camera.fov,
      this.canvas.width / this.canvas.height,
      this.camera.minZ,
      this.camera.maxZ
    );
  }

  /**
   * すべての行列ユニフォームを設定
   */
  setMatrixUniforms() {
    this.calculateNormal();
    this.gl.uniformMatrix4fv(
      this.program.uniforms.uModelViewMatrix,
      false,
      this.modelViewMatrix
    );
    this.gl.uniformMatrix4fv(
      this.program.uniforms.uProjectionMatrix,
      false,
      this.projectionMatrix
    );
    this.gl.uniformMatrix4fv(
      this.program.uniforms.uNormalMatrix,
      false,
      this.normalMatrix
    );
  }

  /**
   * 行列をスタックにプッシュ
   */
  push() {
    const matrix = mat4.create();
    mat4.copy(matrix, this.modelViewMatrix);
    this.stack.push(matrix);
  }

  /**
   * 行列をスタックからポップして返す
   * @returns 行列
   */
  pop() {
    return this.stack.length
      ? (this.modelViewMatrix = this.stack.pop()!)
      : null;
  }
}
