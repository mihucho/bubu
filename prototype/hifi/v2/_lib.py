#!/usr/bin/env python3
"""批量生成剩余高保真页面（原型层，纯静态 HTML）

用法：python3 _gen.py
约定：
- 统一复用 hf.css，不新增页面级样式
- 每种页面用「原型（archetype）」表达：form / list / detail / state / sheet
- 文案与数值取自 docs/页面清单与链路-v1.md 与 docs/最终方案-v2.0.md
"""
import pathlib, re

OUT = pathlib.Path(__file__).parent

ICONS = {
    'book': '<path d="M4 5.6c0-.9.7-1.6 1.6-1.6H11v16H5.6c-.9 0-1.6-.7-1.6-1.6z"/><path d="M13 4h5.4c.9 0 1.6.7 1.6 1.6v12.8c0 .9-.7 1.6-1.6 1.6H13z"/>',
    'calc': '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16.5h2M13.5 16.5h2"/>',
    'jump': '<path d="M6.5 4.5c5.5 0 6 3 4 7s-2 5-1 8"/><path d="M9.5 9.5c2.5 0 3.5 1 3 2.5"/>',
    'star': '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
    'gift': '<path d="M4 9h16v11H4z"/><path d="M4 13h16M12 9v11"/><path d="M12 9c-1.6 0-4-.6-4-2.4C8 5 10 4.7 11 6c.7 1 1 3 1 3zm0 0c1.6 0 4-.6 4-2.4 0-1.6-2-1.9-3-.6-.7 1-1 3-1 3z"/>',
    'mail': '<rect x="3" y="6.6" width="18" height="13" rx="3.2"/><path d="M4.6 8.2l7.4 5.3 7.4-5.3"/>',
    'bell': '<path d="M18 15.5H6l1.2-2.3A4.8 4.8 0 0 1 7 11V9.4a5 5 0 0 1 10 0V11c0 .8-.1 1.5-.2 2.2z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>',
    'heart': '<path d="M12 20s-6.6-4-6.6-8.6A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 6.6 2.4C18.6 16 12 20 12 20z"/>',
    'camera': '<path d="M4 8.5h3.2l1.2-2.2h7.2l1.2 2.2H20v10H4z"/><circle cx="12" cy="13" r="3.2"/>',
    'clock': '<circle cx="12" cy="12" r="8.4"/><path d="M12 8v4l2.5 2"/>',
    'gear': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>',
    'lock': '<rect x="4.5" y="10.5" width="15" height="10" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    'check': '<path d="M5 13l4 4L19 7"/>',
    'chev': '<path d="M9 5l7 7-7 7"/>',
    'alert': '<path d="M12 8v4.4M12 16.2v.2"/><circle cx="12" cy="12" r="8.6"/>',
    'doc': '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
    'shield': '<path d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    'card': '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10.5h18"/>',
}

KID_NAV = [
    ('首页', 'M3.5 11L12 4l8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z'),
    ('阅读', 'M4 5.5A2 2 0 0 1 6 3.5h5v17H6a2 2 0 0 1-2-2zM13 3.5h5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-5z'),
    ('动起来', 'M12 3.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8M6 20l3.5-6.5L12 15l3.5-6.5L19 15'),
    ('说说话', 'M20.5 11.8c0 4.3-3.8 7.7-8.5 7.7-1 0-2-.2-2.9-.5L4 20.5l1.4-4.2c-1-1.3-1.5-2.9-1.5-4.5C3.9 7.5 7.7 4 12.4 4s8.1 3.5 8.1 7.8z'),
    ('我的', 'M12 4.9a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2M4.8 20c.7-3.4 3.6-5.3 7.2-5.3s6.5 1.9 7.2 5.3'),
]
PARENT_NAV = [
    ('概览', 'M3.5 11L12 4l8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z'),
    ('任务', 'M5 5h14M5 5v14h14V5M8.5 9.5h7M8.5 13h4.5'),
    ('心愿', 'M12 20s-6.6-4-6.6-8.6A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 6.6 2.4C18.6 16 12 20 12 20z'),
    ('孩子', 'M9 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6M16.5 8.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4M3.5 19c.5-2.8 2.7-4.3 5.5-4.3s5 1.5 5.5 4.3M15 14.6c2.2 0 4 1.2 4.5 3.4'),
    ('我的', 'M12 5.1a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8M4.8 20c.7-3.4 3.6-5.3 7.2-5.3s6.5 1.9 7.2 5.3'),
]


def icon(name, cls='i--sm', color='#7c3aed'):
    d = ICONS.get(name, ICONS['check'])
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{d}</svg>')


