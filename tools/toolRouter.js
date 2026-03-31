// tools/toolRouter.js — Routes to all tools
import { openModal, closeModal } from '../main.js';
import { openDownloader } from './downloader.js';
import { openPinterest, openPixiv, openYtSearch, openBmkg, openLyrics, openMahasiswa, openVccGenerator } from './search.js';

const TOOLS = [
  {
    group: 'Downloader',
    items: [
      { icon: '<i data-lucide="download-cloud"></i>', name: 'Downloader Universal', desc: 'IG, TikTok, FB, dll', badge: 'URL', fn: () => openDownloader('all') },
      { icon: '<i data-lucide="camera"></i>', name: 'Instagram DL', desc: 'Download foto/video Instagram', badge: 'IG', fn: () => openDownloader('ig') },
      { icon: '<i data-lucide="music-4"></i>', name: 'TikTok DL', desc: 'Download video TikTok tanpa watermark', badge: 'TT', fn: () => openDownloader('tt') },
      { icon: '<i data-lucide="video"></i>', name: 'YouTube MP4', desc: 'Download video YouTube', badge: 'YT', fn: () => openDownloader('ytmp4') },
      { icon: '<i data-lucide="music"></i>', name: 'YouTube MP3', desc: 'Download audio YouTube', badge: 'YT', fn: () => openDownloader('ytmp3') },
    ]
  },
  {
    group: 'Search',
    items: [
      { icon: '<i data-lucide="pin"></i>', name: 'Pinterest', desc: 'Cari gambar Pinterest', badge: 'IMG', fn: openPinterest },
      { icon: '<i data-lucide="palette"></i>', name: 'Pixiv', desc: 'Cari ilustrasi Pixiv', badge: 'IMG', fn: openPixiv },
      { icon: '<i data-lucide="play-circle"></i>', name: 'YouTube Search', desc: 'Cari video YouTube', badge: 'YT', fn: openYtSearch },
      { icon: '<i data-lucide="cloud-lightning"></i>', name: 'BMKG Gempa', desc: 'Info gempa terbaru BMKG', badge: 'BMKG', fn: openBmkg },
      { icon: '<i data-lucide="music"></i>', name: 'Lirik Lagu', desc: 'Cari lirik lagu', badge: 'LAGU', fn: openLyrics },
      { icon: '<i data-lucide="graduation-cap"></i>', name: 'Cari Mahasiswa', desc: 'Cari data mahasiswa PDDIKTI', badge: 'DIKTI', fn: openMahasiswa },
      { icon: '<i data-lucide="credit-card"></i>', name: 'VCC Generator', desc: 'Generate Virtual Credit Card', badge: 'VCC', fn: openVccGenerator },
    ]
  },
];

export function openToolsModal() {
  openModal('<i data-lucide="wrench"></i> Tools', (body) => {
    TOOLS.forEach((group, gi) => {
      const label = document.createElement('p');
      label.className = 'result-section-title';
      label.textContent = group.group.toUpperCase();
      body.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'cards-grid';
      group.items.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = 'card-item';
        card.style.animationDelay = ((gi * group.items.length + i) * 0.06) + 's';
        card.innerHTML = `
          <div class="card-item-icon">${t.icon}</div>
          <div class="card-item-name">${t.name}</div>
          <div class="card-item-desc">${t.desc}</div>
          <span class="card-item-badge badge--amber">${t.badge}</span>
        `;
        card.addEventListener('click', () => {
          closeModal();
          setTimeout(() => t.fn(), 50);
        });
        grid.appendChild(card);
      });
      body.appendChild(grid);
    });
  });
}
