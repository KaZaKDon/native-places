import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { router } from "./app/router";
import { AuthProvider } from "./shared/auth/AuthProvider";

import "leaflet/dist/leaflet.css";

import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/animations.css";

function removeServerSeoArtifacts() {
    document.head
        .querySelectorAll(
            '[data-rh="true"], script[data-server-seo="true"], #server-seo-snapshot-style'
        )
        .forEach((element) => element.remove());
}

// index.html and the server SEO router provide metadata before JavaScript runs.
// Once React starts, Helmet becomes the only owner of page metadata. Removing
// the server copy prevents duplicate canonical, robots and social tags after
// hydration and during client-side navigation.
removeServerSeoArtifacts();

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <HelmetProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </HelmetProvider>
    </React.StrictMode>
);
