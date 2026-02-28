import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth/verification';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code, password } = body;

        if (!email || !code || !password) {
            return NextResponse.json(
                { error: 'Vui lòng điền đầy đủ thông tin' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Mật khẩu phải có ít nhất 8 ký tự' },
                { status: 400 }
            );
        }

        // Verify the code
        const result = await verifyToken(code, 'password_reset');

        if (!result || result.identifier !== email.toLowerCase()) {
            return NextResponse.json(
                { error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user's password
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { password: hashedPassword },
        });

        return NextResponse.json(
            { message: 'Mật khẩu đã được đặt lại thành công!' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Đã xảy ra lỗi khi đặt lại mật khẩu' },
            { status: 500 }
        );
    }
}
