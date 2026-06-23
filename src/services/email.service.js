const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

const createTransporter = () =>
    nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.port === 465,
        auth: {
            user: config.email.smtp.auth.user,
            pass: config.email.smtp.auth.pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MTBS</title>
  <style>
    body { background:#0a0a14; font-family: Arial, sans-serif; margin:0; padding:0; }
    .wrap { max-width: 600px; margin: 0 auto; background:#12121f; color:#ffffff; border:1px solid #1e1e30; border-radius:16px; overflow:hidden; }
    .head { background: linear-gradient(135deg, #1a0533 0%, #0d0d1f 60%, #1a0d33 100%); padding: 28px 32px; text-align:center; }
    .body { padding: 32px; }
    .footer { background:#0d0d1a; padding: 20px 32px; color:#77778f; font-size:12px; text-align:center; }
    .card { background:#1a1a2e; border-left:4px solid #f5a623; border-radius:8px; padding:20px 24px; }
    .accent { color:#f5a623; }
  </style>
</head>
<body>
  <div style="padding:40px 20px;">
    <div class="wrap">
      <div class="head">
        <img src="https://res.cloudinary.com/dtnmtkqq4/image/upload/v1773507182/FG-logo_eq7duv.png" alt="MTBS Logo" style="height:60px; max-width:100%; display:block; margin:0 auto 8px;" />
        <div style="letter-spacing:3px; color:#b6b6c9; font-size:12px; text-transform:uppercase;">Movie Ticket Booking</div>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <div>© ${new Date().getFullYear()} MTBS. This is an automated email.</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const verificationEmailTemplate = ({ firstName, verificationCode, expiresInHours = 24 }) =>
    baseLayout(`
      <h2>Chao mung <span class="accent">${firstName}</span> den voi MTBS</h2>
      <p>Vui long su dung ma xac thuc ben duoi de kich hoat tai khoan cua ban.</p>
      <div class="card">
        <p>Ma nay se het han sau <strong class="accent">${expiresInHours} gio</strong>.</p>
      </div>
      <div style="text-align:center; margin:28px 0;">
        <div style="display:inline-block; padding:16px 32px; border:2px dashed #f5a623; border-radius:8px; font-size:30px; font-weight:700; letter-spacing:8px;">
          ${verificationCode}
        </div>
      </div>
      <p>Neu ban khong tao tai khoan MTBS, vui long bo qua email nay.</p>
    `);

const forgotPasswordTemplate = ({ firstName, newPassword }) =>
    baseLayout(`
      <h2>Mat khau moi cua ban</h2>
      <p>Xin chao <span class="accent">${firstName}</span>, he thong da dat lai mat khau cho ban.</p>
      <div class="card">
        <p>Vui long dang nhap va doi mat khau ngay sau khi vao he thong.</p>
      </div>
      <div style="text-align:center; margin:28px 0;">
        <div style="display:inline-block; padding:16px 32px; border:2px dashed #e040fb; border-radius:8px; font-size:24px; font-weight:700; letter-spacing:4px; color:#e040fb;">
          ${newPassword}
        </div>
      </div>
    `);

const passwordChangedTemplate = ({ firstName }) =>
    baseLayout(`
      <h2>Doi mat khau thanh cong</h2>
      <p>Xin chao <span class="accent">${firstName}</span>, mat khau tai khoan MTBS cua ban da duoc cap nhat.</p>
      <div class="card">
        <p>Neu khong phai ban thuc hien thao tac nay, vui long lien he bo phan ho tro ngay.</p>
      </div>
    `);

const comingSoonNowShowingTemplate = ({ firstName, movieTitle, releaseDate, posterUrl }) => {
    const formattedDate = new Date(releaseDate).toLocaleDateString('vi-VN');

    return baseLayout(`
      <div style="text-align:center; margin-bottom:24px;">
        ${
            posterUrl
                ? `<img src="${posterUrl}" alt="${movieTitle}" style="width:180px; max-width:100%; border-radius:14px; border:1px solid #2b2b42;" />`
                : '<div style="display:inline-block; padding:18px 22px; border-radius:999px; background:#1a0533; border:2px solid #f5a623;">MOVIE</div>'
        }
      </div>
      <h2>Phim ban dang cho da khoi chieu</h2>
      <p>Xin chao <span class="accent">${firstName}</span>, phim ban da luu trong danh sach cho chieu hien da bat dau chieu.</p>
      <div class="card">
        <p style="font-size:18px; font-weight:700; margin:0 0 8px;">${movieTitle}</p>
        <p style="margin:0;">Ngay khoi chieu: <strong class="accent">${formattedDate}</strong></p>
      </div>
      <p style="margin-top:20px;">Hay mo ung dung MTBS de xem suat chieu va dat ve ngay.</p>
    `);
};

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();
    const mailOptions = {
        from: `"MTBS" <${config.email.from}>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw error;
    }
};

const sendVerificationEmail = async ({ to, firstName, verificationCode }) => {
    await sendEmail({
        to,
        subject: 'MTBS - Ma xac thuc email cua ban',
        html: verificationEmailTemplate({ firstName, verificationCode }),
    });
};

const sendForgotPasswordEmail = async ({ to, firstName, newPassword }) => {
    await sendEmail({
        to,
        subject: 'MTBS - Mat khau moi cua ban',
        html: forgotPasswordTemplate({ firstName, newPassword }),
    });
};

const sendPasswordChangedEmail = async ({ to, firstName }) => {
    await sendEmail({
        to,
        subject: 'MTBS - Mat khau cua ban da duoc thay doi',
        html: passwordChangedTemplate({ firstName }),
    });
};

const sendComingSoonNowShowingEmail = async ({
    to,
    firstName,
    movieTitle,
    releaseDate,
    posterUrl,
}) => {
    await sendEmail({
        to,
        subject: `MTBS - ${movieTitle} da khoi chieu`,
        html: comingSoonNowShowingTemplate({
            firstName,
            movieTitle,
            releaseDate,
            posterUrl,
        }),
    });
};

module.exports = {
    sendVerificationEmail,
    sendForgotPasswordEmail,
    sendPasswordChangedEmail,
    sendComingSoonNowShowingEmail,
};
