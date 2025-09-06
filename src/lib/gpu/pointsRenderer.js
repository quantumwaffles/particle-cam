// Minimal GPU points renderer for WebGL contexts from p5's WEBGL renderer
export function createPointsRenderer(gl) {
  const pointsVert = `
  precision mediump float;
  attribute vec2 aPos;
  attribute float aSize;
  uniform vec2 u_resolution;
  uniform float u_sizeScale;
  void main() {
    float x = (aPos.x / u_resolution.x) * 2.0 - 1.0;
    float y = 1.0 - (aPos.y / u_resolution.y) * 2.0;
    gl_Position = vec4(x, y, 0.0, 1.0);
    gl_PointSize = aSize * u_sizeScale;
  }`;
  const pointsFrag = `
  precision mediump float;
  uniform float u_opacity;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float edge = smoothstep(0.5, 0.45, r);
    gl_FragColor = vec4(1.0, 1.0, 1.0, edge * u_opacity);
  }`;

  const prog = createProgram(gl, pointsVert, pointsFrag);
  const aPosLoc = gl.getAttribLocation(prog, 'aPos');
  const aSizeLoc = gl.getAttribLocation(prog, 'aSize');
  const uResLoc = gl.getUniformLocation(prog, 'u_resolution');
  const uSizeScaleLoc = gl.getUniformLocation(prog, 'u_sizeScale');
  const uOpacityLoc = gl.getUniformLocation(prog, 'u_opacity');
  const posBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();

  function draw(positions, sizes, width, height, sizeScale, opacity) {
  // preserve current GL state that p5 expects
  const prevProg = gl.getParameter(gl.CURRENT_PROGRAM);
  const wasBlend = gl.isEnabled(gl.BLEND);
  const wasDepth = gl.isEnabled(gl.DEPTH_TEST);

  gl.useProgram(prog);
  if (!wasBlend) gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  if (wasDepth) gl.disable(gl.DEPTH_TEST);
    gl.uniform2f(uResLoc, width, height);
    gl.uniform1f(uSizeScaleLoc, sizeScale);
    gl.uniform1f(uOpacityLoc, opacity);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aSizeLoc);
    gl.vertexAttribPointer(aSizeLoc, 1, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.POINTS, 0, sizes.length);

  // restore state
  if (wasDepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
  if (!wasBlend) gl.disable(gl.BLEND); // if previously disabled, turn it back off
  gl.useProgram(prevProg);
  }

  return { draw };
}

function createProgram(gl, vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  return prog;
}
