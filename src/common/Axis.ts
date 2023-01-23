/**
 * 画面上で軸を視覚化
 */
export class Axis {
  alias = 'axis';
  wireframe: boolean;
  indices: number[];
  dimension: number;
  vertices: number[] = [];

  constructor(dimension = 10) {
    this.wireframe = true;
    this.indices = [0, 1, 2, 3, 4, 5];
    this.dimension = dimension;

    this.build(this.dimension);
  }

  build(dimension: number) {
    if (dimension) this.dimension = dimension;

    this.vertices = [
      -dimension,
      0.0,
      0.0,
      dimension,
      0.0,
      0.0,
      0.0,
      -dimension / 2,
      0.0,
      0.0,
      dimension / 2,
      0.0,
      0.0,
      0.0,
      -dimension,
      0.0,
      0.0,
      dimension,
    ];
  }
}
