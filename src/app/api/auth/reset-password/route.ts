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
                { error: 'Please fill in all required fields' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Verify the code
        const result = await verifyToken(code, 'password_reset');

        if (!result || result.identifier !== email.toLowerCase()) {
            return NextResponse.json(
                { error: 'Verification code is invalid or has expired' },
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
            { message: 'Password has been reset successfully!' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'An error occurred while resetting password' },
            { status: 500 }
        );
    }
}
