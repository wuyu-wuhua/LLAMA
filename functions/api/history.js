/**
 * Handles GET requests to fetch all conversation history summaries.
 */
export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.CHAT_HISTORY_KV;
  // 获取所有key（会话ID）
  const list = await kv.list();
  const items = [];
  for (const key of list.keys) {
    const historyStr = await kv.get(key.name);
    if (!historyStr) continue;
    const history = JSON.parse(historyStr);
    // 取最后一条消息时间和内容
    const lastMsg = history[history.length - 1];
    items.push({
      id: key.name,
      title: (history[0]?.content || '新对话').slice(0, 20),
      lastUpdated: key.metadata?.updated || new Date().toISOString(),
      scenario: 'general', // 可根据实际需求扩展
      icon: 'fas fa-comments',
    });
  }
  // 按更新时间倒序
  items.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
}

/**
 * Handles DELETE requests to clear all conversation history.
 */
export async function onRequestDelete(context) {
  const { env } = context;
  const kv = env.CHAT_HISTORY_KV;
  const list = await kv.list();
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
} 