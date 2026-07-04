import { lazy } from "react";

function lazyNamedPage(importer, exportName) {
    return lazy(() =>
        importer().then((module) => ({
            default: module[exportName],
        }))
    );
}

export const AccountPage = lazyNamedPage(
    () => import("../pages/AccountPage"),
    "AccountPage"
);
export const AuthPage = lazyNamedPage(
    () => import("../pages/AuthPage"),
    "AuthPage"
);
export const CategoriesPage = lazyNamedPage(
    () => import("../pages/CategoriesPage"),
    "CategoriesPage"
);
export const CategoryPage = lazyNamedPage(
    () => import("../pages/CategoryPage"),
    "CategoryPage"
);
export const HomePage = lazyNamedPage(
    () => import("../pages/HomePage"),
    "HomePage"
);
export const MapPage = lazyNamedPage(
    () => import("../pages/MapPage"),
    "MapPage"
);
export const PlacePage = lazyNamedPage(
    () => import("../pages/PlacePage"),
    "PlacePage"
);
export const RoutePage = lazyNamedPage(
    () => import("../pages/RoutePage"),
    "RoutePage"
);
export const SharedRoutePage = lazyNamedPage(
    () => import("../pages/SharedRoutePage"),
    "SharedRoutePage"
);
export const SubmitLocationPage = lazyNamedPage(
    () => import("../pages/SubmitLocationPage"),
    "SubmitLocationPage"
);
export const SubmitPage = lazyNamedPage(
    () => import("../pages/SubmitPage"),
    "SubmitPage"
);
export const NotFoundPage = lazyNamedPage(
    () => import("../pages/NotFound/NotFoundPage"),
    "NotFoundPage"
);
