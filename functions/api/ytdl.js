// functions/api/ytdl.js
// Cloudflare Pages Function — route: /api/ytdl?url=...&type=mp4|mp3
// Fallback chain: ryzumi → siputzx → y2mate

const RYZUMI  = 'https://api.ryzumi.net/api';
const SIPUTZX = 'https://api.siputzx.my.id/api';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

async function fetchJSON(url, opts = {}, timeoutMs = 12000) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Accept':     'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; dhtools/2.0)',
      ...(opts.headers || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    console.error(`fetchJSON error: HTTP ${res.status} from ${url}`, text.substring(0, 200));
    throw new Error(`HTTP ${res.status}`);
  }
  
  // Verify it's actually JSON
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text().catch(() => 'unknown');
    console.error(`fetchJSON error: Non-JSON response from ${url}:`, text.substring(0, 200));
    throw new Error('API returned non-JSON response');
  }
  
  return res.json();
}

async function tryRyzumi(url, type) {
  const data   = await fetchJSON(`${RYZUMI}/downloader/ytdl?url=${encodeURIComponent(url)}&type=${type}`, {}, 12000);
  const medias = data?.medias || data?.data?.medias || [];
  const media  = medias.find(m => m.url) || medias[0];
  if (!media?.url) throw new Error('ryzumi: no media url');
  return {
    url:       media.url,
    title:     data?.title     || data?.data?.title     || 'YouTube',
    thumbnail: data?.thumbnail || data?.data?.thumbnail || '',
    source:    'ryzumi',
  };
}

async function trySiputzx(url, type) {
  const data   = await fetchJSON(`${SIPUTZX}/d/ytdlp?url=${encodeURIComponent(url)}&type=${type}`, {}, 14000);
  const dlUrl  = data?.data?.url || data?.url;
  if (!dlUrl) throw new Error('siputzx: no url');
  return {
    url:       dlUrl,
    title:     data?.data?.title     || data?.title     || 'YouTube',
    thumbnail: data?.data?.thumbnail || data?.thumbnail || '',
    source:    'siputzx',
  };
}

async function tryY2mate(url, type) {
  const vidMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!vidMatch) throw new Error('y2mate: invalid youtube url');
  const vid = vidMatch[1];

  const analyze = await fetchJSON('https://www.y2mate.com/mates/analyzeV2/ajax', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ k_query: `https://www.youtube.com/watch?v=${vid}`, k_page: 'home', hl: 'en', q_auto: '0' }),
  }, 14000);

  const links   = analyze?.links || {};
  const isAudio = type === 'mp3';
  let chosen;
  if (isAudio) {
    const al = links?.mp3 || links?.audio || {};
    chosen   = Object.values(al).find(v => v.f === 'mp3' && v.k) || Object.values(al)[0];
  } else {
    const vl = links?.mp4 || {};
    chosen   = Object.values(vl).find(v => v.q === '720p' && v.k)
            || Object.values(vl).find(v => v.q === '360p' && v.k)
            || Object.values(vl)[0];
  }
  if (!chosen?.k) throw new Error('y2mate: no format found');

  const convert = await fetchJSON('https://www.y2mate.com/mates/convertV2/index', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ vid, k: chosen.k }),
  }, 20000);

  const dlUrl = convert?.dlink;
  if (!dlUrl) throw new Error('y2mate: no dlink');
  return {
    url:       dlUrl,
    title:     analyze?.title || 'YouTube',
    thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    source:    'y2mate',
  };
}

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const params = new URL(request.url).searchParams;
  const url    = params.get('url');
  const type   = params.get('type');

  if (!url) {
    return new Response(JSON.stringify({ status: false, error: 'Parameter ?url= wajib diisi' }), { status: 400, headers: CORS });
  }

  const isYT = /youtube\.com|youtu\.be/i.test(url);
  if (!isYT) {
    return new Response(JSON.stringify({ status: false, error: 'Hanya URL YouTube yang didukung' }), { status: 400, headers: CORS });
  }

  const dlType     = type === 'mp3' ? 'mp3' : 'mp4';
  const ryzumiType = dlType === 'mp4' ? 'video' : 'audio';
  const errors     = [];

  try {
    const r = await tryRyzumi(url, ryzumiType);
    return new Response(JSON.stringify({ status: true, ...r }), { status: 200, headers: CORS });
  } catch (e) { errors.push('ryzumi: ' + e.message); }

  try {
    const r = await trySiputzx(url, dlType);
    return new Response(JSON.stringify({ status: true, ...r }), { status: 200, headers: CORS });
  } catch (e) { errors.push('siputzx: ' + e.message); }

  try {
    const r = await tryY2mate(url, dlType);
    return new Response(JSON.stringify({ status: true, ...r }), { status: 200, headers: CORS });
  } catch (e) { errors.push('y2mate: ' + e.message); }

  return new Response(JSON.stringify({ status: false, error: errors.join(' | ') }), { status: 502, headers: CORS });
}
