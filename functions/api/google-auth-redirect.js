export async function onRequestGet(context) {
  try {
    const { request } = context;
    const requestUrl = new URL(request.url);

    // Get 'client_page_uri' from the client's request query parameters.
    // This parameter is already URL-encoded by the client.
    const clientPageUriParam = requestUrl.searchParams.get('client_page_uri');

    if (!clientPageUriParam) {
      return new Response(JSON.stringify({ error: 'Missing client_page_uri query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The external Google login PHP script URL
    const externalAuthUrl = 'https://aa.jstang.cn/google_login.php';

    // This is the fixed 'url' parameter that your PHP script expects (based on your React code example or previous JS code).
    // Please confirm if 'erlangjiuye.com' is the correct one, or if it should be '111.com' or another specific domain.
    const fixedUrlParamForPhp = 'erlangjiuye.com'; 

    // Construct the target URL for redirection.
    // The clientPageUriParam is used as the redirect_uri for the PHP script and is already encoded.
    // The fixedUrlParamForPhp needs to be encoded as it's a new component for the query string.
    const targetUrl = `${externalAuthUrl}?url=${encodeURIComponent(fixedUrlParamForPhp)}&redirect_uri=${clientPageUriParam}`;
    
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