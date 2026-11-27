"""Apply corrections to the verb chart. Produces corrected rows + change log."""
import json, sys, copy, re, collections
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, __file__.rsplit('\\', 1)[0].rsplit('/', 1)[0])
import engine2 as E

rows = json.load(open(sys.argv[1], encoding='utf-8'))
hdr = rows[1]
orig = copy.deepcopy(rows)
data = rows[2:]
V = {r[0]: r for r in data}
LOG = []  # (inf, col, old, new, reason)

CELLNAMES = {}
for name, c in [('Presente', 3), ('Imperfetto', 12), ('Passato remoto', 18), ('Futuro', 24),
                ('Congiuntivo presente', 30), ('Congiuntivo imperfetto', 36), ('Condizionale', 42)]:
    for i, p in enumerate(['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']):
        CELLNAMES[c + i] = f'{name} – {p}'
for i, p in enumerate(['tu', 'lui/lei', 'noi', 'voi', 'loro']):
    CELLNAMES[48 + i] = f'Imperativo – {p}'
CELLNAMES.update({1: 'Significato', 2: 'Significato Arabic', 9: 'Ausiliario', 10: 'Participio', 11: 'Gerundio',
                  53: 'conj.', 54: 'PR regolare', 55: 'futuro regolare', 56: 'part. regolare'})


def setc(inf, col, new, reason):
    r = V[inf]
    if r[col] != new:
        LOG.append((inf, col, r[col], new, reason))
        r[col] = new


def regen(inf, conj, reason):
    """Regenerate a fully regular verb from the engine."""
    r = V[inf]
    setc(inf, 53, conj, 'classe di coniugazione errata')
    F = E.regular(inf, conj)
    for t, c in E.COLS.items():
        for i in range(6): setc(inf, c + i, F[t][i], reason)
    for i in range(5): setc(inf, 48 + i, F['imp'][i], reason)
    setc(inf, 10, F['part'], reason); setc(inf, 11, F['ger'], reason)


# ---------- 1. verbs whose whole stem was misspelled -> regenerate
for inf, conj in [('automatizzare', 'are'), ('biasimare', 'are'), ('inizializzare', 'are'), ('preoccupare', 'are'),
                  ('riutilizzare', 'are'), ('sbriciolare', 'are'), ('somministrare', 'are'), ('schiacciare', 'are'),
                  ('perquisire', 'ire 2'), ('disubbidire', 'ire 2'), ('ridistribuire', 'ire 2')]:
    regen(inf, conj, 'tema del verbo scritto male in tutta la riga')

# irregular verbs with a misspelled stem -> string replacement on all forms
for inf, a, b in [('riaccendere', 'reacc', 'riacc'), ('circoscrivere', 'circumscri', 'circoscri'),
                  ('scuotere', 'scount', 'scuot'), ('scuotere', 'scout', 'scuot'),
                  ('riscuotere', 'riscount', 'riscuot'), ('riscuotere', 'riscout', 'riscuot'),
                  ('crocifiggere', 'crocifegg', 'crocifigg')]:
    for c in list(range(3, 53)):
        v = V[inf][c]
        if isinstance(v, str) and a in v: setc(inf, c, v.replace(a, b), 'tema del verbo scritto male')

# ---------- 2. conjugation-class labels
for inf in ['avvilire', 'insaporire', 'inserire', 'insospettire', 'interagire', 'interferire', 'intimidire',
            'intorpidire', 'stabilire', 'trasferire']:
    setc(inf, 53, 'ire 2', 'verbo in -isc- etichettato come "ire 1"')
for inf in ['morire', 'riempire', 'risalire', 'riuscire', 'divenire']:
    setc(inf, 53, 'ire 1 irr', 'verbo irregolare etichettato come regolare')
for inf in ['disfare', 'soddisfare']:
    setc(inf, 53, 'are irr', 'verbo irregolare (come fare)')
for inf in ['compiere', 'adempiere']:
    setc(inf, 53, 'ere irr', 'verbo irregolare (tipo compiere)')

