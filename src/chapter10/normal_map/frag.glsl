#version 300 es
precision mediump float;

uniform vec4 uMaterialDiffuse;
uniform vec4 uMaterialAmbient;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse;
uniform sampler2D uSampler;
uniform sampler2D uNormalSampler;

in vec4 vColor;
in vec2 vTextureCoords;
in vec3 vTangentLightDirection;
in vec3 vTangentEyeDirection;

out vec4 fragColor;

void main(void) {
  // テクスチャから接空間の法線を展開
  vec3 normal = normalize(2.0 * (texture(uNormalSampler, vTextureCoords).rgb - 0.5));

  // 光線の向きを正規化して、この点にどれだけの光が当たるかを決定
  vec3 lightDirection = normalize(vTangentLightDirection);
  float lambertTerm = max(dot(normal, lightDirection), 0.20);

  // 光沢度を計算
  vec3 eyeDirection = normalize(vTangentEyeDirection);
  vec3 reflectDir = reflect(-lightDirection, normal);
  float Is = pow(clamp(dot(reflectDir, eyeDirection), 0.0, 1.0), 8.0);

  // 光源の色とマテリアルの色を合成
  vec4 Ia = uLightAmbient * uMaterialAmbient;
  vec4 Id = uLightDiffuse * uMaterialDiffuse * texture(uSampler, vTextureCoords) * lambertTerm;

  fragColor = Ia + Id + Is;
}