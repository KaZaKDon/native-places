import { SettingsField } from "./SettingsField";

export function SettingsGroup({ group, values, onChange }) {
    return (
        <section className="settings-group">
            <div className="settings-group__header">
                <h3>{group.title}</h3>
            </div>

            <div className="settings-group__content">
                {group.items.map((setting) => (
                    <SettingsField
                        key={setting.key}
                        setting={setting}
                        value={values[setting.key]}
                        onChange={onChange}
                    />
                ))}
            </div>
        </section>
    );
}