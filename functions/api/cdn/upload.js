// POST /api/cdn/upload - Upload file to CDN
// Proxies upload to the CDN server with API key authentication

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const cdnUrl = env.CDN_URL || 'https://cdn.thepotentialcompany.com';
    const cdnApiKey = env.CDN_API_KEY;

    if (!cdnApiKey) {
      return Response.json({ error: 'CDN not configured' }, { status: 500 });
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Forward to CDN server
    const response = await fetch(`${cdnUrl}/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': cdnApiKey,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error('CDN upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
