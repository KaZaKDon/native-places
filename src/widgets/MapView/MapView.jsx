import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

import { createMarkerIcon } from "../../shared/map/createMarkerIcon";

import { MapAutoFocus } from "./MapAutoFocus";

export function MapView({
    places = [],
    selectedPlace,
    hoveredPlace,
    onSelectPlace,
    onHoverPlace,
}) {
    const hasSelectedPlace = Boolean(selectedPlace);

    return (
        <MapContainer
            center={[47.2, 40.1]}
            zoom={7}
            scrollWheelZoom
            className="native-map"
        >
            <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapAutoFocus places={places} selectedPlace={selectedPlace} />

            {places.map((place) => {
                const isActive = selectedPlace?.id === place.id;
                const isHovered = hoveredPlace?.id === place.id;
                const isDimmed = hasSelectedPlace && !isActive;

                return (
                    <Marker
                        key={place.id}
                        position={place.position}
                        icon={createMarkerIcon({
                            categorySlug: place.categorySlug,
                            isActive,
                            isHovered,
                            isDimmed,
                        })}
                        zIndexOffset={isActive ? 1000 : isHovered ? 700 : 0}
                        eventHandlers={{
                            click: () => onSelectPlace(place),
                            mouseover: () => onHoverPlace?.(place),
                            mouseout: () => onHoverPlace?.(null),
                        }}
                    >
                        <Tooltip
                            direction="top"
                            offset={[0, -14]}
                            opacity={1}
                            className="map-tooltip"
                        >
                            <span
                                style={{
                                    color: `var(--tooltip-color-${place.categorySlug})`,
                                }}
                            >
                                {place.title}
                            </span>
                        </Tooltip>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}