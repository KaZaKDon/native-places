import { expect, test } from "@playwright/test";

import { installAdminApiMocks } from "../helpers/mockAdminApi.js";

test("гость перенаправляется на страницу входа", async ({ page }) => {
    await installAdminApiMocks(page);
    await page.goto("/admin/");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
        page.getByRole("heading", { level: 1, name: "Вход администратора" })
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { level: 2, name: "Вход по коду" })
    ).toBeVisible();
});

test("пароль администратора можно показать и открыть восстановление", async ({
    page,
}) => {
    await installAdminApiMocks(page);
    await page.goto("/admin/login");

    const passwordInput = page.getByLabel("Пароль", { exact: true });
    await passwordInput.fill("test-password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Показать" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(passwordInput).toHaveValue("test-password");

    await page.getByRole("button", { name: "Скрыть" }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");

    await expect(page.getByRole("link", { name: "Забыли пароль?" }))
        .toHaveAttribute("href", "/auth?mode=forgot");
});

test("администратор входит и видит полное меню и сводку", async ({ page }) => {
    await installAdminApiMocks(page);
    await page.goto("/admin/login");

    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Пароль", { exact: true }).fill("test-password");
    await page
        .getByRole("button", { name: "Войти как администратор" })
        .click();

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(
        page.getByRole("heading", { level: 2, name: "Панель управления" })
    ).toBeVisible();
    await expect(page.getByText("Дмитрий", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Тарифы/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Платежи/ })).toBeVisible();
    await expect(page.getByText("Активных пользователей: 2")).toBeVisible();
});

test("модератор входит по коду и не видит административные разделы", async ({
    page,
}) => {
    await installAdminApiMocks(page);
    await page.goto("/admin/login");

    await page.getByLabel("Код доступа", { exact: true }).fill("TEST-CODE");
    await page
        .getByRole("button", { name: "Войти как модератор" })
        .click();

    await expect(page).toHaveURL(/\/admin\/?$/);
    const navigation = page.getByRole("navigation", {
        name: "Основная навигация",
    });
    await expect(navigation.getByRole("link", { name: /Объявления/ }))
        .toBeVisible();
    await expect(navigation.getByRole("link", { name: /Отзывы/ }))
        .toBeVisible();
    await expect(navigation.getByRole("link", { name: /Тарифы/ }))
        .toHaveCount(0);
    await expect(navigation.getByRole("link", { name: /Платежи/ }))
        .toHaveCount(0);
    await expect(navigation.getByRole("link", { name: /Рассылки/ }))
        .toHaveCount(0);
});

test("очередь модерации открывает список объявлений", async ({ page }) => {
    await installAdminApiMocks(page, { authenticated: true });
    await page.goto("/admin/");

    await expect(
        page.getByRole("heading", { level: 2, name: "Панель управления" })
    ).toBeVisible();
    await page.getByRole("link", { name: /^На модерации/ }).click();

    await expect(page).toHaveURL(/\/admin\/places\/pending$/);
    await expect(
        page.getByRole("heading", { level: 2, name: "Управление объявлениями" })
    ).toBeVisible();
    await expect(page.getByText("Тестовое объявление", { exact: true }))
        .toBeVisible();
    await expect(page.getByRole("cell", { name: "Иван Тестов" })).toBeVisible();
});

test("список пользователей показывает статусы и роли", async ({ page }) => {
    await installAdminApiMocks(page, { authenticated: true });
    await page.goto("/admin/users");

    await expect(
        page.getByRole("heading", { level: 2, name: "Управление пользователями" })
    ).toBeVisible();
    await expect(page.getByText("Иван Тестов", { exact: true })).toBeVisible();
    await expect(page.getByText("Мария Модераторова", { exact: true }))
        .toBeVisible();
    await expect(page.getByRole("link", { name: /Модераторы/ })).toContainText("1");
});

test("публикация отзыва использует отдельный цвет и меняет раздел", async ({
    page,
}) => {
    await installAdminApiMocks(page, { authenticated: true });
    await page.goto("/admin/reviews/view/31");

    await expect(
        page.getByRole("heading", { level: 2, name: "Отзыв пользователя" })
    ).toBeVisible();

    const publishButton = page.getByRole("button", { name: "Опубликовать" });
    const rejectButton = page.getByRole("button", { name: "Отклонить" });
    const publishColor = await publishButton.evaluate(
        (element) => getComputedStyle(element).backgroundColor
    );
    const rejectColor = await rejectButton.evaluate(
        (element) => getComputedStyle(element).backgroundColor
    );

    expect(publishColor).not.toBe(rejectColor);

    await publishButton.click();

    await expect(page).toHaveURL(/\/admin\/reviews\/published$/);
    await expect(
        page.getByRole("heading", { level: 2, name: "Модерация отзывов" })
    ).toBeVisible();
    await expect(page.getByText("Хорошее место для отдыха.", { exact: true }))
        .toBeVisible();
});
