// tools/downloader.js
import { openModal, showDownloadPopup } from '../main.js';
import { waitCooldown, getCooldownLeft, apiGet } from './search.js';

const RYZUMI = 'https://api.ryzumi.net/api';

export function smartDownload(url, title) {
  showDownloadPopup(url, title);
}

function triggerBlobDownload(blob, filename) {
  const objUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { window.URL.revokeObjectURL(objUrl); document.body.removeChild(a); }, 1000);
}

async function downloadViaProxy(url, filename) {
  const proxyUrl = '/api/proxy?url=' + encodeURIComponent(url);
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    let extra = '';
    try { extra = ' — ' + (await res.text()).slice(0, 160); } catch {}
    throw new Error(`Server error: ${res.status}${extra}`);
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
  return true;
}

async function fetchYoutube(url, type, statusEl) {
  const endpoint = `/api/ytdl?url=${encodeURIComponent(url)}&type=${type}`;
  const steps = [
    { delay: 0,     text: '🔍 Mencoba ryzumi...' },
    { delay: 7000,  text: '🔄 Mencoba siputzx...' },
    { delay: 14000, text: '🔄 Mencoba y2mate...' },
  ];
  const timers = steps.map(s =>
    setTimeout(() => { if (statusEl) statusEl.textContent = s.text; }, s.delay)
  );
  try {
    const res  = await fetch(endpoint, { signal: AbortSignal.timeout(26000) });
    timers.forEach(clearTimeout);
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('YouTube API returned non-JSON:', await res.text().catch(() => 'unknown'));
      return { _fallback: true, error: 'API returned invalid response' };
    }
    
    const data = await res.json();
    if (!res.ok || !data.status) return { _fallback: true, error: data.error || 'Semua sumber gagal' };
    return data;
  } catch (e) {
    timers.forEach(clearTimeout);
    console.error('YouTube fetch error:', e);
    return { _fallback: true, error: e.message };
  }
}

export function openDownloader(type, prefillUrl = '') {
  const titles = {
    all:   '<i data-lucide="download-cloud"></i> Downloader Universal',
    ig:    '<i data-lucide="camera"></i> Instagram DL',
    tt:    '<i data-lucide="music-4"></i> TikTok DL',
    ytmp4: '<i data-lucide="video"></i> YouTube MP4',
    ytmp3: '<i data-lucide="music"></i> YouTube MP3',
  };
  const placeholders = {
    all:   'https://instagram.com/p/xxx — IG, TikTok, FB, dst.',
    ig:    'https://instagram.com/p/...',
    tt:    'https://www.tiktok.com/@.../video/...',
    ytmp4: 'https://youtu.be/... atau https://youtube.com/watch?v=...',
    ytmp3: 'https://youtu.be/... atau https://youtube.com/watch?v=...',
  };

  openModal(titles[type] || '<i data-lucide="download-cloud"></i> Downloader', (body) => {
    body.innerHTML = `
      <div class="tool-form">
        <label class="tool-label">Masukkan URL yang ingin didownload:</label>
        <input class="tool-input" id="dlUrl" type="url"
          placeholder="${placeholders[type] || 'https://'}"
          value="${prefillUrl}" autocomplete="off" />
        <button class="btn-primary" id="dlBtn">
          <i data-lucide="download" style="width:16px;height:16px;margin-right:6px"></i> Download
        </button>
        <div id="dlResult"></div>
      </div>
    `;

    lucide.createIcons();
    const dlBtn    = document.getElementById('dlBtn');
    const resultEl = document.getElementById('dlResult');

    dlBtn?.addEventListener('click', async () => {
      const url = document.getElementById('dlUrl')?.value?.trim();
      if (!url) return;

      if (getCooldownLeft() > 0) await waitCooldown(resultEl);

      resultEl.innerHTML = `
        <div class="loading-wrap">
          <div class="spinner"></div>
          <span id="dlStatusTxt">Mengambil link download...</span>
        </div>`;
      const statusTxt = document.getElementById('dlStatusTxt');

      try {
        // ── YouTube ──────────────────────────────────────────────────────────
        if (type === 'ytmp4' || type === 'ytmp3') {
          const dlType = type === 'ytmp4' ? 'mp4' : 'mp3';
          const data   = await fetchYoutube(url, dlType, statusTxt);

          if (data._fallback) {
            // ytdl gagal → coba all-in-one ryzumi pake URL YT
            resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><span>Mencoba downloader universal...</span></div>`;
            try {
              const allData = await apiGet(`${RYZUMI}/downloader/all-in-one?url=${encodeURIComponent(url)}`);
              const medias  = normalizeMedias(allData);
              if (!medias.length) throw new Error('no media');
              renderDlResult(resultEl, medias, getTitle(allData));
            } catch {
              resultEl.innerHTML = `
                <div class="error-msg" style="border-radius:10px;padding:16px;text-align:center;">
                  <i data-lucide="alert-triangle" style="width:32px;height:32px;margin-bottom:8px;display:block;margin-inline:auto;"></i>
                  <strong>Semua sumber gagal</strong><br>
                  <span style="font-size:0.8rem;opacity:0.8;">${data.error || 'Coba lagi nanti.'}</span>
                </div>`;
              lucide.createIcons();
            }

          } else {
            // ytdl sukses → coba blob, gagal → showDownloadPopup(link dari API)
            resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><span>Menyiapkan file...</span></div>`;
            const ext      = dlType === 'mp3' ? '.mp3' : '.mp4';
            const filename = (data.title || 'YouTube').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ext;
            let blobOk = false;
            try {
              await downloadViaProxy(data.url, filename);
              blobOk = true;
              resultEl.innerHTML = `<div class="success-msg" style="text-align:center;padding:12px;">✅ Download dimulai!</div>`;
            } catch (err) {
              console.warn('Proxy blob failed, falling back to popup:', err);
            }

            if (!blobOk) {
              resultEl.innerHTML = '';
              showDownloadPopup(data.url, data.title || 'YouTube');
            }
          }

        // ── TikTok ───────────────────────────────────────────────────────────
        } else if (type === 'tt') {
          if (statusTxt) statusTxt.textContent = 'Menghubungi TikTok DL...';
          
          // Normalize TikTok URL format (convert mobile to desktop format)
          let normalizedUrl = url.trim();
          // Convert m.tiktok.com to www.tiktok.com
          normalizedUrl = normalizedUrl.replace(/^https?:\/\/m\.tiktok\.com\//i, 'https://www.tiktok.com/');
          // Ensure URL starts with full domain
          if (normalizedUrl.startsWith('/@') || normalizedUrl.match(/^\/@/i)) {
            normalizedUrl = 'https://www.tiktok.com' + normalizedUrl;
          }
          
          try {
            const data = await apiGet(`${RYZUMI}/downloader/ttdl?url=${encodeURIComponent(normalizedUrl)}`);
            const medias = normalizeMedias(data);
            if (!medias.length) throw new Error('Tidak ada media ditemukan dari TikTok.');
            renderDlResult(resultEl, medias, getTitle(data));
          } catch (e) {
            console.error('TikTok download error:', e);
            throw new Error(`Gagal mendownload TikTok: ${e.message}. Pastikan URL TikTok valid dan akun tidak private.`);
          }

        // ── Universal (IG, FB, dll) ───────────────────────────────────────────
        } else {
          if (statusTxt) statusTxt.textContent = 'Menghubungi server...';
          try {
            const data   = await apiGet(`${RYZUMI}/downloader/all-in-one?url=${encodeURIComponent(url)}`);
            const medias = normalizeMedias(data);
            if (!medias.length) throw new Error('Tidak ada media ditemukan. Cek URL sudah benar.');
            renderDlResult(resultEl, medias, getTitle(data));
          } catch (e) {
            console.error('Universal downloader error:', e);
            throw new Error(`Gagal mendownload: ${e.message}. Pastikan URL valid dan coba lagi.`);
          }
        }

      } catch (e) {
        console.error('Downloader error:', e);
        const errorMessage = e.message.includes('non-JSON') 
          ? 'Server error: API mengembalikan data tidak valid. Coba lagi nanti.'
          : e.message.includes('COOLDOWN')
          ? e.message
          : e.message;
        
        resultEl.innerHTML = `<div class="error-msg"><i data-lucide="x-circle"></i> ${errorMessage}</div>`;
        lucide.createIcons();
      }
    });

    document.getElementById('dlUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') dlBtn?.click();
    });

    if (prefillUrl) setTimeout(() => dlBtn?.click(), 100);
  });
}

