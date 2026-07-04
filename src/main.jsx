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

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <HelmetProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </HelmetProvider>
    </React.StrictMode>
);