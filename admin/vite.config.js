import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: "/admin/",
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "https://native-places.ru",
                changeOrigin: true,
                secure: true,
            },
        },
    },
});
