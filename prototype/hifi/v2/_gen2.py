#!/usr/bin/env python3
"""第三批：引导 / 前置 / 孩子端剩余 / 家长端剩余 / 通用"""
from _lib import (
    write, shell, icon, kid_back, p_back, form_rows, list_rows, plist_rows,
    guide_step, sheet_page, PINK, LILAC, MINT, AMBER, BLUE, PURPLE, GRAY,
)

# ---------------- 引导 8 步 ----------------
write('setup-consent.html', guide_step(1, '先给孩子的使用做一次同意',
    '孩子的信息只用来记录学习和成长，不做广告、不对外分享。',
    '<div class="pcard2">' + form_rows([('隐私政策', 'v1.2 已读 ›'), ('儿童个人信息规则', 'v1.2 已读 ›')]) +
    '<div class="warn">监护人点「同意」后生效；随时可以在「我的 → 隐私与数据」撤回。</div></div>', '同意并继续'))

write('setup-welcome.html', guide_step(2, '欢迎来到布布',
    '这里没有排行榜，也没有「别人家孩子」。只有你自己的进度。',
    '<div class="pcard2"><div class="obs" style="border:0;background:none;padding:0">' +
    '<div class="obs__row"><span class="obs__dot"></span><span>每个孩子有自己的账号和密码</span></div>' +
    '<div class="obs__row"><span class="obs__dot"></span><span>家长可以定义所有规则与奖励</span></div>' +
    '<div class="obs__row"><span class="obs__dot"></span><span>孩子之间不做比较</span></div></div></div>', '开始第一步'))

write('setup-child.html', guide_step(3, '添加第一个孩子', '昵称、年龄、头像，三样就够；账号自动生成。',
    '<div class="pcard2">' + form_rows([('昵称', '小月亮'), ('年龄', '8 岁'), ('头像', '兔子 · 预设'), ('登录账号', 'BUBU7K2M9X')]) + '</div>'))

write('setup-template.html', guide_step(4, '选一套模板', '不必从空白开始，先选一套，之后随时改。',
    '<div class="pcard2" style="padding:0 13px">' + plist_rows([
        ('book', '小学生日常', '阅读 + 口算 + 运动', '已选', '', PINK, '#c026d3'),
        ('jump', '运动优先', '跳绳 + 骑车 + 家务', '选择', '', MINT, '#16a34a'),
        ('star', '空白开始', '自己一个个加', '选择', '', GRAY, '#6b6480'),
    ]) + '</div>'))

write('setup-preview.html', guide_step(5, '看一眼将启用的内容', '这些任务会出现在孩子的首页，之后随时可以改。',
    '<div class="pcard2">' + form_rows([('每天', '叫叫阅读、口算、跳绳'), ('每周', '学校作业、预习课文'), ('默认奖励', '达标 2–3 颗星'), ('拍照', '可选（默认）')]) + '</div>'))

write('setup-gate.html', guide_step(6, '设一个家长密码', '6 位数字，只有你知道。孩子进不了家长端。',
    '<div class="pcard2" style="text-align:center"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">' +
    ''.join('<div class="authinput" style="height:48px;justify-content:center;padding:0">%s</div>' % (t if t else '') for t in ['7', '2', '', '', '', '']) +
    '</div><div class="warn" style="margin-top:10px">忘了可以重设，但需要登录密码</div></div>'))

write('setup-usage.html', guide_step(7, '使用时间', '推荐值已经填好，按孩子的作息调一下就行。',
    '<div class="pcard2">' + form_rows([('每天可以玩', '40 分钟'), ('休息间隔', '玩 20 分歇 5 分'), ('睡觉时间', '21:00 – 07:00')]) + '</div>'))

write('setup-done.html', guide_step(8, '都设好了', '接下来交给孩子：打开布布，点第一个任务试试。',
    '<div class="pcard2" style="text-align:center;padding:20px 16px">' +
    '<div style="width:76px;height:76px;margin:0 auto 12px;border-radius:24px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">' + icon('check', 'i--lg', '#a855f7') + '</div>' +
    '<div style="font-size:15.0px;font-weight:800;color:#2b1147">可以开始啦</div>' +
    '<div style="font-size:12.0px;color:#7c5a9e;margin-top:6px">孩子的账号：BUBU7K2M9X</div></div>', '进入孩子端', '稍后再来'))

# ---------------- 前置文档与孩子登录 ----------------
write('privacy-doc.html', shell('隐私政策', p_back('隐私政策', 'v1.2 · 2026-03-01 生效') + '''
    <div class="pbody">
      <div class="pcard2" style="font-size:13px;line-height:1.9;color:#3b3350">
        <p><b>一、我们收集什么</b><br>昵称、年龄、头像、任务与阅读运动记录、AI 对话摘要。不收集位置、通讯录、设备标识。</p>
        <p><b>二、用来做什么</b><br>只用于展示孩子的进度与生成报告；不做广告投放，不对外提供。</p>
        <p><b>三、AI 与记忆</b><br>布布只记住偏好与情绪线索，不存聊天原文、不存原始音频；家长可查看并删除。</p>
        <p><b>四、你的权利</b><br>可撤回同意、导出数据、删除某个孩子的数据、注销账号。</p>
      </div>
    </div>''', 'parent', 4))

