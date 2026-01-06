// GET /api/cdn/list - List files from CDN
// GET /api/cdn/list?orgId=xxx - List files for specific organization

export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const cdnUrl = env.CDN_URL || 'https://cdn.thepotentialcompany.com';
    const cdnApiKey = env.CDN_API_KEY;

    if (!cdnApiKey) {
      return Response.json({ error: 'CDN not configured' }, { status: 500 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    // Build CDN list URL
    const listUrl = orgId ? `${cdnUrl}/list/${orgId}` : `${cdnUrl}/list`;

    const response = await fetch(listUrl, {
      headers: {
        'X-API-Key': cdnApiKey,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result);
  } catch (error) {
    console.error('CDN list error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
