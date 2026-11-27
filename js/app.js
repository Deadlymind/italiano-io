/* ITALIANO.IO — schermate, gestione della sfida e comandi dell'insegnante */
window.IO = window.IO || {};
(function (IO) {
  'use strict';
  const U = IO.U, M = IO.Match, G = IO.Games, S = IO.Sound, esc = U.esc, icon = U.icon;
  const app = U.$('#app');
  const A = IO.App = { m: null, undo: [], capture: false, nextTimer: null };

  const TEAM_PRESETS = [
    { name: 'Squadra Rossa', color: 'var(--t-rosso)' }, { name: 'Squadra Blu', color: 'var(--t-blu)' },
    { name: 'Squadra Verde', color: 'var(--t-verde)' }, { name: 'Squadra Gialla', color: 'var(--t-giallo)' }
  ];
  const FORMATS = {
    alternata: { n: 'Alternata', d: 'Le squadre rispondono una dopo l\'altra. Risposta giusta, punti.' },
    ruba: { n: 'Ruba-punti', d: 'Se una squadra sbaglia, un\'altra può rubare la domanda e prendere un bonus.' },
    finale: { n: 'Sfida finale', d: 'Dopo i round, ogni squadra scommette i suoi punti su una domanda difficile.' },
    staffetta: { n: 'Staffetta', d: 'In ogni squadra risponde un compagno diverso a ogni turno.' },
    eliminazione: { n: 'Eliminazione', d: 'Ogni squadra ha delle vite: dopo troppi errori è fuori.' }
  };
  const LANGS = { ar: 'Arabo', en: 'Inglese', none: 'Nessuna' };

  /* ======================= HOME ======================= */
  A.home = function () {
    clearTransient();
    const saved = IO.Store.load();
    const resume = saved && saved.phase !== 'over' ? `
      <div class="resume">
        <strong>Sfida in corso: ${esc(G[saved.cfg.game].name)}</strong>
        <span>Round ${saved.round} di ${saved.cfg.rounds}: ${saved.teams.map(t => `${esc(t.name)} ${t.score}`).join(', ')}</span>
        <div class="row"><button class="btn" data-resume>${icon('play')} Riprendi la sfida</button><button class="btn ghost" data-discard>Elimina</button></div>
      </div>` : '';
    app.innerHTML = `
      <main class="home">
        <header class="home-head">
          <div><h1 class="logo display">italiano<span class="dot">.</span>io</h1>
          <p>Il quiz show della tua classe. Tu conduci, il proiettore è lo schermo, gli studenti sono i concorrenti.</p></div>
          ${resume}
        </header>
        <section class="games" aria-label="Scegli il gioco">
          ${G.ORDER.map(id => { const g = G[id]; return `<button class="game-tile" style="--c:${g.color}" data-game="${id}"><span class="glyph" aria-hidden="true">${g.glyph}</span><span><h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p></span></button>`; }).join('')}
        </section>
        <footer class="home-foot">
          <span>Banca verbi: ${IO.VERBS.length} verbi con tutte le coniugazioni, ricontrollati e corretti.</span>
          <span>Scorciatoie in gioco: C corretta, X sbagliata, M metà punti, H suggerimento, R risposta, S salta, T cambia turno, P pausa, U annulla, F schermo intero.</span>
        </footer>
      </main>`;
    U.$$('[data-game]').forEach(b => b.onclick = () => A.setup(b.dataset.game));
    const r = U.$('[data-resume]'); if (r) r.onclick = () => A.resume(saved);
    const d = U.$('[data-discard]'); if (d) d.onclick = () => { IO.Store.clear(); A.home(); };
  };

  /* ======================= SETUP ======================= */
  A.setup = function (gameId, preset) {
    clearTransient();
    const last = IO.Store.lastConfig();
    const c = preset || Object.assign({
      kind: 'squadre', nTeams: 2, format: 'alternata', level: 'A2', lang: 'ar', rounds: 6, timer: 30, points: 10, stealBonus: 5, lives: 3, autoNext: true,
      teams: TEAM_PRESETS.map(t => ({ ...t, members: [] })), duel: ['', ''], classList: '', opt: {}
    }, last ? { kind: last.kind, nTeams: last.nTeams, format: last.format, level: last.level, lang: last.lang, rounds: last.rounds, timer: last.timer, autoNext: last.autoNext, lives: last.lives, teams: last._teams || TEAM_PRESETS.map(t => ({ ...t, members: [] })), duel: last._duel || ['', ''], classList: last._classList || '' } : {});
    c.game = gameId; c.opt = c.game === (last && last.game) && last.opt ? { ...last.opt } : {};
    const g = G[gameId];

    function draw() {
      const opts = g.options.map(o => {
        const ch = o.choices(c.level);
        if (!ch.some(x => x.v === c.opt[o.key])) c.opt[o.key] = ch[0].v;
        return `<div class="field"><label for="opt-${o.key}">${esc(o.label)}</label><select id="opt-${o.key}" data-opt="${o.key}">${ch.map(x => `<option value="${esc(x.v)}" ${x.v === c.opt[o.key] ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</select></div>`;
      }).join('');
      app.innerHTML = `
      <main class="setup">
        <div class="topbar"><div class="mini-logo">italiano<span class="dot">.</span>io</div><button class="btn ghost" data-back>${icon('home')} Menu</button></div>
        <h1 class="display">${g.glyph} ${esc(g.name)}</h1>
        <p class="lead">${esc(g.desc)} Prepara la sfida e premi «Inizia la sfida».</p>

        <section class="step"><h2><span class="n">1</span> Chi gioca</h2>
          <div class="choice-row" role="group" aria-label="Partecipanti">
            ${[['duello', 'Due studenti'], ['squadre', 'Squadre'], ['classe', 'Tutta la classe']].map(([v, l]) => `<button class="chip" data-kind="${v}" aria-pressed="${c.kind === v}">${l}</button>`).join('')}
            ${c.kind !== 'duello' ? `<span style="width:1.5rem"></span>${[2, 3, 4].map(n => `<button class="chip" data-nt="${n}" aria-pressed="${c.nTeams === n}">${n} squadre</button>`).join('')}` : ''}
          </div>
          ${c.kind === 'duello' ? `<div class="teams-edit">${[0, 1].map(i => `<div class="team-edit" style="--c:${TEAM_PRESETS[i].color}"><label for="d${i}">Studente ${i + 1}</label><input id="d${i}" data-duel="${i}" value="${esc(c.duel[i])}" placeholder="Nome dello studente"></div>`).join('')}</div>` : ''}
          ${c.kind === 'squadre' ? `<div class="teams-edit">${c.teams.slice(0, c.nTeams).map((t, i) => `<div class="team-edit" style="--c:${t.color}"><label for="tn${i}">Nome della squadra</label><input id="tn${i}" data-tname="${i}" value="${esc(t.name)}"><label for="tm${i}">Componenti${c.format === 'staffetta' ? '' : ' (facoltativo)'}, uno per riga</label><textarea id="tm${i}" data-tmem="${i}" placeholder="Per la staffetta: chi risponde a turno">${esc((t.members || []).join('\n'))}</textarea></div>`).join('')}</div>` : ''}
          ${c.kind === 'classe' ? `<div class="field" style="margin-top:1rem"><label for="cl">Nomi degli studenti, uno per riga</label><textarea id="cl" data-class rows="6" placeholder="Amina&#10;Karim&#10;Giulia&#10;…">${esc(c.classList)}</textarea></div><p class="hint-line">La classe viene divisa a caso in ${c.nTeams} squadre; a ogni turno risponde un compagno diverso.</p>` : ''}
        </section>

        <section class="step"><h2><span class="n">2</span> Formato della sfida</h2>
          <div class="formats">${Object.entries(FORMATS).map(([k, f]) => `<button class="format" data-format="${k}" aria-pressed="${c.format === k}"><strong>${f.n}</strong><span>${f.d}</span></button>`).join('')}</div>
          ${c.format === 'eliminazione' ? `<div class="choice-row" style="margin-top:1rem">${[1, 2, 3, 4, 5].map(n => `<button class="chip" data-lives="${n}" aria-pressed="${c.lives === n}">${n} ${n === 1 ? 'vita' : 'vite'}</button>`).join('')}</div>` : ''}
        </section>

        <section class="step"><h2><span class="n">3</span> Contenuto</h2>
          <div class="choice-row" role="group" aria-label="Livello">${IO.LEVELS.map(l => `<button class="chip" data-level="${l}" aria-pressed="${c.level === l}">${l}</button>`).join('')}</div>
          <div class="fields" style="margin-top:1rem">${opts}
            <div class="field"><label for="lang">Traduzione di supporto</label><select id="lang" data-lang>${Object.entries(LANGS).map(([k, l]) => `<option value="${k}" ${c.lang === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </div>
        </section>

        <section class="step"><h2><span class="n">4</span> Ritmo</h2>
          <div class="fields">
            <div class="field"><label for="rounds">Numero di round</label><select id="rounds" data-num="rounds">${[3, 4, 5, 6, 8, 10, 12, 15].map(n => `<option ${c.rounds === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field"><label for="timer">${g.noTurnTimer ? 'Durata di ogni partita a serpente' : 'Tempo per turno'}</label><select id="timer" data-num="timer">${(g.noTurnTimer ? [30, 45, 60, 90] : [0, 15, 30, 45, 60, 90]).map(n => `<option value="${n}" ${c.timer === n ? 'selected' : ''}>${n ? n + ' secondi' : 'Senza tempo'}</option>`).join('')}</select></div>
            <div class="field"><label for="points">Punti per risposta giusta</label><select id="points" data-num="points">${[5, 10, 20].map(n => `<option ${c.points === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field"><label for="auto">Dopo la valutazione</label><select id="auto" data-auto><option value="1" ${c.autoNext ? 'selected' : ''}>Passa da solo al turno successivo</option><option value="0" ${!c.autoNext ? 'selected' : ''}>Aspetta che io prema «Avanti»</option></select></div>
          </div>
        </section>

        <div class="setup-go"><span class="summary">${summary(c)}</span><button class="btn gold big" data-start>${icon('play')} Inizia la sfida</button></div>
      </main>`;
      bind();
    }
    function bind() {
      U.$('[data-back]').onclick = A.home;
      U.$$('[data-kind]').forEach(b => b.onclick = () => { c.kind = b.dataset.kind; draw(); });
      U.$$('[data-nt]').forEach(b => b.onclick = () => { c.nTeams = +b.dataset.nt; draw(); });
      U.$$('[data-format]').forEach(b => b.onclick = () => { c.format = b.dataset.format; draw(); });
      U.$$('[data-lives]').forEach(b => b.onclick = () => { c.lives = +b.dataset.lives; draw(); });
      U.$$('[data-level]').forEach(b => b.onclick = () => { c.level = b.dataset.level; draw(); });
      U.$$('[data-duel]').forEach(i => i.oninput = () => { c.duel[+i.dataset.duel] = i.value; });
      U.$$('[data-tname]').forEach(i => i.oninput = () => { c.teams[+i.dataset.tname].name = i.value; });
      U.$$('[data-tmem]').forEach(i => i.oninput = () => { c.teams[+i.dataset.tmem].members = i.value.split('\n').map(s => s.trim()).filter(Boolean); });
      const cl = U.$('[data-class]'); if (cl) cl.oninput = () => { c.classList = cl.value; };
      U.$$('[data-opt]').forEach(s => s.onchange = () => { c.opt[s.dataset.opt] = s.value; });
      U.$('[data-lang]').onchange = e => { c.lang = e.target.value; };
      U.$$('[data-num]').forEach(s => s.onchange = () => { c[s.dataset.num] = +s.value; U.$('.summary').textContent = summary(c); });
      U.$('[data-auto]').onchange = e => { c.autoNext = e.target.value === '1'; };
      U.$('[data-start]').onclick = () => {
        const cfg = finalize(c); if (!cfg) return;
        IO.Store.saveConfig(Object.assign({}, cfg, { _teams: c.teams, _duel: c.duel, _classList: c.classList }));
        A.start(cfg);
      };
    }
    if (g.noTurnTimer && ![30, 45, 60, 90].includes(c.timer)) c.timer = 45;
    draw();
  };
  function summary(c) {
    const who = c.kind === 'duello' ? 'Duello tra due studenti' : `${c.nTeams} squadre`;
    return `${who}, formato ${FORMATS[c.format].n.toLowerCase()}, livello ${c.level}, ${c.rounds} round`;
  }
  function finalize(c) {
    let teams;
    if (c.kind === 'duello') {
      teams = [0, 1].map(i => ({ name: (c.duel[i] || '').trim() || `Studente ${i + 1}`, color: TEAM_PRESETS[i].color, members: [] }));
    } else if (c.kind === 'squadre') {
      teams = c.teams.slice(0, c.nTeams).map((t, i) => ({ name: (t.name || '').trim() || TEAM_PRESETS[i].name, color: t.color, members: t.members || [] }));
      if (c.format === 'staffetta' && teams.some(t => !t.members.length)) { U.toast('Per la staffetta scrivi i componenti di ogni squadra'); return null; }
    } else {
      const names = U.shuffle(c.classList.split('\n').map(s => s.trim()).filter(Boolean));
      if (names.length < c.nTeams) { U.toast(`Scrivi almeno ${c.nTeams} nomi di studenti`); return null; }
      teams = TEAM_PRESETS.slice(0, c.nTeams).map(t => ({ ...t, members: [] }));
      names.forEach((n, i) => teams[i % c.nTeams].members.push(n));
    }
    return { game: c.game, kind: c.kind, format: c.format, level: c.level, lang: c.lang, rounds: c.rounds, timer: c.timer, points: c.points, stealBonus: c.stealBonus, lives: c.lives, autoNext: c.autoNext, nTeams: c.nTeams, opt: { ...c.opt }, teams };
  }

  /* ======================= GAME ======================= */
  const game = () => G[A.m.cfg.game];
  A.start = function (cfg) {
    A.m = M.create(cfg); A.undo = [];
    newQuestion(); renderGame(); banner();
  };
  A.resume = function (m) {
    A.m = m; A.undo = [];
    if (m.phase === 'steal') m.phase = 'play';
    if (!m.q && m.phase === 'play') newQuestion();
    renderGame(); if (m.phase === 'play') startTimer();
  };
  function save() { IO.Store.save(A.m); }
  function snap() { A.undo.push(JSON.stringify(A.m)); if (A.undo.length > 40) A.undo.shift(); }
  function newQuestion(opts) {
    const m = A.m;
    if (m.q && m.q.stop) m.q.stop();
    m.q = game().make(m, opts || {});
    if (!m.q) { U.toast('Non ci sono altre domande per questo livello: ricomincio il mazzo'); m.used = {}; m.q = game().make(m, opts || {}); }
    m.qs = {}; save();
  }
  function startTimer() {
    const m = A.m, g = game();
    const secs = g.noTurnTimer || m.phase !== 'play' ? 0 : m.cfg.timer;
    IO.Timer.start(secs, drawTimer, () => { m.qs.timeUp = true; drawTimer(IO.Timer); suggest('no'); });
  }
  function drawTimer(T) {
    const el = U.$('.timer'); if (!el) return;
    const r = 40, C = 2 * Math.PI * r;
    if (!T.total) { el.className = 'timer off'; el.innerHTML = `<svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="${r}"/></svg><span>∞</span>`; el.title = 'Senza tempo'; return; }
    const frac = Math.max(0, T.left / T.total);
    el.className = 'timer' + (T.left <= 5 ? ' low' : '') + (A.m.qs.timeUp ? ' up' : '');
    el.innerHTML = `<svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="${r}"/><circle class="fg" cx="50" cy="50" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg><span>${A.m.qs.timeUp ? 'Tempo<br>scaduto' : T.left}</span>`;
  }

  function api() {
    const m = A.m;
    return {
      m, lang: m.cfg.lang,
      suggest, teams: () => m.teams,
      awardTo: i => awardTo(i),
      proposeValue: v => { m.qs.valueOverride = v; updateChrome(); save(); },
      player: () => { const mem = M.member(m, m.cur); return mem ? `${mem} (${m.teams[m.cur].name})` : m.teams[m.cur].name; },
      teamColor: () => m.teams[m.cur].color,
      setCapture: v => { A.capture = v; },
      paused: () => !!m.paused, level: () => m.cfg.level, points: () => m.cfg.points
    };
  }

  function renderGame() {
    clearTransient();
    const m = A.m, g = game();
    if (m.phase === 'over') return A.winner();
    app.innerHTML = `
      <main class="game">
        <header class="g-head">
          <div class="mini-logo">italiano<span class="dot">.</span>io</div>
          <div class="g-title"><div class="name">${g.glyph} ${esc(g.name)}<small>${esc(FORMATS[m.cfg.format].n)}, livello ${m.cfg.level}</small></div><div class="progress"><i></i></div></div>
          <div class="round-pill"></div>
          <div style="display:flex;gap:1rem;align-items:center"><div class="timer"></div>
            <div class="g-tools">
              <button class="icon-btn" data-tool="lang" title="Traduzione di supporto">${m.cfg.lang === 'ar' ? 'ع' : m.cfg.lang === 'en' ? 'EN' : '—'}</button>
              <button class="icon-btn" data-tool="sound" aria-pressed="${S.on}" title="Suoni">${icon('sound')}</button>
              <button class="icon-btn" data-tool="full" title="Schermo intero (F)">${icon('full')}</button>
              <button class="icon-btn" data-tool="home" title="Menu">${icon('home')}</button>
            </div></div>
        </header>
        <section class="g-stage"><div class="card-wrap"><div class="turn-line"></div><div class="qcard"></div></div></section>
        <section class="podiums"><div class="spotlight"></div></section>
        <nav class="teacher" aria-label="Comandi dell'insegnante"></nav>
      </main>`;
    U.$$('[data-tool]').forEach(b => b.onclick = () => tool(b.dataset.tool, b));
    renderCard(); updateChrome();
    if (m.phase === 'play') startTimer(); else IO.Timer.start(0, drawTimer);
    if (m.phase === 'steal') showSteal();
  }

  function renderCard() {
    const m = A.m, card = U.$('.qcard'); if (!card) return;
    const t = m.teams[m.cur];
    card.style.setProperty('--c', t.color);
    if (m.phase === 'final-bet') {
      card.innerHTML = `<div class="q-kicker">Sfida finale</div><div class="q-text">Ogni squadra scommette una parte dei suoi punti.</div>
        <div class="q-sub">Imposta la scommessa sotto ogni podio. Risposta giusta: si vincono i punti scommessi. Risposta sbagliata: si perdono. Le squadre rispondono tutte, su un foglio o a voce, una dopo l'altra.</div>`;
      card.style.setProperty('--c', 'var(--gold)');
      return;
    }
    if (m.phase === 'final-q') card.style.setProperty('--c', 'var(--gold)');
    if (!m.q) { card.innerHTML = '<div class="q-text">Nessuna domanda disponibile.</div>'; return; }
    game().render(m.q, card, api());
  }

  function updateChrome() {
    const m = A.m; if (!U.$('.game')) return;
    const g = game();
    U.$('.progress > i').style.width = (m.phase.startsWith('final') ? 100 : M.progress(m) * 100) + '%';
    U.$('.round-pill').innerHTML = m.phase.startsWith('final') ? 'Finale<small>domanda decisiva</small>' : `Round ${m.round}<small>di ${m.cfg.rounds}</small>`;
    // turn line
    const t = m.teams[m.cur], mem = M.member(m, m.cur);
    const tl = U.$('.turn-line');
    if (m.phase.startsWith('final')) tl.innerHTML = `<span class="who" style="--c:var(--gold)">Tutte le squadre</span><span class="value">${m.phase === 'final-q' ? 'Si gioca la scommessa' : 'Scommesse aperte'}</span>`;
    else {
      tl.style.setProperty('--c', t.color);
      const v = M.value(m);
      tl.innerHTML = `<span class="swatch"></span><span>Turno di <span class="who">${esc(t.name)}</span></span>${mem ? `<span class="member">risponde ${esc(mem)}</span>` : ''}<span class="value">${g.id === 'snake' && m.qs.valueOverride == null ? 'Punti in base alle parole' : `Vale ${v} punti${m.qs.hinted ? ' (suggerimento)' : ''}`}</span>`;
    }
    // podiums
    const pod = U.$('.podiums');
    pod.querySelectorAll('.podium').forEach(p => p.remove());
    m.teams.forEach((tm, i) => {
      const b = document.createElement('button');
      b.className = 'podium' + (i === m.cur && m.phase === 'play' ? ' active' : '') + (tm.out ? ' out' : '');
      b.style.setProperty('--c', tm.color); b.style.setProperty('--on', G.onColor(tm.color));
      b.dataset.team = i;
      const lives = tm.lives != null ? `<span class="lives" aria-label="${tm.lives} vite">${'♥'.repeat(Math.max(0, tm.lives))}${'♡'.repeat(Math.max(0, m.cfg.lives - tm.lives))}</span>` : '';
      const mem = M.member(m, i);
      let extra = '';
      if (m.phase === 'final-bet' && !tm.out) extra = `<div class="bet"><button data-bet="-5" aria-label="Meno">−</button><output>${tm.bet}</output><button data-bet="5" aria-label="Più">+</button></div>`;
      if (m.phase === 'final-q' && !tm.out) extra = `<div class="final-marks"><button class="y" data-mark="y" aria-pressed="${tm.mark === 'y'}">✓ Giusta</button><button class="n" data-mark="n" aria-pressed="${tm.mark === 'n'}">✗ Sbagliata</button></div>`;
      b.innerHTML = `<div class="plate">${esc(tm.name)}</div><div class="score">${tm.score}</div><div class="meta">${tm.out ? 'Eliminata' : lives || (mem ? `prossimo: ${esc(mem)}` : `${tm.c} giuste, ${tm.w} sbagliate`)}</div>${extra}`;
      if (extra) { b.setAttribute('role', 'group'); b.onclick = null; }
      pod.appendChild(b);
    });
    pod.querySelectorAll('.podium').forEach(p => p.addEventListener('click', e => {
      const i = +p.dataset.team;
      const bet = e.target.closest('[data-bet]'), mark = e.target.closest('[data-mark]');
      if (bet) { const tm = m.teams[i]; tm.bet = Math.max(0, Math.min(Math.max(tm.score, 10), tm.bet + +bet.dataset.bet)); updateChrome(); save(); return; }
      if (mark) { m.teams[i].mark = mark.dataset.mark; updateChrome(); save(); return; }
      if (m.phase === 'play' || m.phase === 'steal') podiumMenu(i, p);
    }));
    moveSpotlight();
    renderTeacher();
  }
  function moveSpotlight() {
    const m = A.m, sp = U.$('.spotlight'), p = U.$(`.podium[data-team="${m.cur}"]`), pod = U.$('.podiums');
    if (!sp || !p) return;
    sp.style.opacity = m.phase === 'play' || m.phase === 'steal' ? 1 : 0;
    const pr = p.getBoundingClientRect(), r = pod.getBoundingClientRect();
    sp.style.left = (pr.left - r.left + pr.width / 2) + 'px';
  }
  addEventListener('resize', () => A.m && moveSpotlight());

  function renderTeacher() {
    const m = A.m, bar = U.$('.teacher'); if (!bar) return;
    const B = (a, ic, lbl, key, cls = '') => `<button class="btn ${cls}" data-a="${a}" title="${lbl}${key ? ` (${key})` : ''}">${icon(ic)}<span class="lbl">${lbl}</span>${key ? `<kbd>${key}</kbd>` : ''}</button>`;
    if (m.phase === 'final-bet') {
      bar.innerHTML = B('finalgo', 'play', 'Mostra la domanda finale', 'Invio', 'gold') + '<span class="sep"></span>' + B('undo', 'undo', 'Annulla', 'U') + B('end', 'flag', 'Termina', '');
    } else if (m.phase === 'final-q') {
      const ready = M.active(m).every(i => m.teams[i].mark);
      bar.innerHTML = B('reveal', 'eye', 'Mostra risposta', 'R') + `<span class="sep"></span><button class="btn gold" data-a="settle" ${ready ? '' : 'disabled'}>${icon('flag')}<span class="lbl">Assegna i risultati e proclama il vincitore</span></button>`;
    } else if (m.qs.judged && !m.cfg.autoNext) {
      bar.innerHTML = B('next', 'play', 'Prossimo turno', 'Invio', 'gold') + '<span class="sep"></span>' + B('undo', 'undo', 'Annulla', 'U');
    } else {
      bar.innerHTML = B('ok', 'check', 'Corretta', 'C', 'ok') + B('half', 'half', 'Metà punti', 'M') + B('no', 'x', 'Sbagliata', 'X', 'no') +
        '<span class="sep"></span>' + B('hint', 'bulb', 'Suggerimento', 'H') + B('reveal', 'eye', 'Risposta', 'R') + B('skip', 'skip', 'Salta', 'S') + B('switch', 'swap', 'Cambia turno', 'T') +
        '<span class="sep"></span>' + B('pause', 'pause', 'Pausa', 'P') + B('undo', 'undo', 'Annulla', 'U') + B('end', 'flag', 'Termina', '');
    }
    bar.querySelectorAll('[data-a]').forEach(b => b.onclick = e => act(b.dataset.a, b, e));
    if (m.qs.suggest) suggest(m.qs.suggest, true);
    const u = bar.querySelector('[data-a=undo]'); if (u) u.disabled = !A.undo.length;
  }
  function suggest(res, quiet) {
    const m = A.m; m.qs.suggest = res;
    U.$$('.teacher .btn.suggest').forEach(b => b.classList.remove('suggest'));
    const b = U.$(`.teacher [data-a=${res}]`); if (b) b.classList.add('suggest');
  }

  /* ---------- teacher actions ---------- */
  function act(a, btn) {
    const m = A.m;
    if (a === 'ok' || a === 'half' || a === 'no') return judge(a);
    if (a === 'next') return advance();
    if (a === 'hint') {
      if (m.qs.judged) return;
      if (!m.qs.hinted && game().id !== 'snake') { snap(); m.qs.hinted = true; }
      const msg = game().hint(m.q, U.$('.qcard'), api()); if (msg) U.toast(msg);
      updateChrome(); save(); return;
    }
    if (a === 'reveal') { game().reveal(m.q, U.$('.qcard'), api()); save(); return; }
    if (a === 'skip') { if (m.qs.judged) return; snap(); newQuestion(); renderCard(); updateChrome(); startTimer(); U.toast('Domanda saltata: nuova domanda per la stessa squadra'); return; }
    if (a === 'switch') return switchMenu(btn);
    if (a === 'pause') return pause();
    if (a === 'undo') return doUndo();
    if (a === 'end') return confirmEnd();
    if (a === 'finalgo') { snap(); m.phase = 'final-q'; newQuestion({ hard: true }); renderGame(); S.turn(); return; }
    if (a === 'settle') { snap(); M.finalSettle(m); save(); A.winner(); return; }
  }
  function judge(res) {
    const m = A.m;
    if (m.phase !== 'play' || m.qs.judged || m.paused) return;
    snap();
    const ev = M.judge(m, res);
    feedback(ev);
    if (ev.steal) { IO.Timer.stop(); save(); updateChrome(); showSteal(); return; }
    finishTurn(ev);
  }
  function awardTo(i) {
    const m = A.m; if (m.qs.judged || m.phase !== 'play') return;
    snap();
    const pts = M.value(m); M.award(m, i, pts, 'sfida lampo'); m.teams[i].c++;
    feedback({ type: 'ok', team: i, pts });
    finishTurn({ type: 'ok' });
  }
  function finishTurn(ev) {
    const m = A.m;
    m.qs.judged = true; IO.Timer.stop();
    if (m.q && m.q.stop) m.q.stop();
    if (m.q && !(m.q.revealed || m.q.done) && game().id !== 'snake') game().reveal(m.q, U.$('.qcard'), api());
    save(); updateChrome();
    if (m.cfg.autoNext) { clearTimeout(A.nextTimer); A.nextTimer = setTimeout(advance, ev && ev.type === 'no' ? 2600 : 1800); }
  }
  function advance() {
    const m = A.m; clearTimeout(A.nextTimer);
    if (!m.qs.judged) return;
    const elimBefore = m.teams.map(t => t.out);
    const r = M.next(m);
    if (r === 'over') { save(); return A.winner(); }
    if (r === 'final') { save(); renderGame(); S.turn(); banner('Sfida finale', 'Fate le vostre scommesse', 'var(--gold)'); return; }
    newQuestion(); renderGame(); banner();
    void elimBefore;
  }
  function feedback(ev) {
    const card = U.$('.qcard');
    if (ev.type === 'ok' || ev.type === 'half' || ev.type === 'steal') { S.ok(); card && (card.classList.remove('flash-ok'), void card.offsetWidth, card.classList.add('flash-ok')); }
    if (ev.type === 'no') { S.no(); card && (card.classList.remove('flash-no'), void card.offsetWidth, card.classList.add('flash-no')); }
    if (ev.type === 'steal') S.steal();
    updateChrome();
    if (ev.pts) floatDelta(ev.team, ev.pts);
    if (ev.elim) setTimeout(() => banner(`${A.m.teams[ev.team].name}`, 'è eliminata', A.m.teams[ev.team].color, 'Fuori dal gioco'), 600);
  }
  function floatDelta(i, d) {
    const p = U.$(`.podium[data-team="${i}"]`); if (!p) return;
    const s = document.createElement('span'); s.className = 'delta' + (d < 0 ? ' neg' : ''); s.textContent = (d > 0 ? '+' : '') + d;
    p.appendChild(s); setTimeout(() => s.remove(), 1200);
  }

  /* ---------- overlays ---------- */
  function showSteal() {
    const m = A.m;
    const others = M.active(m).filter(i => i !== m.cur);
    const ov = document.createElement('div'); ov.className = 'overlay transient';
    ov.innerHTML = `<div class="panel"><h2 class="display">Ruba-punti!</h2>
      <p>${esc(m.teams[m.cur].name)} ha sbagliato. Un'altra squadra può rispondere e prendere ${M.value(m) + (m.cfg.stealBonus || 0)} punti (bonus compreso).</p>
      <div class="choice-row">${others.map(i => `<button class="team-pick" style="--c:${m.teams[i].color};--on:${G.onColor(m.teams[i].color)}" data-thief="${i}">${esc(m.teams[i].name)} ha rubato</button>`).join('')}
      <button class="btn ghost" style="color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)" data-thief="">Nessuno</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-thief]').forEach(b => b.onclick = () => {
      ov.remove();
      const ev = M.steal(m, b.dataset.thief === '' ? null : +b.dataset.thief);
      feedback(ev); if (ev.type === 'steal') U.toast(`${m.teams[ev.team].name} ruba ${ev.pts} punti!`);
      finishTurn(ev);
    });
  }
  function pause() {
    const m = A.m;
    if (m.paused) return;
    m.paused = true; IO.Timer.pause(); if (window.speechSynthesis) speechSynthesis.pause();
    const ov = document.createElement('div'); ov.className = 'overlay transient';
    ov.innerHTML = `<div style="text-align:center"><div class="pause-word display">Pausa</div><button class="btn gold big" data-resume>${icon('play')} Riprendi</button></div>`;
    document.body.appendChild(ov);
    const resume = () => { ov.remove(); m.paused = false; IO.Timer.resume(); if (window.speechSynthesis) speechSynthesis.resume(); A.onResume = null; };
    ov.querySelector('[data-resume]').onclick = resume; A.onResume = resume;
  }
  function doUndo() {
    if (!A.undo.length) return;
    clearTimeout(A.nextTimer);
    if (A.m.q && A.m.q.stop) A.m.q.stop();
    A.m = JSON.parse(A.undo.pop()); save(); renderGame(); U.toast('Ultima azione annullata');
  }
  function confirmEnd() {
    const ov = document.createElement('div'); ov.className = 'overlay transient';
    ov.innerHTML = `<div class="panel"><h2>Terminare la sfida adesso?</h2><p>Si passa subito alla classifica finale con i punteggi attuali.</p>
      <div class="choice-row"><button class="btn gold big" data-y>${icon('flag')} Termina e mostra il vincitore</button><button class="btn big" style="background:var(--paper-2);color:var(--ink)" data-n>Continua a giocare</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('[data-n]').onclick = () => ov.remove();
    ov.querySelector('[data-y]').onclick = () => { ov.remove(); snap(); A.m.phase = 'over'; save(); A.winner(); };
  }
  function popover(anchor, html) {
    U.$$('.pop').forEach(p => p.remove());
    const p = document.createElement('div'); p.className = 'pop transient'; p.innerHTML = html;
    document.body.appendChild(p);
    const r = anchor.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left + r.width / 2 - p.offsetWidth / 2)) + 'px';
    p.style.top = Math.max(8, r.top - p.offsetHeight - 10) + 'px';
    setTimeout(() => addEventListener('pointerdown', function close(e) { if (!p.contains(e.target)) { p.remove(); removeEventListener('pointerdown', close); } }), 0);
    return p;
  }
  function podiumMenu(i, anchor) {
    const m = A.m, t = m.teams[i];
    const p = popover(anchor, `<strong>${esc(t.name)}: ${t.score} punti</strong>
      <div class="row"><button class="neg" data-d="-5">−5</button><button class="neg" data-d="-1">−1</button><button class="pos" data-d="1">+1</button><button class="pos" data-d="5">+5</button></div>
      ${m.phase === 'play' && i !== m.cur && !t.out ? `<button class="give" data-give>Dai il turno a ${esc(t.name)}</button>` : ''}`);
    p.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { snap(); M.award(m, i, +b.dataset.d, 'correzione'); floatDelta(i, +b.dataset.d); save(); updateChrome(); p.querySelector('strong').textContent = `${t.name}: ${t.score} punti`; });
    const g = p.querySelector('[data-give]'); if (g) g.onclick = () => { p.remove(); giveTurn(i); };
  }
  function switchMenu(anchor) {
    const m = A.m;
    const others = M.active(m).filter(i => i !== m.cur);
    if (!others.length) return;
    const p = popover(anchor, `<strong>Dai il turno a…</strong>${others.map(i => `<button class="give" style="background:${m.teams[i].color};color:${G.onColor(m.teams[i].color)}" data-i="${i}">${esc(m.teams[i].name)}</button>`).join('')}`);
    p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { p.remove(); giveTurn(+b.dataset.i); });
  }
  function giveTurn(i) {
    const m = A.m; if (m.phase !== 'play' || m.qs.judged) return;
    snap(); m.cur = i; m.qs.suggest = null; save();
    renderCard(); updateChrome(); startTimer(); banner();
  }

  function banner(title, sub, color, small) {
    const m = A.m;
    U.$$('.banner').forEach(b => b.remove());
    const t = m.teams[m.cur], mem = M.member(m, m.cur);
    const b = document.createElement('div'); b.className = 'banner';
    const c = color || t.color;
    b.innerHTML = `<div class="inner" style="--c:${c};--on:${G.onColor(c)}"><small>${esc(small || (title ? '' : `Round ${m.round}`))}</small><strong>${esc(title || t.name)}</strong><em>${esc(sub || (mem ? `Risponde ${mem}` : 'Tocca a voi!'))}</em></div>`;
    document.body.appendChild(b); S.turn();
    setTimeout(() => b.remove(), 1600);
  }
  function clearTransient() { U.$$('.transient, .banner, .pop').forEach(e => e.remove()); IO.Timer.stop(); A.capture = false; }

  function tool(t, b) {
    const m = A.m;
    if (t === 'sound') { b.setAttribute('aria-pressed', S.toggle()); }
    if (t === 'full') fullscreen();
    if (t === 'home') { IO.Timer.stop(); if (m.q && m.q.stop) m.q.stop(); save(); A.home(); }
    if (t === 'lang') { const k = ['ar', 'en', 'none']; m.cfg.lang = k[(k.indexOf(m.cfg.lang) + 1) % 3]; b.textContent = m.cfg.lang === 'ar' ? 'ع' : m.cfg.lang === 'en' ? 'EN' : '—'; save(); if (game().id === 'verbi') renderCard(); U.toast(`Traduzione: ${LANGS[m.cfg.lang].toLowerCase()}`); }
  }
  function fullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); }

  /* ======================= WINNER ======================= */
  A.winner = function () {
    clearTransient();
    const m = A.m; m.phase = 'over'; save();
    const rank = M.ranking(m);
    const top = rank.filter(r => r.score === rank[0].score);
    const tie = top.length > 1;
    app.innerHTML = `
      <main class="winner"><div>
        <div class="crown">${tie ? 'Pareggio! Vincono a pari merito' : 'E il vincitore è…'}</div>
        <h1 class="who display" style="--c:${top[0].color}">${top.map(t => esc(t.name)).join(' e ')}</h1>
        <div class="ranking">${rank.map((r, k) => `<div class="rank-row" style="--c:${r.color}"><span class="pos">${k + 1}°</span><span>${esc(r.name)}${r.out ? ' <small style="color:#FF8A7E">(eliminata)</small>' : ''}</span><span class="st">${r.c} giuste, ${r.w} sbagliate</span><span class="pts">${r.score}</span></div>`).join('')}</div>
        <div class="actions">
          <button class="btn gold big" data-w="again">${icon('undo')} Rivincita</button>
          <button class="btn big" data-w="new">${icon('plus')} Nuova sfida</button>
          <button class="btn ghost big" data-w="home">${icon('home')} Menu</button>
        </div></div></main>`;
    S.win(); IO.confetti();
    U.$$('[data-w]').forEach(b => b.onclick = () => {
      const w = b.dataset.w;
      if (w === 'again') { const cfg = U.clone(m.cfg); IO.Store.clear(); A.start(cfg); }
      if (w === 'new') { IO.Store.clear(); A.setup(m.cfg.game); }
      if (w === 'home') { IO.Store.clear(); A.home(); }
    });
  };

  /* ======================= KEYBOARD ======================= */
  addEventListener('keydown', e => {
    if (A.capture) return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'f') { fullscreen(); return; }
    if (!A.m || !U.$('.game')) return;
    if (A.m.paused) { if (k === 'p' || k === ' ' || k === 'escape') { e.preventDefault(); A.onResume && A.onResume(); } return; }
    if (U.$('.overlay')) { if (k === 'escape') U.$$('.overlay').forEach(o => o.remove()); return; }
    const map = { c: 'ok', x: 'no', m: 'half', h: 'hint', r: 'reveal', s: 'skip', t: 'switch', p: 'pause', u: 'undo' };
    if (k === 'enter' || k === 'n') {
      if (A.m.phase === 'final-bet') return act('finalgo');
      if (A.m.qs.judged) return advance();
      return;
    }
    if (k === ' ' && !A.m.paused) { e.preventDefault(); return act('pause'); }
    if (map[k]) { e.preventDefault(); act(map[k], U.$(`.teacher [data-a=${map[k]}]`) || U.$('.teacher')); }
  });

  A.home();
})(window.IO);
