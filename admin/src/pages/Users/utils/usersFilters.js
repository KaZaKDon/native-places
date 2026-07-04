export function filterUsers(users, status) {
    if (status === "all") {
        return users;
    }

    if (status === "moderator" || status === "admin") {
        return users.filter((user) => user.role_code === status);
    }

    return users.filter((user) => user.status === status);
}

export function mapUserFromApi(user) {
    const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...user,
        name: fullName || "Без имени",
        phone: user.phone || "—",
        telegram: user.telegram || "—",
        places_count: Number(user.places_count || 0),
    };
}