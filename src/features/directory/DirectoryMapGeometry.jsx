import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { directoryEntryPath, DIRECTORY_TYPES } from "./directoryConfig";
import "./DirectoryMapGeometry.css";

function featureStyle(type) {
    const root = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
    const palette = {
        water: root?.getPropertyValue("--directory-river").trim() || "#258ad0",
        nature: root?.getPropertyValue("--directory-nature").trim() || "#619c70",
        hunting: root?.getPropertyValue("--directory-hunting").trim() || "#b68e4e",
        protected: root?.getPropertyValue("--directory-protected").trim() || "#8b5cf6",
    };
    if (type === "river") return { color: palette.water, weight: 5, opacity: 0.95 };
    if (type === "lake") return { color: palette.water, weight: 3, fillColor: palette.water, fillOpacity: 0.22 };
    if (type === "hunting_ground") return { color: palette.hunting, weight: 3, fillColor: palette.hunting, fillOpacity: 0.18 };
    if (type === "protected_area") return { color: palette.protected, weight: 3, fillColor: palette.protected, fillOpacity: 0.14 };
    return { color: palette.nature, weight: 3, fillColor: palette.nature, fillOpacity: 0.2 };
}

export function DirectoryMapShapes({ entries = [] }) {
    return entries.map((entry) => {
        if (!entry.geometry?.type || !entry.geometry.coordinates) return null;
        const style = featureStyle(entry.type);
        return (
            <GeoJSON
                key={`${entry.id}-${entry.updated_at || entry.published_at || ""}`}
                data={entry.geometry}
                style={style}
                pointToLayer={(_, latlng) => L.circleMarker(latlng, {
                    radius: 8, color: style.color, weight: 3, fillColor: style.color, fillOpacity: 0.8,
                })}
            >
                <Popup>
                    <strong>{entry.title}</strong>
                    <p>{DIRECTORY_TYPES[entry.type]?.label || "Природный объект"}</p>
                    <Link to={directoryEntryPath(entry)}>Открыть справочник</Link>
                </Popup>
            </GeoJSON>
        );
    });
}

function ZoomToDirectoryEntry({ geometry }) {
    const map = useMap();
    useEffect(() => {
        if (!geometry) return;
        try {
            const bounds = L.geoJSON(geometry).getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13, animate: false });
        } catch {
            // An invalid geometry must not break the whole page.
        }
    }, [geometry, map]);
    return null;
}

export function DirectoryDetailMap({ entry }) {
    const geometry = useMemo(() => entry?.geometry || null, [entry]);
    if (!geometry) return null;
    return (
        <div className="directory-detail-map" role="region" aria-label={`Карта объекта ${entry.title}`}>
            <MapContainer center={[47.2, 40.1]} zoom={6} className="directory-detail-map__canvas" scrollWheelZoom={false}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                />
                <DirectoryMapShapes entries={[entry]} />
                <ZoomToDirectoryEntry geometry={geometry} />
            </MapContainer>
        </div>
    );
}
