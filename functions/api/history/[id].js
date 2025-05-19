/**
 * Handles GET requests to fetch a specific conversation by its ID.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const kv = env.CHAT_HISTORY_KV;
  const conversationId = params.id;
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'No conversation id provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const historyStr = await kv.get(conversationId);
  if (!historyStr) {
    return new Response(JSON.stringify({ error: 'Conversation not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  const history = JSON.parse(historyStr);
  return new Response(JSON.stringify({ id: conversationId, scenario: 'general', messages: history }), { headers: { 'Content-Type': 'application/json' } });
}

/**
 * Handles DELETE requests to delete a specific conversation by its ID.
 */
export async function onRequestDelete(context) {
  const { env, params } = context;
  const kv = env.CHAT_HISTORY_KV;
  const conversationId = params.id;
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'No conversation id provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  await kv.delete(conversationId);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
} 