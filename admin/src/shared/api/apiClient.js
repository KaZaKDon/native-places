const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function buildUrl(path) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return `${API_BASE_URL}${path}`;
}

async function parseResponse(response, url) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        console.error("API вернул не JSON:", {
            url,
            status: response.status,
            text,
        });

        throw new Error(`API вернул не JSON: ${url}`);
    }
}

async function request(path, options = {}) {
    const url = buildUrl(path);

    const headers = {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
    };

    const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers,
    });

    const data = await parseResponse(response, url);

    if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Ошибка запроса к API");
    }

    return data?.data ?? data;
}

export const apiClient = {
    get(path) {
        return request(path);
    },

    post(path, body = {}) {
        return request(path, {
            method: "POST",
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },
};
