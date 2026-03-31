// tools/search.js — Search tools using ryzumi API
import { openModal, showDownloadPopup } from '../main.js';
import { openDownloader } from './downloader.js';

const RYZUMI = 'https://api.ryzumi.net/api';

// Proxy milik sendiri via Netlify Function — tidak bergantung pihak ketiga
const SELF_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

const COOLDOWN_MS = 30000;

// Cek sisa cooldown dalam ms (0 = bebas)
export function getCooldownLeft() {
  const lastCall = parseInt(localStorage.getItem('dh_last_api') || '0');
  if (!lastCall) return 0; // belum pernah call sama sekali
  return Math.max(0, COOLDOWN_MS - (Date.now() - lastCall));
}

// Set timestamp cooldown — dipanggil HANYA saat API beneran mau di-hit
function consumeCooldown() {
  localStorage.setItem('dh_last_api', String(Date.now()));
}

// Tampilkan countdown realtime, resolve saat cooldown habis
export function waitCooldown(resultEl) {
  return new Promise((resolve) => {
    const left = getCooldownLeft();
    if (left <= 0) { resolve(); return; }

    const totalSec = COOLDOWN_MS / 1000;

    const render = () => {
      const rem = getCooldownLeft();
      const sisa = Math.ceil(rem / 1000);
      const pct = rem / COOLDOWN_MS;
      const offset = +(113 * (1 - pct)).toFixed(2);
      resultEl.innerHTML = `
        <div class="cooldown-wrap">
          <div class="cooldown-ring">
            <svg viewBox="0 0 44 44" class="cooldown-svg">
              <circle cx="22" cy="22" r="18" class="cooldown-track"/>
              <circle cx="22" cy="22" r="18" class="cooldown-fill"
                stroke-dasharray="113"
                stroke-dashoffset="${offset}"/>
            </svg>
            <span class="cooldown-num">${sisa}</span>
          </div>
          <p class="cooldown-label">Anti-spam aktif, tunggu sebentar...</p>
        </div>`;
    };

    render();
    const tick = setInterval(() => {
      const rem = getCooldownLeft();
      if (rem <= 0) {
        clearInterval(tick);
        resultEl.innerHTML = '';
        resolve();
        return;
      }
      render();
    }, 200);
  });
}

// Dipanggil SEBELUM fetch — cek dulu, kalau bebas langsung set timestamp
export function checkRateLimit() {
  const left = getCooldownLeft();
  if (left > 0) throw new Error(`COOLDOWN:${Math.ceil(left / 1000)}`);
  consumeCooldown(); // set timestamp sekarang
}

export async function apiGet(url) {
  checkRateLimit();
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('status ' + r.status);
    
    // Check if response is actually JSON
    const contentType = r.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API returned non-JSON response (likely HTML error page)');
    }
    
    return r.json();
  } catch (e) {
    if (e.message.startsWith('COOLDOWN:')) throw e;
    
    // If main API fails, try via proxy
    const r2 = await fetch(SELF_PROXY(url));
    if (!r2.ok) throw new Error('proxy error ' + r2.status);
    
    // Also validate proxy response
    const contentType2 = r2.headers.get('content-type');
    if (!contentType2 || !contentType2.includes('application/json')) {
      throw new Error('Proxy returned non-JSON response');
    }
    
    return r2.json();
  }
}

