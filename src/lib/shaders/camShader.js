// Webcam pass-through shader with optional X flip and configurable opacity
export const camVert = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}`;

export const camFrag = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float u_flip;
uniform float u_opacityGhost;
void main() {
  vec2 uv = vTexCoord;
  if (u_flip > 0.5) uv.x = 1.0 - uv.x;
  vec4 c = texture2D(tex0, uv);
  // Opaque output, RGB modulated by u_opacityGhost to make a stable ghost behind points
  gl_FragColor = vec4(c.rgb * u_opacityGhost, 1.0);
}`;
