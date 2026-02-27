import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginApiAuthLoginPost, registerApiAuthRegisterPost, getCurrentUserInfoApiAuthMeGet } from '@/api/orval/client/authentication/authentication';
import { UserRead, UserLogin, UserCreate } from '@/api/orval/client/model';
import { z } from 'zod';

const userSchema = z.object({
    id: z.number(),
    email: z.string(),
    role: z.string(),
    // ... add more fields if needed
}).passthrough();

const authStateSchema = z.object({
    user: userSchema.nullable(),
    token: z.string().nullable(),
    isAuthenticated: z.boolean(),
});

interface AuthState {
    user: UserRead | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: UserLogin) => Promise<void>;
    register: (data: UserCreate) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials: UserLogin) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await loginApiAuthLoginPost(credentials);
                    if (response.status === 200) {
                        const { access_token, user } = response.data as any;
                        set({
                            user,
                            token: access_token,
                            isAuthenticated: true,
                            isLoading: false
                        });
                    } else {
                        const errorData = response.data as any;
                        set({
                            error: errorData?.error?.message || 'Login failed',
                            isLoading: false
                        });
                        throw new Error(errorData?.error?.message || 'Login failed');
                    }
                } catch (error: any) {
                    set({ error: error.message || 'Login failed', isLoading: false });
                    throw error;
                }
            },

            register: async (data: UserCreate) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await registerApiAuthRegisterPost(data);
                    if (response.status === 201) {
                        const { access_token, user } = response.data as any;
                        set({
                            user,
                            token: access_token,
                            isAuthenticated: true,
                            isLoading: false
                        });
                    } else {
                        const errorData = response.data as any;
                        set({
                            error: errorData?.error?.message || 'Registration failed',
                            isLoading: false
                        });
                        throw new Error(errorData?.error?.message || 'Registration failed');
                    }
                } catch (error: any) {
                    set({ error: error.message || 'Registration failed', isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            checkAuth: async () => {
                const { token } = get();
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                set({ isLoading: true });
                try {
                    const response = await getCurrentUserInfoApiAuthMeGet();
                    if (response.status === 200) {
                        set({
                            user: response.data,
                            isAuthenticated: true,
                            isLoading: false
                        });
                    } else {
                        set({
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            isLoading: false
                        });
                    }
                } catch (error) {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    try {
                        authStateSchema.parse({
                            user: state.user,
                            token: state.token,
                            isAuthenticated: state.isAuthenticated,
                        });
                    } catch (e) {
                        console.error('Auth storage validation failed:', e);
                    }
                }
            },
        }
    )
);
