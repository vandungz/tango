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
    type: TokenType,
    identifier?: string
): Promise<{ identifier: string; metadata?: string | null } | null> {
    const verificationToken = await prisma.verificationToken.findFirst({
        where: {
            token,
            type,
            ...(identifier ? { identifier } : {}),
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
interface AuthEmailContent {
    preTitle: string;
    title: string;
    description: string;
    expiryText: string;
    footerNote: string;
    codePalette: {
        background: string;
        border: string;
        text: string;
    };
}

function renderCodeBoxes(code: string, palette: AuthEmailContent['codePalette']): string {
    return code
        .split('')
        .map(
            d =>
                `<td style="width:44px;height:52px;background:${palette.background};border:1px solid ${palette.border};border-radius:10px;text-align:center;vertical-align:middle;font-size:28px;font-weight:700;color:${palette.text};font-family:'Segoe UI',Arial,sans-serif;">${d}</td>`
        )
        .join('<td style="width:8px;"></td>');
}

function buildAuthEmailHtml(code: string, content: AuthEmailContent): string {
    const digitBoxes = renderCodeBoxes(code, content.codePalette);
    const logoBand = `
        <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 14px;border:1px solid #e2e4e8;border-radius:999px;background:#ffffff;">
            <span style="font-size:16px;line-height:1;color:#5b6dcd;">◐</span>
            <span style="font-size:14px;font-weight:700;letter-spacing:-0.2px;color:#1a1d24;">Tango</span>
        </div>
    `;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:24px 12px;background-color:#f5f6f8;font-family:'Segoe UI',Arial,sans-serif;color:#1a1d24;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e4e8;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #e8eaed;background:#fbfbfc;">
            ${logoBand}
        </div>

        <div style="padding:30px 24px 24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#6b7280;">${content.preTitle}</p>
            <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;letter-spacing:-0.6px;color:#1a1d24;">${content.title}</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">${content.description}</p>

            <div style="margin:0 0 22px;text-align:center;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>${digitBoxes}</tr></table>
            </div>

            <div style="padding:12px 14px;background:#f9fafb;border:1px solid #e8eaed;border-radius:10px;margin-bottom:22px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#4b5563;">${content.expiryText}</p>
            </div>

            <hr style="border:none;border-top:1px solid #e8eaed;margin:0 0 14px;">

            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${content.footerNote}</p>
        </div>

        <div style="padding:14px 24px;background:#fbfbfc;border-top:1px solid #e8eaed;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">© 2026 Tango Game</p>
        </div>
    </div>
</body>
</html>
    `;
}

export async function sendVerificationEmail(
    email: string,
    code: string
): Promise<void> {
    await sendEmail({
        to: email,
        subject: 'Registration verification code - Tango Game',
        html: buildAuthEmailHtml(code, {
            preTitle: 'Account verification',
            title: 'Verify your account',
            description:
                'Thanks for signing up. Enter the verification code below to complete your registration.',
            expiryText: 'This verification code expires in 24 hours.',
            footerNote:
                'If you did not request this registration, you can safely ignore this email. This mailbox is not monitored.',
            codePalette: {
                background: '#f3f6ff',
                border: '#cfd8ff',
                text: '#33407b',
            },
        }),
    });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    code: string
): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
    });

    if (!existingUser) {
        console.warn(`Skipped password reset email for unregistered address: ${normalizedEmail}`);
        return;
    }

    await sendEmail({
        to: normalizedEmail,
        subject: 'Password reset - Tango Game',
        html: buildAuthEmailHtml(code, {
            preTitle: 'Security',
            title: 'Reset your password',
            description:
                'We received a password reset request for your account. Enter the code below to continue.',
            expiryText: 'This verification code expires in 1 hour.',
            footerNote:
                'If you did not request a password reset, no further action is required and your account remains unchanged.',
            codePalette: {
                background: '#fdf4f4',
                border: '#f2caca',
                text: '#7f1d1d',
            },
        }),
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
