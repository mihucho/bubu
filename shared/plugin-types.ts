// ---- plugin:child_learning_ai_chat_1 ----
// ============================================================
// 插件 child_learning_ai_chat_1 (儿童学习应用AI对话功能) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export type ChildLearningAiChatOneInput = {
  /** JSON 格式的业务数据快照（含星星、任务、阅读、运动、心情、错题等数据） */
  data_context: string;
  /** 用户发送的消息内容 */
  user_message: string;
  /** 角色名称，可选值：布布/妈妈/爸爸/爷爷/奶奶 */
  chat_role: string;
};

/**
 * const input: ChildLearningAiChatOneInput = { data_context, user_message, chat_role };
 * capabilityClient.load('child_learning_ai_chat_1').callStream<ChildLearningAiChatOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 ChildLearningAiChatOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export type ChildLearningAiChatOneOutput = {
  content: string;
  response?: string;
};
// ---- end:child_learning_ai_chat_1 ----