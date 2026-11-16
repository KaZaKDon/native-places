import assert from "node:assert/strict";
import test from "node:test";
import { fitGeometry, previewLayers, visibleTiles, worldPoint } from "./mapProjection.js";

test("Web Mercator converts origin and bounds to finite pixels", () => {
    assert.deepEqual(worldPoint([0,0],0), [128,128]);
    const fitted = fitGeometry([[40,47],[41,48]],700,390);
    assert.ok(fitted.zoom >= 1 && fitted.zoom <= 15);
    assert.ok(fitted.center.every(Number.isFinite));
});

test("OSM tile requests cover only the visible viewport", () => {
    const result = visibleTiles([128,128],4,700,390);
    assert.ok(result.length > 0 && result.length <= 20);
    assert.ok(result.every(tile => tile.url.startsWith("https://tile.openstreetmap.org/4/")));
});

test("MultiLineString is drawn as several distinct segments", () => {
    const result = previewLayers({ type:"MultiLineString", coordinates: [[[40,48],[41,49]], [[42,50],[43,51]]] });
    assert.equal(result.lines.length,2);
    assert.equal(result.polygons.length,0);
});
