'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';
import DigitCodeInput from '@/components/auth/DigitCodeInput';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';
    const toast = useToast();
    
    const [email, setEmail] = useState(emailFromUrl);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCompleted(false);
        setIsLoading(true);
        const normalizedEmail = email.trim().toLowerCase();

        // Client-side validation
        if (password !== confirmPassword) {
            toast.error('Password confirmation does not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: normalizedEmail, code, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'An error occurred');
            } else {
                setIsCompleted(true);
                toast.success(data.message);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            toast.error('Please enter your email');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'An error occurred');
            } else {
                toast.success('A new verification code has been sent!');
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                
                <h1 className={styles.authTitle}>Reset password</h1>
                <p className={styles.authSubtitle}>
                    Enter your verification code and new password
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
                            placeholder="Enter your email"
                            required
                            disabled={isLoading || isCompleted}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="code" className={styles.label}>
                            Verification code (6 digits)
                        </label>
                        <DigitCodeInput
                            id="code"
                            value={code}
                            onChange={setCode}
                            disabled={isLoading || isCompleted}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            New password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="At least 8 characters"
                            required
                            minLength={8}
                            disabled={isLoading || isCompleted}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Confirm new password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Re-enter password"
                            required
                            disabled={isLoading || isCompleted}
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            className={styles.backButton}
                            onClick={handleResendCode}
                            disabled={isLoading || isCompleted}
                        >
                            Resend code
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading || isCompleted || code.length !== 6}
                        >
                            {isLoading ? 'Processing...' : 'Reset password'}
                        </button>
                    </div>
                </form>

                <p className={styles.linkText}>
                    <Link href="/auth/login" className={styles.link}>
                        Back to sign in
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
