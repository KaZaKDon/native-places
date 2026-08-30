import { Outlet } from "react-router-dom";

import { SiteFooter } from "../widgets/site-footer/SiteFooter";

export function AppLayout() {
    return (
        <div className="app">
            <Outlet />
            <SiteFooter />
        </div>
    );
}
