import { useMemo, useState } from "react";
import { GEOJSON_MAX_BYTES, parseDirectoryGeoJSON } from "./geojson.js";
import { GeoPreviewMap } from "./GeoPreviewMap.jsx";
import "./GeoJsonEditor.css";

export function GeoJsonEditor({ type, value, onChange, disabled }) {
    const [importNotice, setImportNotice] = useState("");
    const [importError, setImportError] = useState("");
    const inspection = useMemo(() => {
        if (!value?.trim()) return { parsed: null, error: "" };
        try {
            return { parsed: parseDirectoryGeoJSON(value, type), error: "" };
        } catch (error) {
            return { parsed: null, error: error.message };
        }
    }, [value, type]);

    async function importFile(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setImportNotice("");
        setImportError("");
        if (file.size > GEOJSON_MAX_BYTES) {
            setImportError("Файл превышает 250 КБ. Для длинной реки выберите небольшой участок.");
            return;
        }
        try {
            const text = await file.text();
            const imported = parseDirectoryGeoJSON(text, type);
            onChange(imported.geojson);
            setImportNotice(`Импортирован «${file.name}»: точек ${imported.pointCount}, участков/областей ${imported.partCount}. Сохраните черновик, чтобы записать геометрию в базу.`);
        } catch (error) {
            setImportError(error.message || "Не удалось прочитать файл GeoJSON.");
        }
    }

    return (
        <div className="directory-geometry">
            <label className="directory-geometry__title" htmlFor="directory-geojson">Геометрия GeoJSON (необязательно для черновика)</label>
            <div className="directory-geometry__actions">
                <label className="directory-geometry__upload">Выбрать файл .geojson / .json
                    <input type="file" accept=".geojson,.json,application/geo+json,application/json" disabled={disabled} onChange={importFile} />
                </label>
                <span>До 250 КБ · максимум 20 000 точек</span>
            </div>
            {importError && <p role="alert" className="directory-geometry__error">{importError}</p>}
            {importNotice && <p role="status" className="directory-geometry__notice">{importNotice}</p>}
            <textarea id="directory-geojson" value={value} rows={5} onChange={(event) => { setImportNotice(""); onChange(event.target.value); }} spellCheck="false" disabled={disabled} placeholder='{"type":"LineString","coordinates":[[40.0,48.0],[40.1,48.1]]}' />
            <small>Координаты в WGS84: [долгота, широта]. Пример в подсказке — синтетический, не русло Дона. При импорте FeatureCollection несколько линий объединяются в MultiLineString.</small>
            {inspection.error && <p role="alert" className="directory-geometry__error">{inspection.error}</p>}
            {inspection.parsed && (
                <div className="directory-geometry__preview">
                    <p><strong>Проверка геометрии:</strong> {inspection.parsed.geometry.type}; координат: {inspection.parsed.pointCount}; участков/областей: {inspection.parsed.partCount}.</p>
                    <GeoPreviewMap type={type} geometry={inspection.parsed.geometry} bounds={inspection.parsed.bounds} />
                </div>
            )}
            <p className="directory-geometry__credit">Укажите ссылку на источник геоданных в поле выше. Используйте только проверенные данные и соблюдайте лицензию источника (например, ODbL для OSM).</p>
        </div>
    );
}
