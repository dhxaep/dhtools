# Web Tools Dhafa — Cloudflare Pages Project

## 📋 Project Overview
DHTools is a comprehensive web tools platform built on Cloudflare Pages, featuring games, downloaders, and search utilities.

## 🚀 Recent Updates (March 2026)

### 1. **KBBI Files Splitting** ✅
All KBBI JSON files have been split into smaller parts (< 20MB each) for better performance:

**Original Files → Split Parts:**
- `kbbi_v_part1.json` (30.78 MB) → `kbbi_v_part1_part1.json` (18.22 MB) + `kbbi_v_part1_part2.json` (12.57 MB)
- `kbbi_v_part2.json` (30.46 MB) → `kbbi_v_part2_part1.json` (17.99 MB) + `kbbi_v_part2_part2.json` (12.47 MB)
- `kbbi_v_part3.json` (31.11 MB) → `kbbi_v_part3_part1.json` (18.62 MB) + `kbbi_v_part3_part2.json` (12.50 MB)
- `kbbi_v_part4.json` (30.48 MB) → `kbbi_v_part4_part1.json` (18.05 MB) + `kbbi_v_part4_part2.json` (12.42 MB)

**Total:** 8 parts, all under 20MB limit

### 2. **Dynamic KBBI Loader** ✅
New auto-loading system in `utils/kbbiLoader.js`:
- Automatically detects all KBBI part files
- Fetches and merges all parts seamlessly
- Provides optimized word search functions
- Error handling with fallback to builtin word list

**Usage Example:**
```javascript
import { loadAllKBBI, extractAllWords } from './utils/kbbiLoader.js';

// Auto-load all KBBI parts
const result = await loadAllKBBI('./', 'kbbi');
console.log(`Loaded ${result.entryCount} entries`);

// Extract all valid words
const words = extractAllWords(result.data);
```

### 3. **Sambung Kata Updated** ✅
Refactored `sambungkata/sambungkata.js` to use new dynamic loader:
- Replaced hardcoded file paths with auto-discovery
- Improved error handling and logging
- Maintains backward compatibility with fallback word list

### 4. **Proxy Endpoint Enhanced** ✅
`/api/proxy` endpoint ensures all downloads happen within the main domain:
- Streams files server-side without buffering
- Sets proper Content-Disposition headers
- Supports multiple CDN domains
- No redirects - all downloads stay on domain

**Frontend Usage:**
```javascript
// All downloads go through proxy
const proxyUrl = '/api/proxy?url=' + encodeURIComponent(externalUrl);
const response = await fetch(proxyUrl);
const blob = await response.blob();
// Download happens without leaving the site
```

### 5. **Wrangler Configuration** ✅
Updated `wrangler.toml` with:
```toml
pages_build_output_dir = "."
```

## 📁 Project Structure

```
web-tools-dhafa/
├── functions/api/
│   ├── proxy.js          # Proxy endpoint for downloads
│   └── ytdl.js           # YouTube downloader
├── games/                # Game modules
├── ppu/                  # Game data (PPU questions)
├── sambungkata/          # Sambung Kata game
│   └── sambungkata.js    # Uses dynamic KBBI loader
├── tools/                # Tool modules
├── utils/
│   └── kbbiLoader.js     # Dynamic KBBI loader ⭐ NEW
├── scripts/
│   └── split-kbbi.js     # KBBI splitting script (dev only)
├── *.json                # KBBI split parts (8 files)
├── index.html
├── main.js
├── style.css
└── wrangler.toml
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies (if needed)
npm install

# Run locally with Wrangler
npx wrangler pages dev .
```

### Splitting KBBI Files (if needed in future)
```bash
# Only run this if you need to re-split KBBI files
node scripts/split-kbbi.js
```

**Note:** The split script is for local development only. Don't deploy it to production.

## 🌐 Deployment to Cloudflare Pages

### Automatic Deployment
1. Connect your GitHub repository to Cloudflare Pages
2. Configure build settings:
   - **Build command:** (leave empty - no build needed)
   - **Build output directory:** `.`
3. Deploy!

### Manual Deployment
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy .
```

## ⚡ Performance Notes

### KBBI Loading
- **Before:** Loaded 4 large files (30+ MB each) = ~120MB total
- **After:** Loads 8 smaller files progressively = better memory management
- **Benefit:** Files load on-demand, better error recovery

### Download Proxy
- **Streaming:** Files stream directly from source to user
- **No Buffering:** Doesn't store entire file in memory
- **Domain Stay:** All downloads happen on your domain (no external redirects)

## 🔧 Key Features

### Downloader Tools
- ✅ Instagram (photos/videos)
- ✅ TikTok (no watermark)
- ✅ YouTube (MP4/MP3)
- ✅ Pinterest Search
- ✅ Pixiv Search
- ✅ Universal Downloader

### Games
- ✅ Asah Otak
- ✅ Lengkapin Kalimat
- ✅ Siapakah Aku
- ✅ Susun Kata
- ✅ Tebak Gambar
- ✅ PPU (Pertanyaan Pengetahuan Umum)
- ✅ Sambung Kata (with KBBI integration)

### Search Tools
- ✅ BMKG Gempa
- ✅ Lirik Lagu
- ✅ Cari Mahasiswa (PDDIKTI)
- ✅ VCC Generator

## 🎯 Cloudflare Pages Compatibility

✅ **Fully Compatible**
- Uses `export async function onRequest(context)` pattern
- No Node.js-specific APIs (fs, require, etc.)
- Edge runtime ready
- ES Modules format

## 📊 File Size Summary

| File Type | Count | Total Size | Avg Size |
|-----------|-------|------------|----------|
| KBBI Parts | 8 | ~120 MB | ~15 MB |
| Game Data (PPU) | 15 | ~2 MB | ~130 KB |
| Code Files | 20+ | ~100 KB | ~5 KB |
| Assets | 3 | ~31 KB | ~10 KB |

## 🐛 Troubleshooting

### KBBI Not Loading
1. Check browser console for errors
2. Verify all 8 KBBI part files exist in root directory
3. Clear browser cache and reload

### Downloads Failing
1. Check `/api/proxy` endpoint is working
2. Verify target URL is in allowed domains list
3. Check network tab for CORS errors

### Build Errors
1. Ensure `wrangler.toml` has `pages_build_output_dir = "."`
2. Remove any Node.js-specific imports from Functions
3. Use ES Module syntax (`import`/`export`)

## 📝 Changelog

### v2.1.0 (March 2026)
- ✅ Split all KBBI files into <20MB parts
- ✅ Created dynamic KBBI loader with auto-discovery
- ✅ Updated Sambung Kata to use new loader
- ✅ Fixed proxy endpoint to prevent redirects
- ✅ Added pages_build_output_dir to wrangler.toml
- ✅ Improved error handling throughout

### v2.0.0
- Initial Cloudflare Pages migration
- Core tools and games implementation

## 🙏 Credits

Special thanks to:
- **ryuzumi** - API provider
- **siputzx** - API provider
- Community contributors

---

**Built with ❤️ for Cloudflare Pages**
