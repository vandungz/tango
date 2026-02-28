import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateVerificationToken, sendVerificationEmail, verifyToken } from '@/lib/auth/verification';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { step, username, email, password, code } = body;

        // ===== Step: Resend verification code =====
        if (step === 'resend') {
            if (!email) {
                return NextResponse.json(
                    { error: 'Email không hợp lệ' },
                    { status: 400 }
                );
            }

            const normalizedResendEmail = email.toLowerCase();

            // Check if there's already a verified user with this email
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedResendEmail },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'Email đã được đăng ký. Vui lòng đăng nhập.' },
                    { status: 409 }
                );
            }

            // Check if there's a pending verification token for this email
            const pendingToken = await prisma.verificationToken.findFirst({
                where: {
                    identifier: normalizedResendEmail,
                    type: 'email_verification',
                },
            });

            if (!pendingToken || !pendingToken.metadata) {
                return NextResponse.json(
                    { error: 'Không tìm thấy đăng ký đang chờ xác thực. Vui lòng đăng ký lại.' },
                    { status: 404 }
                );
            }

            // Re-generate token but keep the same metadata
            const newCode = await generateVerificationToken(
                normalizedResendEmail,
                'email_verification',
                pendingToken.metadata
            );

            try {
                await sendVerificationEmail(normalizedResendEmail, newCode);
            } catch (emailError) {
                console.error('Failed to resend verification email:', emailError);
                return NextResponse.json(
                    { error: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { message: 'Mã xác thực mới đã được gửi đến email của bạn!' },
                { status: 200 }
            );
        }

        // ===== Step: Verify code and complete registration =====
        if (step === 'verify') {
            if (!email || !code) {
                return NextResponse.json(
                    { error: 'Vui lòng nhập mã xác thực' },
                    { status: 400 }
                );
            }

            const normalizedVerifyEmail = email.toLowerCase();

            // Check if user already exists (already verified)
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedVerifyEmail },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'Email đã được đăng ký. Vui lòng đăng nhập.' },
                    { status: 409 }
                );
            }

            // Verify the token — returns identifier + metadata
            const result = await verifyToken(code, 'email_verification');

            if (!result || result.identifier !== normalizedVerifyEmail) {
                return NextResponse.json(
                    { error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' },
                    { status: 400 }
                );
            }

            if (!result.metadata) {
                return NextResponse.json(
                    { error: 'Dữ liệu đăng ký không hợp lệ. Vui lòng đăng ký lại.' },
                    { status: 400 }
                );
            }

            // Extract pending registration data
            const pendingData = JSON.parse(result.metadata) as {
                username: string;
                hashedPassword: string;
            };

            // Re-check username uniqueness (someone else may have taken it)
            const usernameTaken = await prisma.user.findUnique({
                where: { username: pendingData.username },
            });

            if (usernameTaken) {
                return NextResponse.json(
                    { error: 'Tên đăng nhập đã được sử dụng bởi người khác trong lúc chờ xác thực. Vui lòng đăng ký lại với tên khác.' },
                    { status: 409 }
                );
            }

            // NOW create the user — only after successful verification
            await prisma.user.create({
                data: {
                    username: pendingData.username,
                    email: normalizedVerifyEmail,
                    password: pendingData.hashedPassword,
                    emailVerified: new Date(),
                },
            });

            return NextResponse.json(
                { message: 'Đăng ký thành công!' },
                { status: 200 }
            );
        }

        // ===== Step: Register — validate & send verification code (NO user creation) =====
        if (!username || !email || !password) {
            return NextResponse.json(
                { error: 'Vui lòng điền đầy đủ thông tin' },
                { status: 400 }
            );
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return NextResponse.json(
                { error: 'Tên đăng nhập phải từ 3-20 ký tự, chỉ chứa chữ, số và dấu gạch dưới' },
                { status: 400 }
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Email không hợp lệ' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Mật khẩu phải có ít nhất 8 ký tự' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase();

        // Check email — already registered?
        const existingEmail = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng chức năng quên mật khẩu.' },
                { status: 409 }
            );
        }

        // Check username
        const existingUsername = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUsername) {
            return NextResponse.json(
                { error: 'Tên đăng nhập đã được sử dụng' },
                { status: 409 }
            );
        }

        // Hash password and store as metadata (NOT creating user yet)
        const hashedPassword = await bcrypt.hash(password, 12);
        const metadata = JSON.stringify({ username, hashedPassword });

        // Generate verification code with pending registration data
        const verificationCode = await generateVerificationToken(
            normalizedEmail,
            'email_verification',
            metadata
        );

        try {
            await sendVerificationEmail(normalizedEmail, verificationCode);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            return NextResponse.json(
                { error: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: 'Mã xác thực đã được gửi đến email của bạn!',
                requireVerification: true,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Đã xảy ra lỗi khi đăng ký' },
            { status: 500 }
        );
    }
}
