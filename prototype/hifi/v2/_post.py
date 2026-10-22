#!/usr/bin/env python3
"""生成后统一处理：字号收敛 / 补顶部条 / 阻断态标记 / 注入 hf.js"""
import pathlib, re

KID_MAP = {10.5: 11.5, 11: 11.5, 12.5: 13, 13.5: 13, 14: 15, 14.5: 15, 15.5: 15,
           16: 15, 16.5: 17, 18: 17, 19: 17, 20: 22, 21: 22, 24: 22, 26: 22, 28: 22, 30: 22}
PAR_MAP = {10.5: 11, 11.5: 11, 12.5: 12, 13.5: 13, 14: 13, 14.5: 13,
           16: 15, 17: 15, 18: 15, 20: 19, 21: 19, 22: 19, 24: 26, 28: 26, 30: 26}

SLIM = '''    <div class="dbar">
      <button class="dbar__back" aria-label="返回"><svg class="i--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div><h1 class="dbar__title">%s</h1>%s</div>
    </div>
'''
NEED_BAR = {
    'kid-404.html': ('页面走丢', ''),
    'kid-empty-today.html': ('今天没任务', '<p class="dbar__sub">今天没有安排</p>'),
    'kid-firstrun.html': ('第一次来', '<p class="dbar__sub">四件事就够</p>'),
    'kid-locked.html': ('要爸爸妈妈来', ''),
    'kid-photo-camera.html': ('拍一张', ''),
    'kid-wait-confirm.html': ('等爸爸妈妈看', ''),
    'state-empties.html': ('空态一览', '<p class="dbar__sub">列表没有内容时</p>'),
    'state-error.html': ('出错了', ''),
    'state-loading-fail.html': ('没接上', ''),
    'state-quota.html': ('今天问满了', '<p class="dbar__sub">明天 0 点恢复</p>'),
    'state-skeleton.html': ('加载中', '<p class="dbar__sub">正在取数据</p>'),
    'state-update.html': ('有新版本', ''),
}
BLOCKING = ['state-wall.html', 'kid-restwall.html', 'choose-kid.html']

for p in sorted(pathlib.Path('.').glob('*.html')):
    if p.stem == 'index':
        continue
    s = p.read_text(encoding='utf-8')
    is_kid = bool(re.match(r'^(kid|state|choose)', p.stem))

    # 字号收敛
    mapping = KID_MAP if is_kid else PAR_MAP
    s = re.sub(r'font-size:\s*([\d.]+)px',
               lambda m: 'font-size:%spx' % mapping.get(float(m.group(1)), float(m.group(1))), s)

    # 阻断态标记
    if p.name in BLOCKING and 'screen--blocking' not in s:
        s = s.replace('<div class="screen">', '<div class="screen screen--blocking">', 1)

    # 补顶部条
    if p.name in NEED_BAR and 'class="dbar"' not in s:
        t, sub = NEED_BAR[p.name]
        bar = SLIM % (t, sub)
        m = re.search(r'<div class="scroll"[^>]*>', s)
        if m:
            s = s[:m.start()] + bar + '\n' + s[m.start():]

    # 注入脚本
    if 'hf.js' not in s:
        s = s.replace('</body>', '<script src="./hf.js"></script>\n</body>')

    p.write_text(s, encoding='utf-8')
print('后处理完成')
