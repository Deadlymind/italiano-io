"""Consistency-based audit of the Italian verb chart.
Produces for every verb an 'expected' row; differences vs the sheet are candidate corrections."""
import json, sys, re, collections
sys.stdout.reconfigure(encoding='utf-8')

COLS = {'pres': 3, 'imperf': 12, 'pr': 18, 'fut': 24, 'cpres': 30, 'cimpf': 36, 'cond': 42}
REFL = ['mi ', 'ti ', 'si ', 'ci ', 'vi ', 'si ']
NE = ['me ne ', 'te ne ', 'se ne ', 'ce ne ', 've ne ', 'se ne ']
CE_LA = ['ce la'] * 6
SE_NE = NE

LONG = {  # contracted infinitives -> long stem used for imperfetto, gerundio, PR tu, cong. imperf.
    'fare': 'fac', 'dire': 'dic', 'bere': 'bev', 'porre': 'pon', 'trarre': 'tra', 'durre': 'duc',
}
DIRE = {'dire', 'benedire', 'contraddire', 'disdire', 'indire', 'maledire', 'predire', 'ridire'}
FARE = {'fare', 'disfare', 'rifare', 'soddisfare', 'sopraffare', 'farcela'}
STRESSED_I = {'sciare', 'inviare', 'avviare', 'spiare', 'deviare', 'obliare', 'espiare', 'sviare',
              'rinviare', 'ovviare', 'fuorviare', 'traviare', 'ciare'}


def split_pron(inf):
    """return (base infinitive, pronoun list or None, imperative suffix style)"""
    if inf.endswith('sene'):
        return inf[:-4] + 'e', NE, 'sene'
    if inf == 'avercela':
        return 'avere', ["ce l'"] * 6, 'cela'
    if inf.endswith('cela'):
        return inf[:-4] + 'e', ['ce la '] * 6, 'cela'
    if inf.endswith('si'):
        return inf[:-2] + 'e', REFL, 'si'
    return inf, None, None


def contracted(base):
    if base in DIRE: return base[:-4] + 'dic'
    if base in FARE: return base[:-4] + 'fac'
    if base == 'bere': return 'bev'
    if base.endswith('porre'): return base[:-5] + 'pon'
    if base.endswith('trarre'): return base[:-6] + 'tra'
    if base.endswith('durre'): return base[:-5] + 'duc'
    return None


def join(stem, end, stressed=False):
    if end and end[0] in 'ei':
        if stem.endswith(('c', 'g')): return stem + 'h' + end
        if stem.endswith(('ci', 'gi')) and not stressed: return stem[:-1] + end
        if stem.endswith('i') and end[0] == 'i':
            return stem + end if stressed else stem[:-1] + end
    return stem + end


def regular(base, conj, stressed=False):
    typ = base[-3:]
    st = base[:-3]
    F = {}
    if typ == 'are':
        J = lambda e: join(st, e, stressed)
        F['pres'] = [J(e) for e in ['o', 'i', 'a', 'iamo', 'ate', 'ano']]
        F['imperf'] = [J(e) for e in ['avo', 'avi', 'ava', 'avamo', 'avate', 'avano']]
        F['pr'] = [J(e) for e in ['ai', 'asti', 'ò', 'ammo', 'aste', 'arono']]
        F['fut'] = [J(e) for e in ['erò', 'erai', 'erà', 'eremo', 'erete', 'eranno']]
        F['cpres'] = [J(e) for e in ['i', 'i', 'i', 'iamo', 'iate', 'ino']]
        F['cimpf'] = [J(e) for e in ['assi', 'assi', 'asse', 'assimo', 'aste', 'assero']]
        F['cond'] = [J(e) for e in ['erei', 'eresti', 'erebbe', 'eremmo', 'ereste', 'erebbero']]
        F['imp'] = [J(e) for e in ['a', 'i', 'iamo', 'ate', 'ino']]
        F['ger'] = J('ando'); F['part'] = J('ato')
        if stressed:  # sciare: noi sciamo, voi sciate
            F['pres'][3] = st + 'amo'; F['cpres'][3] = st + 'amo'; F['cpres'][4] = st + 'ate'; F['imp'][2] = st + 'amo'
        return F
    if typ not in ('ere', 'ire'):
        return None
    J = lambda e: st + e
    v = 'e' if typ == 'ere' else 'i'
    if conj and conj.startswith('ire 2'):
        F['pres'] = [J(e) for e in ['isco', 'isci', 'isce', 'iamo', 'ite', 'iscono']]
        F['cpres'] = [J(e) for e in ['isca', 'isca', 'isca', 'iamo', 'iate', 'iscano']]
        F['imp'] = [J(e) for e in ['isci', 'isca', 'iamo', 'ite', 'iscano']]
    else:
        F['pres'] = [J(e) for e in ['o', 'i', 'e', 'iamo', v + 'te', 'ono']]
        F['cpres'] = [J(e) for e in ['a', 'a', 'a', 'iamo', 'iate', 'ano']]
        F['imp'] = [J(e) for e in ['i', 'a', 'iamo', v + 'te', 'ano']]
    # stems ending in i (e.g. 'compiere' handled as irregular)
    F['imperf'] = [J(v + e) for e in ['vo', 'vi', 'va', 'vamo', 'vate', 'vano']]
    if typ == 'ere':
        F['pr'] = [J(e) for e in ['ei', 'esti', 'é', 'emmo', 'este', 'erono']]
    else:
        F['pr'] = [J(e) for e in ['ii', 'isti', 'ì', 'immo', 'iste', 'irono']]
    F['fut'] = [J(v + e) for e in ['rò', 'rai', 'rà', 'remo', 'rete', 'ranno']]
    F['cimpf'] = [J(v + e) for e in ['ssi', 'ssi', 'sse', 'ssimo', 'ste', 'ssero']]
    F['cond'] = [J(v + e) for e in ['rei', 'resti', 'rebbe', 'remmo', 'reste', 'rebbero']]
    F['ger'] = J('endo'); F['part'] = J('uto' if typ == 'ere' else 'ito')
    return F


