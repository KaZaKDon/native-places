import { useEffect, useState } from "react";

import { PlaceTypeForm } from "./components/PlaceTypeForm";
import { PlaceTypesTable } from "./components/PlaceTypesTable";

import { placeTypesApi } from "../../shared/api/placeTypesApi";

import "./PlaceTypesPage.css";

const emptyPlaceTypeForm = {
    categoryCode: "",
    title: "",
    code: "",
};

function mapTypeFromApi(type) {
    return {
        ...type,
        categoryCode: type.category_code || "",
        categoryTitle: type.category_title || "—",
        placesCount: Number(type.places_count || 0),
        isActive: Number(type.is_active) === 1,
    };
}

function mapCategoryFromApi(category) {
    return {
        id: Number(category.id),
        code: category.code,
        title: category.title,
    };
}

export function PlaceTypesPage() {
    const [placeTypes, setPlaceTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(emptyPlaceTypeForm);
    const [editingTypeId, setEditingTypeId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const isEditing = editingTypeId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadInitialData() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await placeTypesApi.getPlaceTypes();

                if (isMounted) {
                    setPlaceTypes((data.types || []).map(mapTypeFromApi));
                    setCategories((data.categories || []).map(mapCategoryFromApi));
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить типы объектов");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    async function reloadData() {
        const data = await placeTypesApi.getPlaceTypes();

        setPlaceTypes((data.types || []).map(mapTypeFromApi));
        setCategories((data.categories || []).map(mapCategoryFromApi));
    }

    function handleFormChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(emptyPlaceTypeForm);
        setEditingTypeId(null);
    }

    function handleEdit(type) {
        setEditingTypeId(type.id);

        setForm({
            categoryCode: type.categoryCode,
            title: type.title || "",
            code: type.code || "",
        });
    }

    async function handleToggleActive(type) {
        const nextIsActive = !type.isActive;

        if (!nextIsActive && type.placesCount > 0) {
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage("");

            await placeTypesApi.togglePlaceTypeActive(type.id, nextIsActive);

            if (!nextIsActive && editingTypeId === type.id) {
                resetForm();
            }

            await reloadData();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось изменить статус типа объекта");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const category = categories.find((item) => item.code === form.categoryCode);

        if (!category) {
            setErrorMessage("Выберите категорию");
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage("");

            const payload = {
                category_id: category.id,
                title: form.title,
                code: form.code,
            };

            if (isEditing) {
                await placeTypesApi.updatePlaceType({
                    id: editingTypeId,
                    ...payload,
                });
            } else {
                await placeTypesApi.createPlaceType(payload);
            }

            resetForm();
            await reloadData();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось сохранить тип объекта");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page place-types-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Типы объектов</p>

                    <h2>Типы объектов внутри категорий</h2>

                    <p>
                        Управление подтипами объявлений. Тип объекта уточняет,
                        что именно пользователь размещает внутри выбранной категории.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="place-types-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="place-types-empty">
                    Загружаем типы объектов...
                </div>
            ) : (
                <PlaceTypesTable
                    placeTypes={placeTypes}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                />
            )}

            <PlaceTypeForm
                categories={categories}
                form={form}
                isEditing={isEditing}
                isSaving={isSaving}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
                onCancel={resetForm}
            />
        </section>
    );
}