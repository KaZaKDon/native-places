const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL ?? "/api";

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const UPLOAD_REQUEST_TIMEOUT_MS = 120000;

export class ApiError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = "ApiError";
        this.status = options.status ?? 0;
        this.data = options.data ?? null;
        this.extra = options.extra ?? null;
    }
}

function buildUrl(endpoint, params) {
    const normalizedEndpoint = endpoint.startsWith("/") ?
        endpoint :
        `/${endpoint}`;

    const url = new URL(`${API_BASE_URL}${normalizedEndpoint}`, window.location.origin);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") {
                return;
            }

            url.searchParams.set(key, String(value));
        });
    }

    return url.toString();
}

async function parseJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new ApiError("Сервер вернул некорректный JSON", {
            status: response.status,
            data: text,
        });
    }
}

export async function apiRequest(endpoint, options = {}) {
    const {
        method = "GET",
            params,
        body,
        headers,
        isFormData = false,
        timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    } = options;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    let response;

    try {
        response = await fetch(buildUrl(endpoint, params), {
            method,
            credentials: "include",
            signal: controller.signal,
            headers: isFormData ?
                headers :
                {
                    "Content-Type": "application/json",
                    ...headers,
                },
            body: body ?
                isFormData ?
                body :
                JSON.stringify(body) :
                undefined,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new ApiError("Сервер не ответил вовремя. Попробуйте обновить страницу.", {
                status: 0,
            });
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }

    const result = await parseJsonResponse(response);

    if (!response.ok || result?.success === false) {
        throw new ApiError(result?.message || "Ошибка запроса к серверу", {
            status: response.status,
            data: result,
            extra: result?.extra ?? null,
        });
    }

    return result?.data ?? result;
}

export const apiClient = {
    get(endpoint, params, options = {}) {
        return apiRequest(endpoint, {
            method: "GET",
            params,
            ...options,
        });
    },

    post(endpoint, body, options = {}) {
        return apiRequest(endpoint, {
            method: "POST",
            body,
            ...options,
        });
    },

    postForm(endpoint, formData) {
        return apiRequest(endpoint, {
            method: "POST",
            body: formData,
            isFormData: true,
            timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
        });
    },
};