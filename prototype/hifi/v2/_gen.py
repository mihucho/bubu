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


# ============================================================
# 家长端 · 编辑与配置（form 原型）
# ============================================================
write('parent-task-edit.html', shell('任务编辑', f'''{p_back('编辑任务', '叫叫阅读 · 每天', '保存')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">基本信息</h2></div>
        {form_rows([
            ('任务名', '叫叫阅读'),
            ('图标', '书本 · 粉色'),
            ('周期', '每天'),
            ('次数', '5 次 / 天'),
        ])}
      </section>

      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">达标奖励</h2><span class="pcard2__meta">上限 3 颗</span></div>
        {form_rows([
            ('奖励星星', '3 颗'),
            ('可用星星', '29 颗（不变）'),
        ])}
      </section>

      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">拍照与确认</h2></div>
        {form_rows([
            ('要拍照吗', '可选（默认）'),
            ('要我确认吗', '不需要'),
            ('提交后提醒', '站内消息'),
        ])}
        <div class="warn" style="margin-top:2px">拍到的照片会显示在孩子的记录里；不需要确认时星星立即到账。</div>
      </section>

      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">危险操作</h2></div>
        <div class="kv frow" style="border-top:0"><span style="color:#b4478f">停用这个任务</span><b style="color:#b4478f">停用 ›</b></div>
      </section>
    </div>''', 'parent', 2))

write('parent-shop-edit.html', shell('商店物品编辑', f'''{p_back('编辑商品', '贴纸一张', '保存')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">商品信息</h2></div>
        {form_rows([
            ('名称', '贴纸一张'),
            ('价格', '8 颗星'),
            ('库存', '不限'),
            ('排序', '第 1 个'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">状态</h2></div>
        {form_rows([('上架中', '是'), ('兑换后通知我', '是')])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">说明给孩子听</h2></div>
        <div style="font-size:13px;line-height:1.7;color:#3b3350">周末一起贴在本子上，想贴哪里都可以。</div>
      </section>
    </div>''', 'parent', 2))

write('parent-child-edit.html', shell('孩子资料编辑', f'''{p_back('编辑资料', '小月亮', '保存')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">基本信息</h2></div>
        {form_rows([
            ('昵称', '小月亮'),
            ('年龄', '8 岁'),
            ('生日', '2018 年 3 月'),
            ('头像', '兔子 · 预设'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">登录账号</h2><span class="pcard2__meta">唯一，不可改</span></div>
        {form_rows([
            ('登录账号', 'BUBU7K2M9X'),
            ('登录密码', '已设置'),
            ('开通状态', '已开通'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">偏好</h2></div>
        {form_rows([
            ('孩子能看到日记', '能'),
            ('孩子能改密码', '能'),
        ])}
      </section>
    </div>''', 'parent', 4))

write('parent-usage.html', shell('使用时间设置', f'''{p_back('使用时间', '小月亮', '保存')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">每天可以玩</h2><span class="pcard2__meta">含所有页面</span></div>
        {form_rows([
            ('每天时长', '40 分钟'),
            ('休息间隔', '玩 20 分歇 5 分'),
            ('睡觉时间', '21:00 – 07:00'),
            ('周末延长', '不延长'),
        ])}
      </section>
      <div class="pcard2" style="margin-top:10px;display:flex;gap:9px;align-items:flex-start">
        {icon('clock', 'i--sm', '#7c3aed')}
        <span style="font-size:12.0px;line-height:1.65;color:#3b3350">到时间会出现「内容墙」：不报错、不吓人，只告诉孩子今天先到这里。</span>
      </div>
    </div>''', 'parent', 4))

write('parent-backfill.html', shell('补登记', f'''{p_back('补登记一次', '小月亮 · 3 月 10 日', '保存')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">补哪件事</h2></div>
        {form_rows([
            ('任务', '跳绳 100 个'),
            ('日期', '3 月 10 日'),
            ('次数', '1 次'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">补登记会怎样</h2></div>
        <div class="obs" style="border:0;padding:0;background:none">
          <div class="obs__row"><span class="obs__dot"></span><span>星星按当天规则补发，记在 3 月 10 日</span></div>
          <div class="obs__row"><span class="obs__dot"></span><span>孩子的连续天数不会因此中断</span></div>
          <div class="obs__row"><span class="obs__dot"></span><span>操作记录里会留一条「家长补登记」</span></div>
        </div>
      </section>
    </div>''', 'parent', 2))

