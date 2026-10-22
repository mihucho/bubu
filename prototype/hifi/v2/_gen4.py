#!/usr/bin/env python3
"""第五批：补齐同构变体（把总屏数推到 113 口径）"""
from _lib import (
    write, shell, icon, kid_back, p_back, form_rows, list_rows, plist_rows,
    sheet_page, PINK, LILAC, MINT, AMBER, BLUE, PURPLE, GRAY,
)

# ---------------- 孩子端变体 ----------------
write('kid-task-done-detail.html', shell('已完成任务', kid_back('跳绳 100 个', '今天已完成 · 得 2 颗星') + f'''
    <div class="scroll">
      <section class="progcard">
        <div class="progcard__row"><span>今天 1 / 1 次</span><span>已达标</span></div>
        <div class="bar"><i style="width:100%"></i></div>
        <div class="progcard__row" style="margin-top:12px"><span>本周 4 天达标</span><span>连续 3 天</span></div>
      </section>
      <div class="klines">
        <div class="kline"><span class="kline__ico" style="background:{MINT}">{icon('check','i--sm','#16a34a')}</span><div><div class="kline__t">今天 19:20</div><div class="kline__s">拍了 1 张照片</div></div><span class="kline__v">+2</span></div>
      </div>
      <div class="tip" style="margin-top:14px"><span class="tip__ico">{icon('heart','i--sm','#c026d3')}</span><p class="tip__t">点错了？可以撤销这一次</p></div>
    </div>''', 'kid', 1))

write('kid-shop-confirm.html', (sheet_page('兑换确认', '用 8 颗星换一张贴纸？',
    f'<div class="kv frow"><span>现在有</span><b>29 颗</b></div><div class="kv frow"><span>换完剩</span><b>21 颗</b></div>', '换！', '再想想')))

write('kid-wish-new.html', (sheet_page('许个愿', '写下你想要的东西',
    '<div class="authinput" style="height:44px">一套恐龙拼图</div><div style="font-size:12px;color:#7d7395;margin-top:8px">写下来就好，价格由爸爸妈妈定</div>', '交给爸爸妈妈', '取消')))

write('kid-quest-wrong.html', shell('答错了', kid_back('第 3 关 · 间隔与排队', '第 2 题 / 共 5 题') + f'''
    <div class="scroll">
      <div class="qcard"><div class="qcard__q">小明从第 1 棵树走到第 5 棵树，每两棵树之间隔 4 米。一共走了多少米？</div></div>
      <div class="opts">
        <button class="opt"><span class="opt__key">A</span>20 米</button>
        <button class="opt" style="border-color:#fecaca;background:#fff5f5"><span class="opt__key" style="background:#dc2626">B</span>16 米</button>
        <button class="opt"><span class="opt__key">C</span>24 米</button>
      </div>
      <div class="tip" style="margin-top:14px"><span class="tip__ico" style="background:#fff5e8;color:#b45309">{icon('alert','i--sm','#b45309')}</span><p class="tip__t">没关系，再看看：走了几段间隔？</p></div>
      <div class="kfoot"><button class="kbtn">再想一次</button></div>
    </div>''', 'kid', 1))

write('kid-checkin-before.html', shell('签到彩蛋', kid_back('签到彩蛋', '今天还没签到') + f'''
    <div class="scroll">
      <div class="eggcard">
        <div class="eggcard__art">{icon('gift','i--lg','#b45309')}</div>
        <div class="eggcard__t">今天有一枚彩蛋</div>
        <div class="eggcard__s">连续 3 天可以开一个，今天正好第 3 天</div>
      </div>
      <div class="kfoot"><button class="kbtn">打开今天的彩蛋</button></div>
    </div>''', 'kid', 1))

write('kid-inbox-read.html', shell('信', kid_back('妈妈', '昨晚 20:12') + f'''
    <div class="scroll">
      <div class="qcard"><div class="qcard__q" style="font-size:15px;line-height:1.8">今天跳绳没断，妈妈看到了。明天要不要试试 120 个？</div></div>
      <div class="klines" style="margin-top:12px">
        <div class="kline"><span class="kline__ico" style="background:{PINK}">{icon('mail','i--sm','#be185d')}</span><div><div class="kline__t">回一句</div><div class="kline__s">说说你的想法</div></div><span class="kline__v">›</span></div>
      </div>
    </div>''', 'kid', 5))

