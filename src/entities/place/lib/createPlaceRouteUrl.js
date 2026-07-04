export function createPlaceRouteUrl(place) {
    if (!place?.position || place.position.length !== 2) {
        return null;
    }

    const [lat, lng] = place.position;

    return `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
}