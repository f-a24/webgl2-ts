#version 300 es
precision mediump float;
in vec4 vFinalColor;
out vec4 fragColor;

void main(void) {
  fragColor = vFinalColor;
}