function normalizeMedias(data) {
  return data?.medias
    || data?.data?.medias
    || (Array.isArray(data?.data) ? data.data : null)
    || [];
}

function getTitle(data) {
  return data?.title || data?.data?.title || '';
}

function renderDlResult(wrapper, medias, title) {
  wrapper.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'dl-result';

  if (title) {
    const t     = document.createElement('p');
    t.className = 'dl-meta';
    t.innerHTML = `<strong>${title}</strong>`;
    box.appendChild(t);
  }

  const statusDiv = document.createElement('div');
  statusDiv.id = 'dlProgressStatus';
  statusDiv.style.cssText = 'margin:10px 0;font-size:0.85rem;color:var(--muted);display:none;';
  box.appendChild(statusDiv);

  medias.slice(0, 5).forEach((m, i) => {
    if (!m.url) return;
    const isVid = m.type === 'video';
    const isAud = m.type === 'audio';
    const label = isVid ? `Video${m.quality ? ' ' + m.quality : ''}`
                : isAud ? `Audio${m.quality ? ' ' + m.quality : ''}`
                : `Gambar ${i + 1}`;
    const icon  = isVid ? 'video' : isAud ? 'music' : 'image';
    const btn   = document.createElement('button');
    btn.className = 'dl-btn dl-direct';
    btn.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
    
    // Try blob via proxy first, then fall back to the popup result
    btn.addEventListener('click', async () => {
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Loading...';

      const statusEl = document.getElementById('dlProgressStatus');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = '⏳ Mengunduh melalui proxy...';
      }

      try {
        const filename = (title || 'download').replace(/[^a-z0-9]/gi, '_').toLowerCase() +
                        (isVid ? '.mp4' : isAud ? '.mp3' : '.jpg');

        await downloadViaProxy(m.url, filename);

        btn.innerHTML = '✅ Done!';
        if (statusEl) statusEl.textContent = '✅ Download berhasil!';

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
          if (statusEl) {
            statusEl.style.display = 'none';
            statusEl.textContent = '';
          }
        }, 2000);

      } catch (err) {
        btn.innerHTML = '⬇️ Popup';
        if (statusEl) statusEl.textContent = '❌ Blob gagal: ' + err.message;
        console.warn('Blob download error, opening popup fallback:', err);

        showDownloadPopup(m.url, label);

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 1200);
      }
    });
    
    box.appendChild(btn);
  });

  const thumb = medias.find(m => m.type === 'thumbnail' || m.quality === 'thumbnail');
  if (thumb?.url) {
    const img     = document.createElement('img');
    img.src       = thumb.url;
    img.className = 'media-embed';
    img.alt       = 'thumbnail';
    box.appendChild(img);
  }

  wrapper.appendChild(box);
  lucide.createIcons();
}
