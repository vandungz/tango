'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/contexts/theme';
import GlobalQuickSettings from '@/components/layout/GlobalQuickSettings';
import { ToastProvider } from '@/components/feedback/ToastProvider';

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ToastProvider>
                    {children}
                    <GlobalQuickSettings />
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
