(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const COLORS = ['#ffd36e', '#ff7eb6', '#ff5e9c', '#9b6bff', '#6ee7ff', '#ffffff', '#7dffb3'];

  /* =========================================================
     Particle FX (confetti, sparks, fireworks)
     ========================================================= */
  const cv = $('#fx');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  const parts = [];
  const rockets = [];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function confetti(x, y, n = 80, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(3, 11) * spread;
      parts.push({
        kind: 'conf', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(2, 6),
        w: rand(6, 11), h: rand(4, 7), rot: rand(0, 6), vr: rand(-.3, .3),
        color: pick(COLORS), life: rand(90, 150), age: 0,
      });
    }
  }

  function sparks(x, y, n = 60, color) {
    const c = color || pick(COLORS);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-.05, .05), s = rand(2, 6.5);
      parts.push({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: rand(1.6, 3), color: Math.random() < .2 ? '#fff' : c, life: rand(50, 80), age: 0,
      });
    }
  }

  function heartBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(2, 6);
      parts.push({
        kind: 'emoji', ch: pick(['✨', '🌟', '💫', '🎉', '🎊', '🌸', '⭐', '✨']), x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, size: rand(16, 26), life: rand(60, 90), age: 0,
      });
    }
  }

  function rocket(tx, ty) {
    rockets.push({ x: tx + rand(-30, 30), y: H + 10, tx, ty, color: pick(COLORS) });
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += (r.tx - r.x) * .08; r.y += (r.ty - r.y) * .08;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2); ctx.fill();
      parts.push({ kind: 'spark', x: r.x, y: r.y, vx: rand(-.4, .4), vy: rand(.5, 1.5), r: 1.5, color: '#ffd36e', life: 20, age: 0 });
      if (Math.abs(r.y - r.ty) < 6) {
        rockets.splice(i, 1);
        sparks(r.x, r.y, 70, r.color);
        sparks(r.x, r.y, 30, '#fff');
        boom();
      }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age++;
      if (p.age > p.life || p.y > H + 40) { parts.splice(i, 1); continue; }
      const t = 1 - p.age / p.life;
      if (p.kind === 'conf') {
        p.vx *= .985; p.vy = p.vy * .985 + .22; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.age * .15));
        ctx.globalAlpha = Math.min(1, t * 2); ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      } else if (p.kind === 'spark') {
        p.vx *= .965; p.vy = p.vy * .965 + .06; p.x += p.vx; p.y += p.vy;
        ctx.globalAlpha = t; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + t * .5), 0, Math.PI * 2); ctx.fill();
      } else {
        p.vx *= .97; p.vy = p.vy * .97 + .12; p.x += p.vx; p.y += p.vy;
        ctx.globalAlpha = t; ctx.font = `${p.size}px serif`; ctx.textAlign = 'center';
        ctx.fillText(p.ch, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* =========================================================
     Sound: music-box "Happy Birthday" + little effects (Web Audio)
     ========================================================= */
  let AC = null, master = null, musicOn = false, musicTimer = null;
  function audio() {
    if (!AC) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  function tone(freq, t, dur, vol = .25, type = 'sine', dest = master) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .015);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
  }

  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const MELODY = [
    ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
    ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
    ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
    ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
  ];
  const BEAT = .4;

  let songBus = null; // each loop of the song gets its own bus so it can be cut instantly
  let track = 'bday'; // which music the current screen wants: 'bday' | 'photos'
  function playSong() {
    if (!musicOn || track !== 'bday' || !audio()) return;
    if (songBus) songBus.disconnect();
    songBus = AC.createGain(); songBus.connect(master);
    let t = AC.currentTime + .1;
    for (const [n, d] of MELODY) {
      const f = N[n];
      tone(f, t, d * BEAT * 2.2, .22, 'sine', songBus);         // body
      tone(f * 2, t, d * BEAT * 1.2, .06, 'triangle', songBus); // music-box sparkle
      t += d * BEAT;
    }
    const total = MELODY.reduce((s, [, d]) => s + d, 0) * BEAT;
    musicTimer = setTimeout(playSong, (total + 2) * 1000);
  }

  function stopBday() {
    clearTimeout(musicTimer);
    if (songBus) { songBus.disconnect(); songBus = null; }
  }

  /* --- Real songs for some screens ---
     Each is routed through Web Audio so it can fade in/out (iPhone ignores audio.volume).
     A missing/broken file just falls back to the birthday tune. */
  const SONG_FILES = {
    opening: 'music/birthday-song.mp3', // instrumental Happy Birthday
    photos: 'music/photos-song.mp3',    // Nadaaniyan
    finale: 'music/finale-song.mp3',    // Gallan Goodiyaan
  };
  // which song + volume each screen wants; screens not listed use the music-box tune
  const SCENE_MUSIC = {
    's-home':   ['photos', .4],  // Nadaaniyan, soft, on the welcome-back screen
    's-gift':   ['opening', .8],
    's-wish':   ['opening', .8],
    's-cake':   ['opening', .8],
    's-photos': ['photos', .9],
    's-letter': ['photos', .15], // same song, soft, while the letter is written
    's-final':  ['finale', .9],
  };
  const songs = {};
  for (const [name, file] of Object.entries(SONG_FILES)) {
    const el = new Audio();
    el.loop = true; el.preload = 'none'; el.setAttribute('playsinline', '');
    const s = songs[name] = { name, file, el, gain: null, ok: true, timer: null };
    el.addEventListener('error', () => {
      s.ok = false; el.pause();
      if (track === name && musicOn) { track = 'bday'; playSong(); }
    });
  }
  function songNode(s) {
    if (!s.gain && audio()) {
      if (!s.el.src) s.el.src = s.file;
      const src = AC.createMediaElementSource(s.el);
      s.gain = AC.createGain(); s.gain.gain.value = 0;
      src.connect(s.gain); s.gain.connect(master);
    }
    return s.gain;
  }
  function fadeSong(s, to, secs) {
    if (!s.gain) return;
    const g = s.gain.gain, t = AC.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + secs);
  }
  function startSong(s, level) {
    if (!s.ok || !songNode(s)) return false;
    clearTimeout(s.timer);
    if (s.el.paused) {
      const p = s.el.play();
      if (p && p.catch) p.catch(() => { if (track === s.name && musicOn) { track = 'bday'; playSong(); } });
    }
    fadeSong(s, level, 1.5); // already playing? just glide to the new volume
    return true;
  }
  function stopSong(s) {
    if (!s.gain || s.el.paused) return;
    fadeSong(s, 0, .8);
    clearTimeout(s.timer);
    s.timer = setTimeout(() => s.el.pause(), 850); // keeps its place for next visit
  }

  // pick the right music for a screen; called on every screen change and on mute/unmute
  let songLevel = .9;
  function applyMusic(sceneId) {
    if (sceneId) {
      const want = SCENE_MUSIC[sceneId];
      track = (want && songs[want[0]].ok) ? want[0] : 'bday';
      if (want) songLevel = want[1];
    }
    for (const s of Object.values(songs)) if (s.name !== track || !musicOn) stopSong(s);
    if (!musicOn) { stopBday(); return; }
    if (track !== 'bday') {
      stopBday();
      if (!startSong(songs[track], songLevel)) { track = 'bday'; playSong(); }
    } else if (!songBus) playSong();
  }

  /* --- Background preloading ---
     The first screen shows instantly; while she plays with the box, balloons and cake,
     everything else downloads quietly, one item at a time, in the order she'll need it.
     Songs are fetched whole into memory so they start instantly (iPhone won't preload audio). */
  const PHOTO_COUNT = 15;
  const photoSrc = (n) => `photos/komo-${String(n).padStart(2, '0')}.jpg`;
  const preloaded = [];
  function preloadImage(src) {
    return new Promise((done) => {
      const im = new Image();
      im.onload = im.onerror = () => done();
      im.src = src;
      preloaded.push(im); // keep a reference so it stays decoded/cached
    });
  }
  async function preloadSong(s) {
    try {
      const res = await fetch(s.file);
      if (!res.ok) throw new Error(res.status);
      const url = URL.createObjectURL(await res.blob());
      if (!s.el.src) s.el.src = url; // not started yet: play from memory
    } catch (_) { /* fine: it will stream from the network when its screen opens */ }
  }
  async function preloadAll() {
    const steps = [
      () => preloadSong(songs.opening), // needed first: plays the moment the box opens
      () => Promise.all([1, 2, 3].map((n) => preloadImage(photoSrc(n)))),
      () => preloadSong(songs.photos),
    ];
    for (let n = 4; n <= PHOTO_COUNT; n++) steps.push(() => preloadImage(photoSrc(n)));
    steps.push(() => preloadSong(songs.finale));
    for (const step of steps) await step();
  }
  if (location.protocol !== 'file:') {
    if (document.readyState === 'complete') setTimeout(preloadAll, 300);
    else window.addEventListener('load', () => setTimeout(preloadAll, 300));
  }

  const musicBtn = $('#musicBtn');
  // sceneId lets the very first start pick the right song while still inside the tap
  // (iPhone only allows a song to start during a tap)
  function setMusic(on, sceneId) {
    musicOn = on;
    stopBday();
    musicBtn.classList.toggle('playing', on);
    musicBtn.textContent = on ? '🎵' : '🔇';
    applyMusic(sceneId);
  }
  musicBtn.addEventListener('click', (e) => { e.stopPropagation(); setMusic(!musicOn); });

  function pop() {
    if (!musicOn || !audio()) return;
    const t = AC.currentTime;
    const len = AC.sampleRate * .12, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = buf; g.gain.value = .5; s.connect(g); g.connect(master); s.start(t);
  }
  function chime() {
    if (!musicOn || !audio()) return;
    const t = AC.currentTime;
    [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, t + i * .08, .6, .12, 'sine'));
  }
  function boom() {
    if (!AC || !musicOn) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .4);
    g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .55);
  }
  function vibrate(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (_) {} }

  /* =========================================================
     Background floaters
     ========================================================= */
  const floaters = $('#floaters');
  // gently rising party emoji (sparkles weighted heaviest)
  const FLOAT_EMOJI = ['✨', '✨', '✨', '🌟', '💫', '⭐', '🎈', '🎉', '🌸', '🎀', '🦋', '🧁', '💖', '💖'];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.className = 'floater';
    s.textContent = pick(FLOAT_EMOJI);
    s.style.left = rand(0, 100) + '%';
    s.style.fontSize = rand(12, 24) + 'px';
    s.style.animationDuration = rand(11, 20) + 's';
    s.style.animationDelay = -rand(0, 20) + 's';
    floaters.appendChild(s);
  }
  // twinkling sparkle "stars" scattered across the sky
  for (let i = 0; i < 34; i++) {
    const t = document.createElement('i');
    t.className = 'spark' + (Math.random() < .3 ? ' star4' : '');
    t.style.left = rand(0, 100) + '%';
    t.style.top = rand(0, 100) + '%';
    const z = rand(2, Math.random() < .3 ? 7 : 4);
    t.style.width = t.style.height = z + 'px';
    t.style.animationDuration = rand(1.8, 4) + 's';
    t.style.animationDelay = -rand(0, 4) + 's';
    floaters.appendChild(t);
  }

  /* =========================================================
     Scene navigation
     ========================================================= */
  const scenes = $$('.scene:not(#s-home)');
  const home = $('#s-home');
  const dots = $('#dots');
  scenes.forEach(() => dots.appendChild(document.createElement('span')));
  let cur = 0, maxSeen = 0;
  const backBtn = $('#backBtn');

  // Her birthday: 16 November (month is 0-based, 10 = November), in her phone's local time.
  const BDAY_MONTH = 10, BDAY_DAY = 16;
  function isBirthdayToday(now = new Date()) {
    return now.getMonth() === BDAY_MONTH && now.getDate() === BDAY_DAY;
  }
  // On her birthday the full surprise plays from the box. Any other day she lands on a
  // welcome-back home screen. Add ?surprise to the link to preview the birthday flow.
  const homeMode = !isBirthdayToday() && !/[?&]surprise\b/.test(location.search);
  let homeActive = false;

  function showHome(fromHistory = false) {
    if (homeActive) return;
    scenes[cur].classList.remove('active');
    home.classList.add('active');
    homeActive = true;
    dots.classList.add('hide');
    backBtn.classList.remove('show');
    stopBalloons();
    clearTimeout(nudgeTimer);
    if (!fromHistory) try { history.pushState({ s: -1 }, ''); } catch (_) {}
    if (musicBtn.classList.contains('show')) applyMusic('s-home');
    updateCountdown();
  }

  // fromHistory: true when triggered by the browser/iPhone back gesture
  function go(n, fromHistory = false) {
    if (n === cur && !homeActive) return;
    if (homeActive) {
      home.classList.remove('active');
      homeActive = false;
      dots.classList.remove('hide');
    }
    scenes[cur].classList.remove('active');
    cur = n;
    maxSeen = Math.max(maxSeen, cur);
    scenes[cur].classList.add('active');
    $$('span', dots).forEach((d, i) => {
      d.classList.toggle('on', i === cur);
      d.classList.toggle('seen', i <= maxSeen);
    });
    backBtn.classList.toggle('show', cur > 0 || homeMode); // from the first screen, back = home
    if (!fromHistory) try { history.pushState({ s: cur }, ''); } catch (_) {}
    if (musicBtn.classList.contains('show')) applyMusic(scenes[cur].id);
    const hook = enter[scenes[cur].id];
    if (hook) hook();
    armNudge();
  }

  // If she lingers without tapping, make the next button bounce with a "there's more" bubble
  let nudgeTimer = null;
  function armNudge() {
    clearTimeout(nudgeTimer);
    $$('.next.nudge').forEach((b) => b.classList.remove('nudge'));
    const btn = scenes[cur].querySelector('[data-next]');
    if (!btn) return; // first & last screens have no next button
    nudgeTimer = setTimeout(() => {
      if (btn.hidden) armNudge(); // e.g. candles still lit: check again later
      else btn.classList.add('nudge');
    }, 5000);
  }
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-next]')) armNudge(); // any tap restarts the wait
  });
  if (homeMode) {
    scenes[0].classList.remove('active');
    home.classList.add('active');
    homeActive = true;
    dots.classList.add('hide');
    try { history.replaceState({ s: -1 }, ''); } catch (_) {}
  } else {
    try { history.replaceState({ s: 0 }, ''); } catch (_) {}
  }
  // classes are in place now; drop the early first-screen hint from <head>
  document.documentElement.removeAttribute('data-start');
  window.addEventListener('popstate', (e) => {
    const s = e.state && typeof e.state.s === 'number' ? e.state.s : (homeMode ? -1 : 0);
    if (s < 0) showHome(true);
    else go(Math.min(s, scenes.length - 1), true);
  });

  // Home screen buttons: start the music within this tap (iPhone rule), then jump in
  const homeMusicHint = $('#homeMusicHint');
  function startMusicOnce(sceneId) {
    if (musicBtn.classList.contains('show')) return;
    audio();
    musicBtn.classList.add('show');
    homeMusicHint.hidden = true;
    setMusic(true, sceneId);
  }
  function leaveHome(sceneId) {
    const n = scenes.findIndex((sc) => sc.id === sceneId);
    startMusicOnce(sceneId);
    maxSeen = Math.max(maxSeen, n);
    go(n);
  }
  // first tap anywhere on the home screen starts soft music (iPhone needs a tap first)
  home.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    startMusicOnce('s-home');
  });
  $('#homeRelive').addEventListener('click', (e) => { e.stopPropagation(); leaveHome('s-gift'); });
  $$('[data-jump]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    leaveHome(b.dataset.jump);
  }));

  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cur === 0) {
      if (!homeMode) return;
      if (history.state && history.state.s === 0 && history.length > 1) history.back();
      else showHome();
      return;
    }
    // step back through the same history the iPhone back-swipe uses
    if (history.state && typeof history.state.s === 'number' && history.state.s === cur && history.length > 1) history.back();
    else go(cur - 1);
  });
  $$('span', dots).forEach((d, i) => d.addEventListener('click', (e) => {
    e.stopPropagation();
    if (i <= maxSeen) go(i);
  }));
  $$('[data-next]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    go(Math.min(cur + 1, scenes.length - 1));
  }));
  $$('span', dots)[0].classList.add('on', 'seen');

  const enter = {
    's-gift': () => { resetGift(); stopBalloons(); },
    's-wish': startBalloons,
    's-cake': resetCake,
    's-photos': buildStack,
    's-letter': resetLetter,
    's-final': () => {
      stopBalloons();
      updateCountdown();
      setTimeout(() => { for (let i = 0; i < 4; i++) setTimeout(() => rocket(rand(W * .15, W * .85), rand(H * .12, H * .4)), i * 350); }, 600);
    },
  };

  /* ---------- 0 · Gift ---------- */
  const gift = $('#gift');
  const giftStage = $('.gift-stage');
  const giftHint = $('#giftHint');
  const tapDots = $$('#tapDots i');
  const TAP_TEXT = ['Tap to open ✨', 'Ooh, something is moving… tap again!', 'Almost there… one more tap! ✨'];
  let taps = 0;

  function resetGift() {
    taps = 0;
    gift.dataset.taps = '0';
    gift.classList.remove('open', 'shake');
    giftStage.classList.remove('open');
    giftHint.textContent = TAP_TEXT[0];
    tapDots.forEach((d) => d.classList.remove('on'));
  }

  gift.addEventListener('click', () => {
    if (gift.classList.contains('open')) return;
    audio();
    taps++;
    tapDots.forEach((d, i) => d.classList.toggle('on', i < taps));
    const r = gift.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * .35;

    if (taps < 3) {
      gift.dataset.taps = String(taps);
      gift.classList.remove('shake'); void gift.offsetWidth; gift.classList.add('shake');
      giftHint.textContent = TAP_TEXT[taps];
      sparks(cx, cy, 18 * taps, '#ffd36e');
      vibrate(25 * taps);
      if (AC) tone(660 + taps * 220, AC.currentTime, .25, .12);
      return;
    }

    if (!musicBtn.classList.contains('show')) { musicBtn.classList.add('show'); setMusic(true, 's-wish'); }
    gift.classList.add('open');
    giftStage.classList.add('open');
    giftHint.textContent = 'Ta-da! 🎉';
    vibrate([40, 40, 80]);
    sparks(cx, cy, 80, '#fff');
    setTimeout(() => {
      confetti(cx, cy, 180, 1.4);
      heartBurst(cx, cy, 20);
    }, 300);
    setTimeout(() => go(1), 1700);
  });

  /* ---------- 1 · Wish + balloons ---------- */
  const title = $('#hbdTitle');
  'Happy Birthday'.split('').forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    s.style.animationDelay = `${i * .07}s, ${1 + i * .07}s`;
    title.appendChild(s);
  });

  const balloonLayer = $('#balloons');
  let balloonTimer = null;
  function spawnBalloon() {
    const b = document.createElement('div');
    b.className = 'balloon';
    const c = pick(['#ff5e9c', '#ffd36e', '#9b6bff', '#6ee7ff', '#ff7eb6', '#7dffb3', '#ff8a3d']);
    b.style.background = `radial-gradient(circle at 35% 30%, ${c}cc, ${c})`;
    b.style.borderColor = c;
    b.style.left = rand(2, 82) + '%';
    const sc = rand(.8, 1.15);
    b.style.width = 62 * sc + 'px'; b.style.height = 78 * sc + 'px';
    b.style.animationDuration = rand(7, 11) + 's';
    b.innerHTML = '<span class="knot" style="border-bottom-color:' + c + '"></span>';
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const r = b.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, 40, .7);
      pop(); vibrate(20);
      b.remove();
    });
    b.addEventListener('animationend', () => b.remove());
    balloonLayer.appendChild(b);
  }
  function startBalloons() {
    stopBalloons();
    for (let i = 0; i < 5; i++) setTimeout(spawnBalloon, i * 300);
    balloonTimer = setInterval(spawnBalloon, 1100);
    setTimeout(() => confetti(W / 2, H * .3, 100), 1300);
  }
  function stopBalloons() { clearInterval(balloonTimer); }

  /* ---------- 2 · Cake ---------- */
  const candles = $$('.candle');
  const wishMsg = $('#wishMsg');
  const cakeNext = $('#cakeNext');
  const cakeHint = $('#cakeHint');
  function resetCake() {
    stopBalloons();
    candles.forEach((c) => c.classList.remove('out'));
    wishMsg.classList.remove('show');
    cakeNext.hidden = true;
    cakeHint.style.opacity = 1;
  }
  candles.forEach((c) => c.addEventListener('click', () => {
    if (c.classList.contains('out')) return;
    c.classList.add('out');
    const sm = document.createElement('div');
    sm.className = 'smoke'; c.appendChild(sm);
    setTimeout(() => sm.remove(), 1500);
    audio(); vibrate(15);
    if (candles.every((x) => x.classList.contains('out'))) {
      cakeHint.style.opacity = 0;
      setTimeout(() => {
        wishMsg.classList.add('show');
        chime();
        confetti(W * .2, H * .5, 70); confetti(W * .8, H * .5, 70);
        const r = $('.cake').getBoundingClientRect();
        heartBurst(r.left + r.width / 2, r.top, 18);
      }, 500);
      setTimeout(() => { cakeNext.hidden = false; }, 2200);
    }
  }));

  /* ---------- 3 · Photos ---------- */
  const PHOTOS = [
    'That smile could light up a whole city',
    'Flower in your hair, sunshine on your face',
    'Butterflies seem to like you too',
    'Pretty in black & white',
    "Careful… she's armed with a belan! Don't let that cute smile fool you 😇🙈",
    'A little sparkle, a lot of cute',
    'Those eyes say everything',
    'Cutest pout award 🏆',
    'Thinking about cake, probably',
    'Sunflowers & smiles',
    'Simply lovely',
    'Red lips, pink flower, all style',
    'Sunglasses on, attitude on 😎',
    'That little smile does magic ✨',
    'Never stop being you',
  ];
  // caption i belongs to photos/komo-(i+1).jpg
  const stack = $('#stack');
  const counter = $('#counter');
  let deck = [], seen = 0, built = false;

  function layout() {
    deck.forEach((card, i) => {
      const depth = deck.length - 1 - i; // 0 = top
      card.style.zIndex = i;
      const rot = card._rot;
      card.style.transform = depth < 4
        ? `translate(${depth * 4}px, ${depth * 6}px) rotate(${rot * (depth ? 1 : .3)}deg) scale(${1 - depth * .03})`
        : `translate(12px, 18px) rotate(${rot}deg) scale(.9)`;
      card.style.opacity = depth < 4 ? 1 : 0;
    });
    counter.textContent = `${Math.min(seen + 1, PHOTOS.length)} / ${PHOTOS.length}`;
  }

  function buildStack() {
    if (built) { layout(); return; }
    built = true;
    PHOTOS.forEach((en, idx) => {
      const n = String(idx + 1).padStart(2, '0');
      const card = document.createElement('div');
      card.className = 'card';
      card._rot = rand(-7, 7);
      const src = `photos/komo-${n}.jpg`;
      card.innerHTML = `<div class="ph" style="--bg:url('${src}')"><img src="${src}" alt="Komo photo ${idx + 1}" loading="eager" draggable="false"></div><p class="cap">${en}</p>`;
      const img = card.querySelector('img');
      // where to anchor the crop (x% y%): faces sit high in most photos
      const FOCUS = { 13: '50% 0%' };
      img.style.objectPosition = FOCUS[idx + 1] || '50% 25%';
      const fit = () => { if (img.naturalWidth > img.naturalHeight) card.classList.add('wide'); };
      if (img.complete && img.naturalWidth) fit(); else img.addEventListener('load', fit);
      deck.unshift(card); // first photo ends on top
      stack.appendChild(card);
    });
    deck.forEach((c, i) => { c.style.zIndex = i; stack.appendChild(c); });
    layout();
    enableDrag();
  }

  function sendTopToBack(dir = 1) {
    const top = deck[deck.length - 1];
    top.style.transform = `translate(${dir * W}px, -40px) rotate(${dir * 30}deg)`;
    top.style.opacity = 0;
    vibrate(10);
    setTimeout(() => {
      deck.pop(); deck.unshift(top);
      seen = (seen + 1) % PHOTOS.length;
      if (seen === 0) { const r = stack.getBoundingClientRect(); heartBurst(r.left + r.width / 2, r.top + r.height / 2, 20); }
      top.style.transition = 'none';
      layout();
      void top.offsetWidth;
      top.style.transition = '';
    }, 350);
  }

  function enableDrag() {
    let sx = 0, sy = 0, dx = 0, dy = 0, active = null, moved = false;
    stack.addEventListener('pointerdown', (e) => {
      const top = deck[deck.length - 1];
      if (!top.contains(e.target)) return;
      active = top; sx = e.clientX; sy = e.clientY; dx = dy = 0; moved = false;
      top.classList.add('dragging');
      top.setPointerCapture(e.pointerId);
    });
    stack.addEventListener('pointermove', (e) => {
      if (!active) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      active.style.transform = `translate(${dx}px, ${dy * .4}px) rotate(${dx * .06}deg)`;
    });
    const end = () => {
      if (!active) return;
      const card = active; active = null;
      card.classList.remove('dragging');
      if (!moved || Math.abs(dx) > 70) sendTopToBack(dx < 0 ? -1 : 1);
      else layout();
    };
    stack.addEventListener('pointerup', end);
    stack.addEventListener('pointercancel', end);
  }

  /* ---------- 4 · Letter ---------- */
  const LETTER = [
    'Dear Komo,',
    '',
    'Today the whole world got a little brighter, because today is your day. 🌸',
    '',
    "Some people just make the world more fun, and you're definitely one of them. You're kind, a little crazy, full of life, and somehow you make even normal days feel special. Stay exactly like this! ✨",
    '',
    'May this year bring you everything your heart wishes for, and a little extra. Keep smiling, keep shining, and never stop being exactly you.',
    '',
    'Happy Birthday! 🎂💖',
    '',
    '— Panda 🐼',
  ];
  const envelope = $('#envelope');
  const letter = $('#letter');
  const letterBody = $('#letterBody');
  const letterNext = $('#letterNext');
  const envHint = $('#envHint');
  let typing = null, typedDone = false;

  function resetLetter() {
    clearTimeout(typing);
    envelope.classList.remove('open', 'gone');
    letter.classList.remove('show');
    letterBody.innerHTML = '';
    letterNext.hidden = true;
    envHint.style.opacity = 1;
    typedDone = false;
  }

  envelope.addEventListener('click', () => {
    if (envelope.classList.contains('open')) return;
    envelope.classList.add('open');
    chime(); vibrate(20);
    const r = envelope.getBoundingClientRect();
    heartBurst(r.left + r.width / 2, r.top, 14);
    setTimeout(() => { envelope.classList.add('gone'); envHint.style.opacity = 0; }, 1100);
    setTimeout(() => { letter.classList.add('show'); typeLetter(); }, 1400);
  });

  function typeLetter() {
    // Type by grapheme cluster so emoji never break mid-glyph
    const seg = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
    const split = (s) => seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s);
    let li = 0, ci = 0, line = null, chars = [];
    const caret = document.createElement('span'); caret.className = 'caret';

    function nextLine() {
      if (li >= LETTER.length) { caret.remove(); finish(); return; }
      const txt = LETTER[li];
      if (txt === '~') { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '✿ ❀ ✿'; letterBody.appendChild(s); li++; typing = setTimeout(nextLine, 300); return; }
      line = document.createElement('div');
      if (txt === '') line.innerHTML = '&nbsp;';
      letterBody.appendChild(line);
      chars = split(txt); ci = 0; li++;
      step();
    }
    function step() {
      if (ci < chars.length) {
        line.textContent += chars[ci++];
        line.appendChild(caret);
        letter.scrollTop = letter.scrollHeight;
        typing = setTimeout(step, chars[ci - 1].match(/[.,!]/) ? 220 : 38);
      } else {
        typing = setTimeout(nextLine, 160);
      }
    }
    nextLine();
  }
  function finish() {
    if (typedDone) return;
    typedDone = true;
    letterNext.hidden = false;
  }
  letter.addEventListener('click', () => { // tap to skip typing
    if (typedDone || !letter.classList.contains('show')) return;
    clearTimeout(typing);
    letterBody.innerHTML = '';
    LETTER.forEach((t) => {
      const d = document.createElement(t === '~' ? 'span' : 'div');
      if (t === '~') { d.className = 'sep'; d.textContent = '✿ ❀ ✿'; } else if (t === '') d.innerHTML = '&nbsp;'; else d.textContent = t;
      letterBody.appendChild(d);
    });
    finish();
  });

  /* ---------- 5 · Finale ---------- */
  // Countdown to her next birthday, shown on the home screen and the final screen.
  const cdWidgets = $$('.countdown').map((w) => ({
    label: $('.cd-label', w),
    boxes: $('.cd-boxes', w),
    els: { d: $('[data-cd="d"]', w), h: $('[data-cd="h"]', w), m: $('[data-cd="m"]', w), s: $('[data-cd="s"]', w) },
  }));
  function updateCountdown() {
    const now = new Date();
    const today = isBirthdayToday(now);
    let vals = null;
    if (!today) {
      const y = now.getFullYear();
      const thisYear = new Date(y, BDAY_MONTH, BDAY_DAY);
      const next = now < thisYear ? thisYear : new Date(y + 1, BDAY_MONTH, BDAY_DAY);
      const secs = Math.max(0, Math.floor((next - now) / 1000));
      vals = {
        d: Math.floor(secs / 86400),
        h: Math.floor((secs % 86400) / 3600),
        m: Math.floor((secs % 3600) / 60),
        s: secs % 60,
      };
    }
    for (const w of cdWidgets) {
      w.boxes.hidden = today;
      w.label.textContent = today ? "It's your birthday today! 🎉" : 'Next birthday in 🎂';
      if (today) continue;
      for (const k of Object.keys(vals)) {
        const txt = k === 'd' ? String(vals[k]) : String(vals[k]).padStart(2, '0');
        const el = w.els[k];
        if (el.textContent !== txt) {
          el.textContent = txt;
          el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
        }
      }
    }
  }
  updateCountdown();
  setInterval(() => { if (homeActive || scenes[cur].id === 's-final') updateCountdown(); }, 1000);

  const finalScene = $('#s-final');
  finalScene.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    audio();
    rocket(e.clientX, e.clientY);
    if (Math.random() < .35) heartBurst(e.clientX, e.clientY, 8);
  });
  $('#replay').addEventListener('click', (e) => {
    e.stopPropagation();
    go(0);
  });
})();
