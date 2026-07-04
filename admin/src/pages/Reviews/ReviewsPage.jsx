import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ReviewsStatusTabs } from "./components/ReviewsStatusTabs";
import { ReviewsTable } from "./components/ReviewsTable";

import { reviewsApi } from "../../shared/api/reviewsApi";

import "./ReviewsPage.css";

const STATUS_LABELS = {
    all: "Все",
    pending: "На модерации",
    published: "Опубликованные",
    rejected: "Отклонённые",
};

const STATUS_VALUES = ["all", "pending", "published", "rejected"];

function mapReviewFromApi(review) {
    const userName = [review.user_first_name, review.user_last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...review,
        text: review.review_text || "",
        placeTitle: review.place_title || "—",
        userName: userName || review.user_email || "—",
        createdAt: review.created_at || "—",
    };
}

export function ReviewsPage() {
    const { status } = useParams();

    const currentStatus = status || "all";

    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadReviews() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await reviewsApi.getReviews({
                    status: currentStatus,
                });

                const mappedReviews = (data.reviews || []).map(mapReviewFromApi);

                if (isMounted) {
                    setReviews(mappedReviews);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить отзывы");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadReviews();

        return () => {
            isMounted = false;
        };
    }, [currentStatus]);

    const statusItems = useMemo(() => {
        return STATUS_VALUES.map((itemStatus) => ({
            value: itemStatus,
            label: STATUS_LABELS[itemStatus],
            count: itemStatus === currentStatus ? reviews.length : 0,
        }));
    }, [currentStatus, reviews.length]);

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Отзывы</p>

                    <h2>Модерация отзывов</h2>

                    <p>
                        Реальные отзывы пользователей, публикация и отклонение.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="reviews-empty">
                    {errorMessage}
                </div>
            ) : null}

            <ReviewsStatusTabs items={statusItems} />

            {isLoading ? (
                <div className="reviews-empty">
                    Загружаем отзывы...
                </div>
            ) : (
                <ReviewsTable reviews={reviews} />
            )}
        </section>
    );
}