import nodemailer from "nodemailer";

const auth = {
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
};

// Timeouts: SMTP atak jaye to request hamesha ke liye latki na rahe
const timeouts = {
  connectionTimeout: 10 * 1000,
  greetingTimeout: 10 * 1000,
  socketTimeout: 20 * 1000,
};

// MAIL_HOST set ho to wo SMTP (Brevo/Resend/SendGrid), warna Gmail
const transporter = nodemailer.createTransport(
  process.env.MAIL_HOST
    ? {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT || 587),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth,
        ...timeouts,
      }
    : { service: "gmail", auth, ...timeouts }
);

// Custom domain use karo to MAIL_FROM me us domain ka address daalo
const FROM_EMAIL = process.env.MAIL_FROM || process.env.MAIL_USER;

const COPY = {
  reset: {
    subjectSuffix: "is your LinkStorX password reset code",
    label: "Password Reset",
    heading: "Reset your password",
    intro:
      "We received a request to reset your LinkStorX password. Use the verification code below.",
    minutes: 5,
    ignore:
      "If you did not request a password reset, you can safely ignore this email.",
  },

  signup: {
    subjectSuffix: "is your LinkStorX verification code",
    label: "Email Verification",
    heading: "Confirm your email address",
    intro:
      "Thanks for signing up for LinkStorX. Use the verification code below to finish creating your account.",
    minutes: 15,
    ignore:
      "If you did not create a LinkStorX account, you can safely ignore this email.",
  },
};

export async function sendResetCode(email, code, purpose = "reset") {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Mail credentials are not configured.");
  }

  const c = COPY[purpose] || COPY.reset;
  const year = new Date().getFullYear();

  // Code subject me hone se inbox preview me dikhta hai, aur ye generic
  // "Verify your email" subject se kam spam-jaisa lagta hai.
  const subject = `${code} ${c.subjectSuffix}`;

  await transporter.sendMail({
    from: `"LinkStorX" <${FROM_EMAIL}>`,
    replyTo: FROM_EMAIL,
    to: email,
    subject,
    headers: {
      "X-Auto-Response-Suppress": "OOF, AutoReply",
      "Auto-Submitted": "auto-generated",
    },

    text: `Your LinkStorX verification code is ${code}.

This code will expire in ${c.minutes} minutes. Do not share it with anyone.

${c.ignore}

LinkStorX`,

    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">
    Your LinkStorX verification code is ${code}. It expires in ${c.minutes} minutes.
  </div>
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="padding:28px;background:#0066ff;color:#ffffff;text-align:center;">
      <h1 style="margin:0;font-size:26px;">LinkStorX</h1>
      <p style="margin:8px 0 0;font-size:14px;">${c.label}</p>
    </div>
    <div style="padding:32px 30px;">
      <h2 style="margin:0 0 14px;color:#0f172a;">${c.heading}</h2>
      <p style="color:#475569;line-height:1.6;">${c.intro}</p>
      <div style="margin:26px 0;padding:20px;text-align:center;background:#eff6ff;border-radius:12px;">
        <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#0066ff;">${code}</div>
      </div>
      <p style="color:#475569;line-height:1.6;">This code expires in <strong>${c.minutes} minutes</strong>. Never share it with anyone.</p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;">${c.ignore}</p>
    </div>
    <div style="padding:18px 30px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px;">
      This is an automated message from LinkStorX. &copy; ${year} LinkStorX
    </div>
  </div>
</body>
</html>`,
  });
}