#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

// 光源
uniform vec3 uLightDirection;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse;
uniform vec4 uLightSpecular;

// マテリアル
uniform vec4 uMaterialAmbient;
uniform vec4 uMaterialDiffuse;
uniform vec4 uMaterialSpecular;
uniform float uShininess;

in vec3 aVertexPosition;
in vec3 aVertexNormal;

out vec4 vVertexColor;

void main(void) {
  vec4 vertex = uModelViewMatrix * vec4(aVertexPosition, 1.0);

  // 法線を正規化
  vec3 N = vec3(uNormalMatrix * vec4(aVertexNormal, 1.0));

  // 光線の向きを正規化
  vec3 L = normalize(uLightDirection);

  // 法線と反転した光線ベクトルの内積
  float lambertTerm = dot(N, -L);

  // Ambient
  vec4 Ia = uLightAmbient * uMaterialAmbient;
  // Diffuse
  vec4 Id = vec4(0.0, 0.0, 0.0, 1.0);
  // Specular
  vec4 Is = vec4(0.0, 0.0, 0.0, 1.0);

  if (lambertTerm > 0.0) {
    Id = uLightDiffuse * uMaterialDiffuse * lambertTerm;
    vec3 eyeVec = -vec3(vertex.xyz);
    vec3 E = normalize(eyeVec);
    vec3 R = reflect(L, N);
    float specular = pow(max(dot(R, E), 0.0), uShininess);
    Is = uLightSpecular * uMaterialSpecular * specular;
  }

  // フラグメントシェーダー内で使用する変数を設定する
  vVertexColor = vec4(vec3(Ia + Id + Is), 1.0);
  gl_Position = uProjectionMatrix * vertex;
}
