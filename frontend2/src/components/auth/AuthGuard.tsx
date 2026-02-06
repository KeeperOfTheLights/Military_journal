'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            await checkAuth();
            setChecked(true);
        };
        initAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (checked && !isLoading && !isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, isLoading, router, pathname, checked]);

    if (isLoading || !checked) {
        // You might want to render a loading spinner here
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Prevent rendering protected content while redirecting
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