def nav(kind, active=0, cls='nav'):
    items = KID_NAV if kind == 'kid' else PARENT_NAV
    out = [f'    <nav class="{cls}" aria-label="主导航">']
    sw = '2.2' if kind == 'kid' else '1.9'
    for i, (label, d) in enumerate(items, start=1):
        on = f' {cls}__item--on" aria-current="page' if i == active else ''
        out.append(f'      <button class="{cls}__item{on}"><svg class="i" viewBox="0 0 24 24" fill="none" '
                   f'stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">'
                   f'<path d="{d}"/></svg>{label}</button>')
    out.append('    </nav>')
    return '\n'.join(out)




# ============================================================
# 统一壳模板：状态条 / 页头 / 唯一滚动区 / 导航 —— 四段固定顺序
# ============================================================
HEADER_CLASSES = ('dbar', 'phead2', 'p2head', 'greet', 'chathead', 'meprofile', 'gsteps', 'offbar')


def _extract_block(src, start_pat):
    """从 src 中按 div 配对切出一段 <div class="...">…</div>"""
    m = re.search(start_pat, src)
    if not m:
        return None, src
    i = m.start()
    depth = 0
    pos = i
    while True:
        nxt_open = src.find('<div', pos + 4)
        nxt_close = src.find('</div>', pos + 4)
        if nxt_close < 0:
            return None, src
        if 0 <= nxt_open < nxt_close:
            depth += 1
            pos = nxt_open
        else:
            if depth == 0:
                block = src[i:nxt_close + 6]
                return block, src[:i] + src[nxt_close + 6:]
            depth -= 1
            pos = nxt_close


def normalize(inner):
    """把生成器给的片段整理成 (header, body)：页头单独拿出来，正文只留内容"""
    header = ''
    # 页头可能在最外层，也可能在 .scroll 里
    for cls in HEADER_CLASSES:
        pat = r'<div class="%s"' % cls
        if re.search(pat, inner) or re.search(r'<header class="%s"' % cls, inner):
            if re.search(r'<header class="%s"' % cls, inner):
                block, inner = _extract_block(inner, r'<header class="%s"' % cls)
            else:
                block, inner = _extract_block(inner, pat)
            if block:
                header = block
                break

    # 去掉外层 .scroll 包裹，只保留里面的内容
    m = re.search(r'<div class="scroll[^"]*"[^>]*>', inner)
    if m:
        j = m.start()
        depth = 0
        pos = j
        end = None
        while True:
            nxt_open = inner.find('<div', pos + 4)
            nxt_close = inner.find('</div>', pos + 4)
            if nxt_close < 0:
                break
            if 0 <= nxt_open < nxt_close:
                depth += 1
                pos = nxt_open
            else:
                if depth == 0:
                    end = nxt_close
                    break
                depth -= 1
                pos = nxt_close
        if end:
            inner = inner[:j] + inner[m.end():end] + inner[end + 6:]

    return header.strip(), inner.strip()


def shell(title, inner, kind='kid', active=0, with_nav=True, extra_class=''):
    """统一壳：状态条 / 页头 / 唯一滚动区 / 导航。
    inner 中若出现 <div class="scroll"> 或 <div class="pbody">，
    其前面视为页头、其内部视为正文；输出顺序固定，不靠标签配对猜结构。"""
    navhtml = nav(kind, active, 'nav' if kind == 'kid' else 'pnav2') if with_nav else ''
    surface = 'screen--parent' if kind == 'parent' else ''

    header, body = '', inner.strip()
    for wrap in ('<div class="scroll">',
                 '<div class="scroll kid-empty">',
                 '<div class="pbody">',
                 '<div class="pbody" style="padding-bottom:8px">'):
        i = body.find(wrap)
        if i >= 0:
            header = body[:i].strip()
            rest = body[i + len(wrap):].rstrip()
            if rest.endswith('</div>'):
                rest = rest[:-6]
            body = rest.strip()
            break

    header_html = ('\n' + header + '\n') if header else ''
    return f'''<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>布布 · {title}</title><link rel="stylesheet" href="./hf.css"></head>
<body><div class="phone"><div class="screen {surface} {extra_class}">
    <div class="statusbar"><span>9:41</span><span class="statusbar__right"><svg class="i--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 17.5h2.5M9 14h2.5M15 10.5h2.5M21 7h2.5"/></svg><span class="statusbar__bar"></span></span></div>{header_html}
    <main class="scroll">{body}</main>
{navhtml}
</div></div><script src="./hf.js"></script></body></html>
'''




