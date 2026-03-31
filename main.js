// main.js — DHTools core logic
import { openGamesModal } from './games/gameRouter.js';
import { openToolsModal } from './tools/toolRouter.js';
import { openSambungKataModal } from './sambungkata/sambungkata.js';

// ── Welcome Popup ──────────────────────────────────────
const welcomeOverlay = document.getElementById('welcomeOverlay');
const welcomeBox = document.getElementById('welcomeBox');
const welcomeCloseBtn = document.getElementById('welcomeCloseBtn');

function closeWelcome() {
  welcomeOverlay.style.opacity = '0';
  welcomeBox.style.transform = 'scale(0.95) translateY(10px)';
  setTimeout(() => { welcomeOverlay.style.display = 'none'; }, 300);
}

welcomeCloseBtn?.addEventListener('click', closeWelcome);
// Allow clicking outside welcome box to close too
welcomeOverlay?.addEventListener('click', (e) => {
  if (e.target === welcomeOverlay) closeWelcome();
});

// ── Theme ──────────────────────────────────────────────
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
let theme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', theme);

themeToggle?.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  lucide.createIcons();
});

// ── Stats ──────────────────────────────────────────────
// RAM
function updateRam() {
  const mem = performance?.memory;
  if (mem) {
    const used = (mem.usedJSHeapSize / 1048576).toFixed(1);
    document.getElementById('ramValue').textContent = used;
  } else {
    document.getElementById('ramValue').textContent = 'N/A';
  }
}
setInterval(updateRam, 2000);
updateRam();

// Device
function detectDevice() {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  const mobile = /Mobi|Android|iPhone/i.test(ua) ? ' Mobile' : ' Desktop';
  document.getElementById('deviceValue').textContent = os + mobile;
}
detectDevice();

// Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clockValue').textContent = `${h}:${m}:${s}`;
  document.getElementById('clockDate').textContent = now.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}
setInterval(updateClock, 1000);
updateClock();

// ── Modal System ───────────────────────────────────────
export const overlay = document.getElementById('modalOverlay');
export const modalContainer = document.getElementById('modalContainer');
export const modalTitle = document.getElementById('modalTitle');
export const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

let modalClearTimeout = null;

export function openModal(title, contentFn) {
  if (modalClearTimeout) clearTimeout(modalClearTimeout);
  modalTitle.innerHTML = title;
  modalBody.innerHTML = '';
  contentFn(modalBody);
  overlay.classList.add('active');
  lucide.createIcons();
}

export function closeModal() {
  overlay.classList.remove('active');
  modalClearTimeout = setTimeout(() => { modalBody.innerHTML = ''; }, 250);
}

modalClose?.addEventListener('click', closeModal);
overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeGame(); } });

// ── Game Overlay ───────────────────────────────────────
export const gameOverlay = document.getElementById('gameOverlay');
const gameBack = document.getElementById('gameBack');

export function openGame() {
  gameOverlay.classList.add('active');
}
export function closeGame() {
  gameOverlay.classList.remove('active');
}
gameBack?.addEventListener('click', () => {
  closeGame();
  if (window._currentGameCleanup) window._currentGameCleanup();
});

// ── Sidebar Navigation ─────────────────────────────────
document.getElementById('navGames')?.addEventListener('click', () => openGamesModal());
document.getElementById('navTools')?.addEventListener('click', () => openToolsModal());
document.getElementById('navSambung')?.addEventListener('click', () => openSambungKataModal());

// ── Explore Docs Toggle ────────────────────────────────
const docsSection = document.getElementById('docs');
const btnExplore = document.getElementById('btnExplore');
const closeDocsBtn = document.getElementById('closeDocsBtn');

if (btnExplore && docsSection) {
  btnExplore.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.add('dashboard-mode');
    docsSection.style.display = 'block';
    setTimeout(() => docsSection.scrollIntoView({ behavior: 'smooth' }), 50);
  });
}
if (closeDocsBtn && docsSection) {
  closeDocsBtn.addEventListener('click', () => {
    document.body.classList.remove('dashboard-mode');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => docsSection.style.display = 'none', 300);
  });
}

