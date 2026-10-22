#!/usr/bin/env python3
"""第四批：家长端剩余 + 通用状态"""
from _lib import (
    write, shell, icon, kid_back, p_back, form_rows, list_rows, plist_rows,
    sheet_page, PINK, LILAC, MINT, AMBER, BLUE, PURPLE, GRAY,
)

# ---------------- 家长端：待处理与安全 ----------------
write('parent-pending.html', shell('待确认详情', p_back('待确认', '小月亮 · 学校作业') + '''
    <div class="pbody">
      <div class="pcard2" style="padding:0">
        <div style="height:170px;border-radius:14px;margin:11px;background:linear-gradient(160deg,#f5e6ff,#ffe6f2);display:flex;align-items:center;justify-content:center">''' + icon('camera', 'i--lg', '#b48ad6') + '''</div>
        ''' + form_rows([('任务', '学校作业'), ('提交时间', '今天 18:20'), ('拍到照片', '1 张'), ('规则', '需要你确认')]) + '''
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="pbtn2 pbtn2--ghost" style="flex:1;height:44px">让他再做</button>
        <button class="pbtn2" style="flex:1;height:44px">去确认</button>
      </div>
      <div class="warn" style="margin-top:10px">24 小时没处理会自动通过，星星照发。</div>
    </div>''', 'parent', 0))

write('parent-danger.html', shell('危险操作确认', p_back('确认删除', '这一步不可撤销') + '''
    <div class="pbody">
      <div class="pcard2">
        <div style="display:flex;gap:9px;align-items:flex-start">
          ''' + icon('alert', 'i--sm', '#dc2626') + '''
          <div style="font-size:13px;line-height:1.75;color:#3b3350">删除「小月亮」的全部数据：任务、阅读、运动、心情、星星流水、AI 记忆。<br><br><b>30 天后不可恢复。</b>已导出的图片不受影响。</div>
        </div>
        ''' + form_rows([('输入孩子昵称确认', '小月亮')]) + '''
      </div>
      <button class="pbtn2" style="width:100%;height:44px;margin-top:12px;background:#dc2626">确认删除</button>
    </div>''', 'parent', 4))

write('parent-safety.html', shell('需要关注', p_back('需要关注', '1 条 · 只给级别，不给原文') + '''
    <div class="pbody">
      <div class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">3 月 11 日 · 晚上</h2><span class="pcard2__meta" style="color:#b45309">需要留意</span></div>
        <div style="font-size:13px;line-height:1.8;color:#3b3350">孩子提到被同学说「不合群」。这句话命中了关注词，我们把它保留下来给你看。</div>
        <div class="warn" style="margin-top:10px">这里只显示级别与摘要，不显示对话原文；原文在「记录 · 对话摘要」里。</div>
      </div>
      <div class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">可以怎么做</h2></div>
        <div class="obs" style="border:0;background:none;padding:0">
          <div class="obs__row"><span class="obs__dot"></span><span>先问「今天有什么好玩的事」，不直接追问那句话</span></div>
          <div class="obs__row"><span class="obs__dot"></span><span>如果连续出现，考虑和老师聊一次</span></div>
        </div>
      </div>
    </div>''', 'parent', 0))

write('parent-sent.html', shell('我发出的', p_back('我发出的', '12 条鼓励') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        ''' + plist_rows([
            ('mail', '小月亮', '今天跳绳没断，妈妈看到了。', '昨天', '已读', PINK, '#be185d'),
            ('mail', '小米粒', '今天你自己收的书包，很棒。', '前天', '已读', BLUE, '#2563eb'),
            ('mail', '小月亮', '数学小测加油，考什么样都没关系。', '3 天前', '已读', PURPLE, '#7c3aed'),
        ]) + '''
      </section>
      <div class="pcard2" style="display:flex;gap:9px;align-items:center">
        ''' + icon('mail', 'i--sm', '#7c3aed') + '''
        <span style="font-size:12.0px;font-weight:600;color:#3b3350">孩子端不会弹窗、不响铃，只在小信箱里</span>
      </div>
    </div>''', 'parent', 0))

# ---------------- 家长端：搜索 / 月历 / AI ----------------
write('parent-search.html', shell('搜索', p_back('搜索', '跳绳 · 3 组结果') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">任务</h2><span class="pcard2__meta">2 条</span></div>
        ''' + plist_rows([
            ('jump', '跳绳 100 个', '小月亮 · 每天', '1 / 1', '已完成', MINT, '#16a34a'),
            ('jump', '跳绳 50 个', '小米粒 · 每天', '0 / 1', '今天', MINT, '#16a34a'),
        ]) + '''
      </section>
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">记录</h2><span class="pcard2__meta">3 条</span></div>
        ''' + plist_rows([
            ('doc', '3 月 11 日 · 有点累', '「跳绳跳了 100 个」', '看 ›', '', PINK, '#be185d'),
        ]) + '''
      </section>
    </div>''', 'parent', 4))

