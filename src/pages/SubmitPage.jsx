import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { localitiesApi } from "../shared/api/localitiesApi";
import { validateSubmitForm } from "./submitFormValidation";
import { useDebouncedValue } from "../shared/search/useDebouncedValue";
import { myPlacesApi } from "../shared/api/myPlacesApi";
import { paymentsApi } from "../shared/api/paymentsApi";
import { submitOptionsApi } from "../shared/api/submitOptionsApi";
import { Seo } from "../shared/seo/Seo";
import {
    clearSubmitDraft,
    getSubmitDraft,
    saveSubmitDraft,
} from "../shared/storage/submitDraftStorage";
import {
    clearSubmitLocation,
    getSubmitLocation,
} from "../shared/storage/submitLocationStorage";

import "./SubmitPage.css";


function formatLocalityOption(locality) {
    if (!locality) {
        return "";
    }

    return [
        locality.title,
        locality.districtTitle || locality.district,
        locality.regionTitle || locality.region,
    ]
        .filter(Boolean)
        .join(", ");
}

function getFormDataFromPlace(place) {
    const contactValue =
        place?.contact?.phone ||
        place?.contact?.telegram ||
        place?.contact?.email ||
        "";

    return {
        title: place?.title ?? "",
        shortDescription: place?.shortDescription ?? place?.description ?? "",
        fullDescription: place?.fullDescription ?? "",
        address: place?.address ?? place?.locality ?? "",
        contactName: place?.contact?.name ?? "",
        contactValue,
    };
}

function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(String(reader.result));
        };

        reader.readAsDataURL(file);
    });
}

function createLocalGalleryItem(dataUrl, file) {
    return {
        id: null,
        url: dataUrl,
        file,
        isCover: false,
        isUploaded: false,
    };
}

function formatPlanDuration(days) {
    const value = Number(days || 0);

    if (!value) {
        return "Бессрочно";
    }

    if (value === 14) {
        return "14 дней";
    }

    if (value === 30) {
        return "30 дней";
    }

    return `${value} дн.`;
}

function formatPlanPrice(price) {
    const value = Number(price || 0);

    if (!value) {
        return "Бесплатно";
    }

    return `${value.toLocaleString("ru-RU")} ₽`;
}

function getPlanBadge(plan) {
    if (!Number(plan?.price || 0)) {
        return "Промо";
    }

    return "Платный";
}

function getContactFields(contactValue) {
    const value = contactValue.trim();

    if (!value) {
        return {
            phone: "",
            telegram: "",
            email: "",
        };
    }

    if (value.includes("@") && !value.startsWith("@")) {
        return {
            phone: "",
            telegram: "",
            email: value,
        };
    }

    if (value.startsWith("@") || value.toLowerCase().includes("t.me")) {
        return {
            phone: "",
            telegram: value,
            email: "",
        };
    }

    return {
        phone: value,
        telegram: "",
        email: "",
    };
}