# ---------- 3. auxiliaries
AUX = {
    'arrampicarsi': 'essere', 'arrendersi': 'essere', 'avercela': 'avere', 'farcela': 'avere',
    'sottostare': 'essere', 'fuoriuscire': 'essere', 'convivere': 'avere', 'compiacere': 'avere',
    'possedere': 'avere', 'rincorrere': 'avere', 'tralasciare': 'avere', 'gioire': 'avere',
    'rifinire': 'avere', 'ripulire': 'avere',
    'bastare': 'essere', 'costare': 'essere', 'sorgere': 'essere', 'ricadere': 'essere', 'rinascere': 'essere',
    'tramontare': 'essere', 'arrossire': 'essere', 'sbocciare': 'essere', 'marcire': 'essere',
    'riemergere': 'essere', 'derivare': 'essere', 'rientrare': 'essere', 'appassire': 'essere',
    'scivolare': 'essere', 'evaporare': 'essere', 'scoppiare': 'essere',
    'esplodere': 'avere/essere', 'evadere': 'avere/essere', 'servire': 'avere/essere', 'mancare': 'avere/essere',
    'affondare': 'avere/essere', 'ingrassare': 'avere/essere', 'convenire': 'avere/essere',
    'atterrare': 'avere/essere', 'decollare': 'avere/essere', 'annegare': 'avere/essere',
    'migliorare': 'avere/essere', 'peggiorare': 'avere/essere', 'aumentare': 'avere/essere',
    'calare': 'avere/essere', 'inciampare': 'avere/essere', 'invecchiare': 'avere/essere',
    'emigrare': 'avere/essere', 'germogliare': 'avere/essere', 'convergere': 'avere/essere',
}
for inf, aux in AUX.items():
    setc(inf, 9, aux, 'ausiliare errato')

# ---------- 4. global accent fixes
for r in data:
    inf = r[0]
    if r[20] and r[20].endswith('è') and r[20] != 'è':
        setc(inf, 20, r[20][:-1] + 'é', "accento: passato remoto in -é (accento acuto), non -è")
for inf in ['possedere', 'sedere']:
    for c in range(3, 53):
        v = V[inf][c]
        if isinstance(v, str) and 'iè' in v: setc(inf, c, v.replace('iè', 'ie'), 'accento grafico non standard')
setc('rifare', 48, 'rifai', 'carattere errato (`)')
setc('sopraffare', 48, 'sopraffai', 'carattere errato (`)')
setc('sottostare', 48, 'sottostai', 'imperativo errato')

# ---------- 5. manual cell fixes (irregular verbs, verified by hand)
M = {
    'andare': {35: 'vadano'},
    'andarsene': {4: 'te ne vai', 49: 'se ne vada', 51: 'andatevene', 52: 'se ne vadano', 47: 'se ne andrebbero'},
    'avercela': {24: "ce l'avrò", 25: "ce l'avrai", 26: "ce l'avrà"},
    'farcela': {6: 'ce la facciamo', 15: 'ce la facevamo', 21: 'ce la facemmo', 27: 'ce la faremo',
                33: 'ce la facciamo', 39: 'ce la facessimo', 45: 'ce la faremmo', 10: 'fatta'},
    'essere': {51: 'siate'},
    'sapere': {51: 'sappiate'},
    'volere': {51: 'vogliate'},
    'dire': {36: 'dicessi', 37: 'dicessi', 38: 'dicesse', 39: 'dicessimo', 40: 'diceste', 41: 'dicessero'},
    'cogliere': {4: 'cogli'}, 'sciogliere': {4: 'sciogli', 11: 'sciogliendo'},
    'togliere': {4: 'togli', 5: 'toglie', 50: 'togliamo'},
    'distogliere': {4: 'distogli', 5: 'distoglie', 50: 'distogliamo'},
    'scegliere': {35: 'scelgano', 52: 'scelgano'},
    'compiacere': {8: 'compiacciono'}, 'dispiacere': {8: 'dispiacciono'}, 'giacere': {8: 'giacciono'},
    'piacere': {8: 'piacciono'}, 'spiacere': {8: 'spiacciono'}, 'tacere': {8: 'tacciono'},
    'mantenere': {30: 'mantenga', 31: 'mantenga', 32: 'mantenga', 35: 'mantengano', 49: 'mantenga', 52: 'mantengano'},
    'parere': {30: 'paia', 31: 'paia', 32: 'paia', 35: 'paiano'},
    'produrre': {6: 'produciamo'}, 'rimanere': {6: 'rimaniamo', 50: 'rimaniamo'},
    'ridurre': {35: 'riducano', 52: 'riducano'},
    'spegnere': {11: 'spegnendo'},
    'prevedere': {6: 'prevediamo'},
    'convergere': {4: 'convergi'},
    'mordere': {7: 'mordete'},
    'nuocere': {51: 'nocete'},
    'convincere': {8: 'convincono'},
    'dirigere': {8: 'dirigono'}, 'erigere': {8: 'erigono'}, 'redigere': {5: 'redige'},
    'incidere': {5: 'incide', 11: 'incidendo'},
    'risiedere': {8: 'risiedono'},
    'agire': {5: 'agisce'}, 'contribuire': {5: 'contribuisce'}, 'inghiottire': {5: 'inghiottisce', 8: 'inghiottiscono'},
    'scurire': {5: 'scurisce'}, 'seppellire': {5: 'seppellisce'},
    'sostituire': {6: 'sostituiamo', 7: 'sostituite', 50: 'sostituiamo', 51: 'sostituite'},
    'ricostruire': {50: 'ricostruiamo'},
    'dolersi': {32: 'si dolga'},
    'apprendere': {19: 'apprendesti'}, 'assolvere': {19: 'assolvesti'}, 'dissolvere': {19: 'dissolvesti'},
    'friggere': {18: 'frissi'}, 'infliggere': {18: 'inflissi'}, 'soffriggere': {18: 'soffrissi'},
    'avvedersi': {23: 'si avvidero', 48: 'avvediti', 49: 'si avveda', 52: 'si avvedano'},
    'dissuadere': {23: 'dissuasero'}, 'persuadere': {23: 'persuasero'},
    'raggiungere': {21: 'raggiungemmo'},
    'coincidere': {20: 'coincise'}, 'decidere': {20: 'decise'}, 'correggere': {20: 'corresse'},
    'procedere': {21: 'procedemmo'},
    'riavere': {47: 'riavrebbero'},
    'dovere': {43: 'dovresti'}, 'volere_': {},
    'sedurre': {12: 'seducevo', 17: 'seducevano', 29: 'sedurranno'},
    'ridurre_': {},
    'guaire': {25: 'guairai'},
    'divenire': {10: 'divenuto'},
    # compiere / adempiere: make each internally consistent (forms of "compiere/compire")
    'adempiere': {3: 'adempio', 4: 'adempi', 5: 'adempie', 6: 'adempiamo', 7: 'adempite', 8: 'adempiono',
                  10: 'adempiuto', 19: 'adempisti', 48: 'adempi', 49: 'adempia', 50: 'adempiamo', 51: 'adempite',
                  52: 'adempiano'},
}
M['volere'][43] = 'vorresti'
M['benedire'] = {3: 'benedico', 4: 'benedici', 5: 'benedice', 6: 'benediciamo', 7: 'benedite', 8: 'benedicono',
                 35: 'benedicano', 48: 'benedici', 52: 'benedicano', 53: 'ire 1 irr'}
