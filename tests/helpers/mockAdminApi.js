const ADMIN_USER = {
    id: 3,
    email: "admin@example.test",
    name: "Дмитрий",
    role_code: "admin",
    role_title: "Администратор",
};

const MODERATOR_USER = {
    id: 7,
    email: "moderator@example.test",
    name: "Модератор",
    role_code: "moderator",
    role_title: "Модератор",
};

const PLACE = {
    id: 5,
    user_id: 18,
    title: "Тестовое объявление",
    slug: "test-place",
    short_description: "Краткое описание тестового объявления.",
    full_description: "Полное описание тестового объявления.",
    address: "Тестовая улица, 5",
    latitude: "47.22",
    longitude: "39.71",
    status: "pending",
    category_title: "Аренда",
    type_title: "Дом посуточно",
    owner_first_name: "Иван",
    owner_last_name: "Тестов",
    owner_email: "owner@example.test",
    owner_phone: "+70000000000",
    owner_telegram: "@owner",
    contact_name: "Иван Тестов",
    publication_type: "free",
    payment_status: "not_required",
    is_commercial: 0,
    booking_type: "phone",
    created_at: "2026-08-11 10:00:00",
    updated_at: "2026-08-11 11:00:00",
};

const USERS = [
    {
        id: 18,
        email: "user@example.test",
        first_name: "Иван",
        last_name: "Тестов",
        phone: "+70000000000",
        role_code: "user",
        role_title: "Пользователь",
        status: "active",
        places_count: 1,
        created_at: "2026-08-10 12:00:00",
    },
    {
        id: 7,
        email: "moderator@example.test",
        first_name: "Мария",
        last_name: "Модераторова",
        phone: null,
        role_code: "moderator",
        role_title: "Модератор",
        status: "active",
        places_count: 0,
        created_at: "2026-08-09 12:00:00",
    },
];

function success(data = {}) {
    return {
        success: true,
        data,
    };
}

async function fulfillJson(route, body, status = 200) {
    await route.fulfill({
        status,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(body),
    });
}

function createReview(status) {
    return {
        id: 31,
        place_id: 5,
        placeId: 5,
        place_title: "Тестовое объявление",
        user_id: 18,
        userId: 18,
        user_first_name: "Иван",
        user_last_name: "Тестов",
        user_email: "user@example.test",
        review_text: "Хорошее место для отдыха.",
        rating: 5,
        status,
        created_at: "2026-08-11 12:00:00",
        moderated_at: status === "pending" ? null : "2026-08-11 12:30:00",
    };
}

export async function installAdminApiMocks(page, options = {}) {
    const state = {
        user: options.authenticated
            ? options.role === "moderator"
                ? MODERATOR_USER
                : ADMIN_USER
            : null,
        reviewStatus: "pending",
    };

    await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;

        if (path === "/api/admin/auth/me.php") {
            await fulfillJson(
                route,
                success({
                    authenticated: Boolean(state.user),
                    user: state.user,
                })
            );
            return;
        }

        if (path === "/api/admin/auth/login-admin.php") {
            state.user = ADMIN_USER;
            await fulfillJson(route, success({ user: state.user }));
            return;
        }

        if (path === "/api/admin/auth/login-code.php") {
            state.user = MODERATOR_USER;
            await fulfillJson(route, success({ user: state.user }));
            return;
        }

        if (path === "/api/admin/auth/logout.php") {
            state.user = null;
            await fulfillJson(route, success({ authenticated: false }));
            return;
        }

        if (path === "/api/admin/dashboard/index.php") {
            await fulfillJson(
                route,
                success({
                    dashboard: {
                        users_count: 2,
                        active_users_count: 2,
                        places_count: 1,
                        published_places_count: 0,
                        pending_places_count: 1,
                        rejected_places_count: 0,
                        archived_places_count: 0,
                        new_reports_count: 0,
                        closed_reports_count: 0,
                        pending_reviews_count: 1,
                        published_reviews_count: 0,
                        active_access_codes_count: 1,
                    },
                })
            );
            return;
        }

        if (path === "/api/admin/settings/index.php") {
            await fulfillJson(route, success({ groups: [] }));
            return;
        }

        if (path === "/api/admin/statistics/index.php") {
            await fulfillJson(
                route,
                success({
                    summary: [
                        { id: "places", value: 1 },
                        { id: "reports", value: 0 },
                        { id: "payments", value: 0 },
                    ],
                    extra: {
                        appeals_new: 0,
                        reviews_total: 1,
                    },
                })
            );
            return;
        }

        if (path === "/api/admin/places/index.php") {
            await fulfillJson(route, success({ places: [PLACE] }));
            return;
        }

        if (path === "/api/admin/places/show.php") {
            await fulfillJson(
                route,
                success({
                    place: PLACE,
                    images: [],
                    attributes: [],
                })
            );
            return;
        }

        if (path === "/api/admin/users/index.php") {
            await fulfillJson(route, success({ users: USERS }));
            return;
        }

        if (path === "/api/admin/reviews/index.php") {
            await fulfillJson(
                route,
                success({ reviews: [createReview(state.reviewStatus)] })
            );
            return;
        }

        if (path === "/api/admin/reviews/show.php") {
            await fulfillJson(
                route,
                success({ review: createReview(state.reviewStatus) })
            );
            return;
        }

        if (path === "/api/admin/reviews/publish.php") {
            state.reviewStatus = "published";
            await fulfillJson(
                route,
                success({ review: createReview(state.reviewStatus) })
            );
            return;
        }

        if (path === "/api/admin/reviews/reject.php") {
            state.reviewStatus = "rejected";
            await fulfillJson(
                route,
                success({ review: createReview(state.reviewStatus) })
            );
            return;
        }

        await fulfillJson(
            route,
            {
                success: false,
                message: `Для теста не подготовлен API: ${path}`,
            },
            404
        );
    });

    return state;
}
