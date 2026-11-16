// Shared draft geometry rules. Keep in sync with the PHP directory endpoint.
// No geometries, place names or invented map coordinates are hard-coded here.
export const GEOJSON_MAX_BYTES = 250_000;
export const GEOJSON_MAX_POINTS = 20_000;

const GEOMETRY_BY_TYPE = {
    river: ["LineString", "MultiLineString"],
    lake: ["Polygon", "MultiPolygon"],
    forest: ["Polygon", "MultiPolygon"],
    natural_area: ["Polygon", "MultiPolygon"],
    hunting_ground: ["Polygon", "MultiPolygon"],
    landmark: ["Point"],
    spring: ["Point"],
};

const byteSize = (value) => new TextEncoder().encode(value).byteLength;
const isPair = (value) => Array.isArray(value) && value.length === 2
    && value.every((number) => typeof number === "number" && Number.isFinite(number));

function unwrapFeatures(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new Error("Ожидается объект GeoJSON.");
    }
    if (source.type === "FeatureCollection") {
        if (!Array.isArray(source.features) || source.features.length < 1 || source.features.length > 500) {
            throw new Error("В FeatureCollection должно быть от 1 до 500 объектов.");
        }
        return source.features.map((feature) => {
            if (feature?.type !== "Feature" || !feature.geometry) throw new Error("Feature без геометрии не поддерживается.");
            return feature.geometry;
        });
    }
    if (source.type === "Feature") {
        if (!source.geometry) throw new Error("У Feature отсутствует геометрия.");
        return [source.geometry];
    }
    return [source];
}

function combineGeometries(geometries, objectType) {
    const allowed = GEOMETRY_BY_TYPE[objectType];
    if (!allowed) throw new Error("Сначала выберите тип справочного объекта.");
    for (const geometry of geometries) {
        if (!geometry || !allowed.includes(geometry.type) || !Array.isArray(geometry.coordinates)) {
            throw new Error(`Для этого объекта допустимы только: ${allowed.join(", ")}.`);
        }
    }
    if (geometries.length === 1) {
        return { type: geometries[0].type, coordinates: geometries[0].coordinates };
    }
    if (allowed.includes("MultiLineString")) {
        return {
            type: "MultiLineString",
            coordinates: geometries.flatMap((geometry) => geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates),
        };
    }
    if (allowed.includes("MultiPolygon")) {
        return {
            type: "MultiPolygon",
            coordinates: geometries.flatMap((geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates),
        };
    }
    throw new Error("Для точечного объекта GeoJSON должен содержать одну точку.");
}

function inspectGeometry(geometry) {
    const points = [];
    const addPoint = (pair) => {
        if (!isPair(pair) || Math.abs(pair[0]) > 180 || Math.abs(pair[1]) > 90) {
            throw new Error("Координаты должны быть [долгота, широта] в WGS84, без высоты.");
        }
        points.push(pair);
        if (points.length > GEOJSON_MAX_POINTS) throw new Error("Превышен лимит 20 000 координат. Разделите реку на участки.");
    };
    const line = (value) => {
        if (!Array.isArray(value) || value.length < 2) throw new Error("В каждом участке реки нужно не меньше двух точек.");
        value.forEach(addPoint);
    };
    const polygon = (rings) => {
        if (!Array.isArray(rings) || rings.length < 1) throw new Error("Полигон должен содержать контур.");
        rings.forEach((ring) => {
            if (!Array.isArray(ring) || ring.length < 4) throw new Error("Контур полигона должен содержать минимум четыре точки.");
            ring.forEach(addPoint);
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                throw new Error("Контур полигона должен быть замкнут: первая и последняя точки совпадают.");
            }
        });
    };
    let partCount = 1;
    switch (geometry.type) {
        case "Point":
            addPoint(geometry.coordinates);
            break;
        case "LineString":
            line(geometry.coordinates);
            break;
        case "MultiLineString":
            if (geometry.coordinates.length < 1) throw new Error("В MultiLineString нет участков.");
            partCount = geometry.coordinates.length;
            geometry.coordinates.forEach(line);
            break;
        case "Polygon":
            polygon(geometry.coordinates);
            break;
        case "MultiPolygon":
            if (geometry.coordinates.length < 1) throw new Error("В MultiPolygon нет областей.");
            partCount = geometry.coordinates.length;
            geometry.coordinates.forEach(polygon);
            break;
        default:
            throw new Error("Неподдерживаемый тип геометрии.");
    }
    const longitude = points.map(([lon]) => lon);
    const latitude = points.map(([, lat]) => lat);
    return {
        pointCount: points.length,
        partCount,
        bounds: [[Math.min(...longitude), Math.min(...latitude)], [Math.max(...longitude), Math.max(...latitude)]],
    };
}

export function parseDirectoryGeoJSON(source, objectType) {
    if (typeof source === "string" && byteSize(source) > GEOJSON_MAX_BYTES) {
        throw new Error("GeoJSON больше 250 КБ. Выберите меньший участок.");
    }
    let parsed;
    try {
        parsed = typeof source === "string" ? JSON.parse(source) : source;
    } catch {
        throw new Error("Файл не является корректным JSON.");
    }
    const geometry = combineGeometries(unwrapFeatures(parsed), objectType);
    const stats = inspectGeometry(geometry);
    const geojson = JSON.stringify(geometry);
    if (byteSize(geojson) > GEOJSON_MAX_BYTES) {
        throw new Error("Геометрия после обработки больше 250 КБ. Разделите объект на участки.");
    }
    return { geometry, geojson, ...stats };
}
