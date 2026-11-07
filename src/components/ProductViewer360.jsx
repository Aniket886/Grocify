import { useEffect, useRef, useState } from 'react';

// A drag-to-rotate 360° product viewer.
//
// This component accepts a product name and renders a stylised 3D block the
// user can drag left/right (or swipe) to spin a full 360°. The ring of six
// CSS-transformed faces stands in for a photo sequence from six angles — the
// prototype does not ship real product photos, and `anthropic-skills` are
// clear that no copyrighted imagery may be used. When real multi-angle photos
// are added later, pass them in via `faces` and the viewer will show them.
//
// Props:
//   label   : text shown on each face (defaults to the product name)
//   faces   : optional [string, string, string, string, string, string] of
//             image URLs for the six sides. When provided they replace the
//             default colour panels so the viewer shows real photography.
export default function ProductViewer360({ label = 'Grocify', faces }) {
  const [angle, setAngle] = useState(-18);
  const dragging = useRef(null);
  const stageRef = useRef(null);

  // Attach once; the handlers no-op when nobody is dragging.
  useEffect(() => {
    function move(e) {
      if (!dragging.current) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = x - dragging.current.startX;
      setAngle(dragging.current.start + delta * 0.6);                        // 0.6° per px
    }
    function up() { dragging.current = null; }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);

  function startDrag(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    dragging.current = { startX: x, start: angle };
  }
  const norm = ((angle % 360) + 360) % 360;

  // Six faces every 60° around the Y axis. Width of 50% so the block's edge is
  // at the ring radius (~50% / 2 = 25%). CSS transforms stay the same whether
  // we draw a colour block or a user-supplied photo.
  const sides = [0, 60, 120, 180, 240, 300].map((deg, i) => {
    const face = faces?.[i];
    const bg = face ? `url(${face}) center/cover` : undefined;
    const style = {
      transform: `rotateY(${deg}deg) translateZ(80px)`,
      background: bg,
    };
    return (
      <div className="face" key={deg} style={style}>
        {!face && label}
      </div>
    );
  });

  return (
    <div>
      <div
        className="viewer-3d"
        ref={stageRef}
        role="img"
        aria-label={`Interactive 360 view of ${label}. Drag left or right to rotate.`}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="stage">
          <div className="obj" style={{ transform: `rotateY(${angle}deg) rotateX(-8deg)` }}>
            {sides}
          </div>
        </div>
        <div className="rot-label">{Math.round(norm)}°</div>
        <div className="hint">↔ Drag to rotate 360°</div>
      </div>
      <div className="viewer-3d-caption">
        <span>Prototype: a stylised 360° view. Real multi-angle photos drop in through the <code>faces</code> prop.</span>
      </div>
    </div>
  );
}
