import { prisma } from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
    type: TokenType,
    metadata?: string
): Promise<string> {
    // Delete any existing tokens of the same type for this identifier
    await prisma.verificationToken.deleteMany({
        where: {
            identifier,
            type,
        },
    });

    // Use 6-digit code for both email verification and password reset
    const token = generateCode();
    const expires = new Date(Date.now() + TOKEN_EXPIRY[type]);

    await prisma.verificationToken.create({
        data: {
            identifier,
            token,
            type,
            metadata,
            expires,
        },
    });

    return token;
}

/**
 * Verify a token and return the identifier and metadata if valid
 */
export async function verifyToken(
    token: string,
    type: TokenType
): Promise<{ identifier: string; metadata?: string | null } | null> {
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

    return {
        identifier: verificationToken.identifier,
        metadata: verificationToken.metadata,
    };
}

/**
 * Send verification email with 6-digit code
 */
export async function sendVerificationEmail(
    email: string,
    code: string
): Promise<void> {
    const digits = code.split('');
    const digitBoxes = digits.map(d =>
        `<td style="width:44px;height:52px;background:#f0f4ff;border:2px solid #6366f1;border-radius:10px;text-align:center;vertical-align:middle;font-size:28px;font-weight:700;color:#1e1b4b;letter-spacing:0;font-family:'Courier New',monospace;">${d}</td>`
    ).join('<td style="width:8px;"></td>');

    await sendEmail({
        to: email,
        subject: 'Registration verification code - Tango Game',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);padding:36px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:28px;">🎯</span>
        </div>
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Verify your account</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Welcome to Tango Game!</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">
            Thanks for signing up! Please enter the verification code below to complete your registration:
        </p>
        
        <!-- Code Box -->
        <div style="margin:24px 0;text-align:center;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
            </table>
        </div>

        <!-- Timer -->
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0;color:#92400e;font-size:13px;">
                ⏰ This code will expire in <strong>24 hours</strong>
            </p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

        <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            If you did not request this registration, please ignore this email.<br>
            This email was sent automatically. Please do not reply.
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;color:#d1d5db;font-size:11px;">© 2026 Tango Game. All rights reserved.</p>
    </div>
</div>
</body>
</html>
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
    const digits = code.split('');
    const digitBoxes = digits.map(d =>
        `<td style="width:44px;height:52px;background:#fef2f2;border:2px solid #ef4444;border-radius:10px;text-align:center;vertical-align:middle;font-size:28px;font-weight:700;color:#7f1d1d;letter-spacing:0;font-family:'Courier New',monospace;">${d}</td>`
    ).join('<td style="width:8px;"></td>');

    await sendEmail({
        to: email,
        subject: 'Password reset - Tango Game',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 50%,#f87171 100%);padding:36px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:28px;">🔐</span>
        </div>
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Reset password</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Password recovery request</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">
            You requested a password reset. Enter the verification code below to continue:
        </p>
        
        <!-- Code Box -->
        <div style="margin:24px 0;text-align:center;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
            </table>
        </div>

        <!-- Timer -->
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0;color:#92400e;font-size:13px;">
                ⏰ This code will expire in <strong>1 hour</strong>
            </p>
        </div>

        <!-- Security note -->
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0;color:#991b1b;font-size:13px;">
                🛡️ If you did <strong>not request</strong> a password reset, someone may be trying to access your account. Please ignore this email.
            </p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

        <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            This email was sent automatically. Please do not reply.
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;color:#d1d5db;font-size:11px;">© 2026 Tango Game. All rights reserved.</p>
    </div>
</div>
</body>
</html>
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
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
        // Development mode: log to console
        console.log('=== Email (Development Mode) ===');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.html.replace(/<[^>]*>/g, '')}`);
        console.log('================================');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });

    await transporter.sendMail({
        from: `"Tango Game" <${gmailUser}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
    });
}
