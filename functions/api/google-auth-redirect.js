export async function onRequestGet(context) {
  try {
    const { request } = context;
    const requestUrl = new URL(request.url);

    // Get 'url' and 'redirect_uri' from the client's request query parameters
    // These parameters are already URL-encoded by the client when they form the query string.
    const clientUrlParam = requestUrl.searchParams.get('url');
    const clientRedirectUriParam = requestUrl.searchParams.get('redirect_uri');

    if (!clientUrlParam || !clientRedirectUriParam) {
      return new Response(JSON.stringify({ error: 'Missing url or redirect_uri query parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The external Google login PHP script URL
    const externalAuthUrl = 'https://aa.jstang.cn/google_login.php';

    // Construct the target URL for redirection.
    // IMPORTANT: Do NOT re-encode clientUrlParam and clientRedirectUriParam here,
    // as they are already encoded by the client's fetch/window.location.href call.
    const targetUrl = `${externalAuthUrl}?url=${clientUrlParam}&redirect_uri=${clientRedirectUriParam}`;
    
    // Perform the redirect
    return Response.redirect(targetUrl, 302); // 302 for temporary redirect

  } catch (error) {
    console.error('Error in google-auth-redirect proxy:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 