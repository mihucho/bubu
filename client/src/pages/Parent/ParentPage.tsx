import React, { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Sparkles,
  Baby,
  Star,
  Trophy,
  User,
  Bell,
  Target,
  FileText,
  RotateCcw,
  PenLine,
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useProfile } from '../../contexts/ProfileContext';
import { updateProfile, exportMoodDiary } from '../../api';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Image } from '@client/src/components/ui/image';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  right: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  right,
  onClick,
  danger,
}) => {
  const content = (
    <div
      className={`flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 shadow-sm ${onClick ? 'active:bg-gray-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[#A855F7]">{icon}</span>
        <span
          className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-[#4A2666]'}`}
        >
          {title}
        </span>
      </div>
      <div className="flex items-center">{right}</div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }
  return content;
};

const ParentPage: React.FC = () => {
  const { profile, loading, refreshProfile } = useAppContext();
  const { updateProfileLocal } = useProfile();
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showTargetPicker, setShowTargetPicker] = useState<boolean>(false);
  const [showRolePicker, setShowRolePicker] = useState<boolean>(false);
  const [showNicknamePicker, setShowNicknamePicker] = useState<boolean>(false);
  const [targetValue, setTargetValue] = useState<number>(8);
  const [roleValue, setRoleValue] = useState<string>('妈妈');
  const [nicknameValue, setNicknameValue] = useState<string>('布布');
  const [toggling, setToggling] = useState<boolean>(false);
  const [roleSaving, setRoleSaving] = useState<boolean>(false);
  const [nicknameSaving, setNicknameSaving] = useState<boolean>(false);

  const handleToggleReadingTracker = async (): Promise<void> => {
    if (!profile || toggling) return;
    setToggling(true);
    try {
      const newValue = !profile.showReadingTracker;
      await updateProfile({ showReadingTracker: newValue });
      void refreshProfile();
    } catch (error) {
      logger.error('切换她看了没失败', error);
      toast.error('切换失败，请重试');
    } finally {
      setToggling(false);
    }
  };

  const handleOpenTargetPicker = (): void => {
    if (!profile) return;
    setTargetValue(profile.weekTarget);
    setShowTargetPicker(true);
  };

  const handleOpenRolePicker = (): void => {
    if (!profile) return;
    setRoleValue(profile.parentRole || '妈妈');
    setShowRolePicker(true);
  };

  const handleOpenNicknamePicker = (): void => {
    if (!profile) return;
    setNicknameValue(profile.nickname || '布布');
    setShowNicknamePicker(true);
  };

  const handleSaveNickname = async (): Promise<void> => {
    const trimmed = nicknameValue.trim();
    if (!trimmed) {
      toast.error('昵称不能为空');
      return;
    }
    if (trimmed.length > 10) {
      toast.error('昵称最多10个字符');
      return;
    }
    try {
      setNicknameSaving(true);
      await updateProfile({ nickname: trimmed });
      void refreshProfile();
      setShowNicknamePicker(false);
      toast.success('已保存新昵称');
    } catch (error) {
      logger.error('保存昵称失败', error);
      toast.error('保存失败，请重试');
    } finally {
      setNicknameSaving(false);
    }
  };

  const ROLE_OPTIONS = ['妈妈', '爸爸', '爷爷', '奶奶'];

  const handleSaveRole = async (): Promise<void> => {
    try {
      setRoleSaving(true);
      await updateProfile({ parentRole: roleValue });
      void refreshProfile();
      setShowRolePicker(false);
      toast.success('已保存');
    } catch (error) {
      logger.error('保存身份设置失败', error);
      toast.error('保存失败，请重试');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleSaveTarget = async (): Promise<void> => {
    try {
      await updateProfile({ weekTarget: targetValue });
      void refreshProfile();
      setShowTargetPicker(false);
      toast.success('已保存');
    } catch (error) {
      logger.error('保存周目标失败', error);
      toast.error('保存失败，请重试');
    }
  };

  const handleExportDiary = async (): Promise<void> => {
    try {
      const blob: Blob = await exportMoodDiary();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `心情日记_${new Date().toLocaleDateString('zh-CN')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      logger.error('导出心情日记失败', error);
      toast.error('导出失败，请重试');
    }
  };

  const handleResetWeek = async (): Promise<void> => {
    if (await showConfirm('确定要重置本周数据吗？此操作不可撤销。')) {
      toast.info('重置功能开发中');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        加载中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        暂无数据
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* 顶部标题 */}
      <div
        className="px-4 pt-8 pb-10 rounded-b-[32px]"
        style={{
          background: 'linear-gradient(180deg, #FF85C1 0%, #A855F7 100%)',
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">家长</h1>
        <p className="text-white/80 text-sm">管理孩子的学习与奖励</p>
      </div>

      <div className="p-4 -mt-6 flex flex-col gap-3">
        {/* 孩子信息卡片 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-sky-200 flex items-center justify-center border-2 border-pink-200">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Baby size={32} className="text-white" />
              )}
            </div>
            <div>
              <div className="text-lg font-bold text-[#4A2666]">
                {profile.nickname}
              </div>
              <div className="inline-flex items-center gap-1 bg-pink-100 px-2 py-0.5 rounded-full text-xs text-pink-500 mt-1">
                <Sparkles size={10} className="text-[#FFD700]" />
                <span>{profile.title}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#4A2666]">
                {profile.availableStars}
              </div>
              <div className="text-xs text-[#8B5FBF] flex items-center justify-center gap-1">
                可用星星 <Star size={12} className="text-[#FFD700]" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#4A2666]">
                {profile.totalStars}
              </div>
              <div className="text-xs text-[#8B5FBF] flex items-center justify-center gap-1">
                累计星星 <Trophy size={12} className="text-[#FFD700]" />
              </div>
            </div>
          </div>
        </div>

        {/* 设置项列表 */}
        <div className="flex flex-col gap-2.5">
          <SettingItem
            icon={<Baby size={20} />}
            title="孩子昵称"
            right={
              <div className="flex items-center gap-1">
                <span className="text-[#8B5FBF] text-sm">
                  {profile.nickname}
                </span>
                <span className="text-[#8B5FBF] text-lg">›</span>
              </div>
            }
            onClick={handleOpenNicknamePicker}
          />

          <SettingItem
            icon={<User size={20} />}
            title="我是谁"
            right={
              <div className="flex items-center gap-1">
                <span className="text-[#8B5FBF] text-sm">
                  {profile.parentRole || '妈妈'}
                </span>
                <span className="text-[#8B5FBF] text-lg">›</span>
              </div>
            }
            onClick={handleOpenRolePicker}
          />

          <SettingItem
            icon={<Bell size={20} />}
            title="她看了没提醒"
            right={
              <button
                role="switch"
                aria-checked={profile.showReadingTracker}
                aria-label="她看了没提醒开关"
                onClick={() => void handleToggleReadingTracker()}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  profile.showReadingTracker ? 'bg-[#FF85C1]' : 'bg-gray-200'
                } ${toggling ? 'opacity-70' : ''}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                    profile.showReadingTracker ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            }
          />

          <SettingItem
            icon={<Target size={20} />}
            title="本周达标目标"
            right={
              <div className="flex items-center gap-1">
                <span className="text-[#8B5FBF] text-sm">
                  {profile.weekTarget}项
                </span>
                <span className="text-[#8B5FBF] text-lg">›</span>
              </div>
            }
            onClick={handleOpenTargetPicker}
          />

          <SettingItem
            icon={<Star size={20} className="text-[#FFD700]" />}
            title="星星规则说明"
            right={<span className="text-[#8B5FBF] text-lg">›</span>}
            onClick={() => setShowRules(true)}
          />

          <SettingItem
            icon={<FileText size={20} />}
            title="导出小日记"
            right={<span className="text-[#8B5FBF] text-lg">›</span>}
            onClick={() => void handleExportDiary()}
          />

          <SettingItem
            icon={<RotateCcw size={20} />}
            title="重置本周数据"
            right={<span className="text-red-500 text-sm font-medium">重置</span>}
            onClick={handleResetWeek}
            danger
          />

        </div>
      </div>

      {/* 星星规则说明弹窗 */}
      {showRules && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#4A2666] mb-4 text-center flex items-center justify-center gap-2">
              <Star size={20} className="text-[#FFD700]" />
              星星规则说明
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-[#4A2666] mb-2">
                  如何获得星星：
                </h4>
                <ul className="space-y-1.5 text-[#8B5FBF] pl-1">
                  <li>• 完成任务打卡：每个任务 1-3 颗星</li>
                  <li>• 签到彩蛋：每天4个彩蛋，每个+1颗星</li>
                  <li>• 记录心情：每天写心情 +2颗星</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#4A2666] mb-2">
                  如何使用星星：
                </h4>
                <ul className="space-y-1.5 text-[#8B5FBF] pl-1">
                  <li>• 在星星商店兑换奖励</li>
                  <li>• 1颗星 = 1分钟动画片时间</li>
                  <li>• 1颗星 = 1元零花钱</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-6 py-3 rounded-full text-white font-bold text-sm"
              style={{
                background: 'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 本周达标目标选择弹窗 */}
      {showTargetPicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setShowTargetPicker(false)}
        >
          <div
            className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#4A2666] mb-4 text-center flex items-center justify-center gap-2">
              <Target size={20} className="text-[#FF85C1]" />
              本周达标目标
            </h3>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setTargetValue(Math.max(1, targetValue - 1))}
                className="w-10 h-10 rounded-full bg-pink-100 text-[#FF85C1] text-xl font-bold flex items-center justify-center active:scale-95"
                aria-label="减少"
              >
                −
              </button>
              <div className="text-4xl font-bold text-[#4A2666] w-20 text-center">
                {targetValue}
              </div>
              <button
                onClick={() => setTargetValue(Math.min(30, targetValue + 1))}
                className="w-10 h-10 rounded-full bg-pink-100 text-[#FF85C1] text-xl font-bold flex items-center justify-center active:scale-95"
                aria-label="增加"
              >
                +
              </button>
            </div>

            <p className="text-center text-[#8B5FBF] text-sm mb-6">
              每周需要完成 {targetValue} 个任务算达标
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTargetPicker(false)}
                className="flex-1 py-3 rounded-full bg-gray-100 text-[#8B5FBF] font-bold text-sm"
              >
                取消
              </button>
              <button
                onClick={() => void handleSaveTarget()}
                className="flex-1 py-3 rounded-full text-white font-bold text-sm"
                style={{
                  background:
                    'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 昵称修改弹窗 */}
      {showNicknamePicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setShowNicknamePicker(false)}
        >
          <div
            className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#4A2666] mb-2 text-center flex items-center justify-center gap-2">
              <PenLine size={20} className="text-[#FF85C1]" />
              修改孩子昵称
            </h3>
            <p className="text-center text-[#8B5FBF] text-xs mb-5">
              修改后，首页、聊天页和AI对话都会用新昵称哦
            </p>

            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              maxLength={10}
              placeholder="请输入昵称"
              className="w-full px-4 py-3 rounded-xl bg-pink-50 border border-pink-100 text-[#4A2666] text-center text-lg font-bold placeholder:text-pink-300 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200 transition-all mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowNicknamePicker(false)}
                className="flex-1 py-3 rounded-full bg-gray-100 text-[#8B5FBF] font-bold text-sm"
              >
                取消
              </button>
              <button
                onClick={() => void handleSaveNickname()}
                disabled={nicknameSaving}
                className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-70"
                style={{
                  background:
                    'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                }}
              >
                {nicknameSaving ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 身份选择弹窗 */}
      {showRolePicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setShowRolePicker(false)}
        >
          <div
            className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#4A2666] mb-4 text-center flex items-center justify-center gap-2">
              <User size={20} className="text-[#A855F7]" />
              我是谁
            </h3>
            <p className="text-center text-[#8B5FBF] text-sm mb-5">
              选择你的身份，{profile.nickname}会用这个称呼和你聊天哦~
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleValue(role)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${roleValue === role
                      ? 'text-white shadow-sm'
                      : 'bg-pink-50 text-[#8B5FBF]'
                    }`}
                  style={roleValue === role ? { background: 'linear-gradient(135deg, #FF85C1, #A855F7)' } : undefined}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRolePicker(false)}
                className="flex-1 py-3 rounded-full bg-gray-100 text-[#8B5FBF] font-bold text-sm"
              >
                取消
              </button>
              <button
                onClick={() => void handleSaveRole()}
                disabled={roleSaving}
                className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-70"
                style={{
                  background:
                    'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                }}
              >
                {roleSaving ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentPage;
