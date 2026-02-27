import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/verification';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token không hợp lệ' },
                { status: 400 }
            );
        }

        const email = await verifyToken(token, 'email_verification');

        if (!email) {
            return NextResponse.json(
                { error: 'Token không hợp lệ hoặc đã hết hạn' },
                { status: 400 }
            );
        }

        // Update user's email verification status
        await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() },
        });

        return NextResponse.json(
            { message: 'Email đã được xác thực thành công!' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Đã xảy ra lỗi khi xác thực email' },
            { status: 500 }
        );
    }
}