write('choose-kid.html', shell('选人页', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;padding:0 24px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#2b1147;margin-bottom:18px">你要找谁呀？</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="task" style="flex-direction:column;height:auto;padding:18px;gap:8px">
          <div class="task__tile" style="background:''' + PINK + '''">''' + icon('heart', 'i--lg', '#c026d3') + '''</div>
          <div class="task__name" style="font-size:15px">小月亮</div>
          <div class="kline__s">今天 1 / 3</div>
        </div>
        <div class="task" style="flex-direction:column;height:auto;padding:18px;gap:8px">
          <div class="task__tile" style="background:''' + BLUE + '''">''' + icon('star', 'i--lg', '#2563eb') + '''</div>
          <div class="task__name" style="font-size:15px">小米粒</div>
          <div class="kline__s">今天 0 / 1</div>
        </div>
      </div>
      <div style="margin-top:18px;font-size:12.0px;color:#7d7395">设备会记住上次选择，下次直达</div>
    </div>''', 'kid', 0, with_nav=False))

write('kid-login.html', shell('孩子登录', '''
    <div class="authwrap">
      <div class="authbrand">
        <div class="authbrand__logo">''' + icon('heart', 'i--lg', '#a855f7') + '''</div>
        <h1 class="authbrand__t">小月亮，输一下密码</h1>
        <p class="authbrand__s">只有你自己知道</p>
      </div>
      <div class="authcard">
        <div class="authfield"><div class="authfield__row"><label>账号</label></div><div class="authinput">BUBU7K2M9X</div></div>
        <div class="authfield"><div class="authfield__row"><label>密码</label></div><div class="authinput">••••••</div></div>
        <button class="authbtn">进去</button>
        <div class="authlinks"><button>换一个人</button></div>
      </div>
    </div>''', 'kid', 0, with_nav=False))

write('kid-pwd-set.html', shell('改成自己的密码', kid_back('改成自己的密码', '第一次进来，换一个你记得住的') + '''
    <div class="scroll">
      <div class="qcard">
        <div class="kv frow" style="border-top:0"><span>新密码</span><b>••••••</b></div>
        <div class="kv frow"><span>再输一次</span><b>••••••</b></div>
      </div>
      <div class="tip" style="margin-top:14px"><span class="tip__ico">''' + icon('lock', 'i--sm', '#c026d3') + '''</span><p class="tip__t">6 位数字就好，别用生日</p></div>
      <div class="kfoot"><button class="kbtn">就这么定</button></div>
    </div>''', 'kid', 5))

# ---------------- 孩子端剩余 ----------------
write('kid-avatar.html', sheet_page('换头像', '挑一个你喜欢的',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
    ''.join('<div class="good" style="align-items:center;padding:14px">%s</div>' % icon(k, 'i--lg', c) for k, c in [('heart', '#c026d3'), ('star', '#b45309'), ('book', '#6366f1')]) +
    '</div><div style="font-size:11.5px;color:#7d7395;margin-top:10px;text-align:center">想要自己的照片？让爸爸妈妈在家长端帮你换。</div>', '就这个'))

write('kid-empty-today.html', shell('今天没任务', '''
    <div class="scroll kid-empty">
      <div class="qcard" style="text-align:center;padding:24px 16px;margin-top:8px">
        <div style="width:80px;height:80px;margin:0 auto 12px;border-radius:26px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('heart', 'i--lg', '#a855f7') + '''</div>
        <div style="font-size:15px;font-weight:800;color:#2b1147">今天的事情都做完啦</div>
        <div style="font-size:12.0px;color:#7c5a9e;margin-top:6px">现在是自由时间，想做点什么都可以</div>
      </div>
      <div class="klines" style="margin-top:14px">
        <div class="kline"><span class="kline__ico" style="background:''' + PINK + '''">''' + icon('book', 'i--sm', '#c026d3') + '''</span><div><div class="kline__t">读一会儿</div><div class="kline__s">随便挑一本</div></div><span class="kline__v">›</span></div>
        <div class="kline"><span class="kline__ico" style="background:''' + MINT + '''">''' + icon('jump', 'i--sm', '#16a34a') + '''</span><div><div class="kline__t">动一动</div><div class="kline__s">跳绳或者骑车</div></div><span class="kline__v">›</span></div>
        <div class="kline"><span class="kline__ico" style="background:''' + PURPLE + '''">''' + icon('mail', 'i--sm', '#7c3aed') + '''</span><div><div class="kline__t">和布布说说话</div><div class="kline__s">它在</div></div><span class="kline__v">›</span></div>
      </div>
    </div>''', 'kid', 1))

write('kid-memory.html', shell('布布记住了', kid_back('布布记住了', '你可以随时让它忘掉') + '''
    <div class="scroll">
      <div class="klines">
        <div class="kline"><span class="kline__ico" style="background:''' + PINK + '''">''' + icon('heart', 'i--sm', '#be185d') + '''</span><div><div class="kline__t">你喜欢恐龙</div><div class="kline__s">3 月 12 日记下的</div></div><span class="kline__v">改 ›</span></div>
        <div class="kline"><span class="kline__ico" style="background:''' + PURPLE + '''">''' + icon('star', 'i--sm', '#7c3aed') + '''</span><div><div class="kline__t">你在学钢琴</div><div class="kline__s">3 月 2 日记下的</div></div><span class="kline__v">改 ›</span></div>
        <div class="kline"><span class="kline__ico" style="background:''' + BLUE + '''">''' + icon('clock', 'i--sm', '#2563eb') + '''</span><div><div class="kline__t">考试前会紧张</div><div class="kline__s">3 月 9 日记下的</div></div><span class="kline__v">改 ›</span></div>
      </div>
      <div class="tip" style="margin-top:14px"><span class="tip__ico">''' + icon('lock', 'i--sm', '#c026d3') + '''</span><p class="tip__t">它只记住你喜欢什么，不会记住你说过的话</p></div>
    </div>''', 'kid', 5))

write('kid-firstrun.html', shell('首次体验', '''
    <div class="scroll" style="display:flex;flex-direction:column;padding:0 20px">
      <div style="text-align:center;padding-top:8px">
        <div style="width:84px;height:84px;margin:0 auto 12px;border-radius:28px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('star', 'i--lg', '#a855f7') + '''</div>
        <div style="font-size:17px;font-weight:800;color:#2b1147">这四件事你会用到</div>
      </div>
      <div class="klines" style="margin-top:14px">
        <div class="kline"><span class="kline__ico" style="background:''' + PINK + '''">''' + icon('check', 'i--sm', '#c026d3') + '''</span><div><div class="kline__t">点任务后面的 ＋1</div><div class="kline__s">做完一次就点一下</div></div></div>
        <div class="kline"><span class="kline__ico" style="background:''' + AMBER + '''">''' + icon('star', 'i--sm', '#b45309') + '''</span><div><div class="kline__t">星星会飞进宝箱</div><div class="kline__s">凑满一箱就能开</div></div></div>
        <div class="kline"><span class="kline__ico" style="background:''' + MINT + '''">''' + icon('gift', 'i--sm', '#16a34a') + '''</span><div><div class="kline__t">星星可以去商店换东西</div><div class="kline__s">也能攒着实现一个心愿</div></div></div>
        <div class="kline"><span class="kline__ico" style="background:''' + PURPLE + '''">''' + icon('mail', 'i--sm', '#7c3aed') + '''</span><div><div class="kline__t">布布会先跟你说话</div><div class="kline__s">不知道说什么就点气泡</div></div></div>
      </div>
      <div class="kfoot"><button class="kbtn">我知道了</button></div>
    </div>''', 'kid', 1, with_nav=False))

write('kid-restwall.html', shell('休息一下', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:116px;height:116px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(160deg,#e8f7ff,#f3e8fe);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(168,85,247,.06)">''' + icon('clock', 'i--lg', '#7c3aed') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">眼睛歇一会儿</div>
      <div style="font-size:13.0px;color:#7c5a9e;margin-top:8px;line-height:1.7">跟着圆圈慢慢呼吸<br>5 分钟后自动回去</div>
    </div>''', 'kid', 1, with_nav=False))

write('kid-photoview.html', shell('照片查看', kid_back('3 月 12 日的照片', '跳绳打卡') + '''
    <div class="scroll">
      <div style="margin:0 16px;height:300px;border-radius:22px;background:linear-gradient(160deg,#f5e6ff,#ffe6f2);display:flex;align-items:center;justify-content:center">''' + icon('camera', 'i--lg', '#b48ad6') + '''</div>
      <div class="klines" style="margin-top:14px">
        <div class="kline"><span class="kline__ico" style="background:''' + MINT + '''">''' + icon('jump', 'i--sm', '#16a34a') + '''</span><div><div class="kline__t">跳绳 100 个</div><div class="kline__s">3 月 12 日 19:20</div></div><span class="kline__v">+2 星</span></div>
      </div>
      <div style="text-align:center;margin-top:14px;font-size:12.0px;color:#7d7395">可以删掉这张照片，星星不会收回</div>
    </div>''', 'kid', 1))

print('第三批（引导/前置/孩子端）完成')
