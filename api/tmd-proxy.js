const TMD_BASE = 'http://www.marine.tmd.go.th';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { path } = req.query;
  if (!path || typeof path !== 'string' || path.startsWith('http')) {
    return res.status(400).end();
  }

  const url = `${TMD_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const upstream = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Referer: `${TMD_BASE}/`,
        'User-Agent': 'Mozilla/5.0 (compatible; AirQualityThai/1.0)',
      },
    });
    clearTimeout(timer);
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get('content-type') || 'image/gif';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    const buffer = await upstream.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch {
    clearTimeout(timer);
    return res.status(502).end();
  }
}
