#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform vec3 uLightPosition;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse;
uniform vec4 uMaterialDiffuse;
uniform bool uWireframe;
uniform bool uFixedLight;

in vec3 aVertexPosition;
in vec3 aVertexNormal;
in vec4 aVertexColor;

out vec4 vFinalColor;

void main(void) {
  // ワイヤフレームが有効になっている場合は、ライトを除く拡散プロパティに色を設定
  if (uWireframe) {
    vFinalColor = uMaterialDiffuse;
  }
  else {
    // 法線
    vec3 N = vec3(uNormalMatrix * vec4(aVertexNormal, 0.0));
    // 正規化されたライトの位置
    vec3 L = normalize(-uLightPosition);

    // trueの場合、ライトの位置が適切に更新されていることを確認
    if (uFixedLight) {
      L = vec3(uNormalMatrix * vec4(L, 0.0));
    }

    float lambertTerm = dot(N, -L);

    if (lambertTerm == 0.0) {
      lambertTerm = 0.01;
    }

    // Ambient
    vec4 Ia = uLightAmbient;
    // Diffuse
    vec4 Id = uMaterialDiffuse * uLightDiffuse * lambertTerm;

    // フラグメントシェーダー内で使用する変数を設定
    vFinalColor = vec4(vec3(Ia + Id), 1.0);
  }

  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
}