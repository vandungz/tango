'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';
import DigitCodeInput from '@/components/auth/DigitCodeInput';

function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    const [email, setEmail] = useState(emailParam || '');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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
                toast.error(data.error || 'Verification failed');
            } else {
                setStatus('success');
                toast.success(data.message);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            }
        } catch {
            setStatus('error');
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [router, toast]);

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
                    Back to home
                </Link>
                
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                <h1 className={styles.authTitle}>Verify email</h1>

                {status === 'loading' && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.spinner}></div>
                        <p className={styles.authSubtitle}>Verifying...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.successIcon}>✓</div>
                        <p className={styles.authSubtitle}>
                            You will be redirected to the sign-in page...
                        </p>
                    </div>
                )}

                {(status === 'idle' || status === 'error') && !tokenParam && (
                    <>
                        <p className={styles.authSubtitle}>
                            Enter the 6-digit verification code sent to your email
                        </p>

                        <form onSubmit={handleSubmit} className={styles.form}>
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
                                    Verification code
                                </label>
                                <DigitCodeInput
                                    id="code"
                                    value={code}
                                    onChange={setCode}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading || code.length !== 6}
                            >
                                Verify
                            </button>
                        </form>
                    </>
                )}

                {status === 'error' && tokenParam && (
                    <div className={styles.verifyStatus}>
                        <div className={styles.errorIcon}>✕</div>
                        <p className={styles.authSubtitle}>
                            The code may be expired or invalid.
                        </p>
                    </div>
                )}

                <p className={styles.linkText}>
                    <Link href="/auth/login" className={styles.link}>
                        Go to sign in
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
