const SUBMIT_DRAFT_KEY = "nativeplaces-submit-draft";

export function getSubmitDraft() {
    try {
        const rawValue = localStorage.getItem(SUBMIT_DRAFT_KEY);

        if (!rawValue) {
            return null;
        }

        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

export function saveSubmitDraft(draft) {
    localStorage.setItem(SUBMIT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearSubmitDraft() {
    localStorage.removeItem(SUBMIT_DRAFT_KEY);
}