def strip(v, pron, i):
    if v is None: return None
    if pron and v.startswith(pron[i]): return v[len(pron[i]):]
    return v


def addp(v, pron, i):
    return f'{pron[i]}{v}' if pron and v is not None else v


FUT_END = ['ò', 'ai', 'à', 'emo', 'ete', 'anno']
COND_END = ['ei', 'esti', 'ebbe', 'emmo', 'este', 'ebbero']


SKIP = {'compiere', 'adempiere', 'sottostare', 'disfare', 'soddisfare', 'essere', 'avere', 'andare', 'dare', 'stare',
        'andarsene', 'avercela', 'farcela', 'riavere'}
NO_GER = {'riempire', 'nuocere'}


def expected(r):
    """Return dict col_index -> (expected value, rule) for cells we can derive."""
    inf, conj = r[0], r[53]
    if inf in SKIP:
        return {}, inf
    prreg, futreg, partreg = r[54], r[55], r[56]
    base, pron, style = split_pron(inf)
    stressed = base in STRESSED_I or (base.endswith('iare') and r[4] and strip(r[4], pron, 1).endswith('ii'))
    longstem = contracted(base)
    work = (longstem + 'ere') if longstem else base
    irr_flag = 'irr' in (conj or '')
    R = regular(work, conj, stressed)
    E = {}
    S = lambda c, i=0: strip(r[c], pron, i)
    def put(col, val, rule, i=None):
        if val is None: return
        E[col] = (addp(val, pron, i) if i is not None else val, rule)
    if R is None:
        return E, base
    simple_reg = not irr_flag and not longstem and prreg == 'Y' and futreg == 'Y'
    # --- gerund & imperfetto
    if not longstem and base not in NO_GER:
        put(11, R['ger'] + ({'si': 'si', 'sene': 'sene', 'cela': 'cela'}[style] if style else ''), 'gerundio regolare')
    ger = S(11) if longstem else R['ger']
    if ger and base != 'essere':
        gstem = re.sub(r'(ando|endo)(si|sene|cela)?$', '', ger)
        vv = 'a' if ger.startswith(gstem + 'ando') else ('i' if work.endswith('ire') and not longstem else 'e')
        for i, e in enumerate(['vo', 'vi', 'va', 'vamo', 'vate', 'vano']):
            put(12 + i, gstem + vv + e, 'imperfetto dal gerundio', i)
    # --- passato remoto
    if prreg == 'Y' and not irr_flag:
        for i in range(6):
            reg = R['pr'][i]
            alt = None
            if work.endswith('ere') and i in (0, 2, 5):
                alt = {0: work[:-3] + 'etti', 2: work[:-3] + 'ette', 5: work[:-3] + 'ettero'}[i]
            cur = S(18 + i, i)
            if cur is not None and cur in (reg, alt): continue
            put(18 + i, reg, 'passato remoto regolare', i)
    else:
        if longstem:
            put(19, longstem + 'esti', 'PR tu dal tema lungo', 1)
        elif base not in ('essere', 'dare', 'stare') and R:
            put(19, R['pr'][1], 'PR tu regolare', 1)
        tu = strip(E.get(19, (r[19],))[0], pron, 1)
        if tu and tu.endswith('sti'):
            t = tu[:-3]
            put(21, t + 'mmo', 'PR noi da tu', 3)
            put(22, t + 'ste', 'PR voi da tu', 4)
        io = S(18, 0)
        if io and io.endswith('i') and not io.endswith(('ai', 'ei', 'ii', 'etti')) and base not in ('essere', 'dare', 'stare', 'avere'):
            s_ = io[:-1]
            put(20, s_ + 'e', 'PR lui dal tema forte (io)', 2)
            put(23, s_ + 'ero', 'PR loro dal tema forte (io)', 5)
    # --- congiuntivo imperfetto from PR tu
    tu = E.get(19, (r[19],))[0]
    tu = strip(tu, pron, 1)
    if tu and tu.endswith('sti') and base not in ('essere', 'compiere', 'adempiere'):
        t = tu[:-3]
        for i, e in enumerate(['ssi', 'ssi', 'sse', 'ssimo', 'ste', 'ssero']):
            put(36 + i, t + e, 'cong. imperfetto dal PR tu', i)
    # --- futuro & condizionale
    if futreg == 'Y' and not longstem:
        for i in range(6):
            put(24 + i, R['fut'][i], 'futuro regolare', i)
    if longstem:
        fst = {'bere': 'berr'}.get(base, base[:-1])
        if base.endswith('fare') and S(24, 0) and S(24, 0).startswith(base[:-4] + 'fer'):
            fst = base[:-4] + 'fer'
        for i in range(6): put(24 + i, fst + FUT_END[i], 'futuro dal infinito contratto', i)
    io_f = strip(E.get(24, (r[24],))[0], pron, 0)
    if io_f and io_f.endswith('ò'):
        fs = io_f[:-1]
        for i in range(1, 6): put(24 + i, fs + FUT_END[i], 'futuro coerente con io', i)
        for i in range(6): put(42 + i, fs + COND_END[i], 'condizionale dal tema del futuro', i)
    # --- presente
    if simple_reg and not (not base.endswith('are') and r[3] and strip(r[3], pron, 0) != R['pres'][0]):
        for i in range(6): put(3 + i, R['pres'][i], 'presente regolare', i)
    # --- congiuntivo presente from presente
    P = [E.get(3 + i, (r[3 + i],))[0] for i in range(6)]
    P = [strip(p, pron, i) for i, p in enumerate(P)]
    special_cp = {'essere', 'avere', 'sapere', 'dovere', 'dare', 'stare', 'andare', 'riavere', 'sottostare'}
    if base not in special_cp and all(P):
        if work.endswith('are') and not irr_flag:
            for i in range(6): put(30 + i, R['cpres'][i], 'cong. presente regolare', i)
        elif P[0].endswith('o') and not work.endswith('are'):
            s = P[0][:-1]
            for i in (0, 1, 2): put(30 + i, s + 'a', 'cong. presente dal presente io', i)
            put(35, s + 'ano', 'cong. presente loro dal presente io', 5)
        if P[3].endswith('iamo'):
            put(33, P[3], 'cong. noi = pres. noi', 3)
            put(34, P[3][:-4] + 'iate', 'cong. voi da noi', 4)
    # --- imperativo
    CP = [strip(E.get(30 + i, (r[30 + i],))[0], pron, i) for i in range(6)]
    special_imp = {'essere', 'avere', 'sapere', 'volere', 'andare', 'dare', 'fare', 'stare', 'dire', 'riavere',
                   'rifare', 'sopraffare', 'disfare', 'soddisfare', 'sottostare', 'benedire', 'maledire',
                   'contraddire', 'predire', 'ridire', 'disdire', 'indire', 'andarsene', 'farcela', 'avercela'}
    if base not in special_imp and inf not in special_imp and all(P) and all(CP) and r[48] != '-':
        tu_imp = P[2] if work.endswith('are') else P[1]
        imp = [tu_imp, CP[2], P[3], P[4], CP[5]]
        if style == 'si':
            enc = [imp[0] + 'ti', 'si ' + imp[1], imp[2] + 'ci', imp[3] + 'vi', 'si ' + imp[4]]
            if work.endswith('are'): enc[0] = imp[0] + 'ti'
        elif style == 'sene':
            enc = [imp[0] + 'tene', 'se ne ' + imp[1], imp[2] + 'cene', imp[3] + 'vene', 'se ne ' + imp[4]]
        else:
            enc = imp
        for i in range(5): put(48 + i, enc[i], 'imperativo da presente/congiuntivo')
    # --- participle
    if partreg == 'Y' and not irr_flag and not longstem and (work.endswith('are') or (conj or '').startswith('ire 2')):
        cur = r[10]
        p = R['part'] + ({'si': 'si', 'sene': 'sene', 'cela': 'cela'}[style] if style else '')
        put(10, p, 'participio regolare')
    return E, base


def run(path_rows, path_out):
    rows = json.load(open(path_rows, encoding='utf-8'))
    hdr = rows[1]
    data = rows[2:]
    tense_of = {}
    for t, c in COLS.items():
        for i in range(6): tense_of[c + i] = (t, i)
    for i in range(5): tense_of[48 + i] = ('imp', i)
    tense_of[10] = ('part', 0); tense_of[11] = ('ger', 0)
    res = []
    for ri, r in enumerate(data):
        E, base = expected(r)
        for c, (v, rule) in E.items():
            if r[c] != v:
                res.append({'row': ri + 3, 'inf': r[0], 'col': c, 'cell': f"{tense_of[c][0]}{tense_of[c][1]}",
                            'old': r[c], 'new': v, 'rule': rule, 'conj': r[53]})
    json.dump(res, open(path_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(res), 'differences in', len({x['inf'] for x in res}), 'verbs')
    print(collections.Counter(x['rule'] for x in res).most_common())


if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2])