write('parent-templates.html', shell('任务模板', f'''{p_back('任务模板', '12 个可直接用', '自定义')}
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">学习</h2><span class="pcard2__meta">4 个</span></div>
        {plist_rows([
            ('book','叫叫阅读','5 次 / 天 · 3 颗星','启用','','#ffe0ef','#c026d3'),
            ('calc','口算练习','5 次 / 天 · 2 颗星','启用','','#f0e6ff','#7c3aed'),
            ('doc','预习课文','2 次 / 周 · 2 颗星','添加','','#e6f0ff','#2563eb'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">运动与家务</h2><span class="pcard2__meta">5 个</span></div>
        {plist_rows([
            ('jump','跳绳','1 次 / 天 · 2 颗星','启用','','#ddf7e6','#16a34a'),
            ('heart','做家务','1 次 / 天 · 2 颗星','添加','','#fff0d6','#b45309'),
        ])}
      </section>
    </div>''', 'parent', 2))

# ============================================================
# 家长端 · 消息 / 记录 / 设置（list / detail 原型）
# ============================================================
write('parent-notifications.html', shell('通知中心', f'''{p_back('通知中心', '2 条待处理 · 只做站内消息', '全部已读')}
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">等你处理</h2><span class="pcard2__meta">2</span></div>
        {plist_rows([
            ('alert','小月亮交了「学校作业」','今天 18:20 · 需要你确认','去确认','','#fff0d6','#b45309'),
            ('heart','小米粒想「去动物园」','今天 17:05 · 还没定价','去定价','','#ffe0ef','#be185d'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">已经处理</h2><span class="pcard2__meta">3</span></div>
        {plist_rows([
            ('check','小月亮完成跳绳','昨天 20:10 · 自动通过','已读','','#ddf7e6','#16a34a'),
            ('doc','本周报告已生成','昨天 07:00','已读','','#e6f0ff','#2563eb'),
        ])}
      </section>
    </div>''', 'parent', 0))

write('parent-records.html', shell('记录', f'''{p_back('记录', '小月亮 · 最近 7 天')}
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">小日记</h2><span class="pcard2__meta">5 篇</span></div>
        {plist_rows([
            ('doc','3 月 12 日 · 很开心','今天数学考了 100 分','看 ›','','#ffe0ef','#be185d'),
            ('doc','3 月 11 日 · 有点累','跳绳跳了 100 个','看 ›','','#e6f0ff','#2563eb'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">对话摘要</h2><span class="pcard2__meta">3 段</span></div>
        {plist_rows([
            ('mail','3 月 12 日','聊了数学小测，情绪从难过转为被鼓励','看 ›','','#f0e6ff','#7c3aed'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">需要关注</h2><span class="pcard2__meta" style="color:#b45309">1 条</span></div>
        {plist_rows([
            ('shield','3 月 11 日','孩子提到被同学说「不合群」','看 ›','','#fff5e8','#b45309'),
        ])}
      </section>
    </div>''', 'parent', 0))

write('parent-devices.html', shell('已登录设备', f'''{p_back('已登录设备', '3 台', '')}
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        {plist_rows([
            ('card','妈妈的手机','iPhone · 微信里打开 · 当前设备','退出','在用','#e6f0ff','#2563eb'),
            ('card','豆包 · 小月亮','iPad · 豆包内登录','退出','','#f0e6ff','#7c3aed'),
            ('card','爸爸的手机','Android · 浏览器','退出','','#f5f1fa','#6b6480'),
        ])}
      </section>
      <div class="pcard2" style="margin-top:10px;display:flex;gap:9px;align-items:flex-start">
        {icon('lock', 'i--sm', '#7c3aed')}
        <span style="font-size:12.0px;line-height:1.65;color:#3b3350">退出后该设备的家长端会立刻失效；孩子端的登录不受影响。</span>
      </div>
    </div>''', 'parent', 4))

