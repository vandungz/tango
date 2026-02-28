'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';
    
    const [email, setEmail] = useState(emailFromUrl);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Client-side validation
        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Đã xảy ra lỗi');
            } else {
                setSuccess(data.message);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            }
        } catch {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) {
            setError('Vui lòng nhập email');
            return;
        }

        setError('');
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
                setSuccess('Mã xác thực mới đã được gửi!');
                setTimeout(() => setSuccess(''), 3000);
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
                
                <h1 className={styles.authTitle}>Đặt lại mật khẩu</h1>
                <p className={styles.authSubtitle}>
                    Nhập mã xác thực và mật khẩu mới
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

                    <div className={styles.inputGroup}>
                        <label htmlFor="code" className={styles.label}>
                            Mã xác thực (6 số)
                        </label>
                        <input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`${styles.input} ${styles.codeInput}`}
                            placeholder="000000"
                            required
                            maxLength={6}
                            disabled={isLoading || !!success}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Mật khẩu mới
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Ít nhất 8 ký tự"
                            required
                            minLength={8}
                            disabled={isLoading || !!success}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Nhập lại mật khẩu"
                            required
                            disabled={isLoading || !!success}
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            className={styles.backButton}
                            onClick={handleResendCode}
                            disabled={isLoading || !!success}
                        >
                            Gửi lại mã
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading || !!success}
                        >
                            {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                        </button>
                    </div>
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className={styles.authContainer}>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
