import { expect, test } from "@playwright/test";

import { installPublicApiMocks } from "../helpers/mockPublicApi.js";

test.beforeEach(async ({ page }) => {
    await installPublicApiMocks(page);
});

test("главная открывается и ведёт к категориям", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", { level: 1, name: "Родные места" })
    ).toBeVisible();
    await expect(page).toHaveTitle(/Native Places/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute(
        "href",
        "https://native-places.ru/"
    );

    await page.getByRole("link", { name: "Категории" }).click();

    await expect(page).toHaveURL(/\/categories$/);
    await expect(
        page.getByRole("heading", { level: 1, name: "Категории объявлений" })
    ).toBeVisible();
});

test("все шесть категорий доступны, а карточка категории открывается", async ({
    page,
}) => {
    await page.goto("/categories");

    const categories = [
        "Недвижимость",
        "Аренда",
        "Базы отдыха",
        "Рыбалка",
        "Охота",
        "Природа",
    ];

    for (const category of categories) {
        await expect(
            page.getByRole("link", { name: new RegExp(`^${category}`) })
        ).toBeVisible();
    }

    await page
        .getByRole("link", { name: /^Недвижимость/ })
        .click();

    await expect(page).toHaveURL(/\/category\/real-estate$/);
    await expect(
        page.getByRole("heading", { level: 1, name: "Недвижимость" })
    ).toBeVisible();
    await expect(page.getByText("Пока в этой категории нет опубликованных объявлений."))
        .toBeVisible();
});

test("закрытый кабинет перенаправляет гостя на авторизацию", async ({ page }) => {
    await page.goto("/account");

    await expect(page).toHaveURL(/\/auth$/);
    await expect(
        page.getByRole("heading", { level: 1, name: "Добро пожаловать" })
    ).toBeVisible();
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute(
        "content",
        /noindex/
    );
});

test("форма регистрации переключается без отправки данных", async ({ page }) => {
    await page.goto("/auth");

    await page.getByRole("button", { name: "Регистрация" }).click();

    await expect(
        page.getByRole("heading", { level: 1, name: "Создание аккаунта" })
    ).toBeVisible();
    await expect(page.getByLabel("Имя")).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
});

test("прямая ссылка открывает восстановление пароля", async ({ page }) => {
    await page.goto("/auth?mode=forgot");

    await expect(
        page.getByRole("heading", { level: 1, name: "Восстановление пароля" })
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить ссылку" }))
        .toBeVisible();
});

test("компактный футер открывает документы и сведения о платформе", async ({
    page,
}) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("Native Places", { exact: true })).toBeVisible();
    await expect(footer.getByText("версия 0.9", { exact: true })).toBeVisible();
    await expect(
        footer.getByRole("link", { name: "VKazakDon Studio © 2026" })
    ).toHaveAttribute("href", "https://vkazakdon.ru");

    await footer.getByRole("button", { name: "Документы" }).click();

    const documentsDialog = page.getByRole("dialog", { name: "Документы" });
    await expect(documentsDialog).toBeVisible();
    await expect(
        documentsDialog.getByRole("link", { name: /Пользовательское соглашение/ })
    ).toHaveAttribute("href", "/legal/user-agreement");
    await expect(
        documentsDialog.getByRole("link", { name: /Политика обработки/ })
    ).toHaveAttribute("href", "/legal/privacy");

    await page
        .getByRole("button", { name: "Закрыть окно «Документы»" })
        .click();

    await footer.getByRole("button", { name: "О платформе" }).click();

    const aboutDialog = page.getByRole("dialog", { name: "О платформе" });
    await expect(aboutDialog).toBeVisible();
    await expect(
        aboutDialog.getByText(/Сейчас проект работает в стартовом режиме/)
    ).toBeVisible();
});

test("неизвестный локальный маршрут показывает экран 404", async ({ page }) => {
    await page.goto("/test-route-that-does-not-exist");

    await expect(page.getByText("Ошибка 404", { exact: true })).toBeVisible();
    await expect(
        page.getByRole("heading", {
            level: 1,
            name: "Вы свернули не на ту тропинку",
        })
    ).toBeVisible();
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute(
        "content",
        /noindex/
    );
});
