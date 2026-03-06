'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';
import DigitCodeInput from '@/components/auth/DigitCodeInput';

type Step = 'register' | 'verify';

export default function RegisterPage() {
    const router = useRouter();
    const toast = useToast();
    
    const [step, setStep] = useState<Step>('register');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerified(false);
        setIsLoading(true);

        // Client-side validation
        if (password !== confirmPassword) {
            toast.error('Password confirmation does not match');
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
                toast.error(data.error || 'An error occurred during registration');
            } else {
                setStep('verify');
                toast.success(data.message);
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerified(false);
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
                toast.error(data.error || 'Invalid verification code');
            } else {
                setIsVerified(true);
                toast.success(data.message);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 2000);
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setIsVerified(false);
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
                toast.error(data.error || 'Unable to resend code');
            } else {
                toast.success(data.message || 'A new verification code has been sent!');
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
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                {step === 'register' ? (
                    <>
                        <h1 className={styles.authTitle}>Sign up</h1>
                        <p className={styles.authSubtitle}>Create a new account</p>

                        <form onSubmit={handleRegisterSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="username" className={styles.label}>
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={styles.input}
                                    placeholder="3-20 characters, letters, numbers, and _"
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
                                    Password
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
                                    disabled={isLoading}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword" className={styles.label}>
                                    Confirm password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="Re-enter password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Continue'}
                            </button>
                        </form>

                        <p className={styles.linkText}>
                            Already have an account?{' '}
                            <Link href="/auth/login" className={styles.link}>
                                Sign in
                            </Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className={styles.authTitle}>Verify email</h1>
                        <p className={styles.authSubtitle}>
                            Enter the 6-digit code sent to <strong>{email}</strong>
                        </p>

                        <form onSubmit={handleVerifySubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="verificationCode" className={styles.label}>
                                    Verification code
                                </label>
                                <DigitCodeInput
                                    id="verificationCode"
                                    value={verificationCode}
                                    onChange={(nextCode) => {
                                        setVerificationCode(nextCode);
                                        if (isVerified) setIsVerified(false);
                                    }}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading || verificationCode.length !== 6 || isVerified}
                            >
                                {isLoading ? 'Verifying...' : 'Verify'}
                            </button>
                        </form>

                        <p className={styles.linkText}>
                            Didn&apos;t receive a code?{' '}
                            <button
                                onClick={handleResendCode}
                                className={styles.link}
                                disabled={isLoading}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Resend code
                            </button>
                        </p>

                        <p className={styles.linkText}>
                            <button
                                onClick={() => {
                                    setStep('register');
                                    setIsVerified(false);
                                    setVerificationCode('');
                                }}
                                className={styles.link}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                ← Back to sign up
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