write('kid-badge-detail.html', shell('徽章详情', kid_back('第一次开宝箱', '3 月 3 日拿到') + f'''
    <div class="scroll">
      <div class="qcard" style="text-align:center;padding:24px 16px">
        <div style="width:88px;height:88px;margin:0 auto 12px;border-radius:28px;background:{AMBER};display:flex;align-items:center;justify-content:center">{icon('star','i--lg','#b45309')}</div>
        <div style="font-size:17px;font-weight:800;color:#2b1147">第一次开宝箱</div>
        <div style="font-size:12px;color:#7c5a9e;margin-top:6px">第一次把宝箱装满，打开的那一刻</div>
      </div>
      <div class="klines" style="margin-top:12px">
        <div class="kline"><span class="kline__ico" style="background:{MINT}">{icon('check','i--sm','#16a34a')}</span><div><div class="kline__t">条件</div><div class="kline__s">宝箱第一次装满</div></div></div>
      </div>
    </div>''', 'kid', 5))

write('kid-ledger-empty.html', shell('星星账本', kid_back('星星账本', '还没有记录') + f'''
    <div class="scroll">
      <div class="qcard" style="text-align:center;padding:24px 16px">
        <div style="width:80px;height:80px;margin:0 auto 12px;border-radius:26px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">{icon('star','i--lg','#a855f7')}</div>
        <div style="font-size:15px;font-weight:800;color:#2b1147">还没有星星</div>
        <div style="font-size:12px;color:#7c5a9e;margin-top:6px">完成第一个任务就有啦</div>
      </div>
      <div class="kfoot"><button class="kbtn">回首页看看</button></div>
    </div>''', 'kid', 5))

write('kid-photo-camera.html', shell('拍照', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:18px;padding:0 24px;text-align:center">
      <div style="width:100%;height:320px;border-radius:22px;background:linear-gradient(160deg,#efe6ff,#ffe6f2);display:flex;align-items:center;justify-content:center">''' + icon('camera','i--lg','#b48ad6') + '''</div>
      <div style="font-size:13px;color:#7c5a9e">把镜头对准作业本，拍清楚一点</div>
      <button class="kbtn" style="width:100%">拍好了</button>
      <button class="gstep-back">取消</button>
    </div>''', 'kid', 1, with_nav=False))

write('kid-wait-confirm.html', shell('等爸爸妈妈看', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 26px">
      <div style="width:96px;height:96px;margin:0 auto 16px;border-radius:32px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('clock','i--lg','#a855f7') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">已经交给爸爸妈妈啦</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:8px;line-height:1.7">他们看到照片就会确认，一般当天就好</div>
      <div style="margin-top:20px"><button class="kbtn" style="width:100%">先去做别的</button></div>
    </div>''', 'kid', 1))

