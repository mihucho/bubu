import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { RefreshCw, Send, User, Baby, MessageCircle } from 'lucide-react';
import { getChatMessages, sendChatMessage, streamAiReply } from '@client/src/api';
import { useAppContext } from '../../contexts/AppContext';
import type { ChatMessage } from '@shared/api.interface';

interface MessageGroup {
  dateKey: string;
  dateLabel: string;
  messages: ChatMessage[];
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  const map = new Map<string, MessageGroup>();
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const key = formatDateKey(d);
    if (!map.has(key)) {
      map.set(key, { dateKey: key, dateLabel: formatDateLabel(msg.createdAt), messages: [] });
    }
    map.get(key)!.messages.push(msg);
  }
  return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

const ChatPage: React.FC = () => {
  const { profile, loading: profileLoading } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiReplying, setAiReplying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const childName = profile?.nickname || '布布';

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChatMessages();
      const items: ChatMessage[] = Array.isArray(data) ? data : (data?.items ?? []);
      const sorted = [...items].sort(
        (a: ChatMessage, b: ChatMessage) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(sorted);
    } catch (error) {
      logger.error('加载聊天消息失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && profile) {
      void fetchMessages();
    }
  }, [fetchMessages, profileLoading, profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, loading, aiReplying]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending || aiReplying) return;

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'parent',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputValue('');
    setSending(true);

    try {
      await sendChatMessage({ content });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, id: `sent-${Date.now()}` } : m,
        ),
      );
      setSending(false);
      void triggerAiReply(content);
    } catch (error) {
      logger.error('发送消息失败', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setSending(false);
    }
  };

  const triggerAiReply = async (userContent: string) => {
    const aiMsgId = `temp-ai-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      sender: 'bub',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setAiReplying(true);

    let finalContent = '';
    try {
      const generator = streamAiReply(userContent);
      for await (const piece of generator) {
        finalContent += piece;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: finalContent } : m,
          ),
        );
      }
    } catch (error) {
      logger.error('AI 回复失败', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: '哎呀，信号不太好，再说一遍好不好～' }
            : m,
        ),
      );
    } finally {
      setAiReplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const groups = groupMessagesByDate(messages);

  const renderMessageBubble = (msg: ChatMessage) => {
    const isMe = msg.sender === 'parent';
    const senderLabel = isMe ? '我' : childName;

    return (
      <div
        key={msg.id}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
      >
        <span className={`text-[11px] text-text-secondary mb-1 ${isMe ? 'mr-2' : 'ml-2'}`}>
          {senderLabel}
        </span>
        <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF85C1, #A855F7)' }}
              aria-label={`${childName}头像`}
            >
              <Baby size={16} className="text-white" />
            </div>
          )}
          <div
            className="px-4 py-2.5 text-[14px] leading-relaxed break-words min-w-[30px]"
            style={{
              background: isMe
                ? 'linear-gradient(135deg, #FF85C1 0%, #A855F7 100%)'
                : '#FFFFFF',
              color: isMe ? '#FFFFFF' : '#4A2666',
              borderRadius: isMe
                ? '20px 20px 4px 20px'
                : '20px 20px 20px 4px',
              boxShadow: '0 2px 8px rgba(74, 38, 102, 0.08)',
            }}
          >
            {msg.content || (
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          {isMe && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-border-pink"
              aria-label="我的头像"
            >
              <User size={16} className="text-[#A855F7]" />
            </div>
          )}
        </div>
        <span className={`text-[11px] text-text-secondary/70 mt-1 ${isMe ? 'mr-2' : 'ml-10'}`}>
          {msg.content ? formatTime(msg.createdAt) : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">说说话</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">一家人随时聊两句</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchMessages()}
          className="flex items-center gap-1 text-text-secondary text-sm px-2 py-1 rounded-full active:opacity-70"
          aria-label="刷新"
        >
          <RefreshCw size={16} />
          <span>刷新</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-3 space-y-4"
      >
        {loading && (
          <div className="text-center text-text-secondary text-sm py-8">加载中...</div>
        )}
        {!loading && groups.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-12">
            <MessageCircle size={48} className="mx-auto mb-2 text-[#A855F7]/50" />
            <p>还没有消息，跟{childName}说点什么吧~</p>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.dateKey} className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="h-px w-10 bg-text-secondary/20" />
              <span className="text-[12px] text-text-secondary">{group.dateLabel}</span>
              <div className="h-px w-10 bg-text-secondary/20" />
            </div>
            {group.messages.map((msg) => renderMessageBubble(msg))}
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 px-4 pt-2 pb-4 bg-transparent">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`跟${childName}说点什么...`}
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none shadow-sm"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || sending || aiReplying}
            className="flex items-center gap-1 px-5 py-2.5 rounded-full text-white text-[14px] font-medium shadow-md disabled:opacity-50 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #FF85C1, #A855F7)' }}
            aria-label="发送"
          >
            <Send size={16} />
            <span>发送</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
