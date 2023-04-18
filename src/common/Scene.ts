import { vec3 } from 'gl-matrix';
import { Axis } from './Axis';
import { Floor } from './Floor';
import { Program } from './Program';
import { Texture } from './Texture';
import { calculateNormals, calculateTangents } from './utils';

export type Object = (Axis | Floor) &
  Partial<{
    diffuse: number[];
    Kd: number[];
    ambient: number[];
    Ka: number[];
    specular: number[];
    Ks: number[];
    specularExponent: number;
    Ni: number;
    Ns: number;
    d: number;
    transparency: number;
    illum: number;
    ibo: WebGLBuffer;
    vao: WebGLVertexArrayObject;
    scalars: number[];
    textureCoords: number[];
    image: string;
    texture: Texture;
    hidden: boolean;
    previous: number[];
    position: vec3;
    scale: vec3;
    pickingColor: number[];
    visible: boolean;
  }>;

/**
 * 3Dシーンをオブジェクトで管理
 */
export class Scene {
  gl: WebGL2RenderingContext;
  program: Program;
  objects: Object[];

  constructor(gl: WebGL2RenderingContext, program: Program) {
    this.gl = gl;
    this.program = program;
    this.objects = [];
  }

  /**
   * 指定されたaliasを持つアイテムを見つける
   * @param alias エイリアス
   * @returns アイテム
   */
  get(alias: string) {
    return this.objects.find(object => object.alias === alias);
  }

  /**
   * ファイルを非同期にロードする
   * @param filename ファイル名
   * @param alias エイリアス
   * @param attributes アトリビュート
   */
  async load(filename: string, alias?: string, attributes?: unknown) {
    try {
      const res = await fetch(filename);
      const object = await res.json();

      // ※元リポジトリからデータを参照しているためパスの修正
      if (filename.includes('cube-texture.json'))
        object.image =
          'https://raw.githubusercontent.com/oreilly-japan/real-time-3d-graphics-with-webgl2-2e-ja/master/common/images/webgl.gif';

      object.visible = true;
      object.alias = alias || object.alias;
      this.add(object, attributes);
    } catch (err) {
      return console.error(err, ...arguments);
    }
  }

  /**
   * 特定のモデルをアイテムのリストとして返すヘルパー関数
   * @param path モデルのパス
   * @param count リスト数
   * @param alias エイリアス
   */
  loadByParts(path: string, count: number, alias?: string) {
    for (let i = 1; i <= count; i++) {
      const part = `${path}${i}.json`;
      this.load(part, alias);
    }
  }

  /**
   * デフォルト設定でオブジェクトをシーンに追加し、必要なすべてのバッファとテクスチャを構成する
   * @param object オブジェクト
   * @param attributes アトリビュート
   */
  add(object: Object, attributes?: unknown) {
    const { gl, program } = this;

    // ここでは教育的な目的のためにOBJの規約（Ka、Kd、Ksなど）と本全体の記述用語の両方を使用しているので、
    // 一連のデモ全体が機能するように、存在しないそれぞれのデフォルトを設定する。
    // とはいえ、アプリケーション全体を通して1つの規約にこだわるのがベスト。
    object.diffuse = object.diffuse || [1, 1, 1, 1];
    object.Kd = object.Kd || object.diffuse.slice(0, 3);

    object.ambient = object.ambient || [0.2, 0.2, 0.2, 1];
    object.Ka = object.Ka || object.ambient.slice(0, 3);

    object.specular = object.specular || [1, 1, 1, 1];
    object.Ks = object.Ks || object.specular.slice(0, 3);

    object.specularExponent = object.specularExponent || 0;
    object.Ns = object.Ns || object.specularExponent;

    object.d = object.d || 1;
    object.transparency = object.transparency || object.d;

    object.illum = object.illum || 1;

    // アトリビュートが提供されている場合はマージ
    Object.assign(object, attributes);

    // IBOの準備
    object.ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(object.indices),
      gl.STATIC_DRAW
    );

