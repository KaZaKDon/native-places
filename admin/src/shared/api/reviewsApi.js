import { apiClient } from "./apiClient";

function buildQuery(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all") {
            searchParams.set(key, value);
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : "";
}

export const reviewsApi = {
    getReviews(params) {
        return apiClient.get(`/admin/reviews/index.php${buildQuery(params)}`);
    },

    getReview(reviewId) {
        return apiClient.get(`/admin/reviews/show.php?id=${reviewId}`);
    },

    publishReview(reviewId) {
        return apiClient.post("/admin/reviews/publish.php", {
            id: reviewId,
        });
    },

    rejectReview(reviewId) {
        return apiClient.post("/admin/reviews/reject.php", {
            id: reviewId,
        });
    },
};