import { expect, test } from "@playwright/test";

async function getJson(request, path) {
    const response = await request.get(path, {
        maxRetries: 2,
    });
    const contentType = response.headers()["content-type"] || "";

    expect(contentType, `${path}: content type`).toContain("application/json");

    return {
        response,
        body: await response.json(),
    };
}

function expectSuccessfulCollection({ response, body }, path, key) {
    expect(response.status(), `${path}: HTTP status`).toBe(200);
    expect(body.success, `${path}: success`).toBe(true);
    expect(Array.isArray(body.data?.[key]), `${path}: data.${key}`).toBe(true);

    return body.data[key];
}

test("публичные справочники возвращают непустые корректные коллекции", async ({
    request,
}) => {
    const resources = [
        { path: "/api/categories/index.php", key: "categories" },
        { path: "/api/place-types/index.php", key: "types" },
        { path: "/api/plans/index.php", key: "plans" },
    ];

    for (const resource of resources) {
        const result = await getJson(request, resource.path);
        const items = expectSuccessfulCollection(
            result,
            resource.path,
            resource.key
        );

        expect(items.length, `${resource.path}: collection is not empty`)
            .toBeGreaterThan(0);

        for (const item of items) {
            expect(Number(item.id), `${resource.path}: item.id`).toBeGreaterThan(0);
            expect(item.title, `${resource.path}: item.title`).toEqual(
                expect.any(String)
            );
            expect(item.title.trim(), `${resource.path}: item.title is not empty`)
                .not.toBe("");
        }
    }
});

test("справочник населённых пунктов поддерживает ограничение выдачи", async ({
    request,
}) => {
    const path = "/api/localities/index.php?limit=5";
    const result = await getJson(request, path);
    const localities = expectSuccessfulCollection(
        result,
        path,
        "localities"
    );

    expect(localities.length).toBeGreaterThan(0);
    expect(localities.length).toBeLessThanOrEqual(5);

    for (const locality of localities) {
        expect(Number(locality.id)).toBeGreaterThan(0);
        expect(locality.title).toEqual(expect.any(String));
        expect(locality.slug).toEqual(expect.any(String));
    }
});

test("публичный каталог не отдаёт неопубликованные объявления", async ({
    request,
}) => {
    const path = "/api/places/index.php";
    const result = await getJson(request, path);
    const places = expectSuccessfulCollection(result, path, "places");

    for (const place of places) {
        expect(Number(place.id)).toBeGreaterThan(0);
        expect(place.slug).toMatch(/^[a-z0-9_-]+$/);
        expect(place.title.trim()).not.toBe("");
        expect(place.status).toBe("published");
    }
});

test("точки карты содержат допустимые координаты", async ({ request }) => {
    const path = "/api/places/map.php";
    const result = await getJson(request, path);
    const places = expectSuccessfulCollection(result, path, "places");

    for (const place of places) {
        const latitude = Number(place.latitude);
        const longitude = Number(place.longitude);

        expect(Number.isFinite(latitude), `${place.slug}: latitude`).toBe(true);
        expect(Number.isFinite(longitude), `${place.slug}: longitude`).toBe(true);
        expect(latitude, `${place.slug}: latitude range`).toBeGreaterThanOrEqual(-90);
        expect(latitude, `${place.slug}: latitude range`).toBeLessThanOrEqual(90);
        expect(longitude, `${place.slug}: longitude range`).toBeGreaterThanOrEqual(-180);
        expect(longitude, `${place.slug}: longitude range`).toBeLessThanOrEqual(180);
    }
});

test("карточка объявления и её отзывы согласованы с каталогом", async ({
    request,
}) => {
    const catalogPath = "/api/places/index.php";
    const catalogResult = await getJson(request, catalogPath);
    const places = expectSuccessfulCollection(
        catalogResult,
        catalogPath,
        "places"
    );
    const catalogPlace = places[0];

    test.skip(!catalogPlace, "В каталоге пока нет опубликованных объявлений");

    const detailPath = `/api/places/show.php?slug=${encodeURIComponent(catalogPlace.slug)}`;
    const detailResult = await getJson(request, detailPath);

    expect(detailResult.response.status()).toBe(200);
    expect(detailResult.body.success).toBe(true);
    expect(detailResult.body.data?.place?.id).toBe(catalogPlace.id);
    expect(detailResult.body.data?.place?.slug).toBe(catalogPlace.slug);
    expect(detailResult.body.data?.place?.status).toBe("published");
    expect(Array.isArray(detailResult.body.data?.images)).toBe(true);
    expect(Array.isArray(detailResult.body.data?.attributes)).toBe(true);

    const reviewsPath = `/api/reviews/index.php?place_id=${encodeURIComponent(catalogPlace.id)}`;
    const reviewsResult = await getJson(request, reviewsPath);
    const reviews = expectSuccessfulCollection(
        reviewsResult,
        reviewsPath,
        "reviews"
    );

    expect(Number(reviewsResult.body.data.place_id)).toBe(Number(catalogPlace.id));

    for (const review of reviews) {
        expect(Number(review.place_id)).toBe(Number(catalogPlace.id));
        expect(review.status).toBe("published");
    }
});

test("гостевая проверка сессии не выдаёт данные пользователя", async ({
    request,
}) => {
    const path = "/api/auth/me.php";
    const { response, body } = await getJson(request, path);

    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.authenticated).toBe(false);
    expect(body.data?.user).toBeNull();
});

test("личные API-разделы закрыты от неавторизованного гостя", async ({
    request,
}) => {
    const protectedPaths = [
        "/api/profile/index.php",
        "/api/favorites/index.php",
        "/api/routes/index.php",
    ];

    for (const path of protectedPaths) {
        const { response, body } = await getJson(request, path);

        expect(response.status(), `${path}: HTTP status`).toBe(401);
        expect(body.success, `${path}: success`).toBe(false);
        expect(body.message, `${path}: message`).toMatch(/авторизац/i);
    }
});
