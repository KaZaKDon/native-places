import { Route, Routes } from "react-router-dom";

import { RequireAuth } from "../components/RequireAuth/RequireAuth.jsx";
import { RequireRole } from "../components/RequireRole/RequireRole.jsx";
import { AdminLayout } from "../layouts/AdminLayout.jsx";

import { DashboardPage } from "../pages/Dashboard/DashboardPage.jsx";
import { LoginPage } from "../pages/Login/LoginPage.jsx";

import { PlacesPage } from "../pages/Places/PlacesPage.jsx";
import { PlacePage } from "../pages/Place/PlacePage.jsx";

import { UsersPage } from "../pages/Users/UsersPage.jsx";
import { UserPage } from "../pages/User/UserPage.jsx";

import { ReportsPage } from "../pages/Reports/ReportsPage.jsx";
import { ReportPage } from "../pages/Report/ReportPage.jsx";

import { ReviewsPage } from "../pages/Reviews/ReviewsPage.jsx";
import { ReviewPage } from "../pages/Review/ReviewPage.jsx";

import { CategoriesPage } from "../pages/Categories/CategoriesPage.jsx";
import { PlaceTypesPage } from "../pages/PlaceTypes/PlaceTypesPage.jsx";
import { AttributesPage } from "../pages/Attributes/AttributesPage.jsx";
import { DictionariesPage } from "../pages/Dictionaries/DictionariesPage.jsx";
import { PlansPage } from "../pages/Plans/PlansPage.jsx";

import { PaymentsPage } from "../pages/Payments/PaymentsPage.jsx";
import { PaymentPage } from "../pages/Payment/PaymentPage.jsx";

import { MailingsPage } from "../pages/Mailings/MailingsPage.jsx";
import { StatisticsPage } from "../pages/Statistics/StatisticsPage.jsx";
import { ModeratorLogsPage } from "../pages/ModeratorLogs/ModeratorLogsPage.jsx";
import { SettingsPage } from "../pages/Settings/SettingsPage.jsx";
import { NotFoundPage } from "../pages/NotFound/NotFoundPage.jsx";

import { AppealsPage } from "../pages/Appeals/AppealsPage.jsx";
import { AppealPage } from "../pages/Appeal/AppealPage.jsx";

const ADMIN_ROLES = ["admin"];
const MODERATION_ROLES = ["admin", "moderator"];

const placeRoutes = [
    { path: "places", element: <PlacesPage />, roles: MODERATION_ROLES },
    { path: "places/view/:placeId", element: <PlacePage />, roles: MODERATION_ROLES },
    { path: "places/:status", element: <PlacesPage />, roles: MODERATION_ROLES },
];

const userRoutes = [
    { path: "users", element: <UsersPage />, roles: MODERATION_ROLES },
    { path: "users/view/:userId", element: <UserPage />, roles: MODERATION_ROLES },
    { path: "users/:status", element: <UsersPage />, roles: MODERATION_ROLES },
];

const reportRoutes = [
    { path: "reports", element: <ReportsPage />, roles: MODERATION_ROLES },
    { path: "reports/view/:reportId", element: <ReportPage />, roles: MODERATION_ROLES },
    { path: "reports/:status", element: <ReportsPage />, roles: MODERATION_ROLES },
];

const appealRoutes = [
    {
        path: "appeals",
        element: <AppealsPage />,
        roles: MODERATION_ROLES,
    },
    {
        path: "appeals/view/:appealId",
        element: <AppealPage />,
        roles: MODERATION_ROLES,
    },
    {
        path: "appeals/:status",
        element: <AppealsPage />,
        roles: MODERATION_ROLES,
    },
];

const reviewRoutes = [
    { path: "reviews", element: <ReviewsPage />, roles: MODERATION_ROLES },
    { path: "reviews/view/:reviewId", element: <ReviewPage />, roles: MODERATION_ROLES },
    { path: "reviews/:status", element: <ReviewsPage />, roles: MODERATION_ROLES },
];

const contentRoutes = [
    { path: "categories", element: <CategoriesPage />, roles: ADMIN_ROLES },
    { path: "place-types", element: <PlaceTypesPage />, roles: ADMIN_ROLES },
    { path: "attributes", element: <AttributesPage />, roles: MODERATION_ROLES },
    { path: "dictionaries", element: <DictionariesPage />, roles: MODERATION_ROLES },
    { path: "plans", element: <PlansPage />, roles: ADMIN_ROLES },
];

const paymentRoutes = [
    { path: "payments", element: <PaymentsPage />, roles: ADMIN_ROLES },
    { path: "payments/view/:paymentId", element: <PaymentPage />, roles: ADMIN_ROLES },
    { path: "payments/:status", element: <PaymentsPage />, roles: ADMIN_ROLES },
];

const serviceRoutes = [
    { path: "mailings", element: <MailingsPage />, roles: ADMIN_ROLES },
    { path: "statistics", element: <StatisticsPage />, roles: MODERATION_ROLES },
    { path: "moderator-logs", element: <ModeratorLogsPage />, roles: ADMIN_ROLES },
    { path: "settings", element: <SettingsPage />, roles: ADMIN_ROLES },
];

const adminRoutes = [
    ...placeRoutes,
    ...userRoutes,
    ...reportRoutes,
    ...appealRoutes,
    ...reviewRoutes,
    ...contentRoutes,
    ...paymentRoutes,
    ...serviceRoutes,
];

function renderProtectedRoute(route) {
    return (
        <Route
            key={route.path}
            path={route.path}
            element={
                <RequireRole roles={route.roles}>
                    {route.element}
                </RequireRole>
            }
        />
    );
}

export function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
                element={
                    <RequireAuth>
                        <AdminLayout />
                    </RequireAuth>
                }
            >
                <Route index element={<DashboardPage />} />

                {adminRoutes.map(renderProtectedRoute)}
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}