write('parent-account.html', shell('家庭账号', f'''{p_back('家庭账号', '一个账号管好所有孩子')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">登录</h2></div>
        {form_rows([
            ('手机号', '138****6721'),
            ('登录密码', '已设置'),
            ('绑定豆包', '已绑定'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">一起管的人</h2><span class="pcard2__meta">1 / 4 位</span></div>
        {form_rows([('妈妈', '创建人 ›'), ('邀请另一位家长', '生成邀请码 ›')])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">隐私与数据</h2></div>
        {form_rows([('导出全部数据', '›'), ('注销账号', '›')])}
      </section>
    </div>''', 'parent', 4))

write('parent-invite.html', shell('邀请另一位家长', f'''{p_back('一起管的人', '1 / 4 位家长')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">已经在的</h2><span class="pcard2__meta">创建人</span></div>
        {form_rows([('妈妈 · 138****6721', '创建人 ›')])}
      </section>

      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">邀请另一位家长</h2></div>
        <p style="font-size:13px;line-height:1.7;color:#3b3350;margin:0 0 10px">让 TA 在自己手机上打开布布，登录后输入这串码：</p>
        <div style="font-family:var(--f-num);font-size:22px;font-weight:800;letter-spacing:.16em;color:#6d28d9;text-align:center;background:#faf5ff;border-radius:14px;padding:14px 0;border:1.5px dashed #e9d5ff">K7M2X9</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="pbtn2 pbtn2--ghost" style="flex:1">复制</button>
          <button class="pbtn2 pbtn2--ghost" style="flex:1">二维码</button>
        </div>
        <div class="warn" style="margin-top:10px">码 24 小时内有效，用过一次就失效。对方加入后你会收到一条站内消息。</div>
      </section>

      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">TA 能做什么</h2></div>
        {form_rows([('看孩子的数据', '能'), ('配置任务 / 定价 / 确认', '能'), ('注销账号 / 撤回同意', '仅创建人')])}
      </section>
    </div>''', 'parent', 4))

write('parent-privacy.html', shell('隐私与数据', f'''{p_back('隐私与数据', '监护人同意于 2026-03-01 记录')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">协议</h2></div>
        {form_rows([('隐私政策', 'v1.2 ›'), ('儿童个人信息保护规则', 'v1.2 ›'), ('政策更新提醒', '开')])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">数据</h2></div>
        {form_rows([('导出全部数据', 'JSON + 图片 ›'), ('删除某个孩子的数据', '›')])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">同意与注销</h2></div>
        {form_rows([('撤回监护人同意', '›'), ('注销账号', '›')])}
        <div class="warn" style="margin-top:2px">撤回同意或注销后，孩子将无法继续使用；已导出的图片不受影响。</div>
      </section>
    </div>''', 'parent', 4))

write('parent-reminders.html', shell('提醒', f'''{p_back('提醒', '只在应用内，不发微信短信')}
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">有事等你处理</h2><span class="pcard2__meta">即时</span></div>
        {form_rows([('有任务等我确认', '开'), ('有心愿等我定价', '开'), ('孩子说了需要关注的话', '开')])}
        <div class="warn" style="margin-top:2px">这类消息一条一件，处理完就消失，不重复提醒。</div>
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">每日汇总</h2><span class="pcard2__meta">固定一条</span></div>
        {form_rows([('每天汇总一次', '开'), ('发送时间', '20:00 ›'), ('内容', '两个孩子的完成情况 ›')])}
        <div class="warn" style="margin-top:2px">汇总只写做了什么、还差几个，不做排名。</div>
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">免打扰</h2></div>
        {form_rows([('开启', '开'), ('时段', '22:00 – 07:00 ›')])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">孩子端</h2><span class="pcard2__meta">小信箱</span></div>
        {form_rows([('让孩子收到小信封', '开'), ('红点数字', '不显示')])}
      </section>
    </div>''', 'parent', 4))

