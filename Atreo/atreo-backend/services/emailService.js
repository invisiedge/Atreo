const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPassword) {
      console.warn('⚠️  SMTP credentials not configured. Email notifications will be disabled.');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        }
      });
      console.log('✅ Email service initialized with Gmail SMTP');
    }
    this.smtpFrom = smtpFrom;
  }

  async sendCredentialSharedNotification(recipientEmail, recipientName, credentialName, sharedBy, permission) {
    if (!this.transporter) {
      console.warn('Email notification skipped: SMTP not configured');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const permissionText = permission === 'edit' ? 'Edit' : 'View Only';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              padding: 0;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .message {
              font-size: 16px;
              color: #333;
              margin-bottom: 20px;
            }
            .credential-name {
              font-size: 18px;
              font-weight: 600;
              color: #2563eb;
              margin: 15px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .button:hover {
              background-color: #1d4ed8;
            }
            .footer {
              padding: 20px;
              background-color: #f9fafb;
              border-top: 1px solid #e5e7eb;
              border-radius: 0 0 8px 8px;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Atreo</h1>
            </div>
            <div class="content">
              <div class="message">
                <p>Hello ${recipientName},</p>
                <p><strong>${sharedBy}</strong> has shared credentials with you in Atreo.</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">CREDENTIAL NAME:</p>
                <div class="credential-name">
                  ${credentialName}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Permission: <strong>${permissionText}</strong>
              </p>
              <div class="button-container">
                <a href="${frontendUrl}/tools" class="button">View Credentials</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from Atreo.</p>
              <p>If you did not expect this notification, please contact your administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Atreo: Credentials Shared

Hello ${recipientName},

${sharedBy} has shared credentials with you in Atreo.

Credential Name: ${credentialName}
Permission: ${permissionText}

View your credentials: ${frontendUrl}/tools

This is an automated notification from Atreo.
If you did not expect this notification, please contact your administrator.
    `;

    try {
      await this.transporter.sendMail({
        from: `"Atreo" <${this.smtpFrom}>`,
        to: recipientEmail,
        subject: 'Atreo: Credentials Shared',
        text: text,
        html: html
      });
      console.log(`✅ Email notification sent to ${recipientEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send email notification to ${recipientEmail}:`, error.message);
      // Don't throw - email failure shouldn't break the sharing flow
    }
  }
}

module.exports = new EmailService();

