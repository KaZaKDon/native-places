import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
    location: { origin: "https://example.test" },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
};

const { getPlaceBySlug, placesApi } = await import("./placesApi.js");

test("exports getPlaceBySlug as function and on placesApi object", () => {
    assert.equal(typeof getPlaceBySlug, "function");
    assert.equal(placesApi.getPlaceBySlug, getPlaceBySlug);
});

test("getPlaceBySlug requests public place by slug and maps response", async () => {
    let requestedUrl = "";

    globalThis.fetch = async (url) => {
        requestedUrl = url;

        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                success: true,
                data: {
                    place: {
                        id: 7,
                        slug: "test-place",
                        title: "Тестовое место",
                        category_code: "real_estate",
                        category_title: "Недвижимость",
                        type_code: "house",
                        type_title: "Дом",
                        short_description: "Короткое описание",
                        locality_title: "Шахты",
                        locality_slug: "shahty",
                        latitude: "47.7085",
                        longitude: "40.2159",
                        cover_image: "/uploads/cover.webp",
                    },
                    images: [
                        { image_path: "/uploads/cover.webp" },
                    ],
                    attributes: [
                        {
                            attribute_definition_id: 1,
                            code: "price",
                            title: "Цена",
                            field_type: "number",
                            sort_order: 10,
                            value: "1500",
                        },
                    ],
                },
            }),
        };
    };

    const result = await getPlaceBySlug("test-place");

    assert.equal(
        requestedUrl,
        "https://example.test/api/places/show.php?slug=test-place"
    );
    assert.equal(result.place.id, 7);
    assert.equal(result.place.slug, "test-place");
    assert.equal(result.place.categorySlug, "real-estate");
    assert.deepEqual(result.place.position, [47.7085, 40.2159]);
    assert.equal(result.place.price, "1500");
});