write('parent-wishes.html', shell('心愿', f'''    <header class="p2head">
      <div><h1 class="p2head__t">心愿</h1><p class="p2head__s">2 个待处理 · 小月亮 / 小米粒</p></div>
    </header>
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">等我定价</h2><span class="pcard2__meta">1</span></div>
        {plist_rows([
            ('heart','去动物园','小米粒 · 昨天提的 · 建议 40 颗','去定价','','#ffe0ef','#be185d'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">进行中</h2><span class="pcard2__meta">1</span></div>
        {plist_rows([
            ('star','恐龙拼图','小月亮 · 40 颗 · 已攒 29 颗','72%','还差 11','#f0e6ff','#7c3aed'),
        ])}
      </section>
      <section class="pcard2" style="margin-top:10px">
        <div class="pcard2__head"><h2 class="pcard2__title">已兑现</h2><span class="pcard2__meta">3</span></div>
        {plist_rows([
            ('check','周末去公园','小月亮 · 3 月 8 日兑现','完成','','#ddf7e6','#16a34a'),
        ])}
      </section>
    </div>''', 'parent', 3))

write('parent-settings.html', shell('我的', f'''    <header class="p2head">
      <div><h1 class="p2head__t">我的</h1><p class="p2head__s">妈妈 · 2 个孩子 · 已设家长密码</p></div>
    </header>
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        {plist_rows([
            ('clock','使用时间','每天 40 分钟 · 21:00 睡觉','›','','#e6f0ff','#2563eb'),
            ('shield','内容与隐私','日记可见 · AI 全文可见','›','','#f0e6ff','#7c3aed'),
            ('bell','提醒','站内消息 · 20:00 汇总','›','','#fff0d6','#b45309'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        {plist_rows([
            ('doc','任务模板','12 个可用','›','','#ffe0ef','#c026d3'),
            ('gift','徽章','系统 8 个 · 自己建 2 个','›','','#ddf7e6','#16a34a'),
            ('mail','问布布','34 个能力 · 今天还能问 18 次','›','','#f0e6ff','#7c3aed'),
        ])}
      </section>
      <section class="pcard2" style="padding:0 13px;margin-top:10px">
        {plist_rows([
            ('card','家庭账号','1 / 4 位家长','›','','#e6f0ff','#2563eb'),
            ('lock','隐私与数据','导出 / 删除 / 注销','›','','#f5f1fa','#6b6480'),
        ])}
      </section>
      <button class="pbtn2 pbtn2--ghost" style="width:100%;margin-top:12px;height:44px">退出家长端</button>
    </div>''', 'parent', 5))

# ============================================================
# 孩子端 · 剩余页面
# ============================================================
write('kid-badges.html', shell('我的徽章', f'''{kid_back('我的徽章', '已经拿到 5 个 · 还有 3 个在路上')}
    <div class="scroll">
      <div class="goods" style="padding:0 16px">
        <div class="good" style="align-items:center;text-align:center">
          <div class="good__pic" style="width:100%;background:linear-gradient(160deg,#fff0d6,#ffe0ab)">{icon('star','i--lg','#b45309')}</div>
          <div class="good__name">第一次开宝箱</div><div class="kline__s">3 月 3 日拿到</div>
        </div>
        <div class="good" style="align-items:center;text-align:center">
          <div class="good__pic" style="width:100%;background:{PINK}">{icon('book','i--lg','#c026d3')}</div>
          <div class="good__name">连续阅读 3 天</div><div class="kline__s">3 月 8 日拿到</div>
        </div>
        <div class="good" style="align-items:center;text-align:center">
          <div class="good__pic" style="width:100%;background:{MINT}">{icon('jump','i--lg','#16a34a')}</div>
          <div class="good__name">运动周达标</div><div class="kline__s">3 月 10 日拿到</div>
        </div>
        <div class="good" style="align-items:center;text-align:center">
          <div class="good__pic" style="width:100%;background:{LILAC}">{icon('heart','i--lg','#6366f1')}</div>
          <div class="good__name">写完 10 篇心情</div><div class="kline__s">3 月 11 日拿到</div>
        </div>
        <div class="good" style="align-items:center;text-align:center;opacity:.62">
          <div class="good__pic" style="width:100%;background:{GRAY}">{icon('gift','i--lg','#8b7fa8')}</div>
          <div class="good__name">攒到 100 颗</div><div class="kline__s">还差 71 颗</div>
        </div>
        <div class="good" style="align-items:center;text-align:center;opacity:.62">
          <div class="good__pic" style="width:100%;background:{GRAY}">{icon('clock','i--lg','#8b7fa8')}</div>
          <div class="good__name">连续 7 天都来</div><div class="kline__s">还差 3 天</div>
        </div>
      </div>
      <div class="kfooter" style="padding:16px">
        <div class="tip" style="margin:0">
          <span class="tip__ico">{icon('heart','i--sm','#c026d3')}</span>
          <p class="tip__t">妈妈给你的徽章：自己系鞋带</p>
        </div>
      </div>
    </div>''', 'kid', 5))

