import json, sys, openpyxl
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.comments import Comment
sys.stdout.reconfigure(encoding='utf-8')
src, fixed, changes, out_xlsx, out_js = sys.argv[1:6]
wb = openpyxl.load_workbook(src)
ws = wb.worksheets[0]
rows = json.load(open(fixed, encoding='utf-8'))
ch = json.load(open(changes, encoding='utf-8'))
idx = {r[0]: i for i, r in enumerate(rows)}
fill = PatternFill('solid', fgColor='FFF2A8')
for c in ch:
    ri = idx[c['verbo']] + 1
    cell = ws.cell(row=ri, column=c['col'] + 1)
    cell.value = c['dopo']
    cell.fill = fill
    cell.comment = Comment(f"Prima: {c['prima']}\nMotivo: {c['motivo']}", 'ITALIANO.IO')
# Correzioni sheet
if 'Correzioni' in wb.sheetnames: del wb['Correzioni']
cs = wb.create_sheet('Correzioni', 0 if False else len(wb.sheetnames))
cs.append(['Verbo', 'Campo', 'Prima (errato)', 'Dopo (corretto)', 'Motivo'])
for c in cs[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1F6F43')
for c in ch: cs.append([c['verbo'], c['campo'], c['prima'], c['dopo'], c['motivo']])
for col, w in zip('ABCDE', [18, 30, 26, 26, 50]): cs.column_dimensions[col].width = w
cs.freeze_panes = 'A2'; cs.auto_filter.ref = f"A1:E{len(ch)+1}"
wb.save(out_xlsx)
# ---- app verb bank
T = {'pres': 3, 'imperf': 12, 'pr': 18, 'fut': 24, 'cpres': 30, 'cimpf': 36, 'cond': 42}
bank = []
for r in rows[2:]:
    rank = int(r[58]) if str(r[58]).isdigit() else 9999
    v = {'i': r[0], 'en': r[1], 'ar': r[2], 'aux': r[9], 'p': r[10], 'g': r[11], 'c': r[53],
         'rp': r[54] == 'Y', 'rf': r[55] == 'Y', 'rpa': r[56] == 'Y', 'f': r[57] == 'Y', 'k': rank}
    for t, c in T.items(): v[t] = r[c:c + 6]
    v['imp'] = r[48:53]
    bank.append(v)
with open(out_js, 'w', encoding='utf-8') as f:
    f.write('/* Banca verbi ITALIANO.IO — generata dal foglio corretto (Italian_Verb_Chart_CORRETTO.xlsx). Non modificare a mano. */\n')
    f.write('window.IO = window.IO || {};\nIO.VERBS = ')
    json.dump(bank, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('verbs', len(bank), 'changes', len(ch))
