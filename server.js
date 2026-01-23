// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* ---------------- CORS (GitHub Pages origin) ---------------- */
const ALLOWED_ORIGINS = ['https://sundancenetworks570.github.io','https://phoneslips.pages.dev','https://sop-718.pages.dev'];
const corsOpts = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOpts));
app.options('*', cors(corsOpts)); // preflight handler

/* ---------------- Basic middleware ---------------- */
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- Request logging ---------------- */
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.path);
  next();
});

/* ---------------- Sanity routes ---------------- */
app.get('/', (_req, res) => res.send('mailer up'));
app.get('/health', (_req, res) => res.send('ok'));

/* ---------------- Env sanity check ---------------- */
['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','FROM_EMAIL'].forEach(k => {
  if (!process.env[k]) console.warn(`[warn] Missing env ${k}`);
});

/* ---------------- Nodemailer (Office 365 STARTTLS/587) ----------------
   Keep secure:false for port 587 (STARTTLS). If you use port 465, set secure:true.
----------------------------------------------------------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                  // smtp.office365.com
  port: Number(process.env.SMTP_PORT || 587),   // 587
  secure: false,                                // STARTTLS
  requireTLS: true,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  auth: {
    user: process.env.SMTP_USER,                // mailbox
    pass: process.env.SMTP_PASS,                // password or app password (if MFA)
  },
  tls: {
    servername: 'smtp.office365.com',           // SNI
    minVersion: 'TLSv1.2',
    // If you ever see a certificate chain error on Render, temporarily add:
    // rejectUnauthorized: false
  }
});

/* ---------------- SMTP verify route (temporary tool) ---------------- */
app.get('/smtp-test', async (_req, res) => {
  try {
    await transporter.verify();                 // connects + EHLO/STARTTLS
    res.send('✅ SMTP connection successful');
  } catch (e) {
    console.error('[SMTP verify failed]', e);
    res.status(500).send('❌ SMTP failed: ' + (e?.message || e));
  }
});

/* ---------------- Helper: format Phone Slip email ---------------- */
function formatPhoneSlipEmail(data = {}) {
  const lines = [
    `Date: ${data.date || ''}`,
    `Time: ${data.time || ''}`,
    `First Name: ${data.firstName || ''}`,
    `Last Name: ${data.lastName || ''}`,
    `Business: ${data.business || ''}`,
    `Phone: ${data.phone || ''}`,
    `Extension: ${data.extension || ''}`,
    `Email: ${data.email || ''}`,
    `Urgency: ${data.urgency || ''}`,
    '',
    'Description:',
    data.description || '',
    '',
    `Tech (took call): ${data.tech || ''}`,
    '',
    `Source: ${data.source || ''}`,
    `Origin URL: ${data.origin || ''}`,
  ];

  return lines.join('\n');
}

/* ---------------- NEW: Phone Slip route ---------------- */
app.post('/phone-slip', async (req, res) => {
  try {
    const data = req.body || {};

    // If frontend sends a pre-built textBody, use it; otherwise build on server
    const textBody = data.textBody || formatPhoneSlipEmail(data);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: [
  'support@sundancenetworks.com',
  'the20group@sundancenetworks.com'
], // add more recipients if desired
      subject: `New Phone Slip${data.urgency ? ' - ' + data.urgency : ''}`,
      text: textBody,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[mailer] phone-slip failed:', err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

/* ---------------- Existing /send route (leave as-is) ---------------- */
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
      html: `<p>Completed Sundance setup/migration/reinstall form is attached and inlined below.</p>${html}`,
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

/* ---------------- Start server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mail server running on ${PORT}`));
