import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";

import { config } from "../config.js";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailSendResult {
  delivered: boolean;
  demoMode: boolean;
  messageId?: string;
}

const hasSmtpConfig = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  : null;

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wrapTemplate = (title: string, body: string): string => `
  <!doctype html>
  <html>
    <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#122033;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6edf6;">
              <tr>
                <td style="background:#122033;color:white;padding:24px 28px;">
                  <h1 style="font-size:22px;line-height:1.25;margin:0;">SEO Vision AI</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <h2 style="font-size:20px;line-height:1.3;margin:0 0 16px;">${title}</h2>
                  ${body}
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;background:#f8fafc;color:#61738a;font-size:12px;">
                  You received this email because an SEO Vision AI account action was requested.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

export const sendEmail = async (payload: EmailPayload): Promise<EmailSendResult> => {
  const from = payload.from ?? config.smtp.from;
  const text = payload.text ?? stripHtml(payload.html);

  if (!transporter) {
    console.info("[mail:demo] Email delivery skipped because SMTP is not configured.", {
      from,
      to: payload.to,
      subject: payload.subject,
      text,
    });
    return { delivered: false, demoMode: true };
  }

  const message: Mail.Options = {
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text,
  };

  const info = await transporter.sendMail(message);
  return { delivered: true, demoMode: false, messageId: info.messageId };
};

export const sendVerificationEmail = async (
  to: string,
  verificationUrl: string,
  name = "there",
): Promise<EmailSendResult> => {
  const html = wrapTemplate(
    "Verify your email address",
    `
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">Confirm your email to activate your SEO Vision AI workspace and start generating website growth reports.</p>
      <p style="margin:0 0 24px;"><a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">Verify email</a></p>
      <p style="font-size:13px;line-height:1.5;color:#61738a;margin:0;">If the button does not work, copy this link into your browser:<br>${verificationUrl}</p>
    `,
  );

  return sendEmail({
    to,
    subject: "Verify your SEO Vision AI email",
    html,
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  resetUrl: string,
  name = "there",
): Promise<EmailSendResult> => {
  const html = wrapTemplate(
    "Reset your password",
    `
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">Use the secure link below to reset your SEO Vision AI password. If you did not request this, you can ignore this email.</p>
      <p style="margin:0 0 24px;"><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">Reset password</a></p>
      <p style="font-size:13px;line-height:1.5;color:#61738a;margin:0;">If the button does not work, copy this link into your browser:<br>${resetUrl}</p>
    `,
  );

  return sendEmail({
    to,
    subject: "Reset your SEO Vision AI password",
    html,
  });
};
