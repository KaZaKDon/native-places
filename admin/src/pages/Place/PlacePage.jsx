import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { placesApi } from "../../shared/api/placesApi";

import { PlaceGallery } from "./components/PlaceGallery";
import { PlaceInfoCard } from "./components/PlaceInfoCard";
import { PlaceModeration } from "./components/PlaceModeration";

import "./PlacePage.css";

function createMainInfo(place) {
    return [
        { label: "ID", value: `#${place.id}` },
        { label: "Категория", value: place.category_title || "—" },
        { label: "Тип", value: place.type_title || "—" },
        { label: "Адрес", value: place.address || "—" },
        { label: "Создано", value: place.created_at || "—" },
        { label: "Обновлено", value: place.updated_at || "—" },
    ];
}

function createOwnerInfo(place) {
    const ownerName = [place.owner_first_name, place.owner_last_name]
        .filter(Boolean)
        .join(" ");

    return [
        { label: "Имя", value: ownerName || "—" },
        { label: "Email", value: place.owner_email || "—" },
        { label: "Телефон", value: place.owner_phone || "—" },
        { label: "Telegram", value: place.owner_telegram || "—" },
    ];
}

function createContactInfo(place) {
    return [
        { label: "Контакт", value: place.contact_name || "—" },
        { label: "Телефон", value: place.phone || "—" },
        { label: "Telegram", value: place.telegram || "—" },
        { label: "Email", value: place.email || "—" },
        { label: "Сайт", value: place.website || "—" },
    ];
}

function createPlacementInfo(place) {
    return [
        { label: "Тип публикации", value: place.publication_type || "—" },
        { label: "Статус оплаты", value: place.payment_status || "—" },
        { label: "Коммерческий", value: Number(place.is_commercial) ? "Да" : "Нет" },
        { label: "Бронирование", value: place.booking_type || "—" },
    ];
}

export function PlacePage() {
    const { placeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const backTo = location.state?.from || "/places";

    const [place, setPlace] = useState(null);
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [attributes, setAttributes] = useState([]);

    useEffect(() => {
        let isMounted = true;

        async function loadPlace() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await placesApi.getPlace(placeId);

                if (isMounted) {
                    setPlace(data.place || null);
                    setImages(data.images || []);
                    setAttributes(data.attributes || []);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить объявление");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadPlace();

        return () => {
            isMounted = false;
        };
    }, [placeId]);

    const mainInfo = useMemo(() => (place ? createMainInfo(place) : []), [place]);
    const ownerInfo = useMemo(() => (place ? createOwnerInfo(place) : []), [place]);
    const contactInfo = useMemo(() => (place ? createContactInfo(place) : []), [place]);
    const placementInfo = useMemo(() => (place ? createPlacementInfo(place) : []), [place]);
    const attributesInfo = useMemo(() => (
        createAttributesInfo(attributes)
    ), [attributes]);

    async function handlePublish() {
        try {
            setIsActionLoading(true);
            await placesApi.publishPlace(place.id);
            navigate(backTo);
        } catch (error) {
            setErrorMessage(error.message || "Не удалось опубликовать объявление");
        } finally {
            setIsActionLoading(false);
        }
    }

    async function handleReject(comment) {
        try {
            setIsActionLoading(true);
            await placesApi.rejectPlace(place.id, comment);
            navigate(backTo);
        } catch (error) {
            setErrorMessage(error.message || "Не удалось отклонить объявление");
        } finally {
            setIsActionLoading(false);
        }
    }

    if (isLoading) {
        return (
            <section className="page">
                <BackButton fallbackTo="/places" />

                <div className="place-section">
                    Загружаем объявление...
                </div>
            </section>
        );
    }

    if (errorMessage && !place) {
        return (
            <NotFoundState
                eyebrow={`Объявление #${placeId}`}
                title="Объявление не найдено"
                description={errorMessage}
            />
        );
    }

    if (!place) {
        return (
            <NotFoundState
                eyebrow={`Объявление #${placeId}`}
                title="Объявление не найдено"
                description="Объявление отсутствует или было удалено."
            />
        );
    }

    function createAttributesInfo(attributesList) {
        return attributesList.map((attribute) => ({
            label: attribute.title || attribute.code || "Характеристика",
            value: attribute.value || "—",
        }));
    }

    return (
        <section className="page">
            <BackButton fallbackTo="/places" />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Объявление #{place.id}</p>

                    <h2>{place.title}</h2>

                    <p>{place.short_description || "Описание не заполнено."}</p>
                </div>

                <StatusBadge status={place.status} />
            </div>

            {errorMessage ? (
                <div className="place-section">
                    {errorMessage}
                </div>
            ) : null}

            <div className="place-page-content">
                <article className="place-section">
                    <h3>Описание</h3>

                    <p>{place.full_description || "Полное описание не заполнено."}</p>
                </article>

                <article className="place-section">
                    <h3>Фотографии</h3>

                    <PlaceGallery images={images} />
                </article>

                <div className="place-info-grid">
                    <PlaceInfoCard title="Размещение" items={placementInfo} />

                    <PlaceInfoCard title="Основное" items={mainInfo} />

                    <PlaceInfoCard
                        title="Владелец"
                        items={ownerInfo}
                        action={{
                            label: "Открыть",
                            to: `/users/view/${place.user_id}`,
                        }}
                    />

                    <PlaceInfoCard title="Контакты объявления" items={contactInfo} />

                    <PlaceInfoCard
                        title="Характеристики"
                        items={attributesInfo}
                    />

                    <PlaceModeration
                        onPublish={handlePublish}
                        onReject={handleReject}
                        isLoading={isActionLoading}
                    />
                </div>
            </div>
        </section>
    );
}