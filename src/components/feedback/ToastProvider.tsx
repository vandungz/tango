'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styles from './ToastProvider.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
}

interface ToastOptions {
    duration?: number;
}

interface ToastApi {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    dismiss: (id: number) => void;
}

const DEFAULT_DURATION = 3200;
const ERROR_DURATION = 7000;

const ToastContext = createContext<ToastApi | null>(null);

function toastClassName(type: ToastType): string {
    if (type === 'error') return `${styles.toast} ${styles.toastError}`;
    if (type === 'success') return `${styles.toast} ${styles.toastSuccess}`;
    return `${styles.toast} ${styles.toastInfo}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextIdRef = useRef(1);
    const timeoutRef = useRef<Map<number, number>>(new Map());

    const dismiss = useCallback((id: number) => {
        const timeoutId = timeoutRef.current.get(id);
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutRef.current.delete(id);
        }

        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const createToast = useCallback(
        (type: ToastType, message: string, options?: ToastOptions) => {
            const id = nextIdRef.current;
            nextIdRef.current += 1;

            setToasts((prev) => [{ id, type, message }, ...prev]);

            const timeoutDuration = options?.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);
            const timeoutId = window.setTimeout(() => dismiss(id), timeoutDuration);
            timeoutRef.current.set(id, timeoutId);
        },
        [dismiss],
    );

    const api = useMemo<ToastApi>(
        () => ({
            success: (message: string, options?: ToastOptions) => createToast('success', message, options),
            error: (message: string, options?: ToastOptions) => createToast('error', message, options),
            info: (message: string, options?: ToastOptions) => createToast('info', message, options),
            dismiss,
        }),
        [createToast, dismiss],
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className={styles.toastViewport} role="region" aria-label="Notifications">
                {toasts.map((toast) => (
                    <div key={toast.id} className={toastClassName(toast.type)} role={toast.type === 'error' ? 'alert' : 'status'}>
                        <span className={styles.message}>{toast.message}</span>
                        {toast.type === 'error' && (
                            <button
                                type="button"
                                className={styles.closeButton}
                                aria-label="Close notification"
                                onClick={() => dismiss(toast.id)}
                            >
                                x
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastApi {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used inside ToastProvider');
    }

    return context;
}