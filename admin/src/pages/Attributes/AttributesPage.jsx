import { useEffect, useMemo, useState } from "react";

import { AttributeForm } from "./components/AttributeForm";
import { AttributesTable } from "./components/AttributesTable";

import { attributesApi } from "../../shared/api/attributesApi";
import { useAdminAuth } from "../../context/useAdminAuth";

import "./AttributesPage.css";

const emptyAttributeForm = {
    categoryCode: "",
    title: "",
    key: "",
    fieldType: "",
    isRequired: false,
};

function mapCategoryFromApi(category) {
    return {
        id: Number(category.id),
        code: category.code,
        title: category.title,
    };
}

function mapFieldTypeFromApi(fieldType) {
    return {
        value: fieldType.value,
        title: fieldType.title,
    };
}

function mapAttributeFromApi(attribute, fieldTypes) {
    const fieldType = fieldTypes.find((item) => item.value === attribute.field_type);

    return {
        ...attribute,
        categoryCode: attribute.category_code || "",
        categoryTitle: attribute.category_title || "—",
        key: attribute.code || "",
        fieldType: attribute.field_type || "",
        fieldTypeTitle: fieldType?.title || attribute.field_type || "—",
        isRequired: Number(attribute.is_required) === 1,
    };
}

export function AttributesPage() {
    const { role } = useAdminAuth();
    const canManageAttributes = role === "admin";

    const [attributes, setAttributes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fieldTypes, setFieldTypes] = useState([]);

    const [form, setForm] = useState(emptyAttributeForm);
    const [editingAttributeId, setEditingAttributeId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const isEditing = editingAttributeId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadInitialData() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await attributesApi.getAttributes();

                const mappedFieldTypes = (data.field_types || []).map(mapFieldTypeFromApi);

                if (isMounted) {
                    setFieldTypes(mappedFieldTypes);
                    setCategories((data.categories || []).map(mapCategoryFromApi));
                    setAttributes(
                        (data.attributes || []).map((attribute) => (
                            mapAttributeFromApi(attribute, mappedFieldTypes)
                        ))
                    );
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить характеристики");
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
        const data = await attributesApi.getAttributes();
        const mappedFieldTypes = (data.field_types || []).map(mapFieldTypeFromApi);

        setFieldTypes(mappedFieldTypes);
        setCategories((data.categories || []).map(mapCategoryFromApi));
        setAttributes(
            (data.attributes || []).map((attribute) => (
                mapAttributeFromApi(attribute, mappedFieldTypes)
            ))
        );
    }

    const categoryStats = useMemo(() => (
        categories.map((category) => ({
            ...category,
            attributesCount: attributes.filter((attribute) => (
                attribute.categoryCode === category.code
            )).length,
        }))
    ), [attributes, categories]);

    const filteredAttributes = useMemo(() => {
        if (categoryFilter === "all") {
            return attributes;
        }

        return attributes.filter(
            (attribute) => attribute.categoryCode === categoryFilter
        );
    }, [attributes, categoryFilter]);

    function handleFormChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(emptyAttributeForm);
        setEditingAttributeId(null);
    }

    function handleEdit(attribute) {
        setEditingAttributeId(attribute.id);

        setForm({
            categoryCode: attribute.categoryCode,
            title: attribute.title || "",
            key: attribute.key || "",
            fieldType: attribute.fieldType || "",
            isRequired: attribute.isRequired,
        });
    }

    async function handleDelete(attribute) {
        try {
            setIsSaving(true);
            setErrorMessage("");

            await attributesApi.deleteAttribute(attribute.id);

            if (editingAttributeId === attribute.id) {
                resetForm();
            }

            await reloadData();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось удалить характеристику");
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
                code: form.key,
                field_type: form.fieldType,
                is_required: form.isRequired ? 1 : 0,
            };

            if (isEditing) {
                await attributesApi.updateAttribute({
                    id: editingAttributeId,
                    ...payload,
                });
            } else {
                await attributesApi.createAttribute(payload);
            }

            resetForm();
            await reloadData();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось сохранить характеристику");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page attributes-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Характеристики</p>

                    <h2>Динамические поля объявлений</h2>

                    <p>
                        Управление полями, которые появляются в форме создания объявления
                        в зависимости от выбранной категории.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="attributes-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="attributes-empty">
                    Загружаем характеристики...
                </div>
            ) : (
                <>
                    <div className="attributes-stats">
                        {categoryStats.map((category) => (
                            <article className="attributes-stat-card" key={category.code}>
                                <span>{category.title}</span>
                                <strong>{category.attributesCount}</strong>
                            </article>
                        ))}
                    </div>
                    <div className="attributes-filter">
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                        >
                            <option value="all">Все категории</option>

                            {categories.map((category) => (
                                <option
                                    key={category.code}
                                    value={category.code}
                                >
                                    {category.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <AttributesTable
                        attributes={filteredAttributes}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </>
            )}

            {canManageAttributes ? (
                <AttributeForm
                    categories={categories}
                    fieldTypes={fieldTypes}
                    form={form}
                    isEditing={isEditing}
                    isSaving={isSaving}
                    onChange={handleFormChange}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                />
            ) : null}
        </section>
    );
}