import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthProvider";

import { getInitialTheme } from "./utils/theme";
import "./styles/variables.css";
import "./styles/light.css";
import "./styles/dark.css";
import "./styles/global.css";
import { App } from "./app/App.jsx";

document.documentElement.setAttribute("data-theme", getInitialTheme());

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter basename="/admin">
            <AdminAuthProvider>
                <App />
            </AdminAuthProvider>
        </BrowserRouter>
    </StrictMode>
);