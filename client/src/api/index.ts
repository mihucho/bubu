import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ProfileStatusResponse, KidProfile } from '@shared/api.interface';

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  },
);

export async function getProfileStatus(): Promise<ProfileStatusResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/profile-status',
      method: 'GET',
    });
    return response.data as ProfileStatusResponse;
  } catch (error) {
    logger.error('获取档案状态失败', error);
    throw error;
  }
}

export async function initProfile(nickname: string, parentRole: string): Promise<KidProfile> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/init-profile',
      method: 'POST',
      data: { nickname, parentRole },
    });
    return response.data as KidProfile;
  } catch (error) {
    logger.error('初始化档案失败', error);
    throw error;
  }
}

export async function getDashboard() {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/dashboard',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取首页数据失败', error);
    throw error;
  }
}

export async function getProfile() {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/profile',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取档案失败', error);
    throw error;
  }
}

export async function updateProfile(data: Record<string, unknown>) {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/profile',
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新档案失败', error);
    throw error;
  }
}

export async function addStarsApi(amount: number) {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/stars/add',
      method: 'POST',
      data: { amount },
    });
    return response.data;
  } catch (error) {
    logger.error('增加星星失败', error);
    throw error;
  }
}

export async function spendStarsApi(amount: number) {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/stars/spend',
      method: 'POST',
      data: { amount },
    });
    return response.data;
  } catch (error) {
    logger.error('消耗星星失败', error);
    throw error;
  }
}

export async function getTasks() {
  try {
    const response = await axiosForBackend({
      url: '/api/tasks',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取任务失败', error);
    throw error;
  }
}

export async function checkInTask(taskId: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/tasks/${taskId}/checkin`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('任务打卡失败', error);
    throw error;
  }
}

export async function reorderTasks(ids: string[]) {
  try {
    const response = await axiosForBackend({
      url: '/api/tasks/reorder',
      method: 'POST',
      data: { ids },
    });
    return response.data;
  } catch (error) {
    logger.error('重排任务失败', error);
    throw error;
  }
}

export async function getEggTasks() {
  try {
    const response = await axiosForBackend({
      url: '/api/egg/today',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取彩蛋任务失败', error);
    throw error;
  }
}

export async function completeEggTask(taskId: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/egg/${taskId}/complete`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('完成彩蛋任务失败', error);
    throw error;
  }
}

export async function getMoodRecords() {
  try {
    const response = await axiosForBackend({
      url: '/api/mood',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取心情记录失败', error);
    throw error;
  }
}

export async function createMoodRecord(data: { emotion: string; content: string }) {
  try {
    const response = await axiosForBackend({
      url: '/api/mood',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建心情记录失败', error);
    throw error;
  }
}

export async function exportMoodDiary() {
  try {
    const response = await axiosForBackend({
      url: '/api/mood/export',
      method: 'GET',
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    logger.error('导出心情日记失败', error);
    throw error;
  }
}

export async function getReadingStats() {
  try {
    const response = await axiosForBackend({
      url: '/api/reading/stats',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取阅读统计失败', error);
    throw error;
  }
}

export async function addReadingRecord(data: { durationMinutes: number; bookTitle?: string }) {
  try {
    const response = await axiosForBackend({
      url: '/api/reading/record',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('添加阅读记录失败', error);
    throw error;
  }
}

export async function getExerciseStats() {
  try {
    const response = await axiosForBackend({
      url: '/api/exercise/stats',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取运动统计失败', error);
    throw error;
  }
}

export async function addExerciseRecord(data: { exerciseType: string; durationMinutes: number }) {
  try {
    const response = await axiosForBackend({
      url: '/api/exercise/record',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('添加运动记录失败', error);
    throw error;
  }
}

export async function deleteExerciseRecord(id: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/exercise/record/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除运动记录失败', error);
    throw error;
  }
}

export async function getChatMessages() {
  try {
    const response = await axiosForBackend({
      url: '/api/chat/messages',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取聊天消息失败', error);
    throw error;
  }
}

export async function sendChatMessage(data: { content: string }) {
  try {
    const response = await axiosForBackend({
      url: '/api/chat/messages',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('发送消息失败', error);
    throw error;
  }
}

export async function* streamAiReply(userMessage: string): AsyncGenerator<string, void, undefined> {
  const csrfToken = (window as unknown as { csrfToken?: string }).csrfToken;
  const baseURL = (axiosForBackend as unknown as { defaults?: { baseURL?: string } }).defaults?.baseURL || '';
  const cleanBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const url = `${cleanBase}/api/chat/ai-reply-stream?user_message=${encodeURIComponent(userMessage)}`;

  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (csrfToken) headers['X-Suda-Csrf-Token'] = csrfToken;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!response.ok || !response.body) {
    let errorMsg = 'AI 回复请求失败';
    try {
      const text = await response.text();
      const parsed = JSON.parse(text);
      if (parsed?.error?.message) errorMsg = parsed.error.message;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6);
      if (dataStr === '[DONE]') return;
      try {
        const data = JSON.parse(dataStr);
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.content) {
          yield data.content;
        }
      } catch {
        // ignore parse errors
      }
    }
  }
}

export async function getShopItems() {
  try {
    const response = await axiosForBackend({
      url: '/api/shop/items',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取商店物品失败', error);
    throw error;
  }
}

export async function exchangeItem(itemId: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/shop/exchange/${itemId}`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('兑换失败', error);
    throw error;
  }
}

export async function getWrongQuestions() {
  try {
    const response = await axiosForBackend({
      url: '/api/wrong-questions',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取错题失败', error);
    throw error;
  }
}

export async function createWrongQuestion(data: { subject: string; title: string; errorReason?: string }) {
  try {
    const response = await axiosForBackend({
      url: '/api/wrong-questions',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('添加错题失败', error);
    throw error;
  }
}

export async function toggleWrongQuestionMastered(id: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/wrong-questions/${id}/mastered`,
      method: 'PATCH',
    });
    return response.data;
  } catch (error) {
    logger.error('切换错题掌握状态失败', error);
    throw error;
  }
}

export async function deleteWrongQuestion(id: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/wrong-questions/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除错题失败', error);
    throw error;
  }
}

export async function getReadingTracker() {
  try {
    const response = await axiosForBackend({
      url: '/api/kid/reading-tracker',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取阅读追踪失败', error);
    throw error;
  }
}

export async function markReadingSeen(id: string) {
  try {
    const response = await axiosForBackend({
      url: `/api/kid/reading-tracker/${id}/seen`,
      method: 'PATCH',
    });
    return response.data;
  } catch (error) {
    logger.error('标记阅读已看失败', error);
    throw error;
  }
}
