/* The finished MP4 and the realtime director are separate experiences: this
   shell does not allocate a canvas context, decoder or mesh until requested. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const modelRevision = 'v25-continuous-20261101';
  let started = false, targetChapter = null;
  const chapters = $('chapters');
  const fail = () => {
    $('loadStatus').textContent = '实时镜头暂未载入。请重试，或改看完整影片。';
    $('loadRecovery').hidden = false;
    $('retryStudio').onclick = () => location.reload();
  };
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });
  async function start() {
    if (started) return;
    started = true;
    $('startActions').hidden = true;
    document.body.classList.remove('studio-idle');
    $('loadStatus').textContent = '正在准备真实三维镜头…';
    $('screen').width = 1920;
    $('screen').height = 1080;
    $('score').src = $('score').dataset.src;
    // A chapter selected from the idle shell should open at that chapter after
    // film.js has installed its controls and rendered the first frame.
    const done = new MutationObserver(() => {
      if (document.body.dataset.error) { done.disconnect(); return; }
      if (document.body.dataset.ready !== 'true') return;
      done.disconnect();
      if (targetChapter) targetChapter.click();
      $('centerPlay').focus({preventScroll:true});
    });
    done.observe(document.body, {attributes:true, attributeFilter:['data-ready','data-error']});
    try {
      await loadScript('../assets/three.min.js');
      for (const name of ['process','problem','flight','film']) await loadScript(name + '.js?v=' + modelRevision);
    } catch {
      done.disconnect();
      fail();
    }
  }
  $('startStudio').addEventListener('click', start);
  chapters.addEventListener('click', e => {
    if (document.body.dataset.ready === 'true') return;
    const button = e.target.closest('button[data-time]');
    if (!button) return;
    e.stopImmediatePropagation();
    targetChapter = button;
    void start();
  }, true);
})();
