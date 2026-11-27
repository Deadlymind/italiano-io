import sys, json, openpyxl
sys.stdout.reconfigure(encoding='utf-8')
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb.worksheets[0]
rows = [list(r) for r in ws.iter_rows(values_only=True)]
json.dump(rows, open(sys.argv[2],'w',encoding='utf-8'), ensure_ascii=False, default=str)
print(len(rows), len(wb.worksheets))
for r in rows[2:8]: print(r)
for r in rows[-3:]: print(r)