write('parent-search-empty.html', shell('搜索', p_back('搜索', '还没输入') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">最近搜过</h2><span class="pcard2__meta">清空</span></div>
        ''' + plist_rows([
            ('clock', '跳绳', '3 月 11 日', '再搜', '', GRAY, '#6b6480'),
            ('clock', '口算', '3 月 9 日', '再搜', '', GRAY, '#6b6480'),
        ]) + '''
      </section>
      <div class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">常找的</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:2px">
          <span class="tag2">等我确认</span><span class="tag2">本周任务</span><span class="tag2">错题</span><span class="tag2">心愿</span><span class="tag2">小日记</span>
        </div>
      </div>
    </div>''', 'parent', 4))

write('parent-calendar.html', shell('月历', p_back('月历', '小月亮 · 3 月 · 达标 18 天', '小米粒') + '''
    <div class="pbody">
      <div class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">2026 年 3 月</h2><span class="pcard2__meta">达标 18 天</span></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;margin-top:4px">
          <span style="font-size:11.5px;color:#7d7395;font-weight:700">一</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">二</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">三</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">四</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">五</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">六</span><span style="font-size:11.5px;color:#7d7395;font-weight:700">日</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:6px">
          ''' + ''.join('<div style="height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--f-num);font-size:12.0px;font-weight:700;background:%s;color:%s">%d</div>' % (
            PINK if d in (3, 4, 5, 6, 7) else (LILAC if d in (10, 11, 12) else '#f7f5fb'),
            '#fff' if d in (3, 4, 5, 6, 7) else '#6b6480', d) for d in range(1, 32)) + '''
        </div>
      </div>
      <div class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">这个月</h2></div>
        ''' + form_rows([('达标', '18 天'), ('最长连续', '6 天（10–15 日）'), ('断在', '周末居多')]) + '''
      </div>
    </div>''', 'parent', 0))

write('parent-ai-usage.html', shell('问布布用量', p_back('今天还能问几次', '3 月 12 日 · 每天 0 点重置') + '''
    <div class="pbody">
      <div class="pcard2">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-family:var(--f-num);font-size:22px;font-weight:800;color:#2b1147">12</span>
          <span style="font-size:12.0px;color:#6b6480">已问 · 还能问 18 次</span>
        </div>
        <div class="pbar" style="margin-top:10px"><i style="width:40%"></i></div>
        <div class="warn" style="margin-top:10px">每天最多 30 次，问得多的那天不会额外收费。</div>
      </div>
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">最近问了什么</h2><span class="pcard2__meta">今天</span></div>
        ''' + plist_rows([
            ('mail', '这周两个孩子各做了什么', '今天 09:10', '›', '', PURPLE, '#7c3aed'),
            ('mail', '小米粒的错题集中在哪', '今天 08:52', '›', '', PURPLE, '#7c3aed'),
        ]) + '''
      </section>
    </div>''', 'parent', 5))

write('parent-ai-tools.html', shell('布布能做什么', p_back('布布能做什么', '34 个能力 · 全部只读') + '''
    <div class="pbody">
      <div class="pcard2"><div style="font-size:13px;line-height:1.75;color:#3b3350">布布<b>不能改任何数据</b>。建任务、定心愿价、发鼓励，它只会给你一张确认卡，你点了才生效。</div></div>
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">孩子端 · 只看自己</h2><span class="pcard2__meta">18 个</span></div>
        ''' + form_rows([('今天怎么样（复合）', '只读'), ('阅读 / 书单 / 运动 / 心情', '只读'), ('签到 / 闯关 / 错题 / 徽章', '只读')]) + '''
      </section>
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">家长端 · 可跨孩子</h2><span class="pcard2__meta">11 个</span></div>
        ''' + form_rows([('两个孩子各做了什么', '只读'), ('孩子最近聊了什么', '只给摘要'), ('需要关注的消息', '只给级别')]) + '''
      </section>
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">会动手的（要你确认）</h2><span class="pcard2__meta">4 个</span></div>
        ''' + form_rows([('起草一个新任务', '需确认'), ('建议一个心愿定价', '需确认'), ('写一句鼓励的话', '需确认')]) + '''
      </section>
    </div>''', 'parent', 5))

write('parent-audit.html', shell('操作记录', p_back('操作记录', '最近 20 条') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        ''' + plist_rows([
            ('doc', '编辑任务「叫叫阅读」', '妈妈 · 今天 09:12', '查看', '', BLUE, '#2563eb'),
            ('check', '确认「学校作业」打卡', '妈妈 · 今天 18:22', '查看', '', MINT, '#16a34a'),
            ('star', '补登记跳绳 1 次', '妈妈 · 昨天 21:03', '查看', '', AMBER, '#b45309'),
        ]) + '''
      </section>
      <div class="pcard2" style="display:flex;gap:9px;align-items:flex-start">
        ''' + icon('shield', 'i--sm', '#7c3aed') + '''
        <span style="font-size:12.0px;line-height:1.65;color:#3b3350">每次改数据都会留一条记录，包含谁改的、改了什么、什么时候。</span>
      </div>
    </div>''', 'parent', 5))

