'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const toast = useToast();
    
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                login,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error('Incorrect username/email or password');
            } else {
                router.push(callbackUrl);
                router.refresh();
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
                
                <h1 className={styles.authTitle}>Sign in</h1>
                <p className={styles.authSubtitle}>Welcome back!</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="login" className={styles.label}>
                            Email or username
                        </label>
                        <input
                            id="login"
                            type="text"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className={styles.input}
                            placeholder="Enter email or username"
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
                            placeholder="Enter password"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.forgotLink}>
                        <Link href="/auth/forgot-password" className={styles.link}>
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <p className={styles.linkText}>
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/register" className={styles.link}>
                        Sign up now
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.authContainer}>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
