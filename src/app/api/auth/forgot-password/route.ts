import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateVerificationToken, sendPasswordResetEmail } from '@/lib/auth/verification';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Vui lòng nhập email' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json(
                { message: 'Nếu email tồn tại, bạn sẽ nhận được mã xác thực.' },
                { status: 200 }
            );
        }

        // Generate verification code and send email
        const code = await generateVerificationToken(email.toLowerCase(), 'password_reset');
        await sendPasswordResetEmail(email.toLowerCase(), code);

        return NextResponse.json(
            { message: 'Mã xác thực đã được gửi đến email của bạn.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
