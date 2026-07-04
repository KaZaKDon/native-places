import { useCallback, useEffect, useMemo, useState } from "react";

import { authApi } from "../api/authApi";
import { AuthContext } from "./context";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function loadUser() {
            try {
                const data = await authApi.me();

                if (!isMounted) {
                    return;
                }

                if (data?.authenticated) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Auth check failed:", error);

                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setAuthChecked(true);
                    setAuthLoading(false);
                }
            }
        }

        loadUser();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = useCallback(async ({ email, password }) => {
        const data = await authApi.login({
            email,
            password,
        });

        if (data?.authenticated) {
            setUser(data.user);
        }

        return data;
    }, []);

    const register = useCallback(async ({ firstName, email, password }) => {
        const registerData = await authApi.register({
            firstName,
            email,
            password,
        });

        const loginData = await authApi.login({
            email,
            password,
        });

        if (loginData?.authenticated) {
            setUser(loginData.user);
        }

        return {
            registerData,
            loginData,
        };
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            setUser(null);
        }
    }, []);

    const updateUser = useCallback((nextUserData) => {
        setUser((currentUser) => ({
            ...currentUser,
            ...nextUserData,
        }));
    }, []);

    const value = useMemo(
        () => ({
            user,
            isAuth: Boolean(user),
            authChecked,
            authLoading,
            login,
            register,
            logout,
            updateUser,
        }),
        [user, authChecked, authLoading, login, register, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}