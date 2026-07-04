import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import {
    getSubmitLocation,
    saveSubmitLocation,
} from "../shared/storage/submitLocationStorage";

import "./SubmitLocationPage.css";

const DEFAULT_CENTER = [47.5, 40.2];
const DEFAULT_ZOOM = 7;

function LocationPicker({ selectedLocation, onSelectLocation }) {
    useMapEvents({
        click(event) {
            onSelectLocation({
                lat: Number(event.latlng.lat.toFixed(6)),
                lng: Number(event.latlng.lng.toFixed(6)),
            });
        },
    });

    if (!selectedLocation) {
        return null;
    }

    return (
        <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            draggable
            eventHandlers={{
                dragend(event) {
                    const marker = event.target;
                    const position = marker.getLatLng();

                    onSelectLocation({
                        lat: Number(position.lat.toFixed(6)),
                        lng: Number(position.lng.toFixed(6)),
                    });
                },
            }}
        />
    );
}

export function SubmitLocationPage() {
    const navigate = useNavigate();

    const [selectedLocation, setSelectedLocation] = useState(() => {
        return getSubmitLocation();
    });

    const mapCenter = useMemo(() => {
        if (!selectedLocation) {
            return DEFAULT_CENTER;
        }

        return [selectedLocation.lat, selectedLocation.lng];
    }, [selectedLocation]);

    function handleSaveLocation() {
        if (!selectedLocation) {
            return;
        }

        saveSubmitLocation(selectedLocation);
        navigate("/submit");
    }

    return (
        <main className="submit-location-page">
            <section className="submit-location-layout">
                <aside className="submit-location-panel">
                    <Link className="submit-location-panel__back" to="/submit">
                        ← Назад к форме
                    </Link>

                    <p className="submit-location-panel__eyebrow">
                        Координаты объекта
                    </p>

                    <h1>Укажите место на карте</h1>

                    <p className="submit-location-panel__text">
                        Кликните по карте, чтобы поставить маркер. Маркер можно
                        перетащить мышкой, если нужно уточнить точку.
                    </p>

                    <div className="submit-location-panel__coords">
                        <span>Выбранная точка</span>

                        {selectedLocation ? (
                            <strong>
                                {selectedLocation.lat}, {selectedLocation.lng}
                            </strong>
                        ) : (
                            <strong>Точка пока не выбрана</strong>
                        )}
                    </div>

                    <button
                        className="submit-location-panel__save"
                        type="button"
                        disabled={!selectedLocation}
                        onClick={handleSaveLocation}
                    >
                        Сохранить точку
                    </button>
                </aside>

                <div className="submit-location-map">
                    <MapContainer
                        center={mapCenter}
                        zoom={selectedLocation ? 12 : DEFAULT_ZOOM}
                        scrollWheelZoom
                        className="submit-location-map__canvas"
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <LocationPicker
                            selectedLocation={selectedLocation}
                            onSelectLocation={setSelectedLocation}
                        />
                    </MapContainer>
                </div>
            </section>
        </main>
    );
}