write('kid-inbox.html', shell('小信箱', f'''{kid_back('小信箱', '2 封信')}
    <div class="scroll">
      <div class="klines">
        <div class="kline">
          <span class="kline__ico" style="background:{PINK}">{icon('mail','i--sm','#be185d')}</span>
          <div><div class="kline__t">妈妈</div><div class="kline__s">今天跳绳没断，妈妈看到了。 · 昨晚</div></div>
          <span class="kline__v">新</span>
        </div>
        <div class="kline">
          <span class="kline__ico" style="background:{PURPLE}">{icon('star','i--sm','#7c3aed')}</span>
          <div><div class="kline__t">布布</div><div class="kline__s">你这周读了 3 本书，厉害 · 昨天</div></div>
          <span class="kline__v">新</span>
        </div>
        <div class="kline">
          <span class="kline__ico" style="background:{GRAY}">{icon('mail','i--sm','#8b7fa8')}</span>
          <div><div class="kline__t">妈妈</div><div class="kline__s">周末去动物园，已经攒够啦 · 3 天前</div></div>
          <span class="kline__v"></span>
        </div>
      </div>
      <div class="tip" style="margin-top:14px">
        <span class="tip__ico">{icon('mail','i--sm','#c026d3')}</span>
        <p class="tip__t">小信箱只放爸妈和布布写给你的话</p>
      </div>
    </div>''', 'kid', 5))

write('kid-ledger.html', shell('星星账本', f'''{kid_back('星星账本', '现有 29 颗 · 共攒 64 颗')}
    <div class="scroll">
      <section class="progcard">
        <div class="progcard__row"><span>可用星星</span><span>共攒 64 颗</span></div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px">
          <span style="font-family:var(--f-num);font-size:22px;font-weight:800;color:#2b1147">29</span>
          <span style="font-size:13px;font-weight:700;color:#7c4fb0">颗</span>
        </div>
      </section>
      <div class="klines">
        {list_rows([
          ('book','叫叫阅读','3 月 12 日 · 达标','+3',PINK,'#c026d3'),
          ('calc','口算 20 题','3 月 12 日 · 达标','+2',LILAC,'#6366f1'),
          ('jump','跳绳 100 个','3 月 11 日 · 达标','+2',MINT,'#16a34a'),
          ('gift','星星商店 · 贴纸','3 月 10 日 · 兑换','-8',AMBER,'#b45309'),
          ('star','签到彩蛋','3 月 11 日','+1',PURPLE,'#7c3aed'),
        ])}
      </div>
    </div>''', 'kid', 5))

