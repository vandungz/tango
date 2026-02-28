'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import styles from '../auth/auth.module.css';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/profile');
        }
    }, [status, router]);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    if (status === 'loading') {
        return (
            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <div className={styles.authLogo}>
                        <span className={styles.authLogoIcon}>◐</span>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải...</p>
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
                    ← Quay về trang chủ
                </Link>
                
                <div className={styles.authLogo}>
                    <span className={styles.authLogoIcon}>◐</span>
                </div>
                
                <h1 className={styles.authTitle}>Hồ sơ</h1>
                <p className={styles.authSubtitle}>Quản lý tài khoản của bạn</p>

                <div className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Tên hiển thị</label>
                        <div className={styles.input} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                            {session.user.name || 'Chưa cập nhật'}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email</label>
                        <div className={styles.input} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                            {session.user.email}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Tên đăng nhập</label>
                        <div className={styles.input} style={{ background: 'var(--cell-bg)', cursor: 'default' }}>
                            {(session.user as { username?: string }).username || 'Chưa cập nhật'}
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
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
}
