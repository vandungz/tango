'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

const errorMessages: Record<string, string> = {
    Configuration: 'Có lỗi cấu hình hệ thống.',
    AccessDenied: 'Bạn không có quyền truy cập.',
    Verification: 'Link xác thực không hợp lệ hoặc đã hết hạn.',
    OAuthSignin: 'Không thể kết nối với dịch vụ đăng nhập.',
    OAuthCallback: 'Có lỗi xảy ra khi xử lý đăng nhập.',
    OAuthCreateAccount: 'Không thể tạo tài khoản.',
    EmailCreateAccount: 'Không thể tạo tài khoản với email này.',
    Callback: 'Có lỗi xảy ra khi xử lý yêu cầu.',
    OAuthAccountNotLinked: 'Email này đã được liên kết với tài khoản khác.',
    EmailSignin: 'Không thể gửi email đăng nhập.',
    CredentialsSignin: 'Thông tin đăng nhập không chính xác.',
    SessionRequired: 'Vui lòng đăng nhập để tiếp tục.',
    Default: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
};

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error') || 'Default';
    const errorMessage = errorMessages[error] || errorMessages.Default;

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h1 className={styles.authTitle}>Có lỗi xảy ra</h1>
                
                <div className={styles.verifyStatus}>
                    <div className={styles.errorIcon}>!</div>
                    <div className={styles.error}>{errorMessage}</div>
                </div>

                <p className={styles.authSubtitle}>
                    Nếu lỗi vẫn tiếp tục, vui lòng liên hệ hỗ trợ.
                </p>

                <div className={styles.buttonGroup} style={{ marginTop: '1.5rem' }}>
                    <Link href="/auth/login" className={styles.submitButton} style={{ textAlign: 'center', textDecoration: 'none' }}>
                        Đăng nhập
                    </Link>
                </div>

                <p className={styles.linkText}>
                    <Link href="/" className={styles.link}>
                        Quay về trang chủ
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className={styles.authContainer}>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
