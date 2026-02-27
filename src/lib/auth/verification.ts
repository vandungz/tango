import { prisma } from '@/lib/db';
import crypto from 'crypto';

type TokenType = 'email_verification' | 'password_reset';

const TOKEN_EXPIRY = {
    email_verification: 24 * 60 * 60 * 1000, // 24 hours
    password_reset: 60 * 60 * 1000, // 1 hour
};

/**
 * Generate a 6-digit verification code
 */
export function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create and store a verification token
 */
export async function generateVerificationToken(
    identifier: string,
    type: TokenType
): Promise<string> {
    // Delete any existing tokens of the same type for this identifier
    await prisma.verificationToken.deleteMany({
        where: {
            identifier,
            type,
        },
    });

    const token = type === 'password_reset' ? generateCode() : generateToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY[type]);

    await prisma.verificationToken.create({
        data: {
            identifier,
            token,
            type,
            expires,
        },
    });

    return token;
}

/**
 * Verify a token and return the identifier if valid
 */
export async function verifyToken(
    token: string,
    type: TokenType
): Promise<string | null> {
    const verificationToken = await prisma.verificationToken.findFirst({
        where: {
            token,
            type,
            expires: {
                gt: new Date(),
            },
        },
    });

    if (!verificationToken) {
        return null;
    }

    // Delete the token after use
    await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
    });

    return verificationToken.identifier;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
    email: string,
    token: string
): Promise<void> {
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;
    
    await sendEmail({
        to: email,
        subject: 'Xác thực tài khoản',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Xác thực tài khoản của bạn</h2>
                <p>Cảm ơn bạn đã đăng ký! Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
                <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                    Xác thực email
                </a>
                <p>Hoặc copy link sau vào trình duyệt:</p>
                <p style="color: #6b7280; word-break: break-all;">${verifyUrl}</p>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
                    Link này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.
                </p>
            </div>
        `,
    });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    code: string
): Promise<void> {
    await sendEmail({
        to: email,
        subject: 'Đặt lại mật khẩu',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Đặt lại mật khẩu</h2>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã xác thực sau:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 16px 0; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
                </div>
                <p style="color: #6b7280;">Mã này sẽ hết hạn sau 1 giờ.</p>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                </p>
            </div>
        `,
    });
}

/**
 * Generic email sending function
 */
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
    // Check if we're using a real email service
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
        // Development mode: log to console
        console.log('=== Email (Development Mode) ===');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.html.replace(/<[^>]*>/g, '')}`);
        console.log('================================');
        return;
    }

    // Production: Use Resend API
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'noreply@example.com',
            to: options.to,
            subject: options.subject,
            html: options.html,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send email:', error);
        throw new Error('Failed to send email');
    }
}
