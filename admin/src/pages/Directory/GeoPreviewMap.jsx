import { useEffect, useMemo, useRef, useState } from "react";
import { fitGeometry, previewLayers, visibleTiles, worldPoint } from "./mapProjection.js";
import "./GeoPreviewMap.css";

function pathForLine(line, project, close = false) {
    const points = line.map((pair) => {
        const [x, y] = project(pair);
        return `${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return `M ${points.join(" L ")}${close ? " Z" : ""}`;
}

export function GeoPreviewMap({ geometry, bounds }) {
    const viewRef = useRef(null);
    const [viewport, setViewport] = useState({ width: 700, height: 390 });
    const [zoomChange, setZoomChange] = useState(0);

    useEffect(() => {
        const element = viewRef.current;
        if (!element) return undefined;
        const update = () => setViewport({ width: Math.round(element.clientWidth) || 700, height: Math.round(element.clientHeight) || 390 });
        update();
        if (typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const drawing = useMemo(() => {
        const { center, zoom: fitZoom } = fitGeometry(bounds, viewport.width, viewport.height);
        const zoom = Math.max(1, Math.min(17, fitZoom + zoomChange));
        const [centerX, centerY] = center.map(value => value * 2 ** zoom);
        const project = (pair) => {
            const [x, y] = worldPoint(pair, zoom);
            return [x - centerX + viewport.width / 2, y - centerY + viewport.height / 2];
        };
        const { lines, polygons, points } = previewLayers(geometry);
        return {
            zoom,
            tiles: visibleTiles(center, zoom, viewport.width, viewport.height),
            linePaths: lines.map(line => pathForLine(line, project)),
            polygonPaths: polygons.map(rings => rings.map(ring => pathForLine(ring, project, true)).join(" ")),
            circles: points.map(project),
        };
    }, [geometry, bounds, viewport, zoomChange]);

    return (
        <section className="directory-map" aria-label="Предварительный просмотр геометрии на карте OpenStreetMap">
            <div className="directory-map__canvas" ref={viewRef}>
                {drawing.tiles.map((tile) => (
                    <img key={tile.key} src={tile.url} alt="" loading="lazy" draggable={false}
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="directory-map__tile" style={{ left: tile.x, top: tile.y }} />
                ))}
                <svg className="directory-map__geometry" viewBox={`0 0 ${viewport.width} ${viewport.height}`} role="img" aria-label="Геометрия справочного объекта">
                    {drawing.polygonPaths.map((path, index) => <path key={`p${index}`} d={path} className="directory-map__polygon" fillRule="evenodd" />)}
                    {drawing.linePaths.map((path, index) => <path key={`l${index}`} d={path} className="directory-map__line" />)}
                    {drawing.circles.map(([cx, cy], index) => <circle key={`c${index}`} cx={cx} cy={cy} r="7" className="directory-map__point" />)}
                </svg>
                <div className="directory-map__controls" aria-label="Масштаб карты">
                    <button type="button" onClick={() => setZoomChange(value => Math.min(17, value + 1))} disabled={drawing.zoom >= 17} aria-label="Приблизить">+</button>
                    <button type="button" onClick={() => setZoomChange(value => Math.max(-16, value - 1))} disabled={drawing.zoom <= 1} aria-label="Отдалить">−</button>
                    <button type="button" onClick={() => setZoomChange(0)} title="Показать геометрию целиком" aria-label="Показать целиком">⌖</button>
                </div>
                <div className="directory-map__attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></div>
            </div>
            <p className="directory-map__note">Точная геометрия из файла выделена на карте. Это только предварительный просмотр черновика, не публикация.</p>
        </section>
    );
}