write('parent-exchanges.html', shell('兑换记录', p_back('兑换记录', '12 条 · 可撤销 24 小时内的') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        ''' + plist_rows([
            ('gift', '贴纸一张', '小月亮 · 今天 16:20', '-8', '可撤销', AMBER, '#b45309'),
            ('gift', '给妈妈写信', '小月亮 · 3 月 8 日', '-12', '已核销', PINK, '#be185d'),
        ]) + '''
      </section>
    </div>''', 'parent', 2))

# ---------------- 家长端：徽章 / 复制 / 排序 ----------------
write('parent-badges.html', shell('徽章', p_back('徽章', '系统 8 个 · 自己建 2 个', '新建') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">自己建的</h2><span class="pcard2__meta">2 / 6</span></div>
        ''' + plist_rows([
            ('heart', '第一次自己系鞋带', '小月亮 · 已颁发', '›', '', PINK, '#c026d3'),
            ('book', '自己收书包一周', '小月亮 · 待颁发', '›', '', PURPLE, '#7c3aed'),
        ]) + '''
      </section>
      <section class="pcard2" style="padding:0 13px">
        <div class="pcard2__head" style="padding:11px 0 2px;margin:0"><h2 class="pcard2__title">系统徽章</h2><span class="pcard2__meta">不能修改</span></div>
        ''' + plist_rows([
            ('star', '第一次开宝箱', '已获得 · 3 月 3 日', '只读', '', AMBER, '#b45309'),
            ('gift', '攒到 100 颗', '还差 71 颗', '进度', '', GRAY, '#6b6480'),
        ]) + '''
      </section>
    </div>''', 'parent', 5))

write('parent-badge-new.html', shell('新建徽章', p_back('新建徽章', '小月亮 · 第 3 个', '保存') + '''
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">叫什么</h2><span class="pcard2__meta">4 / 8 字</span></div>
        <div class="authinput" style="height:44px">自己系鞋带</div>
      </section>
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">什么条件拿到</h2></div>
        ''' + form_rows([('条件', '由我手工颁发'), ('奖励', '不给星（纯纪念）'), ('颁奖时说的话', '你自己系的鞋带，妈妈看到了。')]) + '''
        <div class="warn">手工颁发的徽章不会自动发；你点了「颁发」孩子才会看到。</div>
      </section>
    </div>''', 'parent', 5))

