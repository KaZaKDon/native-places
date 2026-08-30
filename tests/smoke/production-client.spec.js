import { expect, test } from "@playwright/test";

test("опубликованная главная содержит единственный canonical и robots", async ({
    page,
}) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { level: 1, name: "Родные места" })
    ).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    const robots = page.locator('meta[name="robots"]');

    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute(
        "href",
        "https://native-places.ru/"
    );
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", /index, follow/);
});

test("опубликованная авторизация содержит единственный noindex", async ({
    page,
}) => {
    await page.goto("/auth", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { level: 1, name: "Добро пожаловать" })
    ).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    const robots = page.locator('meta[name="robots"]');

    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute(
        "href",
        "https://native-places.ru/auth"
    );
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", /noindex/);
});

test("опубликованный футер открывает документы и сведения о платформе", async ({
    page,
}) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("версия 0.9", { exact: true })).toBeVisible();
    await expect(
        footer.getByRole("link", { name: "VKazakDon Studio © 2026" })
    ).toHaveAttribute("href", "https://vkazakdon.ru");

    await footer.getByRole("button", { name: "Документы" }).click();
    await expect(page.getByRole("dialog", { name: "Документы" })).toBeVisible();
    await page
        .getByRole("button", { name: "Закрыть окно «Документы»" })
        .click();

    await footer.getByRole("button", { name: "О платформе" }).click();
    await expect(page.getByRole("dialog", { name: "О платформе" }))
        .toBeVisible();
});
