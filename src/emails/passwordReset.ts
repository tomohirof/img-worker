/**
 * パスワードリセットメールのテンプレート
 */

export interface PasswordResetEmailParams {
  resetUrl: string;
  userEmail: string;
}

export function generatePasswordResetEmail(params: PasswordResetEmailParams) {
  const { resetUrl, userEmail } = params;

  return {
    subject: 'パスワードリセットのご案内',

    text: `
OGP画像生成サービスをご利用いただきありがとうございます。

パスワードリセットのリクエストを受け付けました。

以下のURLから15分以内にパスワードをリセットしてください：
${resetUrl}

このメールに心当たりがない場合は、このメールを無視してください。
パスワードは変更されません。

---
OGP画像生成サービス
    `.trim(),

    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスワードリセット</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- ヘッダー -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                パスワードリセット
              </h1>
            </td>
          </tr>

          <!-- コンテンツ -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                こんにちは、
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                OGP画像生成サービスをご利用いただきありがとうございます。<br>
                パスワードリセットのリクエストを受け付けました。
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                以下のボタンをクリックして、パスワードをリセットしてください：
              </p>

              <!-- ボタン -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      パスワードをリセット
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 注意事項 -->
              <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ 重要：</strong> このリンクは15分間のみ有効です。
                </p>
              </div>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
              </p>
              <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all;">
                <a href="${resetUrl}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                  ${resetUrl}
                </a>
              </p>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                このメールに心当たりがない場合は、このメールを無視してください。<br>
                パスワードは変更されません。
              </p>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                © 2025 OGP画像生成サービス<br>
                このメールは ${userEmail} 宛に送信されました。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}
