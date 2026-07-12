import { useCallback, useEffect, useMemo, useState } from "react";

import { authApi } from "../api/authApi";
import { AuthContext } from "./context";

function isEmailVerified(user) {
    return Boolean(user?.email_verified_at);
}

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

                if (data?.authenticated && isEmailVerified(data.user)) {
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

        if (data?.authenticated && isEmailVerified(data.user)) {
            setUser(data.user);
        } else {
            setUser(null);
        }

        return data;
    }, []);

    const register = useCallback(async ({
        firstName,
        email,
        password,
        acceptedTerms,
        acceptedPersonalData,
        acceptedMarketing,
    }) => {
        return authApi.register({
            firstName,
            email,
            password,
            acceptedTerms,
            acceptedPersonalData,
            acceptedMarketing,
        });
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