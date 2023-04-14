import { getShader } from './utils';

/**
 * ポストプロセスエフェクトのシンプルな実装
 */
export class PostProcess {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  renderbuffer: WebGLRenderbuffer;
  vertexBuffer: WebGLBuffer;
  textureBuffer: WebGLBuffer;
  program: WebGLProgram | null;
  uniforms: {
    [name: string]: WebGLUniformLocation;
  };
  attributes: {
    [name: string]: number;
  };
  startTime: number;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    vertexShader: string,
    fragmentShader: string
  ) {
    this.program = null;
    this.uniforms = {};
    this.attributes = {};

    this.startTime = Date.now();
    this.canvas = canvas;
    this.gl = gl;
    this.texture = gl.createTexture()!;
    this.renderbuffer = this.gl.createRenderbuffer()!;
    this.framebuffer = this.gl.createFramebuffer()!;
    this.vertexBuffer = this.gl.createBuffer()!;
    this.textureBuffer = this.gl.createBuffer()!;

    this.configureFramebuffer();
    this.configureGeometry();
    this.configureShader(vertexShader, fragmentShader);
  }

  configureFramebuffer() {
    const { width, height } = this.canvas;

    // カラーテクスチャを初期化
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );

    // レンダーバッファを初期化
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderbuffer);
    this.gl.renderbufferStorage(
      this.gl.RENDERBUFFER,
      this.gl.DEPTH_COMPONENT16,
      width,
      height
    );

    // フレームバッファを初期化
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      this.texture,
      0
    );
    this.gl.framebufferRenderbuffer(
      this.gl.FRAMEBUFFER,
      this.gl.DEPTH_ATTACHMENT,
      this.gl.RENDERBUFFER,
      this.renderbuffer
    );

    // クリア
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  configureGeometry() {
    // 画面全体を覆う四角形のためのジオメトリを定義
    const vertices = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];

    const textureCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

    // バッファを初期化
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(textureCoords),
      this.gl.STATIC_DRAW
    );

    // クリア
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  configureShader(vertexShaderStr: string, fragmentShaderStr: string) {
    // シェーダーをコンパイル
    const vertexShader = getShader(this.gl, vertexShaderStr.trim(), 'vertex')!;
    const fragmentShader = getShader(
      this.gl,
      fragmentShaderStr.trim(),
      'fragment'
    )!;

    // configureShaderを再度呼び出すと、以前に作成されたシェーダーオブジェクトがクリーンアップされる
    if (this.program) this.gl.deleteProgram(this.program);

    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
      console.error('Could not initialize post-process shader');

    // あとで使用するためにすべてのアトリビュートとユニフォームを保存
    this.attributes = {};
    const attributesCount = this.gl.getProgramParameter(
      this.program,
      this.gl.ACTIVE_ATTRIBUTES
    );
    for (let i = 0; i < attributesCount; i++) {
      const attrib = this.gl.getActiveAttrib(this.program, i)!;
      this.attributes[attrib.name] = this.gl.getAttribLocation(
        this.program,
        attrib.name
      );
    }

    this.uniforms = {};
    const uniformsCount = this.gl.getProgramParameter(
      this.program,
      this.gl.ACTIVE_UNIFORMS
    );
    for (let i = 0; i < uniformsCount; i++) {
      const uniform = this.gl.getActiveUniform(this.program, i)!;
      this.uniforms[uniform.name] = this.gl.getUniformLocation(
        this.program,
        uniform.name
      )!;
    }
  }

  validateSize() {
    const { width, height } = this.canvas;

    // 1. カラーテクスチャのサイズ変更
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );

    // 2. レンダーバッファのサイズ変更
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderbuffer);
    this.gl.renderbufferStorage(
      this.gl.RENDERBUFFER,
      this.gl.DEPTH_COMPONENT16,
      width,
      height
    );

    // 3. クリア
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
  }

  bind() {
    const { width, height } = this.canvas;

    // ポストプロセスシェーダーを使用
    this.gl.useProgram(this.program);

    // クワッドジオメトリをバインド
    this.gl.enableVertexAttribArray(this.attributes.aVertexPosition);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.vertexAttribPointer(
      this.attributes.aVertexPosition,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    this.gl.enableVertexAttribArray(this.attributes.aVertexTextureCoords);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
    this.gl.vertexAttribPointer(
      this.attributes.aVertexTextureCoords,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // フレームバッファからテクスチャをバインド
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uniforms.uSampler, 0);

    // ポストプロセスシェーダーが時間を入力として使用する場合はここに渡す
    if (this.uniforms.uTime)
      this.gl.uniform1f(
        this.uniforms.uTime,
        (Date.now() - this.startTime) / 1000
      );

    // 逆テクスチャサイズは、正確なピクセルルックアップを必要とするエフェクトに役立つ
    if (this.uniforms.uInverseTextureSize)
      this.gl.uniform2f(
        this.uniforms.uInverseTextureSize,
        1 / width,
        1 / height
      );
  }

  // TRIANGLESプリミティブを使用して描画
  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}