// ── Universal Download Popup ───────────────────────────
export function showDownloadPopup(url, title = 'Download') {
  let popup = document.getElementById('dlPopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'dlPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;opacity:0;transition:opacity 0.25s ease;padding:16px;';

    const contentBox = document.createElement('div');
    contentBox.style.cssText = 'background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 10px 40px rgba(0,0,0,0.6);transform:scale(0.9);transition:transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);max-width:90%;width:400px;text-align:center;';
    contentBox.id = 'dlPopupBox';

    const preview = document.createElement('img');
    preview.id = 'dlPopupImg';
    preview.style.cssText = 'max-width:100%;max-height:240px;border-radius:8px;display:none;object-fit:cover;';

    const lbl = document.createElement('h3');
    lbl.id = 'dlPopupTitle';
    lbl.style.cssText = 'font-family:var(--font-display);font-size:1rem;color:var(--text);word-break:break-word;';

    const statusTxt = document.createElement('p');
    statusTxt.id = 'dlPopupStatus';
    statusTxt.style.cssText = 'font-size:0.75rem;color:var(--muted);font-family:var(--font-mono);display:none;';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn-primary';
    dlBtn.innerHTML = '⬇️ Download Sekarang';
    dlBtn.id = 'dlPopupBtn';
    dlBtn.style.width = '100%';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.innerHTML = 'Tutup';
    closeBtn.style.width = '100%';
    closeBtn.onclick = () => {
      popup.style.opacity = '0';
      contentBox.style.transform = 'scale(0.9)';
      setTimeout(() => popup.style.display = 'none', 250);
    };

    contentBox.appendChild(preview);
    contentBox.appendChild(lbl);
    contentBox.appendChild(statusTxt);
    contentBox.appendChild(dlBtn);
    contentBox.appendChild(closeBtn);
    popup.appendChild(contentBox);
    document.body.appendChild(popup);
  }

  const isImg = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('pximg') || url.includes('pinimg');
  const preview = document.getElementById('dlPopupImg');
  if (isImg) {
    preview.src = url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  document.getElementById('dlPopupTitle').textContent = title;
  const statusEl = document.getElementById('dlPopupStatus');
  statusEl.style.display = 'none';
  statusEl.textContent = '';

  const dlBtn = document.getElementById('dlPopupBtn');
  dlBtn.disabled = false;
  dlBtn.innerHTML = '⬇️ Download Sekarang';

  dlBtn.onclick = async () => {
    dlBtn.disabled = true;
    dlBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Menyiapkan file...';
    statusEl.style.display = 'block';

    const extM = url.match(/\.(mp4|mp3|webm|m4a|mov|avi)(\?|$)/i);
    const ext = extM ? '.' + extM[1].toLowerCase() : (isImg ? '.jpg' : '.mp4');
    const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ext;

    const openDirectFallback = (message) => {
      statusEl.textContent = message || 'Proxy gagal, membuka sumber langsung...';
      dlBtn.innerHTML = '🔗 Buka langsung';
      dlBtn.disabled = false;
      dlBtn.onclick = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
      };
    };

    // ── First try proxy blob on the same domain ──
    statusEl.textContent = 'Menghubungi proxy server...';
    try {
      const proxyUrl = '/api/proxy?url=' + encodeURIComponent(url);
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const blob = await res.blob();
      triggerBlobDownload(blob, filename);

      dlBtn.innerHTML = '✅ Berhasil diunduh!';
      dlBtn.disabled = false;
      statusEl.style.display = 'none';

      // Auto-close popup after successful download
      setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.style.display = 'none', 250);
      }, 1500);

    } catch (err) {
      console.error('Download error:', err);
      openDirectFallback(`❌ Proxy gagal: ${err.message}`);
    }
  };

  popup.style.display = 'flex';
  popup.offsetHeight; // trigger reflow
  popup.style.opacity = '1';
  document.getElementById('dlPopupBox').style.transform = 'scale(1)';
}

function triggerBlobDownload(blob, filename) {
  const objUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(objUrl);
    document.body.removeChild(a);
  }, 1000);
}

// Init lucide icons
lucide.createIcons();
