# Local Testing Guide with Wrangler

## Understanding the 404 Error

### ❌ Why You Get 404 on Regular Localhost

When you open `index.html` directly or use a simple static server (VS Code Live Server, http-server):

```
Browser → http://localhost:5500/api/proxy?url=...
              ↓
        Static file server (only serves files)
              ↓
        Looking for file: /api/proxy.js
              ↓
        File not found → 404 ERROR ❌
```

**Reason:** Static servers cannot execute Cloudflare Pages Functions. They only serve existing files.

---

### ✅ How It Works on Cloudflare Pages

```
Browser → https://your-site.pages.dev/api/proxy?url=...
              ↓
        Cloudflare Pages runtime (edge function)
              ↓
        Executes functions/api/proxy.js
              ↓
        Fetches external URL → streams back with download headers
              ↓
        Download starts successfully ✅
```

**Cloudflare Pages** automatically detects files in the `functions/` directory and deploys them as edge functions.

---

## Solution: Test Locally with Wrangler

### What is Wrangler?

Wrangler is Cloudflare's official CLI tool that simulates the **exact same environment** as Cloudflare Pages on your local machine.

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

Or if you prefer not to install globally:

```bash
npx wrangler pages dev .
```

---

### Step 2: Run Your Project with Full Pages Functions Support

```bash
# Navigate to your project directory
cd "c:\Users\Gheffira\Downloads\FILE DHAFA2\web-tools-dhafa"

# Start local development server with Pages Functions
npx wrangler pages dev .
```

**What this does:**
- Starts a local server at `http://localhost:8788`
- Loads all files from current directory
- **Executes Cloudflare Functions** from `functions/` directory
- Simulates exact Cloudflare Pages behavior

---

### Step 3: Test Downloads Locally

1. Open browser: `http://localhost:8788`
2. Open DevTools → Network tab
3. Go to any downloader tool (TikTok, Instagram, etc.)
4. Paste a URL and click Download
5. Watch the magic happen:

```
Request: GET http://localhost:8788/api/proxy?url=https%3A%2F%2F...
Status: 200 OK ✅
Initiator: downloader.js
```

6. Download should start without errors! 🎉

---

## Expected Behavior Comparison

| Environment | Server Command | `/api/proxy` Available? | Downloads Work? |
|-------------|----------------|------------------------|-----------------|
| **Regular static server** | `live-server`, `http-server`, VS Code Live Server | ❌ NO - 404 error | ❌ FAIL |
| **Wrangler local dev** | `npx wrangler pages dev .` | ✅ YES - executes function | ✅ WORKS |
| **Cloudflare Pages (production)** | Deployed to `.pages.dev` | ✅ YES - deployed function | ✅ WORKS |

---

## Troubleshooting Local Development

### Issue 1: "wrangler: command not found"

**Solution:**
```bash
# Install globally
npm install -g wrangler

# Or use npx (no installation needed)
npx wrangler pages dev .
```

---

### Issue 2: Port already in use

**Error:** `Error: Port 8788 is already in use`

**Solution:**
```bash
# Use different port
npx wrangler pages dev . --port=8789

# Then open: http://localhost:8789
```

---

### Issue 3: Function still returns 404

**Check:**
1. Make sure you're running `npx wrangler pages dev .` (with the dot)
2. Verify `functions/api/proxy.js` exists
3. Check wrangler.toml has correct config:

```toml
# wrangler.toml
name = "web-tools-dhafa"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "."
```

---

### Issue 4: CORS errors in browser console

**This is normal for localhost!** The proxy has CORS headers set to allow all origins (`*`), but browsers may still show warnings during local development.

**Solution:** Ignore CORS warnings on localhost. They won't appear in production on Cloudflare Pages.

---

### Issue 5: "Domain tidak diizinkan" error

**Cause:** The external URL's domain is not in the allowlist.

**Solution:** Add the domain to `functions/api/proxy.js`:

```javascript
const ALLOWED_DOMAINS = [
  // ... existing domains ...
  'newdomain.com', // Add here
];
```

Then restart wrangler:
```bash
# Stop current server (Ctrl+C)
npx wrangler pages dev .
```

---

## Deployment to Cloudflare Pages

Once you've tested locally with Wrangler and confirmed downloads work, deploy to production:

### Option 1: Deploy via Git (Recommended)

1. Push code to GitHub/GitLab:
```bash
git add .
git commit -m "fix: force all downloads through proxy"
git push origin main
```

2. Connect repository to Cloudflare Pages:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Pages → Create a project
   - Connect your Git repository
   - Build settings:
     - Build command: Leave empty (no build needed)
     - Build output directory: `.` (root)
   - Click "Deploy"

3. Automatic deployments on every push! 🚀

---

### Option 2: Direct Upload via Wrangler

```bash
# Login to Cloudflare (first time only)
npx wrangler login

# Deploy directly
npx wrangler pages deploy . --project-name=web-tools-dhafa
```

This will:
- Upload all files to Cloudflare Pages
- Deploy the site instantly
- Give you a `*.pages.dev` URL

---

## Production URLs

After deployment, your downloads will work at:

```
https://web-tools-dhafa.pages.dev/api/proxy?url=...
```

Instead of:
```
http://localhost:8788/api/proxy?url=...
```

Same functionality, different domain! ✅

---

## Quick Reference Commands

```bash
# Install Wrangler (one-time)
npm install -g wrangler

# Start local dev server with Pages Functions
npx wrangler pages dev .

# Start on specific port
npx wrangler pages dev . --port=9000

# Deploy to Cloudflare Pages
npx wrangler pages deploy . --project-name=web-tools-dhafa

# Login to Cloudflare (first deployment only)
npx wrangler login
```

---

## Testing Checklist

Before deploying to Cloudflare:

- [ ] Installed Wrangler globally or using npx
- [ ] Started server with `npx wrangler pages dev .`
- [ ] Opened `http://localhost:8788` in browser
- [ ] Tested TikTok download → works ✅
- [ ] Tested Instagram download → works ✅
- [ ] Tested YouTube download → works ✅
- [ ] Checked Network tab → shows `/api/proxy` requests
- [ ] No 404 errors in console
- [ ] Downloads start automatically
- [ ] No external redirects occur

**If all checks pass locally with Wrangler, it will work perfectly on Cloudflare Pages!** 🎉

---

## Summary

**Question:** Will downloads work on Cloudflare Pages?

**Answer:** YES! ✅

The `/api/proxy` function will be deployed and executed by Cloudflare's edge runtime, exactly like when you run `npx wrangler pages dev .` locally.

**Current 404 error is ONLY because:**
- You're using a regular static server
- Static servers can't execute Cloudflare Functions
- This is expected behavior

**To fix:**
1. Use `npx wrangler pages dev .` for local testing
2. Deploy to Cloudflare Pages for production

Both environments fully support the `/api/proxy` endpoint! 🚀
