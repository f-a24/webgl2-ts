#version 300 es
precision mediump float;

const int numLights = 4;

uniform vec3 uLd[numLights];
uniform vec3 uLs[numLights];
uniform vec3 uLightPosition[numLights];
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform float uNs;
uniform float uD;
uniform bool uWireframe;

in vec3 vNormal;
in vec3 vLightRay[numLights];
in vec3 vEye[numLights];

out vec4 fragColor;

vec3 projectOnPlane(in vec3 p, in vec3 pc, in vec3 pn) {
  float distance = dot(pn, p - pc);
  return p - distance*pn;
}

void main(void) {
  if (uWireframe){
    fragColor = vec4(uKd, uD);
    return;
  }

  vec3 finalColor = vec3(0.0, 0.0, 0.0);
  vec3 N = normalize(vNormal);
  vec3 L = vec3(0.0, 0.0, 0.0);
  vec3 E = vec3(0.0, 0.0, 0.0);
  vec3 R = vec3(0.0, 0.0, 0.0);
  vec3 deltaRay = vec3(0.0);

  const int lSize = 2;
  const float step = 0.25;
  const float invTotal = 1.0 / ((float(lSize*lSize) + 1.0) * (float(lSize * lSize) + 1.0));

  float dx = 0.0;
  float dz = 0.0;
  float LT = 0.0;

  for(int i = 0; i < numLights; i++){
    dx = 0.0;
    dz = 0.0;
    E = normalize(vEye[i]);
    for (int x = -lSize; x <= lSize; x++) {
      dx = dx + step;
      for(int z = -lSize; z <= lSize; z++) {
        dz = dz + step;
        deltaRay = vec3(vLightRay[i].x + dx, vLightRay[i].y, vLightRay[i].z + dz);
        L = normalize(deltaRay);
        R = reflect(L, N);
        finalColor += (uLd[i] * uKd * clamp(dot(N, -L), 0.0, 1.0) * invTotal);
        finalColor += (uLs[i] * uKs * pow( max(dot(R, E), 0.0), uNs));
      }
    }
  }
  fragColor =  vec4(finalColor, uD);
}
