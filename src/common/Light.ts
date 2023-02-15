import { vec3, vec4 } from 'gl-matrix';

/**
 * 一般的なライト機能をカプセル化
 */
export class Light {
  id: string;
  position: vec3;
  ambient: number[];
  diffuse: vec4;
  specular: number[];
  [property: string]: unknown;

  constructor(id: string) {
    this.id = id;
    this.position = [0, 0, 0];

    // OBJ規則を使用可能(例: Ka、Kd、Ks など)
    // ただし、ここではより規範的な用語を使用して両方のバージョンを紹介する
    this.ambient = [0, 0, 0, 0];
    this.diffuse = [0, 0, 0, 0];
    this.specular = [0, 0, 0, 0];
  }

  setPosition(position: vec3) {
    this.position = position;
  }

  setDiffuse(diffuse: vec4) {
    this.diffuse = diffuse;
  }

  setAmbient(ambient: number[]) {
    this.ambient = ambient.slice(0);
  }

  setSpecular(specular: number[]) {
    this.specular = specular.slice(0);
  }

  setProperty(property: string, value: unknown) {
    this[property] = value;
  }
}

/**
 * ライトのコレクションを維持するヘルパークラス
 */
export class LightsManager {
  list: Light[];

  constructor() {
    this.list = [];
  }

  add(light: Light) {
    if (!(light instanceof Light)) {
      console.error('The parameter is not a light');
      return;
    }
    this.list.push(light);
  }

  getArray(type: string) {
    return this.list.reduce<unknown[]>((result, light) => {
      result = result.concat(light[type]);
      return result;
    }, []);
  }

  get(index: string | number) {
    if (typeof index === 'string')
      return this.list.find(light => light.id === index);
    return this.list[index];
  }
}
