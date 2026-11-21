const OOPT_CATEGORIES = [
    ["zapovednik", "Государственный природный заповедник"],
    ["zakaznik", "Государственный природный заказник"],
    ["national_park", "Национальный парк"],
    ["natural_park", "Природный парк"],
    ["nature_monument", "Памятник природы"],
    ["other", "Другая ООПТ"],
];

export function TerritoryFields({ form, updateField }) {
    if (!["protected_area", "hunting_ground"].includes(form.type)) return null;
    const protectedArea = form.type === "protected_area";
    return <fieldset className="directory-form__wide directory-territory">
        <legend>{protectedArea ? "Правовой статус ООПТ" : "Правовой статус охотничьего угодья"}</legend>
        <p>Контур показывается только при подтверждённом источнике границ. Описание территории не даёт права на охоту или свободное посещение.</p>
        <div className="directory-form__grid">
            {protectedArea && <label>Официальная категория *
                <select value={form.official_category || ""} onChange={(e) => updateField("official_category", e.target.value)}>
                    <option value="">Выберите категорию</option>
                    {OOPT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </label>}
            <label>Официальное название *
                <input value={form.official_name || ""} maxLength={180} onChange={(e) => updateField("official_name", e.target.value)} placeholder="По правовому документу" />
            </label>
            <label>Управляющая организация
                <input value={form.managing_body || ""} maxLength={180} onChange={(e) => updateField("managing_body", e.target.value)} />
            </label>
            <label className="directory-form__wide">Правовой документ *
                <input type="url" value={form.legal_basis_url || ""} maxLength={700} onChange={(e) => updateField("legal_basis_url", e.target.value)} placeholder="https://..." />
            </label>
            <label className="directory-form__wide">Источник точных границ (обязателен при публикации контура)
                <input type="url" value={form.boundary_source_url || ""} maxLength={700} onChange={(e) => updateField("boundary_source_url", e.target.value)} placeholder="https://..." />
            </label>
            <label className="directory-form__wide">{protectedArea ? "Проверенный режим посещения и ограничения" : "Проверенные сроки охоты по видам и ограничения (укажите год и регион)"}
                <textarea value={form.access_rules || ""} maxLength={5000} rows={4} placeholder={protectedArea ? "Укажите ограничения по положению об этой территории" : "Вид, период, год, разрешения и дополнительные ограничения по официальному документу"} onChange={(e) => updateField("access_rules", e.target.value)} />
            </label>
            <label className="directory-form__wide">Источник режима (нужен, если заполнены ограничения)
                <input type="url" value={form.access_source_url || ""} maxLength={700} onChange={(e) => updateField("access_source_url", e.target.value)} placeholder="https://..." />
            </label>
            <label>Дата проверки режима
                <input type="date" value={form.checked_at || ""} onChange={(e) => updateField("checked_at", e.target.value)} />
            </label>
        </div>
    </fieldset>;
}
