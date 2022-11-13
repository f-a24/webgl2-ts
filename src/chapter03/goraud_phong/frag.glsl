#version 300 es
precision mediump float;

// 頂点シェーダーから補間された値を受け取る
in vec4 vVertexColor;

// 最終的な色はfragColorとして返す
out vec4 fragColor;

void main(void)  {
  // 頂点シェーダーから受け取った値をそのまま設定する
  fragColor = vVertexColor;
}
