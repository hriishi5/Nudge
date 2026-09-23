import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends a transactional email (for Udyam declaration requests or alerts)
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text body
 * @param {string} [params.html] - HTML body
 * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const fromAddress = process.env.EMAIL_FROM || 'compliance@nudge.local';

  if (!transporter) {
    // If SMTP not configured, simulate delivery for development & audit
    console.log(`📨 [SIMULATED EMAIL DISPATCH]`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${fromAddress}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body Preview: ${text.slice(0, 120)}...`);
    return {
      success: true,
      messageId: `simulated_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      simulated: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br/>')}</p>`,
    });

    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (error) {
    console.error('[EMAIL_SEND_ERROR] Failed to send email to', to, error.message);
    throw new Error(`Email dispatch failed: ${error.message}`);
  }
}
