// games/gameRouter.js — Routes to all games
import { openModal, closeModal } from '../main.js';
import { startTebakGambar } from './tebakgambar.js';
import { startLengkapiKalimat } from './lengkapikalimat.js';
import { startSiapakahAku } from './siapakahaku.js';
import { startSusunKata } from './susunkata.js';
import { startAsahOtak } from './asahotak.js';
import { startPPU } from './ppu.js';

const GAMES = [
  { id: 'tebakgambar', icon: '<i data-lucide="image"></i>', name: 'Tebak Gambar', desc: 'Tebak gambar dari deskripsi yang diberikan', badge: '60s', fn: startTebakGambar },
  { id: 'lengkapikalimat', icon: '<i data-lucide="pen-line"></i>', name: 'Lengkapi Kalimat', desc: 'Lengkapi kalimat yang rumpang dengan kata yang tepat', badge: '60s', fn: startLengkapiKalimat },
  { id: 'siapakahaku', icon: '<i data-lucide="user-search"></i>', name: 'Siapakah Aku?', desc: 'Tebak siapakah aku dari clue yang diberikan', badge: '60s', fn: startSiapakahAku },
  { id: 'susunkata', icon: '<i data-lucide="case-upper"></i>', name: 'Susun Kata', desc: 'Susun huruf-huruf acak menjadi kata yang benar', badge: '60s', fn: startSusunKata },
  { id: 'asahotak', icon: '<i data-lucide="brain-circuit"></i>', name: 'Asah Otak', desc: 'Soal logika dan trivia yang mengasah otak', badge: '60s', fn: startAsahOtak },
  { id: 'ppu', icon: '<i data-lucide="book-open"></i>', name: 'PPU UTBK', desc: 'Soal bahasa Indonesia UTBK: kata baku, imbuhan, hubungan kata', badge: 'A-E', fn: startPPU },
];

export function openGamesModal() {
  openModal('<i data-lucide="gamepad-2"></i> Games', (body) => {
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    GAMES.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.style.animationDelay = (i * 0.06) + 's';
      card.innerHTML = `
        <div class="card-item-icon">${g.icon}</div>
        <div class="card-item-name">${g.name}</div>
        <div class="card-item-desc">${g.desc}</div>
        <span class="card-item-badge badge--accent">${g.badge}</span>
      `;
      card.addEventListener('click', () => {
        closeModal();
        g.fn();
      });
      grid.appendChild(card);
    });
    body.appendChild(grid);
  });
}
