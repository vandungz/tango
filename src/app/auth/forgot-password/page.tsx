'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
    const router = useRouter();
    
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Đã xảy ra lỗi');
            } else {
                setSuccess(data.message);
                // Redirect to reset password page after 2 seconds
                setTimeout(() => {
                    router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
                }, 2000);
            }
        } catch {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <Link href="/" className={styles.backHome}>
                    ← Quay về trang chủ
                </Link>
                
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                <h1 className={styles.authTitle}>Quên mật khẩu</h1>
                <p className={styles.authSubtitle}>
                    Nhập email để nhận mã xác thực
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}
                    {success && <div className={styles.success}>{success}</div>}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="Nhập email của bạn"
                            required
                            disabled={isLoading || !!success}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading || !!success}
                    >
                        {isLoading ? 'Đang gửi...' : 'Gửi mã xác thực'}
                    </button>
                </form>

                <p className={styles.linkText}>
                    <Link href="/auth/login" className={styles.link}>
                        Quay lại đăng nhập
                    </Link>
                </p>
            </div>
        </div>
    );
}
