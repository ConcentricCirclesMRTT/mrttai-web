/** Run a canvas loop only while its element and document are visible. */
export function startVisibleRenderLoop(element: HTMLCanvasElement, draw: (delta: number) => void) {
  let frame = 0;
  let visible = false;
  let disposed = false;
  let scrolling = false;
  let scrollTimer = 0;
  let lastTime = 0;
  const shouldRender = () => visible && !document.hidden && !disposed && !scrolling;
  const tick = (time: number) => {
    frame = 0;
    if (!shouldRender()) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
    lastTime = time;
    draw(delta);
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    element.dataset.rendering = shouldRender() ? "active" : "paused";
    if (shouldRender()) {
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }
  };
  const onScroll = () => {
    scrolling = true;
    window.clearTimeout(scrollTimer);
    sync();
    scrollTimer = window.setTimeout(() => { scrolling = false; sync(); }, 140);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(element);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    disposed = true;
    sync();
    observer.disconnect();
    window.clearTimeout(scrollTimer);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", sync);
  };
}
