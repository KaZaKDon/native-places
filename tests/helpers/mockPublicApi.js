const JSON_HEADERS = {
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
};

function success(data) {
    return {
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
            success: true,
            data,
        }),
    };
}

export async function installPublicApiMocks(page) {
    await page.route("**/api/auth/me.php*", async (route) => {
        await route.fulfill(
            success({
                authenticated: false,
                user: null,
            })
        );
    });

    await page.route("**/api/places/index.php*", async (route) => {
        await route.fulfill(
            success({
                places: [],
                pagination: {
                    page: 1,
                    limit: 24,
                    total: 0,
                    total_pages: 0,
                },
            })
        );
    });
}
