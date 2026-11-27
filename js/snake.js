/* ITALIANO.IO — Serpente delle parole: un giocatore per squadra guida il serpente e mangia solo le parole giuste */
window.IO = window.IO || {};
(function (IO) {
  'use strict';
  const U = IO.U, VB = IO.VerbEngine, esc = U.esc;
  const COLS = 20, ROWS = 11;
  const SPEED = { A1: 165, A2: 150, B1: 135, B2: 120, C1: 110, C2: 100 };
  const SIMPLE = ['pres', 'imperf', 'fut', 'cond', 'cpres', 'cimpf', 'pr'];

  function buildTask(m) {
    const L = U.lvl(m.cfg.level), kind0 = m.cfg.opt.sk || 'misto';
    const kinds = kind0 !== 'misto' ? [kind0] : (L === 0 ? ['cat', 'genere'] : L === 1 ? ['cat', 'genere', 'tempi'] : ['cat', 'tempi', 'participi', 'genere']);
    for (let tries = 0; tries < 30; tries++) {
      const kind = U.pick(kinds);
      if (kind === 'cat') {
        const vocab = IO.VOCAB.filter(w => U.lvl(w.l) <= Math.max(L, 1));
        const cats = Object.keys(IO.VOCAB_CATS).filter(c => vocab.filter(w => w.c === c).length >= 5);
        const c = U.pick(cats);
        return { prompt: `Mangia solo: ${IO.VOCAB_CATS[c].toLowerCase()}`, good: vocab.filter(w => w.c === c).map(w => w.w), bad: vocab.filter(w => w.c !== c).map(w => w.w) };
      }
      if (kind === 'genere') {
        const nouns = IO.VOCAB.filter(w => w.g && U.lvl(w.l) <= Math.max(L, 1));
        const fem = Math.random() < .5;
        return { prompt: `Mangia solo i nomi ${fem ? 'femminili' : 'maschili'}`, good: nouns.filter(w => (w.g === 'f') === fem).map(w => w.w), bad: nouns.filter(w => (w.g === 'f') !== fem).map(w => w.w) };
      }
      if (kind === 'tempi') {
        const tenses = VB.LEVEL_TENSES[m.cfg.level].filter(t => SIMPLE.includes(t));
        const avail = tenses.length > 1 ? tenses : ['pres', 'imperf', 'fut'];
        const T = U.pick(avail);
        const pool = VB.pool(IO.LEVELS[Math.max(1, Math.min(L, 3))], 'tutti').filter(i => !VB.isReflexive(IO.VERBS[i]));
        const good = new Set(), bad = new Set();
        for (let k = 0; k < 40; k++) {
          const v = IO.VERBS[U.pick(pool)];
          const others = SIMPLE.filter(t => t !== T).flatMap(t => v[t]);
          const g = v[T][U.rand(6)]; if (g && !others.includes(g)) good.add(g);
          const ot = U.pick(avail.filter(t => t !== T).concat(['pres']).filter(t => t !== T));
          const b = v[ot][U.rand(6)]; if (b && !v[T].includes(b)) bad.add(b);
        }
        return { prompt: `Mangia solo le forme del ${VB.TENSES[T].n.toLowerCase()}`, good: [...good], bad: [...bad] };
      }
      if (kind === 'participi') {
        const pool = VB.pool(IO.LEVELS[Math.min(L, 4)], 'tutti').map(i => IO.VERBS[i]).filter(v => !VB.isReflexive(v) && v.p && v.p !== '-');
        return { prompt: 'Mangia solo i participi passati irregolari', good: pool.filter(v => !v.rpa).map(v => v.p), bad: pool.filter(v => v.rpa).map(v => v.p) };
      }
    }
  }

  IO.Games.snake = {
    id: 'snake', name: 'Serpente delle parole', glyph: '🐍', color: 'var(--t-verde)',
    desc: 'A turno, un giocatore per squadra guida il serpente: mangia solo le parole giuste.',
    noTurnTimer: true,
    options: [{ key: 'sk', label: 'Parole da mangiare', choices: () => [{ v: 'misto', l: 'Misto (secondo il livello)' }, { v: 'cat', l: 'Categorie di parole' }, { v: 'genere', l: 'Maschile / femminile' }, { v: 'tempi', l: 'Tempi verbali' }, { v: 'participi', l: 'Participi irregolari' }] }],
    make(m) {
      const t = buildTask(m);
      return { kind: 'snake', key: 'sn' + Date.now(), ...t, secs: m.cfg.timer || 45, done: false };
    },
    render(q, el, api) {
      el.innerHTML = `
        <div class="snake-prompt"><div class="p">${esc(q.prompt)}</div>
          <div class="snake-stats"><span class="g">✓ <b data-s="g">0</b></span><span class="b">✗ <b data-s="b">0</b></span><span class="t">⏱ <b data-s="t">${q.secs}</b></span></div></div>
        <div class="snake-row"><div class="snake-wrap"><canvas></canvas>
          <div class="snake-cover"><div><h3>${q.done ? 'Turno finito' : 'Pronti?'}</h3>
            <p style="font-size:1.3rem;margin:0 0 1rem">${q.done ? esc(q.summary) : `${esc(api.player())}: guida il serpente con le frecce (o W A S D).<br>Parola giusta +1, parola sbagliata −1, scontro −1.`}</p>
            ${q.done ? '' : '<button class="btn gold big" data-go>Via!</button>'}</div></div></div>
        <div class="snake-pad" aria-label="Comandi">
          <span></span><button data-d="0,-1" aria-label="Su">▲</button><span></span>
          <button data-d="-1,0" aria-label="Sinistra">◀</button><button data-d="0,1" aria-label="Giù">▼</button><button data-d="1,0" aria-label="Destra">▶</button>
        </div></div>
        <div class="extra"></div>`;
      drawStatic(el);
      if (!q.done) el.querySelector('[data-go]').onclick = () => run(q, el, api);
    },
    hint() { return 'Nel serpente non ci sono suggerimenti: osserva bene le parole!'; },
    reveal(q, el) {
      const ex = el.querySelector('.extra');
      ex.innerHTML = `<div class="answer" style="font-size:1.3rem">Parole giuste: ${q.good.slice(0, 14).map(esc).join(', ')}${q.good.length > 14 ? '…' : ''}</div>`;
    }
  };

  function boardWidth(cv) { const card = cv.closest('.qcard'); return Math.floor(Math.min(card.clientWidth * 0.8, innerHeight * 0.385 / ROWS * COLS)); }
  function drawStatic(el) {
    const cv = el.querySelector('canvas'), w = boardWidth(cv);
    cv.width = w; cv.height = Math.round(w / COLS * ROWS); cv.style.width = w + 'px'; cv.style.height = cv.height + 'px';
  }

  function run(q, el, api) {
    const cv = el.querySelector('canvas'), cover = el.querySelector('.snake-cover');
    cover.classList.add('hidden');
    const dpr = window.devicePixelRatio || 1;
    const W = boardWidth(cv);
    const cell = W / COLS;
    cv.width = W * dpr; cv.height = cell * ROWS * dpr; cv.style.width = W + 'px'; cv.style.height = cell * ROWS + 'px';
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const font = `700 ${Math.round(cell * .6)}px 'Bricolage Grotesque', 'Segoe UI', sans-serif`;
    c.font = font;
    const color = getComputedStyle(document.documentElement).getPropertyValue(api.teamColor().replace(/var\((--[^)]+)\)/, '$1')).trim() || '#3D8BFF';

    let snake = [], dir = [1, 0], nextDir = [1, 0], grow = 0, words = [], good = 0, bad = 0, crash = 0, flash = 0;
    let left = q.secs, alive = true;
    const goodQ = U.shuffle(q.good), badQ = U.shuffle(q.bad);
    let gi = 0, bi = 0;
    function reset() { const y = Math.floor(ROWS / 2); snake = [[5, y], [4, y], [3, y], [2, y]]; dir = [1, 0]; nextDir = [1, 0]; }
    reset();
    const occupied = (x, y) => snake.some(s => s[0] === x && s[1] === y) || words.some(w => w.y === y && x >= w.x - 1 && x <= w.x + w.len);
    function spawn(isGood) {
      const text = isGood ? goodQ[gi++ % goodQ.length] : badQ[bi++ % badQ.length];
      const len = Math.max(2, Math.ceil((c.measureText(text).width + cell * .6) / cell));
      for (let t = 0; t < 200; t++) {
        const x = 1 + U.rand(COLS - len - 1), y = U.rand(ROWS);
        const head = snake[0];
        if (Math.abs(head[1] - y) < 2 && Math.abs(head[0] - x) < 6) continue;
        let free = true; for (let k = -1; k <= len; k++) if (occupied(x + k, y) || words.some(w => Math.abs(w.y - y) < 1 && x + k >= w.x - 1 && x + k <= w.x + w.len)) { free = false; break; }
        if (free) { words.push({ text, good: isGood, x, y, len }); return; }
      }
    }
    function refill() {
      while (words.filter(w => w.good).length < 3) spawn(true);
      while (words.filter(w => !w.good).length < 3) spawn(false);
    }
    refill();
    const stat = k => el.querySelector(`[data-s=${k}]`);

    function step() {
      if (!alive) return;
      dir = nextDir;
      const h = snake[0];
      const nx = (h[0] + dir[0] + COLS) % COLS, ny = (h[1] + dir[1] + ROWS) % ROWS;
      if (snake.slice(0, -1).some(s => s[0] === nx && s[1] === ny)) { crash++; IO.Sound.no(); flash = 8; reset(); return; }
      snake.unshift([nx, ny]);
      const wi = words.findIndex(w => w.y === ny && nx >= w.x && nx < w.x + w.len);
      if (wi >= 0) {
        const w = words.splice(wi, 1)[0];
        if (w.good) { good++; grow += 2; IO.Sound.up(); } else { bad++; IO.Sound.no(); flash = 8; for (let k = 0; k < 2 && snake.length > 3; k++) snake.pop(); }
        stat('g').textContent = good; stat('b').textContent = bad;
        setTimeout(refill, 250);
      }
      if (grow > 0) grow--; else snake.pop();
    }
    function draw() {
      const H = cell * ROWS;
      c.fillStyle = flash > 0 ? '#3A1630' : '#0E1D52'; c.fillRect(0, 0, W, H); if (flash > 0) flash--;
      c.fillStyle = 'rgba(255,255,255,.045)';
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2) c.fillRect(x * cell, y * cell, cell, cell);
      c.font = font; c.textBaseline = 'middle'; c.textAlign = 'center';
      words.forEach(w => {
        const x = w.x * cell + 2, y = w.y * cell + 2, ww = w.len * cell - 4, hh = cell - 4;
        c.fillStyle = '#FFFFFF'; roundRect(c, x, y, ww, hh, cell * .3); c.fill();
        c.fillStyle = '#0E1330'; c.fillText(w.text, x + ww / 2, y + hh / 2 + 1);
      });
      snake.forEach((s, i) => {
        c.fillStyle = i === 0 ? '#FFC21A' : color;
        roundRect(c, s[0] * cell + 2, s[1] * cell + 2, cell - 4, cell - 4, cell * .28); c.fill();
      });
      const h = snake[0]; c.fillStyle = '#0E1330';
      c.beginPath(); c.arc(h[0] * cell + cell / 2 + dir[0] * cell * .18 - dir[1] * cell * .16, h[1] * cell + cell / 2 + dir[1] * cell * .18 - dir[0] * cell * .16, cell * .09, 0, 7); c.fill();
      c.beginPath(); c.arc(h[0] * cell + cell / 2 + dir[0] * cell * .18 + dir[1] * cell * .16, h[1] * cell + cell / 2 + dir[1] * cell * .18 + dir[0] * cell * .16, cell * .09, 0, 7); c.fill();
    }
    const setDir = (dx, dy) => { if (dx === -dir[0] && dy === -dir[1]) return; nextDir = [dx, dy]; };
    const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
    const onKey = e => { const d = KEYS[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); setDir(d[0], d[1]); } };
    window.addEventListener('keydown', onKey, true);
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [x, y] = b.dataset.d.split(',').map(Number); setDir(x, y); });
    api.setCapture(true);

    const tickMs = SPEED[api.level()] || 140;
    const loop = setInterval(() => { if (api.paused()) return; step(); draw(); }, tickMs);
    const clock = setInterval(() => {
      if (api.paused()) return;
      left--; stat('t').textContent = left;
      if (left <= 5 && left > 0) IO.Sound.tick();
      if (left <= 0) finish();
    }, 1000);
    draw();

    function finish() {
      alive = false; clearInterval(loop); clearInterval(clock);
      window.removeEventListener('keydown', onKey, true); api.setCapture(false);
      IO.Sound.buzz();
      const net = Math.max(0, good - bad - crash);
      const per = Math.max(1, Math.round(api.points() / 5));
      const pts = net * per;
      q.done = true; q.result = { good, bad, crash, pts };
      q.summary = `Giuste ${good}, sbagliate ${bad}, scontri ${crash}: ${net} parole nette = ${pts} punti`;
      cover.classList.remove('hidden');
      cover.innerHTML = `<div><h3>Tempo scaduto!</h3><p style="font-size:1.4rem;margin:0">${esc(q.summary)}</p><p style="margin:.8rem 0 0;color:#C9D4F5">Conferma i punti con «Corretta», oppure correggili sul podio.</p></div>`;
      api.proposeValue(pts);
      api.suggest(pts > 0 ? 'ok' : 'no');
    }
    q.stop = () => { if (alive) { alive = false; clearInterval(loop); clearInterval(clock); window.removeEventListener('keydown', onKey, true); api.setCapture(false); } };
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
})(window.IO);
