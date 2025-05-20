export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { prompt, size = '1024*1024', conversationId, negative_prompt = '' } = body;
    const apiKey = env.DASHSCOPE_API_KEY;
    const kv = env.CHAT_HISTORY_KV;

    // 验证输入
    if (!prompt) {
      return new Response(JSON.stringify({ error: "No prompt provided." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is not configured." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

    // 添加用户消息到历史
    const userMsg = { sender: 'user', text: prompt };
    history.push(userMsg);

    // 1. 提交图片生成任务
    const submitUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
    const submitPayload = {
      model: 'wanx2.1-t2i-turbo',
      input: {
        prompt,
        negative_prompt
      },
      parameters: {
        size,
        n: 1
      }
    };
    const submitResp = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify(submitPayload)
    });
    if (!submitResp.ok) {
      const err = await submitResp.text();
      return new Response(JSON.stringify({ error: err }), { status: submitResp.status, headers: { 'Content-Type': 'application/json' } });
    }
    const submitData = await submitResp.json();
    const taskId = submitData.output?.task_id;
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'No task_id returned from DashScope.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    // 2. 轮询任务状态，最多轮询10次，每次间隔2秒
    const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    let imageUrl = null;
    let status = '';
    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 2000));
      const pollResp = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!pollResp.ok) continue;
      const pollData = await pollResp.json();
      status = pollData.output?.task_status;
      if (status === 'SUCCEEDED') {
        imageUrl = pollData.output?.results?.[0]?.url;
        break;
      } else if (status === 'FAILED') {
        return new Response(JSON.stringify({ error: 'Image generation failed.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image generation timed out.' }), { status: 504, headers: { 'Content-Type': 'application/json' } });
    }
    // 在成功生成图像后，添加AI回复到历史
    if (imageUrl) {
      const aiMsgObj = { sender: 'ai', text: imageUrl, type: 'image' };
      history.push(aiMsgObj);
      
      // 保存更新后的历史
      await kv.put(convId, JSON.stringify(history));
    }

    // 返回响应
    return new Response(JSON.stringify({ reply: imageUrl, conversationId: convId, type: 'image' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to process image generation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 
