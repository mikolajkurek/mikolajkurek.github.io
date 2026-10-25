// Draggable stickers: lift on grab, stay inside their panel, slap down on drop.

let z = 10;

export function initStickers(root = document) {
  root.querySelectorAll('.sticker').forEach((el) => {
    let sx = 0, sy = 0, ox = 0, oy = 0, min = null, dragging = false;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      el.setPointerCapture(e.pointerId);
      sx = e.clientX;
      sy = e.clientY;
      ox = parseFloat(el.style.getPropertyValue('--dx')) || 0;
      oy = parseFloat(el.style.getPropertyValue('--dy')) || 0;
      // Allowed movement keeps the sticker's centre inside its panel
      const r = el.getBoundingClientRect();
      const p = el.closest('.panel').getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      min = { x: p.left + 12 - cx, y: p.top + 12 - cy, X: p.right - 12 - cx, Y: p.bottom - 12 - cy };
      el.style.zIndex = ++z;
      el.classList.remove('is-slapped');
      el.classList.add('is-lifted');
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = Math.min(min.X, Math.max(min.x, e.clientX - sx));
      const dy = Math.min(min.Y, Math.max(min.y, e.clientY - sy));
      el.style.setProperty('--dx', `${ox + dx}px`);
      el.style.setProperty('--dy', `${oy + dy}px`);
    });

    const drop = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-lifted');
      el.classList.add('is-slapped');
      setTimeout(() => el.classList.remove('is-slapped'), 300);
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  });
}