write('kid-locked.html', shell('需要家长', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:96px;height:96px;margin:0 auto 16px;border-radius:32px;background:linear-gradient(160deg,#f5f1fa,#efe6fa);display:flex;align-items:center;justify-content:center">''' + icon('lock','i--lg','#7c3aed') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">这里要爸爸妈妈来</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:8px;line-height:1.7">把手机交给爸爸妈妈，让他们输一下密码</div>
      <div style="margin-top:20px"><button class="kbtn" style="width:100%">回首页</button></div>
    </div>''', 'kid', 1, with_nav=False))

write('kid-404.html', shell('页面走丢', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:96px;height:96px;margin:0 auto 16px;border-radius:32px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('alert','i--lg','#a855f7') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">页面走丢了</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:8px;line-height:1.7">没关系，先回首页，今天要做的事都还在</div>
      <div style="margin-top:20px"><button class="kbtn" style="width:100%">回首页</button></div>
    </div>''', 'kid', 1, with_nav=False))

write('kid-ai-degraded.html', shell('布布看不到', '''
    <div class="chatwrap">
      <div class="chathead"><div class="chathead__ava">''' + icon('heart','i--sm','#a855f7') + '''</div><div><div class="chathead__name">布布</div><div class="chathead__sub">小月亮的好朋友</div></div></div>
      <div class="chatbody">
        <div class="cmsg cmsg--kid"><div class="cbubble">我今天读了几分钟</div></div>
        <div class="cmsg cmsg--bub"><span class="cmsg__ava">''' + icon('heart','i--sm','#a855f7') + '''</span><div class="cbubble">这个我暂时看不到</div></div>
        <div class="cmsg cmsg--kid"><div class="cbubble">那你猜猜嘛</div></div>
        <div class="cmsg cmsg--bub"><span class="cmsg__ava">''' + icon('heart','i--sm','#a855f7') + '''</span><div class="cbubble">我猜不准，怕说错了骗到你</div></div>
      </div>
      <div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">
        <button class="kbtn" style="height:52px">再问一次</button>
        <button class="kbtn kbtn--ghost" style="height:52px">去看我的阅读</button>
      </div>
    </div>''', 'kid', 4, with_nav=False))

# ---------------- 家长端变体 ----------------
write('parent-task-new.html', shell('新建任务', p_back('新建任务', '小月亮', '保存') + '''
    <div class="pbody">
      <section class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">基本信息</h2></div>''' +
    form_rows([('任务名', '跳绳'), ('图标', '跳绳 · 绿色'), ('周期', '每天'), ('次数', '1 次 / 天')]) + '''</section>
      <section class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">达标奖励</h2></div>''' +
    form_rows([('奖励星星', '2 颗'), ('拍照', '可选'), ('要我确认', '不需要')]) + '''</section>
      <div class="pcard2" style="display:flex;gap:9px;align-items:center">''' + icon('doc','i--sm','#7c3aed') +
    '''<span style="font-size:12px;font-weight:600;color:#3b3350">用模板更快：12 个现成的任务</span></div>
    </div>''', 'parent', 2))

write('parent-shop-list.html', shell('商店物品', p_back('商店物品', '6 个 · 3 个上架', '新建') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">''' + plist_rows([
        ('gift', '贴纸一张', '8 颗星 · 不限库存', '上架', '', AMBER, '#b45309'),
        ('mail', '给妈妈写信', '12 颗星 · 不限库存', '上架', '', BLUE, '#2563eb'),
        ('star', '挑一个徽章', '45 颗星 · 剩 2 个', '上架', '', PURPLE, '#7c3aed'),
        ('gift', '周末多玩 1 小时', '60 颗星 · 已下架', '下架', '', GRAY, '#6b6480'),
      ]) + '''</section>
    </div>''', 'parent', 2))

write('parent-shop-new.html', shell('新建商品', p_back('新建商品', '上架后孩子就能换', '保存') + '''
    <div class="pbody">
      <section class="pcard2">''' + form_rows([('名称', '小黄油零食'), ('价格', '20 颗星'), ('库存', '不限'), ('上架', '是')]) + '''</section>
      <div class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">说明给孩子听</h2></div>
        <div style="font-size:12px;line-height:1.7;color:#3b3350">换完可以给小黄油喂一次。</div></div>
    </div>''', 'parent', 2))

write('parent-wish-price.html', (sheet_page('给这个心愿定价', '「去动物园」要多少颗星？',
    f'<div class="kv frow"><span>孩子现在有</span><b>29 颗</b></div><div class="kv frow"><span>同类心愿参考</span><b>40–60 颗</b></div><div class="kv frow"><span>定价</span><b>40 颗</b></div>', '就定 40', '再想想')))

write('parent-wish-defer.html', (sheet_page('先放一放？', '「去迪士尼」有点远',
    '<div style="font-size:12px;line-height:1.7;color:#3b3350">给孩子一个替代的小目标，她会更容易理解。</div><div class="authinput" style="height:56px;margin-top:10px;align-items:flex-start;padding-top:12px;font-size:13px">这个周末我们先去科技馆看恐龙，好不好？</div>', '以后再说', '还是定价')))

write('parent-confirm-ok.html', shell('已确认', p_back('已确认', '小月亮 · 学校作业') + '''
    <div class="pbody" style="justify-content:center">
      <div class="pcard2" style="text-align:center;padding:24px 18px">
        <div style="width:76px;height:76px;margin:0 auto 12px;border-radius:24px;background:#ecfdf3;display:flex;align-items:center;justify-content:center">''' + icon('check','i--lg','#16a34a') + '''</div>
        <div style="font-size:15px;font-weight:700;color:#1b1230">已确认，星星到账</div>
        <div style="font-size:12px;color:#6b6480;margin-top:6px">小月亮会收到一条站内消息</div>
      </div>
    </div>''', 'parent', 0))

