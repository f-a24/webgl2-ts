/**
 * WebGLテクスチャの作成をカプセル化
 */
export class Texture {
  gl: WebGL2RenderingContext;
  glTexture: WebGLTexture | null;
  image: HTMLImageElement;

  constructor(gl: WebGL2RenderingContext, source: string) {
    this.gl = gl;
    this.glTexture = gl.createTexture();

    this.image = new Image();
    this.image.onload = () => this.handleLoadedTexture();

    if (source) this.setImage(source);
  }

  // テクスチャ画像のソースを設定
  setImage(source: string) {
    this.image.src = source;
  }

  // テクスチャを構成
  handleLoadedTexture() {
    const { gl, image, glTexture } = this;
    // バインド
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    // 構成
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_NEAREST
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    // クリア
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