write('parent-copy.html', shell('复制配置', p_back('复制到另一个孩子', '从小月亮到小米粒') + '''
    <div class="pbody">
      <section class="pcard2">
        <div class="pcard2__head"><h2 class="pcard2__title">要复制什么</h2></div>
        ''' + form_rows([('任务', '3 个 · 一起复制'), ('商店物品', '2 个'), ('徽章', '2 个'), ('使用时间', '一起复制')]) + '''
      </section>
      <div class="pcard2" style="display:flex;gap:9px;align-items:flex-start">
        ''' + icon('alert', 'i--sm', '#b45309') + '''
        <span style="font-size:12.0px;line-height:1.65;color:#3b3350">不会复制历史记录和星星余额；小米粒从明天开始按新任务算。</span>
      </div>
      <button class="pbtn2" style="width:100%;height:44px;margin-top:12px">复制过去</button>
    </div>''', 'parent', 4))

write('parent-sort.html', shell('任务排序', p_back('任务排序', '孩子的首页按这个顺序显示', '完成') + '''
    <div class="pbody">
      <div class="pcard2">
        ''' + form_rows([('1  叫叫阅读', '拖动 ›'), ('2  口算 20 题', '拖动 ›'), ('3  跳绳 100 个', '拖动 ›')]) + '''
        <div class="warn">孩子端按这个顺序显示；做完的会沉到最后。</div>
      </div>
    </div>''', 'parent', 2))

write('parent-report-empty.html', shell('报告空态', p_back('周期报告', '小月亮 · 最近 7 天') + '''
    <div class="pbody" style="justify-content:center">
      <div class="pcard2" style="text-align:center;padding:24px 18px">
        <div style="width:80px;height:80px;margin:0 auto 12px;border-radius:26px;background:#f7f5fb;display:flex;align-items:center;justify-content:center">''' + icon('doc', 'i--lg', '#8b7fa8') + '''</div>
        <div style="font-size:15.0px;font-weight:700;color:#1b1230">这个区间还没有记录</div>
        <div style="font-size:12.0px;color:#6b6480;margin-top:6px;line-height:1.7">换一个区间看看，或者等孩子今天做几件事再回来看。</div>
        <button class="pbtn2 pbtn2--ghost" style="margin-top:12px;height:40px">换成最近 30 天</button>
      </div>
    </div>''', 'parent', 0))

write('parent-export.html', shell('批量导出', p_back('导出图片', '选几条一起导出') + '''
    <div class="pbody">
      <div class="pcard2">
        ''' + form_rows([('3 月 12 日 · 小日记', '已选'), ('3 月 11 日 · 小日记', '未选'), ('3 月 6–12 日 · 周期报告', '已选')]) + '''
        <div class="warn">导出是图片，微信里可以长按保存到相册。</div>
      </div>
      <button class="pbtn2" style="width:100%;height:44px;margin-top:12px">导出 2 张</button>
    </div>''', 'parent', 0))

write('parent-chat.html', shell('问布布', p_back('问布布', '两个孩子的数据') + '''
    <div class="pbody" style="padding-bottom:8px">
      <div class="seg2" style="margin:2px 0 10px">
        <button class="seg2__item seg2__item--on">全部孩子</button>
        <button class="seg2__item">小月亮</button>
        <button class="seg2__item">小米粒</button>
      </div>
      <div class="cmsg cmsg--kid" style="max-width:100%"><div class="cbubble">这周两个孩子各做了什么</div></div>
      <div class="pcard2">
        <div style="font-size:12.0px;color:#6b6480;font-weight:600;margin-bottom:6px">这周两个孩子各做了什么</div>
        <div style="font-size:13px;line-height:1.8;color:#3b3350">
          <b>小月亮</b>：读完 3 本，运动 4 次共 95 分钟，得 26 颗星<br>
          <b>小米粒</b>：读完 1 本（读了 3 遍），运动 2 次共 40 分钟，得 12 颗星
        </div>
        <div style="font-size:11.5px;color:#6b6480;margin-top:8px;padding-top:8px;border-top:1px dashed #f0e9f8">两个孩子的节奏不一样，先按各自的节奏来就挺好。</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px">
        <button class="quickchip" style="min-height:40px;font-size:12.0px">谁需要我多陪一会</button>
        <button class="quickchip" style="min-height:40px;font-size:12.0px">下周可以怎么调整</button>
      </div>
    </div>
    <div class="chatinput" style="padding:8px 14px 14px">
      <div class="chatinput__box" style="height:44px;font-size:13.0px">想问什么就打在这里…</div>
      <button class="chatinput__send" style="width:44px;height:44px;border-radius:14px" aria-label="发送">''' + icon('chev', 'i--sm', '#fff') + '''</button>
    </div>''', 'parent', 0, with_nav=False))

