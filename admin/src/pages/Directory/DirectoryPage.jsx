import { useCallback, useEffect, useMemo, useState } from "react";

import { directoryApi } from "../../shared/api/directoryApi";
import { DIRECTORY_GROUPS, DIRECTORY_TYPES, EMPTY_ENTRY, validateDirectoryEntry } from "./directoryTypes";
import { parseDirectoryGeoJSON } from "./geojson.js";
import { GeoJsonEditor } from "./GeoJsonEditor.jsx";
import { SegmentsEditor } from "./segments/SegmentsEditor.jsx";
import { SpeciesEditor } from "./species/SpeciesEditor.jsx";
import { TerritoryFields } from "./TerritoryFields.jsx";
import "./DirectoryPage.css";

const toForm = (entry) => ({
    ...EMPTY_ENTRY,
    ...entry,
    geometry_geojson: entry.geometry_geojson || "",
    official_category: entry.official_category || "",
    official_name: entry.official_name || "",
    managing_body: entry.managing_body || "",
    legal_basis_url: entry.legal_basis_url || "",
    boundary_source_url: entry.boundary_source_url || "",
    access_rules: entry.access_rules || "",
    access_source_url: entry.access_source_url || "",
    checked_at: entry.checked_at || "",
});

export function DirectoryPage() {
    const [group, setGroup] = useState(DIRECTORY_GROUPS[0].id);
    const [items, setItems] = useState([]);
    const [csrfToken, setCsrfToken] = useState("");
    const [form, setForm] = useState(null);
    const [waterSubtab, setWaterSubtab] = useState("objects");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publicationId, setPublicationId] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const refresh = useCallback(async () => {
        const result = await directoryApi.list();
        setItems(Array.isArray(result.entries) ? result.entries : []);
        setCsrfToken(result.csrf_token || "");
    }, []);

    useEffect(() => {
        let active = true;
        directoryApi.list().then((result) => {
            if (active) {
                setItems(Array.isArray(result.entries) ? result.entries : []);
                setCsrfToken(result.csrf_token || "");
            }
        }).catch((loadError) => {
            if (active) setError(`Серверный модуль не подключён или недоступен: ${loadError.message}`);
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const selectedGroup = DIRECTORY_GROUPS.find((item) => item.id === group);
    const filtered = useMemo(() => items.filter((item) => selectedGroup.types.some((type) => type.value === item.type)), [items, selectedGroup]);

    function changeGroup(value) {
        setGroup(value);
        setWaterSubtab("objects");
        setForm(null);
        setError("");
        setNotice("");
    }

    function newDraft() {
        setForm({ ...EMPTY_ENTRY, type: selectedGroup.types[0].value });
        setError("");
        setNotice("");
    }

    function updateField(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function submit(event) {
        event.preventDefault();
        const errors = validateDirectoryEntry(form);
        if (errors.length) {
            setError(errors.join(" "));
            return;
        }
        if (!csrfToken) {
            setError("Не удалось получить защитный токен из API. Обновите страницу.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const normalized = form.geometry_geojson.trim()
                ? parseDirectoryGeoJSON(form.geometry_geojson, form.type).geojson
                : "";
            const result = await directoryApi.save({ ...form, geometry_geojson: normalized }, csrfToken);
            await refresh();
            setForm(null);
            setNotice(`Черновик «${result.entry?.title || form.title}» сохранён.`);
        } catch (saveError) {
            setError(saveError.message || "Сохранить черновик не удалось.");
        } finally {
            setSaving(false);
        }
    }

    async function changePublication(item, action) {
        if (!csrfToken || publicationId !== null) return;
        const question = action === "publish"
            ? `Опубликовать «${item.title}»? Запись станет доступна всем посетителям и поисковым системам.`
            : `Снять «${item.title}» с публикации? Запись исчезнет из публичного справочника.`;
        if (!window.confirm(question)) return;
        setPublicationId(item.id);
        setError("");
        setNotice("");
        try {
            await directoryApi.setPublication(item.id, action, csrfToken);
            await refresh();
            setNotice(action === "publish"
                ? `«${item.title}» опубликован. Адрес: /directory/${item.type}/${item.slug}`
                : `«${item.title}» снова черновик. Можно редактировать.`);
        } catch (publicationError) {
            setError(publicationError.message || "Не удалось изменить статус публикации.");
        } finally {
            setPublicationId(null);
        }
    }

    return (
        <section className="page directory-page">
            <header className="page-header">
                <div>
                    <p className="eyebrow">Бесплатные информационные объекты</p>
                    <h2>Справочник мест</h2>
                    <p>Отдельный модуль для рек, водоёмов, угодий и достопримечательностей. Он не создаёт платные объявления.</p>
                </div>
            </header>

            <div className="directory-tabs" role="tablist" aria-label="Разделы справочника">
                {DIRECTORY_GROUPS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        role="tab"
                        aria-selected={group === entry.id}
                        className={group === entry.id ? "directory-tab directory-tab--active" : "directory-tab"}
                        onClick={() => changeGroup(entry.id)}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>

            {group === "waters" && <div className="directory-tabs" aria-label="Подразделы рек и водоёмов">
                <button type="button" className={waterSubtab === "objects" ? "directory-tab directory-tab--active" : "directory-tab"} onClick={() => { setWaterSubtab("objects"); setForm(null); }}>Объекты</button>
                <button type="button" className={waterSubtab === "segments" ? "directory-tab directory-tab--active" : "directory-tab"} onClick={() => { setWaterSubtab("segments"); setForm(null); }}>Участки рек</button>
                <button type="button" className={waterSubtab === "species" ? "directory-tab directory-tab--active" : "directory-tab"} onClick={() => { setWaterSubtab("species"); setForm(null); }}>Виды рыб</button>
            </div>}
            {["nature", "hunting"].includes(group) && <div className="directory-tabs" aria-label="Подразделы территорий">
                <button type="button" className={waterSubtab === "objects" ? "directory-tab directory-tab--active" : "directory-tab"} onClick={() => { setWaterSubtab("objects"); setForm(null); }}>Территории</button>
                <button type="button" className={waterSubtab === "species" ? "directory-tab directory-tab--active" : "directory-tab"} onClick={() => { setWaterSubtab("species"); setForm(null); }}>Животные и птицы</button>
            </div>}
            {group === "waters" && waterSubtab === "segments" ? <SegmentsEditor rivers={items.filter((item) => item.type === "river")} csrfToken={csrfToken} /> : waterSubtab === "species" && ["waters", "nature", "hunting"].includes(group) ? <SpeciesEditor key={group === "waters" ? "fish" : "fauna"} mode={group === "waters" ? "fish" : "fauna"} entries={items.filter((item) => (group === "waters" ? ["river", "lake"] : ["protected_area", "hunting_ground"]).includes(item.type))} csrfToken={csrfToken} /> : <>
            {error && <p role="alert" className="directory-message directory-message--error">{error}</p>}
            {notice && <p role="status" className="directory-message directory-message--success">{notice}</p>}

            <div className="directory-toolbar">
                <div>
                    <h3>{selectedGroup.label}</h3>
                    <p>Черновики скрыты от посетителей. Для публикации нужны отдельный подробный текст и источник сведений. Опубликованные объекты сначала снимайте с публикации перед редактированием.</p>
                </div>
                <button className="directory-action directory-action--primary" type="button" onClick={newDraft} disabled={loading || !csrfToken}>
                    Добавить черновик
                </button>
            </div>

            {form && (
                <form className="directory-form" onSubmit={submit}>
                    <div className="directory-form__heading">
                        <h3>{form.id ? `Редактирование №${form.id}` : "Новый справочный объект"}</h3>
                        <button type="button" className="directory-action" onClick={() => setForm(null)} disabled={saving}>Закрыть</button>
                    </div>
                    <div className="directory-form__grid">
                        <label>Тип объекта
                            <select value={form.type} onChange={(e) => updateField("type", e.target.value)}>
                                {selectedGroup.types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                        </label>
                        <label>Название *
                            <input value={form.title} maxLength={180} onChange={(e) => updateField("title", e.target.value)} required placeholder="Например, река Дон" />
                        </label>
                        <label>Адрес (slug) *
                            <input value={form.slug} maxLength={160} onChange={(e) => updateField("slug", e.target.value.toLowerCase())} required placeholder="don" />
                        </label>
                        <label>Регион
                            <input value={form.region} maxLength={160} onChange={(e) => updateField("region", e.target.value)} placeholder="Ростовская область" />
                        </label>
                        <label className="directory-form__wide">Краткое описание
                            <textarea value={form.summary} maxLength={500} rows={3} onChange={(e) => updateField("summary", e.target.value)} />
                        </label>
                        <label className="directory-form__wide">Подробный текст
                            <textarea value={form.body} maxLength={10000} rows={5} onChange={(e) => updateField("body", e.target.value)} />
                        </label>
                        <label className="directory-form__wide">Источник сведений (ссылка)
                            <input type="url" value={form.source_url} maxLength={700} onChange={(e) => updateField("source_url", e.target.value)} placeholder="https://..." />
                        </label>
                        <div className="directory-form__wide">
                            <GeoJsonEditor type={form.type} value={form.geometry_geojson} onChange={(value) => updateField("geometry_geojson", value)} disabled={saving} />
                        </div>
                        <TerritoryFields form={form} updateField={updateField} />
                    </div>
                    <button className="directory-action directory-action--primary" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить черновик"}</button>
                </form>
            )}

            <div className="directory-list">
                {loading ? <p>Загружаем справочник…</p> : filtered.length === 0 ? <p>Пока нет справочных объектов в этом разделе.</p> : (
                    <div className="directory-list__scroll">
                        <table>
                            <thead><tr><th>Название</th><th>Тип</th><th>Регион</th><th>Статус</th><th>Действие</th></tr></thead>
                            <tbody>
                                {filtered.map((item) => (
                                    <tr key={item.id}>
                                        <td><strong>{item.title}</strong><small>/{item.slug}</small></td>
                                        <td>{DIRECTORY_TYPES[item.type] || item.type}</td>
                                        <td>{item.region || "—"}</td>
                                        <td>{item.status === "draft" ? "Черновик" : item.status === "published" ? "Опубликован" : item.status}</td>
                                        <td>
                                            <div className="directory-row-actions">
                                                {item.status === "draft" && <button type="button" className="directory-action" onClick={() => { setForm(toForm(item)); setError(""); setNotice(""); }}>Редактировать</button>}
                                                {item.status === "draft" && <button type="button" className="directory-action directory-action--primary" disabled={!csrfToken || publicationId !== null || saving} onClick={() => changePublication(item, "publish")}>{publicationId === item.id ? "Выполняем…" : "Опубликовать"}</button>}
                                                {item.status === "published" && <>
                                                    <a className="directory-action" href={`/directory/${item.type}/${item.slug}`} target="_blank" rel="noreferrer">Открыть</a>
                                                    <button type="button" className="directory-action" disabled={!csrfToken || publicationId !== null || saving} onClick={() => changePublication(item, "unpublish")}>{publicationId === item.id ? "Выполняем…" : "Снять с публикации"}</button>
                                                </>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            </>}
            <p className="directory-page__note">Существующий раздел «Справочники» (/dictionaries) остаётся отдельным — он хранит наборы значений, а не географические объекты.</p>
        </section>
    );
}
