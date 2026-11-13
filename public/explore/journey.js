/* Align narrow-screen model panels below the shared navigation and toolbar. */
(() => {
  const header = document.querySelector('.journey-header');
  const toolbar = document.querySelector('.topbar');
  const observer = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--viewer-panel-top', `${toolbar.getBoundingClientRect().bottom + 7}px`);
  });
  observer.observe(header);
  observer.observe(toolbar);
  addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); });
})();