write('parent-confirm-stale.html', shell('已自动通过', p_back('已自动通过', '超过 24 小时未处理') + '''
    <div class="pbody">
      <div class="pcard2">
        <div style="font-size:12px;line-height:1.8;color:#3b3350">「学校作业」的提交超过 24 小时没有处理，系统按规则自动通过了，星星已发。</div>
        <div class="warn" style="margin-top:10px">如果你觉得不对，可以在「记录」里找到这次打卡并撤销。</div>
      </div>
    </div>''', 'parent', 0))

write('parent-notif-detail.html', shell('通知详情', p_back('等你确认', '今天 18:20') + '''
    <div class="pbody">
      <div class="pcard2">
        ''' + form_rows([('孩子', '小月亮'), ('任务', '学校作业'), ('提交时间', '今天 18:20'), ('状态', '等你确认')]) + '''
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="pbtn2 pbtn2--ghost" style="flex:1;height:44px">让他再做</button>
        <button class="pbtn2" style="flex:1;height:44px">去确认</button>
      </div>
    </div>''', 'parent', 0))

write('parent-child-new.html', shell('添加孩子', p_back('添加孩子', '最多 6 个', '保存') + '''
    <div class="pbody">
      <section class="pcard2">''' + form_rows([('昵称', ''), ('年龄', '5 岁'), ('头像', '猫咪 · 预设')]) + '''</section>
      <div class="pcard2" style="display:flex;gap:9px;align-items:flex-start">''' + icon('alert','i--sm','#b45309') +
    '''<span style="font-size:12px;line-height:1.65;color:#3b3350">同一个孩子只建一次；账号会在保存后自动生成。</span></div>
    </div>''', 'parent', 4))

write('parent-child-account.html', shell('开通孩子账号', p_back('开通账号', '小米粒 · 5 岁') + '''
    <div class="pbody">
      <section class="pcard2">''' + form_rows([('登录账号', 'BUBU4M9K2P（自动）'), ('初始密码', '123456'), ('孩子可改密码', '可以')]) + '''</section>
      <div class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">开通后会怎样</h2></div>
        <div class="obs" style="border:0;background:none;padding:0">
          <div class="obs__row"><span class="obs__dot"></span><span>小米粒可以在选人页看到自己</span></div>
          <div class="obs__row"><span class="obs__dot"></span><span>第一次登录会提示改成自己的密码</span></div>
        </div></div>
      <button class="pbtn2" style="width:100%;height:44px;margin-top:12px">开通</button>
    </div>''', 'parent', 4))

write('parent-child-devices.html', shell('孩子的设备', p_back('孩子的设备', '小月亮 · 2 台') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">''' + plist_rows([
        ('card', '豆包 · iPad', '今天 19:20 用过', '移除', '在用', PURPLE, '#7c3aed'),
        ('card', '微信 · 妈妈的手机', '昨天 20:10 用过', '移除', '', BLUE, '#2563eb'),
      ]) + '''</section>
    </div>''', 'parent', 4))

write('parent-diary-detail.html', shell('日记详情', p_back('3 月 12 日 · 很开心', '小月亮') + '''
    <div class="pbody">
      <div class="pcard2"><div style="font-size:13px;line-height:1.9;color:#3b3350">今天数学考了 100 分，老师说我是第一个交卷的。回家路上我一直在想，明天还能不能考 100 分。</div></div>
      <div class="pcard2">''' + form_rows([('那天的心情', '很开心'), ('做的事', '2 个任务 · 阅读 20 分钟')]) + '''</div>
    </div>''', 'parent', 0))

write('parent-chat-detail.html', shell('对话摘要', p_back('3 月 12 日 · 对话摘要', '小月亮') + '''
    <div class="pbody">
      <div class="pcard2"><div style="font-size:12px;line-height:1.9;color:#3b3350">聊了数学小测，孩子一开始说「怕考不好」，后来被鼓励到说「那我明天再试试」。答应明天讲恐龙故事。</div></div>
      <div class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">布布查了什么</h2><span class="pcard2__meta">2 次</span></div>''' +
    form_rows([('get_today_snapshot', '09:10'), ('get_mood_notes', '09:12')]) + '''</div>
    </div>''', 'parent', 0))