function searchModal(title, placeholder, onSearch) {
  openModal(title, (body) => {
    body.innerHTML = `
      <div class="tool-form">
        <div class="sk-search-row">
          <input class="tool-input" id="searchInput" type="text" placeholder="${placeholder}" />
          <button class="btn-primary" id="searchBtn" style="padding:0 14px"><i data-lucide="search" style="width:20px;height:20px;"></i></button>
        </div>
        <div id="searchResult"></div>
      </div>
    `;
    const doSearch = async () => {
      const q = document.getElementById('searchInput')?.value?.trim();
      if (!q) return;
      const result = document.getElementById('searchResult');
      result.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Mencari...</span></div>';
      try {
        await onSearch(q, result);
      } catch (e) {
        result.innerHTML = `<div class="error-msg">❌ Gagal: ${e.message}</div>`;
      }
    };
    document.getElementById('searchBtn')?.addEventListener('click', doSearch);
    document.getElementById('searchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  });
}

// ── PINTEREST ──────────────────────────────────────────
export function openPinterest() {
  searchModal('<i data-lucide="pin"></i> Pinterest Search', 'Cari gambar... (contoh: aesthetic room)', async (q, result) => {
    const data = await apiGet(`${RYZUMI}/search/pinterest?query=${encodeURIComponent(q)}`);
    const items = Array.isArray(data) ? data : (data?.data || []);
    if (!items.length) { result.innerHTML = '<div class="error-msg">Tidak ada hasil.</div>'; return; }
    let html = `<p class="result-section-title">${items.length} hasil ditemukan</p><div class="pinterest-grid">`;
    items.slice(0, 12).forEach(i => {
      const imgUrl = i.directLink || i.link || i.url || '';
      if (imgUrl) {
        html += `<div class="pin-wrap" style="position:relative; cursor:pointer;">
          <img class="pin-img pin-dl-btn" data-url="${encodeURIComponent(imgUrl)}" src="${imgUrl}" alt="pin" loading="lazy" onerror="this.style.opacity=0" />
        </div>`;
      }
    });
    html += '</div>';
    result.innerHTML = html;
    
    result.querySelectorAll('.pin-dl-btn').forEach(img => {
      img.addEventListener('click', () => {
        showDownloadPopup(decodeURIComponent(img.dataset.url), 'Pinterest Image');
      });
    });
  });
}

// ── PIXIV ──────────────────────────────────────────────
export function openPixiv() {
  searchModal('<i data-lucide="palette"></i> Pixiv Search', 'Cari ilustrasi... (contoh: landscape digital art)', async (q, result) => {
    const data = await apiGet(`${RYZUMI}/search/pixiv?query=${encodeURIComponent(q)}`);
    const items = Array.isArray(data) ? data : (data?.data || []);
    if (!items.length) { result.innerHTML = '<div class="error-msg">Tidak ada hasil.</div>'; return; }
    let html = `<p class="result-section-title">${items.length} hasil ditemukan</p><div class="pinterest-grid">`;
    items.slice(0, 12).forEach(i => {
      const imgUrl = i.url || i.thumb || i.image || '';
      const link = i.link || imgUrl;
      if (imgUrl) {
        html += `<div class="pin-wrap" style="position:relative; cursor:pointer;">
          <img class="pin-img px-dl-btn" data-url="${encodeURIComponent(imgUrl)}" src="${imgUrl}" alt="pixiv" loading="lazy" onerror="this.style.opacity=0" />
        </div>`;
      }
    });
    html += '</div>';
    result.innerHTML = html;
    
    result.querySelectorAll('.px-dl-btn').forEach(img => {
      img.addEventListener('click', () => {
        showDownloadPopup(decodeURIComponent(img.dataset.url), 'Pixiv Image');
      });
    });
  });
}

// ── YOUTUBE SEARCH ─────────────────────────────────────
export function openYtSearch() {
  searchModal('<i data-lucide="play-circle"></i> YouTube Search', 'Cari video YouTube...', async (q, result) => {
    const data = await apiGet(`${RYZUMI}/search/yt?query=${encodeURIComponent(q)}`);
    const videos = data?.videos || data?.data?.videos || (Array.isArray(data) ? data : []);
    if (!videos.length) { result.innerHTML = '<div class="error-msg">Tidak ada hasil.</div>'; return; }
    let html = `<p class="result-section-title">${videos.length} video ditemukan</p><div class="search-results">`;
    videos.slice(0, 8).forEach(v => {
      const thumb = v.thumbnail || v.thumb || '';
      const title = v.title || v.name || 'Video';
      const dur = v.duration || '';
      const channel = v.channel || v.channelName || '';
      const views = v.views ? `${v.views} views` : '';
      const link = v.link || v.url || `https://youtu.be/${v.id}`;
      html += `
        <div class="search-result-item yt-item" data-url="${encodeURIComponent(link)}" style="cursor:pointer;">
          ${thumb ? `<img class="search-result-thumb" src="${thumb}" alt="" loading="lazy" />` : ''}
          <div class="search-result-info">
            <div class="search-result-title">${title}</div>
            <div class="search-result-sub">${[channel, dur, views].filter(Boolean).join(' · ')}</div>
            <div class="note-text" style="color:var(--accent);margin-top:4px;">⬇️ Ketuk untuk Download</div>
          </div>
        </div>`;
    });
    html += '</div>';
    result.innerHTML = html;

    result.querySelectorAll('.yt-item').forEach(el => {
      el.addEventListener('click', () => {
        const url = decodeURIComponent(el.dataset.url);
        openDownloader('all', url);
      });
    });
  });
}

// ── BMKG ───────────────────────────────────────────────
export function openBmkg() {
  openModal('<i data-lucide="cloud-lightning"></i> BMKG Gempa', (body) => {
    body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Mengambil data gempa terbaru...</span></div>';
    apiGet(`${RYZUMI}/search/bmkg`).then(data => {
      const items = data?.data || data?.gempa || (Array.isArray(data) ? data : null);
      if (!items) { body.innerHTML = '<div class="error-msg">Gagal mengambil data BMKG.</div>'; return; }
      const arr = Array.isArray(items) ? items : [items];
      body.innerHTML = `<p class="result-section-title">${arr.length} gempa terbaru</p>`;
      arr.slice(0, 5).forEach(g => {
        const card = document.createElement('div');
        card.className = 'bmkg-card';
        card.innerHTML = `
          <h4><i data-lucide="globe" style="vertical-align:middle;width:14px;"></i> M${g.magnitude || g.mag || '?'} — ${g.wilayah || g.region || g.location || 'Indonesia'}</h4>
          <p><i data-lucide="calendar" style="vertical-align:middle;width:14px;"></i> ${g.tanggal || g.date || ''} ${g.jam || g.time || ''}<br>
          <i data-lucide="map-pin" style="vertical-align:middle;width:14px;"></i> ${g.lintang || g.lat || ''} ${g.bujur || g.lon || ''}<br>
          <i data-lucide="waves" style="vertical-align:middle;width:14px;"></i> Kedalaman: ${g.kedalaman || g.depth || '?'} km<br>
          ${g.potensi ? `<i data-lucide="alert-triangle" style="vertical-align:middle;width:14px;"></i> ${g.potensi}` : ''}</p>
        `;
        body.appendChild(card);
      });
    }).catch(e => {
      body.innerHTML = `<div class="error-msg"><i data-lucide="x-circle"></i> ${e.message}</div>`;
    });
    lucide.createIcons();
  });
}

// ── LYRICS ─────────────────────────────────────────────
export function openLyrics() {
  searchModal('<i data-lucide="music"></i> Lirik Lagu', 'Nama lagu... (contoh: Rasa Ini - Vierra)', async (q, result) => {
    const data = await apiGet(`${RYZUMI}/search/lyrics?query=${encodeURIComponent(q)}`);
    const items = Array.isArray(data) ? data : (data?.data ? [data.data] : []);
    if (!items.length) { result.innerHTML = '<div class="error-msg">Lirik tidak ditemukan.</div>'; return; }
    const item = items[0];
    const lyrics = item.plainLyrics || item.lyrics || item.lirik || item.content || '';
    result.innerHTML = `
      <p class="result-section-title">${item.title || item.name || q}</p>
      <p class="note-text" style="margin-bottom:10px">${item.artistName || item.artist || item.artis || ''}</p>
      <button class="btn-secondary" id="lyrCopyBtn" style="margin-bottom:14px"><i data-lucide="copy" style="width:16px;height:16px;margin-right:6px"></i> Salin Lirik</button>
      <div class="lyrics-box">${lyrics}</div>
    `;
    lucide.createIcons();
    document.getElementById('lyrCopyBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(lyrics);
      const btn = document.getElementById('lyrCopyBtn');
      btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;margin-right:6px"></i> Tersalin';
      lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="copy" style="width:16px;height:16px;margin-right:6px"></i> Salin Lirik';
        lucide.createIcons();
      }, 2000);
    });
  });
}

