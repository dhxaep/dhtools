// games/siapakahaku.js — Siapakah Aku game
import { createState, initGameUI, updateUI, startTimer, stopTimer, showGameEnd, fetchJSON, shuffle } from './gameEngine.js';

const DATA_PATH = './ppu/siapakahaku.json';
const TOTAL_SOAL = 8;
const TIMER_SEC = 60;
let state = null;

export async function startSiapakahAku() {
  const body = document.getElementById('gameBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Memuat soal...</span></div>';
  initGameUI('<i data-lucide="user-search"></i> Siapakah Aku?');
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
    showGameEnd(state, startSiapakahAku);
    return;
  }
  const soal = state.soalList[state.soalIndex];
  // soal.soal is a string with multiple hints separated by periods
  const soalText = soal.soal || '';
  // Split into individual clue sentences
  const rawClues = soalText.split(/\.\s+/).map(s => s.trim()).filter(c => c.length > 2);
  if (rawClues.length === 0) rawClues.push(soalText);
  state.clues = rawClues;
  state.clueIndex = 1;
  state.wrongAttemptsThisQuestion = 0;

  const body = document.getElementById('gameBody');
  renderSiapakah(body, soal);
  updateUI(state);

  startTimer(TIMER_SEC, null, () => {
    state.lives--; state.wrong++; updateUI(state);
      state.soalIndex++;
      const note = document.createElement('p');
      note.className = 'note-text'; note.style.color = 'var(--danger)';
      note.innerHTML = '<i data-lucide="timer" style="vertical-align:middle;width:16px;"></i> Waktu habis! Jawaban: ' + soal.jawaban;
      body.appendChild(note);
      lucide.createIcons();
      if (state.lives <= 0) setTimeout(() => showGameEnd(state, startSiapakahAku), 1000);
      else setTimeout(showSoal, 2000);
    });
}

function renderSiapakah(body, soal) {
  const clues = state.clues;
  const shown = clues.slice(0, state.clueIndex);
  const hasMore = state.clueIndex < clues.length;

  body.innerHTML =
    '<p class="note-text">Soal ' + (state.soalIndex + 1) + '/' + state.soalList.length +
    ' — Clue ' + state.clueIndex + '/' + clues.length + '</p>' +
    '<p class="game-question"><i data-lucide="user-search"></i> Siapakah / Apakah Aku?</p>' +
    '<div class="clue-list">' +
    shown.map((c, i) => '<div class="clue-item"><strong>Clue ' + (i + 1) + ':</strong> ' + c + '</div>').join('') +
    '</div>' +
    (hasMore ? '<button class="btn-secondary" id="nextClue" style="margin-bottom:14px"><i data-lucide="lightbulb" style="width:16px;height:16px;margin-right:6px"></i> Clue Berikutnya</button>' : '') +
    '<div class="game-input-wrap">' +
    '<input class="game-input" id="saInput" type="text" placeholder="Siapakah aku?" autocomplete="off" />' +
    '<button class="btn-primary" id="saSubmit">Jawab</button>' +
    '</div>';

  updateUI(state);

  document.getElementById('nextClue') && document.getElementById('nextClue').addEventListener('click', function() {
    state.clueIndex++;
    state.score = Math.max(0, state.score - 1);
    renderSiapakah(body, soal);
    document.getElementById('saInput') && document.getElementById('saInput').focus();
  });

  const input = document.getElementById('saInput');
  if (input) input.focus();

  const handle = function() {
    const ans = ((input && input.value) || '').trim().toUpperCase();
    const correct = (soal.jawaban || '').trim().toUpperCase();
    const corrects = correct.split('/').map(function(s) { return s.trim(); });
    if (corrects.indexOf(ans) !== -1) {
      stopTimer();
      if (input) { input.classList.add('correct'); input.value = soal.jawaban; input.disabled = true; }
      const submitBtn = document.getElementById('saSubmit');
      if (submitBtn) submitBtn.disabled = true;
      const bonus = Math.max(1, clues.length - state.clueIndex + 2);
      const timerEl = document.getElementById('gameTimerTxt');
      const timerBonus = timerEl ? parseInt(timerEl.textContent) || 0 : 0;
      state.score += bonus * 2 + Math.floor(timerBonus / 10);
      state.correct++;
      state.soalIndex++;
      setTimeout(showSoal, 1300);
    } else {
      if (input) {
        input.classList.add('wrong');
        setTimeout(function() { input.classList.remove('wrong'); }, 500);
        input.value = '';
      }
      
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
        note.innerHTML = `<i data-lucide="x-circle" style="vertical-align:middle;width:16px;"></i> Kesempatan habis! Jawaban: ${soal.jawaban}`;
        body.appendChild(note);
        lucide.createIcons();
        state.soalIndex++;
        if (state.lives <= 0) { setTimeout(function() { showGameEnd(state, startSiapakahAku); }, 1000); }
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

  const submitBtn = document.getElementById('saSubmit');
  if (submitBtn) submitBtn.addEventListener('click', handle);
  if (input) input.addEventListener('keydown', function(e) { if (e.key === 'Enter') handle(); });
}
