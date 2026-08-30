import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { RequireAuth } from "../shared/auth/RequireAuth";
import {
    AccountPage,
    AuthPage,
    CategoriesPage,
    CategoryPage,
    HomePage,
    LegalPage,
    MapPage,
    NotFoundPage,
    PlacePage,
    RoutePage,
    SharedRoutePage,
    SubmitLocationPage,
    SubmitPage,
    VerifyEmailPage,
} from "./lazyRoutePages";

function withPageLoader(element) {
    return (
        <Suspense
            fallback={
                <main className="page-loader" aria-live="polite">
                    <p>Загружаем раздел...</p>
                </main>
            }
        >
            {element}
        </Suspense>
    );
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: withPageLoader(<HomePage />),
            },
            {
                path: "auth",
                element: withPageLoader(<AuthPage />),
            },

            {
                path: "verify-email",
                element: withPageLoader(<VerifyEmailPage />),
            },
            {
                path: "legal/:documentSlug",
                element: withPageLoader(<LegalPage />),
            },
            {
                path: "rules",
                element: <Navigate to="/legal/content-rules" replace />,
            },
            {
                path: "privacy-policy",
                element: <Navigate to="/legal/privacy" replace />,
            },
            {
                path: "user-agreement",
                element: <Navigate to="/legal/user-agreement" replace />,
            },
            {
                path: "categories",
                element: withPageLoader(<CategoriesPage />),
            },
            {
                path: "category/:slug",
                element: withPageLoader(<CategoryPage />),
            },
            {
                path: "map",
                element: withPageLoader(<MapPage />),
            },
            {
                path: "place/:slug",
                element: withPageLoader(<PlacePage />),
            },
            {
                path: "submit",
                element: (
                    <RequireAuth>
                        {withPageLoader(<SubmitPage />)}
                    </RequireAuth>
                ),
            },
            {
                path: "submit/location",
                element: (
                    <RequireAuth>
                        {withPageLoader(<SubmitLocationPage />)}
                    </RequireAuth>
                ),
            },
            {
                path: "account",
                element: (
                    <RequireAuth>
                        {withPageLoader(<AccountPage />)}
                    </RequireAuth>
                ),
            },
            {
                path: "routes/:id",
                element: (
                    <RequireAuth>
                        {withPageLoader(<RoutePage />)}
                    </RequireAuth>
                ),
            },
            {
                path: "routes/share/:token",
                element: withPageLoader(<SharedRoutePage />),
            },
            {
                path: "*",
                element: withPageLoader(<NotFoundPage />),
            },
        ],
    },
]);
