import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/admin",
    fullyParallel: true,
    forbidOnly: true,
    retries: 0,
    workers: 4,
    timeout: 30000,
    reporter: [
        ["list"],
        [
            "html",
            {
                outputFolder: "playwright-report/admin",
                open: "never",
            },
        ],
    ],
    use: {
        baseURL: "http://127.0.0.1:4174",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",
    },
    webServer: {
        command: "npm --prefix admin run preview -- --host 127.0.0.1 --port 4174 --strictPort",
        url: "http://127.0.0.1:4174/admin/",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
