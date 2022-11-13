import { getShader } from './utils';

/**
 * WebGLコンテキスト・頂点シェーダー・フラグメントシェーダーを
 * 受け取るプログラムのコンストラクタ
 */
export class Program {
  gl: WebGL2RenderingContext;
  program: WebGLProgram | null;
  attributes: { [name: string]: number } = {};
  uniforms: { [name: string]: WebGLUniformLocation } = {};

  constructor(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
    this.gl = gl;
    this.program = gl.createProgram();

    if (!this.program) {
      console.error('Failed to create WebGLProgram');
      return this;
    }

    const vertexShader = getShader(gl, vertex.trim(), 'vertex');
    const fragmentShader = getShader(gl, fragment.trim(), 'fragment');

    if (!vertexShader || !fragmentShader) {
      console.error('No shader were provided');
      return this;
    }

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Could not initialize shaders.');
      return this;
    }

    this.useProgram();
  }

  // 現在のプログラムで使用するためのWebGLコンテキスト
  useProgram() {
    this.gl.useProgram(this.program);
  }

  // 与えられた値から与えられたアトリビュートとユニフォームを読み込む
  load(attributes: string[], uniforms: string[]) {
    this.useProgram();
    this.setAttributeLocations(attributes);
    this.setUniformLocations(uniforms);
  }

  // プログラムインスタンスにユニフォームの参照を設定
  setAttributeLocations(attributes: string[]) {
    attributes.forEach(attribute => {
      if (this.program)
        this.attributes[attribute] = this.gl.getAttribLocation(
          this.program,
          attribute
        );
    });
  }

  // プログラムインスタンスにユニフォームの参照を設定
  setUniformLocations(uniforms: string[]) {
    uniforms.forEach(uniform => {
      if (this.program) {
        const uniformLocation = this.gl.getUniformLocation(
          this.program,
          uniform
        );
        if (uniformLocation) this.uniforms[uniform] = uniformLocation;
      }
    });
  }

  // プログラムからユニフォームのロケーションを取得
  getUniform(uniformLocation: WebGLUniformLocation) {
    if (this.program) return this.gl.getUniform(this.program, uniformLocation);
  }
}
