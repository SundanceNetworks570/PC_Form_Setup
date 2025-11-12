import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

app.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).send('Missing fields');

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: `<p>Completed Sundance setup/migration/reinstall form is attached and inlined below.</p>` + html,
      attachments: [{ filename: 'sundance_new_setup_form.html', content: html, contentType: 'text/html' }]
    });

    res.send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Send failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mail server running at http://localhost:${PORT}`));
