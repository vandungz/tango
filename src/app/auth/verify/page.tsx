'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    const [email, setEmail] = useState(emailParam || '');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const verifyEmail = useCallback(async (verifyToken: string) => {
        setStatus('loading');
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: verifyToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus('error');
                setMessage(data.error || 'Xác thực thất bại');
            } else {
                setStatus('success');
                setMessage(data.message);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            }
        } catch {
            setStatus('error');
            setMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        // Auto-verify if token is provided in URL
        if (tokenParam) {
            verifyEmail(tokenParam);
        }
    }, [tokenParam, verifyEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !code) return;
        verifyEmail(code);
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
                
                <h1 className={styles.authTitle}>Xác thực Email</h1>

                {status === 'loading' && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.spinner}></div>
                        <p className={styles.authSubtitle}>Đang xác thực...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.successIcon}>✓</div>
                        <div className={styles.success}>{message}</div>
                        <p className={styles.authSubtitle}>
                            Bạn sẽ được chuyển hướng đến trang đăng nhập...
                        </p>
                    </div>
                )}

                {(status === 'idle' || status === 'error') && !tokenParam && (
                    <>
                        <p className={styles.authSubtitle}>
                            Nhập mã xác thực 6 số đã gửi đến email của bạn
                        </p>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {status === 'error' && <div className={styles.error}>{message}</div>}

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
                                <label htmlFor="code" className={styles.label}>
                                    Mã xác thực
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                                disabled={isLoading || code.length !== 6}
                            >
                                Xác thực
                            </button>
                        </form>
                    </>
                )}

                {status === 'error' && tokenParam && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.errorIcon}>✕</div>
                        <div className={styles.error}>{message}</div>
                        <p className={styles.authSubtitle}>
                            Mã có thể đã hết hạn hoặc không hợp lệ.
                        </p>
                    </div>
                )}

                <p className={styles.linkText}>
                    <Link href="/auth/login" className={styles.link}>
                        Đến trang đăng nhập
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className={styles.authContainer}>Loading...</div>}>
            <VerifyForm />
        </Suspense>
    );
}
