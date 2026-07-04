import test from "node:test";
import assert from "node:assert/strict";

import { validateSubmitForm } from "./submitFormValidation.js";

const validForm = {
    title: "Дом в Вёшенской",
    categoryId: 1,
    placeTypeId: 1,
    localityId: 3,
    hasLocation: true,
    planId: 8,
    requiresPlan: true,
};

test("returns empty message for a valid submit form", () => {
    assert.equal(validateSubmitForm(validForm), "");
});

test("requires title", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, title: "   " }),
        "Укажите название объекта."
    );
});

test("requires category", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, categoryId: null }),
        "Не удалось определить категорию объекта."
    );
});

test("requires place type", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, placeTypeId: null }),
        "Не удалось определить тип объекта."
    );
});

test("requires locality", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, localityId: 0 }),
        "Выберите населённый пункт."
    );
});

test("requires map location", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, hasLocation: false }),
        "Укажите точку на карте."
    );
});


test("requires plan when plan selection is required", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, planId: null }),
        "Выберите тариф размещения."
    );
});

test("does not require plan when plan selection is disabled", () => {
    assert.equal(
        validateSubmitForm({ ...validForm, planId: null, requiresPlan: false }),
        ""
    );
});
