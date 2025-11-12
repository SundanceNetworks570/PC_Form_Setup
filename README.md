# PC Setup / Migration / Reinstall Form

- Frontend (HTML) lives in `/public/index.html` (GitHub Pages can host this).
- Backend email sender is a tiny Node service (`server.js`) meant for Render.com or similar.

## Local run
```bash
npm install
cp .env.example .env   # fill in your real SMTP creds
npm start
# open http://localhost:3000
```

## Deploy
- Render Web Service:
  - Build: `npm install`
  - Start: `node server.js`
  - Env Vars: from `.env.example`
- GitHub Pages:
  - Settings → Pages → Source: `Deploy from branch`, Branch: `main`, Folder: `/public`

## Wiring
`public/index.html` calls:
```js
const API_BASE = 'https://pc-setup-form.onrender.com';
fetch(`${API_BASE}/send`, { ... })
```
