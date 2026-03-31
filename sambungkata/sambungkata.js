// sambungkata/sambungkata.js — Sambung Kata
// Uses dynamic KBBI loader for automatic file detection and merging
import { openModal } from '../main.js';
import { loadAllKBBI, extractAllWords, getWordsByPrefix } from '../utils/kbbiLoader.js';

// Try to load from API or use built-in word list
const API_KBBI = 'https://api.ryzumi.net/api/search/kbbi?query=';

// Built-in Indonesian word bank (common words from all games)
const BUILTIN_WORDS = [
  'aku','ada','anak','air','api','alam','atas','awal','ayah','buat','buku','bawa',
  'baru','bisa','baik','bagi','banyak','cari','cepat','coba','dalam','dapat','dari',
  'dasar','dekat','dengan','depan','diri','dua','dunia','enak','atau','jika','kami',
  'kata','kita','kamu','kini','kerja','lagi','lain','laku','lama','lalu','harus',
  'hampir','hidup','hari','hasil','hati','tidak','tapi','tiga','tahu','tahun','sama',
  'satu','saja','sana','sang','sering','suatu','sudah','sekolah','semua','sejak','sini',
  'maka','maka','mana','masa','meski','mulai','muda','maju','perlu','punya','pagi',
  'pula','pukul','pikir','orang','oleh','pula','juga','jalan','jenis','jauh','teman',
  'tentu','tentang','tera','ting','tinggal','tiap','tempat','temukan','usaha','untuk',
  'utama','uang','umum','yang','yaitu','yakni','zaman','zona','besar','bilang','biasa',
  'boleh','bumi','bulan','buka','beli','belum','benar','berlaku','berhasil','belajar',
  'bangun','bangsa','bagian','barang','batas','belakang','berguna','bersama','berjalan',
  'berkata','berbeda','berbagi','berkembang','berubah','berganti','bermain','bertanya',
  'cairkan','cinta','cerita','cabang','cara','capai','cukup','ciri','daerah','dalami',
  'damai','datang','daya','dibuat','dibawa','dibuka','digunakan','dijual','dilakukan',
  'dimana','dingin','dirasa','disini','ditemukan','dibeli','dibebani','diberi','dicari',
  'garap','gelap','garis','gerak','giat','gugur','guruh','hadir','hadap','harga','ikut',
  'ilmu','ingin','ingat','indah','jalin','jamin','jelas','jual','jumpa','kerja','keras',
  'kelas','keluar','kembali','kepada','ketika','kirim','kuat','kurang','kunci','kuasa',
  'langkah','lantai','lapangan','layak','lebar','letak','lingkup','luar','lunak','maju',
  'makna','malah','mandiri','manfaat','masih','masuk','milik','minta','muncul','murah',
  'nama','naik','negara','nilai','nyata','nyaman','olah','panjang','pakai','penting',
  'peran','perlu','pilih','pokok','proses','Raja','rasa','rapi','raih','ringan','rosak',
  'ruang','sabtu','sabar','sadar','salah','sayang','simpan','singkat','sistem','sukses',
  'susah','syarat','terbuka','terima','terus','tinggi','toko','ubah','ukur','ungkap',
  'usul','utuh','waktu','wajib','wajah','wisata','yakin',
  // indonesian specific long words
  'pendidikan','kesehatan','masyarakat','pemerintah','keluarga','pengembangan','kehidupan',
  'perjalanan','pembangunan','pertumbuhan','keberhasilan','keterbukaan','persatuan',
  'kemerdekaan','keberadaan','kebersamaan','pembelajaran','pengetahuan','kemampuan',
  'kepercayaan','kepemimpinan','persahabatan','kebahagiaan','kejujuran','kesabaran',
  'kebebasan','kemandirian','keadilan','ketidakpastian','keselamatan','perlindungan',
  'pemberdayaan','penghargaan','pelayanan','kesempatan','kepedulian','komitmen',
  'semangat','karakter','integritas','profesional','kreatif','motivasi','produktif',
  'adaptasi','inovasi','kolaborasi','komunikasi','dedikasi','kompetisi'
];

let wordList = null;
let usedWords = new Set(JSON.parse(localStorage.getItem('sk_used') || '[]'));
let hardMode = false;
let kbbiData = null; // Store merged KBBI data
// debounceTimer is intentionally scoped inside openSambungKataModal to avoid stale timer across modal re-opens

async function loadWords() {
  if (wordList && wordList.length > 0) return wordList;
  
  // Use dynamic KBBI loader to fetch all parts automatically
  try {
    const result = await loadAllKBBI('./', 'kbbi');
    kbbiData = result.data;
    
    if (result.entryCount > 0) {
      // Extract valid single words from KBBI data
      const kbbiWords = extractAllWords(kbbiData);
      wordList = [...new Set([...BUILTIN_WORDS.map(w => w.toLowerCase()), ...kbbiWords])].sort();
      console.log(`[Sambung Kata] Loaded ${wordList.length.toLocaleString('id-ID')} total words`);
    } else {
      throw new Error('No KBBI data loaded');
    }
  } catch (error) {
    console.warn('[Sambung Kata] KBBI loading failed, using builtin word list only:', error.message);
    wordList = BUILTIN_WORDS.map(w => w.toLowerCase());
  }
  
  return wordList;
}

function saveUsed() {
  localStorage.setItem('sk_used', JSON.stringify([...usedWords]));
}

function getWordsStartingWith(prefix) {
  if (!prefix || !wordList) return [];
  const p = prefix.toLowerCase();
  
  // Use optimized KBBI loader function if we have KBBI data
  if (kbbiData) {
    return getWordsByPrefix(kbbiData, p, false, new Set());
  }
  
  // Fallback to simple filter
  return wordList.filter(w => w.startsWith(p));
}

