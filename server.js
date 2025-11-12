import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* ---------- CORS (GitHub Pages only) ---------- */
const ALLOWED_ORIGINS = ['https://sundancenetworks570.github.io'];
const corsOpts = {
  origin: (origin, cb) => {
    // allow no-origin (e.g., curl/Postman) and your allowed origin
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOpts));
app.options('*', cors(corsOpts)); // preflight handler

/* ---------- Basic middleware ---------- */
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Helpful request logging ---------- */
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/* ---------- Sanity routes ---------- */
app.get('/', (_req, res) => res.send('mailer up'));
app.get('/health', (_req, res) => res.send('ok'));

/* ---------- Env sanity check ---------- */
['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','FROM_EMAIL'].forEach(k => {
  if (!process.env[k]) console.warn(`[warn] Missing env ${k}`);
});

/* ---------- Nodemailer (Office 365 over STARTTLS/587) ---------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                // smtp.office365.com
  port: Number(process.env.SMTP_PORT || 587), // 587
  secure: process.env.SMTP_SECURE === 'true', // keep false for 587
  auth: {
    user: process.env.SMTP_USER,              // mailbox
    pass: process.env.SMTP_PASS               // password or app password
  }
});

/* ---------- Send endpoint ---------- */
app.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ ok:false, error:'missing_fields' });
    }

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
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
    res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
});

/* ---------- Start server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mail server running on ${PORT}`));