write('kid-diary.html', shell('小日记', f'''{kid_back('3 月 12 日 · 很开心', '写于 20:10')}
    <div class="scroll">
      <div class="qcard" style="margin-top:2px">
        <div class="qcard__q" style="font-size:15.0px;line-height:1.75">今天数学考了 100 分，老师说我是第一个交卷的。回家路上我一直在想，明天还能不能考 100 分。</div>
      </div>
      <div class="klines" style="margin-top:12px">
        <div class="kline"><span class="kline__ico" style="background:{PINK}">{icon('heart','i--sm','#be185d')}</span><div><div class="kline__t">那天的心情</div><div class="kline__s">很开心</div></div><span class="kline__v">改 ›</span></div>
        <div class="kline"><span class="kline__ico" style="background:{LILAC}">{icon('doc','i--sm','#6366f1')}</span><div><div class="kline__t">这天做的事</div><div class="kline__s">2 个任务 · 阅读 20 分钟</div></div><span class="kline__v">›</span></div>
      </div>
      <div class="tip" style="margin-top:14px">
        <span class="tip__ico">{icon('lock','i--sm','#c026d3')}</span>
        <p class="tip__t">小日记只有你和爸爸妈妈能看到</p>
      </div>
    </div>''', 'kid', 5))

# ============================================================
# 孩子端 · 弹层（sheet 原型）
# ============================================================
def sheet_page(title, sheet_title, body, primary, secondary='', cls=''):
    return shell(title, f'''    <div class="screen-sheet-bg">
      <div class="scroll" style="opacity:.35">
        <div class="greet"><div class="avatar">{icon('book','i--lg','#8b5cf6')}</div><div class="greet__text"><h1 class="greet__name">首页</h1><p class="greet__meta">背景内容</p></div></div>
      </div>
      <div class="sheetpanel {cls}">
        <div class="sheetpanel__grab"></div>
        <h2 class="sheetpanel__t">{sheet_title}</h2>
        {body}
        <div class="sheetpanel__btns">
          {f'<button class="kbtn kbtn--ghost">{secondary}</button>' if secondary else ''}
          <button class="kbtn">{primary}</button>
        </div>
      </div>
    </div>''', 'kid', 1, with_nav=False)


write('kid-sheet-read.html', sheet_page('记一次阅读', '记一次阅读',
    f'''        <div class="kv frow"><span>读了多少分钟</span><b>20 分钟</b></div>
        <div class="kv frow"><span>书名</span><b>小猪变形记（可不填）</b></div>''', '记下来', '取消'))

write('kid-sheet-exercise.html', sheet_page('记录一次运动', '记录一次运动',
    f'''        <div class="kv frow"><span>做了什么</span><b>跳绳</b></div>
        <div class="kv frow"><span>多久</span><b>12 分钟</b></div>
        <div class="kv frow"><span>拍了照片</span><b>已拍 1 张</b></div>''', '记下来', '取消'))

write('kid-sheet-photo.html', sheet_page('拍照打卡', '拍一张给爸爸妈妈看',
    f'''        <div style="height:180px;border-radius:16px;border:2px dashed #ffd7ec;background:#fff8fd;display:flex;align-items:center;justify-content:center;color:#b48ad6">
          <div style="text-align:center">
            {icon('camera','i--lg','#b48ad6')}
            <div style="font-size:13px;font-weight:700;margin-top:6px">点这里拍一张</div>
          </div>
        </div>''', '拍好了', '重拍'))

write('kid-sheet-confirm.html', sheet_page('等爸爸妈妈看', '已经交给爸爸妈妈啦',
    f'''        <p style="font-size:13px;line-height:1.75;color:#3d2b57;margin:0">他们看到照片就会确认，一般当天就好。这期间你可以先去读一会儿书。</p>
        <div class="tip" style="margin:12px 0 0"><span class="tip__ico">{icon('clock','i--sm','#c026d3')}</span><p class="tip__t">24 小时没确认会自动通过</p></div>''', '先去做别的'))

# ============================================================
# 通用 / 状态（state 原型）
# ============================================================
write('state-empty.html', shell('空态', f'''{kid_back('今天还没记录', '')}
    <div class="scroll">
      <div class="qcard" style="text-align:center;padding:28px 18px">
        <div style="width:88px;height:88px;margin:0 auto 12px;border-radius:28px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">{icon('book','i--lg','#a855f7')}</div>
        <div style="font-size:17.0px;font-weight:800;color:#2b1147">还没有读过书</div>
        <div style="font-size:13.0px;color:#7c5a9e;margin-top:6px;line-height:1.6">现在去读 5 分钟，就能开第一个格子</div>
      </div>
      <div class="kfoot"><button class="kbtn">去读一会儿</button></div>
    </div>''', 'kid', 2))

