/* FILM 25: the finished film is a local MP4 asset. This page never loads model or CAD data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const video = $('film'), screen = $('screen'), seek = $('seek'), volume = $('volume');
  const chapters = [...document.querySelectorAll('.chapter')];
  const chapterStarts = chapters.map(button => Number(button.dataset.start));
  const processSteps = [...document.querySelectorAll('.process-step')];
  const caseJumps = [...document.querySelectorAll('.case-jump')];
  const movieURL = video.dataset.src;
  const nominalDuration = 192;
  let playIntent = false, playAttempt = 0, hideTimer = 0, waitTimer = 0;
  let isScrubbing = false, resumeAfterScrub = false, cancelled = false;
  let pendingSeek = null, seekTarget = null, resumePosition = 0, lastChapter = -1;
  let previousVolume = 0.8;

  const formatTime = seconds => {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  };
  const duration = () => Number.isFinite(video.duration) && video.duration > 0 ? video.duration : nominalDuration;
  const announce = text => { $('announcement').textContent = text; };
  const safeTime = seconds => Math.max(0, Math.min(duration(), Number(seconds) || 0));

  function setChapters(open) {
    $('chapters').hidden = !open;
    $('chapterToggle').setAttribute('aria-expanded', String(open));
  }

  function showControls() {
    screen.classList.remove('controls-hidden');
    clearTimeout(hideTimer);
    if (!video.paused && !video.ended && !$('playerError').hidden) return;
    if (!video.paused && !video.ended) {
      hideTimer = window.setTimeout(() => {
        if (!isScrubbing && !document.body.classList.contains('using-keyboard')) screen.classList.add('controls-hidden');
      }, 2600);
    }
  }

  function hideWaiting() {
    clearTimeout(waitTimer);
    $('playerNotice').hidden = true;
    screen.setAttribute('aria-busy', 'false');
  }

  function showWaiting(text = '正在准备影片…') {
    clearTimeout(waitTimer);
    if (!playIntent || cancelled) return;
    waitTimer = window.setTimeout(() => {
      if (!playIntent || cancelled || video.ended) return;
      $('noticeText').textContent = text;
      $('playerNotice').hidden = false;
      screen.setAttribute('aria-busy', 'true');
      showControls();
    }, 650);
  }

  function showError(title, message, retryLabel = '重新播放') {
    hideWaiting();
    playIntent = false;
    video.pause();
    $('errorTitle').textContent = title;
    $('errorText').textContent = message;
    $('retryLoad').textContent = retryLabel;
    $('playerError').hidden = false;
    screen.classList.add('has-started');
    showControls();
    announce(title);
  }

  function clearError() { $('playerError').hidden = true; }

  function refreshPlayState() {
    // A seek intent can precede the browser clearing its native ended flag.
    const ended = video.ended && (seekTarget === null || seekTarget >= duration() - .05);
    const playing = !video.paused && !ended;
    screen.classList.toggle('is-playing', playing);
    screen.classList.toggle('is-ended', ended);
    document.body.classList.toggle('is-playing', playing);
    $('playToggle').setAttribute('aria-label', ended ? '重新播放影片' : playing ? '暂停影片' : '播放影片');
    $('playIcon').setAttribute('d', playing ? 'M7 5h4v14H7zM14 5h4v14h-4z' : 'm8 5 11 7-11 7Z');
    if (ended) {
      $('heroPlay').setAttribute('aria-label', '重新播放AI100%精准建模');
      $('heroPlay').querySelector('.hero-copy').innerHTML = '再看一次<small>REPLAY THE FILM · 03:12</small>';
      setChapters(true);
    } else {
      $('heroPlay').setAttribute('aria-label', '有声播放AI100%精准建模');
      $('heroPlay').querySelector('.hero-copy').innerHTML = '观看影片<small>PLAY THE FILM · 03:12</small>';
    }
    if (playing) screen.classList.add('has-started');
    showControls();
  }

  async function play() {
    const attempt = ++playAttempt;
    playIntent = true;
    clearError();
    ensureMedia();
    try {
      // Call play in the actual gesture. A late chapter seek is applied as soon
      // as native metadata arrives; no full-file JS buffer is needed.
      if (video.ended && (seekTarget === null || seekTarget >= duration() - .05)) video.currentTime = 0;
      showWaiting();
      await video.play();
      if (attempt !== playAttempt || !playIntent) return;
      setChapters(false);
      refreshPlayState();
    } catch (error) {
      if (attempt !== playAttempt || error.name === 'AbortError' || cancelled) return;
      const message = error.name === 'NotAllowedError'
        ? '浏览器需要一次直接操作。请再次点击播放，影片会正常有声播放。'
        : '影片未能开始播放。请检查网络后重试，也可以下载 MP4 观看。';
      showError('暂时无法播放', message);
    }
  }

  function pause() {
    ++playAttempt;
    playIntent = false;
    video.pause();
    hideWaiting();
    refreshPlayState();
  }

  function togglePlay() { playIntent && !video.ended ? pause() : void play(); }

  function updateTime() {
    const t = safeTime(pendingSeek ?? (cancelled ? resumePosition : video.currentTime)), total = duration();
    if (!isScrubbing) seek.value = String(t);
    seek.max = String(total);
    seek.style.setProperty('--progress', `${Math.max(0, Math.min(100, Number(seek.value) / total * 100))}%`);
    seek.setAttribute('aria-valuetext', `${Math.floor(t / 60)}分${Math.floor(t % 60)}秒，共${Math.round(total)}秒`);
    $('currentTime').textContent = formatTime(isScrubbing ? seek.value : t);
    $('duration').textContent = formatTime(total);
    let active = 0;
    chapterStarts.forEach((start, i) => { if (t >= start) active = i; });
    chapters.forEach((button, i) => {
      const end = chapterStarts[i + 1] ?? total;
      const progress = Math.max(0, Math.min(1, (t - chapterStarts[i]) / Math.max(.1, end - chapterStarts[i])));
      button.style.setProperty('--chapter-progress', `${progress * 100}%`);
      button.classList.toggle('is-current', i === active);
      if (i === active) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });
    let stage = -1;
    processSteps.forEach((button, i) => { if (t >= Number(button.dataset.stageStart)) stage = i; });
    processSteps.forEach((button, i) => {
      button.classList.toggle('is-active', i === stage);
      button.classList.toggle('is-past', i < stage);
      if (i === stage) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    caseJumps.forEach(button => {
      const activeCase = t >= Number(button.dataset.caseStart) && t < Number(button.dataset.caseEnd);
      button.classList.toggle('is-active', activeCase);
      if (activeCase) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });
    if (active !== lastChapter) {
      lastChapter = active;
      $('chapterNumber').textContent = `${String(active + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
      $('chapterTitle').textContent = chapters[active].querySelector('strong').textContent;
    }
  }

  function ensureMedia() {
    if (video.hasAttribute('src') && !cancelled) return;
    if (cancelled && pendingSeek === null && resumePosition > 0) pendingSeek = resumePosition;
    cancelled = false;
    video.preload = 'metadata';
    video.src = movieURL;
    video.load();
  }

  function applySeek() {
    if (pendingSeek === null || video.readyState < 1) return;
    const t = safeTime(pendingSeek);
    try {
      video.currentTime = t;
      pendingSeek = null;
      if (!video.seeking && Math.abs(video.currentTime - t) < .1) seekTarget = null;
    } catch {
      showError('章节暂未准备好', '浏览器未能跳转到这个位置。可以重试，或下载 MP4 观看。', '重试章节');
    }
  }

  function seekTo(seconds) {
    const t = safeTime(seconds);
    pendingSeek = seekTarget = resumePosition = t;
    ensureMedia();
    applySeek();
    refreshPlayState();
    updateTime();
  }

  function refreshVolume() {
    const muted = video.muted || video.volume === 0;
    volume.value = String(video.volume);
    volume.setAttribute('aria-valuetext', `${Math.round(video.volume * 100)}%${video.muted ? '，已静音' : ''}`);
    $('muteToggle').setAttribute('aria-label', muted ? '开启声音' : '静音');
    $('muteToggle').setAttribute('aria-pressed', String(muted));
    $('soundWaves').toggleAttribute('hidden', muted);
    $('soundOff').toggleAttribute('hidden', !muted);
  }

  function toggleMute() {
    if (video.volume === 0) { video.volume = previousVolume || .8; video.muted = false; }
    else video.muted = !video.muted;
    refreshVolume();
    showControls();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (screen.requestFullscreen) await screen.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else announce('当前浏览器不支持全屏；你仍可正常观看或下载影片。');
    } catch { announce('全屏未开启，请通过浏览器的全屏功能观看。'); }
    showControls();
  }

  $('heroPlay').addEventListener('click', () => void play());
  $('playToggle').addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  $('muteToggle').addEventListener('click', toggleMute);
  $('fullscreen').addEventListener('click', () => void toggleFullscreen());
  $('chapterToggle').addEventListener('click', () => setChapters($('chapters').hidden));
  $('retryLoad').addEventListener('click', () => {
    resumePosition = safeTime(pendingSeek ?? seekTarget ?? (video.currentTime || resumePosition));
    cancelled = true;
    void play();
  });
  $('cancelLoad').addEventListener('click', () => {
    resumePosition = safeTime(pendingSeek ?? seekTarget ?? video.currentTime);
    pause();
    cancelled = true;
    video.removeAttribute('src');
    video.load();
    seek.disabled = false;
    showError('已暂停载入', '影片尚未开始，当前进度已记住。你可以随时继续。', '继续播放');
  });

  chapters.forEach(button => button.addEventListener('click', () => {
    const time = Number(button.dataset.start);
    seekTo(time);
    if (cancelled) resumePosition = time;
    void play();
    announce(`转到第${chapters.indexOf(button) + 1}章：${button.querySelector('strong').textContent}`);
  }));

  processSteps.forEach(button => button.addEventListener('click', () => {
    const time = Number(button.dataset.stageStart);
    seekTo(time);
    if (cancelled) resumePosition = time;
    void play();
    announce(`转到${button.querySelector('strong').textContent}`);
  }));

  caseJumps.forEach(button => button.addEventListener('click', () => {
    const time = Number(button.dataset.caseStart);
    seekTo(time);
    if (cancelled) resumePosition = time;
    void play();
    announce(`进入案例：${button.querySelector('strong').textContent}`);
  }));

  seek.addEventListener('pointerdown', () => {
    isScrubbing = true;
    resumeAfterScrub = !video.paused;
    if (resumeAfterScrub) pause();
    showControls();
  });
  seek.addEventListener('input', () => {
    seek.style.setProperty('--progress', `${Number(seek.value) / duration() * 100}%`);
    $('currentTime').textContent = formatTime(seek.value);
    seek.setAttribute('aria-valuetext', `${Math.floor(Number(seek.value) / 60)}分${Math.floor(Number(seek.value) % 60)}秒，共${Math.round(duration())}秒`);
    if (!isScrubbing) seekTo(seek.value);
  });
  function finishScrub() {
    if (!isScrubbing) return;
    const value = seek.value;
    isScrubbing = false;
    seekTo(value);
    if (resumeAfterScrub) void play();
    resumeAfterScrub = false;
  }
  seek.addEventListener('change', finishScrub);
  seek.addEventListener('pointerup', finishScrub);
  seek.addEventListener('pointercancel', () => { isScrubbing = false; resumeAfterScrub = false; updateTime(); });
  seek.addEventListener('lostpointercapture', finishScrub);
  volume.addEventListener('input', () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
    if (video.volume > 0) previousVolume = video.volume;
    refreshVolume();
    showControls();
  });

  video.addEventListener('loadedmetadata', () => {
    if (cancelled) return;
    seek.disabled = false;
    applySeek();
    updateTime();
  });
  video.addEventListener('durationchange', updateTime);
  video.addEventListener('timeupdate', updateTime);
  video.addEventListener('volumechange', refreshVolume);
  video.addEventListener('seeking', refreshPlayState);
  video.addEventListener('seeked', () => { if (seekTarget !== null && Math.abs(video.currentTime - seekTarget) < .2) seekTarget = null; refreshPlayState(); updateTime(); });
  video.addEventListener('play', refreshPlayState);
  video.addEventListener('playing', () => { hideWaiting(); clearError(); refreshPlayState(); });
  video.addEventListener('pause', () => { hideWaiting(); refreshPlayState(); });
  video.addEventListener('ended', () => { playIntent = false; hideWaiting(); refreshPlayState(); updateTime(); announce('影片播放完毕。可以重新观看，或探索交互模型。'); });
  video.addEventListener('waiting', () => showWaiting('正在缓冲影片…'));
  video.addEventListener('stalled', () => showWaiting('网络稍慢，正在继续载入…'));
  video.addEventListener('canplay', () => { hideWaiting(); });
  video.addEventListener('error', () => {
    if (cancelled || !video.hasAttribute('src')) return;
    const code = video.error?.code;
    const message = code === 3 || code === 4
      ? '当前浏览器无法解码这段影片。请下载 MP4，使用系统播放器打开。'
      : '网络未能取得影片。请稍后重试，或下载 MP4 观看。';
    showError('影片暂未载入', message);
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '全屏观看');
    showControls();
  });
  document.addEventListener('keydown', () => document.body.classList.add('using-keyboard'));
  document.addEventListener('pointerdown', () => document.body.classList.remove('using-keyboard'), {passive:true});
  screen.addEventListener('pointermove', showControls, {passive:true});
  screen.addEventListener('pointerdown', showControls, {passive:true});
  screen.addEventListener('focusin', showControls);
  screen.addEventListener('keydown', event => {
    if (event.target.closest('input,button,a')) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'k') { event.preventDefault(); togglePlay(); }
    else if (key === 'arrowleft') { event.preventDefault(); seekTo(video.currentTime - 5); }
    else if (key === 'arrowright') { event.preventDefault(); seekTo(video.currentTime + 5); }
    else if (key === 'm') { event.preventDefault(); toggleMute(); }
    else if (key === 'f') { event.preventDefault(); void toggleFullscreen(); }
    else if (key === 'home') { event.preventDefault(); seekTo(0); }
    else if (key === 'end') { event.preventDefault(); seekTo(duration()); }
    showControls();
  });
  window.addEventListener('pagehide', () => {
    resumePosition = safeTime(pendingSeek ?? video.currentTime);
    pause();
    clearTimeout(hideTimer);
    clearTimeout(waitTimer);
    if (video.hasAttribute('src')) {
      cancelled = true;
      pendingSeek = null;
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    }
  });
  video.volume = .8;
  video.muted = false;
  video.controls = false;
  screen.dataset.enhanced = 'true';
  seek.disabled = false;
  refreshVolume();
  refreshPlayState();
  updateTime();
})();