write('parent-export-preview.html', shell('导出预览', p_back('导出预览', '小日记 · 3:4') + '''
    <div class="pbody">
      <div class="pcard2" style="padding:10px">
        <div style="border-radius:12px;padding:16px;background:linear-gradient(170deg,#fff6fb,#f3e8fe)">
          <div style="font-size:11px;color:#7c5a9e">3 月 12 日 · 小月亮</div>
          <div style="font-size:13px;line-height:1.9;color:#3b2b57;margin-top:8px">今天数学考了 100 分，老师说我是第一个交卷的。</div>
          <div style="font-size:11px;color:#7c5a9e;margin-top:14px">布布</div>
        </div>
      </div>
      <div class="pcard2"><button class="pbtn2" style="width:100%;height:44px">保存图片</button>
        <div class="warn" style="text-align:center">微信里可以长按图片保存到相册</div></div>
    </div>''', 'parent', 0))

write('parent-template-mgr.html', shell('任务模板管理', p_back('任务模板', '12 个 · 6 个已启用', '新建') + '''
    <div class="pbody">
      <section class="pcard2" style="padding:0 13px">''' + plist_rows([
        ('book', '叫叫阅读', '5 次 / 天 · 3 颗星', '已启用', '', PINK, '#c026d3'),
        ('calc', '口算练习', '5 次 / 天 · 2 颗星', '已启用', '', PURPLE, '#7c3aed'),
        ('jump', '跳绳', '1 次 / 天 · 2 颗星', '已启用', '', MINT, '#16a34a'),
        ('doc', '预习课文', '2 次 / 周 · 2 颗星', '未启用', '', GRAY, '#6b6480'),
      ]) + '''</section>
    </div>''', 'parent', 2))

write('parent-ai-degraded.html', shell('工具失败', p_back('问布布', '小月亮 · 数据') + '''
    <div class="pbody">
      <div class="cmsg cmsg--kid" style="max-width:100%"><div class="cbubble">小月亮这周读了多久</div></div>
      <div class="pcard2" style="margin-top:10px;display:flex;gap:9px;align-items:flex-start">''' + icon('alert','i--sm','#b45309') +
    '''<div style="font-size:12px;line-height:1.75;color:#3b3350">这个我暂时看不到，数据服务有点忙</div></div>
      <div class="pcard2"><div class="pcard2__head"><h2 class="pcard2__title">现在可以</h2></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="pbtn2 pbtn2--ghost" style="height:40px">再问一次</button>
          <button class="pbtn2 pbtn2--ghost" style="height:40px">直接看周期报告</button>
        </div></div>
    </div>''', 'parent', 0))

# ---------------- 通用变体 ----------------
write('state-loading-fail.html', shell('加载失败', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:92px;height:92px;margin:0 auto 14px;border-radius:30px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('alert','i--lg','#a855f7') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">咦，没接上</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:6px">再点一次试试</div>
      <div style="margin-top:18px"><button class="kbtn" style="width:100%">重试</button></div>
    </div>''', 'kid', 1))

write('state-quota.html', shell('今天问满了', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:92px;height:92px;margin:0 auto 14px;border-radius:30px;background:#f7f5fb;display:flex;align-items:center;justify-content:center">''' + icon('clock','i--lg','#8b7fa8') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">今天问满了 30 次</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:6px">明天 0 点恢复，数字和报告随时都能看</div>
    </div>''', 'parent', 5))

write('state-update.html', shell('有新版本', '''
    <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;text-align:center;padding:0 28px">
      <div style="width:92px;height:92px;margin:0 auto 14px;border-radius:30px;background:linear-gradient(160deg,#fff0f7,#f3e8fe);display:flex;align-items:center;justify-content:center">''' + icon('star','i--lg','#a855f7') + '''</div>
      <div style="font-size:17px;font-weight:800;color:#2b1147">布布有新东西啦</div>
      <div style="font-size:13px;color:#7c5a9e;margin-top:6px">关掉重新打开就会更新，不会丢记录</div>
      <div style="margin-top:18px"><button class="kbtn" style="width:100%">知道了</button></div>
    </div>''', 'kid', 1))

write('privacy-child.html', shell('儿童个人信息规则', p_back('儿童个人信息保护规则', 'v1.2') + '''
    <div class="pbody">
      <div class="pcard2" style="font-size:12px;line-height:1.9;color:#3b3350">
        <p><b>一、只收集必要信息</b><br>昵称、年龄、头像、学习记录。不收集人脸、声纹、位置。</p>
        <p><b>二、监护人可随时查看与删除</b><br>在「我的 → 隐私与数据」可以导出、删除孩子的全部数据。</p>
        <p><b>三、AI 的边界</b><br>不存对话原文、不存录音；记忆条目孩子与家长都能删。</p>
      </div>
    </div>''', 'parent', 4))

print('第五批（同构变体）完成')
