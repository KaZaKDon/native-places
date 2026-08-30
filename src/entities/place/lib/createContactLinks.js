export function createPhoneHref(value) {
    const normalizedValue = String(value ?? "").trim();
    const digits = normalizedValue.replace(/\D/g, "");

    if (digits.length < 5) {
        return "";
    }

    return `tel:${normalizedValue.startsWith("+") ? "+" : ""}${digits}`;
}

export function createEmailHref(value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue.includes("@") || /[\r\n]/.test(normalizedValue)) {
        return "";
    }

    return `mailto:${normalizedValue}`;
}

export function createTelegramHref(value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
        return "";
    }

    if (/^https?:\/\//i.test(normalizedValue)) {
        try {
            const url = new URL(normalizedValue);
            const allowedHosts = ["t.me", "www.t.me", "telegram.me", "www.telegram.me"];

            return allowedHosts.includes(url.hostname.toLowerCase())
                ? url.toString()
                : "";
        } catch {
            return "";
        }
    }

    const username = normalizedValue.replace(/^@/, "");

    return /^[a-zA-Z0-9_]{5,32}$/.test(username)
        ? `https://t.me/${username}`
        : "";
}

export function createWebsiteHref(value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
        return "";
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(normalizedValue)
                ? normalizedValue
                : `https://${normalizedValue}`
        );

        return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
        return "";
    }
}
