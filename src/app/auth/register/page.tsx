'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

type Step = 'register' | 'verify';

export default function RegisterPage() {
    const router = useRouter();
    
    const [step, setStep] = useState<Step>('register');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
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
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ step: 'register', username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Đã xảy ra lỗi khi đăng ký');
            } else {
                setStep('verify');
                setError('');
                setSuccess(data.message);
            }
        } catch {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ step: 'verify', email, code: verificationCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Mã xác thực không hợp lệ');
            } else {
                setSuccess(data.message);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 2000);
            }
        } catch {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ step: 'resend', email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Không thể gửi lại mã');
            } else {
                setSuccess(data.message || 'Mã xác thực mới đã được gửi!');
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
                
                {step === 'register' ? (
                    <>
                        <h1 className={styles.authTitle}>Đăng ký</h1>
                        <p className={styles.authSubtitle}>Tạo tài khoản mới</p>

                        <form onSubmit={handleRegisterSubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}

                            <div className={styles.inputGroup}>
                                <label htmlFor="username" className={styles.label}>
                                    Tên đăng nhập
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={styles.input}
                                    placeholder="3-20 ký tự, chữ, số và _"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

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
                                    placeholder="example@email.com"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    Mật khẩu
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
                                    disabled={isLoading}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword" className={styles.label}>
                                    Xác nhận mật khẩu
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang gửi...' : 'Tiếp tục'}
                            </button>
                        </form>

                        <p className={styles.linkText}>
                            Đã có tài khoản?{' '}
                            <Link href="/auth/login" className={styles.link}>
                                Đăng nhập
                            </Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className={styles.authTitle}>Xác thực Email</h1>
                        <p className={styles.authSubtitle}>
                            Nhập mã 6 số đã gửi đến <strong>{email}</strong>
                        </p>

                        <form onSubmit={handleVerifySubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}

                            <div className={styles.inputGroup}>
                                <label htmlFor="verificationCode" className={styles.label}>
                                    Mã xác thực
                                </label>
                                <input
                                    id="verificationCode"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => {
                                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        if (success) setSuccess('');
                                    }}
                                    className={styles.input}
                                    placeholder="Nhập mã 6 số"
                                    required
                                    maxLength={6}
                                    pattern="\d{6}"
                                    disabled={isLoading}
                                    autoFocus
                                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading || verificationCode.length !== 6 || !!success}
                            >
                                {isLoading ? 'Đang xác thực...' : 'Xác thực'}
                            </button>
                        </form>

                        <p className={styles.linkText}>
                            Không nhận được mã?{' '}
                            <button
                                onClick={handleResendCode}
                                className={styles.link}
                                disabled={isLoading}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Gửi lại mã
                            </button>
                        </p>

                        <p className={styles.linkText}>
                            <button
                                onClick={() => {
                                    setStep('register');
                                    setError('');
                                    setSuccess('');
                                    setVerificationCode('');
                                }}
                                className={styles.link}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                ← Quay lại đăng ký
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
