import { apiClient } from "./apiClient.js";
import { getMediaUrl } from "./mediaUrl.js";

function mapReviewFromApi(review) {
    return {
        id: review.id,
        placeId: review.place_id,
        userId: review.user_id,
        text: review.review_text || "",
        status: review.status || "",
        createdAt: review.created_at || "",
        userName: review.user_name || "Пользователь",
        userAvatar: review.user_avatar ? getMediaUrl(review.user_avatar) : "",
    };
}

export const reviewsApi = {
    async getReviews(placeId) {
        const data = await apiClient.get("/reviews/index.php", {
            place_id: placeId,
        });

        const reviews = Array.isArray(data.reviews)
            ? data.reviews.map(mapReviewFromApi)
            : [];

        return {
            placeId: data.place_id,
            reviews,
        };
    },

    async createReview({ placeId, text }) {
        return apiClient.post("/reviews/create.php", {
            place_id: placeId,
            review_text: text,
        });
    },
};