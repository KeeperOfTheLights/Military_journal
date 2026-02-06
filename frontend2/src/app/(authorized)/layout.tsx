'use client';

import AuthGuard from "@/components/auth/AuthGuard";

export default function AuthorizedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            {children}
        </AuthGuard>
    );
}
