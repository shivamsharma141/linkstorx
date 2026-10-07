import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendResetCode(email, code) {
  const year = new Date().getFullYear();

  await transporter.sendMail({
    from: `"LinkStorX" <${process.env.MAIL_USER}>`,
    sender: process.env.MAIL_USER,
    replyTo: process.env.MAIL_USER,

    to: email,

    subject: `${code} is your LinkStorX verification code`,

    text: `
Your LinkStorX verification code is ${code}.

This code will expire in 5 minutes.

If you did not request a password reset, you can safely ignore this email.
    `.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkStorX Verification Code</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;
">

  <div style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:18px;
    overflow:hidden;
  ">

    <div style="
      padding:30px;
      background:#0066ff;
      color:#ffffff;
      text-align:center;
    ">
      <h1 style="
        margin:0;
        font-size:28px;
      ">
        LinkStorX
      </h1>

      <p style="
        margin:8px 0 0;
        font-size:14px;
      ">
        Password Reset
      </p>
    </div>

    <div style="padding:35px 30px;">

      <h2 style="
        margin:0 0 15px;
        color:#0f172a;
      ">
        Verify your email
      </h2>

      <p style="
        color:#64748b;
        line-height:1.6;
      ">
        We received a request to reset your LinkStorX password.
        Use the verification code below.
      </p>

      <div style="
        margin:30px 0;
        padding:22px;
        text-align:center;
        background:#eff6ff;
        border-radius:14px;
      ">

        <div style="
          font-size:36px;
          font-weight:bold;
          letter-spacing:8px;
          color:#0066ff;
        ">
          ${code}
        </div>

      </div>

      <p style="
        color:#64748b;
        line-height:1.6;
      ">
        This code expires in <strong>5 minutes</strong>.
      </p>

      <p style="
        color:#94a3b8;
        font-size:13px;
        line-height:1.5;
      ">
        If you didn't request this code, you can safely ignore
        this email.
      </p>

    </div>

    <div style="
      padding:20px 30px;
      background:#f8fafc;
      text-align:center;
      color:#94a3b8;
      font-size:12px;
    ">
      © ${year} LinkStorX
    </div>

  </div>

</body>
</html>
    `,
  });
}