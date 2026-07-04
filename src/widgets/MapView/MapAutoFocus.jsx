import { useEffect } from "react";
import { useMap } from "react-leaflet";

const DESKTOP_PAN_OFFSET = [180, 0];
const MOBILE_BREAKPOINT = 860;

function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function getValidPositions(places) {
    return places
        .map((place) => place.position)
        .filter((position) => {
            return (
                Array.isArray(position) &&
                position.length === 2 &&
                Number.isFinite(position[0]) &&
                Number.isFinite(position[1])
            );
        });
}

export function MapAutoFocus({ places = [], selectedPlace }) {
    const map = useMap();

    useEffect(() => {
        if (selectedPlace?.position) {
            map.flyTo(selectedPlace.position, 11, {
                duration: 1.4,
            });

            const shiftTimer = window.setTimeout(() => {
                if (!isMobileViewport()) {
                    map.panBy(DESKTOP_PAN_OFFSET, {
                        animate: true,
                        duration: 0.7,
                    });
                }
            }, 850);

            return () => {
                window.clearTimeout(shiftTimer);
            };
        }

        const positions = getValidPositions(places);

        if (positions.length === 0) {
            return undefined;
        }

        if (positions.length === 1) {
            map.flyTo(positions[0], 10, {
                duration: 1.2,
            });

            return undefined;
        }

        const bounds = positions;

        map.flyToBounds(bounds, {
            padding: isMobileViewport() ? [36, 120] : [80, 80],
            maxZoom: 10,
            duration: 1.2,
        });

        return undefined;
    }, [map, places, selectedPlace]);

    return null;
}