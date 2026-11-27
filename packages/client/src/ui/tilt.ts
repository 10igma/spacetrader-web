/**
 * Tilting the device moves the foil on every card on screen, like a holographic trading card.
 * One listener for the whole app: it smooths the sensor and writes two numbers to the page,
 * which the card styles read. Without a sensor nothing moves and nothing is written.
 */
export const gyro = { x: 0, y: 0, active: false };

if (typeof window !== 'undefined') {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let x = 0, y = 0, shownX = 9, shownY = 9, raf = 0, last = 0;

  const frame = (now: number): void => {
    raf = 0;
    x += (gyro.x - x) * 0.25;
    y += (gyro.y - y) * 0.25;
    // Thirty updates a second are plenty for a shimmer, and tiny changes are not worth a repaint.
    if (now - last > 32 && (Math.abs(x - shownX) > 0.004 || Math.abs(y - shownY) > 0.004)) {
      last = now;
      shownX = x; shownY = y;
      const root = document.documentElement.style;
      root.setProperty('--gx', ((x + 1) / 2).toFixed(3));
      root.setProperty('--gy', ((y + 1) / 2).toFixed(3));
    }
    if (Math.abs(gyro.x - x) > 0.002 || Math.abs(gyro.y - y) > 0.002) raf = requestAnimationFrame(frame);
  };

  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    gyro.active = true;
    // Left and right over 25 degrees each way. Front to back around the angle a phone is usually held at.
    gyro.x = Math.max(-1, Math.min(1, e.gamma / 25));
    gyro.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    if (!calm && !document.hidden && raf === 0) raf = requestAnimationFrame(frame);
  });
}
