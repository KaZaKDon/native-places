// Web Mercator projection matching standard OSM raster tiles.
const TILE_SIZE = 256;
const MAX_MERCATOR_LAT = 85.05112878;
export const DIRECTORY_TILE_URL = "https://tile.openstreetmap.org";

export function worldPoint([longitude, latitude], zoom) {
    const lat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, latitude));
    const sin = Math.sin((lat * Math.PI) / 180);
    const size = TILE_SIZE * 2 ** zoom;
    return [((longitude + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
}

export function fitGeometry(bounds, viewportWidth, viewportHeight) {
    const width = Math.max(300, viewportWidth);
    const height = Math.max(240, viewportHeight);
    const nw = worldPoint([bounds[0][0], bounds[1][1]], 0);
    const se = worldPoint([bounds[1][0], bounds[0][1]], 0);
    const spanX = Math.abs(se[0] - nw[0]);
    const spanY = Math.abs(se[1] - nw[1]);
    let zoom = 15;
    for (; zoom > 1; zoom -= 1) {
        if (spanX * 2 ** zoom <= width - 90 && spanY * 2 ** zoom <= height - 90) break;
    }
    return { zoom, center: [(nw[0] + se[0]) / 2, (nw[1] + se[1]) / 2] };
}

export function previewLayers(geometry) {
    switch (geometry.type) {
        case "Point": return { lines: [], polygons: [], points: [geometry.coordinates] };
        case "LineString": return { lines: [geometry.coordinates], polygons: [], points: [] };
        case "MultiLineString": return { lines: geometry.coordinates, polygons: [], points: [] };
        case "Polygon": return { lines: [], polygons: [geometry.coordinates], points: [] };
        case "MultiPolygon": return { lines: [], polygons: geometry.coordinates, points: [] };
        default: return { lines: [], polygons: [], points: [] };
    }
}

export function visibleTiles(centerWorld, zoom, width, height) {
    const tileCount = 2 ** zoom;
    const center = centerWorld.map(value => value * 2 ** zoom);
    const left = center[0] - width / 2;
    const top = center[1] - height / 2;
    const result = [];
    const xMin = Math.floor(left / TILE_SIZE);
    const xMax = Math.floor((left + width) / TILE_SIZE);
    const yMin = Math.max(0, Math.floor(top / TILE_SIZE));
    const yMax = Math.min(tileCount - 1, Math.floor((top + height) / TILE_SIZE));
    for (let tileY = yMin; tileY <= yMax; tileY += 1) {
        for (let tileX = xMin; tileX <= xMax; tileX += 1) {
            result.push({
                key: `${zoom}/${tileX}/${tileY}`,
                url: `${DIRECTORY_TILE_URL}/${zoom}/${((tileX % tileCount) + tileCount) % tileCount}/${tileY}.png`,
                x: tileX * TILE_SIZE - left,
                y: tileY * TILE_SIZE - top,
            });
        }
    }
    return result;
}
