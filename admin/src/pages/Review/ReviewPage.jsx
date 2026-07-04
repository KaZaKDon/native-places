import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { reviewsApi } from "../../shared/api/reviewsApi";

import "./ReviewPage.css";

function getUserName(review) {
    return [review.user_first_name, review.user_last_name]
        .filter(Boolean)
        .join(" ") || review.user_email || "—";
}

function createInfo(review) {
    return [
        {
            label: "ID",
            value: `#${review.id}`,
        },
        {
            label: "Дата",
            value: review.created_at || "—",
        },
        {
            label: "Модерация",
            value: review.moderated_at || "—",
        },
        {
            label: "Пользователь",
            value: getUserName(review),
        },
    ];
}

export function ReviewPage() {
    const { reviewId } = useParams();
    const navigate = useNavigate();

    const [review, setReview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadReview() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await reviewsApi.getReview(reviewId);

                if (isMounted) {
                    setReview(data.review || null);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить отзыв");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadReview();

        return () => {
            isMounted = false;
        };
    }, [reviewId]);

    const info = useMemo(() => {
        if (!review) {
            return [];
        }

        return createInfo(review);
    }, [review]);

    async function handlePublish() {
        try {
            setIsActionLoading(true);
            setErrorMessage("");

            await reviewsApi.publishReview(review.id);

            navigate("/reviews/published");
        } catch (error) {
            setErrorMessage(error.message || "Не удалось опубликовать отзыв");
        } finally {
            setIsActionLoading(false);
        }
    }

    async function handleReject() {
        try {
            setIsActionLoading(true);
            setErrorMessage("");

            await reviewsApi.rejectReview(review.id);

            navigate("/reviews/rejected");
        } catch (error) {
            setErrorMessage(error.message || "Не удалось отклонить отзыв");
        } finally {
            setIsActionLoading(false);
        }
    }

    if (isLoading) {
        return (
            <section className="page">
                <BackButton />

                <div className="review-section">
                    Загружаем отзыв...
                </div>
            </section>
        );
    }

    if (errorMessage && !review) {
        return (
            <NotFoundState
                eyebrow={`Отзыв #${reviewId}`}
                title="Отзыв не найден"
                description={errorMessage}
            />
        );
    }

    if (!review) {
        return (
            <NotFoundState
                eyebrow={`Отзыв #${reviewId}`}
                title="Отзыв не найден"
                description="Отзыв отсутствует или был удалён."
            />
        );
    }

    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Отзыв #{review.id}</p>

                    <h2>Отзыв пользователя</h2>
                </div>

                <StatusBadge status={review.status} />
            </div>

            {errorMessage ? (
                <div className="review-section">
                    {errorMessage}
                </div>
            ) : null}

            <div className="review-page-grid">
                <div className="review-page-main">
                    <article className="review-section">
                        <h3>Текст отзыва</h3>

                        <p>{review.review_text || "Текст отзыва не заполнен."}</p>
                    </article>

                    <article className="review-section">
                        <h3>Связанные данные</h3>

                        <div className="review-links">
                            {review.place_id ? (
                                <Link to={`/places/view/${review.place_id}`}>
                                    Объявление: {review.place_title || `#${review.place_id}`}
                                </Link>
                            ) : null}

                            {review.user_id ? (
                                <Link to={`/users/view/${review.user_id}`}>
                                    Пользователь: {getUserName(review)}
                                </Link>
                            ) : null}
                        </div>
                    </article>
                </div>

                <aside className="review-page-aside">
                    <article className="review-section">
                        <h3>Информация</h3>

                        <div className="review-info-list">
                            {info.map((item) => (
                                <div key={item.label}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="review-section">
                        <h3>Модерация</h3>

                        <div className="review-actions">
                            <button
                                type="button"
                                onClick={handlePublish}
                                disabled={isActionLoading || review.status === "published"}
                            >
                                Опубликовать
                            </button>

                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={isActionLoading || review.status === "rejected"}
                            >
                                Отклонить
                            </button>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
}