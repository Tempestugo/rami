import React, { useEffect, useRef } from 'react';
import rough from 'roughjs/bundled/rough.esm.js';

export default function RoughCharacter({ schema, isSpeaking = false }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!schema || !svgRef.current) return;

    const svg = svgRef.current;
    const rc = rough.svg(svg);
    let timer;

    const roundedRectPath = (x, y, w, h, rx, ry) => {
      if (w < 2 * rx) rx = w / 2;
      if (h < 2 * ry) ry = h / 2;
      return `M${x + rx},${y}
      h${w - 2 * rx}
      a${rx},${ry} 0 0 1 ${rx},${ry}
      v${h - 2 * ry}
      a${rx},${ry} 0 0 1 ${-rx},${ry}
      h${-w + 2 * rx}
      a${rx},${ry} 0 0 1 ${-rx},${-ry}
      v${-h + 2 * ry}
      a${rx},${ry} 0 0 1 ${rx},${-ry}
      z`;
    };

    const buildPlainShapeNode = (c) => {
      if (c === 'ellipse') return (rc, x) => rc.ellipse(x.cx, x.cy, x.rx * 2, x.ry * 2, x);
      if (c === 'rectangle') return (rc, x) => rc.rectangle(x.x, x.y, x.width, x.height, x);
      if (c === 'drawable') return (rc, x) => rc.draw(x);
      if (c === 'line') return (rc, x) => rc.line(x.x1, x.y1, x.x2, x.y2, x);
      if (c === 'linearPath') return (rc, x) => rc.linearPath(x.points, x);
      if (c === 'arc') return (rc, x) => rc.arc(x.x, x.y, x.width, x.height, x.start, x.stop, x.closed, x);
      if (c === 'curve') return (rc, x) => rc.curve(x.points, x);
      if (c === 'polygon') return (rc, x) => rc.polygon(x.points, x);
      if (c === 'path') return (rc, x) => rc.path(x.d, x);
      return null;
    };

    const buildNode = (rc, element, globalStyle) => {
      const style = { ...globalStyle, ...element };
      let f;
      if (element.type === 'roundedRect') {
        const c = { d: roundedRectPath(element.x, element.y, element.width, element.height, element.rx ?? 0, element.ry ?? element.rx ?? 0), ...style };
        f = buildPlainShapeNode('path');
      } else {
        f = buildPlainShapeNode(element.type);
      }
      if (f == null) return null;
      const node = f(rc, style);
      if (element.class) node.classList.add(...element.class.split(' '));
      return node;
    };

    const draw = () => {
      svg.innerHTML = ''; // Limpa o canvas
      const gstyle = {
        stroke: '#e8442b',
        strokeWidth: 2,
        roughness: 1.5,
        fill: 'none',
        ...schema.style
      };

      schema.elements.forEach(el => {
        // Lógica de visibilidade da fala
        if (el.showOn === 'idle' && isSpeaking) return;
        if (el.showOn === 'speaking' && !isSpeaking) return;

        const node = buildNode(rc, el, gstyle);
        if (node) svg.appendChild(node);
      });
    };

    // Renderiza imediatamente
    draw();

    // Mantém a animação estilo "rascunho vivo" a cada 500ms
    timer = setInterval(draw, 500);

    return () => clearInterval(timer);
  }, [schema, isSpeaking]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${schema.canvas?.width || 500} ${schema.canvas?.height || 500}`}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    />
  );
}