// ── MAHASISWA ──────────────────────────────────────────
export function openMahasiswa() {
  searchModal('<i data-lucide="graduation-cap"></i> Cari Mahasiswa PDDIKTI', 'Nama mahasiswa...', async (q, result) => {
    const data = await apiGet(`${RYZUMI}/search/mahasiswa?query=${encodeURIComponent(q)}`);
    const items = Array.isArray(data) ? data : (data?.data || data?.mahasiswa || []);
    if (!items.length) { result.innerHTML = '<div class="error-msg">Data tidak ditemukan.</div>'; return; }
    let html = `<p class="result-section-title">${items.length} hasil ditemukan</p>`;
    items.slice(0, 10).forEach((m, idx) => {
      const moreInfo = Object.entries(m).map(([k, v]) => `<strong>${k}</strong>: ${v}`).join('<br>');
      html += `<div class="mhs-card" id="mhsCard${idx}" style="cursor:pointer;" title="Ketuk untuk info lengkap">
        <h4>${m.nama || m.name || '—'}</h4>
        <p>
          ${m.nimhsmsmh ? `NIM: ${m.nimhsmsmh}<br>` : ''}
          ${m.namaprodi || m.prodi ? `Prodi: ${m.namaprodi || m.prodi}<br>` : ''}
          ${m.namainstitusi || m.universitas ? `Kampus: ${m.namainstitusi || m.universitas}<br>` : ''}
          <span style="color:var(--accent);font-size:0.7rem;">Lihat detail...</span>
        </p>
        <div id="mhsDetails${idx}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:0.75rem;color:var(--muted);line-height:1.6;">
          ${moreInfo}
        </div>
      </div>`;
    });
    result.innerHTML = html;

    items.slice(0, 10).forEach((_, idx) => {
      const card = document.getElementById(`mhsCard${idx}`);
      const details = document.getElementById(`mhsDetails${idx}`);
      card?.addEventListener('click', () => {
        if (details.style.display === 'none') {
          details.style.display = 'block';
          card.style.borderColor = 'var(--accent)';
        } else {
          details.style.display = 'none';
          card.style.borderColor = 'var(--border)';
        }
      });
    });
  });
}

