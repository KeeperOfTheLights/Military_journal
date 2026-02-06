import { env } from "../../env.mjs";

export const customInstance = async <T>(
    url: string,
    options: RequestInit
): Promise<T> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
    let accessToken = "";

    if (token) {
        try {
            const parsed = JSON.parse(token);
            accessToken = parsed.state?.token || "";
        } catch (e) {
            console.error("Failed to parse auth-storage", e);
        }
    }

    const headers = new Headers(options.headers);
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_API_URL}${url}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
            localStorage.removeItem("auth-storage");
            window.location.href = "/auth/login";
        }
    }

    const body = [204, 205, 304].includes(response.status) ? null : await response.text();
    const data = body ? JSON.parse(body) : {};

    return { data, status: response.status, headers: response.headers } as T;
};

export default customInstance;
