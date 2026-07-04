export function PlacesFilters({
    search,
    category,
    categories,
    onSearchChange,
    onCategoryChange,
    onReset,
}) {
    return (
        <div className="places-filters">
            <label className="places-filter">
                <span>Поиск</span>

                <input
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Название, владелец, категория..."
                />
            </label>

            <label className="places-filter">
                <span>Категория</span>

                <select
                    value={category}
                    onChange={(event) => onCategoryChange(event.target.value)}
                >
                    <option value="all">Все категории</option>

                    {categories.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </label>

            <button className="places-filter-reset" type="button" onClick={onReset}>
                Сбросить
            </button>
        </div>
    );
}