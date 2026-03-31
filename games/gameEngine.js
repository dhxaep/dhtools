// games/gameEngine.js — shared game state engine
import { gameOverlay, openGame, closeGame } from '../main.js';

const gameOverlayEl = document.getElementById('gameOverlay');
const gameTitle = document.getElementById('gameTitle');
const gameLives = document.getElementById('gameLives');
const gameScore = document.getElementById('gameScore');
const gameBody = document.getElementById('gameBody');
const gameTimerFill = document.getElementById('gameTimerFill');
const gameTimerTxt = document.getElementById('gameTimerTxt');

export function renderLives(cur, max = 3) {
  let html = '';
  for (let i = 0; i < max; i++) {
    html += `<span class="heart${i < cur ? '' : ' empty'}"><i data-lucide="heart" style="width:18px;height:18px;fill:currentColor;vertical-align:middle;margin:-2px 2px 0;"></i></span>`;
  }
  return html;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function loading(body, text = 'Memuat soal...') {
  body.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><span>${text}</span></div>`;
}

// State object
export function createState(opts = {}) {
  return {
    lives: opts.lives ?? 3,
    score: 0,
    correct: 0,
    wrong: 0,
    soalIndex: 0,
    soalList: [],
    timer: null,
    timerSec: 0,
    totalTime: opts.totalTime ?? 60,
    maxLives: opts.lives ?? 3,
  };
}

let activeTimer = null;

export function initGameUI(titleText) {
  const titleEl = document.getElementById('gameTitle');
  if (titleEl) titleEl.innerHTML = titleText;
  openGame();
  window._currentGameCleanup = stopTimer;
}

export function updateUI(state) {
  document.getElementById('gameLives').innerHTML = renderLives(state.lives, state.maxLives);
  document.getElementById('gameScore').textContent = `Poin: ${state.score}`;
}

export function startTimer(totalSec, onTick, onTimeout) {
  stopTimer();
  let sec = totalSec;
  updateTimerBar(sec, totalSec);
  activeTimer = setInterval(() => {
    sec--;
    updateTimerBar(sec, totalSec);
    if (onTick) onTick(sec);
    if (sec <= 0) {
      stopTimer();
      if (onTimeout) onTimeout();
    }
  }, 1000);
}

export function stopTimer() {
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
}

function updateTimerBar(cur, total) {
  const pct = Math.max(0, Math.min(100, (cur / total) * 100));
  document.getElementById('gameTimerFill').style.width = pct + '%';
  document.getElementById('gameTimerTxt').textContent = cur + 's';
  document.getElementById('gameTimerFill').classList.toggle('danger', cur <= 10);
}

export function shakeEffect() {
  const body = document.getElementById('gameBody');
  body.style.animation = 'none';
  body.offsetHeight; // reflow
  body.style.animation = '';
  body.classList.add('shake-body');
  setTimeout(() => body.classList.remove('shake-body'), 400);
}

export function showGameEnd(state, onRestart, onBack) {
  stopTimer();
  updateTimerBar(0, 60);
  const total = state.correct + state.wrong;
  const pct = total > 0 ? Math.round((state.correct / total) * 100) : 0;
  const starSvg = '<i data-lucide="star" style="display:inline-block;margin:0 2px;width:24px;height:24px;color:var(--warning);fill:var(--warning)"></i>';
  const stars = pct >= 80 ? starSvg.repeat(3) : pct >= 50 ? starSvg.repeat(2) : pct >= 30 ? starSvg : '';
  const emoji = pct >= 80 ? '<i data-lucide="trophy" style="width:48px;height:48px;color:var(--warning)"></i>' : pct >= 50 ? '<i data-lucide="thumbs-up" style="width:48px;height:48px;color:var(--accent)"></i>' : '<i data-lucide="frown" style="width:48px;height:48px;color:var(--danger)"></i>';

  document.getElementById('gameLives').innerHTML = '';

  const body = document.getElementById('gameBody');
  body.innerHTML = `
    <div class="game-end">
      <div class="game-end-emoji">${emoji}</div>
      <div class="game-end-title">${pct >= 60 ? 'BAGUS!' : pct >= 30 ? 'LUMAYAN!' : 'CBA LAGI!'}</div>
      <div class="game-end-stars">${stars}</div>
      <div class="game-end-stats">
        <div class="game-end-stat">
          <span class="game-end-stat-val">${state.score}</span>
          <span class="game-end-stat-lbl">Poin</span>
        </div>
        <div class="game-end-stat">
          <span class="game-end-stat-val">${state.correct}</span>
          <span class="game-end-stat-lbl">Benar</span>
        </div>
        <div class="game-end-stat">
          <span class="game-end-stat-val">${state.wrong}</span>
          <span class="game-end-stat-lbl">Salah</span>
        </div>
      </div>
      <div class="game-end-btns">
        <button class="btn-primary" id="btnRestart"><i data-lucide="rotate-ccw" style="width:16px;height:16px;margin-right:6px"></i> Main Lagi</button>
        <button class="btn-secondary" id="btnBack"><i data-lucide="arrow-left" style="width:16px;height:16px;margin-right:6px"></i> Kembali</button>
      </div>
    </div>
  `;
  lucide.createIcons();
  document.getElementById('btnRestart')?.addEventListener('click', onRestart);
  document.getElementById('btnBack')?.addEventListener('click', () => { closeGame(); if (onBack) onBack(); });
}

export async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
