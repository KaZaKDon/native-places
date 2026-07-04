const roleTitles = {
    admin: "Администратор",
    moderator: "Модератор",
};

export function Topbar({
    pageTitle,
    theme,
    onToggleTheme,
    user,
    onLogout,
}) {
    const roleTitle = roleTitles[user?.role_code] || "Пользователь";
    const userName = user?.name || user?.email || "Админка";

    return (
        <header className="topbar">
            <div>
                <span className="topbar__label">Административная панель</span>
                <h1>{pageTitle}</h1>
            </div>

            <div className="topbar__actions">
                <button className="theme-toggle" type="button" onClick={onToggleTheme}>
                    {theme === "dark" ? "☀️ Светлая" : "🌙 Тёмная"}
                </button>

                <div className="admin-user">
                    <span>{roleTitle}</span>
                    <strong>{userName}</strong>
                </div>

                <button className="theme-toggle" type="button" onClick={onLogout}>
                    Выйти
                </button>
            </div>
        </header>
    );
}