write('state-error.html', shell('出错了', f'''    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center">
      <div class="qcard" style="text-align:center;padding:28px 18px">
        <div style="width:88px;height:88px;margin:0 auto 12px;border-radius:28px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">{icon('alert','i--lg','#a855f7')}</div>
        <div style="font-size:17.0px;font-weight:800;color:#2b1147">页面走丢了</div>
        <div style="font-size:13.0px;color:#7c5a9e;margin-top:6px;line-height:1.6">没关系，先回首页，今天要做的事都还在</div>
      </div>
      <div class="kfoot"><button class="kbtn">回首页</button>
        <div style="text-align:center;margin-top:10px;font-size:12.0px;color:#7d7395">再试一次</div>
      </div>
    </div>''', 'kid', 1))

write('state-offline.html', shell('离线', f'''    <div class="offbar">{icon('alert','i--sm','#b45309')}<span>没接上，正在重试…</span></div>
    <div class="scroll">
      <div class="section" style="margin-top:10px"><h2 class="section__title">今天要做</h2><span class="section__count">已完成 1 个</span></div>
      <div class="tasks">
        <article class="task task--done">
          <div class="task__tile" style="background:{MINT}">{icon('jump','i--lg','#16a34a')}</div>
          <div class="task__body">
            <div class="task__name">跳绳 100 个</div>
            <div class="task__meta"><span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span><button class="fixlink">已完成 · 待同步</button></div>
          </div>
          <span class="stamp2" aria-label="已完成"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 12.6l4.8 4.8L19.6 7"/></svg></span>
        </article>
      </div>
    </div>''', 'kid', 1))

write('state-skeleton.html', shell('加载中', f'''    <div class="scroll">
      <div class="sk-hero"></div>
      <div style="padding:0 16px;display:flex;flex-direction:column;gap:10px">
        <div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div>
      </div>
    </div>''', 'kid', 1))

write('state-wall.html', shell('内容墙', f'''    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 24px">
      <div style="width:96px;height:96px;margin:0 auto 16px;border-radius:32px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">{icon('clock','i--lg','#a855f7')}</div>
      <div style="font-size:22px;font-weight:800;color:#2b1147">今天先到这里</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:8px;line-height:1.7">眼睛也要休息一下。<br>明天再来，宝箱还在等你。</div>
    </div>''', 'kid', 1, with_nav=False))

# ============================================================
# 认证与引导
# ============================================================

RABBIT_LOGO = ('<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#8b5cf6" stroke-width="1.7" stroke-linecap="round">'
    '<path d="M7 9c-1.4-.6-2.4-2-2.4-3.3 0-.9.8-1.4 1.6-1.1.9.4 2 1.6 2.6 2.6"/>'
    '<path d="M17 9c1.4-.6 2.4-2 2.4-3.3 0-.9-.8-1.4-1.6-1.1-.9.4-2 1.6-2.6 2.6"/>'
    '<path d="M12 8.4c3.2 0 5.8 2.4 5.8 5.4S15.2 19.6 12 19.6 6.2 16.8 6.2 13.8 8.8 8.4 12 8.4Z" stroke="#a855f7"/>'
    '<circle cx="10" cy="13.4" r="1" fill="#a855f7" stroke="none"/>'
    '<circle cx="14" cy="13.4" r="1" fill="#a855f7" stroke="none"/>'
    '<path d="M10.6 16.2c.9.6 1.9.6 2.8 0"/></svg>')


