#version 300 es
precision mediump float;

uniform float uShininess;
uniform vec3 uLightAmbient;
uniform vec3 uMaterialDiffuse;
uniform vec3 uMaterialSpecular;

in vec3 vNormal;
in vec3 vLightRay;
in vec3 vEyeVector;

out vec4 fragColor;

void main(void) {
  vec3 L = normalize(vLightRay);
  vec3 N = normalize(vNormal);
  float lambertTerm = dot(N, -L);
  vec3 finalColor = uLightAmbient;

  if (lambertTerm > 0.0) {
    finalColor += uMaterialDiffuse * lambertTerm;
    vec3 E = normalize(vEyeVector);
    vec3 R = reflect(L, N);
    float specular = pow(max(dot(R, E), 0.0), uShininess);
    finalColor += uMaterialSpecular * specular;
  }

  fragColor = vec4(finalColor, 1.0);
}