const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/health/email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.verify();
    return res.status(200).json({
      status: 'ok',
      smtpHost: process.env.SMTP_HOST || null,
      smtpUser: process.env.SMTP_USER
        ? '***@' + (process.env.SMTP_USER.split('@')[1] || '')
        : null,
      hasFrom: !!process.env.EMAIL_FROM,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : String(err),
      smtpHost: process.env.SMTP_HOST || null,
      missingEnv: {
        SMTP_HOST: !process.env.SMTP_HOST,
        SMTP_PORT: !process.env.SMTP_PORT,
        SMTP_USER: !process.env.SMTP_USER,
        SMTP_PASS: !process.env.SMTP_PASS,
        EMAIL_FROM: !process.env.EMAIL_FROM,
      },
    });
  }
});

module.exports = router;
