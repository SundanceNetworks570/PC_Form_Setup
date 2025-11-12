import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CORS: lock to your frontend origin ---
app.use(cors({ origin: ['https://sundancenetworks570.github.io'] }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '15mb' }));

// --- Health check so https://<service>.onrender.com/health works ---
app.get('/health', (_req, res) => res.send('ok'));

// --- Validate required env ahead of time ---
['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','FROM_EMAIL'].forEach(k => {
  if (!process.env[k]) console.warn(`[warn] Missing env ${k}`);
});

// Office 365 on 587 uses STARTTLS (secure=false). Only set SMTP_SECURE=true if you use port 465.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // leave undefined or 'false' for 587
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  // nodemailer will upgrade with STARTTLS automatically on 587
});

app.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).send('Missing fields');

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,   // <-- use FROM_EMAIL
      to,
      subject,
      html:
        `<p>Completed Sundance setup/migration/reinstall form is attached and inlined below.</p>` +
        html,
      attachments: [
        {
          filename: 'sundance_new_setup_form.html',
          content: html,
          contentType: 'text/html'
        }
      ]
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[mailer] send failed:', err);
    res.status(500).json({ ok: false, error: 'Send failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mail server running on ${PORT}`));
