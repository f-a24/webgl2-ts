#version 300 es
precision mediump float;

uniform vec4 uMaterialAmbient;
uniform vec4 uMaterialDiffuse;
uniform bool uWireframe;
uniform bool uLightSource;
uniform vec4 uLightAmbient;
uniform vec4 uDiffuseRedLight;
uniform vec4 uDiffuseGreenLight;
uniform vec4 uDiffuseBlueLight;
uniform float uCutOff;

in vec3 vNormal;
in vec3 vRedRay;
in vec3 vGreenRay;
in vec3 vBlueRay;

out vec4 fragColor;

void main(void) {
  if (uWireframe || uLightSource){
    fragColor = uMaterialDiffuse;
  }
  else {
    vec4 Ia = uLightAmbient * uMaterialAmbient;
    vec4 Id1 = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 Id2 = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 Id3 = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 N = normalize(vNormal);

    float lambertTermOne = dot(N, -normalize(vRedRay));
    float lambertTermTwo = dot(N, -normalize(vGreenRay));
    float lambertTermThree = dot(N, -normalize(vBlueRay));

    if (lambertTermOne > uCutOff) {
      Id1 = uDiffuseRedLight * uMaterialDiffuse * lambertTermOne;
    }

    if (lambertTermTwo > uCutOff) {
      Id2 = uDiffuseGreenLight * uMaterialDiffuse * lambertTermTwo;
    }

    if (lambertTermThree > uCutOff) {
      Id3 = uDiffuseBlueLight * uMaterialDiffuse * lambertTermThree;
    }

    fragColor = vec4(vec3(Ia + Id1 + Id2 + Id3), 1.0);
  }
}