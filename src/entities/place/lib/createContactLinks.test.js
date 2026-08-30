import assert from "node:assert/strict";
import test from "node:test";

import {
    createEmailHref,
    createPhoneHref,
    createTelegramHref,
    createWebsiteHref,
} from "./createContactLinks.js";

test("creates safe phone and email links", () => {
    assert.equal(createPhoneHref("+7 (951) 522-06-69"), "tel:+79515220669");
    assert.equal(createEmailHref("user@example.ru"), "mailto:user@example.ru");
    assert.equal(createEmailHref("invalid"), "");
});

test("accepts Telegram usernames and official Telegram links", () => {
    assert.equal(createTelegramHref("@native_places"), "https://t.me/native_places");
    assert.equal(
        createTelegramHref("https://t.me/native_places"),
        "https://t.me/native_places"
    );
    assert.equal(createTelegramHref("https://example.com/native_places"), "");
});

test("normalizes public website links and rejects unsafe schemes", () => {
    assert.equal(createWebsiteHref("native-places.ru"), "https://native-places.ru/");
    assert.equal(createWebsiteHref("javascript:alert(1)"), "");
});
