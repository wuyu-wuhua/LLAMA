export async function onRequestPost(context) {
  try {
    const { request } = context;
    const clientFormData = await request.formData();

    const externalApiUrl = 'https://aa.jstang.cn/api/ai/call';

    const externalApiResponse = await fetch(externalApiUrl, {
      method: 'POST',
      body: clientFormData,
    });

    if (!externalApiResponse.ok) {
      const errorBody = await externalApiResponse.text();
      console.error(`External API Error (${externalApiResponse.status}):`, errorBody);
      return new Response(errorBody, {
        status: externalApiResponse.status,
        headers: { 'Content-Type': externalApiResponse.headers.get('Content-Type') || 'application/json' },
      });
    }

    const responseData = await externalApiResponse.json();

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
      status: externalApiResponse.status,
    });

  } catch (error) {
    console.error('Error in image-ai-call proxy:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 