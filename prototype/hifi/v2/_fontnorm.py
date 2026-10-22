import pathlib
import re
import sys

CSS = pathlib.Path('hf.css')
src = CSS.read_text(encoding='utf-8')

# 目标阶梯
KID = [11.5, 12, 13, 15, 17, 22]
PARENT = [11, 12, 13, 15, 19, 26]

# 旧值 → 目标（孩子端）
KID_MAP = {10: 11.5, 10.5: 11.5, 11: 11.5, 11.5: 11.5, 12: 12, 12.5: 13, 13: 13, 13.5: 13,
           14: 15, 14.5: 15, 15: 15, 15.5: 15, 16: 17, 17: 17, 18: 17, 19: 17, 20: 22,
           21: 22, 22: 22, 24: 22}
# 旧值 → 目标（家长端）
PARENT_MAP = {10: 11, 10.5: 11, 11: 11, 11.5: 11, 12: 12, 12.5: 13, 13: 13, 13.5: 13,
              14: 15, 14.5: 15, 15: 15, 15.5: 15, 16: 15, 17: 19, 18: 19, 19: 19, 20: 19,
              21: 26, 22: 19, 24: 26}

PARENT_SEL = re.compile(r'\.(?:screen--parent|pcard2|pbody|pnav2|phead2|p2head|pbtn|pseg|psheet|'
                        r'pkid|ptask|pshop|pwish|preminder|pstep|pinput|plist|prow|ptag|pitem|'
                        r'pmeta|ptitle|psub|pav|pbadge|pchip|pnote|pfield|picon|pline|prow2|'
                        r'phint|pvals?|pkpi)\b')

changes = []
blocks = re.finditer(r'([^{}]+)\{([^{}]*)\}', src)
out = []
last = 0
for m in blocks:
    sel, body = m.group(1), m.group(2)
    is_parent = bool(PARENT_SEL.search(sel))
    table = PARENT_MAP if is_parent else KID_MAP

    def repl(mm):
        val = float(mm.group(1))
        new = table.get(val)
        if new is None or new == val:
            return mm.group(0)
        changes.append((val, new, is_parent, sel.strip()[:48]))
        txt = ('%g' % new)
        return 'font-size: %spx' % txt

    body2 = re.sub(r'font-size:\s*([\d.]+)px', repl, body)
    out.append(src[last:m.start(1)])
    out.append(sel)
    out.append('{')
    out.append(body2)
    out.append('}')
    last = m.end()

out.append(src[last:])
new_src = ''.join(out)

from collections import Counter
cnt = Counter((c[0], c[1], '家长' if c[2] else '孩子') for c in changes)
print('改动', len(changes), '处')
for k, v in sorted(cnt.items(), key=lambda x: -x[1]):
    print('  %5g → %-5g %s  ×%d' % (k[0], k[1], k[2], v))

if '--write' in sys.argv:
    CSS.write_text(new_src, encoding='utf-8')
    left = sorted(set(float(x) for x in re.findall(r'font-size:\s*([\d.]+)px', new_src)))
    print('写入后 hf.css 字号集合:', left)
else:
    print('（干跑，未写入；加 --write 生效）')
