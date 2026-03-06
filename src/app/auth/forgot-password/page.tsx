'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const toast = useToast();
    
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(false);
        setIsLoading(true);
        const normalizedEmail = email.trim().toLowerCase();

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
                setIsSubmitted(true);
                toast.success(data.message);
                // Redirect to reset password page after 2 seconds
                setTimeout(() => {
                    router.push(`/auth/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
                }, 2000);
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
                
                <h1 className={styles.authTitle}>Forgot password</h1>
                <p className={styles.authSubtitle}>
                    Enter your email to receive a verification code
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
                            disabled={isLoading || isSubmitted}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading || isSubmitted}
                    >
                        {isLoading ? 'Sending...' : 'Send verification code'}
                    </button>
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
