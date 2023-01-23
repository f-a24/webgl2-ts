import { Camera } from './Camera';
import { Picker } from './Picker';

/**
 * ユーザーが3Dシーンと対話するための一般的なコントロールの抽象化
 */
export class Controls {
  camera: Camera;
  canvas: HTMLCanvasElement;
  picker: Picker | null;
  dragging: boolean;
  picking: boolean;
  ctrl: boolean;
  alt: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  button: number;
  key: string;
  dloc: number;
  dstep: number;
  motionFactor: number;
  keyIncrement: number;

  constructor(camera: Camera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.picker = null;

    this.dragging = false;
    this.picking = false;
    this.ctrl = false;
    this.alt = false;

    this.x = 0;
    this.y = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.button = 0;
    this.key = '';

    this.dloc = 0;
    this.dstep = 0;
    this.motionFactor = 10;
    this.keyIncrement = 5;

    canvas.onmousedown = event => this.onMouseDown(event);
    canvas.onmouseup = event => this.onMouseUp(event);
    canvas.onmousemove = event => this.onMouseMove(event);
    window.onkeydown = event => this.onKeyDown(event);
    window.onkeyup = event => this.onKeyUp(event);
  }

  /**
   * オブジェクトを選択するためのピッカーを設定する
   * @param picker ピッカー
   */
  setPicker(picker: Picker) {
    this.picker = picker;
  }

  /**
   * 3D座標を返す
   * @param event マウスイベント
   * @returns 3D座標
   */
  get2DCoords(event: MouseEvent) {
    let top = 0;
    let left = 0;
    let { canvas } = this;

    while (canvas && canvas.tagName !== 'BODY') {
      top += canvas.offsetTop;
      left += canvas.offsetLeft;
      canvas = canvas.offsetParent as HTMLCanvasElement;
    }

    left += window.pageXOffset;
    top -= window.pageYOffset;

    return {
      x: event.clientX - left,
      y: this.canvas.height - (event.clientY - top),
    };
  }

  /**
   * mouseupイベント
   * @param event マウスイベント
   */
  onMouseUp(event: MouseEvent) {
    this.dragging = false;

    if (!event.shiftKey && this.picker) {
      this.picking = false;
      this.picker.stop();
    }
  }

  /**
   * mousedownイベント
   * @param event マウスイベント
   */
  onMouseDown(event: MouseEvent) {
    this.dragging = true;

    this.x = event.clientX;
    this.y = event.clientY;
    this.button = event.button;

    this.dstep =
      Math.max(
        this.camera.position[0],
        this.camera.position[1],
        this.camera.position[2]
      ) / 100;

    if (!this.picker) return;

    const coordinates = this.get2DCoords(event);
    this.picking = this.picker.find(coordinates);

    if (!this.picking) this.picker.stop();
  }

  /**
   * mousemoveイベント
   * @param event マウスイベント
   */
  onMouseMove(event: MouseEvent) {
    this.lastX = this.x;
    this.lastY = this.y;

    this.x = event.clientX;
    this.y = event.clientY;

    if (!this.dragging) return;

    this.ctrl = event.ctrlKey;
    this.alt = event.altKey;

    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;

    if (this.picking && this.picker && this.picker.moveCallback) {
      this.picker.moveCallback(dx, dy);
      return;
    }

    if (!this.button) {
      this.alt ? this.dolly(dy) : this.rotate(dx, dy);
    }
  }

  /**
   * keydownイベント
   * @param event キーボードイベント
   */
  onKeyDown(event: KeyboardEvent) {
    this.key = event.key;
    this.ctrl = event.ctrlKey;
    if (this.ctrl) return;

    switch (this.key) {
      case 'ArrowLeft':
        return this.camera.changeAzimuth(-this.keyIncrement);
      case 'ArrowUp':
        return this.camera.changeElevation(this.keyIncrement);
      case 'ArrowRight':
        return this.camera.changeAzimuth(this.keyIncrement);
      case 'ArrowDown':
        return this.camera.changeElevation(-this.keyIncrement);
    }
  }

  /**
   * keyupイベント
   * @param event キーボードイベント
   */
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Control') this.ctrl = false;
  }

  /**
   * カメラなどを乗せる台車
   * @param value 値
   */
  dolly(value: number) {
    if (value > 0) {
      this.dloc += this.dstep;
    } else {
      this.dloc -= this.dstep;
    }
    this.camera.dolly(this.dloc);
  }

  /**
   * 回転
   * @param dx
   * @param dy
   */
  rotate(dx: number, dy: number) {
    const { width, height } = this.canvas;

    const deltaAzimuth = -20 / width;
    const deltaElevation = -20 / height;

    const azimuth = dx * deltaAzimuth * this.motionFactor;
    const elevation = dy * deltaElevation * this.motionFactor;

    this.camera.changeAzimuth(azimuth);
    this.camera.changeElevation(elevation);
  }
}
