#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform vec3 uLightDirection;
uniform vec3 uLightDiffuse;
uniform vec3 uMaterialDiffuse;

in vec3 aVertexPosition;
in vec3 aVertexNormal;

out vec4 vVertexColor;

void main(void) {
  // 法線を正規化
  vec3 N = normalize(vec3(uNormalMatrix * vec4(aVertexNormal, 1.0)));

  // 光線をモデルビュー変換行列にアタッチ
  vec3 light = vec3(uModelViewMatrix * vec4(uLightDirection, 0.0));

  // 光線の向きを正規化
  vec3 L = normalize(light);

  // 法線と反転した光線ベクトルの内積
  float lambertTerm = dot(N, -L);

  // ランバート反射モデルに基づいた拡散反射色の計算
  vec3 Id = uMaterialDiffuse * uLightDiffuse * lambertTerm;

  // フラグメントシェーダー内で使用する変数を設定する
  vVertexColor = vec4(Id, 1.0);

  // 頂点位置を設定
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
}