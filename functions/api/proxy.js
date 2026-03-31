// functions/api/proxy.js
// Cloudflare Pages Function — route: /api/proxy?url=...
// KEUNGGULAN vs Netlify: bisa stream langsung tanpa buffer 6MB limit!
// Streaming = download di web utama tanpa dialihkan ke web lain ✅

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_DOMAINS = [
  // API providers
  'api.ryzumi.net',
  'api.siputzx.my.id',
  'y2mate.com',
  // TikTok CDNs
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'muscdn.com',
  'musical.ly',
  // Instagram/Facebook CDNs
  'cdninstagram.com',
  'fbcdn.net',
  'facebook.com',
  'instagram.com',
  // Pinterest CDNs
  'pinimg.com',
  'pinterest.com',
  // Pixiv
  'pximg.net',
  'pixiv.net',
  // Google/YouTube CDNs
  'googleusercontent.com',
  'ytimg.com',
  'ggpht.com',
  'googlevideo.com',
  'youtube.com',
  'youtu.be',
  // Generic video CDNs
  'vimeo.com',
  'dailymotion.com',
  // Add more as needed
];

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const params    = new URL(request.url).searchParams;
  const targetUrl = params.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Parameter ?url= wajib diisi' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let parsed;
  try { parsed = new URL(targetUrl); }
  catch {
    return new Response(JSON.stringify({ error: 'URL tidak valid' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const isAllowed = ALLOWED_DOMAINS.some(
    d => parsed.hostname === d || parsed.hostname.endsWith('.' + d)
  );
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: `Domain ${parsed.hostname} tidak diizinkan` }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const host = parsed.hostname.toLowerCase();
    const referer = host.includes('tiktok') || host.includes('musical.ly') || host.includes('muscdn')
      ? 'https://www.tiktok.com/'
      : host.includes('youtube') || host.includes('youtu.be') || host.includes('googlevideo') || host.includes('ytimg')
        ? 'https://www.youtube.com/'
        : host.includes('instagram') || host.includes('fbcdn') || host.includes('facebook')
          ? 'https://www.instagram.com/'
          : parsed.origin + '/';

    const upstream = await fetch(targetUrl, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': referer,
        'Origin': referer.replace(/\/$/, ''),
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Remote server returned ' + upstream.status }), {
        status: upstream.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const filename    = parsed.pathname.split('/').pop() || 'download';

    // ✅ Cloudflare Workers bisa stream langsung — tidak perlu buffer seluruh file!
    // Ini yang membuat download dari web utama bisa berjalan tanpa redirect
    return new Response(upstream.body, {
      status:  200,
      headers: {
        ...CORS,
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Proxy-Mode':        'stream',
      },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Gagal menghubungi server: ' + err.message }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
