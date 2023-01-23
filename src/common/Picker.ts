import { Object, Scene } from './Scene';

/**
 * HTML5 canvasでの簡単なマウスピッキング実装
 */
export class Picker {
  pickedList: Object[];
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  scene: Scene;
  texture: WebGLTexture | null;
  framebuffer: WebGLFramebuffer | null;
  renderbuffer: WebGLRenderbuffer | null;
  hitPropertyCallback?: (obj: Object) => void;
  removeHitCallback?: (obj: Object) => void;
  addHitCallback?: (obj: Object) => void;
  processHitsCallback?: (obj: Object[]) => void;
  moveCallback?: (dx: number, dy: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    scene: Scene,
    callbacks: Function
  ) {
    this.pickedList = [];
    this.canvas = canvas;
    this.gl = gl;
    this.scene = scene;
    this.texture = null;
    this.framebuffer = null;
    this.renderbuffer = null;

    // すべてのコールバックをインスタンスにアタッチ
    Object.assign(this, callbacks);

    this.configure();
  }

  configure() {
    const { width, height } = this.canvas;

    this.texture = this.gl.createTexture();
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

    this.renderbuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderbuffer);
    this.gl.renderbufferStorage(
      this.gl.RENDERBUFFER,
      this.gl.DEPTH_COMPONENT16,
      width,
      height
    );

    this.framebuffer = this.gl.createFramebuffer();
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

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  getHits() {
    return this.pickedList;
  }

  update() {
    const { width, height } = this.canvas;

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

    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderbuffer);
    this.gl.renderbufferStorage(
      this.gl.RENDERBUFFER,
      this.gl.DEPTH_COMPONENT16,
      width,
      height
    );
  }

  /**
   * ピクセルが読み取り値と一致するかどうかを比較する
   * @param readout
   * @param color
   * @returns
   */
  compare(readout: Uint8Array, color: number[]) {
    return (
      Math.abs(Math.round(color[0] * 255) - readout[0]) <= 1 &&
      Math.abs(Math.round(color[1] * 255) - readout[1]) <= 1 &&
      Math.abs(Math.round(color[2] * 255) - readout[2]) <= 1
    );
  }

  find(coords: { x: number; y: number }) {
    const readout = new Uint8Array(4);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.readPixels(
      coords.x,
      coords.y,
      1,
      1,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      readout
    );
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    let found = false;

    this.scene.traverse(obj => {
      if (obj.alias === 'floor') return;

      const property =
        this.hitPropertyCallback && this.hitPropertyCallback(obj);
      if (!property) return false;

      if (this.compare(readout, property)) {
        const idx = this.pickedList.indexOf(obj);
        if (~idx) {
          this.pickedList.splice(idx, 1);
          if (this.removeHitCallback) this.removeHitCallback(obj);
        } else {
          this.pickedList.push(obj);
          if (this.addHitCallback) this.addHitCallback(obj);
        }
        return (found = true);
      }
      return;
    });
    return found;
  }
  stop() {
    if (this.processHitsCallback && this.pickedList.length)
      this.processHitsCallback(this.pickedList);
    this.pickedList = [];
  }
}
