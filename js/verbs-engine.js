/* ITALIANO.IO — motore dei verbi: tempi per livello, tempi composti, scelta progressiva */
window.IO = window.IO || {};
(function (IO) {
  'use strict';
  const U = IO.U;
  const VB = IO.VerbEngine = {};
  const V = IO.VERBS;
  const byInf = {}; V.forEach((v, i) => { byInf[v.i] = i; });
  const AVERE = V[byInf.avere], ESSERE = V[byInf.essere];

  VB.PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
  VB.IMP_PERSONS = ['tu', 'Lei (formale)', 'noi', 'voi', 'Loro (formale)'];
  VB.TENSES = {
    pres: { n: 'Presente', m: 'Indicativo' },
    pp: { n: 'Passato prossimo', m: 'Indicativo', aux: 'pres' },
    imperf: { n: 'Imperfetto', m: 'Indicativo' },
    fut: { n: 'Futuro semplice', m: 'Indicativo' },
    cond: { n: 'Condizionale presente', m: 'Condizionale' },
    imp: { n: 'Imperativo', m: 'Imperativo' },
    trap: { n: 'Trapassato prossimo', m: 'Indicativo', aux: 'imperf' },
    cpres: { n: 'Congiuntivo presente', m: 'Congiuntivo' },
    cimpf: { n: 'Congiuntivo imperfetto', m: 'Congiuntivo' },
    futant: { n: 'Futuro anteriore', m: 'Indicativo', aux: 'fut' },
    condp: { n: 'Condizionale passato', m: 'Condizionale', aux: 'cond' },
    pr: { n: 'Passato remoto', m: 'Indicativo' },
    cpass: { n: 'Congiuntivo passato', m: 'Congiuntivo', aux: 'cpres' },
    ctrap: { n: 'Congiuntivo trapassato', m: 'Congiuntivo', aux: 'cimpf' },
    trem: { n: 'Trapassato remoto', m: 'Indicativo', aux: 'pr' }
  };
  const A2 = ['pres', 'pp', 'imperf', 'fut'];
  const B1 = A2.concat(['cond', 'imp', 'trap']);
  const B2 = B1.concat(['cpres', 'cimpf', 'futant', 'condp']);
  const C1 = B2.concat(['pr', 'cpass', 'ctrap']);
  VB.LEVEL_TENSES = { A1: ['pres'], A2, B1, B2, C1, C2: C1.concat(['trem']) };

  const inPool = {
    A1: v => v.f && v.k <= 500,
    A2: v => v.f && v.k <= 1000,
    B1: v => v.f,
    B2: v => v.f || v.k <= 1200,
    C1: v => v.f || v.k < 9999,
    C2: () => true
  };
  VB.isIrregular = v => !v.rp || !v.rf || !v.rpa || /irr/.test(v.c || '');
  VB.isReflexive = v => /(si|sene|cela)$/.test(v.i) && v.i !== 'essere';
  VB.meaning = (v, lang) => lang === 'ar' ? v.ar : lang === 'en' ? v.en.replace(/\s*\(\d\)/g, '') : '';

  function pronouns(v) {
    if (v.i.endsWith('sene')) return ['me ne ', 'te ne ', 'se ne ', 'ce ne ', 've ne ', 'se ne '];
    if (v.i.endsWith('cela')) return Array(6).fill("ce l'");
    if (v.i.endsWith('si')) return ['mi ', 'ti ', 'si ', 'ci ', 'vi ', 'si '];
    return null;
  }
  function partBase(v) {
    let p = v.p;
    if (v.i.endsWith('sene') && p.endsWith('sene')) p = p.slice(0, -4);
    else if (v.i.endsWith('si') && p.endsWith('si')) p = p.slice(0, -2);
    return p;
  }
  function agree(p, person) {
    if (!p.endsWith('o')) return p;
    const s = p.slice(0, -1);
    return person < 3 ? `${s}o/a` : `${s}i/e`;
  }
  VB.auxOf = v => {
    if (/cela$/.test(v.i)) return ['avere'];
    if (VB.isReflexive(v)) return ['essere'];
    return v.aux === 'avere/essere' ? ['avere', 'essere'] : [v.aux];
  };
  /* the conjugated form for a tense and person (person index into the 6 persons, or 5 for imperative) */
  VB.form = function (v, tense, person) {
    const T = VB.TENSES[tense];
    if (tense === 'imp') return v.imp[person];
    if (!T.aux) return v[tense][person];
    const pr = pronouns(v);
    const pre = pr ? pr[person] : '';
    const p = partBase(v);
    return VB.auxOf(v).map(a => {
      const af = (a === 'essere' ? ESSERE : AVERE)[T.aux][person];
      const part = a === 'essere' ? agree(p, person) : p;
      return `${pre}${af} ${part}`;
    }).join('  /  ');
  };
  VB.table = function (v, tense) {
    if (tense === 'imp') return VB.IMP_PERSONS.map((p, i) => [p, v.imp[i]]);
    return VB.PERSONS.map((p, i) => [p, VB.form(v, tense, i)]);
  };

  VB.pool = function (level, type) {
    return V.map((v, i) => i).filter(i => {
      const v = V[i];
      if (type === 'riflessivi') return VB.isReflexive(v) && (U.lvl(level) >= 4 || v.k < 9999 || v.f || /^(alzarsi|lavarsi|svegliarsi|chiamarsi|divertirsi|vestirsi|sentirsi|innamorarsi|preoccuparsi|arrabbiarsi|addormentarsi|ammalarsi|annoiarsi|lamentarsi|mettersi|perdersi|sbrigarsi|sedersi|fermarsi|ricordarsi|trovarsi|comportarsi|fidarsi|abituarsi|avvicinarsi|vergognarsi)$/.test(v.i));
      if (!inPool[level](v)) return false;
      if (type === 'regolari') return !VB.isIrregular(v) && !VB.isReflexive(v);
      if (type === 'irregolari') return VB.isIrregular(v);
      if (type === 'riflessivi') return VB.isReflexive(v);
      return true;
    });
  };

  /* progress 0..1 widens the set of tenses (progressively harder) and raises the share of irregular verbs */
  VB.makeQuestion = function ({ level, tense, type, progress = 0, used, hard = false }) {
    let tenses = tense && tense !== 'auto' ? [tense] : VB.LEVEL_TENSES[level];
    if (!tense || tense === 'auto') {
      const n = hard ? tenses.length : Math.max(1, Math.ceil(tenses.length * (0.4 + 0.6 * progress)));
      tenses = hard ? tenses.slice(Math.floor(tenses.length / 2)) : tenses.slice(0, n);
    }
    let pool = VB.pool(level, type);
    if (pool.length < 5) pool = VB.pool(level, 'tutti');
    if (type !== 'regolari') {
      const irrShare = hard ? 0.9 : 0.25 + 0.5 * progress;
      if (Math.random() < irrShare) {
        const irr = pool.filter(i => VB.isIrregular(V[i]));
        if (irr.length > 4) pool = irr;
      }
    }
    for (let tries = 0; tries < 60; tries++) {
      const vi = U.pick(pool), v = V[vi];
      if (used.has('v' + vi) && tries < 50) continue;
      const t = U.pick(tenses);
      if (t === 'imp' && (!v.imp[0] || v.imp[0] === '-')) continue;
      const person = t === 'imp' ? U.pick([0, 0, 1, 2, 3]) : U.rand(6);
      const answer = VB.form(v, t, person);
      if (!answer || answer === '-') continue;
      return {
        kind: 'verb', key: 'v' + vi, vi, tense: t, person, answer,
        personLabel: t === 'imp' ? VB.IMP_PERSONS[person] : VB.PERSONS[person],
        irr: VB.isIrregular(v)
      };
    }
    return null;
  };
})(window.IO);
