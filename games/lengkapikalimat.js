// games/lengkapikalimat.js — Lengkapi Kalimat
import { createState, initGameUI, updateUI, startTimer, stopTimer, showGameEnd, fetchJSON, shuffle } from './gameEngine.js';

const DATA_PATH = './ppu/lengkapikalimat.json';
const TOTAL_SOAL = 10;
const TIMER_SEC = 60;
let state = null;

export async function startLengkapiKalimat() {
  const body = document.getElementById('gameBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Memuat soal...</span></div>';
  initGameUI('<i data-lucide="pen-line"></i> Lengkapi Kalimat');
  lucide.createIcons();

  try {
    const data = await fetchJSON(DATA_PATH);
    const soalList = shuffle(data).slice(0, TOTAL_SOAL);
    state = { ...createState(), soalList };
    updateUI(state);
    showSoal();
  } catch (e) {
    body.innerHTML = `<div class="error-msg"><i data-lucide="x-circle"></i> Gagal memuat data: ${e.message}</div>`;
  }
}

function showSoal() {
  stopTimer();
  if (state.soalIndex >= state.soalList.length || state.lives <= 0) {
    showGameEnd(state, startLengkapiKalimat);
    return;
  }
  const soal = state.soalList[state.soalIndex];
  state.wrongAttemptsThisQuestion = 0;
  // soal: { soal, jawaban, hint? }
  const body = document.getElementById('gameBody');
  // Replace ___ in soal.soal with input-like display
  const soalText = soal.soal || soal.kalimat || soal.pertanyaan || '';
  body.innerHTML = `
    <p class="note-text">Soal ${state.soalIndex + 1}/${state.soalList.length}</p>
    <p class="game-question">"${soalText}"</p>
    ${soal.hint ? `<p class="game-desc"><i data-lucide="lightbulb" style="width:16px;height:16px;margin-right:4px"></i> Petunjuk: ${soal.hint}</p>` : ''}
    <div class="game-input-wrap">
      <input class="game-input" id="lkInput" type="text" placeholder="Isi yang tepat..." autocomplete="off" />
      <button class="btn-primary" id="lkSubmit">Jawab</button>
    </div>
  `;
  updateUI(state);
  const input = document.getElementById('lkInput');
  input?.focus();

  const handle = () => {
    const ans = (input?.value || '').trim().toUpperCase();
    const correct = (soal.jawaban || '').trim().toUpperCase();
    const corrects = correct.split('/').map(s => s.trim());
    if (corrects.includes(ans)) {
      stopTimer();
      input.classList.add('correct');
      input.value = soal.jawaban;
      input.disabled = true;
      document.getElementById('lkSubmit').disabled = true;
      const bonus = parseInt(document.getElementById('gameTimerTxt')?.textContent) || 0;
      state.score += 10 + Math.floor(bonus / 6);
      state.correct++;
      state.soalIndex++;
      setTimeout(showSoal, 1200);
    } else {
      input.classList.add('wrong');
      setTimeout(() => input.classList.remove('wrong'), 500);
      input.value = '';
      
      state.wrongAttemptsThisQuestion = (state.wrongAttemptsThisQuestion || 0) + 1;
      const rem = 5 - state.wrongAttemptsThisQuestion;
      
      if (state.wrongAttemptsThisQuestion >= 5) {
        stopTimer();
        state.lives--;
        state.wrong++;
        updateUI(state);
        const note = document.createElement('p');
        note.className = 'note-text';
        note.style.color = 'var(--danger)';
        note.innerHTML = `<i data-lucide="x-circle" style="vertical-align:middle;width:16px;"></i> Kesempatan habis! Jawaban: ${correct}`;
        body.appendChild(note);
        lucide.createIcons();
        state.soalIndex++;
        if (state.lives <= 0) { setTimeout(() => showGameEnd(state, startLengkapiKalimat), 1000); }
        else { setTimeout(showSoal, 2000); }
      } else {
        const oldHint = document.querySelector('.error-hint');
        if (oldHint) oldHint.remove();
        const hint = document.createElement('p');
        hint.className = 'note-text error-hint';
        hint.style.color = 'var(--warning)';
        hint.innerHTML = `<i data-lucide="alert-triangle" style="vertical-align:middle;width:16px;"></i> Salah, sisa ${rem} kesempatan`;
        body.appendChild(hint);
        lucide.createIcons();
      }
    }
  };

  document.getElementById('lkSubmit')?.addEventListener('click', handle);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });

  startTimer(TIMER_SEC, null, () => {
    state.lives--; state.wrong++; updateUI(state);
    const note = document.createElement('p');
    note.className = 'note-text'; note.style.color = 'var(--danger)';
    note.innerHTML = `<i data-lucide="timer" style="vertical-align:middle;width:16px;"></i> Waktu habis! Jawaban: ${soal.jawaban}`;
    body.appendChild(note);
    state.soalIndex++;
    if (state.lives <= 0) setTimeout(() => showGameEnd(state, startLengkapiKalimat), 1000);
    else setTimeout(showSoal, 2000);
  });
}
