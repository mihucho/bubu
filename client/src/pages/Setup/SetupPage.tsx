import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { useProfile } from '../../contexts/ProfileContext';

const ROLE_OPTIONS = ['妈妈', '爸爸', '爷爷', '奶奶'];

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { initProfile } = useProfile();
  const [nickname, setNickname] = useState<string>('布布');
  const [parentRole, setParentRole] = useState<string>('妈妈');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.error('昵称不能为空');
      return;
    }
    if (trimmed.length > 10) {
      toast.error('昵称最多10个字符');
      return;
    }
    try {
      setSubmitting(true);
      await initProfile(trimmed, parentRole);
      toast.success('设置成功，开始成长之旅吧~');
      navigate('/', { replace: true });
    } catch (error) {
      logger.error('初始化档案失败', error);
      toast.error('设置失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, #FF85C1 0%, #A855F7 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles size={28} className="text-[#FFD700]" />
            <h1 className="text-2xl font-bold text-white">
              欢迎来到布布的学习小天地
            </h1>
            <Sparkles size={28} className="text-[#FFD700]" />
          </div>
          <p className="text-white/80 text-sm">
            设置一下，开始我们的成长之旅吧~
          </p>
        </div>

        {/* 卡片 */}
        <div className="bg-white rounded-[20px] p-6 shadow-lg">
          {/* 昵称输入 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-[#4A2666] mb-2">
              孩子昵称
            </label>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={10}
              placeholder="请输入昵称"
              className="rounded-xl bg-pink-50 border-pink-100 text-[#4A2666] text-center text-lg font-bold placeholder:text-pink-300 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 h-12"
            />
          </div>

          {/* 家长身份选择 */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-[#4A2666] mb-3">
              我是谁
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setParentRole(role)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    parentRole === role
                      ? 'text-white shadow-sm'
                      : 'bg-pink-50 text-[#8B5FBF] hover:bg-pink-100'
                  }`}
                  style={
                    parentRole === role
                      ? { background: 'linear-gradient(135deg, #FF85C1, #A855F7)' }
                      : undefined
                  }
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* 开始使用按钮 */}
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full h-12 rounded-full text-white font-bold text-base shadow-md"
            style={{
              background: 'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
            }}
          >
            {submitting ? '设置中...' : '开始使用'}
          </Button>
        </div>

        {/* 底部装饰文字 */}
        <p className="text-center text-white/60 text-xs mt-6">
          每天一点点，成长看得见 ✨
        </p>
      </div>
    </div>
  );
};

export default SetupPage;
