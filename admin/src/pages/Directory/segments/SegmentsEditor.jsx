import { useCallback, useEffect, useMemo, useState } from "react";
import { directorySegmentsApi } from "../../../shared/api/directoryApi.js";
import { GeoJsonEditor } from "../GeoJsonEditor.jsx";
import { parseDirectoryGeoJSON } from "../geojson.js";
import { EMPTY_SEGMENT, EMPTY_SOURCE, SOURCE_KINDS, toSegmentForm, validateSegment, validateSource } from "./segmentModel.js";
import "./SegmentsEditor.css";

export function SegmentsEditor({ rivers, csrfToken }) {
    const [riverId, setRiverId] = useState("");
    const [segments, setSegments] = useState([]);
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);
    const [sourceForm, setSourceForm] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const activeRiver = useMemo(() => rivers.find((r) => String(r.id) === riverId), [rivers, riverId]);

    const refresh = useCallback(async () => {
        if (!riverId) { setSegments([]); return; }
        const result = await directorySegmentsApi.list(riverId);
        setSegments(Array.isArray(result.segments) ? result.segments : []);
    }, [riverId]);

    useEffect(() => {
        if (!riverId) return undefined;
        let active = true;
        setLoading(true);
        setError("");
        Promise.all([directorySegmentsApi.list(riverId), directorySegmentsApi.sources()]).then(([segmentResult, sourceResult]) => {
            if (!active) return;
            setSegments(Array.isArray(segmentResult.segments) ? segmentResult.segments : []);
            setSources(Array.isArray(sourceResult.sources) ? sourceResult.sources : []);
        }).catch((e) => { if (active) setError(`Не удалось загрузить участки: ${e.message}`); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [riverId]);

    function startDraft() {
        setForm({ ...EMPTY_SEGMENT, river_entry_id: riverId });
        setError(""); setMessage("");
    }
    function update(name, value) { setForm((old) => ({ ...old, [name]: value })); }

    async function saveSegment(event) {
        event.preventDefault();
        const errors = validateSegment(form, rivers);
        if (errors.length) { setError(errors.join(" ")); return; }
        if (!csrfToken) { setError("CSRF-токен недоступен. Обновите страницу."); return; }
        setSaving(true); setError(""); setMessage("");
        try {
            const geometry = form.geometry_geojson.trim() ? parseDirectoryGeoJSON(form.geometry_geojson, "river").geojson : "";
            const payload = { ...form, river_entry_id: Number(riverId), sort_order: Number(form.sort_order),
                geometry_source_id: form.geometry_source_id ? Number(form.geometry_source_id) : null, geometry_geojson: geometry };
            await directorySegmentsApi.save(payload, csrfToken);
            await refresh();
            setMessage(`Черновик «${form.title}» сохранён.`);
            setForm(null);
        } catch (e) { setError(e.message || "Ошибка сохранения участка."); }
        finally { setSaving(false); }
    }

    async function saveSource(event) {
        event.preventDefault();
        const errors = validateSource(sourceForm);
        if (errors.length) { setError(errors.join(" ")); return; }
        if (!csrfToken) { setError("CSRF-токен недоступен."); return; }
        setSaving(true); setError("");
        try {
            const response = await directorySegmentsApi.addSource(sourceForm, csrfToken);
            const updated = await directorySegmentsApi.sources();
            setSources(Array.isArray(updated.sources) ? updated.sources : []);
            if (response.source?.id) setForm((old) => old ? { ...old, geometry_source_id: String(response.source.id) } : old);
            setSourceForm(null);
            setMessage("Источник сохранён. Выбран для текущего участка.");
        } catch (e) { setError(e.message || "Не удалось создать источник."); }
        finally { setSaving(false); }
    }

    return (
        <section className="directory-segments">
            <header className="directory-segments__header">
                <div>
                    <h3>Именованные участки рек</h3>
                    <p>Это отдельные смысловые участки, а не автоматически разделённые фрагменты GeoJSON. Все новые записи — черновики.</p>
                </div>
            </header>
            <label className="directory-segments__river">Река
                <select value={riverId} onChange={(e) => { setRiverId(e.target.value); setForm(null); setSourceForm(null); setMessage(""); setError(""); }}>
                    <option value="">Выберите реку</option>
                    {rivers.map((river) => <option value={river.id} key={river.id}>{river.title} — {river.region || "Регион не указан"} ({river.status === "published" ? "опубликована" : "черновик"})</option>)}
                </select>
            </label>
            {rivers.length === 0 && <p>Добавьте объект типа «Река» на вкладке «Объекты».</p>}
            {riverId && <>
                <div className="directory-segments__actions">
                    <p><strong>Река:</strong> {activeRiver?.title}. Геометрия самой реки не изменяется.</p>
                    <button className="directory-action directory-action--primary" type="button" disabled={!csrfToken || loading} onClick={startDraft}>Добавить участок</button>
                </div>
                {error && <p role="alert" className="directory-message directory-message--error">{error}</p>}
                {message && <p role="status" className="directory-message directory-message--success">{message}</p>}
                {form && <form className="directory-form directory-segments__form" onSubmit={saveSegment}>
                    <div className="directory-form__heading"><h3>{form.id ? `Редактирование участка №${form.id}` : "Новый участок реки"}</h3>
                        <button type="button" className="directory-action" disabled={saving} onClick={() => { setForm(null); setSourceForm(null); }}>Закрыть</button></div>
                    <p className="directory-segments__hint">Для публикации в будущем потребуется подтверждённая геометрия и источник. Сейчас сохраняем только черновик.</p>
                    <div className="directory-form__grid">
                        <label>Название участка *<input value={form.title} maxLength={180} required onChange={(e) => update("title", e.target.value)} placeholder="Например, Вёшенской участок" /></label>
                        <label>Slug участка *<input value={form.slug} maxLength={160} required onChange={(e) => update("slug", e.target.value.toLowerCase())} placeholder="vyoshenskaya" /></label>
                        <label>Ориентир / населённый пункт<input value={form.locality} maxLength={180} onChange={(e) => update("locality", e.target.value)} /></label>
                        <label>Порядок в списке<input type="number" min="0" max="100000" step="1" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} /></label>
                        <label className="directory-form__wide">Краткое описание<textarea rows={3} value={form.summary} maxLength={500} onChange={(e) => update("summary", e.target.value)} /></label>
                        <label className="directory-form__wide">Подробный текст<textarea rows={5} value={form.body} maxLength={10000} onChange={(e) => update("body", e.target.value)} /></label>
                        <label className="directory-form__wide">Источник геометрии
                            <select value={form.geometry_source_id} onChange={(e) => update("geometry_source_id", e.target.value)}>
                                <option value="">Не указан — допустимо для черновика</option>
                                {sources.map((source) => <option value={source.id} key={source.id}>{source.title} — {source.accessed_at}</option>)}
                            </select>
                        </label>
                        <div className="directory-form__wide"><button type="button" className="directory-action" disabled={saving} onClick={() => { setSourceForm({ ...EMPTY_SOURCE }); setError(""); }}>Добавить источник</button></div>
                        <div className="directory-form__wide"><GeoJsonEditor type="river" value={form.geometry_geojson} onChange={(value) => update("geometry_geojson", value)} disabled={saving} /></div>
                    </div>
                    <button type="submit" className="directory-action directory-action--primary" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить черновик участка"}</button>
                </form>}
                {sourceForm && <form className="directory-form directory-segments__form" onSubmit={saveSource}>
                    <div className="directory-form__heading"><h3>Новый источник сведений</h3><button type="button" className="directory-action" onClick={() => setSourceForm(null)} disabled={saving}>Закрыть</button></div>
                    <div className="directory-form__grid">
                        <label>Название *<input required maxLength={250} value={sourceForm.title} onChange={(e) => setSourceForm((o) => ({ ...o, title: e.target.value }))}/></label>
                        <label>Тип источника<select value={sourceForm.source_kind} onChange={(e) => setSourceForm((o) => ({ ...o, source_kind: e.target.value }))}>{SOURCE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
                        <label>Издатель<input value={sourceForm.publisher} maxLength={250} onChange={(e) => setSourceForm((o) => ({ ...o, publisher: e.target.value }))}/></label>
                        <label>Дата проверки *<input type="date" required value={sourceForm.accessed_at} onChange={(e) => setSourceForm((o) => ({ ...o, accessed_at: e.target.value }))}/></label>
                        <label className="directory-form__wide">URL источника (необязательно)<input type="url" placeholder="Для книги или наблюдения оставьте пустым" maxLength={1000} value={sourceForm.url} onChange={(e) => setSourceForm((o) => ({ ...o, url: e.target.value }))}/></label>
                        <label>Дата публикации<input type="date" value={sourceForm.published_on} onChange={(e) => setSourceForm((o) => ({ ...o, published_on: e.target.value }))}/></label>
                        <label>Лицензия<input value={sourceForm.license_name} maxLength={180} onChange={(e) => setSourceForm((o) => ({ ...o, license_name: e.target.value }))}/></label>
                        <label className="directory-form__wide">Ссылка на лицензию<input type="url" maxLength={1000} value={sourceForm.license_url} onChange={(e) => setSourceForm((o) => ({ ...o, license_url: e.target.value }))}/></label>
                        <label className="directory-form__wide">Комментарий / библиографические реквизиты<textarea placeholder="Книга: автор, издание, год, страницы. Наблюдение: место и примерный период." rows={2} maxLength={2000} value={sourceForm.comment} onChange={(e) => setSourceForm((o) => ({ ...o, comment: e.target.value }))}/></label>
                    </div><button type="submit" className="directory-action directory-action--primary" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить источник"}</button>
                </form>}
                <div className="directory-list">
                    {loading ? <p>Загружаем участки…</p> : segments.length === 0 ? <p>Участков этой реки пока нет. Добавьте первый черновик.</p> : <div className="directory-list__scroll"><table>
                        <thead><tr><th>Название</th><th>Ориентир</th><th>Геометрия</th><th>Статус</th><th>Действие</th></tr></thead>
                        <tbody>{segments.map((segment) => <tr key={segment.id}><td><strong>{segment.title}</strong><small>/{segment.slug} · порядок {segment.sort_order}</small></td><td>{segment.locality || "—"}</td><td>{segment.geometry_geojson ? "Есть GeoJSON" : "Не задана"}</td><td>{segment.status === "draft" ? "Черновик" : "Опубликован"}</td><td>{segment.status === "draft" ? <button className="directory-action" type="button" onClick={() => { setForm(toSegmentForm(segment)); setSourceForm(null); setError(""); setMessage(""); }}>Редактировать</button> : "—"}</td></tr>)}</tbody>
                    </table></div>}
                </div>
            </>}
        </section>
    );
}
