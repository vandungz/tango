'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const verifyEmail = useCallback(async (verifyToken: string) => {
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
        }
    }, [router]);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token không hợp lệ');
            return;
        }
        verifyEmail(token);
    }, [token, verifyEmail]);

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
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

                {status === 'error' && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.errorIcon}>✕</div>
                        <div className={styles.error}>{message}</div>
                        <p className={styles.authSubtitle}>
                            Token có thể đã hết hạn hoặc không hợp lệ.
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
