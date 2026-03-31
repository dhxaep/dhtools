// games/tebakgambar.js — Tebak Gambar game
import { createState, initGameUI, updateUI, startTimer, stopTimer, showGameEnd, fetchJSON, shuffle } from './gameEngine.js';

const DATA_PATH = './ppu/tebakgambar.json';
const TOTAL_SOAL = 10;
const TIMER_SEC = 60;

let state = null;

export async function startTebakGambar() {
  const body = document.getElementById('gameBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Memuat soal...</span></div>';
  initGameUI('<i data-lucide="image"></i> Tebak Gambar');
  lucide.createIcons();

  try {
    const data = await fetchJSON(DATA_PATH);
    const soalList = shuffle(data).slice(0, TOTAL_SOAL);
    state = { ...createState(), soalList, totalTime: TIMER_SEC };
    updateUI(state);
    showSoal();
  } catch (e) {
    body.innerHTML = `<div class="error-msg"><i data-lucide="x-circle"></i> Gagal memuat data: ${e.message}</div>`;
  }
}

function showSoal() {
  stopTimer();
  if (state.soalIndex >= state.soalList.length || state.lives <= 0) {
    showGameEnd(state, startTebakGambar);
    return;
  }
  state.wrongAttemptsThisQuestion = 0;

  const soal = state.soalList[state.soalIndex];
  const body = document.getElementById('gameBody');
  body.innerHTML = `
    <p class="note-text">Soal ${state.soalIndex + 1}/${state.soalList.length}</p>
    <img class="game-img" id="tgImage" src="${soal.img}" alt="Tebak gambar" onerror="this.style.display='none'" style="cursor: zoom-in;" title="Klik untuk memperbesar gambar" />
    <p class="game-desc"><i data-lucide="pen-line"></i> ${soal.deskripsi}</p>
    <div class="game-input-wrap">
      <input class="game-input" id="tgInput" type="text" placeholder="Ketik jawabanmu..." autocomplete="off" />
      <button class="btn-primary" id="tgSubmit">Jawab</button>
    </div>
  `;
  updateUI(state);

  document.getElementById('tgImage')?.addEventListener('click', () => showImagePopup(soal.img));

  const input = document.getElementById('tgInput');
  const submit = document.getElementById('tgSubmit');
  input?.focus();

  const handleAnswer = () => {
    const ans = (input?.value || '').trim().toUpperCase();
    const correct = (soal.jawaban || '').trim().toUpperCase();
    // Support multiple correct answers separated by /
    const corrects = correct.split('/').map(s => s.trim());
    if (corrects.includes(ans)) {
      handleCorrect(input, soal);
    } else {
      handleWrong(input, soal.jawaban);
    }
  };

  submit?.addEventListener('click', handleAnswer);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAnswer(); });

  startTimer(TIMER_SEC, null, () => handleTimeout(soal.jawaban));
}

function handleCorrect(input, soal) {
  stopTimer();
  input.classList.add('correct');
  input.value = soal.jawaban;
  input.disabled = true;
  document.getElementById('tgSubmit').disabled = true;
  const bonus = parseInt(document.getElementById('gameTimerTxt')?.textContent) || 0;
  state.score += 10 + Math.floor(bonus / 6);
  state.correct++;
  state.soalIndex++;
  setTimeout(showSoal, 1200);
}

function handleWrong(input, jawaban) {
  input.classList.add('wrong');
  input.value = '';
  setTimeout(() => input.classList.remove('wrong'), 500);
  
  state.wrongAttemptsThisQuestion = (state.wrongAttemptsThisQuestion || 0) + 1;
  const rem = 5 - state.wrongAttemptsThisQuestion;
  
  if (state.wrongAttemptsThisQuestion >= 5) {
    stopTimer();
    state.lives--;
    state.wrong++;
    updateUI(state);
    const body = document.getElementById('gameBody');
    const note = document.createElement('p');
    note.className = 'note-text';
    note.style.color = 'var(--danger)';
    note.innerHTML = `<i data-lucide="x-circle" style="vertical-align:middle;width:16px;"></i> Kesempatan habis! Jawaban: ${jawaban}`;
    body.appendChild(note);
    lucide.createIcons();
    state.soalIndex++;
    if (state.lives <= 0) { setTimeout(() => showGameEnd(state, startTebakGambar), 1000); }
    else { setTimeout(showSoal, 2000); }
  } else {
    // Hint
    const oldHint = document.querySelector('.error-hint');
    if (oldHint) oldHint.remove();
    const body = document.getElementById('gameBody');
    const hint = document.createElement('p');
    hint.className = 'note-text error-hint';
    hint.style.color = 'var(--warning)';
    hint.innerHTML = `<i data-lucide="alert-triangle" style="vertical-align:middle;width:16px;"></i> Salah, sisa ${rem} kesempatan`;
    body.appendChild(hint);
    lucide.createIcons();
  }
}

function handleTimeout(jawaban) {
  state.lives--;
  state.wrong++;
  updateUI(state);
  const body = document.getElementById('gameBody');
  const note = document.createElement('p');
  note.className = 'note-text';
  note.style.color = 'var(--danger)';
  note.innerHTML = `<i data-lucide="timer" style="vertical-align:middle;width:16px;"></i> Waktu habis! Jawaban: ${jawaban}`;
  body.appendChild(note);
  state.soalIndex++;
  if (state.lives <= 0) { setTimeout(() => showGameEnd(state, startTebakGambar), 1000); }
  else { setTimeout(showSoal, 2000); }
}

function showImagePopup(src) {
  let popup = document.getElementById('imagePopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'imagePopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;transition:opacity 0.25s ease;';
    const img = document.createElement('img');
    img.id = 'imagePopupImg';
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.6);transform:scale(0.9);transition:transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);';
    popup.appendChild(img);
    document.body.appendChild(popup);
    popup.addEventListener('click', () => {
      popup.style.opacity = '0';
      img.style.transform = 'scale(0.9)';
      setTimeout(() => popup.style.display = 'none', 250);
    });
  }
  document.getElementById('imagePopupImg').src = src;
  popup.style.display = 'flex';
  // Trigger reflow
  popup.offsetHeight; 
  popup.style.opacity = '1';
  document.getElementById('imagePopupImg').style.transform = 'scale(1)';
}