    // 新しいVAOインスタンスをアタッチ
    object.vao = gl.createVertexArray()!;

    // 有効にして作業を開始
    gl.bindVertexArray(object.vao);

    // 位置
    if (program.attributes.aVertexPosition >= 0) {
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(object.vertices),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(program.attributes.aVertexPosition);
      gl.vertexAttribPointer(
        program.attributes.aVertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // 法線
    if (program.attributes.aVertexNormal >= 0) {
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(calculateNormals(object.vertices, object.indices)),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(program.attributes.aVertexNormal);
      gl.vertexAttribPointer(
        program.attributes.aVertexNormal,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // カラースカラー
    if (object.scalars && program.attributes.aVertexColor >= 0) {
      const colorBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferObject);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(object.scalars),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(program.attributes.aVertexColor);
      gl.vertexAttribPointer(
        program.attributes.aVertexColor,
        4,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // テクスチャ座標
    if (object.textureCoords && program.attributes.aVertexTextureCoords >= 0) {
      const textureBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBufferObject);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(object.textureCoords),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(program.attributes.aVertexTextureCoords);
      gl.vertexAttribPointer(
        program.attributes.aVertexTextureCoords,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );

      // 接線
      if (program.attributes.aVertexTangent >= 0) {
        const tangentBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentBufferObject);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(
            calculateTangents(
              object.vertices,
              object.textureCoords,
              object.indices
            )
          ),
          gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(program.attributes.aVertexTangent);
        gl.vertexAttribPointer(
          program.attributes.aVertexTangent,
          3,
          gl.FLOAT,
          false,
          0,
          0
        );
      }
    }

    // 画像テクスチャ
    if (object.image) object.texture = new Texture(gl, object.image);

    // 後でアクセスできるようにオブジェクトリストにプッシュする
    this.objects.push(object);

    // クリア
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * シーン内のすべてのアイテムをトラバースする
   * @param cb コールバック
   */
  traverse(cb: (object: Object, index: number) => void) {
    for (let i = 0; i < this.objects.length; i++) {
      // 任意の値が返されたらループから抜け出す
      if (cb(this.objects[i], i) !== undefined) break;
    }
  }

  /**
   * 指定されたエイリアスを持つアイテムをシーンから削除する
   * @param alias エイリアス
   */
  remove(alias: string) {
    const object = this.get(alias);
    if (!object) return;
    const index = this.objects.indexOf(object);
    this.objects.splice(index, 1);
  }

  /**
   * アイテムを最初にレンダリング
   * @param alias エイリアス
   */
  renderFirst(alias: string) {
    const object = this.get(alias);
    if (!object) return;
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.splice(0, 0, object);
    this.printRenderOrder();
  }

  /**
   * アイテムを最後にレンダリング
   * @param alias
   */
  renderLast(alias: string) {
    const object = this.get(alias);
    if (!object) return;
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.push(object);
    this.printRenderOrder();
  }

  /**
   * アイテムのレンダリング優先度を上げる
   * @param alias エイリアス
   */
  renderSooner(alias: string) {
    const object = this.get(alias);
    if (!object) return;
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.splice(index - 1, 0, object);
    this.printRenderOrder();
  }

  /**
   * アイテムのレンダリング優先度を下げる
   * @param alias エイリアス
   */
  renderLater(alias: string) {
    const object = this.get(alias);
    if (!object) return;
    const index = this.objects.indexOf(object);
    if (index === this.objects.length - 1) return;

    this.objects.splice(index, 1);
    this.objects.splice(index + 1, 0, object);
    this.printRenderOrder();
  }

  /**
   * レンダリング順序を表す文字列を作成して出力（デバッグ用)
   */
  printRenderOrder() {
    const renderOrder = this.objects.map(object => object.alias).join(' > ');
    console.info('Render Order:', renderOrder);
  }
}
