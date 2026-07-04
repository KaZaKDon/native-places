const SUBMIT_LOCATION_KEY = "nativeplaces-submit-location";

export function getSubmitLocation() {
    try {
        const rawValue = localStorage.getItem(SUBMIT_LOCATION_KEY);

        if (!rawValue) {
            return null;
        }

        const location = JSON.parse(rawValue);

        if (
            typeof location?.lat !== "number" ||
            typeof location?.lng !== "number"
        ) {
            return null;
        }

        return location;
    } catch {
        return null;
    }
}

export function saveSubmitLocation(location) {
    localStorage.setItem(SUBMIT_LOCATION_KEY, JSON.stringify(location));
}

export function clearSubmitLocation() {
    localStorage.removeItem(SUBMIT_LOCATION_KEY);
}