import { ReadonlyVec3, vec3 } from 'gl-matrix';

/**
 * 与えられたIDに対応するDON要素を見つけて返す
 * @param id
 * @returns
 */
export const getCanvas = (id: string) => {
  const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`);

  if (!canvas) {
    console.error(`There is no canvas with id ${id} on this page.`);
    return null;
  }

  return canvas;
};

/**
 * canvas要素を与えると、WebGL2コンテキストを返す
 * @param canvas
 * @returns
 */
export const getGLContext = (canvas: HTMLCanvasElement) =>
  canvas.getContext('webgl2') ||
  console.error('WebGL2 is not available in your browser.');

/**
 * ウィンドウが変更されると自動的にリサイズされるように設定する
 * @param canvas
 */
export const autoResizeCanvas = (canvas: HTMLCanvasElement) => {
  const expandFullScreen = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  expandFullScreen();
  window.addEventListener('resize', expandFullScreen);
};

/**
 * WebGLコンテキストとシェーダーコード、シェーダータイプを与えると
 * コンパイルされたシェーダーを返す
 * @param gl WebGLコンテキスト
 * @param shaderCode シェーダーコード
 * @param type シェーダータイプ
 * @returns コンパイルされたシェーダー
 */
export const getShader = (
  gl: WebGL2RenderingContext,
  shaderCode: string,
  type: 'vertex' | 'fragment'
) => {
  // シェーダーのタイプに応じたシェーダーを代入
  const shader = gl.createShader(
    type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER
  );
  if (!shader) return;

  // 与えられたシェーダーコードを使用してシェーダーをコンパイル
  gl.shaderSource(shader, shaderCode);
  gl.compileShader(shader);

  // シェーダーに問題がないことを確認
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    return;
  }

  return shader;
};

/**
 * 色を 0 ～ 255 から 0 ～ 1 に非正規化
 * @param color RGBカラーコード配列
 * @returns
 */
export const denormalizeColor = <T extends RGBColor | RGBAColor>(color: T) =>
  color.map(c => c * 255) as typeof color;

/**
 * 色を 0 ～ 255 から 0 ～ 1 に正規化
 * @param color RGBカラーコード配列
 * @returns
 */
export const normalizeColor = <T extends RGBColor | RGBAColor>(color: T) =>
  color.map(c => c / 255) as typeof color;

/**
 * 指定された頂点の計算された法線を返す
 * 注: TRIANGLESのみで、インデックスは完全に定義する必要がある
 * @param vs 頂点
 * @param ind インデックス
 * @returns 計算された法線
 */
export const calculateNormals = (vs: number[], ind: number[]) => {
  const x = 0;
  const y = 1;
  const z = 2;
  const ns: number[] = [];

  // 頂点ごとに法線x、法線y、法線zを初期化
  for (let i = 0; i < vs.length; i += 3) {
    ns[i + x] = 0.0;
    ns[i + y] = 0.0;
    ns[i + z] = 0.0;
  }

  // 計算する頂点のトライアドに取り組む
  for (let i = 0; i < ind.length; i += 3) {
    // 法線なのでi = i + 3(i = indices index)
    const v1: number[] = [];
    const v2: number[] = [];
    const normal: number[] = [];

    // p2 - p1
    v1[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
    v1[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
    v1[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];

    // p0 - p1
    v2[x] = vs[3 * ind[i] + x] - vs[3 * ind[i + 1] + x];
    v2[y] = vs[3 * ind[i] + y] - vs[3 * ind[i + 1] + y];
    v2[z] = vs[3 * ind[i] + z] - vs[3 * ind[i + 1] + z];

    // Sarrus ルールによる外積
    normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
    normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
    normal[z] = v1[x] * v2[y] - v1[y] * v2[x];

    // 三角形の法線を更新: ベクトルの合計
    for (let j = 0; j < 3; j++) {
      ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
      ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
      ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
    }
  }

  // 結果を正規化
  // ここでの増分は、各頂点が発生するため
  for (let i = 0; i < vs.length; i += 3) {
    // 配列内のオフセットが3の場合(x、y、zの連続した値のため)
    const nn: number[] = [];
    nn[x] = ns[i + x];
    nn[y] = ns[i + y];
    nn[z] = ns[i + z];

    let len = Math.sqrt(nn[x] * nn[x] + nn[y] * nn[y] + nn[z] * nn[z]);
    if (len === 0) len = 1.0;

    nn[x] = nn[x] / len;
    nn[y] = nn[y] / len;
    nn[z] = nn[z] / len;

    ns[i + x] = nn[x];
    ns[i + y] = nn[y];
    ns[i + z] = nn[z];
  }

  return ns;
};

/**
 * 指定された一連の頂点の接線を計算
 * @param vs 頂点
 * @param tc テクスチャ座標
 * @param ind インデックス
 * @returns
 */
export const calculateTangents = (
  vs: number[],
  tc: number[],
  ind: number[]
) => {
  const tangents: vec3[] = [];

  for (let i = 0; i < vs.length / 3; i++) {
    tangents[i] = [0, 0, 0];
  }

  const a: vec3 = [0, 0, 0];
  const b: vec3 = [0, 0, 0];
  let triTangent: vec3 = [0, 0, 0];

  for (let i = 0; i < ind.length; i += 3) {
    const i0 = ind[i];
    const i1 = ind[i + 1];
    const i2 = ind[i + 2];

    const pos0: ReadonlyVec3 = [vs[i0 * 3], vs[i0 * 3 + 1], vs[i0 * 3 + 2]];
    const pos1: ReadonlyVec3 = [vs[i1 * 3], vs[i1 * 3 + 1], vs[i1 * 3 + 2]];
    const pos2: ReadonlyVec3 = [vs[i2 * 3], vs[i2 * 3 + 1], vs[i2 * 3 + 2]];

    const tex0 = [tc[i0 * 2], tc[i0 * 2 + 1]];
    const tex1 = [tc[i1 * 2], tc[i1 * 2 + 1]];
    const tex2 = [tc[i2 * 2], tc[i2 * 2 + 1]];

    vec3.subtract(a, pos1, pos0);
    vec3.subtract(b, pos2, pos0);

    const c2c1b = tex1[1] - tex0[1];
    const c3c1b = tex2[0] - tex0[1];

    triTangent = [
      c3c1b * a[0] - c2c1b * b[0],
      c3c1b * a[1] - c2c1b * b[1],
      c3c1b * a[2] - c2c1b * b[2],
    ];

    vec3.add(triTangent, tangents[i0], triTangent);
    vec3.add(triTangent, tangents[i1], triTangent);
    vec3.add(triTangent, tangents[i2], triTangent);
  }

  // 接線を正規化
  const ts: number[] = [];
  tangents.forEach(tan => {
    vec3.normalize(tan, tan);
    ts.push(tan[0]);
    ts.push(tan[1]);
    ts.push(tan[2]);
  });

  return ts;
};

/**
 * RGBカラーコード配列
 */
export type RGBColor = [number, number, number];

/**
 * RGBAカラーコード配列
 */
export type RGBAColor = [number, number, number, number];
