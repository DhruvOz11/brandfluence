const nodemailer = require('nodemailer');

const isEmailConfigured = () => (
  Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_USER
    && process.env.SMTP_PASS
    && process.env.MAIL_FROM
  )
);

const sendPasswordResetEmail = async (email, resetUrl) => {
  if (!isEmailConfigured()) {
    throw new Error('Password reset email is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Reset your Brandfluence password',
    text: `Use this one-time link to reset your password. It expires in 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Use this one-time link to reset your Brandfluence password. It expires in 15 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
};

module.exports = { isEmailConfigured, sendPasswordResetEmail };