for inf, cells in M.items():
    if inf.endswith('_'): continue
    for c, v in cells.items():
        setc(inf, c, v, 'correzione manuale (verbo irregolare)')

# disfare / soddisfare: like fare
for inf in ['disfare', 'soddisfare']:
    p = inf[:-4]
    F = {3: p + 'faccio', 4: p + 'fai', 5: p + 'fa', 6: p + 'facciamo', 7: p + 'fate', 8: p + 'fanno',
         48: p + 'fai', 49: p + 'faccia', 50: p + 'facciamo', 51: p + 'fate', 52: p + 'facciano'}
    for c, v in F.items(): setc(inf, c, v, 'correzione manuale (come fare)')
    setc(inf, 54, 'N', 'flag errato'); setc(inf, 55, 'N', 'flag errato'); setc(inf, 56, 'N', 'flag errato')

# ---------- 6. iterate the consistency engine until stable
EXCLUDE = set()
for it in range(6):
    changed = 0
    for r in data:
        Ex, _ = E.expected(r)
        for c, (v, rule) in Ex.items():
            if (r[0], c) in EXCLUDE: continue
            if r[c] != v:
                setc(r[0], c, v, rule); changed += 1
    print('iteration', it, 'changes', changed)
    if not changed: break

json.dump(rows, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
# collapse log: final old (from original) -> final new
final = collections.OrderedDict()
ri = {r[0]: i for i, r in enumerate(orig)}
for inf, col, old, new, reason in LOG:
    key = (inf, col)
    if key not in final: final[key] = [orig[ri[inf]][col], new, reason]
    else: final[key][1] = new
out = [{'verbo': k[0], 'col': k[1], 'campo': CELLNAMES.get(k[1], hdr[k[1]]), 'prima': v[0], 'dopo': v[1], 'motivo': v[2]}
       for k, v in final.items() if v[0] != v[1]]
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('total corrected cells:', len(out), 'verbs:', len({o['verbo'] for o in out}))
print(collections.Counter(o['motivo'] for o in out).most_common())
