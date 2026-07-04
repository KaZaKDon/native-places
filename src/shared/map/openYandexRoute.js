function getCurrentPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 60000,
            }
        );
    });
}

function createYandexRouteUrl(points) {
    const routePoints = points
        .filter((point) => Array.isArray(point) && point.length === 2)
        .map((point) => `${point[0]},${point[1]}`);

    if (routePoints.length === 0) {
        return "";
    }

    return `https://yandex.ru/maps/?rtext=${routePoints.join("~")}&rtt=auto`;
}

export async function openYandexRouteFromCurrentLocation(places) {
    const placePoints = places
        .filter((place) => Array.isArray(place.position) && place.position.length === 2)
        .map((place) => place.position);

    if (placePoints.length === 0) {
        return;
    }

    const currentPosition = await getCurrentPosition();

    const points = currentPosition
        ? [[currentPosition.lat, currentPosition.lng], ...placePoints]
        : placePoints;

    const url = createYandexRouteUrl(points);

    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}