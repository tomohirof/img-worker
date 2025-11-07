/**
 * メール送信ヘルパー関数（Resend統合）
 */

import { Resend } from 'resend';
import { generatePasswordResetEmail } from './passwordReset';

export interface SendPasswordResetEmailParams {
  email: string;
  resetUrl: string;
  resendApiKey: string;
  fromEmail: string;
}

/**
 * パスワードリセットメールを送信
 *
 * @param params メール送信パラメータ
 * @returns 送信結果
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { email, resetUrl, resendApiKey, fromEmail } = params;

  try {
    // Resendクライアントを初期化
    const resend = new Resend(resendApiKey);

    // メールテンプレートを生成
    const emailContent = generatePasswordResetEmail({
      resetUrl,
      userEmail: email,
    });

    // メールを送信
    const response = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    // 送信成功
    if (response.data) {
      console.log('Password reset email sent successfully:', {
        messageId: response.data.id,
        to: email,
      });
      return {
        success: true,
        messageId: response.data.id,
      };
    }

    // 送信失敗
    console.error('Failed to send password reset email:', response.error);
    return {
      success: false,
      error: response.error?.message || 'Unknown error',
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