# ---------------- 通用 ----------------
write('state-empties.html', shell('空态四连', '''
    <div class="scroll" style="display:flex;flex-direction:column;gap:12px;padding:12px 16px">
      <div class="qcard" style="text-align:center;padding:20px 16px;margin:0"><div style="font-size:15px;font-weight:800;color:#2b1147">还没有心愿</div><div style="font-size:12.0px;color:#7c5a9e;margin-top:4px">写下一个，让爸爸妈妈定价</div></div>
      <div class="qcard" style="text-align:center;padding:20px 16px;margin:0"><div style="font-size:15px;font-weight:800;color:#2b1147">小信箱是空的</div><div style="font-size:12.0px;color:#7c5a9e;margin-top:4px">爸妈和布布写的话会出现在这里</div></div>
      <div class="qcard" style="text-align:center;padding:20px 16px;margin:0"><div style="font-size:15px;font-weight:800;color:#2b1147">商店今天没上新</div><div style="font-size:12.0px;color:#7c5a9e;margin-top:4px">先去攒星，明天再来看看</div></div>
      <div class="qcard" style="text-align:center;padding:20px 16px;margin:0"><div style="font-size:15px;font-weight:800;color:#2b1147">还没有徽章</div><div style="font-size:12.0px;color:#7c5a9e;margin-top:4px">开第一个宝箱就能拿到</div></div>
    </div>''', 'kid', 1))

write('tablet-two-col.html', shell('平板两栏', '''
    <div style="flex:1;display:flex;min-height:0">
      <div style="width:300px;border-right:1px solid #eceaf2;overflow:auto;background:#fff">
        <div style="padding:14px;border-bottom:1px solid #f1ecf7"><div style="font-size:15px;font-weight:700;color:#1b1230">任务</div><div style="font-size:11.5px;color:#6b6480;margin-top:2px">小月亮 · 6 个</div></div>
        <div style="padding:12px 14px;border-bottom:1px solid #f4f2f8;background:#faf7ff"><div style="font-size:13.0px;font-weight:700;color:#1b1230">叫叫阅读</div><div style="font-size:11.5px;color:#6b6480;margin-top:2px">5 次 / 天 · 3 颗星</div></div>
        <div style="padding:12px 14px;border-bottom:1px solid #f4f2f8"><div style="font-size:13.0px;font-weight:700;color:#1b1230">口算 20 题</div><div style="font-size:11.5px;color:#6b6480;margin-top:2px">5 次 / 天 · 2 颗星</div></div>
        <div style="padding:12px 14px"><div style="font-size:13.0px;font-weight:700;color:#1b1230">跳绳 100 个</div><div style="font-size:11.5px;color:#6b6480;margin-top:2px">1 次 / 天 · 2 颗星</div></div>
      </div>
      <div style="flex:1;padding:16px;overflow:auto">
        <div class="pcard2">
          <div class="pcard2__head"><h2 class="pcard2__title">叫叫阅读</h2><span class="pcard2__meta">每天</span></div>
          ''' + form_rows([('次数', '5 次 / 天'), ('奖励', '3 颗星'), ('拍照', '可选'), ('确认', '不需要')]) + '''
        </div>
      </div>
    </div>''', 'parent', 2, with_nav=False))

print('第四批（家长端剩余 + 通用）完成')
