import { Link } from "react-router-dom";

import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";

function renderRating(rating) {
    const normalizedRating = Number(rating || 0);

    if (normalizedRating <= 0) {
        return "—";
    }

    return "★".repeat(normalizedRating) + "☆".repeat(5 - normalizedRating);
}

export function ReviewsTable({ reviews }) {
    if (!reviews.length) {
        return (
            <EmptyState className="reviews-empty">
                Отзывов в этом разделе пока нет.
            </EmptyState>
        );
    }

    return (
        <div className="reviews-table-wrap">
            <table className="reviews-table">
                <thead>
                    <tr>
                        <th>Отзыв</th>
                        <th>Оценка</th>
                        <th>Объявление</th>
                        <th>Автор</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {reviews.map((review) => (
                        <tr key={review.id}>
                            <td>
                                <div className="review-title-cell">
                                    <span>#{review.id}</span>
                                    <strong>{review.text}</strong>
                                </div>
                            </td>

                            <td>
                                <span className="review-rating">
                                    {renderRating(review.rating)}
                                </span>
                            </td>

                            <td>
                                <Link
                                    className="table-inline-link"
                                    to={`/places/view/${review.placeId}`}
                                >
                                    {review.placeTitle}
                                </Link>
                            </td>

                            <td>
                                <Link
                                    className="table-inline-link"
                                    to={`/users/view/${review.userId}`}
                                >
                                    {review.userName}
                                </Link>
                            </td>

                            <td>
                                <StatusBadge status={review.status} />
                            </td>

                            <td>{review.createdAt}</td>

                            <td>
                                <Link className="table-action" to={`/reviews/view/${review.id}`}>
                                    Открыть
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}