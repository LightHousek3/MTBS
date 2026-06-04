const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

// ─── Transporter ─────────────────────────────────────────────────────────────
const createTransporter = () => {
    return nodemailer.createTransport({
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
};

// ─── Base Layout ─────────────────────────────────────────────────────────────
const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MTBS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #0a0a14; font-family: 'Montserrat', Arial, sans-serif; }
    a { text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; border: 1px solid #1e1e30;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a0533 0%, #0d0d1f 60%, #1a0d33 100%); padding: 32px 40px; text-align:center;">
              <!-- Film strip decoration -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        ${Array(8).fill('<td style="width:12px; height:10px; background:#f5a623; border-radius:2px; margin:0 3px;"></td><td style="width:6px;"></td>').join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="display:inline-block;">
                      <img src="https://res.cloudinary.com/dtnmtkqq4/image/upload/v1773507182/FG-logo_eq7duv.png" alt="MTBS Logo" style="height:60px; max-width:100%; display:block; margin:auto;" />
                      <span style="color:#fff;">MTBS</span>
                      </span>
                    </div>
                    <p style="color:#8888aa; font-size:12px; letter-spacing:4px; text-transform:uppercase; margin-top:6px;">Đặt Vé Xem Phim</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        ${Array(8).fill('<td style="width:12px; height:10px; background:#f5a623; border-radius:2px; margin:0 3px;"></td><td style="width:6px;"></td>').join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CONTENT ── -->
          <tr>
            <td style="background:#12121f; padding: 40px 48px;">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#0d0d1a; padding: 24px 40px; text-align:center; border-top:1px solid #1e1e30;">
              <p style="color:#555570; font-size:12px; line-height:1.6;">
                © ${new Date().getFullYear()} <span style="color:#f5a623; font-weight:600;">MTBS</span>. All rights reserved.<br/>
               This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin-top:12px;">
                <span style="display:inline-block; width:6px; height:6px; background:#f5a623; border-radius:50%; margin:0 4px;"></span>
                <span style="display:inline-block; width:6px; height:6px; background:#e040fb; border-radius:50%; margin:0 4px;"></span>
                <span style="display:inline-block; width:6px; height:6px; background:#f5a623; border-radius:50%; margin:0 4px;"></span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Email Verification Template ─────────────────────────────────────────────
const verificationEmailTemplate = ({ firstName, verificationCode, expiresInHours = 24 }) => {
    const content = `
      <!-- Greeting -->
      <h2 style="color:#ffffff; font-size:22px; font-weight:700; margin-bottom:8px;">
        Chào mừng đến với MTBS, <span style="color:#f5a623;">${firstName}</span>! 🎉
      </h2>
      <p style="color:#8888aa; font-size:14px; margin-bottom:28px;">
        Bạn chỉ còn một bước nữa để tận hưởng dịch vụ đặt vé xem phim tuyệt vời nhất.
      </p>

      <!-- Message box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#1a1a2e; border-left:4px solid #f5a623; border-radius:8px; padding:20px 24px;">
            <p style="color:#ccccdd; font-size:14px; line-height:1.7;">
              Vui lòng sử dụng mã xác thực gồm 6 chữ số dưới đây để kích hoạt tài khoản của bạn.
              Mã này sẽ hết hạn sau <strong style="color:#f5a623;">${expiresInHours} giờ</strong>.
            </p>
          </td>
        </tr>
      </table>

      <!-- Verification Code -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td align="center">
            <div style="background: #1e1e30; border: 2px dashed #f5a623; border-radius: 8px; padding: 16px 32px; display: inline-block;">
              <span style="font-size: 32px; font-weight: 800; color: #f5a623; letter-spacing: 8px;">${verificationCode}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- What's next -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="color:#8888aa; font-size:13px; line-height:1.7;">
              🎟️ &nbsp;Sau khi xác thực, bạn có thể:<br/>
              &nbsp;&nbsp;&nbsp;• Khám phá các bộ phim và lịch chiếu mới nhất<br/>
              &nbsp;&nbsp;&nbsp;• Đặt vé trực tuyến nhanh chóng<br/>
              &nbsp;&nbsp;&nbsp;• Tận hưởng ưu đãi độc quyền cho thành viên<br/>
            </p>
          </td>
        </tr>
      </table>

      <hr style="border:none; border-top:1px solid #1e1e30; margin: 28px 0;"/>

      <p style="color:#555570; font-size:12px; line-height:1.6;">
        Nếu bạn không tạo tài khoản MTBS, bạn có thể bỏ qua email này.<br/>
        Để được hỗ trợ, vui lòng liên hệ <span style="color:#f5a623;">support@mtbs.vn</span>
      </p>
    `;
    return baseLayout(content);
};

// ─── Forgot Password Template ─────────────────────────────────────────────────
const forgotPasswordTemplate = ({ firstName, newPassword }) => {
    const content = `
      <!-- Header icon -->
      <div style="text-align:center; margin-bottom:24px;">
        <div style="display:inline-block; background:#1a0533; border-radius:50%; width:72px; height:72px; line-height:72px; text-align:center; font-size:32px; border:2px solid #e040fb;">
          🔐
        </div>
      </div>

      <!-- Greeting -->
      <h2 style="color:#ffffff; font-size:22px; font-weight:700; text-align:center; margin-bottom:8px;">
        Mật Khẩu Mới Của Bạn
      </h2>
      <p style="color:#8888aa; font-size:14px; text-align:center; margin-bottom:28px;">
        Xin chào <span style="color:#f5a623; font-weight:600;">${firstName}</span>, mật khẩu của bạn đã được đặt lại thành công.
      </p>

      <!-- Alert box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#1a1a2e; border-left:4px solid #e040fb; border-radius:8px; padding:20px 24px;">
            <p style="color:#ccccdd; font-size:14px; line-height:1.7;">
              Mật khẩu đăng nhập của bạn đã được hệ thống thay đổi tự động. Dưới đây là mật khẩu mới của bạn:
            </p>
          </td>
        </tr>
      </table>

      <!-- New Password -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td align="center">
            <div style="background: #1e1e30; border: 2px dashed #e040fb; border-radius: 8px; padding: 16px 32px; display: inline-block;">
              <span style="font-size: 24px; font-weight: 800; color: #e040fb; letter-spacing: 4px;">${newPassword}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Security notice -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#1a0d1a; border-radius:8px; padding:16px 20px;">
            <p style="color:#888899; font-size:12px; line-height:1.7;">
              🛡️ <strong style="color:#e040fb;">Lưu ý bảo mật:</strong><br/>
              &nbsp;&nbsp;• Vui lòng đăng nhập và thay đổi mật khẩu này ngay sau khi đăng nhập<br/>
              &nbsp;&nbsp;• Không bao giờ chia sẻ mật khẩu này với bất kỳ ai<br/>
              &nbsp;&nbsp;• Đội ngũ MTBS sẽ không bao giờ yêu cầu bạn cung cấp mật khẩu
            </p>
          </td>
        </tr>
      </table>

      <hr style="border:none; border-top:1px solid #1e1e30; margin: 28px 0;"/>

      <p style="color:#555570; font-size:12px; line-height:1.6; text-align:center;">
        Để được hỗ trợ, vui lòng liên hệ <span style="color:#f5a623;">support@mtbs.vn</span>
      </p>
    `;
    return baseLayout(content);
};

// ─── Password Changed Confirmation Template ───────────────────────────────────
const passwordChangedTemplate = ({ firstName }) => {
    const content = `
      <!-- Header icon -->
      <div style="text-align:center; margin-bottom:24px;">
        <div style="display:inline-block; background:#0c1a0c; border-radius:50%; width:72px; height:72px; line-height:72px; text-align:center; font-size:32px; border:2px solid #4caf50;">
          ✅
        </div>
      </div>

      <h2 style="color:#ffffff; font-size:22px; font-weight:700; text-align:center; margin-bottom:8px;">
        Đổi Mật Khẩu Thành Công
      </h2>
      <p style="color:#8888aa; font-size:14px; text-align:center; margin-bottom:28px;">
        Xin chào <span style="color:#f5a623; font-weight:600;">${firstName}</span>, mật khẩu tài khoản MTBS của bạn đã được cập nhật.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#0c1a0c; border-left:4px solid #4caf50; border-radius:8px; padding:20px 24px;">
            <p style="color:#ccccdd; font-size:14px; line-height:1.7;">
              Mật khẩu của bạn đã được thay đổi thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
              Nếu bạn không phải là người thực hiện, vui lòng liên hệ ngay với đội ngũ hỗ trợ.
            </p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#1a0d1a; border-radius:8px; padding:16px 20px;">
            <p style="color:#888899; font-size:12px; line-height:1.7;">
              🛡️ <strong style="color:#4caf50;">Nếu không phải là bạn:</strong><br/>
              &nbsp;&nbsp;• Liên hệ ngay với chúng tôi tại <span style="color:#f5a623;">support@mtbs.vn</span><br/>
              &nbsp;&nbsp;• Chúng tôi sẽ giúp bạn bảo vệ tài khoản lập tức
            </p>
          </td>
        </tr>
      </table>

      <hr style="border:none; border-top:1px solid #1e1e30; margin: 28px 0;"/>
      <p style="color:#555570; font-size:12px; line-height:1.6; text-align:center;">
        © ${new Date().getFullYear()} MTBS — Hệ Thống Đặt Vé Xem Phim
      </p>
    `;
    return baseLayout(content);
};

// ─── Send Email (core) ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();
    const mailOptions = {
        from: `"MTBS " <${config.email.from}>`,
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send email verification link
 */
const sendVerificationEmail = async ({ to, firstName, verificationCode }) => {
    await sendEmail({
        to,
        subject: 'MTBS — Mã Xác Thực Email Của Bạn',
        html: verificationEmailTemplate({ firstName, verificationCode }),
    });
};

/**
 * Send forgot password reset link
 */
const sendForgotPasswordEmail = async ({ to, firstName, newPassword }) => {
    await sendEmail({
        to,
        subject: '🔐 MTBS — Mật Khẩu Mới Của Bạn',
        html: forgotPasswordTemplate({ firstName, newPassword }),
    });
};

/**
 * Send password changed confirmation
 */
const sendPasswordChangedEmail = async ({ to, firstName }) => {
    await sendEmail({
        to,
        subject: '✅ MTBS — Mật Khẩu Của Bạn Đã Được Thay Đổi',
        html: passwordChangedTemplate({ firstName }),
    });
};

module.exports = {
    sendVerificationEmail,
    sendForgotPasswordEmail,
    sendPasswordChangedEmail,
};