export function SubmitPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const editPlaceId = searchParams.get("edit");
    const initialDraft = editPlaceId ? null : getSubmitDraft();

    const [editingPlace, setEditingPlace] = useState(null);
    const [editingLoading, setEditingLoading] = useState(Boolean(editPlaceId));
    const [editingError, setEditingError] = useState("");

    const isEditMode = Boolean(editPlaceId && editingPlace);

    const [submitCategories, setSubmitCategories] = useState([]);
    const [submitTypes, setSubmitTypes] = useState([]);
    const [submitPlans, setSubmitPlans] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [optionsError, setOptionsError] = useState("");

    const [localities, setLocalities] = useState([]);
    const [localitiesLoading, setLocalitiesLoading] = useState(true);
    const [localitiesError, setLocalitiesError] = useState("");

    const [attributeDefinitions, setAttributeDefinitions] = useState([]);
    const [attributesLoading, setAttributesLoading] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState(() => {
        return initialDraft?.selectedCategory ?? "";
    });

    const [selectedType, setSelectedType] = useState(() => {
        return initialDraft?.selectedType ?? "";
    });

    const [selectedPlan, setSelectedPlan] = useState(() => {
        return initialDraft?.selectedPlan ?? "";
    });

    const [selectedLocality, setSelectedLocality] = useState(() => {
        return initialDraft?.selectedLocality ?? "";
    });

    const [localitySearch, setLocalitySearch] = useState(() => {
        return initialDraft?.localitySearch ?? "";
    });

    const [isLocalityMenuOpen, setIsLocalityMenuOpen] = useState(false);
    const debouncedLocalitySearch = useDebouncedValue(localitySearch, 300)

    const [formData, setFormData] = useState(() => {
        return initialDraft?.formData ?? getFormDataFromPlace(null);
    });

    const [extraFields, setExtraFields] = useState(() => {
        return initialDraft?.extraFields ?? {};
    });

    const [gallery, setGallery] = useState(() => {
        return initialDraft?.gallery ?? [];
    });

    const [submitStatus, setSubmitStatus] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [submitLocation] = useState(() => {
        return getSubmitLocation();
    });

    useEffect(() => {
        let isMounted = true;

        async function loadOptions() {
            try {
                const data = await submitOptionsApi.getCreateOptions();

                if (!isMounted) {
                    return;
                }

                setSubmitCategories(
                    Array.isArray(data.categories) ? data.categories : []
                );

                const normalizedPlans = Array.isArray(data.plans) ? data.plans : [];

                setSubmitTypes(Array.isArray(data.types) ? data.types : []);
                setSubmitPlans(normalizedPlans);

                if (!editPlaceId && !initialDraft?.selectedPlan && normalizedPlans.length > 0) {
                    setSelectedPlan(String(normalizedPlans[0].id));
                }

                setOptionsError("");
            } catch (error) {
                console.error("Не удалось загрузить справочники формы:", error);

                if (isMounted) {
                    setOptionsError(
                        error.message ||
                        "Не удалось загрузить категории и типы объектов."
                    );
                }
            } finally {
                if (isMounted) {
                    setOptionsLoading(false);
                }
            }
        }

        loadOptions();

        return () => {
            isMounted = false;
        };
    }, [editPlaceId, initialDraft?.selectedPlan]);

    useEffect(() => {
        let isMounted = true;
        const query = debouncedLocalitySearch.trim();

        if (!isLocalityMenuOpen && query === "") {
            return () => {
                isMounted = false;
            };
        }

        if (query.length === 1) {
            return () => {
                isMounted = false;
            };
        }

        async function loadLocalities() {
            setLocalitiesLoading(true);

            try {
                const data = await localitiesApi.getLocalities({
                    q: query,
                    limit: query ? 10 : 20,
                });

                if (!isMounted) {
                    return;
                }

                setLocalities(
                    Array.isArray(data.localities) ? data.localities : []
                );
                setLocalitiesError("");
            } catch (error) {
                console.error("Не удалось загрузить населённые пункты:", error);

                if (isMounted) {
                    setLocalities([]);
                    setLocalitiesError(
                        error.message || "Не удалось загрузить населённые пункты."
                    );
                }
            } finally {
                if (isMounted) {
                    setLocalitiesLoading(false);
                }
            }
        }

        loadLocalities();

        return () => {
            isMounted = false;
        };
    }, [debouncedLocalitySearch, isLocalityMenuOpen]);

    useEffect(() => {
        let isMounted = true;

        async function loadEditingPlace() {
            if (!editPlaceId) {
                setEditingLoading(false);
                return;
            }

            setEditingLoading(true);
            setEditingError("");

            try {
                const data = await myPlacesApi.getMyPlace(editPlaceId);

                if (!isMounted) {
                    return;
                }

                if (!data.place) {
                    setEditingPlace(null);
                    setEditingError("Объект не найден или нет доступа.");
                    return;
                }

                const place = data.place;

                setEditingPlace(place);
                setSelectedCategory(place.categorySlug || "");
                setSelectedType(place.typeSlug || "");
                setSelectedLocality(place.localityId ? String(place.localityId) : "");
                setLocalitySearch(formatLocalityOption({
                    title: place.localityTitle || place.locality || "",
                    district: place.localityDistrict || "",
                    region: place.localityRegion || "",
                }));
                setFormData(getFormDataFromPlace(place));
                setExtraFields(place.extraFields || {});
                setGallery(Array.isArray(place.gallery) ? place.gallery : []);
            } catch (error) {
                console.error("Не удалось загрузить объект для редактирования:", error);

                if (isMounted) {
                    setEditingPlace(null);
                    setEditingError(
                        error.message ||
                        "Не удалось загрузить объект для редактирования."
                    );
                }
            } finally {
                if (isMounted) {
                    setEditingLoading(false);
                }
            }
        }

        loadEditingPlace();

        return () => {
            isMounted = false;
        };
    }, [editPlaceId]);

    const categoryTypes = useMemo(() => {
        if (!selectedCategory) {
            return [];
        }

        return submitTypes.filter((type) => {
            return type.category_code === selectedCategory;
        });
    }, [selectedCategory, submitTypes]);

    const selectedCategoryItem = useMemo(() => {
        return submitCategories.find((category) => {
            return category.code === selectedCategory;
        });
    }, [selectedCategory, submitCategories]);

    const selectedTypeItem = useMemo(() => {
        return submitTypes.find((type) => {
            return type.code === selectedType;
        });
    }, [selectedType, submitTypes]);

    const selectedPlanItem = useMemo(() => {
        return submitPlans.find((plan) => {
            return String(plan.id) === String(selectedPlan);
        });
    }, [selectedPlan, submitPlans]);

    const selectedLocalityItem = useMemo(() => {
        if (!selectedLocality) {
            return null;
        }

        return localities.find((locality) => {
            return String(locality.id) === String(selectedLocality);
        }) || null;
    }, [selectedLocality, localities]);

    const hasSubmitOptions =
        submitCategories.length > 0 &&
        submitTypes.length > 0 &&
        (isEditMode || submitPlans.length > 0);
    const isFormBootstrapLoading = editingLoading || (optionsLoading && !hasSubmitOptions);

    const localityHasSearch = localitySearch.trim().length > 0;
    const isLocalityQueryTooShort =
        localityHasSearch && debouncedLocalitySearch.trim().length < 2;
    const shouldShowLocalityEmptyState =
        !localitiesLoading &&
        localityHasSearch &&
        debouncedLocalitySearch.trim().length >= 2 &&
        localities.length === 0;

    useEffect(() => {
        let isMounted = true;

        async function loadAttributeDefinitions() {
            if (!selectedCategoryItem?.id) {
                setAttributeDefinitions([]);
                return;
            }

            setAttributesLoading(true);

            try {
                const data = await myPlacesApi.getAttributeDefinitions(
                    selectedCategoryItem.id
                );

                if (!isMounted) {
                    return;
                }

                setAttributeDefinitions(
                    Array.isArray(data.attributes) ? data.attributes : []
                );
            } catch (error) {
                console.error("Не удалось загрузить характеристики:", error);

                if (isMounted) {
                    setAttributeDefinitions([]);
                }
            } finally {
                if (isMounted) {
                    setAttributesLoading(false);
                }
            }
        }

        loadAttributeDefinitions();

        return () => {
            isMounted = false;
        };
    }, [selectedCategoryItem]);

    function getCurrentDraft() {
        return {
            selectedCategory,
            selectedType,
            selectedPlan,
            selectedLocality,
            localitySearch,
            formData,
            extraFields,
            gallery,
            updatedAt: new Date().toISOString(),
        };
    }

    function handleSaveDraftBeforeLocation() {
        if (isEditMode) {
            return;
        }

        saveSubmitDraft(getCurrentDraft());
    }

    function handleSelectCategory(categoryCode) {
        setSelectedCategory(categoryCode);
        setSelectedType("");
        setExtraFields({});
        setSubmitStatus("");
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }));

        setSubmitStatus("");
    }

    function handleLocalitySearchChange(event) {
        setLocalitySearch(event.target.value);
        setSelectedLocality("");
        setIsLocalityMenuOpen(true);
        setSubmitStatus("");
    }

    function handleSelectLocality(locality) {
        setSelectedLocality(String(locality.id));
        setLocalitySearch(formatLocalityOption(locality));
        setIsLocalityMenuOpen(false);
        setSubmitStatus("");
    }

    function handleExtraFieldChange(event) {
        const { name, value } = event.target;

        setExtraFields((currentFields) => ({
            ...currentFields,
            [name]: value,
        }));

        setSubmitStatus("");
    }

    async function handleImagesChange(event) {
        const files = Array.from(event.target.files ?? []);

        if (files.length === 0) {
            return;
        }

        const images = await Promise.all(files.map(readFileAsDataUrl));

        const galleryItems = images.map((image, index) =>
            createLocalGalleryItem(image, files[index])
        );

        setGallery((currentGallery) => [...currentGallery, ...galleryItems]);
        setSubmitStatus("");

        event.target.value = "";
    }

    async function handleRemoveImage(indexToRemove) {
        const image = gallery[indexToRemove];

        if (!image) {
            return;
        }

        if (image.isUploaded && image.id) {
            const isConfirmed = window.confirm("Удалить эту фотографию?");

            if (!isConfirmed) {
                return;
            }

            try {
                await myPlacesApi.deleteMyPlaceImage(image.id);

                setGallery((currentGallery) =>
                    currentGallery.filter((_, index) => index !== indexToRemove)
                );

                setSubmitStatus("Фотография удалена.");
            } catch (error) {
                console.error(error);
                setSubmitStatus(error.message || "Не удалось удалить фотографию.");
            }

            return;
        }

        setGallery((currentGallery) =>
            currentGallery.filter((_, index) => index !== indexToRemove)
        );
    }

    async function handleSetCoverImage(index) {
        const image = gallery[index];

        if (!image?.isUploaded || !image.id) {
            setSubmitStatus(
                "Новую фотографию можно сделать обложкой после сохранения объявления."
            );
            return;
        }

        try {
            await myPlacesApi.setMyPlaceCoverImage(image.id);

            setGallery((currentGallery) =>
                currentGallery.map((galleryItem) => ({
                    ...galleryItem,
                    isCover: galleryItem.id === image.id,
                }))
            );

            setSubmitStatus("Обложка обновлена.");
        } catch (error) {
            console.error(error);
            setSubmitStatus(error.message || "Не удалось обновить обложку.");
        }
    }

    async function handleMoveImage(index, direction) {
        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= gallery.length) {
            return;
        }

        const currentImage = gallery[index];
        const targetImage = gallery[targetIndex];

        if (!currentImage?.isUploaded || !targetImage?.isUploaded) {
            setSubmitStatus(
                "Порядок новых фотографий можно изменить после сохранения объявления."
            );
            return;
        }

        const nextGallery = [...gallery];
        [nextGallery[index], nextGallery[targetIndex]] = [
            nextGallery[targetIndex],
            nextGallery[index],
        ];

        const imageIds = nextGallery
            .filter((image) => image.isUploaded && image.id)
            .map((image) => image.id);

        try {
            setGallery(nextGallery);

            await myPlacesApi.reorderMyPlaceImages(editPlaceId, imageIds);

            setSubmitStatus("Порядок фотографий обновлён.");
        } catch (error) {
            console.error(error);

            setGallery(gallery);
            setSubmitStatus(
                error.message || "Не удалось изменить порядок фотографий."
            );
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const currentCategoryId = selectedCategoryItem?.id ?? editingPlace?.categoryId;
        const currentPlaceTypeId = selectedTypeItem?.id ?? editingPlace?.placeTypeId;
        const currentLocalityId = Number(selectedLocality || 0);
        const currentPlanId = Number(selectedPlanItem?.id || 0);
        const validationMessage = validateSubmitForm({
            title: formData.title,
            categoryId: currentCategoryId,
            placeTypeId: currentPlaceTypeId,
            localityId: currentLocalityId,
            hasLocation: Boolean(submitLocation || editingPlace?.position),
            planId: currentPlanId,
            requiresPlan: !isEditMode,
        });

        if (validationMessage) {
            setSubmitStatus(validationMessage);
            return;
        }

        const position = submitLocation
            ? [submitLocation.lat, submitLocation.lng]
            : editingPlace.position;

        const contactFields = getContactFields(formData.contactValue);

        setIsSubmitting(true);
        setSubmitStatus(
            isEditMode ? "Сохраняем изменения..." : "Сохраняем объект..."
        );

        try {
            let placeId = editPlaceId;
            let createdPlace = null;

            if (!isEditMode) {
                createdPlace = await myPlacesApi.createMyPlace({
                    title: formData.title.trim(),
                    categoryId: currentCategoryId,
                    placeTypeId: currentPlaceTypeId,
                    localityId: currentLocalityId,
                    planId: currentPlanId,
                });

                placeId = createdPlace.place_id;
            }

            await myPlacesApi.updateMyPlace({
                id: placeId,
                title: formData.title.trim(),
                shortDescription: formData.shortDescription.trim(),
                fullDescription: formData.fullDescription.trim(),
                address: formData.address.trim(),
                localityId: currentLocalityId,
                latitude: position[0],
                longitude: position[1],
                contactName: formData.contactName.trim(),
                phone: contactFields.phone,
                telegram: contactFields.telegram,
                email: contactFields.email,
                website: editingPlace?.contact?.website || "",
                bookingType: editingPlace?.bookingType || "phone",
                bookingUrl: editingPlace?.bookingUrl || "",
            });

            const attributes = attributeDefinitions.map((field) => ({
                attribute_definition_id: field.id,
                value: extraFields[String(field.id)] ?? "",
            }));

            if (attributes.length > 0) {
                await myPlacesApi.saveMyPlaceAttributes(placeId, attributes);
            }

            const newImages = gallery.filter((image) => !image.isUploaded && image.file);

            if (newImages.length > 0) {
                setSubmitStatus("Загружаем фотографии...");

                for (const image of newImages) {
                    await myPlacesApi.uploadMyPlaceImage(placeId, image.file);
                }
            }

            clearSubmitDraft();
            clearSubmitLocation();

            if (!isEditMode && createdPlace?.payment_required) {
                setSubmitStatus("Создаём ссылку на оплату...");

                const payment = await paymentsApi.createPayment({
                    paymentId: createdPlace.payment_id,
                    placeId,
                    planId: currentPlanId,
                    returnUrl: `${window.location.origin}/account`,
                });

                if (payment.confirmationUrl) {
                    window.location.href = payment.confirmationUrl;
                    return;
                }

                window.alert(
                    payment.message ||
                        "Объект сохранён, но ссылка оплаты пока не получена."
                );
            }

            setSubmitStatus(
                isEditMode
                    ? "Изменения сохранены и отправлены на модерацию."
                    : "Объект отправлен на модерацию."
            );

            navigate("/account");
        } catch (error) {
            console.error(error);
            setSubmitStatus(error.message || "Не удалось сохранить объект.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isFormBootstrapLoading) {
        return (
            <main className="submit-page">
                <section className="submit-hero">
                    <div className="submit-hero__content">
                        <Link className="submit-page__back" to="/account">
                            ← В кабинет
                        </Link>

                        <p className="submit-page__eyebrow">
                            {editPlaceId ? "Редактирование" : "Добавление"}
                        </p>

                        <h1>Загружаем форму</h1>

                        <p className="submit-hero__lead">
                            Получаем категории, типы объектов, населённые пункты
                            и данные объявления.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    if (editPlaceId && editingError) {
        return (
            <main className="submit-page">
                <section className="submit-hero">
                    <div className="submit-hero__content">
                        <Link className="submit-page__back" to="/account">
                            ← В кабинет
                        </Link>

                        <p className="submit-page__eyebrow">Редактирование</p>

                        <h1>Не удалось открыть объявление</h1>

                        <p className="submit-hero__lead">{editingError}</p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <>
            <Seo
                title={`${isEditMode ? "Редактировать место" : "Добавить место"} | Native Places`}
                description="Форма добавления и редактирования места на Native Places."
                canonical="https://native-places.ru/submit"
                robots="noindex, nofollow"
            />
        <main className="submit-page">
            <section className="submit-hero">
                <div className="submit-hero__content">
                    <Link
                        className="submit-page__back"
                        to={isEditMode ? "/account" : "/categories"}
                    >
                        {isEditMode ? "← В кабинет" : "← Назад к категориям"}
                    </Link>

                    <p className="submit-page__eyebrow">
                        {isEditMode ? "Редактировать место" : "Добавить место"}
                    </p>

                    <h1>
                        {isEditMode
                            ? "Обновите информацию об объекте"
                            : "Расскажите о месте, объекте или объявлении"}
                    </h1>

                    <p className="submit-hero__lead">
                        {isEditMode
                            ? "Изменения сохранятся в базе данных."
                            : "Добавьте точку на карту: природное место, рыбалку, охоту, базу отдыха, аренду или недвижимость."}
                    </p>
                </div>

                <form className="submit-form" onSubmit={handleSubmit}>
                    <section className="submit-form__section">
                        <h2>Основная информация</h2>

                        <label className="submit-form__field">
                            <span>Название</span>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                placeholder="Например, Дом в Вёшенской"
                                onChange={handleFormChange}
                            />
                        </label>

                        <div className="submit-form__field">
                            <span>Категория</span>

                            <div className="submit-category-grid">
                                {submitCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        className={
                                            selectedCategory === category.code
                                                ? "submit-category is-active"
                                                : "submit-category"
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleSelectCategory(category.code)
                                        }
                                        disabled={isEditMode}
                                    >
                                        {category.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {categoryTypes.length > 0 && (
                            <div className="submit-form__field">
                                <span>Тип объекта</span>

                                <div className="submit-type-grid">
                                    {categoryTypes.map((type) => (
                                        <button
                                            key={type.id}
                                            className={
                                                selectedType === type.code
                                                    ? "submit-type is-active"
                                                    : "submit-type"
                                            }
                                            type="button"
                                            onClick={() =>
                                                setSelectedType(type.code)
                                            }
                                            disabled={isEditMode}
                                        >
                                            {type.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <label className="submit-form__field">
                            <span>Краткое описание</span>
                            <textarea
                                rows="3"
                                name="shortDescription"
                                value={formData.shortDescription}
                                placeholder="Коротко: что это за место и чем оно интересно"
                                onChange={handleFormChange}
                            />
                        </label>

                        <label className="submit-form__field">
                            <span>Полное описание</span>
                            <textarea
                                rows="5"
                                name="fullDescription"
                                value={formData.fullDescription}
                                placeholder="Расскажите подробнее"
                                onChange={handleFormChange}
                            />
                        </label>
                    </section>

                    {attributesLoading && (
                        <section className="submit-form__section">
                            <h2>Детали категории</h2>
                            <p>Загружаем поля категории...</p>
                        </section>
                    )}

                    {!attributesLoading && attributeDefinitions.length > 0 && (
                        <section className="submit-form__section">
                            <h2>Детали категории</h2>

                            <div className="submit-form__grid">
                                {attributeDefinitions.map((field) => (
                                    <label
                                        className="submit-form__field"
                                        key={field.id}
                                    >
                                        <span>{field.title}</span>

                                        {field.field_type === "textarea" ? (
                                            <textarea
                                                rows="3"
                                                name={String(field.id)}
                                                value={
                                                    extraFields[
                                                    String(field.id)
                                                    ] ?? ""
                                                }
                                                placeholder={field.title}
                                                onChange={
                                                    handleExtraFieldChange
                                                }
                                            />
                                        ) : (
                                            <input
                                                type={
                                                    field.field_type ===
                                                        "number"
                                                        ? "number"
                                                        : "text"
                                                }
                                                name={String(field.id)}
                                                value={
                                                    extraFields[
                                                    String(field.id)
                                                    ] ?? ""
                                                }
                                                placeholder={field.title}
                                                onChange={
                                                    handleExtraFieldChange
                                                }
                                            />
                                        )}
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}

                    {!isEditMode && (
                        <section className="submit-form__section">
                            <h2>Тариф размещения</h2>
                            <p className="submit-form__note submit-form__note--top">
                                На период развития проекта тарифы доступны бесплатно на 3 - 4 месяца. После этого тариф один останется бесплатным, остальные бубут платными. По всем вопросам обращайтесь к администрации.
                            </p>

                            <div className="submit-plan-grid">
                                {submitPlans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        className={
                                            String(selectedPlan) === String(plan.id)
                                                ? "submit-plan is-active"
                                                : "submit-plan"
                                        }
                                        type="button"
                                        onClick={() => {
                                            setSelectedPlan(String(plan.id));
                                            setSubmitStatus("");
                                        }}
                                    >
                                        <span className="submit-plan__badge">
                                            {getPlanBadge(plan)}
                                        </span>
                                        <strong>{plan.title}</strong>
                                        <span>{plan.description}</span>
                                        <small>
                                            До {Number(plan.max_places || 0) || "∞"} объявл. · {formatPlanDuration(plan.duration_days)}
                                        </small>
                                        <b>{formatPlanPrice(plan.price)}</b>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="submit-form__section">
                        <h2>Локация и фото</h2>

                        <div className="submit-form__field submit-locality-field">
                            <span>Населённый пункт</span>

                            <div className="submit-locality-combobox">
                                <input
                                    type="text"
                                    name="localitySearch"
                                    value={localitySearch}
                                    placeholder="Начните вводить: Шахты, Вёшенская, Ростов..."
                                    autoComplete="off"
                                    onChange={handleLocalitySearchChange}
                                    onFocus={() => setIsLocalityMenuOpen(true)}
                                />

                                {selectedLocalityItem && (
                                    <strong className="submit-locality-combobox__selected">
                                        Выбрано: {formatLocalityOption(selectedLocalityItem)}
                                    </strong>
                                )}

                                {isLocalityMenuOpen && (
                                    <div className="submit-locality-combobox__menu">
                                        {localitiesLoading && (
                                            <p className="submit-locality-combobox__message">
                                                Ищем населённые пункты...
                                            </p>
                                        )}

                                        {isLocalityQueryTooShort && (
                                            <p className="submit-locality-combobox__message">
                                                Введите минимум 2 символа для поиска.
                                            </p>
                                        )}

                                        {!localitiesLoading &&
                                            !isLocalityQueryTooShort &&
                                            localities.map((locality) => (
                                                <button
                                                    key={locality.id}
                                                    type="button"
                                                    className="submit-locality-option"
                                                    onClick={() =>
                                                        handleSelectLocality(locality)
                                                    }
                                                >
                                                    <strong>{locality.title}</strong>
                                                    <span>
                                                        {[
                                                            locality.districtTitle || locality.district,
                                                            locality.regionTitle || locality.region,
                                                            locality.countryTitle,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(", ")}
                                                    </span>
                                                </button>
                                            ))}

                                        {shouldShowLocalityEmptyState && (
                                            <p className="submit-locality-combobox__message">
                                                Не нашли населённый пункт? Напишите
                                                администратору — добавим.
                                            </p>
                                        )}

                                        {localitiesError && (
                                            <p className="submit-locality-combobox__message is-error">
                                                {localitiesError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <small>
                                Выберите вариант из списка. Если нужного населённого
                                пункта нет, напишите администратору — добавим его в
                                справочник.
                            </small>
                        </div>

                        <label className="submit-form__field">
                            <span>Адрес или ориентир</span>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                placeholder="Например, Ростовская область, станица Вёшенская"
                                onChange={handleFormChange}
                            />
                        </label>

                        <div className="submit-location-box">
                            <div>
                                <span>Точка на карте</span>

                                {submitLocation ? (
                                    <strong>
                                        {submitLocation.lat},{" "}
                                        {submitLocation.lng}
                                    </strong>
                                ) : editingPlace?.position ? (
                                    <strong>
                                        {editingPlace.position[0]},{" "}
                                        {editingPlace.position[1]}
                                    </strong>
                                ) : (
                                    <strong>Точка пока не выбрана</strong>
                                )}
                            </div>

                            <Link
                                className="submit-location-box__button"
                                to="/submit/location"
                                onClick={handleSaveDraftBeforeLocation}
                            >
                                {submitLocation || editingPlace?.position
                                    ? "Изменить точку"
                                    : "Указать на карте"}
                            </Link>
                        </div>

                        <label className="submit-form__field">
                            <span>Фотографии</span>

                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImagesChange}
                            />
                        </label>

                        {gallery.length > 0 && (
                            <div className="submit-gallery-preview">
                                {gallery.map((image, index) => (
                                    <div
                                        className={
                                            image.isCover
                                                ? "submit-gallery-preview__item submit-gallery-preview__item--cover"
                                                : "submit-gallery-preview__item"
                                        }
                                        key={`${image.id ?? "local"}-${image.url}-${index}`}
                                    >
                                        <img src={image.url} alt={`Фото ${index + 1}`} />

                                        <div className="submit-gallery-preview__actions">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveImage(index, -1)}
                                                disabled={index === 0 || !image.isUploaded}
                                            >
                                                ←
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleMoveImage(index, 1)}
                                                disabled={index === gallery.length - 1 || !image.isUploaded}
                                            >
                                                →
                                            </button>
                                            {image.isCover ? (
                                                <span className="submit-gallery-preview__badge">
                                                    Обложка
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetCoverImage(index)}
                                                    disabled={!image.isUploaded}
                                                >
                                                    Сделать обложкой
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                            >
                                                Удалить
                                            </button>
                                        </div>

                                        {!image.isUploaded && (
                                            <span className="submit-gallery-preview__new">
                                                Будет загружено после сохранения
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="submit-form__note">
                            Первая загруженная фотография становится обложкой автоматически.
                            В режиме редактирования можно удалить фото или выбрать другую обложку.
                        </p>
                    </section>

                    <section className="submit-form__section">
                        <h2>Контакт для связи</h2>

                        <label className="submit-form__field">
                            <span>Имя</span>
                            <input
                                type="text"
                                name="contactName"
                                value={formData.contactName}
                                placeholder="Как к вам обращаться"
                                onChange={handleFormChange}
                            />
                        </label>

                        <label className="submit-form__field">
                            <span>Телефон или email</span>
                            <input
                                type="text"
                                name="contactValue"
                                value={formData.contactValue}
                                placeholder="Этот контакт не будет показан публично"
                                onChange={handleFormChange}
                            />
                        </label>
                    </section>

                    {(optionsError || localitiesError) && (
                        <div className="submit-form__status">
                            {optionsError || localitiesError}
                        </div>
                    )}

                    {submitStatus && (
                        <div className="submit-form__status">
                            {submitStatus}
                        </div>
                    )}

                    <button
                        className="submit-form__submit"
                        type="submit"
                        disabled={
                            isSubmitting ||
                            (optionsLoading && !hasSubmitOptions) ||
                            localitiesLoading ||
                            attributesLoading ||
                            editingLoading
                        }
                    >
                        {isSubmitting
                            ? "Сохраняем..."
                            : isEditMode
                                ? "Сохранить изменения"
                                : "Отправить на модерацию"}
                    </button>
                </form>
            </section >
        </main >
        </>
    );
}