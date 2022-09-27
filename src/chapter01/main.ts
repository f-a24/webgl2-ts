import { getCanvas, getGLContext } from '../common/utils';
import './style.css';

let gl: WebGL2RenderingContext;

const updateClearColor = (...color: [number, number, number, number]) => {
  gl.clearColor(...color);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, 0, 0);
};

const checkKey = ({ key }: KeyboardEvent) => {
  switch (key) {
    // number 1 => green
    case '1': {
      updateClearColor(0.2, 0.8, 0.2, 1.0);
      break;
    }
    // number 2 => blue
    case '2': {
      updateClearColor(0.2, 0.2, 0.8, 1.0);
      break;
    }
    // number 3 => random color
    case '3': {
      updateClearColor(Math.random(), Math.random(), Math.random(), 1.0);
      break;
    }
    // number 4 => get color
    case '4': {
      const [r, g, b] = gl.getParameter(gl.COLOR_CLEAR_VALUE);
      alert(`clearColor = (${r.toFixed(1)},${g.toFixed(1)}, ${b.toFixed(1)})`);
      window.focus();
      break;
    }
  }
};

const init = () => {
  const canvas = getCanvas('webgl-canves');
  if (!canvas) return;

  const _gl = getGLContext(canvas);
  if (!_gl) return;

  gl = _gl;
  window.onkeydown = checkKey;
};

init();
