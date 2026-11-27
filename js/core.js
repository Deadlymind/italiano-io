/* ITALIANO.IO — nucleo: utilità, suoni, coriandoli, timer, salvataggio e gestore dei turni */
window.IO = window.IO || {};
(function (IO) {
  'use strict';

  /* ---------- utilità ---------- */
  const U = IO.U = {};
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.rand = n => Math.floor(Math.random() * n);
  U.pick = a => a[U.rand(a.length)];
  U.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = U.rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.lvl = l => IO.LEVELS.indexOf(l);
  U.clone = o => JSON.parse(JSON.stringify(o));
  U.toast = (msg, ms = 2200) => {
    const t = U.$('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(U._tt); U._tt = setTimeout(() => t.classList.remove('show'), ms);
  };
  /* pick from a level-tagged pool: prefer the exact level, widen downwards when it runs out */
  U.pickByLevel = (pool, level, usedKeys, keyFn) => {
    const L = U.lvl(level);
    const fresh = pool.filter(x => !usedKeys.has(keyFn(x)));
    const exact = fresh.filter(x => U.lvl(x.l) === L);
    if (exact.length) return U.pick(exact);
    for (let d = 1; d < 6; d++) { // nearest lower level first
      const near = fresh.filter(x => U.lvl(x.l) === L - d);
      if (near.length) return U.pick(near);
    }
    const up = fresh.filter(x => U.lvl(x.l) === L + 1);
    if (up.length) return U.pick(up);
    return null; // exhausted
  };

  /* ---------- icone ---------- */
  const P = {
    check: '<path d="M4 12.5l5 5L20 6.5" stroke-width="3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke-width="3"/>',
    half: '<path d="M12 3a9 9 0 1 0 0 18z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    skip: '<path d="M5 5l9 7-9 7zM18 5v14" />',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    home: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
    slow: '<path d="M7 4l13 8-13 8z" fill="currentColor"/><path d="M2 4v16" stroke-width="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-width="3"/>'
  };
  U.icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------- suoni (sintetizzati, nessun file) ---------- */
  const S = IO.Sound = { on: localStorage.getItem('io.sound') !== '0' };
  let ctx;
  function tone(freq, t0, dur, type = 'sine', vol = .18) {
    if (!S.on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + t0);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + .01);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t0 + dur);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + .05);
    } catch (e) { /* audio non disponibile */ }
  }
  S.ok = () => { tone(523, 0, .15, 'triangle'); tone(659, .1, .15, 'triangle'); tone(784, .2, .3, 'triangle'); };
  S.no = () => { tone(180, 0, .35, 'sawtooth', .12); tone(140, .15, .45, 'sawtooth', .12); };
  S.tick = () => tone(880, 0, .06, 'square', .05);
  S.turn = () => { tone(392, 0, .12, 'triangle', .12); tone(587, .09, .2, 'triangle', .12); };
  S.up = () => tone(988, 0, .1, 'triangle', .12);
  S.buzz = () => tone(110, 0, .7, 'square', .1);
  S.steal = () => { [440, 554, 659, 880].forEach((f, i) => tone(f, i * .07, .12, 'square', .07)); };
  S.win = () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .14, .3, 'triangle', .16)); };
  S.toggle = () => { S.on = !S.on; localStorage.setItem('io.sound', S.on ? '1' : '0'); return S.on; };

  /* ---------- coriandoli ---------- */
  IO.confetti = function (ms = 4500) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = U.$('#confetti'), c = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#E8402F', '#3D8BFF', '#1FAE5B', '#FFC21A', '#FFFFFF', '#9B5CF6'];
    const ps = Array.from({ length: 220 }, () => ({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .6, w: 7 + Math.random() * 9, h: 10 + Math.random() * 12,
      vx: -2 + Math.random() * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: -.2 + Math.random() * .4, c: U.pick(cols)
    }));
    const end = performance.now() + ms;
    (function frame(t) {
      c.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .04; p.r += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r))); c.restore();
      });
      if (t < end) requestAnimationFrame(frame); else c.clearRect(0, 0, cv.width, cv.height);
    })(performance.now());
  };

  /* ---------- timer del turno ---------- */
  IO.Timer = {
    total: 0, left: 0, id: null, onEnd: null, onTick: null,
    start(sec, onTick, onEnd) {
      this.stop(); this.total = sec; this.left = sec; this.onTick = onTick; this.onEnd = onEnd;
      onTick && onTick(this);
      if (sec) this._run();
    },
    _run() {
      this.id = setInterval(() => {
        this.left--; this.onTick && this.onTick(this);
        if (this.left <= 5 && this.left > 0) S.tick();
        if (this.left <= 0) { this.stop(); S.buzz(); this.onEnd && this.onEnd(); }
      }, 1000);
    },
    stop() { clearInterval(this.id); this.id = null; },
    pause() { this.stop(); },
    resume() { if (this.left > 0 && this.total && !this.id) this._run(); }
  };

  /* ---------- salvataggio ---------- */
  const KEY = 'italianoio.match.v1';
  IO.Store = {
    save(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { } },
    load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    clear() { localStorage.removeItem(KEY); },
    lastConfig() { try { return JSON.parse(localStorage.getItem('italianoio.lastconfig')); } catch (e) { return null; } },
    saveConfig(c) { localStorage.setItem('italianoio.lastconfig', JSON.stringify(c)); }
  };

  /* ---------- gestore dei turni ----------
     Ogni round ogni squadra attiva gioca un turno; la squadra che apre il round ruota
     (round 1: squadra 1, round 2: squadra 2, ...), così l'ordine resta equo. */
  const M = IO.Match = {};
  M.create = function (cfg) {
    const teams = cfg.teams.map(t => ({
      name: t.name, color: t.color, members: (t.members || []).filter(Boolean), mi: 0,
      score: 0, lives: cfg.format === 'eliminazione' ? cfg.lives : null, out: false, c: 0, w: 0, bet: 0, mark: null
    }));
    const m = { cfg, teams, round: 1, slot: 0, order: [], cur: 0, phase: 'play', q: null, qs: {}, used: {}, log: [], started: Date.now() };
    m.order = M.buildOrder(m, 1); m.cur = m.order[0];
    return m;
  };
  M.active = m => m.teams.map((t, i) => i).filter(i => !m.teams[i].out);
  M.buildOrder = function (m, round) {
    const act = M.active(m); if (!act.length) return [];
    const off = (round - 1) % act.length;
    return act.slice(off).concat(act.slice(0, off));
  };
  M.member = (m, i) => { const t = m.teams[i]; return t.members.length ? t.members[t.mi % t.members.length] : null; };
  M.value = m => {
    const base = m.qs.valueOverride != null ? m.qs.valueOverride : m.cfg.points;
    return m.qs.hinted ? Math.ceil(base / 2) : base;
  };
  M.award = function (m, i, pts, why) {
    m.teams[i].score += pts; m.log.push({ t: i, d: pts, why, r: m.round });
  };
  /* returns an event descriptor for the UI */
  M.judge = function (m, res) {
    const i = m.cur, t = m.teams[i], v = M.value(m);
    if (res === 'ok') { M.award(m, i, v, 'corretta'); t.c++; return { type: 'ok', team: i, pts: v }; }
    if (res === 'half') { const h = Math.max(1, Math.round(v / 2)); M.award(m, i, h, 'parziale'); t.c++; return { type: 'half', team: i, pts: h }; }
    // sbagliata
    t.w++;
    let elim = false;
    if (m.cfg.format === 'eliminazione') { t.lives--; if (t.lives <= 0) { t.out = true; elim = true; } }
    const others = M.active(m).filter(x => x !== i);
    if (m.cfg.format === 'ruba' && others.length) { m.phase = 'steal'; return { type: 'no', team: i, steal: true }; }
    return { type: 'no', team: i, elim };
  };
  M.steal = function (m, thief) {
    m.phase = 'play';
    if (thief == null) return { type: 'nosteal' };
    const pts = M.value(m) + (m.cfg.stealBonus || 0);
    M.award(m, thief, pts, 'ruba-punti'); m.teams[thief].c++;
    return { type: 'steal', team: thief, pts };
  };
  /* move to the next turn; returns 'next' | 'final' | 'over' */
  M.next = function (m) {
    const t = m.teams[m.cur];
    if (t.members.length) t.mi = (t.mi + 1) % t.members.length;
    if (m.cfg.format === 'eliminazione' && M.active(m).length <= 1) { m.phase = 'over'; return 'over'; }
    m.slot++;
    // skip teams eliminated during this round
    while (m.slot < m.order.length && m.teams[m.order[m.slot]].out) m.slot++;
    if (m.slot >= m.order.length) {
      m.round++;
      if (m.round > m.cfg.rounds) {
        if (m.cfg.format === 'finale' && M.active(m).length > 1) { m.phase = 'final-bet'; m.round = m.cfg.rounds; m.teams.forEach(x => { x.bet = Math.min(x.score, Math.max(10, Math.round(x.score / 2 / 5) * 5)); x.mark = null; }); return 'final'; }
        m.phase = 'over'; m.round = m.cfg.rounds; return 'over';
      }
      m.order = M.buildOrder(m, m.round); m.slot = 0;
    }
    m.cur = m.order[m.slot];
    return 'next';
  };
  M.finalSettle = function (m) {
    m.teams.forEach((t, i) => { if (t.out) return; if (t.mark === 'y') M.award(m, i, t.bet, 'sfida finale'); else if (t.mark === 'n') M.award(m, i, -t.bet, 'sfida finale'); });
    m.phase = 'over';
  };
  M.ranking = m => m.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score || b.c - a.c);
  M.progress = m => {
    const per = Math.max(1, m.order.length);
    return Math.min(1, ((m.round - 1) * per + m.slot) / (m.cfg.rounds * per));
  };
})(window.IO);
