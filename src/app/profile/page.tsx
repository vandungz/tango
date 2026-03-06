'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../auth/auth.module.css';
import { useToast } from '@/components/feedback/ToastProvider';

type ProfileResponse = {
    email: string;
    username: string;
    displayName: string | null;
};

async function safeParseApiResponse<T>(response: Response): Promise<T | { error?: string }> {
    const raw = await response.text();
    if (!raw) return {};

    try {
        return JSON.parse(raw) as T | { error?: string };
    } catch {
        return {
            error: response.ok
                ? 'Unexpected response format from server'
                : `Request failed (${response.status})`,
        };
    }
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const toast = useToast();
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [displayNameInput, setDisplayNameInput] = useState('');
    const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
    const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingDisplayName, setPendingDisplayName] = useState('');

    const fetchProfile = useCallback(async () => {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const payload = await safeParseApiResponse<ProfileResponse>(response);

        if (!response.ok || !('email' in payload)) {
            throw new Error(('error' in payload && payload.error) || 'Unable to load profile');
        }

        setProfile(payload);
        setDisplayNameInput(payload.displayName || payload.username);
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/profile');
        }
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;
        (async () => {
            try {
                await fetchProfile();
            } catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : 'Unable to load profile';
                    toast.error(message);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status, fetchProfile, toast]);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/auth/login' });
    };

    const effectiveDisplayName = useMemo(
        () => profile?.displayName || profile?.username || session?.user?.name || 'Not set',
        [profile, session?.user?.name],
    );

    const applySaveDisplayName = async (nextValue: string) => {
        try {
            setIsSavingDisplayName(true);

            const updateResponse = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ displayName: nextValue }),
            });

            const updatePayload = await safeParseApiResponse<ProfileResponse>(updateResponse);

            if (!updateResponse.ok) {
                throw new Error(('error' in updatePayload && updatePayload.error) || 'Unable to update display name');
            }

            await fetchProfile();
            setIsEditingDisplayName(false);
            toast.success('Updated successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update display name';
            toast.error(message);
        } finally {
            setIsSavingDisplayName(false);
        }
    };

    const handleSaveDisplayName = () => {
        const nextValue = displayNameInput.trim().replace(/\s+/g, ' ');

        if (nextValue.length < 2 || nextValue.length > 40) {
            toast.error('Display name phải từ 2 đến 40 ký tự.');
            return;
        }

        setPendingDisplayName(nextValue);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSaveDisplayName = async () => {
        if (!pendingDisplayName) return;
        setIsConfirmModalOpen(false);
        await applySaveDisplayName(pendingDisplayName);
        setPendingDisplayName('');
    };

    const handleCancelEdit = () => {
        setDisplayNameInput(profile?.displayName || profile?.username || '');
        setIsEditingDisplayName(false);
    };

    if (status === 'loading') {
        return (
            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <div className={styles.authLogo}>
                        <span className={styles.authLogoIcon}>◐</span>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <Link href="/" className={styles.backHome}>
                    Back to home
                </Link>
                
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                <h1 className={styles.authTitle}>Profile</h1>
                <p className={styles.authSubtitle}>Manage your account</p>

                <div className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Display name</label>
                        {isEditingDisplayName ? (
                            <>
                                <div className={styles.inputWithAction}>
                                    <input
                                        className={`${styles.input} ${styles.inputReadonlyWithActionLg}`}
                                        value={displayNameInput}
                                        onChange={(event) => setDisplayNameInput(event.target.value)}
                                        maxLength={40}
                                        disabled={isSavingDisplayName}
                                    />
                                    <div className={styles.inputActionGroup}>
                                        <button
                                            type="button"
                                            className={styles.inlineIconButton}
                                            aria-label="Cancel edit display name"
                                            onClick={handleCancelEdit}
                                            disabled={isSavingDisplayName}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.inlineIconButton} ${styles.inlineIconButtonPrimary}`}
                                            aria-label="Save display name"
                                            onClick={handleSaveDisplayName}
                                            disabled={isSavingDisplayName}
                                        >
                                            {isSavingDisplayName ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="8" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.inputWithAction}>
                                    <div className={`${styles.input} ${styles.inputReadonlyWithAction}`} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                                        {effectiveDisplayName}
                                    </div>
                                    <button
                                        type="button"
                                        className={`${styles.inlineIconButton} ${styles.inputSingleAction}`}
                                        aria-label="Edit display name"
                                        onClick={() => {
                                            setDisplayNameInput(profile?.displayName || profile?.username || '');
                                            setIsEditingDisplayName(true);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email</label>
                        <div className={styles.input} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                            {profile?.email || session.user.email}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Username</label>
                        <div className={styles.input} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                            {profile?.username || (session.user as { username?: string }).username || 'Not set'}
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={handleLogout}
                        className={styles.submitButton}
                        style={{ 
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.25)'
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </div>

            {isConfirmModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Confirm display name update">
                        <h3 className={styles.modalTitle}>Confirm display name</h3>
                        <p className={styles.modalText}>Change display name to &quot;{pendingDisplayName}&quot;?</p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setPendingDisplayName('');
                                }}
                                disabled={isSavingDisplayName}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.submitButton}
                                onClick={handleConfirmSaveDisplayName}
                                disabled={isSavingDisplayName}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
