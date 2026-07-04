export function ModeratorLogsFilters({
    filters,
    moderators,
    sections,
    actions,
    periods,
    onChange,
    onReset,
}) {
    return (
        <section className="moderator-logs-filters">
            <div className="moderator-logs-filters__header">
                <div>
                    <p className="eyebrow">Фильтры</p>
                    <h3>Поиск по журналу действий</h3>
                </div>

                <button
                    className="moderator-logs-filters__reset"
                    type="button"
                    onClick={onReset}
                >
                    Сбросить
                </button>
            </div>

            <div className="moderator-logs-filters__grid">
                <label className="moderator-logs-filters__field">
                    <span>Модератор</span>
                    <select
                        value={filters.moderator}
                        onChange={(event) => onChange("moderator", event.target.value)}
                    >
                        {moderators.map((moderator) => (
                            <option key={moderator.value} value={moderator.value}>
                                {moderator.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="moderator-logs-filters__field">
                    <span>Раздел</span>
                    <select
                        value={filters.section}
                        onChange={(event) => onChange("section", event.target.value)}
                    >
                        {sections.map((section) => (
                            <option key={section.value} value={section.value}>
                                {section.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="moderator-logs-filters__field">
                    <span>Действие</span>
                    <select
                        value={filters.action}
                        onChange={(event) => onChange("action", event.target.value)}
                    >
                        {actions.map((action) => (
                            <option key={action.value} value={action.value}>
                                {action.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="moderator-logs-filters__field">
                    <span>Период</span>
                    <select
                        value={filters.period}
                        onChange={(event) => onChange("period", event.target.value)}
                    >
                        {periods.map((period) => (
                            <option key={period.value} value={period.value}>
                                {period.title}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </section>
    );
}