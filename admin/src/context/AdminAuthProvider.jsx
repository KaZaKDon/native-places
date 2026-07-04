import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { adminAuthApi } from "../shared/api/adminAuthApi";
import { AdminAuthContext } from "./adminAuthContext";

export function AdminAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadCurrentUser = useCallback(async () => {
        try {
            const data = await adminAuthApi.me();

            if (data.authenticated) {
                setUser(data.user);
                return;
            }

            setUser(null);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isActive = true;

        async function initAuth() {
            try {
                const data = await adminAuthApi.me();

                if (!isActive) {
                    return;
                }

                setUser(data.authenticated ? data.user : null);
            } catch {
                if (!isActive) {
                    return;
                }

                setUser(null);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        initAuth();

        return () => {
            isActive = false;
        };
    }, []);

    async function loginAdmin(email, password) {
        const data = await adminAuthApi.loginAdmin(
            email,
            password
        );

        setUser(data.user);

        return data;
    }

    async function loginCode(code) {
        const data = await adminAuthApi.loginCode(code);

        setUser(data.user);

        return data;
    }

    async function logout() {
        await adminAuthApi.logout();

        setUser(null);
    }

    const value = useMemo(() => ({
        user,
        role: user?.role_code ?? null,
        isAuthenticated: Boolean(user),
        isLoading,
        loginAdmin,
        loginCode,
        logout,
        reload: loadCurrentUser,
    }), [
        user,
        isLoading,
        loadCurrentUser,
    ]);

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
}