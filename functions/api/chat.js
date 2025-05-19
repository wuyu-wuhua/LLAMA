export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { scenario, message, conversationId } = body;
    const apiKey = env.DASHSCOPE_API_KEY;
    const kv = env.CHAT_HISTORY_KV;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is not configured." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. 读取历史消息
    let history = [];
    let convId = conversationId;
    if (convId) {
      const historyStr = await kv.get(convId);
      if (historyStr) {
        history = JSON.parse(historyStr);
      }
    } else {
      convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 2. 构建消息数组
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...history,
      { role: "user", content: message }
    ];

    // 3. 调用 DashScope OpenAI 兼容接口
    const dashscopeUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    const payload = {
      model: "qwen-plus",
      messages,
    };
    const resp = await fetch(dashscopeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: err }), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
    }
    const data = await resp.json();
    const aiMsg = data.choices?.[0]?.message?.content || "AI无回复";

    // 4. 保存历史
    const newHistory = [...history, { role: "user", content: message }, { role: "assistant", content: aiMsg }];
    await kv.put(convId, JSON.stringify(newHistory));

    // 5. 返回响应
    return new Response(JSON.stringify({ reply: aiMsg, conversationId: convId, type: 'text' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to process chat request due to an internal error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 