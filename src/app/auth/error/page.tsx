'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';

const errorMessages: Record<string, string> = {
    Configuration: 'System configuration error.',
    AccessDenied: 'You do not have permission to access this page.',
    Verification: 'The verification link is invalid or has expired.',
    OAuthSignin: 'Unable to connect to the sign-in service.',
    OAuthCallback: 'An error occurred while processing sign-in.',
    OAuthCreateAccount: 'Unable to create account.',
    EmailCreateAccount: 'Unable to create an account with this email.',
    Callback: 'An error occurred while processing the request.',
    OAuthAccountNotLinked: 'This email is already linked to another account.',
    EmailSignin: 'Unable to send sign-in email.',
    CredentialsSignin: 'Incorrect login credentials.',
    SessionRequired: 'Please sign in to continue.',
    Default: 'Something went wrong. Please try again later.',
};

function ErrorContent() {
    const searchParams = useSearchParams();
    const toast = useToast();
    const error = searchParams.get('error') || 'Default';
    const errorMessage = errorMessages[error] || errorMessages.Default;

    useEffect(() => {
        toast.error(errorMessage);
    }, [errorMessage, toast]);

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <Link href="/" className={styles.backHome}>
                    Back to home
                </Link>
                
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                <h1 className={styles.authTitle}>Something went wrong</h1>
                
                <div className={styles.verifyStatus}>
                    <div className={styles.errorIcon}>!</div>
                </div>

                <p className={styles.authSubtitle}>
                    {errorMessage}
                </p>

                <div className={styles.buttonGroup} style={{ marginTop: '1.5rem' }}>
                    <Link href="/auth/login" className={styles.submitButton} style={{ textAlign: 'center', textDecoration: 'none' }}>
                        Sign in
                    </Link>
                </div>

                <p className={styles.linkText}>
                    <Link href="/" className={styles.link}>
                        Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className={styles.authContainer}>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
