import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { RequireAuth } from "../shared/auth/RequireAuth";
import {
    AccountPage,
    AuthPage,
    CategoriesPage,
    CategoryPage,
    HomePage,
    MapPage,
    NotFoundPage,
    PlacePage,
    RoutePage,
    SharedRoutePage,
    SubmitLocationPage,
    SubmitPage,
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