def auth_page(title, sub, fields, primary, links, note=''):
    rows = []
    for f in fields:
        lab, val = f[0], f[1]
        ph = len(f) > 2 and f[2]
        aside = f[3] if len(f) > 3 else ''
        cls = 'authinput authinput--ph' if ph else 'authinput'
        aside_html = '<button class="authfield__aside">%s</button>' % aside if aside else ''
        rows.append(
            '        <div class="authfield">'
            '<div class="authfield__row"><label>%s</label>%s</div>'
            '<div class="%s">%s</div></div>' % (lab, aside_html, cls, val))
    link_html = ''.join('<button>%s</button>' % l for l in links)
    note_html = '<p class="authnote">%s</p>' % note if note else ''
    body = chr(10).join(rows)
    inner = ('    <div class="authwrap">' + chr(10)
        + '      <div class="authbrand">' + chr(10)
        + '        <div class="authbrand__logo">' + RABBIT_LOGO + '</div>' + chr(10)
        + '        <h1 class="authbrand__t">布布的学习小天地</h1>' + chr(10)
        + '        <p class="authbrand__s">' + sub + '</p>' + chr(10)
        + '      </div>' + chr(10)
        + '      <div class="authcard">' + chr(10)
        + body + chr(10)
        + '        <button class="authbtn">' + primary + '</button>' + chr(10)
        + '        <div class="authlinks">' + link_html + '</div>' + chr(10)
        + '      </div>' + chr(10)
        + '      ' + note_html + chr(10)
        + '    </div>')
    return shell(title, inner, 'kid', 0, with_nav=False)


write('auth-login.html', auth_page('家长登录', '家长的账号 · 每天一点点',
    [('手机号', '138 0000 6721'), ('密码', '••••••••', False, '忘记密码 ›')],
    '登录', ['没有账号？注册'], '在豆包里打开会自动登录，这一页不会出现'))
write('auth-register.html', auth_page('家长注册', '先同意，再添加孩子',
    [('手机号', '138 0000 6721'), ('验证码', '••••', False, '获取验证码'), ('设置密码', '至少 8 位', True, '')],
    '注册并继续', ['已有账号，去登录'], '注册即表示你是孩子的监护人'))
write('auth-forgot.html', auth_page('找回密码', '用注册时的手机号',
    [('手机号', '138 0000 6721'), ('验证码', '••••', False, '获取验证码'), ('新密码', '至少 8 位', True, '')],
    '重设密码', ['想起来了，去登录'], ''))

# ============================================================
# 家长端 · 问布布（对话）
# ============================================================
write('parent-chat.html', shell('问布布', f'''{p_back('问布布', '两个孩子的数据', '')}
    <div style="flex:1;min-height:0;display:flex;flex-direction:column">
      <div class="pbody" style="padding-bottom:8px">
        <div class="seg2" style="margin:2px 0 10px">
          <button class="seg2__item seg2__item--on">全部孩子</button>
          <button class="seg2__item">小月亮</button>
          <button class="seg2__item">小米粒</button>
        </div>
        <div class="cmsg cmsg--kid" style="max-width:100%"><div class="cbubble">这周两个孩子各做了什么</div></div>
        <div class="pcard2" style="margin-top:10px">
          <div style="font-size:13px;color:#6b6480;font-weight:600;margin-bottom:6px">这周两个孩子各做了什么</div>
          <div style="font-size:13px;line-height:1.8;color:#3b3350">
            <b>小月亮</b>：读完 3 本，运动 4 次共 95 分钟，得 26 颗星<br>
            <b>小米粒</b>：读完 1 本（读了 3 遍），运动 2 次共 40 分钟，得 12 颗星
          </div>
          <div style="font-size:11.5px;color:#6b6480;margin-top:8px;padding-top:8px;border-top:1px dashed #f0e9f8">两个孩子的节奏不一样，先按各自的节奏来就挺好。</div>
        </div>
        <div class="chips" style="padding:10px 0 0;display:flex;gap:8px;flex-wrap:wrap">
          <button class="quickchip" style="min-height:40px;font-size:12.0px">谁需要我多陪一会</button>
          <button class="quickchip" style="min-height:40px;font-size:12.0px">下周可以怎么调整</button>
        </div>
      </div>
      <div class="chatinput" style="padding:8px 14px 14px">
        <div class="chatinput__box" style="height:44px;font-size:13.0px">想问什么就打在这里…</div>
        <button class="chatinput__send" style="width:44px;height:44px;border-radius:14px" aria-label="发送">{icon('chev','i--sm','#fff')}</button>
      </div>
    </div>''', 'parent', 0, with_nav=False))

print('生成完成')
