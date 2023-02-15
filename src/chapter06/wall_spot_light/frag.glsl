#version 300 es
precision mediump float;

const int numLights = 3;

uniform vec4 uMaterialAmbient;
uniform vec4 uMaterialDiffuse;
uniform bool uWireframe;
uniform bool uLightSource;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse[numLights];
uniform float uCutOff;
uniform float uExponentFactor;

in vec3 vNormal[numLights];
in vec3 vLightRay[numLights];

out vec4 fragColor;

void main(void) {
  if (uWireframe || uLightSource){
    fragColor = uMaterialDiffuse;
  }
  else {
    vec4 Ia = uLightAmbient * uMaterialAmbient;
    // ベースカラー
    vec4 finalColor = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 L = vec3(0.0);
    vec3 N = vec3(0.0);
    float lambertTerm = 0.0;

    // 光源ごとに繰り返す
    for(int i = 0; i < numLights; i++) {
      L = normalize(vLightRay[i]);
      N = normalize(vNormal[i]);
      lambertTerm = dot(N, -L);
      // if (lambertTerm > uCutOff) {
      //   finalColor += uLightDiffuse[i] * uMaterialDiffuse * lambertTerm;
      // }
      finalColor += uLightDiffuse[i] * uMaterialDiffuse * pow(lambertTerm, uExponentFactor * uCutOff);
    }

    fragColor = vec4(vec3(finalColor), 1.0);
  }
}