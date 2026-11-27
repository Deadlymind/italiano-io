/* ITALIANO.IO — i giochi. Ogni gioco sa creare una domanda, disegnarla, dare un suggerimento e mostrare la risposta. */
window.IO = window.IO || {};
(function (IO) {
  'use strict';
  const U = IO.U, VB = IO.VerbEngine, esc = U.esc;
  const G = IO.Games = {};
  const LANG_NAME = { ar: 'in arabo', en: 'in inglese' };
  const LETTERS = 'ABCD';

  function upLevel(l, hard) { return hard ? IO.LEVELS[Math.min(5, U.lvl(l) + 1)] : l; }
  function usedSet(m, game) { m.used[game] = m.used[game] || []; return new Set(m.used[game]); }
  function markUsed(m, game, key) { m.used[game] = m.used[game] || []; m.used[game].push(key); }

  /* ---------- scelta multipla condivisa ---------- */
  function renderMCQ(el, q, api, { kicker, text, sub, subDir }) {
    el.innerHTML = `
      ${kicker ? `<div class="q-kicker">${kicker}</div>` : ''}
      <div class="q-text">${text}</div>
      ${sub ? `<div class="q-sub" ${subDir ? `dir="${subDir}"` : ''}>${sub}</div>` : ''}
      <div class="options">${q.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="letter">${LETTERS[i]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
      <div class="extra"></div>`;
    el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      if (q.done) return;
      const i = +b.dataset.i; q.picked = i; q.done = true;
      showOptions(el, q);
      api.suggest(q.opts[i].ok ? 'ok' : 'no');
      if (q.opts[i].ok) IO.Sound.up();
      showExp(el, q);
    }));
    if (q.done) { showOptions(el, q); showExp(el, q); }
    if (q.cut) cutOptions(el, q);
  }
  function showOptions(el, q) {
    el.querySelectorAll('.opt').forEach((b, j) => {
      b.classList.toggle('right', q.opts[j].ok);
      b.classList.toggle('wrong', j === q.picked && !q.opts[j].ok);
      b.classList.toggle('dim', !q.opts[j].ok && j !== q.picked);
    });
  }
  function showExp(el, q) {
    const ex = el.querySelector('.extra');
    if (ex && !ex.querySelector('[data-slot=answer]') && q.exp) ex.insertAdjacentHTML('beforeend', `<div data-slot="answer"><div class="answer small">${esc(q.exp)}</div></div>`);
  }
  function cutOptions(el, q) { // 50/50
    el.querySelectorAll('.opt').forEach((b, j) => { if (q.cut.includes(j)) b.classList.add('dim'); });
  }
  function fiftyFifty(q, el) {
    const wrong = q.opts.map((o, i) => i).filter(i => !q.opts[i].ok);
    q.cut = U.shuffle(wrong).slice(0, 2); cutOptions(el, q);
    return 'Due risposte sbagliate eliminate';
  }
  function mkOpts(correct, distractors) {
    return U.shuffle([{ t: correct, ok: true }].concat(distractors.slice(0, 3).map(t => ({ t, ok: false }))));
  }

  /* ================= VERB DUEL ================= */
  G.verbi = {
    id: 'verbi', name: 'Duello dei verbi', glyph: '⚔️', color: 'var(--t-rosso)',
    desc: 'Verbo, tempo e persona: la squadra coniuga ad alta voce.',
    options: [
      { key: 'tense', label: 'Tempo verbale', choices: l => [{ v: 'auto', l: 'Tutti i tempi del livello (difficoltà crescente)' }].concat(VB.LEVEL_TENSES[l].map(t => ({ v: t, l: VB.TENSES[t].n }))) },
      { key: 'vtype', label: 'Tipo di verbi', choices: () => [{ v: 'tutti', l: 'Tutti' }, { v: 'regolari', l: 'Solo regolari' }, { v: 'irregolari', l: 'Solo irregolari' }, { v: 'riflessivi', l: 'Solo riflessivi' }] }
    ],
    make(m, { hard } = {}) {
      const cfg = m.cfg, used = usedSet(m, 'verbi');
      const level = upLevel(cfg.level, hard);
      const q = VB.makeQuestion({ level, tense: hard ? 'auto' : cfg.opt.tense, type: cfg.opt.vtype, progress: IO.Match.progress(m), used, hard });
      if (q) markUsed(m, 'verbi', q.key);
      return q;
    },
    render(q, el, api) {
      const v = IO.VERBS[q.vi], tr = VB.meaning(v, api.lang);
      el.innerHTML = `
        <div class="verb-grid">
          <div><div class="lab">Verbo</div><div class="val inf">${esc(v.i)}</div>${tr ? `<div class="tr"><bdi ${api.lang === 'ar' ? 'dir="rtl" lang="ar"' : ''}>${esc(tr)}</bdi></div>` : ''}</div>
          <div><div class="lab">Tempo</div><div class="val">${esc(VB.TENSES[q.tense].n)}</div><div class="tr">${esc(VB.TENSES[q.tense].m)}</div></div>
          <div><div class="lab">Persona</div><div class="val">${esc(q.personLabel)}</div></div>
        </div>
        <div class="extra"></div>`;
      if (q.hintShown) this.hint(q, el, api, true);
      if (q.revealed) this.reveal(q, el, api);
    },
    hint(q, el, api, silent) {
      const v = IO.VERBS[q.vi]; q.hintShown = true;
      const parts = [];
      if (VB.TENSES[q.tense].aux) parts.push(`Ausiliare: ${VB.auxOf(v).join(' o ')}`);
      parts.push(q.irr ? 'Verbo irregolare' : 'Verbo regolare');
      const first = q.answer.split('  /  ')[0];
      parts.push(`Comincia con «${first.slice(0, Math.max(2, Math.ceil(first.length / 3)))}…»`);
      put(el, 'hint', `<div class="hintbox">${parts.map(p => `<span style="margin-right:1.6em;display:inline-block">${esc(p)}</span>`).join('')}</div>`);
      return silent ? null : 'Suggerimento mostrato';
    },
    reveal(q, el) {
      const v = IO.VERBS[q.vi]; q.revealed = true;
      const rows = VB.table(v, q.tense).map(([p, f], i) => `<div class="${i === q.person ? 'me' : ''}"><b>${esc(p)}</b>${esc(f)}</div>`).join('');
      put(el, 'answer', `<div class="answer">${esc(q.answer)}<div class="conj-table">${rows}</div></div>`);
    },
    finalLabel: 'Verbo irregolare, tempo difficile'
  };

  /* ================= GRAMMAR DUEL ================= */
  G.grammatica = {
    id: 'grammatica', name: 'Duello di grammatica', glyph: '🧩', color: 'var(--t-blu)',
    desc: 'Domande a scelta multipla con spiegazione dopo ogni turno.',
    options: [{ key: 'topic', label: 'Argomento', choices: l => [{ v: 'tutti', l: 'Tutti gli argomenti' }].concat(Object.entries(IO.GRAMMAR_TOPICS).filter(([k]) => IO.GRAMMAR.some(g => g.t === k && U.lvl(g.l) <= U.lvl(l) + 1)).map(([v, l]) => ({ v, l }))) }],
    make(m, { hard } = {}) {
      const level = upLevel(m.cfg.level, hard), used = usedSet(m, 'grammatica');
      let pool = IO.GRAMMAR.map((g, i) => ({ ...g, i }));
      if (m.cfg.opt.topic && m.cfg.opt.topic !== 'tutti') { const p = pool.filter(g => g.t === m.cfg.opt.topic); if (p.length) pool = p; }
      let it = U.pickByLevel(pool, level, used, x => 'g' + x.i);
      if (!it) { m.used.grammatica = []; it = U.pickByLevel(pool, level, new Set(), x => 'g' + x.i); }
      if (!it) return null;
      markUsed(m, 'grammatica', 'g' + it.i);
      return { kind: 'mcq', key: 'g' + it.i, text: it.q, exp: it.e, topic: IO.GRAMMAR_TOPICS[it.t], opts: mkOpts(it.o[0], it.o.slice(1)) };
    },
    render(q, el, api) {
      renderMCQ(el, q, api, { kicker: `${esc(q.topic)}: quale opzione completa la frase?`, text: blankify(q.text) });
    },
    hint: (q, el) => fiftyFifty(q, el),
    reveal(q, el) { q.done = true; showOptions(el, q); showExp(el, q); }
  };

  /* ================= PREPOSITION BATTLE ================= */
  G.preposizioni = {
    id: 'preposizioni', name: 'Battaglia delle preposizioni', glyph: '🎯', color: 'var(--t-verde)',
    desc: 'Preposizioni semplici e articolate: completa la frase.',
    options: [{ key: 'pk', label: 'Preposizioni', choices: () => [{ v: 'tutte', l: 'Tutte' }, { v: 's', l: 'Semplici (di, a, da, in…)' }, { v: 'a', l: 'Articolate (del, alla, nei…)' }, { v: 'v', l: 'Dopo i verbi (decidere di…)' }] }],
    make(m, { hard } = {}) {
      const level = upLevel(m.cfg.level, hard), used = usedSet(m, 'prep');
      let pool = IO.PREPOSITIONS.map((p, i) => ({ ...p, i }));
      if (m.cfg.opt.pk && m.cfg.opt.pk !== 'tutte') { const p = pool.filter(x => x.k === m.cfg.opt.pk); if (p.length) pool = p; }
      let it = U.pickByLevel(pool, level, used, x => 'p' + x.i);
      if (!it) { m.used.prep = []; it = U.pickByLevel(pool, level, new Set(), x => 'p' + x.i); }
      if (!it) return null;
      markUsed(m, 'prep', 'p' + it.i);
      return { kind: 'mcq', key: 'p' + it.i, text: it.s, exp: it.e, ptype: it.k, opts: mkOpts(it.a, it.d) };
    },
    render(q, el, api) {
      const k = { s: 'Preposizione semplice', a: 'Preposizione articolata', v: 'Verbo + preposizione' }[q.ptype];
      renderMCQ(el, q, api, { kicker: `${k}: quale preposizione manca?`, text: blankify(q.text) });
    },
    hint: (q, el) => fiftyFifty(q, el),
    reveal(q, el) {
      q.done = true; showOptions(el, q); showExp(el, q);
      const ans = q.opts.find(o => o.ok).t;
      const t = el.querySelector('.q-text'); if (t) t.innerHTML = blankify(q.text, ans);
    }
  };

  /* ================= VOCABULARY DUEL ================= */
  G.lessico = {
    id: 'lessico', name: 'Duello di vocabolario', glyph: '📚', color: 'var(--t-giallo)',
    desc: 'Traduzioni, immagini, sinonimi, contrari e frasi da completare.',
    options: [{ key: 'cat', label: 'Categoria', choices: () => [{ v: 'tutte', l: 'Tutte le categorie' }].concat(Object.entries(IO.VOCAB_CATS).map(([v, l]) => ({ v, l }))) }],
    make(m, { hard } = {}) {
      const level = upLevel(m.cfg.level, hard), L = U.lvl(level), lang = m.cfg.lang;
      const used = usedSet(m, 'lessico');
      let pool = IO.VOCAB.map((w, i) => ({ ...w, i }));
      if (m.cfg.opt.cat && m.cfg.opt.cat !== 'tutte') { const p = pool.filter(w => w.c === m.cfg.opt.cat); if (p.length >= 4) pool = p; }
      const types = ['img', 'fill'];
      if (lang !== 'none') types.push('it2tr', 'tr2it');
      if (L >= 2 || hard) types.push('syn', 'ant', 'syn', 'ant');
      for (let tries = 0; tries < 80; tries++) {
        const type = U.pick(types);
        let cand = pool.filter(w => !used.has('w' + w.i + type) && U.lvl(w.l) <= L);
        if (type === 'syn') cand = cand.filter(w => w.syn);
        if (type === 'ant') cand = cand.filter(w => w.ant);
        if (type === 'img') cand = cand.filter(w => w.e && w.g);
        if (type === 'fill') cand = cand.filter(w => w.s);
        if (!cand.length) continue;
        // prefer the chosen level
        const exact = cand.filter(w => U.lvl(w.l) === L); const w = U.pick(exact.length ? exact : cand);
        const same = IO.VOCAB.filter(x => x.w !== w.w && x.c === w.c);
        const any = IO.VOCAB.filter(x => x.w !== w.w);
        const dis = (f) => U.shuffle(same.length >= 3 ? same : any).map(f).filter((t, i, a) => t && a.indexOf(t) === i);
        let q;
        if (type === 'img') q = { text: `<span style="font-size:1.9em">${w.e}</span>`, kicker: 'Che cos\'è? Scegli la parola italiana', opts: mkOpts(w.w, dis(x => x.g && x.w)) };
        if (type === 'it2tr') q = { text: esc(w.w), kicker: `Come si dice ${LANG_NAME[lang]}?`, opts: mkOpts(w[lang], dis(x => x[lang])), rtlOpts: lang === 'ar' };
        if (type === 'tr2it') q = { text: esc(w[lang]), kicker: 'Come si dice in italiano?', opts: mkOpts(w.w, dis(x => x.w)), rtlText: lang === 'ar' };
        if (type === 'fill') q = { text: blankify(w.s), kicker: 'Completa la frase con la parola giusta', opts: mkOpts(w.w, dis(x => x.w)) };
        if (type === 'syn') q = { text: `«${esc(w.w)}»`, kicker: 'Qual è un sinonimo?', opts: mkOpts(w.syn, U.shuffle(any.filter(x => x.c === w.c && x.w !== w.syn)).map(x => x.w)), exp: `${w.w} = ${w.syn}` };
        if (type === 'ant') q = { text: `«${esc(w.w)}»`, kicker: 'Qual è il contrario?', opts: mkOpts(w.ant, U.shuffle(any.filter(x => x.c === w.c && x.w !== w.ant && x.ant !== w.w)).map(x => x.w)), exp: `${w.w} ≠ ${w.ant}` };
        if (q.opts.length < 4) continue;
        markUsed(m, 'lessico', 'w' + w.i + type);
        const tr = lang !== 'none' && type !== 'it2tr' && type !== 'tr2it' ? w[lang] : '';
        return { kind: 'mcq', key: 'w' + w.i + type, vtype: type, word: w.w, trans: tr, exp: q.exp || (tr ? `${w.w}: ${tr}` : ''), ...q };
      }
      return null;
    },
    render(q, el, api) {
      renderMCQ(el, q, api, { kicker: q.kicker, text: q.rtlText ? `<span dir="rtl">${q.text}</span>` : q.text });
      if (q.rtlOpts) el.querySelectorAll('.opt span:last-child').forEach(s => s.setAttribute('dir', 'rtl'));
    },
    hint(q, el) {
      if (q.vtype === 'it2tr' || q.cut) return fiftyFifty(q, el);
      const a = q.opts.find(o => o.ok).t;
      put(el, 'hint', `<div class="hintbox">Comincia con «${esc(a[0])}» e ha ${a.replace(/\s/g, '').length} lettere</div>`);
      return 'Suggerimento mostrato';
    },
    reveal(q, el) { q.done = true; showOptions(el, q); showExp(el, q); }
  };

  /* ================= SENTENCE BATTLE ================= */
  G.frasi = {
    id: 'frasi', name: 'Battaglia delle frasi', glyph: '🧱', color: 'var(--t-viola)',
    desc: 'Parole in disordine: uno studente viene alla lavagna e ricostruisce la frase.',
    options: [{ key: 'race', label: 'Come si gioca', choices: () => [{ v: 'turni', l: 'A turno: ogni squadra ha la sua frase' }, { v: 'lampo', l: 'Sfida lampo: stessa frase, vince chi la completa per primo' }] }],
    make(m, { hard } = {}) {
      const level = upLevel(m.cfg.level, hard), used = usedSet(m, 'frasi');
      const pool = IO.SENTENCES.map((s, i) => ({ ...s, i }));
      let it = U.pickByLevel(pool, level, used, x => 's' + x.i);
      if (!it) { m.used.frasi = []; it = U.pickByLevel(pool, level, new Set(), x => 's' + x.i); }
      if (!it) return null;
      markUsed(m, 'frasi', 's' + it.i);
      const words = it.s.split(' ');
      let sh = U.shuffle(words.map((w, i) => ({ w, i })));
      for (let k = 0; k < 10 && sh.every((x, j) => x.w === words[j]); k++) sh = U.shuffle(sh);
      return { kind: 'sentence', key: 's' + it.i, target: it.s, alt: it.alt || [], tiles: sh, placed: [], race: m.cfg.opt.race === 'lampo' };
    },
    render(q, el, api) {
      el.innerHTML = `
        <div class="q-kicker">${q.race ? 'Sfida lampo: tutte le squadre ricostruiscono la stessa frase' : 'Metti le parole nell\'ordine giusto'}</div>
        <div class="build"></div>
        <div class="tiles"></div>
        <div class="row-actions" style="margin-top:1.2rem">
          <button class="btn primary" data-a="check">${U.icon('check')} Verifica</button>
          <button class="btn" data-a="reset">${U.icon('undo')} Ricomincia</button>
        </div>
        ${q.race ? `<div class="race" style="margin-top:1.2rem"><div class="q-kicker">Chi l'ha completata per primo?</div><div class="row-actions">${api.teams().map((t, i) => t.out ? '' : `<button class="btn" data-team="${i}" style="background:${t.color};color:${onColor(t.color)}">${esc(t.name)}</button>`).join('')}</div></div>` : ''}
        <div class="extra"></div>`;
      const build = el.querySelector('.build'), tiles = el.querySelector('.tiles');
      const draw = () => {
        build.className = 'build';
        build.innerHTML = q.placed.map((ti, k) => `<button class="tile" data-k="${k}">${esc(q.tiles[ti].w)}</button>`).join('');
        tiles.innerHTML = q.tiles.map((t, ti) => q.placed.includes(ti) ? '' : `<button class="tile" data-ti="${ti}">${esc(t.w)}</button>`).join('');
        build.querySelectorAll('.tile').forEach(b => b.onclick = () => { if (q.locked) return; q.placed.splice(+b.dataset.k, 1); draw(); });
        tiles.querySelectorAll('.tile').forEach(b => b.onclick = () => { if (q.locked) return; q.placed.push(+b.dataset.ti); draw(); });
        if (q.checked != null) build.classList.add(q.checked ? 'ok' : 'no');
      };
      draw();
      el.querySelector('[data-a=reset]').onclick = () => { if (q.locked) return; q.placed = []; q.checked = null; draw(); };
      el.querySelector('[data-a=check]').onclick = () => {
        if (q.placed.length !== q.tiles.length) { U.toast('Usa tutte le parole prima di verificare'); return; }
        const built = q.placed.map(ti => q.tiles[ti].w).join(' ');
        const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
        q.checked = [q.target].concat(q.alt).some(s => norm(s) === norm(built));
        draw();
        if (q.checked) { IO.Sound.up(); api.suggest('ok'); } else { api.suggest('no'); }
      };
      el.querySelectorAll('[data-team]').forEach(b => b.onclick = () => api.awardTo(+b.dataset.team));
      if (q.hintShown) this.hint(q, el, api, true);
      if (q.revealed) this.reveal(q, el, api);
    },
    hint(q, el, api, silent) {
      q.hintShown = true;
      const first = q.target.split(' ')[0];
      put(el, 'hint', `<div class="hintbox">La frase comincia con «${esc(first)}»</div>`);
      return silent ? null : 'Suggerimento mostrato';
    },
    reveal(q, el) {
      q.revealed = true;
      put(el, 'answer', `<div class="answer">${esc(q.target)}${q.alt.length ? `<span class="exp">Accettata anche: ${q.alt.map(esc).join(' / ')}</span>` : ''}</div>`);
    }
  };

  /* ================= LISTENING CHALLENGE ================= */
  function italianVoice() {
    const vs = speechSynthesis.getVoices();
    return vs.find(v => /it[-_]IT/i.test(v.lang) && /natural|online|google/i.test(v.name)) || vs.find(v => /^it/i.test(v.lang));
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { };
  function speak(text, rate, btn) {
    if (!('speechSynthesis' in window)) { U.toast('Questo browser non può leggere il testo: leggilo tu ad alta voce'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'it-IT'; u.rate = rate;
    const v = italianVoice(); if (v) u.voice = v; else U.toast('Nessuna voce italiana installata: la lettura potrebbe avere un accento straniero', 3500);
    if (btn) { btn.classList.add('speaking'); u.onend = u.onerror = () => btn.classList.remove('speaking'); }
    speechSynthesis.speak(u);
  }
  G.ascolto = {
    id: 'ascolto', name: 'Sfida d\'ascolto', glyph: '🎧', color: 'var(--t-arancio)',
    desc: 'Una voce italiana legge: dettato o domanda di comprensione.',
    options: [{ key: 'lk', label: 'Tipo di esercizio', choices: () => [{ v: 'misto', l: 'Misto' }, { v: 'd', l: 'Dettato: trascrivere o ripetere' }, { v: 'q', l: 'Comprensione: domanda a scelta multipla' }] }],
    make(m, { hard } = {}) {
      const level = upLevel(m.cfg.level, hard), used = usedSet(m, 'ascolto');
      let pool = IO.LISTENING.map((x, i) => ({ ...x, i }));
      if (m.cfg.opt.lk && m.cfg.opt.lk !== 'misto') { const p = pool.filter(x => x.k === m.cfg.opt.lk); if (p.length) pool = p; }
      let it = U.pickByLevel(pool, level, used, x => 'a' + x.i);
      if (!it) { m.used.ascolto = []; it = U.pickByLevel(pool, level, new Set(), x => 'a' + x.i); }
      if (!it) return null;
      markUsed(m, 'ascolto', 'a' + it.i);
      const q = { kind: 'listen', key: 'a' + it.i, lk: it.k, audio: it.t };
      if (it.k === 'q') { q.text = it.q; q.opts = mkOpts(it.o[0], it.o.slice(1)); q.exp = `Testo: «${it.t}»`; }
      return q;
    },
    render(q, el, api) {
      const controls = `<div class="listen-controls">
          <button class="play-btn" data-r="1" aria-label="Ascolta">${U.icon('play')}</button>
          <button class="btn" data-r="0.7" style="background:var(--paper-2);color:var(--ink)">${U.icon('slow')} Più lento</button>
          <span class="q-sub" style="margin:0">Si può ascoltare più volte</span></div>`;
      if (q.lk === 'q') {
        renderMCQ(el, q, api, { kicker: 'Ascolta e rispondi', text: esc(q.text) });
        el.querySelector('.q-text').insertAdjacentHTML('beforebegin', controls);
      } else {
        el.innerHTML = `<div class="q-kicker">Dettato: ascoltate e scrivete (o ripetete) la frase</div>${controls}<div class="extra"></div>`;
      }
      el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => speak(q.audio, +b.dataset.r, b.classList.contains('play-btn') ? b : el.querySelector('.play-btn')));
      if (!q.played) { q.played = true; setTimeout(() => speak(q.audio, 1, el.querySelector('.play-btn')), 1700); }
      if (q.hintShown) this.hint(q, el, api, true);
      if (q.revealed) this.reveal(q, el, api);
    },
    hint(q, el, api, silent) {
      if (q.lk === 'q') return fiftyFifty(q, el);
      q.hintShown = true;
      const w = q.audio.split(' ');
      put(el, 'hint', `<div class="hintbox">La frase ha ${w.length} parole e comincia con «${esc(w.slice(0, 2).join(' '))}…»</div>`);
      return silent ? null : 'Suggerimento mostrato';
    },
    reveal(q, el) {
      q.revealed = true;
      if (q.lk === 'q') { q.done = true; showOptions(el, q); showExp(el, q); return; }
      put(el, 'answer', `<div class="answer">${esc(q.audio)}</div>`);
    }
  };

  /* ---------- helpers ---------- */
  function blankify(text, fill) {
    return esc(text).replace('___', `<span class="blank">${fill ? esc(fill) : '&nbsp;'}</span>`);
  }
  function put(el, slot, html) {
    const ex = el.querySelector('.extra'); if (!ex) return;
    let s = ex.querySelector(`[data-slot=${slot}]`);
    if (!s) { s = document.createElement('div'); s.dataset.slot = slot; slot === 'hint' ? ex.prepend(s) : ex.append(s); }
    s.innerHTML = html;
  }
  function onColor(c) { return /giallo|gold|FFC21A/i.test(c) ? 'var(--ink)' : '#fff'; }
  G.onColor = onColor;
  G.ORDER = ['verbi', 'grammatica', 'frasi', 'lessico', 'preposizioni', 'ascolto', 'snake'];
})(window.IO);
