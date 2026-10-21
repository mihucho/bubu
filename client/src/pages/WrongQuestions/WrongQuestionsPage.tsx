import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Plus, X, Trash2, CheckCircle, RotateCcw, FileText } from 'lucide-react';
import {
  getWrongQuestions,
  createWrongQuestion,
  toggleWrongQuestionMastered,
  deleteWrongQuestion,
} from '@client/src/api';
import type { WrongQuestion, WrongQuestionStats } from '@shared/api.interface';

const SUBJECTS: { key: string; label: string; color: string }[] = [
  { key: 'chinese', label: '语文', color: '#FF85C1' },
  { key: 'math', label: '数学', color: '#A855F7' },
  { key: 'english', label: '英语', color: '#22C55E' },
  { key: 'other', label: '其他', color: '#F59E0B' },
];

function getSubjectInfo(subject: string): { label: string; color: string } {
  const found = SUBJECTS.find((s) => s.key === subject || s.label === subject);
  return found ?? { label: subject, color: '#8B5FBF' };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const WrongQuestionsPage: React.FC = () => {
  const [stats, setStats] = useState<WrongQuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [titleInput, setTitleInput] = useState('');
  const [errorReasonInput, setErrorReasonInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWrongQuestions();
      setStats(data as WrongQuestionStats);
    } catch (error) {
      logger.error('加载错题失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!titleInput.trim() || saving) return;
    setSaving(true);
    try {
      await createWrongQuestion({
        subject: selectedSubject,
        title: titleInput.trim(),
        errorReason: errorReasonInput.trim() || undefined,
      });
      setShowAddModal(false);
      setTitleInput('');
      setErrorReasonInput('');
      setSelectedSubject('math');
      void fetchData();
    } catch (error) {
      logger.error('保存错题失败', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMastered = async (id: string) => {
    try {
      await toggleWrongQuestionMastered(id);
      void fetchData();
    } catch (error) {
      logger.error('切换掌握状态失败', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWrongQuestion(id);
      void fetchData();
    } catch (error) {
      logger.error('删除错题失败', error);
    }
  };

  const total = stats?.total ?? 0;
  const mastered = stats?.mastered ?? 0;
  const progressPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const items = stats?.items ?? [];

  return (
    <div className="px-4 pt-2 pb-20">
      {/* 顶部标题 */}
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-text-primary">错题本</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">把不会的题收集起来，慢慢攻克！</p>
      </div>

      {/* 统计卡片 */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm mb-4">
        <div className="flex justify-around mb-3">
          <div className="text-center">
            <div className="text-[28px] font-bold text-text-primary">{total}</div>
            <div className="text-[12px] text-text-secondary">共几道</div>
          </div>
          <div className="w-px bg-border-pink/50" />
          <div className="text-center">
            <div className="text-[28px] font-bold text-green-complete">{mastered}</div>
            <div className="text-[12px] text-text-secondary">已掌握</div>
          </div>
        </div>
        {/* 进度条 */}
        <div className="relative h-3 bg-pink-light rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
            }}
          />
        </div>
        <div className="text-right text-[11px] text-text-secondary mt-1">
          掌握进度 {progressPercent}%
        </div>
      </div>

      {/* 添加错题按钮 */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-white text-[15px] font-medium shadow-md active:scale-[0.98] transition-transform mb-4"
        style={{ background: 'linear-gradient(135deg, #FF85C1, #A855F7)' }}
      >
        <Plus size={20} />
        <span>添加错题</span>
      </button>

      {/* 错题列表 */}
      {loading && (
        <div className="text-center text-text-secondary text-sm py-8">加载中...</div>
      )}
      {!loading && items.length === 0 && (
          <div className="text-center text-text-secondary py-12">
            <FileText size={48} className="mx-auto mb-2 text-[#A855F7]/50" />
            <p className="text-sm">还没有错题，继续加油！</p>
          </div>
      )}
      <div className="space-y-3">
        {items.map((item: WrongQuestion) => {
          const subjectInfo = getSubjectInfo(item.subject);
          return (
            <div
              key={item.id}
              className="bg-white rounded-[20px] p-4 shadow-sm"
              style={{ opacity: item.isMastered ? 0.7 : 1 }}
            >
              {/* 顶部 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 text-[11px] text-white rounded-full"
                    style={{ backgroundColor: subjectInfo.color }}
                  >
                    {subjectInfo.label}
                  </span>
                  {item.isMastered && (
                    <span className="px-2 py-0.5 text-[11px] text-green-complete bg-green-progress/20 rounded-full">
                      已掌握
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-text-secondary">
                  {formatDate(item.recordDate)}
                </span>
              </div>
              {/* 题目 */}
              <h3 className="text-[15px] font-bold text-text-primary mb-1.5 leading-relaxed">
                {item.title}
              </h3>
              {/* 错误原因 */}
              {item.errorReason && (
                <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
                  错误原因：{item.errorReason}
                </p>
              )}
              {!item.errorReason && <div className="mb-1" />}
              {/* 底部操作 */}
              <div className="flex items-center justify-end gap-4 pt-1 border-t border-pink-light/50">
                <button
                  type="button"
                  onClick={() => void handleToggleMastered(item.id)}
                  className="flex items-center gap-1 text-[13px] text-green-complete font-medium active:opacity-70"
                >
                  {item.isMastered ? (
                    <>
                      <RotateCcw size={14} />
                      <span>取消掌握</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>标记已掌握</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="flex items-center gap-1 text-[13px] text-red-400 font-medium active:opacity-70"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                  <span>删除</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 添加错题弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40">
          <div
            className="w-full max-w-[430px] bg-white rounded-t-[24px] sm:rounded-[24px] p-5 animate-[slideUp_0.25s_ease-out]"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-text-primary">添加错题</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-text-secondary active:opacity-70"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            {/* 科目选择 */}
            <div className="mb-4">
              <label className="block text-[14px] text-text-primary font-medium mb-2">
                科目
              </label>
              <div className="flex gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedSubject(s.key)}
                    className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all ${
                      selectedSubject === s.key
                        ? 'text-white'
                        : 'bg-pink-light/50 text-text-secondary'
                    }`}
                    style={
                      selectedSubject === s.key
                        ? { background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }
                        : undefined
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 题目/知识点 */}
            <div className="mb-4">
              <label className="block text-[14px] text-text-primary font-medium mb-2">
                题目/知识点
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="输入题目或知识点..."
                className="w-full bg-pink-light/30 rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none"
              />
            </div>

            {/* 错误原因 */}
            <div className="mb-5">
              <label className="block text-[14px] text-text-primary font-medium mb-2">
                错误原因（可选）
              </label>
              <textarea
                value={errorReasonInput}
                onChange={(e) => setErrorReasonInput(e.target.value)}
                placeholder="写一下为什么错了..."
                rows={3}
                className="w-full bg-pink-light/30 rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none resize-none"
              />
            </div>

            {/* 保存按钮 */}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!titleInput.trim() || saving}
              className="w-full py-3 rounded-full text-white text-[15px] font-medium shadow-md disabled:opacity-50 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #FF85C1, #A855F7)' }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WrongQuestionsPage;
