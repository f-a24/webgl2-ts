import { mat4, vec3, vec4 } from 'gl-matrix';

export const cameraTypes = ['ORBITING_TYPE', 'TRACKING_TYPE'] as const;

/**
 * カメラを使用した3Dシーンの構築と操作の抽象化
 */
export class Camera {
  position: vec3;
  focus: vec3;
  home: vec3;
  up: vec3;
  right: vec3;
  normal: vec3;
  matrix: mat4;
  steps: number;
  azimuth: number;
  elevation: number;
  fov: number;
  minZ: number;
  maxZ: number;
  type: (typeof cameraTypes)[number] = 'ORBITING_TYPE';

  constructor(type: (typeof cameraTypes)[number] = 'ORBITING_TYPE') {
    this.position = vec3.create();
    this.focus = vec3.create();
    this.home = vec3.create();
    this.up = vec3.create();
    this.right = vec3.create();
    this.normal = vec3.create();
    this.matrix = mat4.create();

    // これらのオプションをコンストラクター経由で渡すか、
    // 使用者側で直接変更できるようにすることができる
    this.steps = 0;
    this.azimuth = 0;
    this.elevation = 0;
    this.fov = 45;
    this.minZ = 0.1;
    this.maxZ = 10000;

    this.setType(type);
  }

  /**
   * カメラが周回モードかどうかを返す
   * @returns 周回モードかどうか
   */
  isOrbiting() {
    return this.type === 'ORBITING_TYPE';
  }

  /**
   * カメラが追跡モードかどうかを返す
   * @returns 追跡モードかどうか
   */
  isTracking() {
    return this.type === 'TRACKING_TYPE';
  }

  /**
   * カメラの種類を変更する
   * @param type カメラの種類
   */
  setType(type: (typeof cameraTypes)[number]) {
    if (!cameraTypes.includes(type)) {
      console.error(`Camera type (${type}) not supported`);
      return;
    }
    this.type = type;
  }

  /**
   * カメラをホームに戻す
   * @param home ホーム
   */
  goHome(home?: vec3) {
    if (home) this.home = home;

    this.setPosition(this.home);
    this.setAzimuth(0);
    this.setElevation(0);
  }

  //
  /**
   * カメラのDolly（台車）
   * @param stepIncrement ステップ増分
   */
  dolly(stepIncrement: number) {
    const normal = vec3.create();
    const newPosition = vec3.create();
    vec3.normalize(normal, this.normal);

    const step = stepIncrement - this.steps;

    if (this.isTracking()) {
      newPosition[0] = this.position[0] - step * normal[0];
      newPosition[1] = this.position[1] - step * normal[1];
      newPosition[2] = this.position[2] - step * normal[2];
    } else {
      newPosition[0] = this.position[0];
      newPosition[1] = this.position[1];
      newPosition[2] = this.position[2] - step;
    }

    this.steps = stepIncrement;
    this.setPosition(newPosition);
  }

  /**
   * カメラの位置を変更する
   * @param position 位置
   */
  setPosition(position: vec3) {
    vec3.copy(this.position, position);
    this.update();
  }

  /**
   * カメラのフォーカスを変更する
   * @param focus フォーカス
   */
  setFocus(focus: vec3) {
    vec3.copy(this.focus, focus);
    this.update();
  }

  /**
   * カメラの方位角を設定する
   * @param azimuth 方位角
   */
  setAzimuth(azimuth: number) {
    this.changeAzimuth(azimuth - this.azimuth);
  }

  /**
   * カメラの方位角を変更する
   * @param azimuth 方位角
   */
  changeAzimuth(azimuth: number) {
    this.azimuth += azimuth;
    if (this.azimuth > 360 || this.azimuth < -360)
      this.azimuth = this.azimuth % 360;
    this.update();
  }

  /**
   * カメラの仰角を設定する
   * @param elevation 仰角
   */
  setElevation(elevation: number) {
    this.changeElevation(elevation - this.elevation);
  }

  /**
   * カメラの仰角を変更する
   * @param elevation 仰角
   */
  changeElevation(elevation: number) {
    this.elevation += elevation;
    if (this.elevation > 360 || this.elevation < -360)
      this.elevation = this.elevation % 360;
    this.update();
  }

  /**
   * カメラの向きを更新する
   */
  calculateOrientation() {
    const right = vec4.create();
    vec4.set(right, 1, 0, 0, 0);
    vec4.transformMat4(right, right, this.matrix);
    vec3.copy(this.right, right as vec3);

    const up = vec4.create();
    vec4.set(up, 0, 1, 0, 0);
    vec4.transformMat4(up, up, this.matrix);
    vec3.copy(this.up, up as vec3);

    const normal = vec4.create();
    vec4.set(normal, 0, 0, 1, 0);
    vec4.transformMat4(normal, normal, this.matrix);
    vec3.copy(this.normal, normal as vec3);
  }

  /**
   * カメラの値を更新する
   */
  update() {
    mat4.identity(this.matrix);

    if (this.isTracking()) {
      mat4.translate(this.matrix, this.matrix, this.position);
      mat4.rotateY(this.matrix, this.matrix, (this.azimuth * Math.PI) / 180);
      mat4.rotateX(this.matrix, this.matrix, (this.elevation * Math.PI) / 180);
    } else {
      mat4.rotateY(this.matrix, this.matrix, (this.azimuth * Math.PI) / 180);
      mat4.rotateX(this.matrix, this.matrix, (this.elevation * Math.PI) / 180);
      mat4.translate(this.matrix, this.matrix, this.position);
    }

    // 追跡カメラがある場合にのみ位置を更新する。
    // 周回カメラの場合、位置は更新しない。
    if (this.isTracking()) {
      const position = vec4.create();
      vec4.set(position, 0, 0, 0, 1);
      vec4.transformMat4(position, position, this.matrix);
      vec3.copy(this.position, position as vec3);
    }

    this.calculateOrientation();
  }

  /**
   * ビュートランスフォームを返す
   * @returns ビュートランスフォーム
   */
  getViewTransform() {
    const matrix = mat4.create();
    mat4.invert(matrix, this.matrix);
    return matrix;
  }
}