def kid_back(title, sub=''):
    s = f'<p class="dbar__sub">{sub}</p>' if sub else ''
    return f'''      <div class="dbar">
        <button class="dbar__back" aria-label="返回"><svg class="i--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div><h1 class="dbar__title">{title}</h1>{s}</div>
      </div>'''


def p_back(title, sub='', action=''):
    s = f'<p class="p2head__s">{sub}</p>' if sub else ''
    act = f'<button class="p2head__act">{action}</button>' if action else ''
    return f'''    <header class="p2head">
      <button class="p2head__back" aria-label="返回"><svg class="i--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div><h1 class="p2head__t">{title}</h1>{s}</div>{act}
    </header>'''


def form_rows(rows):
    out = []
    for r in rows:
        label, value = r[0], r[1]
        wide = ' frow--wide' if len(label) >= 7 else ''
        out.append(f'        <div class="kv frow{wide}"><span>{label}</span><b>{value}</b></div>')
    return '\n'.join(out)


def list_rows(rows):
    out = []
    for r in rows:
        ic, name, sub, val, bg, color = r
        out.append(f'''        <div class="kline">
          <span class="kline__ico" style="background:{bg}">{icon(ic, 'i--sm', color)}</span>
          <div><div class="kline__t">{name}</div><div class="kline__s">{sub}</div></div>
          <span class="kline__v">{val}</span>
        </div>''')
    return '\n'.join(out)


def plist_rows(rows):
    """家长端行：名称 + 摘要 + 右值"""
    out = []
    for r in rows:
        ic, name, meta, val, sub, bg, color = r
        out.append(f'''        <div class="tr">
          <span class="tr__ico" style="background:{bg}">{icon(ic, 'i--sm', color)}</span>
          <div style="flex:1;min-width:0"><div class="tr__name">{name}</div><div class="tr__meta">{meta}</div></div>
          <div class="tr__right"><div class="tr__val">{val}</div><div class="tr__sub">{sub}</div></div>
        </div>''')
    return '\n'.join(out)


PINK = 'linear-gradient(160deg,#ffe0ef,#ffc6e2)'
LILAC = 'linear-gradient(160deg,#e6e5ff,#d3d0fb)'
MINT = 'linear-gradient(160deg,#ddf7e6,#c4f0d5)'
AMBER = 'linear-gradient(160deg,#fff0d6,#ffe0ab)'
BLUE = 'linear-gradient(160deg,#e6f0ff,#cfe0ff)'
PURPLE = 'linear-gradient(160deg,#f0e6ff,#e0d0ff)'
GRAY = '#f5f1fa'


def write(name, html):
    (OUT / name).write_text(html, encoding='utf-8')




def guide_step(step, title, sub, body, primary='下一步', secondary='上一步'):
    dots = ''.join('<span class="gdot%s"></span>' % ('' if i > step else ' gdot--done') for i in range(1, 9))
    return shell(title, f'''    <div class="scroll" style="display:flex;flex-direction:column">
      <div class="gsteps">{dots}</div>
      <div style="padding:6px 24px 0">
        <div style="font-size:12px;font-weight:700;color:#7c3aed;letter-spacing:.4px">第 {step} 步 / 共 8 步</div>
        <h1 style="margin:6px 0 4px;font-size:21px;font-weight:800;color:#2b1147">{title}</h1>
        <p style="margin:0 0 14px;font-size:12px;line-height:1.7;color:#7c5a9e">{sub}</p>
        {body}
      </div>
      <div style="margin-top:auto;padding:16px 24px">
        <button class="kbtn">{primary}</button>
        <button class="gstep-back">{secondary}</button>
      </div>
    </div>''', 'parent', 0, with_nav=False)


def sheet_page(title, sheet_title, body, primary, secondary=''):
    return shell(title, f'''    <div class="screen-sheet-bg">
      <div class="scroll" style="opacity:.35">
        <div class="greet"><div class="avatar">{icon('book','i--lg','#8b5cf6')}</div><div class="greet__text"><h1 class="greet__name">首页</h1><p class="greet__meta">背景内容</p></div></div>
      </div>
      <div class="sheetpanel">
        <div class="sheetpanel__grab"></div>
        <h2 class="sheetpanel__t">{sheet_title}</h2>
        {body}
        <div class="sheetpanel__btns">
          {f'<button class="kbtn kbtn--ghost">{secondary}</button>' if secondary else ''}
          <button class="kbtn">{primary}</button>
        </div>
      </div>
    </div>''', 'kid', 1, with_nav=False)