export function openSambungKataModal() {
  openModal('🔗 Sambung Kata', (body) => {
    body.innerHTML = `
      <div class="sk-controls">
        <div class="sk-search-row">
          <input class="sk-input" id="skSearchInput" type="text" placeholder="Memuat KBBI..." autocomplete="off" disabled />
          <button class="btn-primary" id="skSearch" style="flex-shrink:0" disabled>Cari</button>
        </div>
        <div class="sk-mode-row">
          <button class="pill-btn${hardMode ? '' : ' active'}" id="modeRandom">🎲 Tampilkan semua</button>
          <button class="pill-btn${hardMode ? ' active' : ''}" id="modeHard">🔥 Mode Hard</button>
          <div class="sk-memory">
            <span id="skUsedCount">${usedWords.size} terpakai</span>
            <button class="sk-del-btn" id="skResetUsed">Reset</button>
          </div>
        </div>
      </div>
      <div id="skStatus" class="note-text" style="margin-bottom:8px">⏳ Memuat KBBI, harap tunggu...</div>
      <div id="skCounter" class="sk-counter" style="display:none"></div>
      <div id="skWordGrid" class="sk-results"></div>
    `;

    let debounceTimer = null;
    document.getElementById('modeRandom')?.addEventListener('click', () => {
      hardMode = false;
      document.getElementById('modeRandom')?.classList.add('active');
      document.getElementById('modeHard')?.classList.remove('active');
      if (lastQuery) renderWords(lastResults, lastQuery);
    });
    document.getElementById('modeHard')?.addEventListener('click', () => {
      hardMode = true;
      document.getElementById('modeHard')?.classList.add('active');
      document.getElementById('modeRandom')?.classList.remove('active');
      if (lastQuery) renderWords(lastResults, lastQuery);
    });
    document.getElementById('skResetUsed')?.addEventListener('click', () => {
      usedWords = new Set();
      saveUsed();
      document.getElementById('skUsedCount').textContent = '0 terpakai';
      if (lastResults.length) renderWords(lastResults, lastQuery);
    });

    loadWords().then(() => {
      const statusEl = document.getElementById('skStatus');
      const inputEl = document.getElementById('skSearchInput');
      const searchBtn = document.getElementById('skSearch');
      if (statusEl) statusEl.textContent = `✅ ${wordList.length.toLocaleString('id-ID')} kata siap`;
      if (inputEl) { inputEl.disabled = false; inputEl.placeholder = 'Ketik huruf awal...'; }
      if (searchBtn) searchBtn.disabled = false;
      if (!lastQuery) doSearch();
    }).catch(() => {
      const statusEl = document.getElementById('skStatus');
      const inputEl = document.getElementById('skSearchInput');
      const searchBtn = document.getElementById('skSearch');
      if (statusEl) statusEl.textContent = '⚠️ Menggunakan word bank terbatas';
      wordList = BUILTIN_WORDS.map(w => w.toLowerCase());
      if (inputEl) { inputEl.disabled = false; inputEl.placeholder = 'Ketik huruf awal...'; }
      if (searchBtn) searchBtn.disabled = false;
      doSearch();
    });

    let lastResults = [];
    let lastQuery = '';

    const doSearch = () => {
      if (!wordList) return; // KBBI belum selesai load
      const q = (document.getElementById('skSearchInput')?.value || '').trim().toLowerCase();
      lastQuery = q;
      if (!wordList) { wordList = BUILTIN_WORDS.map(w => w.toLowerCase()); }
      
      const counter = document.getElementById('skCounter');
      if (!q) {
        const randoms = [];
        for(let i=0; i<50; i++) randoms.push(wordList[Math.floor(Math.random() * wordList.length)]);
        lastResults = randoms;
        if (counter) { counter.style.display = 'block'; counter.textContent = 'Menampilkan 50 kata acak'; }
        renderWords(randoms, '');
        return;
      }
      
      const results = getWordsStartingWith(q);
      lastResults = results;
      if (counter) { counter.style.display = 'block'; counter.textContent = `${results.length} kata ditemukan untuk "${q}"`; }
      renderWords(results, q);
    };

    const renderWords = (results, q) => {
      const grid = document.getElementById('skWordGrid');
      if (!grid) return;
      const filtered = hardMode ? results.filter(w => !usedWords.has(w)) : results;
      if (!filtered.length) {
        grid.innerHTML = `<div class="note-text" style="padding:20px;text-align:center">Tidak ada kata${hardMode ? ' belum terpakai' : ''} untuk "${q}"</div>`;
        return;
      }
      grid.innerHTML = filtered.slice(0, 80).map(w => {
        const used = usedWords.has(w);
        return `<div class="sk-word-card${used ? ' used' : ''}" data-word="${w}">
          <span class="sk-word">${w}</span>
          <button class="sk-copy-btn" data-word="${w}" title="Salin &amp; tandai terpakai"><i data-lucide="copy"></i></button>
        </div>`;
      }).join('');
      lucide.createIcons();
      grid.querySelectorAll('.sk-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const word = btn.dataset.word;
          navigator.clipboard.writeText(word).catch(() => {});
          usedWords.add(word);
          saveUsed();
          const countEl = document.getElementById('skUsedCount');
          if (countEl) countEl.textContent = `${usedWords.size} terpakai`;
          const card = btn.closest('.sk-word-card');
          if (hardMode) card.remove();
          else card.classList.add('used');
        });
      });
    };

    document.getElementById('skSearch')?.addEventListener('click', doSearch);
    document.getElementById('skSearchInput')?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 150);
    });
    document.getElementById('skSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
    });
  });
}
