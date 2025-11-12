import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ✅ Allow your frontend origin + preflight
const ALLOWED_ORIGINS = ['https://sundancenetworks570.github.io'];
const corsOpts = {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOpts));
app.options('*', cors(corsOpts)); // <-- handle preflight

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '15mb' }));

// Handy sanity routes
app.get('/', (_req, res) => res.send('mailer up'));
app.get('/health', (_req, res) => res.send('ok'));

// Warn if any env is missing
['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','FROM_EMAIL'].forEach(k => {
  if (!process.env[k]) console.warn(`[warn] Missing env ${k}`);
});

// Office 365: STARTTLS on 587 (secure=false)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

app.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).send('Missing fields');

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      html: `<p>Completed Sundance setup/migration/reinstall form is attached and inlined below.</p>` + html,
      attachments: [{ filename: 'sundance_new_setup_form.html', content: html, contentType: 'text/html' }],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[mailer] send failed:', err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mail server running on ${PORT}`));
