import test from "node:test";
import assert from "node:assert/strict";

import { ApiError, apiClient } from "./apiClient.js";

globalThis.window = {
    location: { origin: "https://example.test" },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
};

test("apiClient.get returns response data and appends query params", async () => {
    let requestedUrl = "";

    globalThis.fetch = async (url) => {
        requestedUrl = url;

        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                success: true,
                data: { places: [{ id: 1 }] },
            }),
        };
    };

    const result = await apiClient.get("/places/map.php", {
        locality: "shahty",
        empty: "",
    });

    assert.deepEqual(result, { places: [{ id: 1 }] });
    assert.equal(requestedUrl, "https://example.test/api/places/map.php?locality=shahty");
});

test("apiClient.get throws ApiError when backend returns success false", async () => {
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
            success: false,
            message: "Ошибка API",
        }),
    });

    await assert.rejects(
        () => apiClient.get("/broken.php"),
        (error) => error instanceof ApiError && error.message === "Ошибка API"
    );
});

test("apiClient.get throws ApiError for invalid JSON", async () => {
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => "not json",
    });

    await assert.rejects(
        () => apiClient.get("/broken-json.php"),
        (error) => error instanceof ApiError && error.message === "Сервер вернул некорректный JSON"
    );
});