// ── VCC GENERATOR ──────────────────────────────────────

// ── VCC Generator — Local (no API needed) ──────────────
function luhnGenerate(prefix) {
  // Given prefix digits, fills rest randomly and applies Luhn check digit
  let num = prefix;
  const totalLen = prefix.startsWith('3') ? 15 : 16; // Amex = 15
  while (num.length < totalLen - 1) {
    num += Math.floor(Math.random() * 10).toString();
  }
  // Calculate Luhn check digit
  let sum = 0;
  let alt = true;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  const check = (10 - (sum % 10)) % 10;
  return num + check.toString();
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVCC(type) {
  const prefixes = {
    Visa: ['4'],
    MasterCard: ['51', '52', '53', '54', '55'],
    Amex: ['34', '37'],
    Discover: ['6011', '622', '64', '65'],
    JCB: ['3528', '3589'],
    UnionPay: ['62'],
  };
  const pfxList = prefixes[type] || prefixes['Visa'];
  const pfx = pfxList[Math.floor(Math.random() * pfxList.length)];
  const number = luhnGenerate(pfx);
  const cvv = type === 'Amex'
    ? String(randInt(1000, 9999))
    : String(randInt(100, 999));
  const expM = String(randInt(1, 12)).padStart(2, '0');
  const expY = String(randInt(26, 30));
  const expiration = `${expM}/${expY}`;
  // Format number with spaces
  const formatted = type === 'Amex'
    ? `${number.slice(0,4)} ${number.slice(4,10)} ${number.slice(10)}`
    : number.replace(/(.{4})/g, '$1 ').trim();
  return { number: formatted, cvv, expiration };
}

export function openVccGenerator() {
  openModal('<i data-lucide="credit-card"></i> VCC Generator', (body) => {
    body.innerHTML = `
      <div class="tool-form">
        <label class="tool-label">Pilih Tipe Kartu:</label>
        <select class="tool-input" id="vccType" style="margin-bottom:10px">
          <option value="Visa">Visa</option>
          <option value="MasterCard">MasterCard</option>
          <option value="Amex">American Express</option>
          <option value="Discover">Discover</option>
          <option value="JCB">JCB</option>
          <option value="UnionPay">UnionPay</option>
        </select>
        <label class="tool-label">Jumlah Data (Maks: 10):</label>
        <input class="tool-input" id="vccCount" type="number" min="1" max="10" value="3" />
        <button class="btn-primary" id="vccBtn" style="margin-top:14px"><i data-lucide="zap" style="width:16px;height:16px;margin-right:6px"></i> Generate Data</button>
        <p class="note-text" style="margin-top:8px">⚡ Generated secara lokal — instan, tanpa API, tanpa internet.</p>
        <div id="vccResult" style="margin-top:14px"></div>
      </div>
    `;
    lucide.createIcons();

    const doGenerate = () => {
      const type = document.getElementById('vccType')?.value || 'Visa';
      const count = Math.min(parseInt(document.getElementById('vccCount')?.value || '3'), 10);
      const result = document.getElementById('vccResult');

      const records = Array.from({ length: count }, () => generateVCC(type));

      let html = '<div class="cards-grid" style="grid-template-columns:1fr; gap:8px;">';
      records.forEach((c, i) => {
        html += `
          <div class="card-item vcc-card" style="text-align:left;animation-delay:${i*0.05}s;cursor:pointer;" data-number="${c.number}" data-cvv="${c.cvv}" data-exp="${c.expiration}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;">${type}</span>
              <span class="vcc-copy-hint" style="font-size:0.65rem;color:var(--accent);opacity:0.7;">tap to copy</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:1rem;color:var(--accent);margin-bottom:8px;letter-spacing:0.05em;">
              ${c.number}
            </div>
            <div style="display:flex;gap:20px;font-size:0.82rem;color:var(--muted);font-family:var(--font-mono)">
              <span>CVV: <strong style="color:var(--text)">${c.cvv}</strong></span>
              <span>Exp: <strong style="color:var(--text)">${c.expiration}</strong></span>
            </div>
          </div>`;
      });
      html += '</div>';
      result.innerHTML = html;

      // Copy to clipboard on tap
      result.querySelectorAll('.vcc-card').forEach(card => {
        card.addEventListener('click', () => {
          const text = `Number: ${card.dataset.number}\nCVV: ${card.dataset.cvv}\nExp: ${card.dataset.exp}`;
          navigator.clipboard?.writeText(text).then(() => {
            const hint = card.querySelector('.vcc-copy-hint');
            if (hint) { hint.textContent = '✓ copied!'; setTimeout(() => { hint.textContent = 'tap to copy'; }, 2000); }
          });
        });
      });
    };

    document.getElementById('vccBtn')?.addEventListener('click', doGenerate);
    // Auto-generate on open
    doGenerate();
  });
}
