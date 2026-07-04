import { useEffect, useState } from "react";

import { CategoriesTable } from "./components/CategoriesTable";
import { CategoryForm } from "./components/CategoryForm";

import { categoriesApi } from "../../shared/api/categoriesApi";

import "./CategoriesPage.css";

const emptyCategoryForm = {
    title: "",
    code: "",
    description: "",
};

function mapCategoryFromApi(category) {
    return {
        ...category,
        placesCount: Number(category.places_count || 0),
        isActive: Number(category.is_active) === 1,
    };
}

export function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(emptyCategoryForm);
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const isEditing = editingCategoryId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadInitialCategories() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await categoriesApi.getCategories();

                if (isMounted) {
                    setCategories((data.categories || []).map(mapCategoryFromApi));
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить категории");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadInitialCategories();

        return () => {
            isMounted = false;
        };
    }, []);

    async function reloadCategories() {
        const data = await categoriesApi.getCategories();
        setCategories((data.categories || []).map(mapCategoryFromApi));
    }

    function handleFormChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(emptyCategoryForm);
        setEditingCategoryId(null);
    }

    function handleEdit(category) {
        setEditingCategoryId(category.id);

        setForm({
            title: category.title || "",
            code: category.code || "",
            description: category.description || "",
        });
    }

    async function handleToggleActive(category) {
        const nextIsActive = !category.isActive;

        if (!nextIsActive && category.placesCount > 0) {
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage("");

            await categoriesApi.toggleCategoryActive(category.id, nextIsActive);

            if (!nextIsActive && editingCategoryId === category.id) {
                resetForm();
            }

            await reloadCategories();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось изменить статус категории");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setIsSaving(true);
            setErrorMessage("");

            const payload = {
                ...form,
            };

            if (isEditing) {
                await categoriesApi.updateCategory({
                    id: editingCategoryId,
                    ...payload,
                });
            } else {
                await categoriesApi.createCategory(payload);
            }

            resetForm();
            await reloadCategories();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось сохранить категорию");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page categories-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Категории</p>

                    <h2>Категории объявлений</h2>

                    <p>
                        Управление основными разделами Native Places. Категории
                        используются в объявлениях, фильтрах и публичной структуре сайта.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="categories-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="categories-empty">
                    Загружаем категории...
                </div>
            ) : (
                <CategoriesTable
                    categories={categories}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                />
            )}

            <CategoryForm
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