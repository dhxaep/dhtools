// games/ppu.js — PPU UTBK multiple choice game
import { createState, initGameUI, updateUI, startTimer, stopTimer, showGameEnd, fetchJSON, shuffle } from './gameEngine.js';

const TOTAL_SOAL = 15;
const TIMER_SEC = 45; // per soal

// All PPU JSON files to merge
const DATA_FILES = [
  './ppu/soal_kata_baku_part1.json',
  './ppu/soal_kata_baku_part2.json',
  './ppu/soal_kata_baku_part3.json',
  './ppu/soal_kata_baku_part4.json',
  './ppu/soal_kata_imbuhan_part1.json',
  './ppu/soal_kata_imbuhan_part2.json',
  './ppu/soal_kata_imbuhan_part3.json',
  './ppu/soal_kata_imbuhan_part4.json',
  './ppu/soal_imbuhan_sepadan_200.json',
  './ppu/hubungankata.json',
];

let state = null;
let allSoal = null;

// Normalize soal item — handles two formats:
// Format A (kata baku/imbuhan): { soal, pilihan_jawaban: {A,B,C,D,E}, jawaban_benar, pembahasan }
// Format B (hubungankata):      { soal, pilihan: ["A. ...", ...], jawaban, pembahasan }
function normalizeSoal(s, fileData) {
  // Already in standard format
  if (s.pilihan_jawaban) {
    return { ...s, materi: fileData.materi || s.materi || '' };
  }
  // Convert pilihan array → pilihan_jawaban object
  if (s.pilihan && Array.isArray(s.pilihan)) {
    const pj = {};
    s.pilihan.forEach(p => {
      const match = String(p).match(/^([A-E])\.\s*(.*)/s);
      if (match) pj[match[1]] = match[2].trim();
    });
    return {
      ...s,
      pilihan_jawaban: pj,
      jawaban_benar: s.jawaban,       // "B" etc
      materi: fileData.materi || s.materi || 'Hubungan Kata',
    };
  }
  return { ...s, materi: fileData.materi || s.materi || '' };
}

async function loadAllSoal() {
  if (allSoal) return allSoal;
  const results = await Promise.allSettled(DATA_FILES.map(f => fetchJSON(f)));
  const soalList = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const data = r.value;
    // Support both array-root and { soal: [...] } shape
    const items = Array.isArray(data) ? data : (data.soal || []);
    if (Array.isArray(items)) {
      soalList.push(...items.map(s => normalizeSoal(s, data)));
    }
  }
  allSoal = soalList;
  return allSoal;
}

export async function startPPU() {
  const body = document.getElementById('gameBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Memuat soal PPU UTBK...</span></div>';
  initGameUI('<i data-lucide="book-open"></i> PPU UTBK');
  lucide.createIcons();

  try {
    const all = await loadAllSoal();
    if (!all.length) throw new Error('Tidak ada soal tersedia');
    const soalList = shuffle(all).slice(0, TOTAL_SOAL);
    state = { ...createState(), soalList, answered: false };
    updateUI(state);
    showSoal();
  } catch (e) {
    body.innerHTML = `<div class="error-msg"><i data-lucide="x-circle"></i> Gagal memuat soal: ${e.message}</div>`;
  }
}

function showSoal() {
  stopTimer();
  if (state.soalIndex >= state.soalList.length || state.lives <= 0) {
    showGameEnd(state, startPPU);
    return;
  }
  const soal = state.soalList[state.soalIndex];
  const pj = soal.pilihan_jawaban || {};
  const keys = Object.keys(pj);
  const body = document.getElementById('gameBody');
  state.answered = false;

  body.innerHTML = `
    <p class="note-text">${soal.materi || 'PPU'} — Soal ${state.soalIndex + 1}/${state.soalList.length}</p>
    <p class="game-question">${soal.soal}</p>
    <div class="choices-grid" id="choicesGrid">
      ${keys.map(k => `
        <button class="choice-btn" data-key="${k}" id="choice_${k}">
          <span class="choice-letter">${k}.</span>
          <span>${pj[k]}</span>
        </button>
      `).join('')}
    </div>
    <div id="ppuFeedback" style="margin-top:14px;display:none;"></div>
    <button class="btn-primary" id="ppuNext" style="margin-top:14px;display:none">Soal Berikutnya →</button>
  `;
  updateUI(state);

  keys.forEach(k => {
    document.getElementById(`choice_${k}`)?.addEventListener('click', () => handleChoice(k, soal));
  });

  startTimer(TIMER_SEC, null, () => handleTimeout(soal));
}

function handleChoice(key, soal) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const correct = soal.jawaban_benar || soal.jawaban || '';
  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.disabled = true);

  const chosen = document.getElementById(`choice_${key}`);
  if (key === correct) {
    chosen?.classList.add('correct');
    const bonus = parseInt(document.getElementById('gameTimerTxt')?.textContent) || 0;
    state.score += 10 + Math.floor(bonus / 5);
    state.correct++;
  } else {
    chosen?.classList.add('wrong');
    const correctBtn = document.getElementById(`choice_${correct}`);
    if (correctBtn) correctBtn.classList.add('correct');
    state.lives--;
    state.wrong++;
    updateUI(state);
  }

  const feedback = document.getElementById('ppuFeedback');
  if (feedback && soal.pembahasan) {
    feedback.style.display = 'block';
    feedback.innerHTML = `<div class="game-desc"><i data-lucide="book"></i> <strong>Pembahasan:</strong> ${soal.pembahasan}</div>`;
    lucide.createIcons();
  }

  state.soalIndex++;
  if (state.lives <= 0) {
    setTimeout(() => showGameEnd(state, startPPU), 1200);
  } else {
    const nextBtn = document.getElementById('ppuNext');
    if (nextBtn) {
      nextBtn.style.display = 'block';
      nextBtn.addEventListener('click', showSoal);
    } else {
      setTimeout(showSoal, 1800);
    }
  }
}

function handleTimeout(soal) {
  if (state.answered) return;
  state.answered = true;
  state.lives--;
  state.wrong++;
  updateUI(state);
  const correct = soal.jawaban_benar || soal.jawaban || '';
  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.disabled = true);
  const correctBtn = document.getElementById(`choice_${correct}`);
  if (correctBtn) correctBtn.classList.add('correct');
  const body = document.getElementById('gameBody');
  const note = document.createElement('p');
  note.className = 'note-text'; note.style.color = 'var(--danger)';
  note.innerHTML = '<i data-lucide="timer" style="vertical-align:middle;width:16px;"></i> Waktu habis!';
  body.appendChild(note);
  lucide.createIcons();
  state.soalIndex++;
  if (state.lives <= 0) setTimeout(() => showGameEnd(state, startPPU), 1200);
  else setTimeout(showSoal, 2000);
}
