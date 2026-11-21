import assert from "node:assert/strict";
import test from "node:test";
import { parseDirectoryGeoJSON } from "./geojson.js";

const river = { type: "LineString", coordinates: [[40.0, 48.0], [40.1, 48.1]] }; // Synthetic test-only fixture, not actual Don geometry.
const polygon = { type: "Polygon", coordinates: [[[40, 48], [41, 48], [41, 49], [40, 48]]] };

test("accepts a valid river and returns compact API Geometry", () => {
    const value = parseDirectoryGeoJSON(JSON.stringify({ type: "Feature", properties: { name: "Test" }, geometry: river }), "river");
    assert.deepEqual(value.geometry, river);
    assert.equal(value.pointCount, 2);
    assert.equal(value.partCount, 1);
    assert.equal(value.geojson, JSON.stringify(river));
});

test("combines separate river features into MultiLineString", () => {
    const value = parseDirectoryGeoJSON({ type: "FeatureCollection", features: [river, river].map(geometry => ({ type: "Feature", geometry, properties: {} })) }, "river");
    assert.equal(value.geometry.type, "MultiLineString");
    assert.equal(value.partCount, 2);
    assert.equal(value.pointCount, 4);
});

test("rejects polygon for river and polyline for lake", () => {
    assert.throws(() => parseDirectoryGeoJSON(polygon, "river"), /LineString/);
    assert.throws(() => parseDirectoryGeoJSON(river, "lake"), /Polygon/);
});

test("accepts a closed Polygon and merges polygons", () => {
    const value = parseDirectoryGeoJSON({ type: "FeatureCollection", features: [polygon, polygon].map(geometry => ({ type: "Feature", geometry })) }, "hunting_ground");
    assert.equal(value.geometry.type, "MultiPolygon");
    assert.equal(value.partCount, 2);
});

test("rejects unclosed rings, invalid positions and empty segments", () => {
    assert.throws(() => parseDirectoryGeoJSON({ type: "Polygon", coordinates: [[[40,48],[41,48],[41,49],[40,49]]] }, "lake"), /замкнут/);
    assert.throws(() => parseDirectoryGeoJSON({ type: "Point", coordinates: [200, 48] }, "spring"), /WGS84/);
    assert.throws(() => parseDirectoryGeoJSON({ type: "MultiLineString", coordinates: [[[40,48]]] }, "river"), /двух точек/);
    assert.throws(() => parseDirectoryGeoJSON({ type: "LineString", coordinates: [[40,48,2],[41,49]] }, "river"), /без высоты/);
});

test("rejects unsupported geometry collections and multiple point markers", () => {
    assert.throws(() => parseDirectoryGeoJSON({ type: "GeometryCollection", geometries: [river] }, "river"), /LineString/);
    assert.throws(() => parseDirectoryGeoJSON({ type: "FeatureCollection", features: [{ type: "Feature", geometry: {type:"Point", coordinates:[40,48]} }, { type: "Feature", geometry: {type:"Point", coordinates:[41,49]} }] }, "spring"), /одну точку/);
});

test("enforces JSON byte limit before parsing", () => {
    assert.throws(() => parseDirectoryGeoJSON(" ".repeat(250001), "river"), /250 КБ/);
});
test("protected territories accept only closed polygon boundaries", () => {
    const polygon = { type: "Polygon", coordinates: [[[41, 47], [42, 47], [42, 48], [41, 47]]] };
    assert.equal(parseDirectoryGeoJSON(polygon, "protected_area").geometry.type, "Polygon");
    assert.throws(() => parseDirectoryGeoJSON({ type: "Point", coordinates: [41, 47] }, "protected_area"));
});
