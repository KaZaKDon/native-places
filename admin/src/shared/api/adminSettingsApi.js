import { apiClient } from "./apiClient";

function normalizeSettingValue(setting) {
    if (setting.field_type === "boolean") {
        return setting.value === "1";
    }

    if (setting.field_type === "number") {
        return Number(setting.value ?? 0);
    }

    return setting.value ?? "";
}

export const adminSettingsApi = {
    async getSettings() {
        const data = await apiClient.get("/admin/settings/index.php");

        return {
            groups: (data.groups || []).map((group) => ({
                ...group,
                items: group.items.map((item) => ({
                    ...item,
                    value: normalizeSettingValue(item),
                })),
            })),
        };
    },

    async updateSettings(settings) {
        return apiClient.post(
            "/admin/settings/update.php",
            {
                settings,
            }
        );
    },
};