export function SettingsField({ setting, value, onChange }) {
    const settingKey = setting.key;

    if (setting.field_type === "boolean") {
        return (
            <label className="settings-field settings-field--checkbox">
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => onChange(settingKey, event.target.checked)}
                />

                <span>{setting.title}</span>
            </label>
        );
    }

    if (setting.field_type === "textarea") {
        return (
            <label className="settings-field">
                <span>{setting.title}</span>

                <textarea
                    rows={5}
                    value={value ?? ""}
                    onChange={(event) => onChange(settingKey, event.target.value)}
                />
            </label>
        );
    }

    return (
        <label className="settings-field">
            <span>{setting.title}</span>

            <input
                type={setting.field_type === "number" ? "number" : "text"}
                value={value ?? ""}
                onChange={(event) => onChange(settingKey, event.target.value)}
            />
        </label>
    );
}