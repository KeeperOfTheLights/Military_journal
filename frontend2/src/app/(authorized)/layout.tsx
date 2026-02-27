import AuthGuard from "@/components/auth/AuthGuard";
import TokenExpirationWarning from "@/components/TokenExpirationWarning";

export default function AuthorizedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            {children}
            <TokenExpirationWarning />
        </AuthGuard>
    );
}
