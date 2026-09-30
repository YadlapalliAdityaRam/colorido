import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailRegistrationData {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  collegeName: string;
  studentId?: string;
  eventTitle: string;
  eventType: string;
  eventDate?: string;
  venueName?: string;
  format?: string;
  teamName?: string;
  members?: Array<{ name: string; rollNumber?: string; role?: string; email?: string }>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'smtp' | 'brevo-api';
}

/**
 * Escapes user-supplied input to prevent HTML injection into email templates.
 */
function escapeHtml(str: unknown): string {
  if (typeof str !== 'string') {
    return str ? String(str) : '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Configures the Nodemailer SMTP transporter using environment variables.
 */
function getTransporter(): Transporter | null {
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.BREVO_API_KEY;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Generates the responsive, branded HTML email for COLORIDO 2K26.
 */
function generateConfirmationEmailHtml(reg: EmailRegistrationData): string {
  const safeName = escapeHtml(reg.participantName);
  const safeRegId = escapeHtml(reg.registrationId);
  const safeEvent = escapeHtml(reg.eventTitle);
  const safeCategory = escapeHtml(reg.eventType === 'sports' ? 'Sports Championship' : 'Cultural Festival');
  const safeCollege = escapeHtml(reg.collegeName);
  const safeEmail = escapeHtml(reg.participantEmail);
  const safePhone = escapeHtml(reg.participantPhone || '—');
  const safeVenue = escapeHtml(reg.venueName || 'R.V.R. & J.C. Campus');
  const safeDate = escapeHtml(reg.eventDate || '30 Sep - 02 Oct 2026');
  const safeTeam = reg.teamName ? escapeHtml(reg.teamName) : null;
  const isTeam = reg.format === 'team' || (reg.members && reg.members.length > 1);

  const membersHtml = isTeam && reg.members && reg.members.length > 0
    ? `
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed #e2e8f0;">
        <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #800020; text-transform: uppercase; letter-spacing: 0.08em;">
          Registered Squad (${reg.members.length} Players)
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #334155; line-height: 1.5;">
          ${reg.members.map((m, idx) => `
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 28px;">#${idx + 1}</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${escapeHtml(m.name)}</td>
              <td style="padding: 4px 0; text-align: right; color: #64748b; font-family: monospace;">${escapeHtml(m.rollNumber || '')}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>COLORIDO 2K26 Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f3ef; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #800020 0%, #580016 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
              <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #F3C85E;">
                R.V.R. &amp; J.C. College of Engineering (Autonomous)
              </p>
              <h1 style="margin: 8px 0 4px; font-size: 26px; font-weight: 900; letter-spacing: 0.08em; color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">
                COLORIDO 2K26
              </h1>
              <p style="margin: 0; font-size: 12px; color: #ffd6df; letter-spacing: 0.05em;">
                National Level Sports &amp; Cultural Festival
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 24px 20px;">
              <p style="margin: 0 0 12px; font-size: 16px; color: #0f172a; font-weight: 600;">
                Hi ${safeName},
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
                Congratulations! 🎉<br>
                Your registration for <strong>COLORIDO 2K26</strong> has been successfully completed.
              </p>

              <!-- Registration ID Prominent Callout -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #FFFBEB; border: 1.5px solid #F3C85E; border-radius: 10px; text-align: center;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #92400e;">
                      Your Official Registration ID
                    </p>
                    <p style="margin: 0; font-size: 24px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 0.08em; color: #800020;">
                      ${safeRegId}
                    </p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #78350f;">
                      Please keep this ID safe and present it during physical check-in.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Registration Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf9f6; border: 1px solid #e5e2dc; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 18px; background-color: #f1efe9; border-bottom: 1px solid #e5e2dc;">
                    <strong style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #0f172a;">
                      Registration Details
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155; line-height: 1.8;">
                      <tr>
                        <td style="width: 35%; color: #64748b; font-weight: 500;">Name:</td>
                        <td style="font-weight: 600; color: #0f172a;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Registration ID:</td>
                        <td style="font-family: monospace; font-weight: 700; color: #800020;">${safeRegId}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Event:</td>
                        <td style="font-weight: 600; color: #0f172a;">${safeEvent}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Category:</td>
                        <td>${safeCategory}</td>
                      </tr>
                      ${safeTeam ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Team Name:</td>
                        <td style="font-weight: 600; color: #0f172a;">${safeTeam}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">College:</td>
                        <td>${safeCollege}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Email:</td>
                        <td>${safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Contact Phone:</td>
                        <td>${safePhone}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Venue:</td>
                        <td>${safeVenue}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Date &amp; Time:</td>
                        <td>${safeDate}</td>
                      </tr>
                    </table>

                    ${membersHtml}
                  </td>
                </tr>
              </table>

              <!-- Event Instructions -->
              <div style="background-color: #f8fafc; border-left: 3px solid #800020; padding: 12px 14px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #0f172a;">
                  Important Instructions for Participants:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
                  <li>Carry your original College Student ID Card along with this registration pass.</li>
                  <li>Report to the designated event venue at least 30 minutes before the scheduled start time.</li>
                  <li>For team events, all registered squad members must be present for roster verification.</li>
                </ul>
              </div>

              <p style="margin: 0 0 6px; font-size: 14px; color: #334155; line-height: 1.6;">
                We're excited to have you participate in <strong>COLORIDO 2K26</strong>!
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #334155; line-height: 1.6;">
                Please keep your Registration ID safe and bring it with you during the event.<br>
                See you at COLORIDO 2K26! 🏆🎭
              </p>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                Regards,<br>
                <strong style="color: #0f172a;">COLORIDO 2K26 Team</strong><br>
                R.V.R. &amp; J.C. College of Engineering
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #334155;">
                R.V.R. &amp; J.C. College of Engineering (Autonomous)
              </p>
              <p style="margin: 0 0 8px;">
                Chandramoulipuram, Chowdavaram, Guntur, Andhra Pradesh &middot; 522019
              </p>
              <p style="margin: 0; color: #94a3b8;">
                Need help? Contact the Secretariat at <a href="mailto:colorido@rvrjc.ac.in" style="color: #800020; text-decoration: none; font-weight: 600;">colorido@rvrjc.ac.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates the clean plain-text fallback for the confirmation email.
 */
function generateConfirmationEmailText(reg: EmailRegistrationData): string {
  const category = reg.eventType === 'sports' ? 'Sports Championship' : 'Cultural Festival';
  return `
Hi ${reg.participantName},

Congratulations! 🎉
Your registration for COLORIDO 2K26 has been successfully completed.

Registration Details
----------------------------------------------
Name:            ${reg.participantName}
Registration ID: ${reg.registrationId}
Event:           ${reg.eventTitle}
Category:        ${category}
${reg.teamName ? `Team Name:       ${reg.teamName}\n` : ''}College:         ${reg.collegeName}
Email:           ${reg.participantEmail}
Phone:           ${reg.participantPhone || '—'}
Venue:           ${reg.venueName || 'R.V.R. & J.C. Campus'}
Date & Time:     ${reg.eventDate || '30 Sep - 02 Oct 2026'}
----------------------------------------------

We're excited to have you participate in COLORIDO 2K26!
Please keep your Registration ID safe and bring it with you during the event.
See you at COLORIDO 2K26! 🏆🎭

Regards,
COLORIDO 2K26 Team
R.V.R. & J.C. College of Engineering
Chandramoulipuram, Chowdavaram, Guntur, Andhra Pradesh - 522019
Contact: colorido@rvrjc.ac.in
  `.trim();
}

/**
 * Sends confirmation email directly using Brevo's v3 transactional HTTP REST API.
 * This is especially useful when SMTP outbound port 587/465 is blocked by local ISPs or hosting firewalls.
 */
async function sendViaBrevoApi(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  reg: EmailRegistrationData,
  subject: string,
  htmlContent: string,
  textContent: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            email: reg.participantEmail.trim().toLowerCase(),
            name: reg.participantName.trim(),
          },
        ],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.messageId || 'brevo-api-dispatched' };
    }

    const errData = await response.json().catch(() => ({}));
    const message = errData.message || `Brevo API HTTP ${response.status}: ${response.statusText}`;
    return { success: false, error: message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Brevo API network failure' };
  }
}

/**
 * Sends an automated registration confirmation email to the participant.
 * Uses Nodemailer SMTP with automatic Brevo REST API fallback for maximum reliability.
 */
export async function sendRegistrationConfirmationEmail(
  registration: EmailRegistrationData,
): Promise<EmailSendResult> {
  const recipientEmail = registration.participantEmail?.trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[EmailService] Invalid recipient email for registration ${registration.registrationId}: "${registration.participantEmail}"`);
    return { success: false, error: 'Invalid recipient email address' };
  }

  const subject = '🎉 Congratulations! Your COLORIDO 2K26 Registration is Confirmed';
  const htmlContent = generateConfirmationEmailHtml(registration);
  const textContent = generateConfirmationEmailText(registration);

  const brevoApiKey = process.env.BREVO_API_KEY || (process.env.EMAIL_PASSWORD?.startsWith('xsmtpsib-') ? process.env.EMAIL_PASSWORD : null);
  const fromRaw = process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"COLORIDO 2K26" <${process.env.EMAIL_USER}>` : '"COLORIDO 2K26" <adityaramyadlapalli@gmail.com>');
  
  // Parse sender name & email
  let senderName = 'COLORIDO 2K26';
  let senderEmail = 'adityaramyadlapalli@gmail.com';
  const match = fromRaw.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+)(?:>)?/);
  if (match) {
    if (match[1]?.trim()) senderName = match[1].trim();
    if (match[2]?.trim()) senderEmail = match[2].trim();
  }

  // 1. Try Nodemailer SMTP Transporter
  const transporter = getTransporter();
  if (transporter) {
    try {
      console.log(`[EmailService] Attempting SMTP dispatch to ${recipientEmail} via ${process.env.EMAIL_HOST || 'smtp-relay.brevo.com'}...`);
      const info = await transporter.sendMail({
        from: fromRaw,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`[EmailService] ✅ Email delivered via SMTP! MessageID: ${info.messageId} | Recipient: ${recipientEmail}`);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (smtpErr: any) {
      console.warn(`[EmailService] ⚠️ SMTP dispatch failed (${smtpErr.message}). Checking API fallback...`);
    }
  }

  // 2. Fallback to Brevo HTTP REST API if Brevo API Key is configured
  if (brevoApiKey) {
    console.log(`[EmailService] Attempting Brevo HTTP API dispatch to ${recipientEmail}...`);
    const apiResult = await sendViaBrevoApi(brevoApiKey, senderEmail, senderName, registration, subject, htmlContent, textContent);
    if (apiResult.success) {
      console.log(`[EmailService] ✅ Email delivered via Brevo REST API! MessageID: ${apiResult.messageId} | Recipient: ${recipientEmail}`);
      return { success: true, messageId: apiResult.messageId, provider: 'brevo-api' };
    }
    console.error(`[EmailService] ❌ Brevo REST API delivery failed:`, apiResult.error);
    return { success: false, error: apiResult.error };
  }

  console.warn(`[EmailService] No configured email transport available (set EMAIL_USER/EMAIL_PASSWORD or BREVO_API_KEY in .env)`);
  return { success: false, error: 'Email service credentials not configured' };
}
