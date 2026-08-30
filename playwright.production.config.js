import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/smoke",
    fullyParallel: false,
    forbidOnly: true,
    retries: 1,
    workers: 1,
    timeout: 30000,
    reporter: [
        ["list"],
        [
            "html",
            {
                outputFolder: "playwright-report/production",
                open: "never",
            },
        ],
    ],
    use: {
        baseURL: "https://native-places.ru",
        extraHTTPHeaders: {
            "User-Agent": "NativePlacesReadOnlySmokeTest/1.0",
        },
    },
});
