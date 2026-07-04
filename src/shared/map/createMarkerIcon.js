import L from "leaflet";

import { categoryColors } from "./categoryColors";

const MARKER_SIZE = 16;
const MARKER_ACTIVE_SIZE = 20;

export function createMarkerIcon({
    categorySlug,
    isActive = false,
    isHovered = false,
    isDimmed = false,
}) {
    const category = categoryColors[categorySlug];
    const size = isActive || isHovered ? MARKER_ACTIVE_SIZE : MARKER_SIZE;
    const anchor = size / 2;

    return L.divIcon({
        className: [
            "map-marker",
            isActive ? "is-active" : "",
            isHovered ? "is-hovered" : "",
            isDimmed ? "is-dimmed" : "",
        ]
            .filter(Boolean)
            .join(" "),
        html: `
            <span
                style="
                    --marker-color: ${category?.color};
                    --marker-glow: ${category?.glow};
                    --marker-ring: ${category?.ring};
                "
            ></span>
        `,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
    });
}